/**
 * derive-juros-taxa-legal — Edge Function
 *
 * Popula pjecalc_juros_mora e pjecalc_taxa_legal a partir de dados já
 * sincronizados em pjecalc_correcao_monetaria (SELIC, IPCA).
 *
 * REGRAS DE DERIVAÇÃO:
 *
 * 1. pjecalc_taxa_legal (Lei 14.905/2024)
 *    taxa_mensal = SELIC_mensal - IPCA_mensal
 *    Vigente a partir de 2024-09. Antes disso, não aplica.
 *
 * 2. pjecalc_juros_mora (múltiplas modalidades)
 *    2.1 JUROS_TR_1_PORCENTO (antigo, pré-ADC58)  → taxa_mensal = 1.0
 *    2.2 JUROS_SELIC (ADC58, fase judicial)        → taxa_mensal = SELIC_mensal
 *    2.3 JUROS_TAXA_LEGAL (pós Lei 14.905)         → taxa_mensal = SELIC - IPCA
 *
 * Esta função é IDEMPOTENTE: upsert por (competencia) em taxa_legal e
 * (competencia, tipo) em juros_mora.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndiceRow {
  indice: string;
  competencia: string;
  valor: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: selicRows, error: e1 } = await supabase
      .from("pjecalc_correcao_monetaria")
      .select("indice, competencia, valor")
      .eq("indice", "SELIC")
      .gte("competencia", "2020-01-01")
      .order("competencia");
    if (e1) throw e1;

    const { data: ipcaRows, error: e2 } = await supabase
      .from("pjecalc_correcao_monetaria")
      .select("indice, competencia, valor")
      .eq("indice", "IPCA")
      .gte("competencia", "2020-01-01")
      .order("competencia");
    if (e2) throw e2;

    const selicByComp = new Map<string, number>(
      (selicRows as IndiceRow[]).map(r => [r.competencia.slice(0, 7), Number(r.valor)]),
    );
    const ipcaByComp = new Map<string, number>(
      (ipcaRows as IndiceRow[]).map(r => [r.competencia.slice(0, 7), Number(r.valor)]),
    );

    // pjecalc_taxa_legal — colunas: competencia, taxa_mensal, fundamento
    const taxaLegalRows: { competencia: string; taxa_mensal: number; fundamento: string }[] = [];
    for (const [comp, selic] of selicByComp) {
      if (comp < "2024-09") continue;
      const ipca = ipcaByComp.get(comp);
      if (ipca === undefined) continue;
      const taxaLegal = +(selic - ipca).toFixed(6);
      taxaLegalRows.push({
        competencia: `${comp}-01`,
        taxa_mensal: taxaLegal,
        fundamento: "derivado SELIC-IPCA (Lei 14.905/2024)",
      });
    }

    let taxaLegalUpserts = 0;
    if (taxaLegalRows.length > 0) {
      const { error } = await supabase
        .from("pjecalc_taxa_legal")
        .upsert(taxaLegalRows, { onConflict: "competencia" });
      if (error) throw new Error(`taxa_legal upsert: ${error.message}`);
      taxaLegalUpserts = taxaLegalRows.length;
    }

    // pjecalc_juros_mora — colunas: competencia, tipo, taxa_mensal
    const jurosRows: { competencia: string; tipo: string; taxa_mensal: number }[] = [];
    for (const [comp, selic] of selicByComp) {
      const compDate = `${comp}-01`;
      jurosRows.push({ competencia: compDate, tipo: "JUROS_SELIC", taxa_mensal: selic });
      if (comp >= "2024-09") {
        const ipca = ipcaByComp.get(comp);
        if (ipca !== undefined) {
          jurosRows.push({
            competencia: compDate,
            tipo: "JUROS_TAXA_LEGAL",
            taxa_mensal: +(selic - ipca).toFixed(6),
          });
        }
      }
      jurosRows.push({ competencia: compDate, tipo: "JUROS_TR_1_PORCENTO", taxa_mensal: 1.0 });
    }

    let jurosUpserts = 0;
    if (jurosRows.length > 0) {
      for (let i = 0; i < jurosRows.length; i += 500) {
        const chunk = jurosRows.slice(i, i + 500);
        const { error } = await supabase
          .from("pjecalc_juros_mora")
          .upsert(chunk, { onConflict: "competencia,tipo" });
        if (error) throw new Error(`juros_mora upsert chunk ${i}: ${error.message}`);
        jurosUpserts += chunk.length;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      source: "derivado de pjecalc_correcao_monetaria (SELIC + IPCA)",
      results: {
        taxa_legal_upserted: taxaLegalUpserts,
        juros_mora_upserted: jurosUpserts,
        selic_rows_used: selicByComp.size,
        ipca_rows_used: ipcaByComp.size,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("derive-juros-taxa-legal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
