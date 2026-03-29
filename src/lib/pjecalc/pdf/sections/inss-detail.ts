/**
 * Section: INSS / Contribuicao Social Detail
 *
 * Renders CS segurado (employee) and empregador (employer) tables.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderINSSDetail(ctx: PDFRenderContext): string {
  const { result } = ctx;
  const cs = result.contribuicao_social;

  if (cs.total_segurado <= 0 && cs.total_empregador <= 0) {
    return '';
  }

  // Segurado (employee share)
  const segRows = cs.segurado_devidos.map(s => `
    <tr>
      <td class="center">${fmt.competenciaShort(s.competencia)}</td>
      <td class="num">${fmt.decimal(s.base)}</td>
      <td class="num">${fmt.percent(s.aliquota * 100)}</td>
      <td class="num">${fmt.decimal(s.valor)}</td>
      <td class="num">${fmt.decimal(s.recolhido)}</td>
      <td class="num">${fmt.decimal(s.diferenca)}</td>
    </tr>
  `).join('');

  // Empregador (employer share)
  const empRows = cs.empregador.map(e => `
    <tr>
      <td class="center">${fmt.competenciaShort(e.competencia)}</td>
      <td class="num">${fmt.decimal(e.empresa)}</td>
      <td class="num">${fmt.decimal(e.sat)}</td>
      <td class="num">${fmt.decimal(e.terceiros)}</td>
      <td class="num">${fmt.decimal(e.empresa + e.sat + e.terceiros)}</td>
    </tr>
  `).join('');

  let html = '';

  if (cs.total_segurado > 0) {
    html += `
    <h2>Contribuicao Social - Segurado</h2>
    <table>
      <thead>
        <tr><th>Comp.</th><th>Base</th><th>Aliquota</th><th>Valor</th><th>Recolhido</th><th>Diferenca</th></tr>
      </thead>
      <tbody>
        ${segRows}
        <tr class="grand-total">
          <td colspan="3"><strong>Total CS Segurado</strong></td>
          <td class="num"><strong>${fmt.decimal(cs.total_segurado)}</strong></td>
          <td></td><td></td>
        </tr>
      </tbody>
    </table>`;
  }

  if (cs.total_empregador > 0) {
    html += `
    <h2>Contribuicao Social - Empregador</h2>
    <table>
      <thead>
        <tr><th>Comp.</th><th>Empresa</th><th>SAT/RAT</th><th>Terceiros</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${empRows}
        <tr class="grand-total">
          <td><strong>Total CS Empregador</strong></td>
          <td></td><td></td><td></td>
          <td class="num"><strong>${fmt.decimal(cs.total_empregador)}</strong></td>
        </tr>
      </tbody>
    </table>`;
  }

  return html;
}
