/**
 * PJe-Calc - Relatório Consolidado por Processo
 * Gera relatório unificado para múltiplos cálculos vinculados ao mesmo nº de processo.
 */
import type { PjeLiquidacaoResult, PjeResumo } from "./engine-types";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export interface CalculoConsolidado {
  id: string;
  nome: string;
  resultado: PjeLiquidacaoResult;
  dataLiquidacao: string;
}

export function gerarRelatorioConsolidado(
  calculos: CalculoConsolidado[],
  meta: {
    processo?: string;
    cliente?: string;
    engineVersion?: string;
  }
) {
  const totalGeral: Partial<PjeResumo> = {
    principal_bruto: 0,
    principal_corrigido: 0,
    juros_mora: 0,
    fgts_total: 0,
    cs_segurado: 0,
    cs_empregador: 0,
    ir_retido: 0,
    liquido_reclamante: 0,
    total_reclamada: 0,
  };

  for (const c of calculos) {
    totalGeral.principal_bruto! += c.resultado.resumo.principal_bruto;
    totalGeral.principal_corrigido! += c.resultado.resumo.principal_corrigido;
    totalGeral.juros_mora! += c.resultado.resumo.juros_mora;
    totalGeral.fgts_total! += c.resultado.resumo.fgts_total;
    totalGeral.cs_segurado! += c.resultado.resumo.cs_segurado;
    totalGeral.cs_empregador! += c.resultado.resumo.cs_empregador;
    totalGeral.ir_retido! += c.resultado.resumo.ir_retido;
    totalGeral.liquido_reclamante! += c.resultado.resumo.liquido_reclamante;
    totalGeral.total_reclamada! += c.resultado.resumo.total_reclamada;
  }

  const calculoRows = calculos.map((c, i) => `
    <tr>
      <td>${i + 1}. ${c.nome}</td>
      <td class="num">${fmt(c.resultado.resumo.principal_bruto)}</td>
      <td class="num">${fmt(c.resultado.resumo.principal_corrigido - c.resultado.resumo.principal_bruto)}</td>
      <td class="num">${fmt(c.resultado.resumo.juros_mora)}</td>
      <td class="num">${fmt(c.resultado.resumo.fgts_total)}</td>
      <td class="num">${fmt(-c.resultado.resumo.cs_segurado)}</td>
      <td class="num">${fmt(-c.resultado.resumo.ir_retido)}</td>
      <td class="num highlight">${fmt(c.resultado.resumo.liquido_reclamante)}</td>
      <td class="num">${fmt(c.resultado.resumo.total_reclamada)}</td>
    </tr>
  `).join("");

  const verbaConsolidadaMap = new Map<string, { nome: string; tipo: string; total: number }>();
  for (const c of calculos) {
    for (const v of c.resultado.verbas) {
      const key = v.nome;
      const existing = verbaConsolidadaMap.get(key);
      if (existing) {
        existing.total += v.total_final;
      } else {
        verbaConsolidadaMap.set(key, { nome: v.nome, tipo: v.tipo, total: v.total_final });
      }
    }
  }

  const verbaRows = Array.from(verbaConsolidadaMap.values())
    .sort((a, b) => b.total - a.total)
    .map(v => `<tr><td>${v.nome}</td><td class="comp">${v.tipo === 'principal' ? 'P' : 'R'}</td><td class="num">${fmt(v.total)}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Consolidado — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 15mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; color: #1e40af; }
  h2 { font-size: 12px; margin: 16px 0 6px; border-bottom: 2px solid #1e40af; padding-bottom: 3px; color: #1e40af; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  .header .subtitle { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { padding: 4px 6px; border: 1px solid #ddd; font-size: 9px; }
  th { background: #f0f4ff; font-weight: 600; text-align: center; }
  td.num { text-align: right; font-family: 'Consolas', monospace; }
  td.comp { text-align: center; }
  td.highlight { font-weight: 700; color: #1e40af; }
  tr.total { background: #1e40af; color: white; font-weight: 700; }
  tr.total td { border-color: #1e40af; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
  .summary-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; text-align: center; }
  .summary-box .label { font-size: 8px; color: #666; text-transform: uppercase; }
  .summary-box .value { font-size: 14px; font-weight: 700; font-family: 'Consolas', monospace; }
  .summary-box.highlight { border-color: #1e40af; background: #f0f4ff; }
  .summary-box.highlight .value { color: #1e40af; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO CONSOLIDADO POR PROCESSO</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"}</div>
    ${meta.cliente ? `<div class="subtitle">Reclamante: ${meta.cliente}</div>` : ""}
    <div class="subtitle">${calculos.length} cálculo(s) consolidado(s)</div>
  </div>

  <h2>1. Resumo Consolidado</h2>
  <div class="summary-grid">
    <div class="summary-box"><div class="label">Principal Bruto</div><div class="value">${fmt(totalGeral.principal_bruto!)}</div></div>
    <div class="summary-box"><div class="label">Corrigido + Juros</div><div class="value">${fmt(totalGeral.principal_corrigido! + totalGeral.juros_mora!)}</div></div>
    <div class="summary-box highlight"><div class="label">Líquido Reclamante</div><div class="value">${fmt(totalGeral.liquido_reclamante!)}</div></div>
    <div class="summary-box"><div class="label">Total Reclamada</div><div class="value">${fmt(totalGeral.total_reclamada!)}</div></div>
  </div>

  <h2>2. Detalhamento por Cálculo</h2>
  <table>
    <thead>
      <tr>
        <th>Cálculo</th><th>Principal</th><th>Correção</th><th>Juros</th>
        <th>FGTS</th><th>CS Seg.</th><th>IRRF</th><th>Líquido</th><th>Total Rda.</th>
      </tr>
    </thead>
    <tbody>
      ${calculoRows}
      <tr class="total">
        <td><strong>TOTAL CONSOLIDADO</strong></td>
        <td class="num"><strong>${fmt(totalGeral.principal_bruto!)}</strong></td>
        <td class="num"><strong>${fmt(totalGeral.principal_corrigido! - totalGeral.principal_bruto!)}</strong></td>
        <td class="num"><strong>${fmt(totalGeral.juros_mora!)}</strong></td>
        <td class="num"><strong>${fmt(totalGeral.fgts_total!)}</strong></td>
        <td class="num"><strong>${fmt(-totalGeral.cs_segurado!)}</strong></td>
        <td class="num"><strong>${fmt(-totalGeral.ir_retido!)}</strong></td>
        <td class="num"><strong>${fmt(totalGeral.liquido_reclamante!)}</strong></td>
        <td class="num"><strong>${fmt(totalGeral.total_reclamada!)}</strong></td>
      </tr>
    </tbody>
  </table>

  <h2>3. Verbas Consolidadas</h2>
  <table>
    <thead><tr><th style="text-align:left">Verba</th><th>Tipo</th><th>Total Final (R$)</th></tr></thead>
    <tbody>
      ${verbaRows}
    </tbody>
  </table>

  <div class="footer">
    Relatório Consolidado — MRDcalc v${meta.engineVersion || "2.1.0"} — ${new Date().toLocaleString("pt-BR")}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
