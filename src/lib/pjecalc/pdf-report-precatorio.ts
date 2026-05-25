/**
 * PJe-Calc - Relatorio de Precatorio / RPV
 *
 * Gera relatorio HTML (como Blob, visualizavel e imprimivel) estruturado em 12 secoes:
 *   1.  Cabecalho (processo, tipo precatorio, esfera, data liquidacao)
 *   2.  Valor Bruto Devido (principal corrigido)
 *   3.  Credito Total ao Reclamante (liquido)
 *   4.  Debito Reclamante - INSS segurado
 *   5.  Debito Reclamante - IR retido
 *   6.  Debito Reclamado - INSS empregador + SAT + Terceiros
 *   7.  FGTS + Multa 40%
 *   8.  Multas (523 + 467)
 *   9.  Honorarios Sucumbenciais / Contratuais
 *   10. Custas Judiciais (com detalhamento por tipo)
 *   11. Atualizacao Monetaria acumulada
 *   12. Totais Consolidados
 *
 * Usa apenas dados ja presentes em `PjeLiquidacaoResult.resumo` +
 * `resumo.custas_detalhadas`.
 *
 * Regras:
 *   - Valores monetarios via Decimal.js (nunca number nativo para somas).
 *   - Formatacao pt-BR, 2 casas.
 *   - Tipos aceitos: FEDERAL, ESTADUAL, MUNICIPAL.
 */
import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult } from './engine-types';
import { disclaimerHtml } from './pdf-disclaimer';

Decimal.set({ precision: 20 });

export type TipoPrecatorio = 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';

export interface RelatorioPrecatorioMeta {
  tipoPrecatorio: TipoPrecatorio;
  esfera: string;
  processo: string;
}

