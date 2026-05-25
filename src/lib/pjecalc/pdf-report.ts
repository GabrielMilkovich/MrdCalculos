/**
 * PJe-Calc PDF Report Generator
 * Generates a printable HTML report that opens in a new window for PDF printing.
 */
import type { PjeLiquidacaoResult } from "./engine-types";
import { disclaimerHtml } from './pdf-disclaimer';

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export function gerarRelatorioPDF(
  result: PjeLiquidacaoResult,
  meta: {
    cliente?: string;
    processo?: string;
    dataLiquidacao?: string;
    engineVersion?: string;
  }
) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Liquidação — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 12px; margin: 16px 0 6px; border-bottom: 2px solid #2563eb; padding-bottom: 3px; color: #2563eb; }
  h3 { font-size: 11px; margin: 10px 0 4px; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  .header .subtitle { font-size: 11px; color: #666; }
  .meta { display: flex; gap: 20px; font-size: 9px; color: #555; justify-content: center; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { padding: 4px 6px; border: 1px solid #ddd; font-size: 9px; }
  th { background: #f0f4ff; font-weight: 600; text-align: left; }
  td.num { text-align: right; font-family: 'Consolas', monospace; }
  tr.total { background: #f0f4ff; font-weight: 700; }
  tr.grand-total { background: #2563eb; color: white; font-weight: 700; }
  tr.grand-total td { border-color: #2563eb; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 8px 0; }
  .summary-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; text-align: center; }
  .summary-box .label { font-size: 8px; color: #666; text-transform: uppercase; }
  .summary-box .value { font-size: 14px; font-weight: 700; font-family: 'Consolas', monospace; }
  .summary-box.highlight { border-color: #2563eb; background: #f0f4ff; }
  .summary-box.highlight .value { color: #2563eb; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO DE LIQUIDAÇÃO</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"}</div>
    <div class="meta">
      ${meta.cliente ? `<span><strong>Reclamante:</strong> ${meta.cliente}</span>` : ""}
      <span><strong>Data da Liquidação:</strong> ${meta.dataLiquidacao || new Date().toLocaleDateString("pt-BR")}</span>
      <span><strong>Engine:</strong> v${meta.engineVersion || "2.0.0"}</span>
    </div>
  </div>

  <h2>1. Resumo da Liquidação</h2>
  <div class="summary-grid">
    <div class="summary-box"><div class="label">Principal Bruto</div><div class="value">${fmt(result.resumo.principal_bruto)}</div></div>
    <div class="summary-box"><div class="label">Corrigido + Juros</div><div class="value">${fmt(result.resumo.principal_corrigido + result.resumo.juros_mora)}</div></div>
    <div class="summary-box highlight"><div class="label">Líquido Reclamante</div><div class="value">${fmt(result.resumo.liquido_reclamante)}</div></div>
    <div class="summary-box"><div class="label">Total Reclamada</div><div class="value">${fmt(result.resumo.total_reclamada)}</div></div>
  </div>

  <h2>2. Composição da Liquidação</h2>
  <table>
    <thead><tr><th>Descrição</th><th style="text-align:right;width:140px">Valor (R$)</th></tr></thead>
    <tbody>
      <tr><td>Principal Bruto</td><td class="num">${fmt(result.resumo.principal_bruto)}</td></tr>
      <tr><td>(+) Correção Monetária</td><td class="num">${fmt(result.resumo.principal_corrigido - result.resumo.principal_bruto)}</td></tr>
      <tr><td>(+) Juros de Mora</td><td class="num">${fmt(result.resumo.juros_mora)}</td></tr>
      <tr><td>(+) FGTS (depósitos + multa)</td><td class="num">${fmt(result.resumo.fgts_total)}</td></tr>
      <tr><td>(−) Contribuição Social Segurado</td><td class="num">${fmt(-result.resumo.cs_segurado)}</td></tr>
      <tr><td>(−) Imposto de Renda Retido</td><td class="num">${fmt(-result.resumo.ir_retido)}</td></tr>
      ${result.resumo.seguro_desemprego > 0 ? `<tr><td>(+) Seguro-Desemprego</td><td class="num">${fmt(result.resumo.seguro_desemprego)}</td></tr>` : ""}
      ${result.resumo.multa_523 > 0 ? `<tr><td>(+) Multa Art. 523 CPC</td><td class="num">${fmt(result.resumo.multa_523)}</td></tr>` : ""}
      ${result.resumo.honorarios_sucumbenciais > 0 ? `<tr><td>(+) Honorários Sucumbenciais</td><td class="num">${fmt(result.resumo.honorarios_sucumbenciais)}</td></tr>` : ""}
      ${result.resumo.honorarios_contratuais > 0 ? `<tr><td>(+) Honorários Contratuais</td><td class="num">${fmt(result.resumo.honorarios_contratuais)}</td></tr>` : ""}
      ${result.resumo.custas > 0 ? `<tr><td>(+) Custas Processuais</td><td class="num">${fmt(result.resumo.custas)}</td></tr>` : ""}
      <tr class="grand-total"><td>LÍQUIDO RECLAMANTE</td><td class="num">${fmt(result.resumo.liquido_reclamante)}</td></tr>
      <tr class="total"><td>CS Empregador</td><td class="num">${fmt(result.resumo.cs_empregador)}</td></tr>
      <tr class="total"><td><strong>TOTAL RECLAMADA</strong></td><td class="num"><strong>${fmt(result.resumo.total_reclamada)}</strong></td></tr>
    </tbody>
  </table>

  <h2>3. Discriminação por Verba</h2>
  <table>
    <thead>
      <tr>
        <th>Verba</th><th style="text-align:center;width:30px">Tipo</th>
        <th style="text-align:right">Devido</th><th style="text-align:right">Pago</th>
        <th style="text-align:right">Diferença</th><th style="text-align:right">Corrigido</th>
        <th style="text-align:right">Juros</th><th style="text-align:right"><strong>Final</strong></th>
      </tr>
    </thead>
    <tbody>
      ${result.verbas.map(v => `
        <tr>
          <td>${v.nome}</td>
          <td style="text-align:center">${v.tipo === "principal" ? "P" : "R"}</td>
          <td class="num">${fmt(v.total_devido)}</td>
          <td class="num">${fmt(v.total_pago)}</td>
          <td class="num">${fmt(v.total_diferenca)}</td>
          <td class="num">${fmt(v.total_corrigido)}</td>
          <td class="num">${fmt(v.total_juros)}</td>
          <td class="num"><strong>${fmt(v.total_final)}</strong></td>
        </tr>
      `).join("")}
      <tr class="total">
        <td colspan="2"><strong>TOTAL</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_devido, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_pago, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_diferenca, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_corrigido, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_juros, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_final, 0))}</strong></td>
      </tr>
    </tbody>
  </table>

  ${result.fgts.total_fgts > 0 ? `
  <h2>4. FGTS</h2>
  <table>
    <thead><tr><th>Componente</th><th style="text-align:right;width:140px">Valor (R$)</th></tr></thead>
    <tbody>
      <tr><td>Depósitos (8%)</td><td class="num">${fmt(result.fgts.total_depositos)}</td></tr>
      <tr><td>Multa FGTS</td><td class="num">${fmt(result.fgts.multa_valor)}</td></tr>
      ${result.fgts.lc110_10 > 0 ? `<tr><td>LC 110/01 (10%)</td><td class="num">${fmt(result.fgts.lc110_10)}</td></tr>` : ""}
      ${result.fgts.lc110_05 > 0 ? `<tr><td>LC 110/01 (0,5%)</td><td class="num">${fmt(result.fgts.lc110_05)}</td></tr>` : ""}
      <tr class="total"><td><strong>Total FGTS</strong></td><td class="num"><strong>${fmt(result.fgts.total_fgts)}</strong></td></tr>
    </tbody>
  </table>` : ""}

  ${result.imposto_renda.imposto_devido > 0 ? `
  <h2>5. Imposto de Renda (RRA — Art. 12-A Lei 7.713/88)</h2>
  <table>
    <thead><tr><th>Item</th><th style="text-align:right;width:140px">Valor</th></tr></thead>
    <tbody>
      <tr><td>Base de Cálculo</td><td class="num">${fmt(result.imposto_renda.base_calculo)}</td></tr>
      <tr><td>Deduções</td><td class="num">${fmt(result.imposto_renda.deducoes)}</td></tr>
      <tr><td>Meses RRA</td><td class="num">${result.imposto_renda.meses_rra}</td></tr>
      <tr class="total"><td><strong>IRRF Devido</strong></td><td class="num"><strong>${fmt(result.imposto_renda.imposto_devido)}</strong></td></tr>
    </tbody>
  </table>` : ""}

  <div class="footer">
    Relatório gerado por MRDcalc — Motor PJe-Calc v${meta.engineVersion || "2.0.0"} — ${new Date().toLocaleString("pt-BR")}
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
