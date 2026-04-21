/**
 * monitor-dou-publications — Edge Function
 *
 * Consulta o portal do Diário Oficial da União (in.gov.br) e filtra publicações
 * relevantes para MrdCalc por keywords.
 *
 * Keywords mapeadas → tabelas:
 *  - "salário mínimo"       → pjecalc_salario_minimo
 *  - "contribuição previdenciária", "INSS" → pjecalc_inss_faixas
 *  - "imposto de renda", "IRRF", "IRPF"    → pjecalc_imposto_renda
 *  - "salário-família"      → pjecalc_salario_familia
 *  - "seguro-desemprego", "CODEFAT" → pjecalc_seguro_desemprego
 *
 * STATUS: extractor precisa ajuste — portal in.gov.br mudou estrutura
 * (não é mais Next.js). Fallback: watchdog semanal continua alertando stale.
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
  try { return await fetch(url, { signal: c.signal, headers: { "User-Agent": "MrdCalc/1.0" } }); }
  finally { clearTimeout(t); }
}

interface DouItem {
  titulo: string;
  ementa?: string;
  conteudo?: string;
  orgao?: string;
  dataPublicacao?: string;
  urlTitulo?: string;
}

const KEYWORDS: { kw: RegExp; table: string; label: string }[] = [
  { kw: /sal[aá]rio\s+m[ií]nimo/i, table: "pjecalc_salario_minimo", label: "salário mínimo" },
  { kw: /contribui[cç][aã]o\s+previdenci[aá]ria|tabela.{0,30}INSS|INSS/i, table: "pjecalc_inss_faixas", label: "INSS" },
  { kw: /imposto\s+sobre\s+a\s+renda|IRRF|IRPF|tabela\s+progressiva/i, table: "pjecalc_imposto_renda", label: "IRRF/IRPF" },
  { kw: /sal[aá]rio[- ]fam[ií]lia/i, table: "pjecalc_salario_familia", label: "salário-família" },
  { kw: /seguro[- ]desemprego|CODEFAT/i, table: "pjecalc_seguro_desemprego", label: "seguro-desemprego" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const URL = Deno.env.get("SUPABASE_URL")!;
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(URL, KEY);

    const now = new Date();
    const since = new Date(now.getTime() - 14 * 86400000);
    const dataInicio = since.toISOString().slice(0, 10);
    const dataFim = now.toISOString().slice(0, 10);

    const baseUrl = "https://www.in.gov.br/consulta";
    const searchQuery = KEYWORDS.map(k => `(${k.kw.source.replace(/\\/g, "")})`).join(" OR ");
    const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&s=do1%2Cdo2&publishFrom=${dataInicio}&publishTo=${dataFim}&delta=100`;

    const resp = await fetchTO(url);
    if (!resp.ok) {
      return new Response(JSON.stringify({
        ok: false, warning: "DOU consulta falhou",
        status: resp.status,
        note: "watchdog continua monitorando frescor; admin pode atualizar via UI",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = await resp.text();
    const dataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!dataMatch) {
      return new Response(JSON.stringify({
        ok: false, warning: "Portal mudou estrutura (não é mais Next.js); extractor precisa atualização",
        fallback: "watchdog semanal continua ativo",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let nextData: { props?: { pageProps?: { data?: { jsonArray?: DouItem[] } } } } = {};
    try { nextData = JSON.parse(dataMatch[1]); }
    catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "parse __NEXT_DATA__: " + String(e) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const items = nextData?.props?.pageProps?.data?.jsonArray ?? [];
    let matched = 0, inserted = 0;

    for (const item of items) {
      const text = [item.titulo, item.ementa, item.conteudo, item.orgao].filter(Boolean).join(" ");
      const matches: { table: string; label: string }[] = [];
      for (const k of KEYWORDS) {
        if (k.kw.test(text)) matches.push({ table: k.table, label: k.label });
      }
      if (matches.length === 0) continue;
      matched++;

      const publicacaoDate = item.dataPublicacao?.slice(0, 10) ?? dataFim;
      const itemUrl = item.urlTitulo ? `https://www.in.gov.br${item.urlTitulo}` : null;

      const { error } = await supabase.from("dou_publications_alerts").upsert({
        publicacao_date: publicacaoDate,
        titulo: item.titulo ?? "(sem título)",
        orgao: item.orgao ?? null,
        ementa: item.ementa ?? null,
        url: itemUrl,
        keywords_matched: matches.map(m => m.label),
        related_table: matches[0].table,
      }, { onConflict: "url,publicacao_date", ignoreDuplicates: true });

      if (!error) inserted++;
    }

    return new Response(JSON.stringify({
      ok: true, source: "in.gov.br portal",
      periodo: { inicio: dataInicio, fim: dataFim },
      items_scanned: items.length, matched, inserted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
