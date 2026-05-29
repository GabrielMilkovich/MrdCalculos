// supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts
//
// Parser determinístico para Ficha Financeira em formato ADP (Via Varejo,
// Magazine Luiza, Casas Bahia, etc). V3 — cutoff posicional + ontologia V2.
//
// Regra do escritório MRD:
//   Incluir todas as rubricas desde a primeira até 0833 Desc. Insuf Saldo
//   (inclusive). Depois, ignorar tudo (DESC, BASE, ENCAR, OUTRO, PROV).
//   Classificar cada rubrica pela ontologia V2 (sync-mode seed).
//
// Dois paths de extração:
//   1. Markdown table com `|` (output do extrator geométrico pdfjs V6)
//   2. Texto-layout com colunas de largura fixa (output Mistral OCR / pdftotext)

// ── Ontologia V2 (classificação por nome de rubrica) ──
// Importa o seed JSON diretamente — funciona em Deno E Node/vitest.
// deno-lint-ignore no-explicit-any
let SEED_INDEX: Map<string, { categoria: string; tipo_pjecalc: string; base_dsr: boolean; base_13: boolean; base_ferias: boolean; incluido: boolean; observacao_juridica?: string }> | null = null;

function getSeedIndex(): typeof SEED_INDEX {
  if (SEED_INDEX) return SEED_INDEX;
  // Lazy-load pra evitar problemas de import circular no Deno edge
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let seed: { rubricas: Array<{ normalized_key: string; aliases: string[]; categoria: string; tipo_pjecalc: string; base_dsr: boolean; base_13: boolean; base_ferias: boolean; incluido: boolean; observacao_juridica?: string }> };
  try {
    // deno-lint-ignore no-explicit-any
    seed = (globalThis as any).__ontologia_v2_seed;
    if (!seed) {
      // Fallback: load JSON inline (for vitest/Node)
      seed = require('../holerite-mapper-v2/ontologia-v2.json');
    }
  } catch {
    try {
      seed = require('../holerite-mapper-v2/ontologia-v2.json');
    } catch {
      return null;
    }
  }
  const m = new Map<string, typeof SEED_INDEX extends Map<string, infer V> | null ? V : never>();
  for (const r of seed.rubricas) {
    const entry = {
      categoria: r.categoria,
      tipo_pjecalc: r.tipo_pjecalc,
      base_dsr: r.base_dsr,
      base_13: r.base_13,
      base_ferias: r.base_ferias,
      incluido: r.incluido,
      observacao_juridica: r.observacao_juridica,
    };
    m.set(r.normalized_key, entry);
    for (const a of r.aliases) {
      if (!m.has(a)) m.set(a, entry);
    }
  }
  SEED_INDEX = m;
  return m;
}

