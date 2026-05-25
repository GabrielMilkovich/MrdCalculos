/**
 * PJe-Calc - Relatório Memória de Cálculo por Ocorrência
 * Generates detailed memory report showing calculations per competence.
 */
import type { PjeLiquidacaoResult } from "./engine-types";
import { disclaimerHtml } from './pdf-disclaimer';

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtNum = (v: number) => (v || 0).toFixed(4);

export function gerarRelatorioMemoriaCalculo(
  result: PjeLiquidacaoResult,
  meta: {
    cliente?: string;
    processo?: string;
    dataLiquidacao?: string;
    engineVersion?: string;
  }
) {
  const verbaRows = result.verbas.map(v => {
    const ocRows = v.ocorrencias.map(oc => `
      <tr>
        <td class="comp">${oc.competencia}</td>
        <td class="num">${fmt(oc.base)}</td>
        <td class="num">${fmtNum(oc.multiplicador)}</td>
        <td class="num">${fmtNum(oc.divisor)}</td>
        <td class="num">${fmtNum(oc.quantidade)}</td>
        <td class="num">${oc.dobra > 1 ? '×2' : '×1'}</td>
        <td class="num">${fmt(oc.devido)}</td>
        <td class="num">${fmt(oc.pago)}</td>
        <td class="num">${fmt(oc.diferenca)}</td>
        <td class="num">${fmtNum(oc.indice_correcao)}</td>
        <td class="num">${fmt(oc.valor_corrigido)}</td>
        <td class="num">${fmt(oc.juros)}</td>
        <td class="num"><strong>${fmt(oc.valor_final)}</strong></td>
      </tr>
    `).join("");

    return `
      <h3>${v.nome} <span class="badge">${v.tipo === 'principal' ? 'Principal' : 'Reflexa'}</span></h3>
      <table>
        <thead>
          <tr>
            <th>Comp.</th><th>Base</th><th>Mult.</th><th>Div.</th><th>Qtd.</th><th>Dobra</th>
            <th>Devido</th><th>Pago</th><th>Diferença</th><th>Índice</th><th>Corrigido</th>
            <th>Juros</th><th>Final</th>
          </tr>
        </thead>
        <tbody>
          ${ocRows}
          <tr class="total">
            <td colspan="6"><strong>SUBTOTAL</strong></td>
            <td class="num"><strong>${fmt(v.total_devido)}</strong></td>
            <td class="num"><strong>${fmt(v.total_pago)}</strong></td>
            <td class="num"><strong>${fmt(v.total_diferenca)}</strong></td>
            <td></td>
            <td class="num"><strong>${fmt(v.total_corrigido)}</strong></td>
            <td class="num"><strong>${fmt(v.total_juros)}</strong></td>
            <td class="num"><strong>${fmt(v.total_final)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }).join("");

  // FGTS detail
  const fgtsRows = result.fgts.depositos.map(d => `
    <tr>
      <td class="comp">${d.competencia}</td>
      <td class="num">${fmt(d.base)}</td>
      <td class="num">${(d.aliquota * 100).toFixed(1)}%</td>
      <td class="num">${fmt(d.valor)}</td>
    </tr>
  `).join("");

  // CS detail
  const csRows = [...result.contribuicao_social.segurado_devidos, ...result.contribuicao_social.segurado_pagos].map(s => `
    <tr>
      <td class="comp">${s.competencia}</td>
      <td class="num">${fmt(s.base)}</td>
      <td class="num">${(s.aliquota * 100).toFixed(2)}%</td>
      <td class="num">${fmt(s.valor)}</td>
      <td class="num">${fmt(s.recolhido)}</td>
      <td class="num">${fmt(s.diferenca)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Memória de Cálculo — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 10mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 14px; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 11px; margin: 12px 0 4px; border-bottom: 2px solid #2563eb; padding-bottom: 2px; color: #2563eb; }
  h3 { font-size: 10px; margin: 10px 0 3px; color: #1e40af; }
  .header { text-align: center; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .header .subtitle { font-size: 10px; color: #666; }
  .badge { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 3px 0 10px; }
  th, td { padding: 2px 4px; border: 1px solid #ddd; font-size: 7px; }
  th { background: #f0f4ff; font-weight: 600; text-align: center; }
  td.num { text-align: right; font-family: 'Consolas', monospace; }
  td.comp { text-align: center; font-family: 'Consolas', monospace; }
  tr.total { background: #f0f4ff; font-weight: 700; }
  .footer { margin-top: 12px; text-align: center; font-size: 7px; color: #999; border-top: 1px solid #ddd; padding-top: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>MEMÓRIA DE CÁLCULO</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"} — ${meta.cliente || ""}</div>
    <div class="subtitle">Data da Liquidação: ${meta.dataLiquidacao || new Date().toLocaleDateString("pt-BR")} — Engine v${meta.engineVersion || "2.1.0"}</div>
  </div>

  <h2>1. Verbas — Detalhamento por Ocorrência</h2>
  ${verbaRows}

  ${result.fgts.total_fgts > 0 ? `
  <h2>2. FGTS — Depósitos por Competência</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Base</th><th>Alíquota</th><th>Valor</th></tr></thead>
    <tbody>
      ${fgtsRows}
      <tr class="total">
        <td colspan="3"><strong>Total Depósitos</strong></td>
        <td class="num"><strong>${fmt(result.fgts.total_depositos)}</strong></td>
      </tr>
      <tr><td colspan="3">Multa FGTS</td><td class="num">${fmt(result.fgts.multa_valor)}</td></tr>
      ${result.fgts.lc110_10 > 0 ? `<tr><td colspan="3">LC 110/01 (10%)</td><td class="num">${fmt(result.fgts.lc110_10)}</td></tr>` : ''}
      ${result.fgts.lc110_05 > 0 ? `<tr><td colspan="3">LC 110/01 (0,5%)</td><td class="num">${fmt(result.fgts.lc110_05)}</td></tr>` : ''}
      <tr class="total"><td colspan="3"><strong>TOTAL FGTS</strong></td><td class="num"><strong>${fmt(result.fgts.total_fgts)}</strong></td></tr>
    </tbody>
  </table>` : ''}

  ${result.contribuicao_social.total_segurado > 0 ? `
  <h2>3. Contribuição Social — Segurado</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Base</th><th>Alíquota Efetiva</th><th>Valor</th><th>Recolhido</th><th>Diferença</th></tr></thead>
    <tbody>
      ${csRows}
      <tr class="total">
        <td colspan="3"><strong>Total CS Segurado</strong></td>
        <td class="num"><strong>${fmt(result.contribuicao_social.total_segurado)}</strong></td>
        <td></td><td></td>
      </tr>
    </tbody>
  </table>` : ''}

  ${result.imposto_renda.imposto_devido > 0 ? `
  <h2>4. Imposto de Renda — Art. 12-A (RRA)</h2>
  <table>
    <tr><th style="width:40%">Base de Cálculo</th><td class="num">${fmt(result.imposto_renda.base_calculo)}</td></tr>
    <tr><th>Deduções</th><td class="num">${fmt(result.imposto_renda.deducoes)}</td></tr>
    <tr><th>Meses RRA</th><td class="num">${result.imposto_renda.meses_rra}</td></tr>
    <tr><th><strong>IRRF Devido</strong></th><td class="num"><strong>${fmt(result.imposto_renda.imposto_devido)}</strong></td></tr>
  </table>` : ''}

  <h2>5. Resumo Consolidado</h2>
  <table>
    <tr><th style="width:50%">Principal Bruto</th><td class="num">${fmt(result.resumo.principal_bruto)}</td></tr>
    <tr><th>Correção Monetária</th><td class="num">${fmt(result.resumo.principal_corrigido - result.resumo.principal_bruto)}</td></tr>
    <tr><th>Juros de Mora</th><td class="num">${fmt(result.resumo.juros_mora)}</td></tr>
    <tr><th>FGTS Total</th><td class="num">${fmt(result.resumo.fgts_total)}</td></tr>
    <tr><th>(-) CS Segurado</th><td class="num">${fmt(-result.resumo.cs_segurado)}</td></tr>
    <tr><th>(-) IRRF</th><td class="num">${fmt(-result.resumo.ir_retido)}</td></tr>
    ${result.resumo.honorarios_sucumbenciais > 0 ? `<tr><th>Honorários Sucumbenciais</th><td class="num">${fmt(result.resumo.honorarios_sucumbenciais)}</td></tr>` : ''}
    ${result.resumo.honorarios_contratuais > 0 ? `<tr><th>Honorários Contratuais</th><td class="num">${fmt(result.resumo.honorarios_contratuais)}</td></tr>` : ''}
    ${result.resumo.custas > 0 ? `<tr><th>Custas</th><td class="num">${fmt(result.resumo.custas)}</td></tr>` : ''}
    ${result.resumo.multa_523 > 0 ? `<tr><th>Multa Art. 523 CPC</th><td class="num">${fmt(result.resumo.multa_523)}</td></tr>` : ''}
    <tr class="total"><th><strong>LÍQUIDO RECLAMANTE</strong></th><td class="num"><strong>${fmt(result.resumo.liquido_reclamante)}</strong></td></tr>
    <tr><th>CS Empregador</th><td class="num">${fmt(result.resumo.cs_empregador)}</td></tr>
    <tr class="total"><th><strong>TOTAL RECLAMADA</strong></th><td class="num"><strong>${fmt(result.resumo.total_reclamada)}</strong></td></tr>
  </table>

  <div class="footer">
    Memória de Cálculo — MRDcalc v${meta.engineVersion || "2.1.0"} — ${new Date().toLocaleString("pt-BR")}
  </div>
  ${disclaimerHtml()}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
