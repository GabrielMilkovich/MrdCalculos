// =====================================================
// EDGE FUNCTION: extract-rubricas-ai (FASE 2 — LLM extractor)
// =====================================================
//
// Extrator IA de rubricas / totalizadores / competência a partir do OCR.
// NÃO substitui o parser determinístico — roda em paralelo. O parser vira
// shadow check (FASE 3 — comparador parser × LLM).
//
// CONTRATO ANTI-ALUCINAÇÃO (jurídico-grave):
//   1. **Substring literal**: TODO valor (número, texto, data, competência)
//      retornado pela IA DEVE existir LITERALMENTE no `ocr_text`. Caso
//      contrário é movido para `discarded_hallucinations` e removido do
//      `extracted`. Verificação acontece SERVER-SIDE, post-hoc — não confia
//      na IA pra fazer self-check.
//   2. **Variantes BR**: número 1234.56 é validado contra "1.234,56" /
//      "1234,56" / "R$ 1.234,56" / "R$1.234,56". Datas DD/MM/YYYY contra
//      DD-MM-YYYY e DD.MM.YYYY.
//   3. **Structured output strict**: response_format=json_schema strict=true.
//      additionalProperties=false em todos os níveis; null permitido só
//      onde o schema declara explicitamente.
//   4. **Timeout 60s** via AbortController. Em timeout → 504.
//
// Body:
//   { document_id: string, doc_type: 'holerite'|'cartao_ponto'|'ferias'|'faltas', ocr_text: string }
//
// Response success:
//   {
//     extracted: {
//       competencia: string | null,
//       rubricas: Array<{ codigo, nome, valor_vencimento, valor_desconto, quantidade }>,
//       totalizadores: { bruto, descontos, liquido }
//     },
//     discarded_hallucinations: Array<{ field, suggested, reason }>,
//     ai_confidence: number,  // 0..100
//     model: string,
//     duration_ms: number,
//   }
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import {
  aplicarAntiAlucinacao,
  type ExtractedPayload,
  type RubricaExtracted,
  type TotalizadoresExtracted,
  type DiscardedHallucination,
} from "../_shared/anti-hallucination.ts";

// gpt-5-mini com reasoning_effort=minimal — extração é direta (não exige
// raciocínio complexo, só leitura cuidadosa). low/medium estourava 60s
// em holerites grandes. Trocar para gpt-5 caso fidelidade ficar < 90%.
const MODEL = "gpt-5-mini";
const TIMEOUT_MS = 60_000;
const OCR_MAX_CHARS = 50_000; // openai 128k tokens ≈ 100k chars; folga.

const RATE_LIMIT_PER_HOUR = 60;
const RATE_LIMIT_WINDOW_SEC = 3600;

type DocType = "holerite" | "cartao_ponto" | "ferias" | "faltas";
const DOC_TYPES_VALIDOS: DocType[] = ["holerite", "cartao_ponto", "ferias", "faltas"];

// =====================================================
// System prompt — literal do plano de auditoria FASE 2
// =====================================================
const SYSTEM_PROMPT = `Você é extrator de dados de holerites trabalhistas brasileiros. Retorne JSON estruturado conforme schema. Regras invioláveis:

1. TODO valor (número, texto, data) que você retornar DEVE existir literalmente no OCR. Se não consegue encontrar com Ctrl+F, não retorne.
2. NÃO calcule, NÃO interprete. Se o holerite tem "Salário base 2.500,00", retorne valor=2500.00. Não some, não converte, não infere.
3. Bases de cálculo (Base IR, Base INSS, Base FGTS) NÃO são rubricas. Ignore.
4. Totalizadores (Total Bruto, Total Descontos, Líquido) vão em campo separado \`totalizadores\`, NÃO em \`rubricas\`.
5. Distinção vencimento × desconto: rubricas com nome contendo "INSS", "IRRF", "IRPF", "IR Retido", "Vale Transporte", "Plano Saúde", "Empréstimo", "Adiantamento" são DESCONTOS. Coloque o valor em \`valor_desconto\`, deixe \`valor_vencimento: null\`.
6. Histórico/repetição: se a mesma rubrica aparece N vezes no mesmo holerite (parcelas de empréstimo, por exemplo), retorne UMA SÓ ocorrência.
7. Competência: formato MM/yyyy. Procure por "Referência", "Período", "Competência", "Mês/Ano".
8. Quando incerto, deixe null. Nunca chute.

Responda APENAS no schema JSON definido.`;

