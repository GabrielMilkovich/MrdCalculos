/**
 * PJe-Calc - Relatório Consolidado por Processo
 * Gera relatório unificado para múltiplos cálculos vinculados ao mesmo nº de processo.
 *
 * Duas APIs:
 *  - gerarRelatorioConsolidado(): abre janela de impressão (browser-only, legacy).
 *  - gerarRelatorioConsolidadoCompleto(): retorna Blob text/html com comparativo
 *    lado-a-lado, breakdown por componente, gráfico HTML simples de proporções e
 *    análise de tendência temporal (quando >= 2 cálculos em ordem cronológica).
 */
import Decimal from "decimal.js";
import type { PjeLiquidacaoResult, PjeResumo } from "./engine-types";

Decimal.set({ precision: 20 });

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtPct = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + "%";

export interface CalculoConsolidado {
  id: string;
  nome: string;
  resultado: PjeLiquidacaoResult;
  dataLiquidacao: string;
}

export interface ConsolidadoMeta {
  processo?: string;
  cliente?: string;
  engineVersion?: string;
}

export interface TotaisConsolidados {
  principal_bruto: Decimal;
  principal_corrigido: Decimal;
  juros_mora: Decimal;
  fgts_total: Decimal;
  fgts_multa: Decimal;
  cs_segurado: Decimal;
  cs_empregador: Decimal;
  ir_retido: Decimal;
  liquido_reclamante: Decimal;
  total_reclamada: Decimal;
}

/**
 * Agrega os totais de múltiplos cálculos usando Decimal.js (precisão 20).
 * Exposto para reuso em testes e UI.
 */
export function agregarTotais(calculos: CalculoConsolidado[]): TotaisConsolidados {
  const totais: TotaisConsolidados = {
    principal_bruto: new Decimal(0),
    principal_corrigido: new Decimal(0),
    juros_mora: new Decimal(0),
    fgts_total: new Decimal(0),
    fgts_multa: new Decimal(0),
    cs_segurado: new Decimal(0),
    cs_empregador: new Decimal(0),
    ir_retido: new Decimal(0),
    liquido_reclamante: new Decimal(0),
    total_reclamada: new Decimal(0),
  };
  for (const c of calculos) {
    const r: PjeResumo = c.resultado.resumo;
    totais.principal_bruto = totais.principal_bruto.plus(r.principal_bruto || 0);
    totais.principal_corrigido = totais.principal_corrigido.plus(r.principal_corrigido || 0);
    totais.juros_mora = totais.juros_mora.plus(r.juros_mora || 0);
    totais.fgts_total = totais.fgts_total.plus(r.fgts_total || 0);
    totais.fgts_multa = totais.fgts_multa.plus(c.resultado.fgts?.multa_valor || 0);
    totais.cs_segurado = totais.cs_segurado.plus(r.cs_segurado || 0);
    totais.cs_empregador = totais.cs_empregador.plus(r.cs_empregador || 0);
    totais.ir_retido = totais.ir_retido.plus(r.ir_retido || 0);
    totais.liquido_reclamante = totais.liquido_reclamante.plus(r.liquido_reclamante || 0);
    totais.total_reclamada = totais.total_reclamada.plus(r.total_reclamada || 0);
  }
  return totais;
}

export interface ComponenteBreakdown {
  principal: number;
  correcao: number;
  juros: number;
  fgts: number;
  multa_fgts: number;
  cs: number;
  ir: number;
}

/** Breakdown por componente para um único cálculo (valores positivos, exibição). */
export function breakdownComponentes(r: PjeLiquidacaoResult): ComponenteBreakdown {
  const res = r.resumo;
  return {
    principal: res.principal_bruto,
    correcao: new Decimal(res.principal_corrigido).minus(res.principal_bruto).toNumber(),
    juros: res.juros_mora,
    fgts: res.fgts_total,
    multa_fgts: r.fgts?.multa_valor || 0,
    cs: res.cs_segurado,
    ir: res.ir_retido,
  };
}

