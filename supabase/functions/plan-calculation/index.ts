// =====================================================
// AGENTE 2: PLANEJADOR DE CÁLCULOS
// =====================================================


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool schema para planejamento estruturado
const planCalculationTool = {
  type: "function",
  function: {
    name: "plan_calculation",
    description: "Sugere calculadoras aplicáveis, fatos faltantes e alertas com base nos fatos confirmados",
    parameters: {
      type: "object",
      properties: {
        calculadoras_sugeridas: {
          type: "array",
          description: "Lista de calculadoras recomendadas",
          items: {
            type: "object",
            properties: {
              nome: {
                type: "string",
                description: "Nome técnico da calculadora (ex: horas_extras, reflexos_13)"
              },
              descricao: {
                type: "string",
                description: "Descrição breve do que será calculado"
              },
              prioridade: {
                type: "string",
                enum: ["alta", "media", "baixa"],
                description: "Prioridade de aplicação"
              },
              justificativa: {
                type: "string",
                description: "Por que esta calculadora deve ser aplicada"
              }
            },
            required: ["nome", "descricao", "prioridade", "justificativa"],
            additionalProperties: false
          }
        },
        fatos_faltantes: {
          type: "array",
          description: "Fatos que ainda precisam ser informados",
          items: {
            type: "object",
            properties: {
              chave: {
                type: "string",
                description: "Identificador do fato faltante"
              },
              descricao: {
                type: "string",
                description: "Descrição do que precisa ser informado"
              },
              impacto: {
                type: "string",
                enum: ["bloqueante", "importante", "opcional"],
                description: "Impacto da ausência deste fato"
              },
              sugestao: {
                type: "string",
                description: "Como obter esta informação"
              }
            },
            required: ["chave", "descricao", "impacto"],
            additionalProperties: false
          }
        },
        alertas: {
          type: "array",
          description: "Alertas e riscos identificados",
          items: {
            type: "object",
            properties: {
              tipo: {
                type: "string",
                enum: ["risco", "atencao", "sugestao"],
                description: "Tipo do alerta"
              },
              mensagem: {
                type: "string",
                description: "Descrição do alerta"
              },
              acao_sugerida: {
                type: "string",
                description: "O que fazer em relação a este alerta"
              }
            },
            required: ["tipo", "mensagem"],
            additionalProperties: false
          }
        },
        cenarios: {
          type: "array",
          description: "Cenários alternativos de cálculo (A/B)",
          items: {
            type: "object",
            properties: {
              nome: {
                type: "string",
                description: "Nome do cenário (ex: Conservador, Otimista)"
              },
              descricao: {
                type: "string",
                description: "O que diferencia este cenário"
              },
              calculadoras: {
                type: "array",
                items: { type: "string" },
                description: "Calculadoras incluídas neste cenário"
              }
            },
            required: ["nome", "descricao", "calculadoras"],
            additionalProperties: false
          }
        }
      },
      required: ["calculadoras_sugeridas", "fatos_faltantes", "alertas"],
      additionalProperties: false
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facts, calculators_available } = await req.json();
    
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
      `- ${f.chave}: ${f.valor} (${f.tipo}, confiança: ${f.confianca}, ${f.confirmado ? 'confirmado' : 'pendente'})`
    ).join("\n");

    // Format available calculators
    const calculatorsText = calculators_available?.length > 0
      ? `\nCalculadoras disponíveis no sistema:\n${calculators_available.map((c: any) => `- ${c.nome}: ${c.descricao || ''}`).join("\n")}`
      : `\nCalculadoras típicas: horas_extras, reflexos_13, reflexos_ferias, fgts, inss, atualizacao_monetaria`;

    const systemPrompt = `Você é um assistente de planejamento de cálculos trabalhistas brasileiro.

Com base nos fatos confirmados do caso, você deve:
1. Sugerir quais calculadoras aplicar (horas_extras, reflexos_13, reflexos_ferias, fgts, etc.)
2. Identificar quais fatos ainda faltam para um cálculo completo
3. Apontar riscos e alertas importantes
4. Opcionalmente, sugerir cenários alternativos (conservador vs otimista)

Regras:
- Se há jornada alegada > jornada contratual, sugira horas_extras
- Se há horas extras, sugira reflexos_13, reflexos_ferias e fgts
- Se falta cartão ponto, alerte sobre dificuldade de prova
- Se há cargo de confiança, alerte que pode afastar direito a HE
- Sempre considere atualização monetária${calculatorsText}`;

    console.log("Calling OpenAI for calculation planning...");

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
          { role: "user", content: `Analise os fatos do caso e sugira o plano de cálculo:\n\n${factsText}` },
        ],
        tools: [planCalculationTool],
        tool_choice: { type: "function", function: { name: "plan_calculation" } },
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

    // Extract plan from tool call response
    let plan = {
      calculadoras_sugeridas: [],
      fatos_faltantes: [],
      alertas: [],
      cenarios: []
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        plan = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("plan-calculation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
