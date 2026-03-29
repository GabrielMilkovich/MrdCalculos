import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERIES = [
  { id: 10764, name: 'IPCA-E', dbName: 'IPCAE', daily: false },
  { id: 4390, name: 'SELIC', dbName: 'SELIC', daily: false },
  { id: 188, name: 'INPC', dbName: 'INPC', daily: false },
  { id: 226, name: 'TR', dbName: 'TR', daily: true },
  { id: 433, name: 'IPCA', dbName: 'IPCA', daily: false },
  { id: 189, name: 'IGP-M', dbName: 'IGPM', daily: false },
];

/**
 * Fetch BCB series data, trying JSON first then falling back to CSV format.
 * For daily series (like TR), splits into 10-year windows.
 */
async function fetchBCBSeries(serieId: number, isDailyPeriodicity = false): Promise<{ data: string; valor: string }[]> {
  if (isDailyPeriodicity) {
    // Split into 10-year windows for daily series
    const allData: { data: string; valor: string }[] = [];
    const windows = [
      ['01/01/1995', '31/12/2004'],
      ['01/01/2005', '31/12/2014'],
      ['01/01/2015', '31/12/2025'],
    ];
    for (const [start, end] of windows) {
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=${start}&dataFinal=${end}`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) allData.push(...data);
      } else {
        // Try CSV fallback for this window
        const csvUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=csv&dataInicial=${start}&dataFinal=${end}`;
        const csvResp = await fetch(csvUrl);
        if (csvResp.ok) {
          const csvText = await csvResp.text();
          const lines = csvText.trim().split('\n');
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const [d, v] = line.split(';');
            if (d && v) allData.push({ data: d.trim(), valor: v.trim() });
          }
        } else {
          await csvResp.text();
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }
    return allData;
  }

  // Non-daily series: single request
  const jsonUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=01/01/1995&dataFinal=31/12/2025`;
  const jsonResp = await fetch(jsonUrl, {
    headers: { 'Accept': 'application/json' },
  });
  
  if (jsonResp.ok) {
    const data = await jsonResp.json();
    if (Array.isArray(data) && data.length > 0) return data;
  } else {
    await jsonResp.text();
  }

  // Fallback: CSV format
  const csvUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=csv&dataInicial=01/01/1995&dataFinal=31/12/2025`;
  const csvResp = await fetch(csvUrl);
  if (!csvResp.ok) {
    const body = await csvResp.text();
    throw new Error(`BCB API returned ${csvResp.status} for both JSON and CSV: ${body.slice(0, 200)}`);
  }
  
  const csvText = await csvResp.text();
  const lines = csvText.trim().split('\n');
  const results: { data: string; valor: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
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