export interface TendenciaAnalise {
  temporal: boolean;
  primeiro?: CalculoConsolidado;
  ultimo?: CalculoConsolidado;
  delta_liquido: Decimal;
  delta_total: Decimal;
  delta_percent: Decimal;
  dias_entre: number;
}

/**
 * Análise temporal: ordena cronologicamente e calcula delta entre primeiro e último.
 * Retorna temporal=false se houver menos de 2 cálculos com datas distintas.
 */
export function analisarTendencia(calculos: CalculoConsolidado[]): TendenciaAnalise {
  const zero = new Decimal(0);
  if (calculos.length < 2) {
    return { temporal: false, delta_liquido: zero, delta_total: zero, delta_percent: zero, dias_entre: 0 };
  }
  const ordenados = [...calculos].sort((a, b) => a.dataLiquidacao.localeCompare(b.dataLiquidacao));
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  if (primeiro.dataLiquidacao === ultimo.dataLiquidacao) {
    return { temporal: false, delta_liquido: zero, delta_total: zero, delta_percent: zero, dias_entre: 0 };
  }
  const liq0 = new Decimal(primeiro.resultado.resumo.liquido_reclamante || 0);
  const liq1 = new Decimal(ultimo.resultado.resumo.liquido_reclamante || 0);
  const tot0 = new Decimal(primeiro.resultado.resumo.total_reclamada || 0);
  const tot1 = new Decimal(ultimo.resultado.resumo.total_reclamada || 0);
  const delta_liquido = liq1.minus(liq0);
  const delta_total = tot1.minus(tot0);
  const delta_percent = liq0.isZero() ? zero : delta_liquido.dividedBy(liq0).times(100);
  const ms = new Date(ultimo.dataLiquidacao).getTime() - new Date(primeiro.dataLiquidacao).getTime();
  const dias_entre = Math.max(0, Math.round(ms / 86400000));
  return { temporal: true, primeiro, ultimo, delta_liquido, delta_total, delta_percent, dias_entre };
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

// =====================================================
// RELATORIO CONSOLIDADO COMPLETO (Blob + tendencia)
// =====================================================

function pctOf(parte: Decimal, total: Decimal): string {
  if (total.isZero()) return "0,00%";
  return fmtPct(parte.dividedBy(total).times(100).toNumber());
}

function barrinha(valor: number, max: number, cor: string): string {
  const largura = max <= 0 ? 0 : Math.min(100, Math.max(0, (valor / max) * 100));
  return `<div style="background:#f0f0f0;height:10px;border-radius:3px;overflow:hidden;min-width:60px"><div style="background:${cor};width:${largura.toFixed(1)}%;height:100%"></div></div>`;
}

/**
 * Constrói HTML completo do consolidado com comparativo, breakdown por
 * componente, gráfico HTML simples (barras CSS) e análise de tendência.
 * Exposto separadamente para facilitar testes.
 */
export function buildConsolidadoCompletoHTML(
  calculos: CalculoConsolidado[],
  meta: ConsolidadoMeta = {}
): string {
  const totais = agregarTotais(calculos);
  const tendencia = analisarTendencia(calculos);

  const liqMax = calculos.reduce((m, c) => Math.max(m, c.resultado.resumo.liquido_reclamante || 0), 0);

  const rowsComparativo = calculos.map((c, i) => {
    const r = c.resultado.resumo;
    const b = breakdownComponentes(c.resultado);
    const pct = totais.liquido_reclamante.isZero()
      ? "0,00%"
      : pctOf(new Decimal(r.liquido_reclamante || 0), totais.liquido_reclamante);
    return `
      <tr>
        <td><strong>${i + 1}.</strong> ${c.nome}</td>
        <td>${c.dataLiquidacao || "—"}</td>
        <td class="num">${fmt(b.principal)}</td>
        <td class="num">${fmt(b.correcao)}</td>
        <td class="num">${fmt(b.juros)}</td>
        <td class="num">${fmt(b.fgts)}</td>
        <td class="num">${fmt(b.multa_fgts)}</td>
        <td class="num">${fmt(-b.cs)}</td>
        <td class="num">${fmt(-b.ir)}</td>
        <td class="num highlight">${fmt(r.liquido_reclamante)}</td>
        <td class="num">${pct}</td>
        <td>${barrinha(r.liquido_reclamante, liqMax, "#1e40af")}</td>
      </tr>`;
  }).join("");

  const grandTotal = totais.principal_bruto
    .plus(totais.principal_corrigido.minus(totais.principal_bruto))
    .plus(totais.juros_mora)
    .plus(totais.fgts_total)
    .plus(totais.fgts_multa);

  const componentes: { rot: string; val: Decimal; cor: string }[] = [
    { rot: "Principal", val: totais.principal_bruto, cor: "#1e40af" },
    { rot: "Correção", val: totais.principal_corrigido.minus(totais.principal_bruto), cor: "#2563eb" },
    { rot: "Juros Mora", val: totais.juros_mora, cor: "#7c3aed" },
    { rot: "FGTS", val: totais.fgts_total, cor: "#059669" },
    { rot: "Multa FGTS", val: totais.fgts_multa, cor: "#10b981" },
    { rot: "CS Segurado", val: totais.cs_segurado, cor: "#dc2626" },
    { rot: "IRRF", val: totais.ir_retido, cor: "#ea580c" },
  ];

  const maxComp = componentes.reduce((m, x) => Decimal.max(m, x.val.abs()), new Decimal(0));

  const graficoHtml = `
    <div class="chart">
      ${componentes.map(c => `
        <div class="bar-row">
          <span class="bar-label">${c.rot}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${maxComp.isZero() ? 0 : c.val.abs().dividedBy(maxComp).times(100).toFixed(1)}%;background:${c.cor}"></div>
          </div>
          <span class="bar-value">${fmt(c.val.toNumber())}</span>
          <span class="bar-pct">${grandTotal.isZero() ? "—" : pctOf(c.val.abs(), grandTotal.abs())}</span>
        </div>`).join("")}
    </div>`;

  const tendenciaHtml = tendencia.temporal && tendencia.primeiro && tendencia.ultimo ? `
    <h2>4. Análise de Tendência Temporal</h2>
    <p class="meta">Ordenação cronológica (${calculos.length} cálculos, ${tendencia.dias_entre} dia(s) entre o primeiro e o último).</p>
    <table>
      <thead>
        <tr><th></th><th>Data Liquidação</th><th>Líquido</th><th>Total Reclamada</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Primeiro</strong> (${tendencia.primeiro.nome})</td><td>${tendencia.primeiro.dataLiquidacao}</td><td class="num">${fmt(tendencia.primeiro.resultado.resumo.liquido_reclamante)}</td><td class="num">${fmt(tendencia.primeiro.resultado.resumo.total_reclamada)}</td></tr>
        <tr><td><strong>Último</strong> (${tendencia.ultimo.nome})</td><td>${tendencia.ultimo.dataLiquidacao}</td><td class="num">${fmt(tendencia.ultimo.resultado.resumo.liquido_reclamante)}</td><td class="num">${fmt(tendencia.ultimo.resultado.resumo.total_reclamada)}</td></tr>
        <tr class="total">
          <td><strong>Delta (Último − Primeiro)</strong></td>
          <td>${tendencia.dias_entre} dia(s)</td>
          <td class="num"><strong>${fmt(tendencia.delta_liquido.toNumber())} (${fmtPct(tendencia.delta_percent.toNumber())})</strong></td>
          <td class="num"><strong>${fmt(tendencia.delta_total.toNumber())}</strong></td>
        </tr>
      </tbody>
    </table>` : `
    <h2>4. Análise de Tendência Temporal</h2>
    <p class="meta">Tendência não aplicável (datas de liquidação idênticas ou cálculo único).</p>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Consolidado Completo — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 12mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; color: #1e40af; }
  h2 { font-size: 12px; margin: 14px 0 6px; border-bottom: 2px solid #1e40af; padding-bottom: 3px; color: #1e40af; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  .meta { font-size: 9px; color: #555; margin: 4px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th, td { padding: 4px 6px; border: 1px solid #ddd; font-size: 9px; }
  th { background: #f0f4ff; font-weight: 600; text-align: center; }
  td.num { text-align: right; font-family: 'Consolas', monospace; }
  td.highlight { font-weight: 700; color: #1e40af; }
  tr.total { background: #1e40af; color: white; font-weight: 700; }
  tr.total td { border-color: #1e40af; }
  .chart { padding: 8px 4px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
  .bar-row { display: grid; grid-template-columns: 90px 1fr 110px 70px; gap: 6px; align-items: center; padding: 3px 0; font-size: 9px; }
  .bar-label { font-weight: 600; color: #333; }
  .bar-track { height: 12px; background: #eee; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar-value { text-align: right; font-family: 'Consolas', monospace; }
  .bar-pct { text-align: right; color: #666; }
  .footer { margin-top: 16px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO CONSOLIDADO COMPLETO</h1>
    <div class="meta">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"}${meta.cliente ? ` — Reclamante: ${meta.cliente}` : ""}</div>
    <div class="meta">${calculos.length} cálculo(s) — Gerado em ${new Date().toLocaleString("pt-BR")}</div>
  </div>

  <h2>1. Comparativo Lado-a-Lado</h2>
  <table>
    <thead>
      <tr>
        <th>Cálculo</th><th>Data Liq.</th><th>Principal</th><th>Correção</th><th>Juros</th>
        <th>FGTS</th><th>Multa FGTS</th><th>CS Seg.</th><th>IRRF</th><th>Líquido</th><th>% do Total</th><th>Distribuição</th>
      </tr>
    </thead>
    <tbody>
      ${rowsComparativo}
      <tr class="total">
        <td colspan="2"><strong>TOTAL CONSOLIDADO</strong></td>
        <td class="num"><strong>${fmt(totais.principal_bruto.toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.principal_corrigido.minus(totais.principal_bruto).toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.juros_mora.toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.fgts_total.toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.fgts_multa.toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.cs_segurado.negated().toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.ir_retido.negated().toNumber())}</strong></td>
        <td class="num"><strong>${fmt(totais.liquido_reclamante.toNumber())}</strong></td>
        <td class="num"><strong>100,00%</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>2. Proporções por Tipo de Verba/Desconto</h2>
  ${graficoHtml}

  <h2>3. Breakdown por Componente (por Cálculo)</h2>
  <table>
    <thead>
      <tr><th>Cálculo</th><th>Principal</th><th>Correção</th><th>Juros</th><th>FGTS</th><th>Multa FGTS</th><th>CS (−)</th><th>IR (−)</th></tr>
    </thead>
    <tbody>
      ${calculos.map((c, i) => {
        const b = breakdownComponentes(c.resultado);
        return `<tr>
          <td>${i + 1}. ${c.nome}</td>
          <td class="num">${fmt(b.principal)}</td>
          <td class="num">${fmt(b.correcao)}</td>
          <td class="num">${fmt(b.juros)}</td>
          <td class="num">${fmt(b.fgts)}</td>
          <td class="num">${fmt(b.multa_fgts)}</td>
          <td class="num">${fmt(-b.cs)}</td>
          <td class="num">${fmt(-b.ir)}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  ${tendenciaHtml}

  <div class="footer">
    Relatório Consolidado Completo — MRDcalc v${meta.engineVersion || "3.0.0"} — Precisão Decimal.js (20 dígitos)
  </div>
</body>
</html>`;

  return html;
}

/**
 * Gera o consolidado completo como Blob (text/html), pronto para download
 * ou abertura em nova janela via URL.createObjectURL.
 */
export function gerarRelatorioConsolidadoCompleto(
  calculos: CalculoConsolidado[],
  meta: ConsolidadoMeta = {}
): Blob {
  if (!calculos || calculos.length === 0) {
    throw new Error("Nenhum cálculo fornecido para consolidação");
  }
  const html = buildConsolidadoCompletoHTML(calculos, meta);
  return new Blob([html], { type: "text/html;charset=utf-8" });
}
