/**
 * Section: Totals (Resumo Consolidado Final)
 *
 * Renders the final consolidated summary table and signature block.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderTotals(ctx: PDFRenderContext): string {
  const { result, config } = ctx;
  const r = result.resumo;

  const linhas: [string, string, string?][] = [
    ['Principal Bruto', fmt.decimal(r.principal_bruto)],
    ['Correcao Monetaria', fmt.decimal(r.principal_corrigido - r.principal_bruto)],
    ['Juros de Mora', fmt.decimal(r.juros_mora)],
    ['FGTS Total', fmt.decimal(r.fgts_total)],
    ['(-) CS Segurado', fmt.decimal(-r.cs_segurado), 'deduction'],
    ['(-) IRRF', fmt.decimal(-r.ir_retido), 'deduction'],
  ];

  if (r.seguro_desemprego > 0) linhas.push(['Seguro-Desemprego', fmt.decimal(r.seguro_desemprego)]);
  if (r.previdencia_privada > 0) linhas.push(['(-) Previdencia Privada', fmt.decimal(-r.previdencia_privada), 'deduction']);
  if ((r.pensao_total || 0) > 0) linhas.push(['(-) Pensao Alimenticia', fmt.decimal(-(r.pensao_total || 0)), 'deduction']);
  if (r.honorarios_sucumbenciais > 0) linhas.push(['Honorarios Sucumbenciais', fmt.decimal(r.honorarios_sucumbenciais)]);
  if (r.honorarios_contratuais > 0) linhas.push(['Honorarios Contratuais', fmt.decimal(r.honorarios_contratuais)]);
  if (r.custas > 0) linhas.push(['Custas', fmt.decimal(r.custas)]);
  if (r.multa_523 > 0) linhas.push(['Multa Art. 523 CPC', fmt.decimal(r.multa_523)]);
  if ((r.multa_467 || 0) > 0) linhas.push(['Multa Art. 467 CLT', fmt.decimal(r.multa_467)]);

  const hoje = new Date().toLocaleString('pt-BR');

  return `
  <h2>Resumo Consolidado</h2>
  <table>
    <tbody>
      ${linhas.map(([label, value, cls]) => `
        <tr${cls === 'deduction' ? ' class="deduction"' : ''}>
          <th style="width:50%; text-align:left;">${label}</th>
          <td class="num">${value}</td>
        </tr>
      `).join('')}
      <tr class="grand-total">
        <th style="text-align:left;"><strong>LIQUIDO RECLAMANTE</strong></th>
        <td class="num"><strong>${fmt.decimal(r.liquido_reclamante)}</strong></td>
      </tr>
      <tr>
        <th style="text-align:left;">CS Empregador</th>
        <td class="num">${fmt.decimal(r.cs_empregador)}</td>
      </tr>
      <tr class="total-row">
        <th style="text-align:left;"><strong>TOTAL RECLAMADA</strong></th>
        <td class="num"><strong>${fmt.decimal(r.total_reclamada)}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- Signature block -->
  <div class="assinatura-block">
    <div class="assinatura-line">Perito / Calculista</div>
    <div class="assinatura-line">Data</div>
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <span>Calculo liquidado por MRDcalc v${config.engineVersion} em ${hoje}</span>
  </div>

  <!-- Compliance footer -->
  <div class="footer-compliance" style="margin-top: 40px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center;">
    Gerado pelo MRD CALC — resultados sujeitos à conferência com o PJe-Calc oficial.<br/>
    Este documento não substitui a memória de cálculo oficial para fins processuais.
  </div>`;
}
