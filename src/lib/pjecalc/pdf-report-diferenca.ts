/**
 * PJe-Calc - Relatório por Diferença
 * Shows only the net difference per verba/competence.
 */
import type { PjeLiquidacaoResult } from "./engine-types";
import { disclaimerHtml } from './pdf-disclaimer';

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function gerarRelatorioDiferenca(
  result: PjeLiquidacaoResult,
  meta: {
    cliente?: string;
    processo?: string;
    dataLiquidacao?: string;
    engineVersion?: string;
  }
) {
  const verbaRows = result.verbas.map(v => {
    const ocRows = v.ocorrencias
      .filter(oc => oc.diferenca !== 0)
      .map(oc => `
        <tr>
          <td>${v.nome}</td>
          <td class="comp">${oc.competencia}</td>
          <td class="num">${fmt(oc.devido)}</td>
          <td class="num">${fmt(oc.pago)}</td>
          <td class="num">${fmt(oc.diferenca)}</td>
          <td class="num">${fmt(oc.valor_corrigido)}</td>
          <td class="num">${fmt(oc.juros)}</td>
          <td class="num"><strong>${fmt(oc.valor_final)}</strong></td>
        </tr>
      `).join("");
    return ocRows;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diferenças — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 14px; text-align: center; margin-bottom: 4px; }
  .header { text-align: center; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  .header .subtitle { font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { padding: 3px 5px; border: 1px solid #ddd; font-size: 8px; }
  th { background: #f0f4ff; font-weight: 600; text-align: center; }
  td.num { text-align: right; font-family: 'Consolas', monospace; }
  td.comp { text-align: center; font-family: 'Consolas', monospace; }
  tr.total { background: #2563eb; color: white; font-weight: 700; }
  tr.total td { border-color: #2563eb; }
  .footer { margin-top: 16px; text-align: center; font-size: 7px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO DE DIFERENÇAS</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : ""} — ${meta.cliente || ""}</div>
    <div class="subtitle">Liquidação: ${meta.dataLiquidacao || new Date().toLocaleDateString("pt-BR")}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Verba</th><th>Comp.</th><th>Devido</th><th>Pago</th>
        <th>Diferença</th><th>Corrigido</th><th>Juros</th><th>Final</th>
      </tr>
    </thead>
    <tbody>
      ${verbaRows}
      <tr class="total">
        <td colspan="2"><strong>TOTAL GERAL</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_devido, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_pago, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_diferenca, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_corrigido, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_juros, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.verbas.reduce((s, v) => s + v.total_final, 0))}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Relatório de Diferenças — MRDcalc v${meta.engineVersion || "2.1.0"} — ${new Date().toLocaleString("pt-BR")}
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
