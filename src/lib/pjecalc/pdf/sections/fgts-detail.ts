/**
 * Section: FGTS Detail
 *
 * Renders FGTS deposits per competencia and totals.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderFGTSDetail(ctx: PDFRenderContext): string {
  const { result } = ctx;

  if (result.fgts.total_fgts <= 0 && result.fgts.depositos.length === 0) {
    return '';
  }

  const rows = result.fgts.depositos.map(d => `
    <tr>
      <td class="center">${fmt.competenciaShort(d.competencia)}</td>
      <td class="num">${fmt.decimal(d.base)}</td>
      <td class="num">${fmt.percent(d.aliquota * 100)}</td>
      <td class="num">${fmt.decimal(d.valor)}</td>
    </tr>
  `).join('');

  return `
  <h2>FGTS - Depositos por Competencia</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Base</th><th>Aliquota</th><th>Valor</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3"><strong>Total Depositos</strong></td>
        <td class="num"><strong>${fmt.decimal(result.fgts.total_depositos)}</strong></td>
      </tr>
      <tr><td colspan="3">Multa FGTS</td><td class="num">${fmt.decimal(result.fgts.multa_valor)}</td></tr>
      ${result.fgts.lc110_10 > 0 ? `<tr><td colspan="3">LC 110/01 (10%)</td><td class="num">${fmt.decimal(result.fgts.lc110_10)}</td></tr>` : ''}
      ${result.fgts.lc110_05 > 0 ? `<tr><td colspan="3">LC 110/01 (0,5%)</td><td class="num">${fmt.decimal(result.fgts.lc110_05)}</td></tr>` : ''}
      ${result.fgts.saldo_deduzido > 0 ? `<tr class="deduction"><td colspan="3">(-) Saldo FGTS Deduzido</td><td class="num">(${fmt.decimal(result.fgts.saldo_deduzido)})</td></tr>` : ''}
      <tr class="grand-total">
        <td colspan="3"><strong>TOTAL FGTS</strong></td>
        <td class="num"><strong>${fmt.decimal(result.fgts.total_fgts)}</strong></td>
      </tr>
    </tbody>
  </table>`;
}