function normalizeForSeed(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classificarPorOntologia(denominacao: string): {
  categoria: string;
  tipo_pjecalc: string;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  divergencia_juridica: boolean;
} {
  const index = getSeedIndex();
  const key = normalizeForSeed(denominacao);
  const hit = index?.get(key);
  if (hit) {
    return {
      categoria: hit.categoria,
      tipo_pjecalc: hit.tipo_pjecalc,
      base_dsr: hit.base_dsr,
      base_13: hit.base_13,
      base_ferias: hit.base_ferias,
      divergencia_juridica: !!hit.observacao_juridica,
    };
  }
  return {
    categoria: 'NAO_CLASSIFICADO',
    tipo_pjecalc: 'INDEFINIDO',
    base_dsr: false,
    base_13: false,
    base_ferias: false,
    divergencia_juridica: false,
  };
}

// ── Meses ──

const MESES_HEADER: Record<string, string> = {
  janeiro: '01', fevereiro: '02', 'março': '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11',
  dezembro: '12', '13': '13', 'total': 'total',
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

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

// ── Normalização de classificação ADP corrompida por OCR ──

export function normalizarClassificacao(raw: string): string {
  if (!raw) return '';
  const c = raw.trim().toUpperCase();
  if (['PGTO', 'DESC', 'BASE', 'ENCAR', 'OUTRO', 'PROV', 'INFO'].includes(c)) return c;
  const len = c.length;
  if (len === 4 && c[0] === 'P' && c[2] === 'T' && c[3] === 'O') return 'PGTO';
  if (len === 4 && c[0] === 'P' && c[1] === 'R' && c[2] === 'O') return 'PROV';
  if (len === 4 && c[0] === 'D' && c[1] === 'E' && c[2] === 'S') return 'DESC';
  if (len === 4 && c[0] === 'B' && c[3] === 'E') return 'BASE';
  if (len === 5 && c[0] === 'E' && c[1] === 'N' && c[2] === 'C') return 'ENCAR';
  if (len === 5 && c[0] === 'O' && c[1] === 'U' && c[4] === 'O') return 'OUTRO';
  if (len === 4 && c[0] === 'I' && c[1] === 'N' && c[3] === 'O') return 'INFO';
  if (c === 'PAGO' || c === 'PGLO' || c === 'PGFO') return 'PGTO';
  if (c === 'DECS') return 'DESC';
  return c;
}

const CLASSIFICACOES_VALIDAS = new Set(['PGTO', 'DESC', 'BASE', 'ENCAR', 'OUTRO', 'PROV', 'INFO']);

// ── Fallback por código de empregador ──

interface EntradaCodigo { categoria: string; denominacao_canonica: string }
let CODIGO_INDEX: Map<string, EntradaCodigo> | null = null;

function getCodigoIndex(empregador: string): Map<string, EntradaCodigo> | null {
  if (CODIGO_INDEX) return CODIGO_INDEX;
  let codigos: Record<string, Record<string, { categoria: string; denominacao_canonica: string; aliases_codigo_ocr?: string[] }>>;
  try {
    codigos = require('../holerite-mapper-v2/codigos-empregador.json');
  } catch {
    return null;
  }
  const m = new Map<string, EntradaCodigo>();
  const dados = codigos[empregador] ?? {};
  for (const [codigo, info] of Object.entries(dados)) {
    const entry: EntradaCodigo = { categoria: info.categoria, denominacao_canonica: info.denominacao_canonica };
    m.set(codigo, entry);
    for (const aliasOcr of info.aliases_codigo_ocr ?? []) {
      if (!m.has(aliasOcr)) m.set(aliasOcr, entry);
    }
  }
  CODIGO_INDEX = m;
  return m;
}

// ── Cutoff sentinel ──

function ehLinhaCutoff(codigo: string, denominacao: string): boolean {
  if (codigo === '0833') return true;
  return /^desc\.?\s*insuf\.?\s*saldo\b/i.test(denominacao.toLowerCase().trim());
}

// ── Tipos ──

interface RubricaExtraida {
  codigo: string;
  denominacao: string;
  classificacao: string;
  categoria: string;
  tipo_pjecalc: string;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  divergencia_juridica: boolean;
  classificacao_via: 'ontologia_nome' | 'codigo_empregador' | 'nao_classificado';
  denominacao_canonica?: string;
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

// ── Helpers ──

function parseBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

interface ColumnSpan {
  mm: string;
  start: number;
  end: number;
}

function detectColumnsFromSeparators(line: string): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '-') {
      const start = i;
      while (i < line.length && line[i] === '-') i++;
      blocks.push({ start, end: i });
    } else {
      i++;
    }
  }
  return blocks.filter(b => b.end - b.start >= 4);
}

