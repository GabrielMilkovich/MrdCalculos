// =====================================================
// AGENTE 3: REVISOR CRÍTICO
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool schema para revisão crítica
const reviewCalculationTool = {
  type: "function",
  function: {
    name: "review_calculation",
    description: "Analisa criticamente os fatos e calculadoras selecionadas, apontando inconsistências e riscos",
    parameters: {
      type: "object",
      properties: {
        inconsistencias: {
          type: "array",
          description: "Inconsistências encontradas nos fatos ou cálculos",
          items: {
            type: "object",
            properties: {
              tipo: {
                type: "string",
                enum: ["data", "valor", "jornada", "logica"],
                description: "Tipo da inconsistência"
              },
              descricao: {
                type: "string",
                description: "Descrição detalhada da inconsistência"
              },
              fatos_envolvidos: {
                type: "array",
                items: { type: "string" },
                description: "Chaves dos fatos envolvidos"
              },
              sugestao_correcao: {
                type: "string",
                description: "Como corrigir esta inconsistência"
              },
              gravidade: {
                type: "string",
                enum: ["alta", "media", "baixa"],
                description: "Gravidade da inconsistência"
              }
            },
            required: ["tipo", "descricao", "gravidade"],
            additionalProperties: false
          }
        },
        riscos_juridicos: {
          type: "array",
          description: "Riscos jurídicos identificados que podem afetar o resultado",
          items: {
            type: "object",
            properties: {
              tese: {
                type: "string",
                description: "Tese que pode ser contestada"
              },
              risco: {
                type: "string",
                description: "Descrição do risco"
              },
              probabilidade: {
                type: "string",
                enum: ["alta", "media", "baixa"],
                description: "Probabilidade de ocorrer"
              },
              impacto_financeiro: {
                type: "string",
                enum: ["alto", "medio", "baixo"],
                description: "Impacto financeiro se ocorrer"
              },
              defesa_sugerida: {
                type: "string",
                description: "Como defender ou mitigar este risco"
              }
            },
            required: ["tese", "risco", "probabilidade", "impacto_financeiro"],
            additionalProperties: false
          }
        },
        documentos_faltantes: {
          type: "array",
          description: "Documentos que deveriam existir para fortalecer o caso",
          items: {
            type: "object",
            properties: {
              documento: {
                type: "string",
                description: "Nome do documento"
              },
              finalidade: {
                type: "string",
                description: "Para que serve este documento"
              },
              impacto_ausencia: {
                type: "string",
                description: "O que acontece se não tiver este documento"
              },
              alternativas: {
                type: "array",
                items: { type: "string" },
                description: "Documentos alternativos que podem suprir"
              }
            },
            required: ["documento", "finalidade", "impacto_ausencia"],
            additionalProperties: false
          }
        },
        validacao_calculos: {
          type: "array",
          description: "Verificações sobre os cálculos selecionados",
          items: {
            type: "object",
            properties: {
              calculadora: {
                type: "string",
                description: "Nome da calculadora"
              },
              status: {
                type: "string",
                enum: ["ok", "atencao", "erro"],
                description: "Status da validação"
              },
              observacao: {
                type: "string",
                description: "Observação sobre o cálculo"
              }
            },
            required: ["calculadora", "status", "observacao"],
            additionalProperties: false
          }
        },
        score_confianca: {
          type: "number",
          description: "Score geral de confiança do caso (0-100)"
        },
        resumo_critico: {
          type: "string",
          description: "Resumo crítico geral do caso em 2-3 frases"
        }
      },
      required: ["inconsistencias", "riscos_juridicos", "documentos_faltantes", "score_confianca", "resumo_critico"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facts, calculators_selected, calculation_result } = await req.json();
    
    if (!facts || !Array.isArray(facts)) {
      return new Response(
        JSON.stringify({ error: "facts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Format facts for the AI
    const factsText = facts.map((f: any) => 
      `- ${f.chave}: ${f.valor} (${f.tipo}, confiança: ${f.confianca})`
    ).join("\n");

    // Format calculators selected
    const calculatorsText = calculators_selected?.length > 0
      ? `\nCalculadoras selecionadas:\n${calculators_selected.map((c: string) => `- ${c}`).join("\n")}`
      : "";

    // Format calculation result if available
    const resultText = calculation_result
      ? `\nResultado do cálculo:\n- Bruto: R$ ${calculation_result.resultado_bruto?.total?.toFixed(2) || '0.00'}\n- Líquido: R$ ${calculation_result.resultado_liquido?.total?.toFixed(2) || '0.00'}`
      : "";

    const systemPrompt = `Você é um revisor crítico de cálculos trabalhistas com experiência em contencioso.

Sua função é analisar os fatos e calculadoras selecionadas e apontar:
1. Inconsistências (ex.: jornada contratual e alegada divergem sem explicação)
2. Riscos jurídicos (ex.: cargo de confiança pode afastar HE, acordo de compensação)
3. Documentos faltantes (ex.: cartão ponto, acordo coletivo)
4. Validação dos cálculos aplicados

Seja crítico e rigoroso. É melhor alertar sobre um risco que não se concretize do que deixar passar um problema.

Considere:
- Prescrição quinquenal trabalhista
- Súmulas do TST relevantes
- Jurisprudência dominante
- Inversão do ônus da prova em alguns casos`;

    console.log("Calling OpenAI for critical review...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Revise criticamente o seguinte caso:\n\nFatos:\n${factsText}${calculatorsText}${resultText}` },
        ],
        tools: [reviewCalculationTool],
        tool_choice: { type: "function", function: { name: "review_calculation" } },
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract review from tool call response
    let review = {
      inconsistencias: [],
      riscos_juridicos: [],
      documentos_faltantes: [],
      validacao_calculos: [],
      score_confianca: 0,
      resumo_critico: ""
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        review = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        review,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("review-calculation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