const fmtBRL = (v: number | Decimal): string => {
  const n = v instanceof Decimal ? v.toNumber() : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtDate = (d?: string): string => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TIPO_LABELS: Record<TipoPrecatorio, string> = {
  FEDERAL: 'Precatorio Federal',
  ESTADUAL: 'Precatorio Estadual',
  MUNICIPAL: 'Precatorio Municipal',
};

const CSS = `
@page { margin: 12mm 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #000;
  line-height: 1.4;
  background: #fff;
}
.header {
  border-bottom: 2px solid #003366;
  padding-bottom: 6px;
  margin-bottom: 12px;
}
.header h1 {
  font-size: 14pt;
  color: #003366;
  margin: 0;
}
.header .meta {
  font-size: 8.5pt;
  color: #333;
  margin-top: 4px;
}
h2 {
  font-size: 10pt;
  color: #003366;
  margin: 12px 0 4px;
  padding: 3px 0;
  border-bottom: 1px solid #003366;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 4px 0 8px;
  font-size: 9pt;
}
th {
  background: #003366;
  color: #fff;
  text-align: left;
  padding: 4px 6px;
  font-size: 8.5pt;
}
td {
  padding: 3px 6px;
  border: 1px solid #ccc;
}
td.num { text-align: right; font-family: 'Courier New', monospace; }
tr.total td { font-weight: 700; background: #e6edf5; }
tr.grand td { font-weight: 700; background: #003366; color: #fff; }
.section-empty { font-size: 8pt; color: #888; font-style: italic; }
.footer {
  margin-top: 16px;
  padding-top: 4px;
  border-top: 1px solid #ccc;
  font-size: 7.5pt;
  color: #777;
}
`;

interface Totais {
  valorBruto: Decimal;
  credito: Decimal;
  inssSegurado: Decimal;
  irRetido: Decimal;
  inssPatronal: Decimal;
  fgtsTotal: Decimal;
  multas: Decimal;
  honorarios: Decimal;
  custas: Decimal;
  atualizacao: Decimal;
  totalConsolidado: Decimal;
}

function calcularTotais(resultado: PjeLiquidacaoResult): Totais {
  const r = resultado.resumo;
  const valorBruto = new Decimal(r.principal_corrigido || 0);
  const credito = new Decimal(r.liquido_reclamante || 0);
  const inssSegurado = new Decimal(r.cs_segurado || 0);
  const irRetido = new Decimal(r.ir_retido || 0);
  const inssPatronal = new Decimal(r.cs_empregador || 0);
  const fgtsTotal = new Decimal(r.fgts_total || 0);
  const multas = new Decimal(r.multa_523 || 0).plus(r.multa_467 || 0);
  const honorarios = new Decimal(r.honorarios_sucumbenciais || 0).plus(
    r.honorarios_contratuais || 0,
  );
  const custas = new Decimal(r.custas || 0);
  const atualizacao = new Decimal(r.principal_corrigido || 0)
    .minus(r.principal_bruto || 0)
    .plus(r.juros_mora || 0);
  const totalConsolidado = new Decimal(r.total_reclamada || 0);

  return {
    valorBruto,
    credito,
    inssSegurado,
    irRetido,
    inssPatronal,
    fgtsTotal,
    multas,
    honorarios,
    custas,
    atualizacao,
    totalConsolidado,
  };
}

function secaoCabecalho(resultado: PjeLiquidacaoResult, meta: RelatorioPrecatorioMeta): string {
  const tipoLabel = TIPO_LABELS[meta.tipoPrecatorio];
  return `
  <div class="header">
    <h1>RELATORIO DE ${escapeHtml(tipoLabel.toUpperCase())}</h1>
    <div class="meta">
      <strong>Processo:</strong> ${escapeHtml(meta.processo)} &nbsp;|&nbsp;
      <strong>Tipo:</strong> ${escapeHtml(meta.tipoPrecatorio)} &nbsp;|&nbsp;
      <strong>Esfera:</strong> ${escapeHtml(meta.esfera)} &nbsp;|&nbsp;
      <strong>Data Liquidacao:</strong> ${fmtDate(resultado.data_liquidacao)}
    </div>
  </div>`;
}

function linha(label: string, valor: Decimal | number, neg = false): string {
  const v = valor instanceof Decimal ? valor : new Decimal(valor);
  const txt = neg && v.gt(0) ? `(${fmtBRL(v)})` : fmtBRL(v);
  return `<tr><td>${escapeHtml(label)}</td><td class="num">${txt}</td></tr>`;
}

export function buildRelatorioPrecatorioHTML(
  resultado: PjeLiquidacaoResult,
  meta: RelatorioPrecatorioMeta,
): string {
  const t = calcularTotais(resultado);
  const r = resultado.resumo;

  // Custas detalhadas por tipo
  const custasPorTipo = new Map<string, Decimal>();
  for (const c of r.custas_detalhadas || []) {
    const atual = custasPorTipo.get(c.tipo) || new Decimal(0);
    custasPorTipo.set(c.tipo, atual.plus(c.valor || 0));
  }
  const custasRows = [...custasPorTipo.entries()]
    .map(
      ([tipo, val]) =>
        `<tr><td>${escapeHtml(tipo)}</td><td class="num">${fmtBRL(val)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatorio de Precatorio - Processo ${escapeHtml(meta.processo)}</title>
<style>${CSS}</style>
</head>
<body>
  <!-- 1. Cabecalho -->
  ${secaoCabecalho(resultado, meta)}

  <!-- 2. Valor Bruto Devido -->
  <h2>2. Valor Bruto Devido</h2>
  <table>
    <tbody>
      ${linha('Principal Bruto (Nominal)', r.principal_bruto)}
      ${linha('Principal Corrigido (Monetariamente Atualizado)', r.principal_corrigido)}
      <tr class="total"><td>Total Bruto Devido</td><td class="num">${fmtBRL(t.valorBruto)}</td></tr>
    </tbody>
  </table>

  <!-- 3. Credito Total ao Reclamante -->
  <h2>3. Credito Total ao Reclamante</h2>
  <table>
    <tbody>
      ${linha('Liquido Devido ao Reclamante', r.liquido_reclamante)}
      <tr class="total"><td>Credito Total</td><td class="num">${fmtBRL(t.credito)}</td></tr>
    </tbody>
  </table>

  <!-- 4. Debito Reclamante - INSS segurado -->
  <h2>4. Debito Reclamante - INSS Segurado</h2>
  <table>
    <tbody>
      ${linha('Contribuicao Previdenciaria - Segurado', r.cs_segurado, true)}
      <tr class="total"><td>Total INSS Segurado</td><td class="num">${fmtBRL(t.inssSegurado)}</td></tr>
    </tbody>
  </table>

  <!-- 5. Debito Reclamante - IR retido -->
  <h2>5. Debito Reclamante - IR Retido</h2>
  <table>
    <tbody>
      ${linha('Imposto de Renda Retido na Fonte', r.ir_retido, true)}
      <tr class="total"><td>Total IR Retido</td><td class="num">${fmtBRL(t.irRetido)}</td></tr>
    </tbody>
  </table>

  <!-- 6. Debito Reclamado - INSS Empregador + SAT + Terceiros -->
  <h2>6. Debito Reclamado - INSS Empregador + SAT + Terceiros</h2>
  <table>
    <tbody>
      ${linha('Contribuicao Previdenciaria Patronal (INSS + SAT + Terceiros)', r.cs_empregador)}
      <tr class="total"><td>Total Patronal</td><td class="num">${fmtBRL(t.inssPatronal)}</td></tr>
    </tbody>
  </table>

  <!-- 7. FGTS + Multa 40% -->
  <h2>7. FGTS + Multa 40%</h2>
  <table>
    <tbody>
      ${linha('FGTS + Multa 40% (Total Consolidado)', r.fgts_total)}
      <tr class="total"><td>Total FGTS</td><td class="num">${fmtBRL(t.fgtsTotal)}</td></tr>
    </tbody>
  </table>

  <!-- 8. Multas -->
  <h2>8. Multas (Art. 523 CPC + Art. 467 CLT)</h2>
  <table>
    <tbody>
      ${linha('Multa Art. 523 CPC', r.multa_523)}
      ${linha('Multa Art. 467 CLT', r.multa_467)}
      <tr class="total"><td>Total Multas</td><td class="num">${fmtBRL(t.multas)}</td></tr>
    </tbody>
  </table>

  <!-- 9. Honorarios -->
  <h2>9. Honorarios Sucumbenciais / Contratuais</h2>
  <table>
    <tbody>
      ${linha('Honorarios Sucumbenciais', r.honorarios_sucumbenciais)}
      ${linha('Honorarios Contratuais', r.honorarios_contratuais)}
      <tr class="total"><td>Total Honorarios</td><td class="num">${fmtBRL(t.honorarios)}</td></tr>
    </tbody>
  </table>

  <!-- 10. Custas Judiciais -->
  <h2>10. Custas Judiciais</h2>
  ${custasRows
    ? `<table>
    <thead><tr><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>
      ${custasRows}
      <tr class="total"><td>Total Custas</td><td class="num">${fmtBRL(t.custas)}</td></tr>
    </tbody>
  </table>`
    : `<p class="section-empty">Nenhuma custa apurada.</p>
  <table><tbody><tr class="total"><td>Total Custas</td><td class="num">${fmtBRL(t.custas)}</td></tr></tbody></table>`}

  <!-- 11. Atualizacao Monetaria acumulada -->
  <h2>11. Atualizacao Monetaria Acumulada</h2>
  <table>
    <tbody>
      ${linha('Correcao Monetaria (Principal Corrigido - Principal Bruto)', new Decimal(r.principal_corrigido || 0).minus(r.principal_bruto || 0))}
      ${linha('Juros de Mora', r.juros_mora)}
      <tr class="total"><td>Total Atualizacao</td><td class="num">${fmtBRL(t.atualizacao)}</td></tr>
    </tbody>
  </table>

  <!-- 12. Totais Consolidados -->
  <h2>12. Totais Consolidados</h2>
  <table>
    <tbody>
      ${linha('Credito ao Reclamante', t.credito)}
      ${linha('INSS Segurado', t.inssSegurado)}
      ${linha('IR Retido', t.irRetido)}
      ${linha('INSS Patronal', t.inssPatronal)}
      ${linha('FGTS + Multa', t.fgtsTotal)}
      ${linha('Multas', t.multas)}
      ${linha('Honorarios', t.honorarios)}
      ${linha('Custas', t.custas)}
      <tr class="grand"><td>TOTAL DEVIDO PELO RECLAMADO</td><td class="num">${fmtBRL(t.totalConsolidado)}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    Gerado por MRDcalc em ${new Date().toLocaleString('pt-BR')} — ${escapeHtml(TIPO_LABELS[meta.tipoPrecatorio])} / ${escapeHtml(meta.esfera)}
  </div>
  ${disclaimerHtml()}
</body>
</html>`;
}

export function gerarRelatorioPrecatorio(
  resultado: PjeLiquidacaoResult,
  meta: RelatorioPrecatorioMeta,
): Blob {
  const html = buildRelatorioPrecatorioHTML(resultado, meta);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
