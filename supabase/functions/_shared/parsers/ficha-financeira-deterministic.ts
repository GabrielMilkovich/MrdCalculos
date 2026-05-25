// supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts
//
// Parser determinístico para Ficha Financeira em formato ADP (Via Varejo,
// Magazine Luiza, Casas Bahia, etc). Funciona sobre output do extrator
// geométrico pdfjs que preserva tabela em formato markdown com `|`.
//
// Vantagens sobre path LLM:
//   - Determinístico (mesmo input → mesmo output)
//   - Zero custo (sem API call)
//   - Rápido (~10ms vs ~15s Claude)
//   - Códigos numéricos 4 dígitos são mais confiáveis que nomes OCR
//
// Retorna null quando não reconhece layout → caller cai no Claude fallback.

// Meses aceitos no header da tabela (com variações OCR comuns)
const MESES_HEADER: Record<string, string> = {
  janeiro: '01', fevereiro: '02', 'março': '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11',
  dezembro: '12', '13': '13', 'total': 'total',
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

// Classificações ADP com tolerância OCR (PGTO → PETO/PGTO/PAGO)
const CLASSIFICACAO_PGTO = new Set([
  'pgto', 'peto', 'pago', 'pqto', 'pglo', 'pgfo',
]);
const CLASSIFICACAO_DESC = new Set([
  'desc', 'deso', 'desd', 'decs',
]);
const CLASSIFICACAO_IGNORAR = new Set([
  'base', 'info', 'encar', 'outro', 'prov',
  'babe', 'inpo', 'encap', 'outpo', 'prov',
]);

// Blocklist de códigos numéricos (provisões, bases, encargos, totalizadores)
const CODIGOS_BLOCKLIST = new Set<string>();
for (let i = 5000; i < 5200; i++) CODIGOS_BLOCKLIST.add(String(i).padStart(4, '0'));
for (let i = 6000; i < 7000; i++) CODIGOS_BLOCKLIST.add(String(i).padStart(4, '0'));
for (let i = 8000; i < 8200; i++) CODIGOS_BLOCKLIST.add(String(i).padStart(4, '0'));
for (let i = 9900; i < 10000; i++) CODIGOS_BLOCKLIST.add(String(i).padStart(4, '0'));
['0509', '0517', '0521', '0525'].forEach(c => CODIGOS_BLOCKLIST.add(c));

// Código → categoria PJe-Calc (baseado na planilha do escritório + auditoria)
const CODE_TO_CATEGORY: Record<string, string> = {
  '0040': 'outros',        // Participação Lucros
  '0501': 'dsr',           // DSR (Comissão)
  '0502': 'dsr',           // DSR (H. Extra)
  '0510': 'outros',        // Abono (13o)
  '0511': 'salario_base',  // Salário Base/Receita
  '0590': 'outros',        // 1/3 Adic. Const. Férias
  '0591': 'outros',        // 1/3 Adic. Const. Férias
  '0620': 'comissao',      // Comissões
  '0712': 'salario_base',  // Mínimo Garantido
  '0832': 'outros',        // Insuf. Saldo no Mês
  '2750': 'outros',        // Média de Férias
  '2751': 'outros',        // Média de Férias
  '2823': 'outros',        // Abono (pessoal)
  '3290': 'premio',        // Prêmio Antecipado
  '3317': 'comissao',      // Ad. Sábado Com. 25%
  '3348': 'salario_base',  // Horas Justificadas / TRN
  '3351': 'comissao',      // Com. Garantia
  '3393': 'comissao',      // Com. Seguros
  '3415': 'outros',        // 1/3 Férias Pagas
  '3453': 'comissao',      // Comissão Frete
  '4013': 'hora_extra',    // Horas Extras Com 75%
  '4016': 'hora_extra',    // Horas Extras Com 70%
  '4096': 'comissao',      // Comissão Montagem
  '4101': 'premio',        // Prêmio Meta
  '4131': 'premio',        // Prêmio Metal
  '4183': 'adicional_noturno', // Ad. Noturno
  '7035': 'outros',        // Ajuste de Líquido
  '7076': 'outros',        // PLR Variável
  '8441': 'premio',        // Antecip. Prêmio Estím.
  '8489': 'comissao',      // Campanha Serviços
};

interface RubricaExtraida {
  codigo: string;
  denominacao: string;
  classificacao: string;
  categoria: string;
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

interface ResultadoParse {
  ano: number;
  empregado: string;
  empresa: string;
  rubricas: RubricaExtraida[];
  resumo_mensal: Array<{ competencia: string; total_vencimentos: number }>;
  _meta: {
    parser: string;
    linhas_processadas: number;
    linhas_filtradas: number;
    meses_detectados: string[];
  };
}

function parseBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Tenta parse determinístico da Ficha Financeira em formato markdown table (ADP).
 * Retorna null se não reconhecer o layout — caller cai no Claude fallback.
 */
export function parseFichaFinanceiraDeterministico(
  texto: string,
): ResultadoParse | null {
  if (!texto || texto.length < 200) return null;

  // Detecta layout ADP: precisa ter "Ficha Financeira" + tabela markdown com "|"
  const isADP = /ficha\s+financeira/i.test(texto) &&
    texto.includes('|') &&
    /\bC[oó]digo\b/i.test(texto);
  if (!isADP) return null;

  // Extrai ano de competência
  const anoMatch = texto.match(/Ano\s+Compet[eê]ncia\s*:\s*(\d{4})/i);
  const ano = anoMatch ? parseInt(anoMatch[1], 10) : new Date().getFullYear();

  // Extrai nome do empregado
  const empMatch = texto.match(/(?:Empregado|Depreado|Funcionário)\s*:\s*(\d+)\s+([^\n|]+)/i);
  const empregado = empMatch ? empMatch[2].trim() : '';

  // Extrai empresa
  const empresa = texto.match(/VIA\s+VAREJO/i) ? 'Via Varejo S/A' :
    texto.match(/MAGAZINE\s+LUIZA/i) ? 'Magazine Luiza' :
    texto.match(/CASAS\s+BAHIA/i) ? 'Casas Bahia' : '';

  // Encontra linhas da tabela (contém | separadores)
  const lines = texto.split(/\r?\n/).filter(l => l.includes('|'));

  // Detecta header com meses — procura linha com "Código" ou similar
  let mesesDetectados: string[] = [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    // Header tem "Código" na primeira célula e meses nas seguintes
    if (/c[oó]digo/i.test(cells[0])) {
      headerIdx = i;
      // Extrai meses das células restantes
      for (let j = 2; j < cells.length; j++) {
        const mesRaw = cells[j].toLowerCase().trim().replace(/[^a-záàâãéêíóôõúç0-9]/gi, '');
        for (const [pattern, mm] of Object.entries(MESES_HEADER)) {
          if (mesRaw.includes(pattern)) {
            mesesDetectados.push(mm);
            break;
          }
        }
      }
      break;
    }
  }

  if (headerIdx < 0 || mesesDetectados.length < 3) return null;

  // Parse cada linha de rubrica
  const rubricas: RubricaExtraida[] = [];
  let linhasProcessadas = 0;
  let linhasFiltradas = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    // Pula separadores de tabela markdown (---)
    if (/^\s*\|?\s*---/.test(raw)) continue;

    const cells = raw.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    // Primeira célula: "CÓDIGO DENOMINAÇÃO" ou "CÓDIGO DENOMINAÇÃO | Clas."
    const primeiraCell = cells[0];
    const codigoMatch = primeiraCell.match(/^(\d{4})\s+(.+)/);
    if (!codigoMatch) continue;

    const codigo = codigoMatch[1];
    const denominacao = codigoMatch[2].trim();
    const classificacao = cells.length > 1 ? cells[1].trim().toUpperCase() : '';

    linhasProcessadas++;

    // Filtra por classificação: só PGTO (com tolerância OCR)
    const clasLower = classificacao.toLowerCase();
    if (!CLASSIFICACAO_PGTO.has(clasLower)) {
      if (CLASSIFICACAO_DESC.has(clasLower) || CLASSIFICACAO_IGNORAR.has(clasLower)) {
        linhasFiltradas++;
      }
      continue;
    }

    // Blocklist por código
    if (CODIGOS_BLOCKLIST.has(codigo)) {
      linhasFiltradas++;
      continue;
    }

    // Extrai valores mensais (células 2+ mapeiam pros meses detectados)
    const valores: Array<{ competencia: string; valor: number }> = [];
    for (let m = 0; m < mesesDetectados.length; m++) {
      const cellIdx = m + 2; // offset: 0=codigo+nome, 1=clas, 2+=meses
      if (cellIdx >= cells.length) break;
      const mes = mesesDetectados[m];
      if (mes === 'total') continue;
      const valor = parseBR(cells[cellIdx]);
      if (valor > 0) {
        const comp = mes === '13'
          ? `${ano}-13`
          : `${ano}-${mes}`;
        valores.push({ competencia: comp, valor });
      }
    }

    if (valores.length === 0) continue;

    // Categoria por código (determinístico) ou fallback 'outros'
    const categoria = CODE_TO_CATEGORY[codigo] || 'outros';

    rubricas.push({
      codigo,
      denominacao,
      classificacao: 'PGTO',
      categoria,
      valores_mensais: valores,
    });
  }

  if (rubricas.length === 0) return null;

  // Resumo mensal: soma por competência
  const somasPorMes = new Map<string, number>();
  for (const r of rubricas) {
    for (const v of r.valores_mensais) {
      somasPorMes.set(v.competencia, (somasPorMes.get(v.competencia) ?? 0) + v.valor);
    }
  }
  const resumo = [...somasPorMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([comp, total]) => ({
      competencia: comp,
      total_vencimentos: Math.round(total * 100) / 100,
    }));

  return {
    ano,
    empregado,
    empresa,
    rubricas,
    resumo_mensal: resumo,
    _meta: {
      parser: 'ficha-financeira-deterministic-v1',
      linhas_processadas: linhasProcessadas,
      linhas_filtradas: linhasFiltradas,
      meses_detectados: mesesDetectados.filter(m => m !== 'total'),
    },
  };
}
