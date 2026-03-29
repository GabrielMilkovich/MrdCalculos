/**
 * Section: Summary (Resumo do Calculo)
 *
 * Renders the calculation summary table showing all verbas
 * with corrigido, juros, and total columns.
 * Also shows FGTS rows and grand total.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

/**
 * Build the flat verbas rows matching PJe-Calc format.
 * Principals first, then their reflexes underneath.
 */
function buildFlatVerbasRows(ctx: PDFRenderContext): string {
  const { result, dadosProcesso } = ctx;
  const linkage = dadosProcesso.verbasLinkage;
  const principals = result.verbas.filter(v => v.tipo === 'principal');
  const reflexas = result.verbas.filter(v => v.tipo !== 'principal');

  let rows = '';
  const matchedIds = new Set<string>();

  for (const p of principals) {
    rows += `
      <tr>
        <td class="left">${p.nome.toUpperCase()}</td>
        <td class="num">${fmt.decimal(p.total_corrigido)}</td>
        <td class="num">${fmt.decimal(p.total_juros)}</td>
        <td class="num">${fmt.decimal(p.total_final)}</td>
      </tr>`;

    const children = reflexas.filter(r => {
      if (linkage && linkage[r.verba_id] === p.verba_id) return true;
      const nUp = r.nome.toUpperCase();
      const pUp = p.nome.toUpperCase();
      return nUp.includes(pUp) || nUp.endsWith('SOBRE ' + pUp);
    });

    for (const ref of children) {
      matchedIds.add(ref.verba_id);
      rows += `
        <tr>
          <td class="left">${ref.nome.toUpperCase()}</td>
          <td class="num">${fmt.decimal(ref.total_corrigido)}</td>
          <td class="num">${fmt.decimal(ref.total_juros)}</td>
          <td class="num">${fmt.decimal(ref.total_final)}</td>
        </tr>`;
    }
  }

  // Orphan reflexes
  for (const ref of reflexas) {
    if (matchedIds.has(ref.verba_id)) continue;
    rows += `
      <tr>
        <td class="left">${ref.nome.toUpperCase()}</td>
        <td class="num">${fmt.decimal(ref.total_corrigido)}</td>
        <td class="num">${fmt.decimal(ref.total_juros)}</td>
        <td class="num">${fmt.decimal(ref.total_final)}</td>
      </tr>`;
  }

  return rows;
}

export function renderSummary(ctx: PDFRenderContext): string {
  const { result } = ctx;
  const verbasRows = buildFlatVerbasRows(ctx);

  const totalCorrigido = result.resumo.principal_corrigido;
  const totalJuros = result.resumo.juros_mora;
  const totalFinal = totalCorrigido + totalJuros;

  const fgtsCorrigido = (result.fgts.total_depositos || 0) + (result.fgts.multa_valor || 0);
  const fgtsFinal = result.fgts.total_fgts || 0;

  const grandTotalCorrigido = totalCorrigido + fgtsCorrigido;
  const grandTotalJuros = totalJuros;
  const grandTotalFinal = totalFinal + fgtsFinal;

  const pctRemuneratorio = grandTotalFinal > 0
    ? ((totalFinal / grandTotalFinal) * 100).toFixed(2)
    : '100.00';

  return `
  <h2>Resumo do Calculo</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:55%">Descricao do Bruto Devido ao Reclamante</th>
        <th style="width:15%">Valor Corrigido</th>
        <th style="width:15%">Juros</th>
        <th style="width:15%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${verbasRows}
      ${result.fgts.total_fgts > 0 ? `
      <tr>
        <td class="left">FGTS 8%</td>
        <td class="num">${fmt.decimal(result.fgts.total_depositos)}</td>
        <td class="num">${fmt.decimal(0)}</td>
        <td class="num">${fmt.decimal(result.fgts.total_depositos)}</td>
      </tr>
      <tr>
        <td class="left">MULTA SOBRE FGTS 40%</td>
        <td class="num">${fmt.decimal(result.fgts.multa_valor)}</td>
        <td class="num">${fmt.decimal(0)}</td>
        <td class="num">${fmt.decimal(result.fgts.multa_valor)}</td>
      </tr>` : ''}
      <tr class="grand-total">
        <td class="left">Total</td>
        <td class="num">${fmt.decimal(grandTotalCorrigido)}</td>
        <td class="num">${fmt.decimal(grandTotalJuros)}</td>
        <td class="num">${fmt.decimal(grandTotalFinal)}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size: 7pt; color: #555;">
    Percentual de Parcelas Remuneratorias e Tributaveis: ${pctRemuneratorio}%
  </p>`;
}
