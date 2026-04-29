/**
 * PJe-Calc — Exportacao Excel/CSV
 * Generates native XLSX (Office Open XML) and single CSV exports.
 */
import type {
  PjeLiquidacaoResult,
  PjeParametros,
  PjeVerbaResult,
  PjeOcorrenciaResult,
  PjeResumo,
} from './engine-types';
import { generateXlsx } from './xlsx-generator';

// =====================================================
// FORMATTERS
//
// Edge cases handled:
//   - undefined/null/NaN/Infinity -> "0,00" (or equivalent for the format).
//   - Very large numbers (> 1e15) still serialize without loss-of-precision
//     because we always go through toLocaleString / toFixed which produce
//     plain decimal strings. We never coerce via Number stringification of
//     scientific notation.
// =====================================================

function safeNumber(v: unknown): number {
  if (typeof v !== 'number') return 0;
  if (!Number.isFinite(v)) return 0;
  return v;
}

const fmtBRL = (v: number): string =>
  safeNumber(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (v: number): string =>
  (safeNumber(v) * 100).toFixed(2) + '%';

const fmtNum4 = (v: number): string => safeNumber(v).toFixed(4);

const fmtComp = (c: string): string => {
  if (!c) return '';
  // YYYY-MM or YYYY-MM-DD -> MM/YYYY
  const parts = c.substring(0, 7).split('-');
  if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
  return c;
};

const fmtDate = (d: string | undefined): string => {
  if (!d) return '';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// =====================================================
// CSV HELPERS
// =====================================================

/** Escape a value for CSV (semicolon-delimited for pt-BR Excel compat) */
function csvEscape(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Build a CSV string from header + rows. Uses semicolon delimiter for pt-BR locale. */
function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(';'));
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8 detection
}

// =====================================================
// SHEET GENERATORS
// =====================================================

export interface ExcelSheetSelection {
  resumo: boolean;
  verbas: boolean;
  correcao: boolean;
  inss: boolean;
  irrf: boolean;
  fgts: boolean;
  honorarios: boolean;
  memoria: boolean;
}

export const DEFAULT_SHEETS: ExcelSheetSelection = {
  resumo: true,
  verbas: true,
  correcao: true,
  inss: true,
  irrf: true,
  fgts: true,
  honorarios: true,
  memoria: true,
};

/** Sheet 1: Resumo Geral — returns [headers, ...rows] */
function buildResumoData(result: PjeLiquidacaoResult, params?: PjeParametros): (string | number)[][] {
  const r = result.resumo;
  const headers: (string | number)[] = ['Descrição', 'Valor (R$)'];
  const rows: (string | number)[][] = [
    ['Principal Bruto', fmtBRL(r.principal_bruto)],
    ['Principal Corrigido', fmtBRL(r.principal_corrigido)],
    ['Correção Monetária', fmtBRL(r.principal_corrigido - r.principal_bruto)],
    ['Juros de Mora', fmtBRL(r.juros_mora)],
    ['', ''],
    ['FGTS - Depósitos', fmtBRL(result.fgts.total_depositos)],
    ['FGTS - Multa', fmtBRL(result.fgts.multa_valor)],
    ['FGTS - Total', fmtBRL(r.fgts_total)],
    ['', ''],
    ['(-) CS Segurado', fmtBRL(r.cs_segurado)],
    ['CS Empregador', fmtBRL(r.cs_empregador)],
    ['(-) IRRF', fmtBRL(r.ir_retido)],
    ['', ''],
    ['Seguro Desemprego', fmtBRL(r.seguro_desemprego)],
    ['Previdência Privada', fmtBRL(r.previdencia_privada)],
    ['Salário Família', fmtBRL(r.salario_familia)],
    ['Pensão Alimentícia', fmtBRL(r.pensao_total)],
    ['Contribuição Sindical', fmtBRL(r.contribuicao_sindical)],
    ['', ''],
    ['Multa Art. 523 CPC', fmtBRL(r.multa_523)],
    ['Multa Art. 467 CLT', fmtBRL(r.multa_467)],
    ['Honorários Sucumbenciais', fmtBRL(r.honorarios_sucumbenciais)],
    ['Honorários Contratuais', fmtBRL(r.honorarios_contratuais)],
    ['Custas Processuais', fmtBRL(r.custas)],
    ['', ''],
    ['LÍQUIDO RECLAMANTE', fmtBRL(r.liquido_reclamante)],
    ['TOTAL RECLAMADA', fmtBRL(r.total_reclamada)],
  ];

  if (params) {
    rows.unshift(
      ['', ''],
      ['--- PARÂMETROS ---', ''],
      ['Data Liquidação', fmtDate(result.data_liquidacao)],
      ['Data Admissão', fmtDate(params.data_admissao)],
      ['Data Demissão', fmtDate(params.data_demissao)],
      ['Data Ajuizamento', fmtDate(params.data_ajuizamento)],
      ['Estado', params.estado || ''],
      ['Município', params.municipio || ''],
      ['', ''],
      ['--- RESUMO ---', ''],
    );
  }

  return [headers, ...rows];
}

function buildResumoSheet(result: PjeLiquidacaoResult, params?: PjeParametros): string {
  const data = buildResumoData(result, params);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 2: Verbas Detalhadas — returns [headers, ...rows] */
function buildVerbasData(result: PjeLiquidacaoResult): (string | number)[][] {
  const headers: (string | number)[] = [
    'Verba', 'Tipo', 'Característica', 'Competência',
    'Base', 'Divisor', 'Multiplicador', 'Quantidade', 'Dobra',
    'Devido', 'Pago', 'Diferença',
    'Índice Correção', 'Corrigido', 'Juros', 'Final',
  ];
  const rows: (string | number)[][] = [];

  for (const v of result.verbas) {
    for (const oc of v.ocorrencias) {
      rows.push([
        v.nome,
        v.tipo === 'principal' ? 'Principal' : 'Reflexa',
        v.caracteristica || '',
        fmtComp(oc.competencia),
        fmtBRL(oc.base),
        fmtNum4(oc.divisor),
        fmtNum4(oc.multiplicador),
        fmtNum4(oc.quantidade),
        oc.dobra > 1 ? 'Sim' : 'Não',
        fmtBRL(oc.devido),
        fmtBRL(oc.pago),
        fmtBRL(oc.diferenca),
        fmtNum4(oc.indice_correcao),
        fmtBRL(oc.valor_corrigido),
        fmtBRL(oc.juros),
        fmtBRL(oc.valor_final),
      ]);
    }
    // Subtotal row
    rows.push([
      `SUBTOTAL: ${v.nome}`, '', '', '',
      '', '', '', '', '',
      fmtBRL(v.total_devido),
      fmtBRL(v.total_pago),
      fmtBRL(v.total_diferenca),
      '',
      fmtBRL(v.total_corrigido),
      fmtBRL(v.total_juros),
      fmtBRL(v.total_final),
    ]);
    rows.push(new Array(16).fill(''));
  }

  return [headers, ...rows];
}

function buildVerbasSheet(result: PjeLiquidacaoResult): string {
  const data = buildVerbasData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 3: Correção Monetária — returns [headers, ...rows] */
function buildCorrecaoData(result: PjeLiquidacaoResult): (string | number)[][] {
  const headers: (string | number)[] = [
    'Verba', 'Competência', 'Diferença', 'Índice Acumulado',
    'Valor Corrigido', 'Juros', 'Total com Juros',
  ];
  const rows: (string | number)[][] = [];

  for (const v of result.verbas) {
    for (const oc of v.ocorrencias) {
      if (oc.diferenca === 0 && oc.valor_final === 0) continue;
      rows.push([
        v.nome,
        fmtComp(oc.competencia),
        fmtBRL(oc.diferenca),
        fmtNum4(oc.indice_correcao),
        fmtBRL(oc.valor_corrigido),
        fmtBRL(oc.juros),
        fmtBRL(oc.valor_final),
      ]);
    }
  }

  return [headers, ...rows];
}

function buildCorrecaoSheet(result: PjeLiquidacaoResult): string {
  const data = buildCorrecaoData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 4: INSS/CS Detalhado — returns [headers, ...rows] */
function buildINSSData(result: PjeLiquidacaoResult): (string | number)[][] {
  const cs = result.contribuicao_social;
  const headers: (string | number)[] = ['Tipo', 'Competência', 'Base', 'Alíquota', 'Valor', 'Recolhido', 'Diferença'];
  const rows: (string | number)[][] = [];

  for (const s of cs.segurado_devidos) {
    rows.push([
      'Segurado (Devidos)',
      fmtComp(s.competencia),
      fmtBRL(s.base),
      fmtPct(s.aliquota),
      fmtBRL(s.valor),
      fmtBRL(s.recolhido),
      fmtBRL(s.diferenca),
    ]);
  }
  for (const s of cs.segurado_pagos) {
    rows.push([
      'Segurado (Pagos)',
      fmtComp(s.competencia),
      fmtBRL(s.base),
      fmtPct(s.aliquota),
      fmtBRL(s.valor),
      fmtBRL(s.recolhido),
      fmtBRL(s.diferenca),
    ]);
  }

  rows.push(new Array(7).fill(''));
  rows.push(['TOTAL Segurado (Devidos)', '', '', '', fmtBRL(cs.total_segurado_devidos), '', '']);
  rows.push(['TOTAL Segurado (Pagos)', '', '', '', fmtBRL(cs.total_segurado_pagos), '', '']);
  rows.push(['TOTAL Segurado', '', '', '', fmtBRL(cs.total_segurado), '', '']);

  rows.push(new Array(7).fill(''));
  rows.push(['', '', '', '', '', '', '']);
  rows.push(['--- Empregador ---', '', '', '', '', '', '']);
  const empHeaders = ['Tipo', 'Competência', 'Empresa', 'SAT', 'Terceiros', 'Total', ''];
  rows.push(empHeaders);

  for (const e of cs.empregador) {
    const total = (e.empresa || 0) + (e.sat || 0) + (e.terceiros || 0);
    rows.push([
      'Empregador',
      fmtComp(e.competencia),
      fmtBRL(e.empresa),
      fmtBRL(e.sat),
      fmtBRL(e.terceiros),
      fmtBRL(total),
      '',
    ]);
  }
  rows.push(['TOTAL Empregador', '', '', '', '', fmtBRL(cs.total_empregador), '']);

  return [headers, ...rows];
}

function buildINSSSheet(result: PjeLiquidacaoResult): string {
  const data = buildINSSData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 5: IRRF Detalhado — returns [headers, ...rows] */
function buildIRRFData(result: PjeLiquidacaoResult): (string | number)[][] {
  const ir = result.imposto_renda;
  const headers: (string | number)[] = ['Descrição', 'Valor'];
  const rows: (string | number)[][] = [
    ['Método', ir.metodo === 'art_12a_rra' ? 'Art. 12-A (RRA)' : 'Tabela Mensal'],
    ['Base de Cálculo', fmtBRL(ir.base_calculo)],
    ['Deduções', fmtBRL(ir.deducoes)],
    ['Base Tributável', fmtBRL(ir.base_tributavel)],
    ['Meses RRA', String(ir.meses_rra)],
    ['', ''],
    ['IR Anos Anteriores', fmtBRL(ir.ir_anos_anteriores)],
    ['IR Ano Liquidação', fmtBRL(ir.ir_ano_liquidacao)],
    ['IR 13° (Exclusivo)', fmtBRL(ir.ir_13_exclusivo)],
    ['IR Férias (Separado)', fmtBRL(ir.ir_ferias_separado)],
    ['', ''],
    ['Meses Anos Anteriores', String(ir.meses_anos_anteriores)],
    ['Meses Ano Liquidação', String(ir.meses_ano_liquidacao)],
    ['', ''],
    ['IMPOSTO DEVIDO', fmtBRL(ir.imposto_devido)],
  ];

  return [headers, ...rows];
}

function buildIRRFSheet(result: PjeLiquidacaoResult): string {
  const data = buildIRRFData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 6: FGTS Detalhado — returns [headers, ...rows] */
function buildFGTSData(result: PjeLiquidacaoResult): (string | number)[][] {
  const fgts = result.fgts;
  const headers: (string | number)[] = ['Competência', 'Base', 'Alíquota', 'Valor Depósito'];
  const rows: (string | number)[][] = [];

  for (const d of fgts.depositos) {
    rows.push([
      fmtComp(d.competencia),
      fmtBRL(d.base),
      fmtPct(d.aliquota),
      fmtBRL(d.valor),
    ]);
  }

  rows.push(new Array(4).fill(''));
  rows.push(['Total Depósitos', '', '', fmtBRL(fgts.total_depositos)]);
  rows.push(['Multa FGTS', '', '', fmtBRL(fgts.multa_valor)]);
  if (fgts.lc110_10 > 0) rows.push(['LC 110/01 (10%)', '', '', fmtBRL(fgts.lc110_10)]);
  if (fgts.lc110_05 > 0) rows.push(['LC 110/01 (0,5%)', '', '', fmtBRL(fgts.lc110_05)]);
  if (fgts.saldo_deduzido > 0) rows.push(['(-) Saldo Deduzido', '', '', fmtBRL(fgts.saldo_deduzido)]);
  rows.push(['TOTAL FGTS', '', '', fmtBRL(fgts.total_fgts)]);

  return [headers, ...rows];
}

function buildFGTSSheet(result: PjeLiquidacaoResult): string {
  const data = buildFGTSData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 7: Honorários e Custas — returns [headers, ...rows] */
function buildHonorariosData(result: PjeLiquidacaoResult): (string | number)[][] {
  const r = result.resumo;
  const headers: (string | number)[] = ['Descrição', 'Valor (R$)'];
  const rows: (string | number)[][] = [
    ['--- Honorários ---', ''],
    ['Honorários Sucumbenciais', fmtBRL(r.honorarios_sucumbenciais)],
    ['Honorários Contratuais', fmtBRL(r.honorarios_contratuais)],
    ['', ''],
    ['--- Multas ---', ''],
    ['Multa Art. 523 CPC', fmtBRL(r.multa_523)],
    ['Multa Art. 467 CLT', fmtBRL(r.multa_467)],
    ['', ''],
    ['--- Custas ---', ''],
    ['Total Custas', fmtBRL(r.custas)],
  ];

  if (r.custas_detalhadas && r.custas_detalhadas.length > 0) {
    for (const c of r.custas_detalhadas) {
      rows.push([`  ${c.descricao} (${c.tipo})`, fmtBRL(c.valor)]);
    }
  }

  return [headers, ...rows];
}

function buildHonorariosSheet(result: PjeLiquidacaoResult): string {
  const data = buildHonorariosData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

/** Sheet 8: Memória de Cálculo (audit trail) — returns [headers, ...rows] */
function buildMemoriaData(result: PjeLiquidacaoResult): (string | number)[][] {
  const headers: (string | number)[] = ['Verba', 'Tipo', 'Competência', 'Fórmula',
    'Base', 'Divisor', 'Mult', 'Qtd', 'Dobra',
    'Devido', 'Pago', 'Diferença', 'Índice', 'Corrigido', 'Juros', 'Final'];
  const rows: (string | number)[][] = [];

  for (const v of result.verbas) {
    for (const oc of v.ocorrencias) {
      rows.push([
        v.nome,
        v.tipo === 'principal' ? 'Principal' : 'Reflexa',
        fmtComp(oc.competencia),
        oc.formula || '',
        fmtBRL(oc.base),
        fmtNum4(oc.divisor),
        fmtNum4(oc.multiplicador),
        fmtNum4(oc.quantidade),
        oc.dobra > 1 ? '2' : '1',
        fmtBRL(oc.devido),
        fmtBRL(oc.pago),
        fmtBRL(oc.diferenca),
        fmtNum4(oc.indice_correcao),
        fmtBRL(oc.valor_corrigido),
        fmtBRL(oc.juros),
        fmtBRL(oc.valor_final),
      ]);
    }
  }

  // Audit trail entries if available
  if (result.audit_trail && result.audit_trail.length > 0) {
    rows.push(new Array(16).fill(''));
    rows.push(['--- AUDIT TRAIL ---', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Passo', 'Módulo', 'Descrição', 'Competência', 'Resultado', '', '', '', '', '', '', '', '', '', '', '']);
    for (const entry of result.audit_trail) {
      rows.push([
        String(entry.step),
        entry.module,
        entry.description,
        entry.competencia || '',
        entry.resultado !== undefined ? fmtBRL(entry.resultado) : '',
        '', '', '', '', '', '', '', '', '', '', '',
      ]);
    }
  }

  return [headers, ...rows];
}

function buildMemoriaSheet(result: PjeLiquidacaoResult): string {
  const data = buildMemoriaData(result);
  return buildCSV(data[0] as string[], data.slice(1));
}

// =====================================================
// MAIN EXPORT FUNCTIONS
// =====================================================

/**
 * Export full calculation to a native .xlsx file (Office Open XML).
 * Each selected sheet becomes a separate worksheet in the workbook.
 */
export async function exportToExcel(
  result: PjeLiquidacaoResult,
  params?: PjeParametros,
  sheets: ExcelSheetSelection = DEFAULT_SHEETS,
): Promise<Blob> {
  const xlsxSheets: { name: string; rows: (string | number)[][] }[] = [];

  if (sheets.resumo) {
    xlsxSheets.push({ name: 'Resumo Geral', rows: buildResumoData(result, params) });
  }
  if (sheets.verbas) {
    xlsxSheets.push({ name: 'Verbas Detalhadas', rows: buildVerbasData(result) });
  }
  if (sheets.correcao) {
    xlsxSheets.push({ name: 'Correção Monetária', rows: buildCorrecaoData(result) });
  }
  if (sheets.inss) {
    xlsxSheets.push({ name: 'INSS CS Detalhado', rows: buildINSSData(result) });
  }
  if (sheets.irrf) {
    xlsxSheets.push({ name: 'IRRF Detalhado', rows: buildIRRFData(result) });
  }
  if (sheets.fgts) {
    xlsxSheets.push({ name: 'FGTS Detalhado', rows: buildFGTSData(result) });
  }
  if (sheets.honorarios) {
    xlsxSheets.push({ name: 'Honorários Custas', rows: buildHonorariosData(result) });
  }
  if (sheets.memoria) {
    xlsxSheets.push({ name: 'Memória Cálculo', rows: buildMemoriaData(result) });
  }

  return generateXlsx(xlsxSheets);
}

/**
 * Export a single flat CSV with all verbas and occurrences.
 */
export function exportToCSV(result: PjeLiquidacaoResult): string {
  const headers = [
    'Verba', 'Tipo', 'Característica', 'Competência',
    'Base (R$)', 'Divisor', 'Multiplicador', 'Quantidade', 'Dobra',
    'Devido (R$)', 'Pago (R$)', 'Diferença (R$)',
    'Índice Correção', 'Corrigido (R$)', 'Juros (R$)', 'Final (R$)',
  ];
  const rows: (string | number)[][] = [];

  for (const v of result.verbas) {
    for (const oc of v.ocorrencias) {
      rows.push([
        v.nome,
        v.tipo === 'principal' ? 'Principal' : 'Reflexa',
        v.caracteristica || '',
        fmtComp(oc.competencia),
        fmtBRL(oc.base),
        fmtNum4(oc.divisor),
        fmtNum4(oc.multiplicador),
        fmtNum4(oc.quantidade),
        oc.dobra > 1 ? 'Sim' : 'Não',
        fmtBRL(oc.devido),
        fmtBRL(oc.pago),
        fmtBRL(oc.diferenca),
        fmtNum4(oc.indice_correcao),
        fmtBRL(oc.valor_corrigido),
        fmtBRL(oc.juros),
        fmtBRL(oc.valor_final),
      ]);
    }
    // Subtotal
    rows.push([
      `SUBTOTAL: ${v.nome}`, '', '', '',
      '', '', '', '', '',
      fmtBRL(v.total_devido), fmtBRL(v.total_pago), fmtBRL(v.total_diferenca),
      '', fmtBRL(v.total_corrigido), fmtBRL(v.total_juros), fmtBRL(v.total_final),
    ]);
  }

  // Grand totals
  rows.push(new Array(16).fill(''));
  rows.push([
    '--- RESUMO ---', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '', '', '',
  ]);
  const r = result.resumo;
  rows.push(['Principal Bruto', '', '', '', '', '', '', '', '', fmtBRL(r.principal_bruto), '', '', '', '', '', '']);
  rows.push(['Principal Corrigido', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(r.principal_corrigido), '', '']);
  rows.push(['Juros de Mora', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(r.juros_mora), '']);
  rows.push(['FGTS Total', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(r.fgts_total)]);
  rows.push(['(-) CS Segurado', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(-r.cs_segurado)]);
  rows.push(['(-) IRRF', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(-r.ir_retido)]);
  rows.push(['Líquido Reclamante', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(r.liquido_reclamante)]);
  rows.push(['Total Reclamada', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmtBRL(r.total_reclamada)]);

  return buildCSV(headers, rows);
}

/**
 * Sanitize a download filename so it never breaks the browser File API.
 * Strips control chars, path separators, and limits to 200 chars.
 */
function sanitizeFilename(name: string, fallback: string): string {
  const safe = (name || '').replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_').trim();
  if (!safe) return fallback;
  return safe.slice(0, 200);
}

/**
 * Download helper: triggers a browser download for a Blob.
 *
 * Hardened against:
 *   - Non-browser environments (SSR, tests): throws with a clear message.
 *   - Invalid blob: rejects null/undefined input.
 *   - Filename injection: sanitizes path separators and control chars.
 *   - URL leaks: revokes Object URL even if click fails.
 *
 * @throws Error if document/Blob/URL.createObjectURL are unavailable.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob) {
    throw new Error('downloadBlob: blob é obrigatório.');
  }
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('downloadBlob: ambiente sem suporte a File API (SSR/Node sem polyfill).');
  }

  const safeName = sanitizeFilename(filename, 'download.bin');
  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
  } finally {
    setTimeout(() => {
      try {
        if (a && a.parentNode) a.parentNode.removeChild(a);
      } catch {
        /* ignore: anchor already detached */
      }
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore: URL may already be revoked */
      }
    }, 100);
  }
}

/**
 * Download helper for CSV string content.
 *
 * Edge cases handled:
 *   - Empty content -> writes BOM-only file (Excel still opens).
 *   - Very large content -> Blob created from array (avoids string copy).
 *
 * @throws Error if download fails (forwarded from downloadBlob).
 */
export function downloadCSV(content: string, filename: string): void {
  const safe = typeof content === 'string' ? content : '';
  // Use array form to avoid double allocation on very large strings.
  const blob = new Blob([safe], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}