function detectTextLayoutColumns(headerLine: string, separatorLine: string | null): ColumnSpan[] {
  if (separatorLine) {
    const blocks = detectColumnsFromSeparators(separatorLine);
    if (blocks.length >= 4) {
      const monthBlocks: ColumnSpan[] = [];
      for (const block of blocks) {
        const headerSlice = headerLine.length >= block.end
          ? headerLine.substring(block.start, block.end)
          : headerLine.substring(block.start);
        const sliceLower = headerSlice.toLowerCase();
        for (const { pattern, mm } of MESES_FULL) {
          if (pattern.test(sliceLower)) {
            monthBlocks.push({ mm, start: block.start, end: block.end });
            break;
          }
        }
      }
      if (monthBlocks.length >= 3) return monthBlocks;
    }
  }

  const cols: Array<{ mm: string; matchStart: number; matchEnd: number }> = [];
  for (const { pattern, mm } of MESES_FULL) {
    const m = headerLine.match(pattern);
    if (m && m.index !== undefined) {
      cols.push({ mm, matchStart: m.index, matchEnd: m.index + m[0].length });
    }
  }
  cols.sort((a, b) => a.matchStart - b.matchStart);
  if (cols.length < 3) return [];

  const estimatedWidth = cols.length >= 2
    ? Math.floor(cols.slice(1).reduce((sum, c, idx) => sum + (c.matchStart - cols[idx].matchStart), 0) / (cols.length - 1))
    : 14;

  const spans: ColumnSpan[] = [];
  for (let i = 0; i < cols.length; i++) {
    const start = i === 0
      ? Math.max(0, cols[i].matchEnd - estimatedWidth)
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

function classificarRubrica(
  denominacao: string,
  codigo: string,
  empregadorSlug: string,
): Pick<RubricaExtraida, 'categoria' | 'tipo_pjecalc' | 'base_dsr' | 'base_13' | 'base_ferias' | 'divergencia_juridica' | 'classificacao_via' | 'denominacao_canonica'> {
  const byName = classificarPorOntologia(denominacao);
  if (byName.categoria !== 'NAO_CLASSIFICADO') {
    return { ...byName, classificacao_via: 'ontologia_nome' };
  }
  const codigoIndex = getCodigoIndex(empregadorSlug);
  const byCode = codigoIndex?.get(codigo);
  if (byCode) {
    const canonical = classificarPorOntologia(byCode.denominacao_canonica);
    if (canonical.categoria !== 'NAO_CLASSIFICADO') {
      return { ...canonical, classificacao_via: 'codigo_empregador', denominacao_canonica: byCode.denominacao_canonica };
    }
  }
  return {
    categoria: 'NAO_CLASSIFICADO',
    tipo_pjecalc: 'INDEFINIDO',
    base_dsr: false, base_13: false, base_ferias: false,
    divergencia_juridica: false,
    classificacao_via: 'nao_classificado',
  };
}

// ── Path 1: Markdown table ──

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
  let cutoffAlcancado = false;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (cutoffAlcancado) { linhasFiltradas++; continue; }

    const raw = lines[i];
    if (/^\s*\|?\s*---/.test(raw)) continue;

    const cells = raw.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    const primeiraCell = cells[0];
    const codigoMatch = primeiraCell.match(/^(\d{4})\s+(.+)/);
    if (!codigoMatch) continue;

    const codigo = codigoMatch[1];
    const denominacao = codigoMatch[2].trim();
    const classificacaoRaw = cells.length > 1 ? cells[1].trim().toUpperCase() : '';
    const classificacao = normalizarClassificacao(classificacaoRaw);
    if (classificacaoRaw && !CLASSIFICACOES_VALIDAS.has(classificacao)) continue;
    if (['BASE', 'ENCAR', 'OUTRO', 'PROV', 'INFO'].includes(classificacao)) continue;

    // Regra do escritório: ao encontrar o primeiro código DESC dentro de uma
    // seção, encerra a captura desta seção (nenhuma linha posterior entra).
    // PJe-Calc só consome proventos (PGTO) — descontos nunca compõem
    // histórico salarial. Próximo cabeçalho reseta cutoffAlcancado.
    if (classificacao === 'DESC') {
      cutoffAlcancado = true;
      continue;
    }

    linhasProcessadas++;

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

    const empregadorSlug = empresa.toUpperCase().includes('VIA VAREJO') ? 'VIA_VAREJO' : 'GENERICO';
    const cls = classificarRubrica(denominacao, codigo, empregadorSlug);
    rubricas.push({
      codigo, denominacao, classificacao,
      ...cls,
      valores_mensais: valores,
    });
  }

  if (rubricas.length === 0) return null;

  return {
    ano, empregado, empresa, rubricas,
    resumo_mensal: buildResumo(rubricas),
    _meta: {
      parser: 'ficha-financeira-deterministic-v4-pdfjs-ontologia-v2-classnorm',
      linhas_processadas: linhasProcessadas,
      linhas_filtradas: linhasFiltradas,
      meses_detectados: mesesDetectados.filter(m => m !== 'total'),
    },
  };
}

