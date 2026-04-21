/**
 * tables-freshness-watchdog — Edge Function
 *
 * Monitora o frescor de cada tabela de referência e marca como STALE
 * aquelas que passaram do prazo esperado sem atualização.
 *
 * POR QUE ISSO EXISTE:
 *   Várias tabelas (INSS, IR, salário mínimo, salário família, seguro
 *   desemprego) são atualizadas pelo governo via Portaria/Decreto no DOU.
 *   O Brasil NÃO EXPÕE essas tabelas como API pública. Portanto:
 *     - Não é possível auto-fetch mensal/anual
 *     - A atualização é manual (admin insere via UI /admin/tabelas)
 *     - Mas sem monitor, uma tabela desatualizada passa despercebida
 *
 * COMO FUNCIONA:
 *   Lê cada tabela, compara última competência vs today(), e escreve
 *   em public.tables_freshness o status (FRESH / STALE / CRITICAL).
 *
 * Usado por:
 *   - Cron semanal para atualizar o status
 *   - UI /admin/tabelas mostra badges baseados nisso
 *   - Alertas podem ser disparados quando CRITICAL
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TableSpec {
  name: string;
  date_col: string;
  frequency: "monthly" | "annual" | "static";
  source_type: "api_oficial" | "api_comunidade" | "derivado" | "manual_dou";
  source_detail: string;
  // Dias após ultima atualização para considerar STALE
  stale_days: number;
  // Dias após ultima atualização para considerar CRITICAL
  critical_days: number;
}

const SPECS: TableSpec[] = [
  {
    name: "pjecalc_correcao_monetaria", date_col: "competencia",
    frequency: "monthly", source_type: "api_oficial",
    source_detail: "BCB SGS API (séries 4390, 10764, 433, 188, 189, 190, 226)",
    stale_days: 45, critical_days: 75,
  },
  {
    name: "pjecalc_taxa_legal", date_col: "competencia",
    frequency: "monthly", source_type: "derivado",
    source_detail: "derivado de SELIC-IPCA (Lei 14.905/2024)",
    stale_days: 45, critical_days: 75,
  },
  {
    name: "pjecalc_juros_mora", date_col: "competencia",
    frequency: "monthly", source_type: "derivado",
    source_detail: "derivado de SELIC (ADC58 STF)",
    stale_days: 45, critical_days: 75,
  },
  {
    name: "pjecalc_feriados", date_col: "data",
    frequency: "annual", source_type: "api_comunidade",
    source_detail: "BrasilAPI /feriados/v1/{ano}",
    stale_days: 400, critical_days: 730,
  },
  {
    name: "pjecalc_inss_faixas", date_col: "competencia_inicio",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "Portaria Interministerial MPS/MF (janeiro)",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_imposto_renda", date_col: "competencia",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "Instrução Normativa RFB (anual)",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_salario_minimo", date_col: "competencia",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "Decreto federal (janeiro)",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_salario_familia", date_col: "competencia",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "Portaria Interministerial (janeiro)",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_seguro_desemprego", date_col: "competencia",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "Resolução CODEFAT",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_custas_judiciais", date_col: "vigencia_inicio",
    frequency: "static", source_type: "manual_dou",
    source_detail: "Lei 8.620/1993 atualizada pelos TRTs",
    stale_days: 9999, critical_days: 9999,  // static → nunca stale
  },
  {
    name: "pjecalc_vale_transporte", date_col: "vigencia_inicio",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "ANTT/prefeituras (passe rodoviário)",
    stale_days: 400, critical_days: 500,
  },
  {
    name: "pjecalc_pisos_salariais", date_col: "competencia",
    frequency: "annual", source_type: "manual_dou",
    source_detail: "CCTs sindicais por estado",
    stale_days: 400, critical_days: 500,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date();
    const results: {
      name: string; ultima_data: string | null; dias_desde: number | null;
      status: "FRESH" | "STALE" | "CRITICAL" | "EMPTY";
      source_type: string; source_detail: string; frequency: string;
    }[] = [];

    for (const spec of SPECS) {
      const { data, error } = await supabase
        .from(spec.name)
        .select(spec.date_col)
        .order(spec.date_col, { ascending: false })
        .limit(1);

      if (error) {
        console.error(`[watchdog] ${spec.name}:`, error.message);
        continue;
      }

      const ultimaRaw = data?.[0]?.[spec.date_col] ?? null;
      const ultima: string | null = typeof ultimaRaw === "string" ? ultimaRaw : null;

      let status: "FRESH" | "STALE" | "CRITICAL" | "EMPTY";
      let diasDesde: number | null = null;

      if (!ultima) {
        status = "EMPTY";
      } else {
        const ultimaDate = new Date(ultima);
        diasDesde = Math.floor((today.getTime() - ultimaDate.getTime()) / 86400000);
        if (diasDesde >= spec.critical_days) status = "CRITICAL";
        else if (diasDesde >= spec.stale_days) status = "STALE";
        else status = "FRESH";
      }

      results.push({
        name: spec.name, ultima_data: ultima, dias_desde: diasDesde, status,
        source_type: spec.source_type,
        source_detail: spec.source_detail,
        frequency: spec.frequency,
      });
    }

    // Persistir em public.tables_freshness (snapshot)
    const snapshotRows = results.map(r => ({
      table_name: r.name,
      ultima_data: r.ultima_data,
      dias_desde_atualizacao: r.dias_desde,
      status: r.status,
      source_type: r.source_type,
      source_detail: r.source_detail,
      frequency: r.frequency,
      checked_at: new Date().toISOString(),
    }));

    const { error: insErr } = await supabase
      .from("tables_freshness")
      .upsert(snapshotRows, { onConflict: "table_name" });

    if (insErr) {
      console.warn("[watchdog] persistência falhou:", insErr.message);
    }

    const criticalCount = results.filter(r => r.status === "CRITICAL" || r.status === "EMPTY").length;
    const staleCount = results.filter(r => r.status === "STALE").length;

    return new Response(JSON.stringify({
      ok: true,
      summary: {
        total: results.length,
        fresh: results.filter(r => r.status === "FRESH").length,
        stale: staleCount,
        critical: criticalCount,
      },
      tables: results,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("tables-freshness-watchdog error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
