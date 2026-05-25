import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { baixarPdfBase64, extrairTextoDoPdf } from "./helpers/pdf-loader.ts";
import { evidenciaApareceNoPdf } from "./helpers/anti-alucinacao.ts";
import { TOOL_BASE } from "./schemas/shared.ts";
import { SYSTEM_PROMPT_HOLERITE, buildUserPromptHolerite } from "./prompts/holerite.ts";
import { SYSTEM_PROMPT_FICHA, buildUserPromptFicha } from "./prompts/ficha-financeira.ts";
import { SYSTEM_PROMPT_CTPS, buildUserPromptCtps } from "./prompts/ctps.ts";
import { SYSTEM_PROMPT_CARTAO, buildUserPromptCartao } from "./prompts/cartao-ponto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 8000;
const RATE_LIMIT = 30;
const RATE_WINDOW_SEC = 3600;

type Builder = "ficha_financeira" | "holerite" | "ctps" | "cartao_ponto";

const BUILDERS: Record<Builder, {
  system: string;
  buildUserPrompt: (json: string) => string;
}> = {
  holerite: { system: SYSTEM_PROMPT_HOLERITE, buildUserPrompt: buildUserPromptHolerite },
  ficha_financeira: { system: SYSTEM_PROMPT_FICHA, buildUserPrompt: buildUserPromptFicha },
  ctps: { system: SYSTEM_PROMPT_CTPS, buildUserPrompt: buildUserPromptCtps },
  cartao_ponto: { system: SYSTEM_PROMPT_CARTAO, buildUserPrompt: buildUserPromptCartao },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization required" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return jsonResponse({ error: "ANTHROPIC_API_KEY não configurada" }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    const rl = await checkRateLimit(supabase, user.id, "verify-csv-parity-ai", RATE_LIMIT, RATE_WINDOW_SEC);
    if (!rl.allowed) {
      return jsonResponse({ error: "Rate limit excedido", used: rl.used, limit: rl.limit }, 429);
    }

    const body = await req.json();
    const { document_id, builder, parsed } = body;

    if (!document_id || !builder || !parsed) {
      return jsonResponse({ error: "document_id, builder e parsed obrigatórios" }, 400);
    }
    if (!(builder in BUILDERS)) {
      return jsonResponse({ error: `Builder inválido: ${builder}. Use: ${Object.keys(BUILDERS).join(", ")}` }, 400);
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, storage_path, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();

    if (docError || !doc) return jsonResponse({ error: "Documento não encontrado" }, 404);

    // deno-lint-ignore no-explicit-any
    if ((doc as any).cases?.criado_por !== user.id) {
      return jsonResponse({ error: "Sem permissão para este documento" }, 403);
    }

    if (!doc.storage_path) {
      return jsonResponse({ error: "PDF original não disponível para este documento" }, 400);
    }

    const pdfData = await baixarPdfBase64(supabase, doc.storage_path);
    if (!pdfData) {
      return jsonResponse({ error: "Não foi possível baixar o PDF original" }, 400);
    }

    const pdfText = await extrairTextoDoPdf(pdfData.bytes);

    const builderConfig = BUILDERS[builder as Builder];
    const parsedJson = JSON.stringify(parsed, null, 2).slice(0, 50000);
    const userPrompt = builderConfig.buildUserPrompt(parsedJson);

    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 130_000);

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-beta": "pdfs-2024-09-25",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: builderConfig.system,
          tools: [TOOL_BASE],
          tool_choice: { type: "tool", name: "emitir_paridade_forense" },
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfData.base64 },
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: userPrompt },
            ],
          }],
        }),
      });

      const durationMs = Date.now() - t0;

      if (!resp.ok) {
        if (resp.status === 429) {
          return jsonResponse({ error: "Rate limit Anthropic" }, 429);
        }
        const errBody = await resp.text();
        console.error("[parity-ai] Anthropic error:", resp.status, errBody.slice(0, 500));
        return jsonResponse({ error: `Anthropic ${resp.status}` }, 502);
      }

      // deno-lint-ignore no-explicit-any
      const json = await resp.json() as { content?: Array<{ type: string; input?: any }> };

      // deno-lint-ignore no-explicit-any
      let toolResult: any = null;
      for (const block of json.content ?? []) {
        if (block.type === "tool_use" && block.input) {
          toolResult = block.input;
          break;
        }
      }

      if (!toolResult) {
        return jsonResponse({ error: "Claude não retornou dados via tool" }, 502);
      }

      const discrepancias = Array.isArray(toolResult.discrepancias) ? toolResult.discrepancias : [];
      const validadas = [];
      const descartadas = [];

      for (const d of discrepancias) {
        if (d.evidencia_pdf && pdfText && !evidenciaApareceNoPdf(d.evidencia_pdf, pdfText)) {
          descartadas.push({
            field_path: d.field_path || "",
            suggested: String(d.suggested ?? ""),
            reason: "Evidência citada não encontrada no texto do PDF",
          });
        } else {
          validadas.push(d);
        }
      }

      const contagens = {
        criticas: validadas.filter((d: { severidade: string }) => d.severidade === "critica").length,
        altas: validadas.filter((d: { severidade: string }) => d.severidade === "alta").length,
        medias: validadas.filter((d: { severidade: string }) => d.severidade === "media").length,
        baixas: validadas.filter((d: { severidade: string }) => d.severidade === "baixa").length,
      };

      const resultado = {
        paridade_geral: toolResult.paridade_geral || (validadas.length === 0 ? "completa" : "parcial"),
        resumo: {
          total_itens_csv: 0,
          com_evidencia_pdf: validadas.length,
          sem_evidencia_pdf: descartadas.length,
          ausentes_no_csv: validadas.filter((d: { tipo: string }) => d.tipo === "ausente_no_csv").length,
          discrepancias_criticas: contagens.criticas,
          discrepancias_altas: contagens.altas,
          discrepancias_medias: contagens.medias,
          discrepancias_baixas: contagens.baixas,
        },
        discrepancias: validadas,
        discarded_hallucinations: descartadas,
        totais_por_competencia: toolResult.totais_por_competencia || [],
        resumo_executivo: toolResult.resumo_executivo || "",
        ai_confidence_geral: toolResult.ai_confidence_geral ?? 0,
        pdf_consultado: true,
        model: MODEL,
        duration_ms: durationMs,
      };

      console.log(
        `[parity-ai] builder=${builder} doc=${document_id} discrepancias=${validadas.length} descartadas=${descartadas.length} confidence=${resultado.ai_confidence_geral} duration=${durationMs}ms`,
      );

      return jsonResponse(resultado);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error("[verify-csv-parity-ai] error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});
