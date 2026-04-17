/**
 * ⚠️ DEPRECATED — Use exportPJCXml() from pjc-xml-real.ts for canonical PJC export.
 * This simplified XML format (<pjecalc> root) is NOT compatible with real PJe-Calc.
 * Kept for backward compatibility with existing download features.
 * 
 * @deprecated Use exportPJCXml() from pjc-xml-real.ts for real PJC format.
 */
import type { PjeLiquidacaoResult } from "./engine-types";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtNum(v: number): string {
  return (v || 0).toFixed(2);
}

/** @deprecated Use exportPJCXml from pjc-xml-real.ts */
export function exportarXML(
  result: PjeLiquidacaoResult,
  meta: {
    processo?: string;
    cliente?: string;
    dataLiquidacao?: string;
    engineVersion?: string;
  }
): string {
  console.warn('[DEPRECATED] exportarXML() generates simplified XML. Use exportPJCXml() for real PJC format.');
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<pjecalc version="${meta.engineVersion || "2.0.0"}" gerado_em="${now}">
  <processo numero="${escapeXml(meta.processo || "")}" reclamante="${escapeXml(meta.cliente || "")}" />
  <liquidacao data="${meta.dataLiquidacao || now.slice(0, 10)}">
    <resumo>
      <principal_bruto>${fmtNum(result.resumo.principal_bruto)}</principal_bruto>
      <principal_corrigido>${fmtNum(result.resumo.principal_corrigido)}</principal_corrigido>
      <juros_mora>${fmtNum(result.resumo.juros_mora)}</juros_mora>
      <fgts_total>${fmtNum(result.resumo.fgts_total)}</fgts_total>
      <cs_segurado>${fmtNum(result.resumo.cs_segurado)}</cs_segurado>
      <cs_empregador>${fmtNum(result.resumo.cs_empregador)}</cs_empregador>
      <ir_retido>${fmtNum(result.resumo.ir_retido)}</ir_retido>
      <seguro_desemprego>${fmtNum(result.resumo.seguro_desemprego)}</seguro_desemprego>
      <honorarios_sucumbenciais>${fmtNum(result.resumo.honorarios_sucumbenciais)}</honorarios_sucumbenciais>
      <honorarios_contratuais>${fmtNum(result.resumo.honorarios_contratuais)}</honorarios_contratuais>
      <custas>${fmtNum(result.resumo.custas)}</custas>
      <multa_523>${fmtNum(result.resumo.multa_523)}</multa_523>
      <liquido_reclamante>${fmtNum(result.resumo.liquido_reclamante)}</liquido_reclamante>
      <total_reclamada>${fmtNum(result.resumo.total_reclamada)}</total_reclamada>
    </resumo>
    <verbas>
${result.verbas.map(v => `      <verba id="${escapeXml(v.verba_id)}" nome="${escapeXml(v.nome)}" tipo="${v.tipo}">
        <total_devido>${fmtNum(v.total_devido)}</total_devido>
        <total_pago>${fmtNum(v.total_pago)}</total_pago>
        <total_diferenca>${fmtNum(v.total_diferenca)}</total_diferenca>
        <total_corrigido>${fmtNum(v.total_corrigido)}</total_corrigido>
        <total_juros>${fmtNum(v.total_juros)}</total_juros>
        <total_final>${fmtNum(v.total_final)}</total_final>
        <ocorrencias>
${v.ocorrencias.map(o => `          <ocorrencia competencia="${o.competencia}" devido="${fmtNum(o.devido)}" pago="${fmtNum(o.pago)}" diferenca="${fmtNum(o.diferenca)}" corrigido="${fmtNum(o.valor_corrigido)}" juros="${fmtNum(o.juros)}" />`).join("\n")}
        </ocorrencias>
      </verba>`).join("\n")}
    </verbas>
    <fgts>
      <total_depositos>${fmtNum(result.fgts.total_depositos)}</total_depositos>
      <multa_valor>${fmtNum(result.fgts.multa_valor)}</multa_valor>
      <saldo_deduzido>${fmtNum(result.fgts.saldo_deduzido)}</saldo_deduzido>
      <lc110_10>${fmtNum(result.fgts.lc110_10)}</lc110_10>
      <lc110_05>${fmtNum(result.fgts.lc110_05)}</lc110_05>
      <total_fgts>${fmtNum(result.fgts.total_fgts)}</total_fgts>
    </fgts>
    <imposto_renda>
      <base_calculo>${fmtNum(result.imposto_renda.base_calculo)}</base_calculo>
      <deducoes>${fmtNum(result.imposto_renda.deducoes)}</deducoes>
      <meses_rra>${result.imposto_renda.meses_rra}</meses_rra>
      <imposto_devido>${fmtNum(result.imposto_renda.imposto_devido)}</imposto_devido>
    </imposto_renda>
  </liquidacao>
</pjecalc>`;

  return xml;
}

/** @deprecated Use downloadPJC from pjc-export.ts or export from pjc-xml-real.ts */
export function downloadXML(
  result: PjeLiquidacaoResult,
  meta: { processo?: string; cliente?: string; dataLiquidacao?: string; engineVersion?: string }
) {
  console.warn('[DEPRECATED] downloadXML() generates simplified XML. Use exportPJCXml() from pjc-xml-real.ts.');
  const xml = exportarXML(result, meta);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pjecalc_${meta.processo?.replace(/\D/g, "") || "liquidacao"}_${new Date().toISOString().slice(0, 10)}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
