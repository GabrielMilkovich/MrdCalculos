/**
 * PJe-Calc - Relatorio Demonstrativo de Seguro Desemprego.
 *
 * Baseado no DemonstrativoSeguroDesemprego do PJe-Calc oficial.
 *
 * Secoes:
 *   1. Cabecalho (processo, beneficiario, data liquidacao)
 *   2. Tempo de contribuicao e requisitos
 *   3. Numero de parcelas (Lei 7.998/90 art. 4-5)
 *   4. Valor parcela e total
 *   5. Fundamento legal
 *
 * Fundamento: Lei 7.998/90. Parcelas variam de 3 a 5 conforme tempo de
 * trabalho nos 36 meses anteriores a dispensa (art. 4o).
 */
import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult, PjeSeguroConfig } from './engine-types';
import { disclaimerHtml } from './pdf-disclaimer';

Decimal.set({ precision: 20 });

export interface RelatorioSeguroDesempregoMeta {
  cliente?: string;
  processo?: string;
  reclamado?: string;
  dataLiquidacao?: string;
  dataAdmissao?: string;
  dataDispensa?: string;
  calculoId?: string | number;
  engineVersion?: string;
  seguroConfig?: PjeSeguroConfig;
  /** Meses de trabalho no periodo de referencia (36 meses antes da dispensa). */
  mesesContribuicao?: number;
}

const fmtBRL = (v: number | Decimal) => {
  const n = v instanceof Decimal ? v.toNumber() : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtDateBR = (d?: string) => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
@page { margin: 12mm 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; line-height: 1.4; }
.page-header { border-bottom: 2px solid #003366; padding-bottom: 6px; margin-bottom: 12px; text-align: center; }
.page-header h1 { font-size: 13pt; color: #003366; }
.page-header .subtitle { font-size: 8pt; color: #333; margin-top: 2px; }
h2 { font-size: 10pt; color: #003366; margin: 16px 0 6px; padding: 3px 0; border-bottom: 1px solid #003366; }
table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 8pt; }
th { background: #003366; color: #fff; padding: 4px 6px; border: 1px solid #003366; text-align: center; }
td { padding: 3px 6px; border: 1px solid #ccc; }
td.num { text-align: right; font-family: 'Courier New', monospace; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
.params { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 10px; }
.params .item { border: 1px solid #003366; background: #f0f4fa; padding: 4px 8px; border-radius: 3px; font-size: 8pt; }
.total-geral { margin: 18px 0; padding: 10px 16px; border: 2px solid #003366; background: #f0f4fa; border-radius: 4px; display: flex; justify-content: space-between; }
.total-geral .label { font-weight: 700; color: #003366; text-transform: uppercase; }
.total-geral .value { font-size: 13pt; font-weight: 800; color: #003366; font-family: 'Courier New', monospace; }
.legal { margin-top: 10px; font-size: 7.5pt; color: #555; font-style: italic; }
.page-footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 7pt; color: #888; display: flex; justify-content: space-between; }
`;

/** Meses inteiros entre duas datas YYYY-MM-DD. Nunca negativo. */
function mesesEntre(de?: string, ate?: string): number {
  if (!de || !ate) return 0;
  const dy = parseInt(de.substring(0, 4), 10);
  const dm = parseInt(de.substring(5, 7), 10);
  const ay = parseInt(ate.substring(0, 4), 10);
  const am = parseInt(ate.substring(5, 7), 10);
  if (![dy, dm, ay, am].every(Number.isFinite)) return 0;
  const diff = (ay - dy) * 12 + (am - dm);
  return diff > 0 ? diff : 0;
}

export function buildRelatorioSeguroDesempregoHTML(
  result: PjeLiquidacaoResult,
  meta: RelatorioSeguroDesempregoMeta = {},
): string {
  const sd = result.seguro_desemprego;
  const cfg = meta.seguroConfig;
  const meses =
    meta.mesesContribuicao ?? mesesEntre(meta.dataAdmissao, meta.dataDispensa);
  const total = new Decimal(Number.isFinite(sd.total) ? sd.total : 0);
  const valorParcela = new Decimal(Number.isFinite(sd.valor_parcela) ? sd.valor_parcela : 0);

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Seguro Desemprego - ${escapeHtml(meta.processo || 'MRDcalc')}</title>
<style>${CSS}</style></head><body>
<div class="page-header">
  <h1>DEMONSTRATIVO DE SEGURO DESEMPREGO</h1>
  <div class="subtitle">Reclamante: ${escapeHtml(meta.cliente || '—')}</div>
  ${meta.reclamado ? `<div class="subtitle">Reclamado: ${escapeHtml(meta.reclamado)}</div>` : ''}
  <div class="subtitle">Processo: ${escapeHtml(meta.processo || '—')} | Data Liquidacao: ${fmtDateBR(meta.dataLiquidacao)}</div>
</div>

<h2>Tempo de Contribuicao</h2>
<div class="params">
  <div class="item"><strong>Admissao:</strong> ${fmtDateBR(meta.dataAdmissao)}</div>
  <div class="item"><strong>Dispensa:</strong> ${fmtDateBR(meta.dataDispensa)}</div>
  <div class="item"><strong>Meses:</strong> ${meses}</div>
  <div class="item"><strong>Ja recebeu:</strong> ${cfg?.recebeu ? 'Sim' : 'Nao'}</div>
</div>

<h2>Parcelas Devidas</h2>
<table>
  <thead><tr>
    <th style="width:40%">Item</th>
    <th style="width:60%">Valor</th>
  </tr></thead>
  <tbody>
    <tr><td>Numero de parcelas (Lei 7.998/90 art. 4-5)</td><td class="center">${sd.parcelas}</td></tr>
    <tr><td>Valor por parcela</td><td class="num">${fmtBRL(valorParcela)}</td></tr>
    <tr><td>Apurado</td><td class="center">${sd.apurado ? 'Sim' : 'Nao'}</td></tr>
  </tbody>
</table>

<h2>Detalhamento</h2>
<table>
  <thead><tr>
    <th style="width:20%">Parcela</th>
    <th style="width:40%">Descricao</th>
    <th style="width:40%">Valor</th>
  </tr></thead>
  <tbody>
    ${Array.from({ length: sd.parcelas })
      .map(
        (_, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>Parcela ${i + 1} de ${sd.parcelas}</td>
        <td class="num">${fmtBRL(valorParcela)}</td>
      </tr>`,
      )
      .join('')}
    ${sd.parcelas === 0
      ? '<tr><td colspan="3" class="center" style="font-style:italic;color:#777;">Nenhuma parcela apurada.</td></tr>'
      : ''}
  </tbody>
</table>

<div class="total-geral">
  <span class="label">Total Seguro Desemprego</span>
  <span class="value">R$ ${fmtBRL(total)}</span>
</div>

<div class="legal">Fundamento legal: Lei 7.998/90 (art. 4o e 5o). O numero de parcelas varia de 3 a 5 conforme o tempo de trabalho nos 36 meses anteriores a dispensa, com valor calculado sobre a media dos ultimos salarios.</div>

<div class="page-footer">
  <span>Gerado por MRDcalc v${meta.engineVersion || '2.1.0'} em ${new Date().toLocaleString('pt-BR')}</span>
  <span>Processo: ${escapeHtml(meta.processo || '—')}</span>
</div>
${disclaimerHtml()}
</body></html>`;
}

export function gerarRelatorioSeguroDesemprego(
  result: PjeLiquidacaoResult,
  meta: RelatorioSeguroDesempregoMeta = {},
): Blob {
  const html = buildRelatorioSeguroDesempregoHTML(result, meta);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