// =====================================================
// JSON Schema strict
// =====================================================
const RESPONSE_SCHEMA = {
  name: "ExtractRubricasResult",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["competencia", "rubricas", "totalizadores", "ai_confidence"],
    properties: {
      competencia: {
        type: ["string", "null"],
        description: "Competência MM/yyyy ou null quando não detectada",
      },
      rubricas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["codigo", "nome", "valor_vencimento", "valor_desconto", "quantidade"],
          properties: {
            codigo: { type: ["string", "null"] },
            nome: { type: "string" },
            valor_vencimento: { type: ["number", "null"] },
            valor_desconto: { type: ["number", "null"] },
            quantidade: { type: ["number", "null"] },
          },
        },
      },
      totalizadores: {
        type: "object",
        additionalProperties: false,
        required: ["bruto", "descontos", "liquido"],
        properties: {
          bruto: { type: ["number", "null"] },
          descontos: { type: ["number", "null"] },
          liquido: { type: ["number", "null"] },
        },
      },
      ai_confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Confiança da extração como PORCENTAGEM inteira 0..100. NUNCA decimais 0..1.",
      },
    },
  },
} as const;

// Estende o payload com confidence (vem da IA junto com extracted).
interface IAResponseParsed extends ExtractedPayload {
  ai_confidence: number;
}

// =====================================================
// Chamada OpenAI
// =====================================================
async function chamarOpenAI(
  apiKey: string,
  ocrText: string,
  docType: DocType,
): Promise<{ raw: IAResponseParsed; durationMs: number; status: number }> {
  const ocrTrim = ocrText.length > OCR_MAX_CHARS ? ocrText.slice(0, OCR_MAX_CHARS) + "\n[...truncado...]" : ocrText;
  const userMsg = `Tipo de documento: ${docType}\n\nOCR do documento:\n\n${ocrTrim}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = Date.now();
  let status = 0;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
        reasoning_effort: "minimal",
      }),
      signal: controller.signal,
    });
    status = resp.status;
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 500)}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI: resposta sem content");
    }
    const parsed = JSON.parse(content) as IAResponseParsed;
    return { raw: parsed, durationMs: Date.now() - start, status };
  } finally {
    clearTimeout(timeoutId);
  }
}

// =====================================================
// Handler
// =====================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header obrigatório" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    // Rate limit (audit-fix S3).
    const rl = await checkRateLimit(
      supabaseAuth,
      user.id,
      "extract-rubricas-ai",
      RATE_LIMIT_PER_HOUR,
      RATE_LIMIT_WINDOW_SEC,
    );
    if (!rl.allowed) {
      return jsonResponse(
        {
          error: "Rate limit excedido",
          hint: `Limite de ${rl.limit}/hora atingido.`,
          used: rl.used,
          limit: rl.limit,
        },
        429,
      );
    }

    const body = await req.json().catch(() => ({}));
    const { document_id, doc_type, ocr_text } = body ?? {};

    if (!document_id || typeof document_id !== "string") {
      return jsonResponse({ error: "document_id obrigatório" }, 400);
    }
    if (!doc_type || !DOC_TYPES_VALIDOS.includes(doc_type)) {
      return jsonResponse(
        { error: `doc_type inválido. Aceitos: ${DOC_TYPES_VALIDOS.join(", ")}` },
        400,
      );
    }
    if (!ocr_text || typeof ocr_text !== "string" || ocr_text.length < 10) {
      return jsonResponse({ error: "ocr_text obrigatório (mínimo 10 chars)" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY não configurada" }, 500);
    }

    let llmResult;
    try {
      llmResult = await chamarOpenAI(OPENAI_API_KEY, ocr_text, doc_type as DocType);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("AbortError") || msg.includes("aborted")) {
        return jsonResponse({ error: "timeout", partial: false }, 504);
      }
      console.error("[extract-rubricas-ai] OpenAI falhou:", msg);
      return jsonResponse({ error: "openai_error", detail: msg.slice(0, 300) }, 502);
    }

    const { raw, durationMs } = llmResult;
    const { extracted, discarded } = aplicarAntiAlucinacao(
      {
        competencia: raw.competencia,
        rubricas: raw.rubricas,
        totalizadores: raw.totalizadores,
      },
      ocr_text,
    );

    return jsonResponse({
      extracted,
      discarded_hallucinations: discarded,
      ai_confidence: raw.ai_confidence,
      model: MODEL,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error("[extract-rubricas-ai] uncaught:", err);
    return jsonResponse(
      { error: "internal_error", detail: String(err).slice(0, 300) },
      500,
    );
  }
});
