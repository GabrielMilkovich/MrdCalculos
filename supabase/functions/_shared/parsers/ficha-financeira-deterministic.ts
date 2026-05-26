// supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts
//
// Parser determinístico para Ficha Financeira em formato ADP (Via Varejo,
// Magazine Luiza, Casas Bahia, etc). Dois paths:
//   1. Markdown table com `|` (output do extrator geométrico pdfjs V6)
//   2. Texto-layout com colunas de largura fixa (output Mistral OCR / pdftotext -layout)
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
  '2752': 'outros',        // Média de Férias
  '2823': 'outros',        // Abono (pessoal)
  '3290': 'premio',        // Prêmio Antecipado
  '3317': 'comissao',      // Ad. Sábado Com. 25%
  '3348': 'salario_base',  // Horas Justificadas / TRN
  '3351': 'comissao',      // Com. Garantia
  '3368': 'salario_base',  // TRN Treinamento
  '3391': 'comissao',      // Com. Seguros
  '3393': 'comissao',      // Com. Seguros Vida
  '3415': 'outros',        // 1/3 Férias Pagas
  '3453': 'comissao',      // Comissão Frete
  '4013': 'hora_extra',    // Horas Extras Com 75%
  '4016': 'hora_extra',    // Horas Extras Com 70%
  '4096': 'comissao',      // Comissão Montagem
  '4101': 'premio',        // Prêmio Meta
  '4131': 'premio',        // Prêmio Metal
  '4183': 'adicional_noturno', // Ad. Noturno
  '4325': 'outros',        // Outros
  '7035': 'outros',        // Ajuste de Líquido
  '7076': 'outros',        // PLR Variável
  '7680': 'comissao',      // Comissão Eletrônicos
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

// Meses completos para matching no header de texto-layout (posição por offset)
const MESES_FULL: Array<{ pattern: RegExp; mm: string }> = [
  { pattern: /janeiro/i, mm: '01' },
  { pattern: /fevereiro/i, mm: '02' },
  { pattern: /mar[cç]o/i, mm: '03' },
  { pattern: /abril/i, mm: '04' },
  { pattern: /maio/i, mm: '05' },
  { pattern: /junho/i, mm: '06' },
  { pattern: /julho/i, mm: '07' },
  { pattern: /agosto/i, mm: '08' },
  { pattern: /setembro/i, mm: '09' },
  { pattern: /outubro/i, mm: '10' },
  { pattern: /novembro/i, mm: '11' },
  { pattern: /dezembro/i, mm: '12' },
  { pattern: /dec\.?\s*terc/i, mm: '13' },
  { pattern: /\b13[ºo°]?\b/i, mm: '13' },
  { pattern: /\btotal\b/i, mm: 'total' },
];

interface ColumnSpan {
  mm: string;
  start: number;
  end: number;
}

function detectTextLayoutColumns(headerLine: string): ColumnSpan[] {
  const cols: Array<{ mm: string; matchStart: number; matchEnd: number }> = [];
  for (const { pattern, mm } of MESES_FULL) {
    const m = headerLine.match(pattern);
    if (m && m.index !== undefined) {
      cols.push({ mm, matchStart: m.index, matchEnd: m.index + m[0].length });
    }
  }
  cols.sort((a, b) => a.matchStart - b.matchStart);
  if (cols.length < 3) return [];

  const spans: ColumnSpan[] = [];
  for (let i = 0; i < cols.length; i++) {
    const start = i === 0
      ? cols[i].matchStart
      : Math.floor((cols[i - 1].matchEnd + cols[i].matchStart) / 2);
    const end = i === cols.length - 1
      ? headerLine.length
      : Math.floor((cols[i].matchEnd + cols[i + 1].matchStart) / 2);
    spans.push({ mm: cols[i].mm, start, end });
  }
  return spans;
}

function extractMetadata(texto: string): { ano: number; empregado: string; empresa: string } {
  const anoMatch = texto.match(/Ano\s+Compet[eê]ncia\s*:\s*(\d{4})/i);
  const ano = anoMatch ? parseInt(anoMatch[1], 10) : new Date().getFullYear();

  const empMatch = texto.match(/(?:Empregado|Depreado|Funcionário)\s*:\s*(\d+)\s+([^\n|]+)/i);
  const empregado = empMatch ? empMatch[2].trim() : '';

  const empresa = texto.match(/VIA\s+VAREJO/i) ? 'Via Varejo S/A' :
    texto.match(/MAGAZINE\s+LUIZA/i) ? 'Magazine Luiza' :
    texto.match(/CASAS\s+BAHIA/i) ? 'Casas Bahia' : '';

  return { ano, empregado, empresa };
}

