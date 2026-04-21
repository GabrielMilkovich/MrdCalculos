/**
 * sync-ipeadata-official — Edge Function
 *
 * Busca séries oficiais do IPEADATA via API OData e gera sugestões.
 * IPEADATA (http://www.ipeadata.gov.br/api/odata4/) é um portal oficial do
 * IPEA que agrega dados do MTE, RFB, BCB, IBGE.
 *
 * Séries cobertas:
 *  - MTE12_SALMIN12: Salário mínimo mensal (SM nominal)
 *
 * Grava em table_update_suggestions (status=pending) para admin aprovar.
 * NÃO aplica diretamente (pipeline de humano-no-loop).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchTO(url: string, ms = 30000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } }); }
  finally { clearTimeout(t); }
}

interface IpeadataValue { VALDATA: string; VALVALOR: number; SERCODIGO: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const URL = Deno.env.get("SUPABASE_URL")!;
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(URL, KEY);

    const series = [
      { code: "MTE12_SALMIN12", name: "Salário mínimo nominal",
        target_table: "pjecalc_salario_minimo", target_field: "valor" },
    ];

    const results: Record<string, unknown> = {};

    for (const s of series) {
      try {
        const url = `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${s.code}')`;
        const resp = await fetchTO(url);
        if (!resp.ok) { results[s.code] = { error: `HTTP ${resp.status}` }; continue; }
        const payload = await resp.json() as { value: IpeadataValue[] };
        if (!Array.isArray(payload.value)) { results[s.code] = { error: "no value array" }; continue; }

        const sorted = payload.value.sort((a, b) => a.VALDATA.localeCompare(b.VALDATA));
        const latest = sorted[sorted.length - 1];
        if (!latest) { results[s.code] = { error: "empty series" }; continue; }

        const competencia = latest.VALDATA.slice(0, 10);
        const valorIpeadata = Number(latest.VALVALOR);

        const { data: dbRow } = await supabase
          .from(s.target_table).select(s.target_field).eq("competencia", competencia).maybeSingle();
        const valorDb = dbRow ? Number((dbRow as Record<string, unknown>)[s.target_field]) : null;

        if (valorDb !== null && Math.abs(valorDb - valorIpeadata) < 0.01) {
          results[s.code] = { status: "already_synced", competencia, valor: valorIpeadata };
          continue;
        }

        const { error: sugErr } = await supabase.from("table_update_suggestions").insert({
          target_table: s.target_table,
          target_competencia: competencia,
          target_field: s.target_field,
          valor_atual: valorDb ? { [s.target_field]: valorDb } : null,
          valor_sugerido: { [s.target_field]: valorIpeadata },
          fonte: "ipeadata",
          fonte_url: `http://www.ipeadata.gov.br/Default.aspx (série ${s.code})`,
          citacao: `IPEADATA ${s.code} (${s.name}): ${competencia} = ${valorIpeadata}`,
          confidence: 0.95,
          status: "pending",
          metadata: { serie: s.code, total_pontos: sorted.length },
        });
        if (sugErr) { results[s.code] = { error: `insert suggestion: ${sugErr.message}` }; continue; }

        results[s.code] = {
          status: "suggestion_created",
          competencia, valor_ipeadata: valorIpeadata, valor_db: valorDb,
        };
      } catch (e) {
        results[s.code] = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    return new Response(JSON.stringify({ ok: true, source: "IPEADATA OData", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
