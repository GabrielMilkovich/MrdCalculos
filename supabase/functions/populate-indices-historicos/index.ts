import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SERIES = [
  { id: 10764, name: 'IPCA-E', dbName: 'IPCAE' },
  { id: 4390, name: 'SELIC', dbName: 'SELIC' },
  { id: 188, name: 'INPC', dbName: 'INPC' },
  { id: 226, name: 'TR', dbName: 'TR' },
  { id: 433, name: 'IPCA', dbName: 'IPCA' },
  { id: 189, name: 'IGP-M', dbName: 'IGPM' },
];

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: Record<string, any> = {};

  for (const serie of SERIES) {
    try {
      // Fetch from BCB API
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie.id}/dados?formato=json&dataInicial=01/01/1995&dataFinal=31/12/2025`;
      const resp = await fetch(url);
      if (!resp.ok) {
        results[serie.name] = { error: `BCB API returned ${resp.status}: ${resp.statusText}` };
        continue;
      }
      const data = await resp.json();

      if (!Array.isArray(data) || data.length === 0) {
        results[serie.name] = { error: 'No data returned from BCB API' };
        continue;
      }

      // Calculate accumulated factor
      let acumulado = 100; // Base 100
      const rows = data.map((d: any) => {
        const [dia, mes, ano] = d.data.split('/');
        const competencia = `${ano}-${mes}-${dia}`;
        const valor = parseFloat(d.valor.replace(',', '.'));
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
      let errors: string[] = [];
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
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
});
