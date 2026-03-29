/**
 * Section: Timecard (Cartao de Ponto Diario)
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderTimecard(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp } = ctx;
  const dias = dp.cartaoPontoDiario || [];

  if (dias.length === 0) {
    return '';
  }

  const rows = dias.map(d => `
    <tr>
      <td class="center">${fmt.date(d.data)}</td>
      <td class="center">${d.dia}</td>
      <td class="center">${d.frequencia}</td>
      <td class="num">${fmt.number(d.hs_trabalhadas, 2)}</td>
      <td class="num">${fmt.number(d.hs_ext_diarias, 2)}</td>
      <td class="num">${fmt.number(d.hs_ext_semanais, 2)}</td>
      <td class="num">${fmt.number(d.hs_ext_repousos, 2)}</td>
      <td class="num">${fmt.number(d.hs_ext_feriados, 2)}</td>
      <td class="num">${fmt.number(d.hs_interjornadas, 2)}</td>
      <td class="num">${fmt.number(d.hs_art384, 2)}</td>
    </tr>
  `).join('');

  return `
  <h2>Cartao de Ponto Diario</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Dia</th><th>Freq.</th>
        <th>H. Trab.</th><th>HE Diarias</th><th>HE Semanais</th>
        <th>HE Repousos</th><th>HE Feriados</th><th>Interjornada</th><th>Art. 384</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