function buildResumo(rubricas: RubricaExtraida[]): Array<{ competencia: string; total_vencimentos: number }> {
  const somasPorMes = new Map<string, number>();
  for (const r of rubricas) {
    for (const v of r.valores_mensais) {
      somasPorMes.set(v.competencia, (somasPorMes.get(v.competencia) ?? 0) + v.valor);
    }
  }
  return [...somasPorMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([comp, total]) => ({
      competencia: comp,
      total_vencimentos: Math.round(total * 100) / 100,
    }));
}

function filterAndClassify(
  codigo: string,
  classificacao: string,
): { keep: boolean; filtered: boolean } {
  const clasLower = classificacao.toLowerCase();
  if (!CLASSIFICACAO_PGTO.has(clasLower)) {
    const filtered = CLASSIFICACAO_DESC.has(clasLower) || CLASSIFICACAO_IGNORAR.has(clasLower);
    return { keep: false, filtered };
  }
  if (CODIGOS_BLOCKLIST.has(codigo)) {
    return { keep: false, filtered: true };
  }
  return { keep: true, filtered: false };
}

function parseMarkdownTable(texto: string, allLines: string[]): ResultadoParse | null {
  const { ano, empregado, empresa } = extractMetadata(texto);

  const lines = allLines.filter(l => l.includes('|'));

  let mesesDetectados: string[] = [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    if (/c[oó]digo/i.test(cells[0])) {
      headerIdx = i;
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

  const rubricas: RubricaExtraida[] = [];
  let linhasProcessadas = 0;
  let linhasFiltradas = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*\|?\s*---/.test(raw)) continue;

    const cells = raw.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    const primeiraCell = cells[0];
    const codigoMatch = primeiraCell.match(/^(\d{4})\s+(.+)/);
    if (!codigoMatch) continue;

    const codigo = codigoMatch[1];
    const denominacao = codigoMatch[2].trim();
    const classificacao = cells.length > 1 ? cells[1].trim().toUpperCase() : '';

    linhasProcessadas++;

    const { keep, filtered } = filterAndClassify(codigo, classificacao);
    if (!keep) {
      if (filtered) linhasFiltradas++;
      continue;
    }

    const valores: Array<{ competencia: string; valor: number }> = [];
    for (let m = 0; m < mesesDetectados.length; m++) {
      const cellIdx = m + 2;
      if (cellIdx >= cells.length) break;
      const mes = mesesDetectados[m];
      if (mes === 'total') continue;
      const valor = parseBR(cells[cellIdx]);
      if (valor > 0) {
        const comp = mes === '13' ? `${ano}-13` : `${ano}-${mes}`;
        valores.push({ competencia: comp, valor });
      }
    }

    if (valores.length === 0) continue;

    const categoria = CODE_TO_CATEGORY[codigo] || 'outros';
    rubricas.push({ codigo, denominacao, classificacao: 'PGTO', categoria, valores_mensais: valores });
  }

  if (rubricas.length === 0) return null;

  return {
    ano, empregado, empresa, rubricas,
    resumo_mensal: buildResumo(rubricas),
    _meta: {
      parser: 'ficha-financeira-deterministic-v1',
      linhas_processadas: linhasProcessadas,
      linhas_filtradas: linhasFiltradas,
      meses_detectados: mesesDetectados.filter(m => m !== 'total'),
    },
  };
}

