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
async function fetchBCBSeries(serieId: number, isDailyPeriodicity = false, windowIndex: number | null = null): Promise<{ data: string; valor: string }[]> {
  const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 PjeCalc/1.0' };

  if (isDailyPeriodicity) {
    const allData: { data: string; valor: string }[] = [];
    // Use 5-year windows for daily series to avoid timeouts
    const windows = [
      ['01/01/1995', '31/12/1999'],
      ['01/01/2000', '31/12/2004'],
      ['01/01/2005', '31/12/2009'],
      ['01/01/2010', '31/12/2014'],
      ['01/01/2015', '31/12/2019'],
      ['01/01/2020', '31/12/2025'],
    ];
    const selectedWindows = windowIndex !== null ? [windows[windowIndex]] : windows;
    for (const [start, end] of selectedWindows) {
      // Try JSON first for daily series
      const jsonUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=${start}&dataFinal=${end}`;
      console.log(`Fetching daily ${serieId} window ${start}-${end} (JSON)...`);
      try {
        const jsonResp = await fetch(jsonUrl, { headers });
        if (jsonResp.ok) {
          const contentType = jsonResp.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const data = await jsonResp.json();
            if (Array.isArray(data)) {
              console.log(`  Got ${data.length} JSON records`);
              allData.push(...data);
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
          } else {
            await jsonResp.text(); // consume body
          }
        } else {
          console.log(`  JSON failed: ${jsonResp.status}`);
          await jsonResp.text();
        }
      } catch (e) {
        console.log(`  JSON error: ${e}`);
      }

      // Fallback to CSV
      const csvUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=csv&dataInicial=${start}&dataFinal=${end}`;
      console.log(`  Trying CSV fallback...`);
      try {
        const csvResp = await fetch(csvUrl, { headers: { 'User-Agent': 'Mozilla/5.0 PjeCalc/1.0' } });
        if (csvResp.ok) {
          const csvText = await csvResp.text();
          const lines = csvText.trim().split('\n');
          console.log(`  CSV lines: ${lines.length}`);
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(';').map(p => p.replace(/"/g, '').trim());
            const d = parts[0];
            const v = parts.length >= 3 ? parts[2] : parts[1];
            if (d && v && d.includes('/')) allData.push({ data: d, valor: v });
          }
        } else {
          console.log(`  CSV failed: ${csvResp.status}`);
          await csvResp.text();
        }
      } catch (e) {
        console.log(`  CSV error: ${e}`);
      }
      await new Promise(r => setTimeout(r, 800));
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
  
  // Allow filtering to specific series and daily window index
  let filterNames: string[] | null = null;
  let dailyWindowIndex: number | null = null;
  try {
    const body = await req.json();
    if (body?.series && Array.isArray(body.series)) filterNames = body.series;
    if (typeof body?.dailyWindow === 'number') dailyWindowIndex = body.dailyWindow;
  } catch { /* no body or invalid JSON */ }

  const seriesToProcess = filterNames 
    ? SERIES.filter(s => filterNames!.includes(s.name))
    : SERIES;

  for (const serie of seriesToProcess) {
    try {
      const data = await fetchBCBSeries(serie.id, serie.daily, serie.daily ? dailyWindowIndex : null);

      if (data.length === 0) {
        results[serie.name] = { error: 'No data returned from BCB API' };
        continue;
      }

      // For daily series (TR), aggregate to monthly using the first day's value
      let processedData = data;
      if (serie.daily) {
        const monthlyMap = new Map<string, { data: string; valor: string }>();
        for (const d of data) {
          const [dia, mes, ano] = d.data.split('/');
          const monthKey = `${ano}-${mes}`;
          // Keep first entry of each month (1st day value = the monthly TR rate)
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { data: `01/${mes}/${ano}`, valor: d.valor });
          }
        }
        processedData = Array.from(monthlyMap.values());
      }

      // Calculate accumulated factor
      let acumulado = 100; // Base 100
      const rows = processedData.map((d: any) => {
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
