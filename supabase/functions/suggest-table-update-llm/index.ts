/**
 * suggest-table-update-llm — Edge Function
 *
 * Para cada tabela STALE/EMPTY, consulta LLM (GPT-4o-mini) o valor oficial
 * vigente + fonte citada. Cria sugestão em table_update_suggestions
 * (status=pending) para admin aprovar via UI /admin/tabelas.
 *
 * Exige OPENAI_API_KEY no env.
 *
 * STATUS: infra OK, mas model gpt-4o-mini sem web_search retorna valores
 * baseados em training data (que pode estar desatualizado). Para produção
 * recomenda-se upgrade para gpt-4o com browsing ou Perplexity API.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchTO(url: string, init: RequestInit, ms = 90000): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal }); }
  finally { clearTimeout(t); }
}

interface TableTarget { name: string; label: string; question: string; expected_shape: string; }

const YEAR = new Date().getFullYear();
const TARGETS: TableTarget[] = [
  { name: "pjecalc_salario_minimo", label: "Salário mínimo",
    question: `Qual o valor do salário mínimo nacional brasileiro vigente em ${YEAR}? Cite decreto oficial e URL do gov.br ou in.gov.br.`,
    expected_shape: '{"valor": NUMERO, "competencia": "YYYY-MM-01"}' },
  { name: "pjecalc_inss_faixas", label: "Faixas INSS",
    question: `Quais as faixas da tabela de contribuição previdenciária INSS (empregado) vigentes em ${YEAR}? Cite portaria interministerial MPS/MF.`,
    expected_shape: '{"faixas":[{"faixa":N,"valor_ate":N,"aliquota":N}],"competencia_inicio":"YYYY-MM-01"}' },
  { name: "pjecalc_imposto_renda", label: "Tabela IRRF",
    question: `Qual a tabela progressiva mensal do IRRF vigente em ${YEAR}? Cite instrução normativa RFB.`,
    expected_shape: '{"faixas":[{"valor_inicial":N,"valor_final":N,"aliquota":N,"parcela_deduzir":N}],"competencia":"YYYY-MM-01"}' },
  { name: "pjecalc_salario_familia", label: "Salário-família",
    question: `Valor da cota salário-família e teto de remuneração vigentes em ${YEAR}?`,
    expected_shape: '{"valor_cota":N,"teto_remuneracao":N,"competencia":"YYYY-MM-01"}' },
  { name: "pjecalc_seguro_desemprego", label: "Seguro-desemprego",
    question: `Faixas de cálculo do seguro-desemprego vigentes em ${YEAR}? Cite resolução CODEFAT.`,
    expected_shape: '{"faixas":[...],"competencia":"YYYY-MM-01"}' },
];

async function askOpenAI(
  apiKey: string,
  question: string,
  schema: string,
): Promise<{ valor: unknown; citacao: string; fonte_url: string | null } | null> {
  const systemPrompt = `Você é pesquisador jurídico. Responda SOMENTE com JSON válido no formato:
{ "valor": ${schema}, "citacao": "<trecho da fonte>", "fonte_url": "<URL oficial gov.br/in.gov.br>" }
Se não souber com certeza cite "nao_encontrado": true.`;

  const resp = await fetchTO("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("OpenAI error", resp.status, text.slice(0, 400));
    return null;
  }
  const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed.nao_encontrado) return null;
    return {
      valor: parsed.valor,
      citacao: parsed.citacao ?? "",
      fonte_url: parsed.fonte_url ?? null,
    };
  } catch {
    console.error("parse:", text.slice(0, 300));
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const URL = Deno.env.get("SUPABASE_URL")!;
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI) return new Response(JSON.stringify({ error: "OPENAI_API_KEY ausente" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(URL, KEY);

    let filter: string[] | null = null;
    try { const body = await req.json(); if (Array.isArray(body?.tables)) filter = body.tables; }
    catch { /* body vazio */ }

    const targets = filter ? TARGETS.filter(t => filter!.includes(t.name)) : TARGETS;
    const results: Record<string, unknown> = {};

    for (const target of targets) {
      try {
        const answer = await askOpenAI(OPENAI, target.question, target.expected_shape);
        if (!answer) { results[target.name] = { status: "llm_no_answer" }; continue; }

        const { data: existing } = await supabase
          .from("table_update_suggestions").select("id, valor_sugerido")
          .eq("target_table", target.name).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const e = existing as { valor_sugerido?: unknown } | null;
        if (e && JSON.stringify(e.valor_sugerido) === JSON.stringify(answer.valor)) {
          results[target.name] = { status: "already_pending" }; continue;
        }

        const { error } = await supabase.from("table_update_suggestions").insert({
          target_table: target.name,
          valor_sugerido: answer.valor as Record<string, unknown>,
          fonte: "llm-gpt4o-mini",
          fonte_url: answer.fonte_url,
          citacao: answer.citacao,
          confidence: 0.65,
          status: "pending",
          metadata: { label: target.label, question: target.question },
        });
        if (error) { results[target.name] = { error: error.message }; continue; }
        results[target.name] = { status: "suggestion_created", valor: answer.valor, url: answer.fonte_url };
      } catch (e) {
        results[target.name] = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    return new Response(JSON.stringify({ ok: true, source: "LLM gpt-4o-mini (chat.completions)", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
