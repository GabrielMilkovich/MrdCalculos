import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto, context } = await req.json();
    if (!texto || typeof texto !== 'string') {
      return new Response(JSON.stringify({ error: "Campo 'texto' é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um extrator especializado de regras de jornada trabalhista brasileira.
Dado um trecho de sentença ou decisão judicial, extraia APENAS regras objetivas de ajuste de jornada em minutos.

Regras possíveis:
- add_before_minutes: minutos adicionais ANTES da entrada registrada
- add_after_minutes: minutos adicionais APÓS a saída registrada
- fixed_break_minutes: intervalo intrajornada fixado em X minutos (quando juiz define um valor fixo)
- reduce_break_minutes: redução do intervalo em X minutos (quando juiz diz que Y minutos foram suprimidos)

Se algo for ambíguo, retorne null naquele campo e adicione warning.
NÃO invente regras. Extraia apenas o que está explícito no texto.`;

    const userPrompt = `Analise o seguinte trecho de sentença trabalhista e extraia as regras de ajuste de jornada:

---
${texto}
---
${context ? `\nContexto adicional: ${JSON.stringify(context)}` : ''}

Retorne as regras detectadas.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_worktime_rules",
            description: "Extrair regras de ajuste de jornada de texto de sentença trabalhista",
            parameters: {
              type: "object",
              properties: {
                confidence: { type: "number", description: "Confiança geral da extração (0 a 1)" },
                rules: {
                  type: "object",
                  properties: {
                    add_before_minutes: { type: ["number", "null"], description: "Minutos a adicionar antes da entrada" },
                    add_after_minutes: { type: ["number", "null"], description: "Minutos a adicionar após a saída" },
                    fixed_break_minutes: { type: ["number", "null"], description: "Intervalo fixado em minutos" },
                    reduce_break_minutes: { type: ["number", "null"], description: "Redução do intervalo em minutos" },
                  },
                  required: ["add_before_minutes", "add_after_minutes", "fixed_break_minutes", "reduce_break_minutes"],
                },
                detected_clauses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      text_span: { type: "string" },
                      minutes: { type: "number" },
                      confidence: { type: "number" },
                    },
                    required: ["type", "text_span", "minutes", "confidence"],
                  },
                },
                warnings: { type: "array", items: { type: "string" } },
              },
              required: ["confidence", "rules", "detected_clauses", "warnings"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_worktime_rules" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido, tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou regras estruturadas" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-sentenca error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
