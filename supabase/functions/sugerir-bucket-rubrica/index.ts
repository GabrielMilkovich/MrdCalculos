// =====================================================
// EDGE FUNCTION: SUGERIR BUCKET DE RUBRICA (V7)
// =====================================================
// Único uso de IA no fluxo de extração após V7. Recebe o nome de uma
// rubrica não classificada por `rubrica_mapping` (tabela determinística)
// e devolve uma SUGESTÃO de bucket PJe-Calc — o operador é obrigado a
// revisar antes de salvar (UI no HoleritePreviewDialog).
//
// Nunca grava direto: a função só responde {bucket, justificativa,
// confianca}. Persistência (salvar para próximas) acontece no client
// via insert na tabela `rubrica_mapping`.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = [
  "minimo_garantido",
  "salario_substituicao",
  "comissoes_produtos",
  "dsr_comissoes",
  "comissoes_servicos",
  "premios",
  "desconsiderar",
] as const;

type Bucket = (typeof BUCKETS)[number];

interface SugestaoBucket {
  bucket: Bucket;
  justificativa: string;
  confianca: "alta" | "media" | "baixa";
}

const SYSTEM_PROMPT = `Você classifica rubricas de holerite brasileiro em buckets do PJe-Calc.

Buckets disponíveis (escolha EXATAMENTE UM):
- minimo_garantido: garantia mínima quando comissão é insuficiente (ex: "GARANTIA DE MINIMO", "MIN. GARANTIDO").
- salario_substituicao: salário em substituição/afastamento que substitui o salário-base (ex: "SALARIO SUBSTITUICAO", "SAL. AFASTAMENTO INSS").
- comissoes_produtos: comissões sobre venda de produtos físicos/mercadorias.
- dsr_comissoes: DSR (Descanso Semanal Remunerado) calculado sobre comissões.
- comissoes_servicos: comissões sobre serviços, garantias estendidas, seguros, financiamento, montagem.
- premios: prêmios, bonificações, gratificações de performance, campanhas, metas.
- desconsiderar: rubricas que NÃO entram em base de cálculo (ex: descontos, vale-transporte, vale-refeição, INSS, IRRF, plano de saúde, faltas, atrasos).

Regras:
- Responda SOMENTE com JSON válido: {"bucket":"<um dos 7>","justificativa":"<até 140 chars>","confianca":"alta"|"media"|"baixa"}.
- Se não tiver certeza absoluta, use "media" ou "baixa" — operador revisa.
- "desconsiderar" é o padrão para QUALQUER desconto, contribuição ou benefício pago in natura.
- Nunca invente buckets fora dos 7 listados.`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isBucket(s: unknown): s is Bucket {
  return typeof s === "string" && (BUCKETS as readonly string[]).includes(s);
}

function isConfianca(s: unknown): s is SugestaoBucket["confianca"] {
  return s === "alta" || s === "media" || s === "baixa";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OPENAI_API_KEY não configurada no projeto." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return jsonResponse({ error: "Invalid authorization token" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "JSON body required" }, 400);
    }
    const rubrica = typeof body.rubrica === "string" ? body.rubrica.trim() : "";
    const layout =
      typeof body.layout === "string" ? body.layout : "generico";
    if (!rubrica) {
      return jsonResponse(
        { error: "Campo 'rubrica' é obrigatório (string não-vazia)." },
        400,
      );
    }
    if (rubrica.length > 200) {
      return jsonResponse(
        { error: "Campo 'rubrica' excede 200 caracteres." },
        400,
      );
    }

    const userPrompt = `Classifique a rubrica abaixo (layout=${layout}):

"${rubrica}"

Responda apenas com o JSON.`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      },
    );

    if (!openaiResponse.ok) {
      const txt = await openaiResponse.text();
      return jsonResponse(
        { error: "Falha no gateway OpenAI", detail: txt.slice(0, 500) },
        502,
      );
    }

    const data = await openaiResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return jsonResponse(
        { error: "Resposta do OpenAI sem conteúdo textual." },
        502,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonResponse(
        { error: "Resposta do OpenAI não é JSON válido.", content },
        502,
      );
    }

    if (!parsed || typeof parsed !== "object") {
      return jsonResponse({ error: "JSON inválido (não é objeto)." }, 502);
    }
    const obj = parsed as Record<string, unknown>;
    if (!isBucket(obj.bucket)) {
      return jsonResponse(
        {
          error: `Bucket fora da lista válida: ${String(obj.bucket)}`,
          buckets_validos: BUCKETS,
        },
        502,
      );
    }
    if (!isConfianca(obj.confianca)) {
      return jsonResponse(
        { error: `Confianca inválida: ${String(obj.confianca)}` },
        502,
      );
    }
    const justificativa =
      typeof obj.justificativa === "string"
        ? obj.justificativa.slice(0, 200)
        : "";

    const sugestao: SugestaoBucket = {
      bucket: obj.bucket,
      justificativa,
      confianca: obj.confianca,
    };

    return jsonResponse({
      sugestao,
      usage: data.usage ?? null,
    });
  } catch (err) {
    console.error("sugerir-bucket-rubrica error:", err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : "Erro desconhecido",
      },
      500,
    );
  }
});