function parseTextLayout(texto: string, allLines: string[]): ResultadoParse | null {
  const { ano, empregado, empresa } = extractMetadata(texto);

  const headerLineRegex = /^[ \t]*C[oó]digo\s+Denomina[cç][aã]o\s+Clas/i;
  const separatorRegex = /^[ \t]*-{4,}/;
  const rubricaLineRegex = /^[ \t]+(\d{4})\s+(.+)/;

  const pageHeaders: Array<{ headerIdx: number; columns: ColumnSpan[] }> = [];
  for (let i = 0; i < allLines.length; i++) {
    if (headerLineRegex.test(allLines[i])) {
      const columns = detectTextLayoutColumns(allLines[i]);
      if (columns.length >= 3) {
        pageHeaders.push({ headerIdx: i, columns });
      }
    }
  }

  if (pageHeaders.length === 0) return null;

  const rubricas = new Map<string, RubricaExtraida>();
  let linhasProcessadas = 0;
  let linhasFiltradas = 0;

  for (const { headerIdx, columns } of pageHeaders) {
    let dataStart = headerIdx + 1;
    if (dataStart < allLines.length && separatorRegex.test(allLines[dataStart])) {
      dataStart++;
    }

    for (let i = dataStart; i < allLines.length; i++) {
      const raw = allLines[i];

      if (separatorRegex.test(raw)) continue;
      if (/^\s*$/.test(raw)) continue;
      if (headerLineRegex.test(raw)) break;
      if (/ficha\s+financeira/i.test(raw)) break;
      if (/Ano\s+Compet/i.test(raw)) break;
      if (/^\s*\d{4}\s+Total\s/i.test(raw)) continue;

      const m = raw.match(rubricaLineRegex);
      if (!m) continue;

      const codigo = m[1];
      const restAfterCode = m[2];

      const clasMatch = restAfterCode.match(/\s+(PGTO|DESC|BASE|ENCAR|OUTRO|PROV|INFO|PETO|PAGO|PQTO|PGLO|PGFO|DESO|DESD|DECS|BABE|INPO|ENCAP|OUTPO)\s/i);
      if (!clasMatch) continue;

      const clasEndInRest = clasMatch.index! + clasMatch[0].length;
      const denominacao = restAfterCode.substring(0, clasMatch.index!).trim();
      const classificacao = clasMatch[1].trim().toUpperCase();

      linhasProcessadas++;

      const { keep, filtered } = filterAndClassify(codigo, classificacao);
      if (!keep) {
        if (filtered) linhasFiltradas++;
        continue;
      }

      const codeStartInLine = raw.indexOf(codigo);
      const clasStartInLine = raw.indexOf(clasMatch[1], codeStartInLine + 4);
      const clasEndInLine = clasStartInLine + clasMatch[1].length;

      const valores: Array<{ competencia: string; valor: number }> = [];
      for (const col of columns) {
        if (col.mm === 'total') continue;
        const effectiveStart = Math.max(col.start, clasEndInLine);
        if (effectiveStart >= raw.length) continue;
        const slice = raw.substring(effectiveStart, Math.min(col.end, raw.length)).trim();
        if (!slice) continue;

        const valor = parseBR(slice);
        if (valor > 0) {
          const comp = col.mm === '13' ? `${ano}-13` : `${ano}-${col.mm}`;
          valores.push({ competencia: comp, valor });
        }
      }

      if (valores.length === 0) continue;

      const categoria = CODE_TO_CATEGORY[codigo] || 'nao_catalogado';

      const existing = rubricas.get(codigo);
      if (existing) {
        for (const v of valores) {
          const dup = existing.valores_mensais.find(e => e.competencia === v.competencia);
          if (!dup) {
            existing.valores_mensais.push(v);
          }
        }
      } else {
        rubricas.set(codigo, {
          codigo, denominacao, classificacao: 'PGTO', categoria,
          valores_mensais: [...valores],
        });
      }
    }
  }

  if (rubricas.size === 0) return null;

  const rubricasArr = [...rubricas.values()];
  for (const r of rubricasArr) {
    r.valores_mensais.sort((a, b) => a.competencia.localeCompare(b.competencia));
  }

  const allMeses = new Set<string>();
  for (const { columns } of pageHeaders) {
    for (const c of columns) {
      if (c.mm !== 'total') allMeses.add(c.mm);
    }
  }

  return {
    ano, empregado, empresa,
    rubricas: rubricasArr,
    resumo_mensal: buildResumo(rubricasArr),
    _meta: {
      parser: 'ficha-financeira-deterministic-v2-textlayout',
      linhas_processadas: linhasProcessadas,
      linhas_filtradas: linhasFiltradas,
      meses_detectados: [...allMeses].sort(),
    },
  };
}

/**
 * Tenta parse determinístico da Ficha Financeira.
 * Path 1: markdown table com | (extrator geométrico V6).
 * Path 2: texto-layout com colunas de largura fixa (Mistral OCR / pdftotext).
 * Retorna null se não reconhecer nenhum layout — caller cai no Claude fallback.
 */
export function parseFichaFinanceiraDeterministico(
  texto: string,
): ResultadoParse | null {
  if (!texto || texto.length < 200) return null;

  const hasFichaFinanceira = /ficha\s+financeira/i.test(texto);
  const hasCodigo = /\bC[oó]digo\b/i.test(texto);
  if (!hasFichaFinanceira || !hasCodigo) return null;

  const allLines = texto.split(/\r?\n/);

  // Path 1: markdown table (pipe-separated)
  if (texto.includes('|')) {
    const mdResult = parseMarkdownTable(texto, allLines);
    if (mdResult && mdResult.rubricas.length >= 3) return mdResult;
  }

  // Path 2: texto-layout (fixed-width columns, no pipes in data)
  const hasTextLayoutLines = /^\s+\d{4}\s+\w/m.test(texto);
  if (hasTextLayoutLines) {
    const tlResult = parseTextLayout(texto, allLines);
    if (tlResult && tlResult.rubricas.length >= 3) return tlResult;
  }

  return null;
}
