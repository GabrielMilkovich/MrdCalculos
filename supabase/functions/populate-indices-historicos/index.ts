import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERIES = [
  { id: 10764, name: 'IPCA-E', dbName: 'IPCAE' },
  { id: 4390, name: 'SELIC', dbName: 'SELIC' },
  { id: 188, name: 'INPC', dbName: 'INPC' },
  { id: 226, name: 'TR', dbName: 'TR' },
  { id: 433, name: 'IPCA', dbName: 'IPCA' },
  { id: 189, name: 'IGP-M', dbName: 'IGPM' },
];

/**
 * Fetch BCB series data, trying JSON first then falling back to CSV format.
 */
async function fetchBCBSeries(serieId: number): Promise<{ data: string; valor: string }[]> {
  // Try JSON format first
  const jsonUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=01/01/1995&dataFinal=31/12/2025`;
  const jsonResp = await fetch(jsonUrl, {
    headers: { 'Accept': 'application/json' },
  });
  
  if (jsonResp.ok) {
    const data = await jsonResp.json();
    if (Array.isArray(data) && data.length > 0) return data;
  } else {
    await jsonResp.text(); // consume body
  }

  // Fallback: CSV format (works for TR and other problematic series)
  const csvUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=csv&dataInicial=01/01/1995&dataFinal=31/12/2025`;
  const csvResp = await fetch(csvUrl);
  if (!csvResp.ok) {
    const body = await csvResp.text();
    throw new Error(`BCB API returned ${csvResp.status} for both JSON and CSV: ${body.slice(0, 200)}`);
  }
  
  const csvText = await csvResp.text();
  const lines = csvText.trim().split('\n');
  // Skip header line (data;valor)
  const results: { data: string; valor: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // CSV uses semicolon separator: dd/mm/yyyy;value
    const [data, valor] = line.split(';');
    if (data && valor) {
      results.push({ data: data.trim(), valor: valor.trim() });
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: Record<string, any> = {};

  for (const serie of SERIES) {
    try {
      const data = await fetchBCBSeries(serie.id);

      if (data.length === 0) {
        results[serie.name] = { error: 'No data returned from BCB API' };
        continue;
      }

      // Calculate accumulated factor
      let acumulado = 100; // Base 100
      const rows = data.map((d: any) => {
        const [dia, mes, ano] = d.data.split('/');
        const competencia = `${ano}-${mes}-${dia}`;
        const valor = parseFloat((d.valor || '0').replace(',', '.'));
        acumulado = acumulado * (1 + valor / 100);
        return {
          indice: serie.dbName,
          competencia,
          valor,
          acumulado: parseFloat(acumulado.toFixed(8)),
        };
      });

      // Upsert in batches of 500
      let inserted = 0;
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from('pjecalc_correcao_monetaria')
          .upsert(batch, { onConflict: 'indice,competencia' });
        if (error) {
          errors.push(`Batch ${Math.floor(i / 500)}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      results[serie.name] = {
        total: rows.length,
        inserted,
        lastDate: rows[rows.length - 1]?.competencia,
        lastAcumulado: rows[rows.length - 1]?.acumulado,
        ...(errors.length > 0 ? { errors } : {}),
      };
    } catch (err) {
      results[serie.name] = { error: String(err) };
    }

    // Small delay between series to avoid BCB rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
