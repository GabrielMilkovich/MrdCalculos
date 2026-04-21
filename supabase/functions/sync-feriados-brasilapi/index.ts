/**
 * sync-feriados-brasilapi — Edge Function
 *
 * Popula pjecalc_feriados com feriados NACIONAIS dos próximos 5 anos usando
 * BrasilAPI (https://brasilapi.com.br/docs#tag/Feriados-Nacionais).
 *
 * Fonte: BrasilAPI community-driven, baseado em:
 *   - Lei 9.093/1995 (feriados nacionais fixos)
 *   - Lei 10.607/2002 (20 de novembro — Consciência Negra)
 *   - Cálculo automático de Páscoa, Carnaval, Sexta-feira Santa, Corpus Christi
 *
 * Endpoint: GET https://brasilapi.com.br/api/feriados/v1/{ano}
 * Resposta: [{ date: "2024-01-01", name: "Confraternização Mundial", type: "national" }, ...]
 *
 * Cobertura: apenas feriados NACIONAIS. Estaduais/municipais continuam
 * sendo gestão manual via UI.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "../_shared/fetch-timeout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrasilApiHoliday {
  date: string;  // "YYYY-MM-DD"
  name: string;
  type: string;  // "national" | "optional"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Ano corrente + 4 à frente (BrasilAPI suporta até 2100)
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4];

    const results: Record<string, { fetched: number; upserted: number; error?: string }> = {};

    for (const year of years) {
      try {
        const resp = await fetchWithTimeout(
          `https://brasilapi.com.br/api/feriados/v1/${year}`,
          { timeoutMs: 15_000 },
        );
        if (!resp.ok) {
          results[year] = { fetched: 0, upserted: 0, error: `HTTP ${resp.status}` };
          continue;
        }
        const data = await resp.json() as BrasilApiHoliday[];
        if (!Array.isArray(data)) {
          results[year] = { fetched: 0, upserted: 0, error: "Resposta não-array" };
          continue;
        }

        const rows = data.map(h => ({
          data: h.date,
          descricao: h.name,
          tipo: "nacional" as const,
          fonte: "BrasilAPI",
        }));

        const { error } = await supabase
          .from("pjecalc_feriados")
          .upsert(rows, { onConflict: "data,tipo" });

        if (error) {
          results[year] = { fetched: data.length, upserted: 0, error: error.message };
        } else {
          results[year] = { fetched: data.length, upserted: rows.length };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results[year] = { fetched: 0, upserted: 0, error: msg };
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results, source: "BrasilAPI" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sync-feriados-brasilapi error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
