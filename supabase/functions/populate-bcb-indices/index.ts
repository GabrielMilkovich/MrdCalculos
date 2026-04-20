import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "../_shared/fetch-timeout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * BCB series IDs for official economic indices
 * Source: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados
 */
const BCB_SERIES: Record<string, number> = {
  "IPCA-E": 10764,
  "SELIC": 4390,
  "INPC": 188,
  "TR": 7812,
  "IGP-M": 189,
};

interface BCBDataPoint {
  data: string; // dd/mm/yyyy
  valor: string; // numeric string
}

/**
 * Fetch historical data from BCB API for a given series.
 */
async function fetchBCBSeries(serieId: number, anoInicio: number, anoFim: number): Promise<BCBDataPoint[]> {
  const dataInicio = `01/01/${anoInicio}`;
  const dataFim = `31/12/${anoFim}`;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;

  const response = await fetchWithTimeout(url, { timeoutMs: 45_000 });
  if (!response.ok) {
    throw new Error(`BCB API error for serie ${serieId}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`BCB API returned unexpected format for serie ${serieId}`);
  }

  return data;
}

/**
 * Parse BCB date string (dd/mm/yyyy) to YYYY-MM-01 format.
 */
function parseBCBDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [_day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-01`;
}

/**
 * Group BCB data points by month (take last value per month for daily series).
 */
function groupByMonth(data: BCBDataPoint[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const point of data) {
    const comp = parseBCBDate(point.data);
    const valor = parseFloat(point.valor);
    if (!isNaN(valor)) {
      byMonth.set(comp, valor);
    }
  }
  return byMonth;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    let anoInicio = 2000;
    let anoFim = new Date().getFullYear();
    try {
      const body = await req.json();
      if (body.ano_inicio) anoInicio = body.ano_inicio;
      if (body.ano_fim) anoFim = body.ano_fim;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const results: Record<string, { fetched: number; upserted: number }> = {};

    for (const [indiceName, serieId] of Object.entries(BCB_SERIES)) {
      console.log(`Fetching ${indiceName} (serie ${serieId}) from ${anoInicio} to ${anoFim}...`);

      const rawData = await fetchBCBSeries(serieId, anoInicio, anoFim);

      // Sort chronologically (BCB may return in any order)
      rawData.sort((a, b) => {
        const [dA, mA, yA] = a.data.split("/").map(Number);
        const [dB, mB, yB] = b.data.split("/").map(Number);
        return (yA * 10000 + mA * 100 + dA) - (yB * 10000 + mB * 100 + dB);
      });

      // Group by month (take last value per month for daily series like TR)
      const monthlyData = groupByMonth(rawData);

      // Build rows with accumulated factor (base 100 from first month)
      const rows: { indice: string; competencia: string; valor: number; acumulado: number }[] = [];
      let acumulado = 100.0;

      const sortedComps = Array.from(monthlyData.keys()).sort();
      for (const comp of sortedComps) {
        const valor = monthlyData.get(comp)!;
        acumulado = acumulado * (1 + valor / 100);
        // Round to avoid floating point drift
        acumulado = Math.round(acumulado * 1e8) / 1e8;
        rows.push({ indice: indiceName, competencia: comp, valor, acumulado });
      }

      // Also insert with common aliases
      const aliases: Record<string, string[]> = {
        "IPCA-E": ["IPCAE", "IPCA"],
        "IGP-M": ["IGPM"],
      };
      const aliasRows: typeof rows = [];
      if (aliases[indiceName]) {
        for (const alias of aliases[indiceName]) {
          for (const row of rows) {
            aliasRows.push({ ...row, indice: alias });
          }
        }
      }

      const allRows = [...rows, ...aliasRows];

      // Upsert in batches of 500
      let upserted = 0;
      const BATCH_SIZE = 500;
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("pjecalc_correcao_monetaria")
          .upsert(batch, { onConflict: "indice,competencia" });

        if (error) {
          console.error(`Upsert error for ${indiceName} batch ${i}: ${error.message}`);
          throw error;
        }
        upserted += batch.length;
      }

      results[indiceName] = { fetched: rawData.length, upserted };
      console.log(`${indiceName}: ${rawData.length} raw → ${rows.length} monthly → ${upserted} upserted (incl. aliases)`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