// ── Path 2: Text-layout ──

function parseTextLayout(texto: string, allLines: string[]): ResultadoParse | null {
  const { ano, empregado, empresa } = extractMetadata(texto);

  const headerLineRegex = /^[ \t]*C[oó]digo\s+Denomina[cç][aã]o\s+Clas/i;
  const separatorRegex = /^[ \t]*-{4,}/;
  const rubricaLineRegex = /^[ \t]+(\d{4})\s+(.+)/;

  const pageHeaders: Array<{ headerIdx: number; columns: ColumnSpan[] }> = [];
  for (let i = 0; i < allLines.length; i++) {
    if (headerLineRegex.test(allLines[i])) {
      const nextLine = i + 1 < allLines.length && separatorRegex.test(allLines[i + 1])
        ? allLines[i + 1]
        : null;
      const columns = detectTextLayoutColumns(allLines[i], nextLine);
      if (columns.length >= 3) {
        pageHeaders.push({ headerIdx: i, columns });
      }
    }
  }

  if (pageHeaders.length === 0) return null;

  const rubricas = new Map<string, RubricaExtraida>();
  // Candidatos a órfãos rescisórios: rubricas que apareceram numa seção com
  // valor SÓ na coluna Total (nenhum mês individual da seção). Pode ser
  // verba rescisória legítima OU repetição do anual em fichas completas.
  // No final, filtramos por: códigos que NÃO entraram em `rubricas` (ou seja,
  // que NUNCA tiveram valor mensal em nenhuma seção) — esses são os reais
  // órfãos rescisórios.
  const candidatosOrfaos = new Map<string, {
    codigo: string;
    denominacao: string;
    classificacao: string;
    valor_total: number;
  }>();
  let linhasProcessadas = 0;
  let linhasFiltradas = 0;
  const cutoffCodigos = new Set<string>();

  for (const { headerIdx, columns } of pageHeaders) {
    let dataStart = headerIdx + 1;
    if (dataStart < allLines.length && separatorRegex.test(allLines[dataStart])) {
      dataStart++;
    }

    let cutoffAlcancado = false;

    for (let i = dataStart; i < allLines.length; i++) {
      const raw = allLines[i];

      if (separatorRegex.test(raw)) continue;
      if (/^\s*$/.test(raw)) continue;
      if (headerLineRegex.test(raw)) break;
      if (/ficha\s+financeira/i.test(raw)) break;
      if (/Ano\s+Compet/i.test(raw)) break;
      if (/^\s*\d{4}\s+Total\s/i.test(raw)) continue;

      if (cutoffAlcancado) { linhasFiltradas++; continue; }

      const m = raw.match(rubricaLineRegex);
      if (!m) continue;

      const codigo = m[1];
      const restAfterCode = m[2];

      // Use the LAST match so that classification keywords embedded in the denomination
      // (e.g. "Reemb desc I Contr A PGTO") don't shadow the actual classification field.
      const clasMatches = [...restAfterCode.matchAll(/\s+(PGTO|DESC|BASE|ENCAR|OUTRO|PROV|INFO|PETO|PAGO|PQTO|PGLO|PGFO|DESO|DESD|DECS|BABE|INPO|ENCAP|OUTPO)\s/gi)];
      const clasMatch = clasMatches.at(-1);
      if (!clasMatch) continue;

      const denominacao = restAfterCode.substring(0, clasMatch.index!).trim();
      const classificacao = normalizarClassificacao(clasMatch[1]);

      // Bases de cálculo, encargos patronais, provisões e informações auxiliares
      // nunca são exportáveis. Filtrar aqui evita que seções OUTRO/PROV do ADP
      // (páginas 2, 4, 5 em fichas multi-página Joseli/Izabela) poluam o output
      // após o cutoff ter sido resetado pelo próximo cabeçalho de seção.
      if (['BASE', 'ENCAR', 'OUTRO', 'PROV', 'INFO'].includes(classificacao)) continue;

      // Regra do escritório: primeiro código DESC encerra a captura da seção
      // (proventos antes de descontos). Próximo cabeçalho ADP reseta o cutoff
      // — múltiplas seções com seus próprios blocos de DESC funcionam.
      if (classificacao === 'DESC') {
        cutoffAlcancado = true;
        continue;
      }

      linhasProcessadas++;

      const codeStartInLine = raw.indexOf(codigo);
      const clasStartInLine = raw.indexOf(clasMatch[1], codeStartInLine + 4);
      const clasEndInLine = clasStartInLine + clasMatch[1].length;

      const valores: Array<{ competencia: string; valor: number }> = [];
      let valorTotalIsolado = 0;
      for (const col of columns) {
        const effectiveStart = Math.max(col.start, clasEndInLine);
        if (effectiveStart >= raw.length) continue;
        const slice = raw.substring(effectiveStart, Math.min(col.end, raw.length)).trim();
        if (!slice) continue;

        const valor = parseBR(slice);
        if (valor <= 0) continue;

        if (col.mm === 'total') {
          // Captura o Total separadamente — usado só pra detectar verbas
          // rescisórias órfãs (valor em Total sem corresp. em mês individual).
          // ADP consolida pagamentos rescisórios na coluna Total da seção
          // Ago-Dez em rescisões antecipadas.
          valorTotalIsolado = valor;
        } else {
          const comp = col.mm === '13' ? `${ano}-13` : `${ano}-${col.mm}`;
          valores.push({ competencia: comp, valor });
        }
      }

      // Valor SÓ na coluna Total nesta seção (nenhum mês individual):
      // candidato a órfão rescisório. Filtragem final depois do loop.
      if (valores.length === 0 && valorTotalIsolado > 0) {
        const ja = candidatosOrfaos.get(codigo);
        if (ja) {
          ja.valor_total = Math.max(ja.valor_total, valorTotalIsolado);
        } else {
          candidatosOrfaos.set(codigo, {
            codigo,
            denominacao,
            classificacao,
            valor_total: valorTotalIsolado,
          });
        }
        continue;
      }

      if (valores.length === 0) continue;

      const empregadorSlug = empresa.toUpperCase().includes('VIA VAREJO') ? 'VIA_VAREJO' : 'GENERICO';
      const cls = classificarRubrica(denominacao, codigo, empregadorSlug);

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
          codigo, denominacao, classificacao,
          ...cls,
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
      parser: 'ficha-financeira-deterministic-v4-pdfjs-ontologia-v2-classnorm',
      linhas_processadas: linhasProcessadas,
      linhas_filtradas: linhasFiltradas,
      meses_detectados: [...allMeses].sort(),
      // Filtra candidatos: só são órfãos REAIS aqueles cujo código NUNCA
      // teve valor mensal em nenhuma seção (não está em `rubricas`).
      // Códigos com valor mensal em alguma seção + total em outra são apenas
      // a coluna Total agregando o anual (não é verba órfã).
      rubricas_totais_orfaos: [...candidatosOrfaos.values()].filter(
        o => !rubricas.has(o.codigo),
      ),
    },
  };
}

// ── Entry point ──

export function parseFichaFinanceiraDeterministico(
  texto: string,
): ResultadoParse | null {
  if (!texto || texto.length < 200) return null;

  const hasFichaFinanceira = /ficha\s+financeira/i.test(texto);
  const hasCodigo = /\bC[oó]digo\b/i.test(texto);
  if (!hasFichaFinanceira || !hasCodigo) return null;

  const allLines = texto.split(/\r?\n/);

  if (texto.includes('|')) {
    const mdResult = parseMarkdownTable(texto, allLines);
    if (mdResult && mdResult.rubricas.length >= 3) return mdResult;
  }

  const hasTextLayoutLines = /^\s+\d{4}\s+\w/m.test(texto);
  if (hasTextLayoutLines) {
    const tlResult = parseTextLayout(texto, allLines);
    if (tlResult && tlResult.rubricas.length >= 3) return tlResult;
  }

  return null;
}
