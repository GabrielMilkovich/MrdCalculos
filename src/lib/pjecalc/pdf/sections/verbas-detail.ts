/**
 * Section: Verbas Detail (Memoria de Calculo por Ocorrencia)
 *
 * Renders the detailed occurrence-by-occurrence breakdown for each verba.
 * This is the core "memoria de calculo" table.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderVerbaDetail(ctx: PDFRenderContext): string {
  const { result } = ctx;

  if (result.verbas.length === 0) {
    return '<h2>Memoria de Calculo</h2><p style="font-size:7pt; color:#888;">Nenhuma verba calculada.</p>';
  }

  const verbaBlocks = result.verbas.map(v => {
    const ocRows = v.ocorrencias.map(oc => `
      <tr>
        <td class="center">${fmt.competenciaShort(oc.competencia)}</td>
        <td class="num">${fmt.decimal(oc.base)}</td>
        <td class="num">${fmt.index(oc.multiplicador)}</td>
        <td class="num">${fmt.index(oc.divisor)}</td>
        <td class="num">${fmt.index(oc.quantidade)}</td>
        <td class="center">${oc.dobra > 1 ? '\u00d72' : '\u00d71'}</td>
        <td class="num">${fmt.decimal(oc.devido)}</td>
        <td class="num">${fmt.decimal(oc.pago)}</td>
        <td class="num">${fmt.decimal(oc.diferenca)}</td>
        <td class="num">${fmt.index(oc.indice_correcao)}</td>
        <td class="num">${fmt.decimal(oc.valor_corrigido)}</td>
        <td class="num">${fmt.decimal(oc.juros)}</td>
        <td class="num"><strong>${fmt.decimal(oc.valor_final)}</strong></td>
      </tr>
    `).join('');

    return `
    <div class="avoid-break">
      <h3>${v.nome} <span class="badge">${v.tipo === 'principal' ? 'Principal' : 'Reflexa'}</span></h3>
      <table>
        <thead>
          <tr>
            <th>Comp.</th><th>Base</th><th>Mult.</th><th>Div.</th><th>Qtd.</th><th>Dobra</th>
            <th>Devido</th><th>Pago</th><th>Diferenca</th><th>Indice</th><th>Corrigido</th>
            <th>Juros</th><th>Final</th>
          </tr>
        </thead>
        <tbody>
          ${ocRows}
          <tr class="total-row">
            <td colspan="6"><strong>SUBTOTAL</strong></td>
            <td class="num"><strong>${fmt.decimal(v.total_devido)}</strong></td>
            <td class="num"><strong>${fmt.decimal(v.total_pago)}</strong></td>
            <td class="num"><strong>${fmt.decimal(v.total_diferenca)}</strong></td>
            <td></td>
            <td class="num"><strong>${fmt.decimal(v.total_corrigido)}</strong></td>
            <td class="num"><strong>${fmt.decimal(v.total_juros)}</strong></td>
            <td class="num"><strong>${fmt.decimal(v.total_final)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
  });

  return `
  <h2>Memoria de Calculo por Ocorrencia</h2>
  ${verbaBlocks.join('\n')}`;
}
