import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BCB_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

interface BcbDataPoint {
  data: string; // dd/MM/yyyy
  valor: string;
}

function parseBcbDate(d: string): string {
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const serieIds: number[] = body.serie_ids || [10764, 4390];

  const results: Record<number, { inserted: number; error?: string }> = {};

  for (const serieId of serieIds) {
    try {
      // Get last processed date
      const { data: syncRow } = await supabase
        .from("sync_status")
        .select("last_processed_date")
        .eq("serie_id", serieId)
        .maybeSingle();

      const lastDate = syncRow?.last_processed_date || "2020-01-01";

      // Fetch from BCB API
      const url = `${BCB_BASE}.${serieId}/dados?formato=json&dataInicial=${formatDateBcb(lastDate)}`;
      const apiRes = await fetch(url);

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`BCB API returned ${apiRes.status}: ${errText}`);
      }

      const data: BcbDataPoint[] = await apiRes.json();

      if (!Array.isArray(data) || data.length === 0) {
        results[serieId] = { inserted: 0 };
        await supabase.from("sync_status").upsert(
          {
            serie_id: serieId,
            status: "completed",
            last_sync_attempt: new Date().toISOString(),
            error_message: null,
          },
          { onConflict: "serie_id" }
        );
        continue;
      }

      // Parse and prepare records
      const records = data
        .filter((d) => d.valor && d.valor.trim() !== "")
        .map((d) => ({
          serie_id: serieId,
          data_referencia: parseBcbDate(d.data),
          valor: parseFloat(d.valor.replace(",", ".")),
          ultima_atualizacao: new Date().toISOString(),
        }))
        .filter((r) => r.data_referencia > lastDate && !isNaN(r.valor));

      let inserted = 0;
      if (records.length > 0) {
        // Batch insert in chunks of 500
        for (let i = 0; i < records.length; i += 500) {
          const chunk = records.slice(i, i + 500);
          const { error: insertErr } = await supabase
            .from("indices_oficiais")
            .upsert(chunk, { onConflict: "serie_id,data_referencia" });

          if (insertErr) {
            console.error(`Insert error for serie ${serieId}:`, insertErr);
          } else {
            inserted += chunk.length;
          }

          // Small delay between chunks to avoid overloading
          if (i + 500 < records.length) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        const latestDate = records[records.length - 1].data_referencia;
        await supabase.from("sync_status").upsert(
          {
            serie_id: serieId,
            serie_nome: serieId === 10764 ? "IPCA-E" : "SELIC",
            last_processed_date: latestDate,
            status: "completed",
            last_sync_attempt: new Date().toISOString(),
            error_message: null,
          },
          { onConflict: "serie_id" }
        );
      }

      results[serieId] = { inserted };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error syncing serie ${serieId}:`, msg);

      await supabase.from("sync_status").upsert(
        {
          serie_id: serieId,
          status: "error",
          last_sync_attempt: new Date().toISOString(),
          error_message: msg,
        },
        { onConflict: "serie_id" }
      );

      results[serieId] = { inserted: 0, error: msg };
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function formatDateBcb(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
