/**
 * Section: IR Detail (Imposto de Renda)
 *
 * Renders the income tax calculation breakdown using Art. 12-A (RRA) method.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderIRDetail(ctx: PDFRenderContext): string {
  const { result } = ctx;
  const ir = result.imposto_renda;

  if (ir.imposto_devido <= 0) {
    return '';
  }

  const rows: [string, string][] = [
    ['Base de Calculo', fmt.decimal(ir.base_calculo)],
    ['Deducoes', fmt.decimal(ir.deducoes)],
    ['Base Tributavel', fmt.decimal(ir.base_tributavel)],
    ['Meses RRA', ir.meses_rra.toString()],
    ['Metodo', ir.metodo === 'art_12a_rra' ? 'Art. 12-A (RRA)' : 'Tabela Mensal'],
  ];

  if (ir.ir_anos_anteriores > 0) {
    rows.push(['IR Anos Anteriores', fmt.decimal(ir.ir_anos_anteriores)]);
  }
  if (ir.ir_ano_liquidacao > 0) {
    rows.push(['IR Ano da Liquidacao', fmt.decimal(ir.ir_ano_liquidacao)]);
  }
  if (ir.ir_13_exclusivo > 0) {
    rows.push(['IR 13o Exclusivo', fmt.decimal(ir.ir_13_exclusivo)]);
  }
  if (ir.ir_ferias_separado > 0) {
    rows.push(['IR Ferias (Separado)', fmt.decimal(ir.ir_ferias_separado)]);
  }

  rows.push(['IRRF Devido', fmt.decimal(ir.imposto_devido)]);

  return `
  <h2>Imposto de Renda - Art. 12-A Lei 7.713/88 (RRA)</h2>
  <table>
    <tbody>
      ${rows.map(([label, value], i) => {
        const isTotal = i === rows.length - 1;
        return `<tr${isTotal ? ' class="grand-total"' : ''}>
          <th style="width:50%; text-align:left;">${isTotal ? `<strong>${label}</strong>` : label}</th>
          <td class="num">${isTotal ? `<strong>${value}</strong>` : value}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}
