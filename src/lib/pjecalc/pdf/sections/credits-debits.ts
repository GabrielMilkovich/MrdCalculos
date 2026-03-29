/**
 * Section: Credits & Debits
 *
 * Renders two tables:
 * 1. Credits/discounts from the claimant's perspective (bruto, deductions, net)
 * 2. Debits from the defendant's perspective (what the employer owes)
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderCreditsDebits(ctx: PDFRenderContext): string {
  const { result, dadosProcesso } = ctx;
  const r = result.resumo;

  const totalCorrigido = r.principal_corrigido;
  const totalJuros = r.juros_mora;
  const totalFinal = totalCorrigido + totalJuros;
  const fgtsFinal = result.fgts.total_fgts || 0;
  const grandTotalFinal = totalFinal + fgtsFinal;

  const totalDescontos = r.cs_segurado + r.ir_retido + (r.pensao_total || 0) + (r.previdencia_privada || 0);

  return `
  <!-- Credits and Discounts -->
  <h2>Descricao de Creditos e Descontos do Reclamante</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:65%">VERBAS</th>
        <th style="width:35%">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${fgtsFinal > 0 ? `<tr><td class="left">FGTS</td><td class="num">${fmt.decimal(fgtsFinal)}</td></tr>` : ''}
      <tr><td class="left">Bruto Devido ao Reclamante</td><td class="num">${fmt.decimal(grandTotalFinal)}</td></tr>
      ${r.cs_segurado > 0 ? `<tr class="deduction"><td class="left">DEDUCAO DE CONTRIBUICAO SOCIAL</td><td class="num">(${fmt.decimal(r.cs_segurado)})</td></tr>` : ''}
      <tr><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">${r.ir_retido > 0 ? `(${fmt.decimal(r.ir_retido)})` : '0,00'}</td></tr>
      ${(r.pensao_total || 0) > 0 ? `<tr class="deduction"><td class="left">PENSAO ALIMENTICIA</td><td class="num">(${fmt.decimal(r.pensao_total)})</td></tr>` : ''}
      ${(r.previdencia_privada || 0) > 0 ? `<tr class="deduction"><td class="left">PREVIDENCIA PRIVADA</td><td class="num">(${fmt.decimal(r.previdencia_privada)})</td></tr>` : ''}
      <tr class="total-row"><td class="left">Total de Descontos</td><td class="num">(${fmt.decimal(totalDescontos)})</td></tr>
      <tr class="grand-total"><td class="left">Liquido Devido ao Reclamante</td><td class="num">${fmt.decimal(r.liquido_reclamante)}</td></tr>
    </tbody>
  </table>

  <!-- Debts of the Defendant -->
  <h2>Descricao de Debitos do Reclamado por Credor</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:65%">Descricao</th>
        <th style="width:35%">Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="left">LIQUIDO DEVIDO AO RECLAMANTE</td><td class="num">${fmt.decimal(r.liquido_reclamante)}</td></tr>
      ${r.cs_empregador > 0 ? `<tr><td class="left">CONTRIBUICAO SOCIAL SOBRE SALARIOS DEVIDOS</td><td class="num">${fmt.decimal(r.cs_empregador)}</td></tr>` : ''}
      ${r.cs_segurado > 0 ? `<tr><td class="left">CONTRIBUICAO SOCIAL SEGURADO (recolher a RFB)</td><td class="num">${fmt.decimal(r.cs_segurado)}</td></tr>` : ''}
      ${r.honorarios_sucumbenciais > 0 ? `<tr><td class="left">HONORARIOS LIQUIDOS PARA ${(dadosProcesso.honorariosNome || 'ADVOGADO').toUpperCase()}</td><td class="num">${fmt.decimal(r.honorarios_sucumbenciais)}</td></tr>` : ''}
      ${r.honorarios_contratuais > 0 ? `<tr><td class="left">HONORARIOS CONTRATUAIS PARA ${(dadosProcesso.honorariosNome || 'ADVOGADO').toUpperCase()}</td><td class="num">${fmt.decimal(r.honorarios_contratuais)}</td></tr>` : ''}
      <tr><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">${r.ir_retido > 0 ? fmt.decimal(r.ir_retido) : '0,00'}</td></tr>
      ${r.custas > 0 ? `<tr><td class="left">CUSTAS PROCESSUAIS</td><td class="num">${fmt.decimal(r.custas)}</td></tr>` : ''}
      ${r.multa_523 > 0 ? `<tr><td class="left">MULTA ART. 523, par.1 CPC</td><td class="num">${fmt.decimal(r.multa_523)}</td></tr>` : ''}
      ${(r.multa_467 || 0) > 0 ? `<tr><td class="left">MULTA ART. 467 CLT</td><td class="num">${fmt.decimal(r.multa_467)}</td></tr>` : ''}
      <tr class="grand-total"><td class="left">Total Devido pelo Reclamado</td><td class="num">${fmt.decimal(r.total_reclamada)}</td></tr>
    </tbody>
  </table>`;
}
