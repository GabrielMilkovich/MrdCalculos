// =====================================================
// AGENTE 1: EXTRATOR DE FATOS JURÍDICOS
// =====================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool schema para extração estruturada com citação obrigatória
const extractFactsTool = {
  type: "function",
  function: {
    name: "extract_facts",
    description: "Extrai fatos jurídicos de documentos trabalhistas com citação obrigatória do trecho original",
    parameters: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          description: "Lista de fatos extraídos do documento com citação obrigatória",
          items: {
            type: "object",
            properties: {
              chave: {
                type: "string",
                description: "Identificador do fato (ex: data_admissao, salario_base, jornada_contratual)"
              },
              valor: {
                type: "string",
                description: "Valor extraído como string (datas em YYYY-MM-DD, valores monetários sem R$). Use 'NAO_ENCONTRADO' se não estiver explícito no texto."
              },
              tipo: {
                type: "string",
                enum: ["data", "moeda", "numero", "texto", "booleano"],
                description: "Tipo do valor extraído"
              },
              confianca: {
                type: "number",
                description: "Confiança na extração de 0.0 a 1.0. Use 0 para valores não encontrados."
              },
              citacao_original: {
                type: "string",
                description: "OBRIGATÓRIO: Trecho EXATO do documento onde o fato foi encontrado. Copie literalmente."
              },
              pagina: {
                type: "number",
                description: "Número da página onde o fato foi encontrado, se identificável"
              }
            },
            required: ["chave", "valor", "tipo", "confianca", "citacao_original"],
            additionalProperties: false
          }
        },
        validacoes: {
          type: "object",
          description: "Validações automáticas realizadas",
          properties: {
            datas_consistentes: {
              type: "boolean",
              description: "True se data_demissao > data_admissao (quando ambas existem)"
            },
            alertas: {
              type: "array",
              items: { type: "string" },
              description: "Lista de alertas sobre inconsistências encontradas"
            }
          },
          additionalProperties: false
        }
      },
      required: ["facts"],
      additionalProperties: false
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, document_texts } = await req.json();
    
    if (!case_id || !document_texts || !Array.isArray(document_texts)) {
      return new Response(
        JSON.stringify({ error: "case_id and document_texts are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const combinedText = document_texts.join("\n\n---DOCUMENTO---\n\n");

    const systemPrompt = `### INSTRUÇÕES DE EXTRAÇÃO JURÍDICA (ANTI-ALUCINAÇÃO) ###

Você é um assistente de extração de fatos jurídicos trabalhistas com TOLERÂNCIA ZERO para alucinações.

## REGRA DE OURO ##
Se a informação NÃO estiver EXPLICITAMENTE escrita no texto, você DEVE:
- Definir valor como "NAO_ENCONTRADO"
- Definir confianca como 0
- Explicar na citacao_original: "Informação não encontrada no documento"

NUNCA invente, presuma, infira ou calcule valores que não estejam escritos literalmente.

## CITAÇÃO OBRIGATÓRIA ##
Para CADA fato extraído, você DEVE copiar o trecho EXATO do documento na "citacao_original".
Exemplo: Se o texto diz "admitido em 10 de maio de 2015", copie exatamente isso.

## VALIDAÇÕES OBRIGATÓRIAS ##
1. Data de demissão DEVE ser posterior à data de admissão
2. Salários devem ser valores positivos
3. Horas de jornada devem estar entre 0 e 24
4. Se encontrar inconsistências, liste-as em "validacoes.alertas"

## CHAVES PADRÃO ##
- data_admissao, data_demissao (formato YYYY-MM-DD)
- salario_base, salario_mensal (apenas números, ex: 3200.00)
- adicional_insalubridade, adicional_periculosidade (percentual ou valor)
- jornada_contratual, jornada_alegada (formato: "08:00-17:00" ou horas semanais)
- intervalo_intrajornada (em minutos)
- horas_extras_mensais (apenas se EXPLICITAMENTE mencionado)
- cargo, funcao (texto exato do documento)
- motivo_demissao (justa_causa, sem_justa_causa, pedido_demissao)
- aviso_previo (trabalhado, indenizado, nao_cumprido)
- ferias_vencidas (quantidade de períodos)
- fgts_depositado (sim, nao, parcial)

## NÍVEIS DE CONFIANÇA ##
- 1.0: Valor explícito e claro no texto
- 0.8-0.9: Valor explícito mas formato ambíguo
- 0.5-0.7: Valor inferido de contexto próximo (MARCAR como inferido na citação)
- 0.0: Valor não encontrado

## FORMATO DE SAÍDA ##
Retorne os fatos usando a função extract_facts com citação obrigatória para cada item.`;

    console.log("Calling OpenAI for fact extraction with tool calling...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise os seguintes documentos trabalhistas e extraia todos os fatos relevantes:\n\n${combinedText.substring(0, 50000)}` },
        ],
        tools: [extractFactsTool],
        tool_choice: { type: "function", function: { name: "extract_facts" } },
        temperature: 0.1,
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

    // Extract facts from tool call response
    let facts: Array<{
      chave: string;
      valor: string;
      tipo: string;
      confianca: number;
      citacao_original: string;
      pagina?: number;
    }> = [];
    let validacoes: { datas_consistentes?: boolean; alertas?: string[] } = {};

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        facts = parsed.facts || [];
        validacoes = parsed.validacoes || {};
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try parsing content directly
    if (facts.length === 0) {
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*"fatos"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          facts = parsed.fatos || parsed.facts || [];
        }
      } catch (parseError) {
        console.error("Failed to parse content as JSON:", parseError);
      }
    }

    // Filter out "NAO_ENCONTRADO" values before inserting
    const validFacts = facts.filter(fact => 
      fact.valor !== "NAO_ENCONTRADO" && 
      fact.confianca > 0
    );

    // Perform additional server-side validations
    const serverValidations: string[] = [...(validacoes.alertas || [])];
    
    const dataAdmissao = facts.find(f => f.chave === "data_admissao");
    const dataDemissao = facts.find(f => f.chave === "data_demissao");
    
    if (dataAdmissao && dataDemissao && 
        dataAdmissao.valor !== "NAO_ENCONTRADO" && 
        dataDemissao.valor !== "NAO_ENCONTRADO") {
      const admDate = new Date(dataAdmissao.valor);
      const demDate = new Date(dataDemissao.valor);
      if (demDate <= admDate) {
        serverValidations.push("ERRO: Data de demissão é anterior ou igual à data de admissão");
      }
    }

    console.log(`Extracted ${facts.length} facts, ${validFacts.length} valid, ${serverValidations.length} warnings`);

    // Insert valid facts into database with citation
    if (validFacts.length > 0) {
      const factsToInsert = validFacts.map((fact) => ({
        case_id,
        chave: fact.chave,
        valor: fact.valor,
        tipo: fact.tipo || "texto",
        origem: "ia_extracao",
        confianca: fact.confianca || 0.8,
        confirmado: false,
        citacao: fact.citacao_original || null,
        pagina: fact.pagina || null,
      }));

      const { error: insertError } = await supabase
        .from("facts")
        .insert(factsToInsert);

      if (insertError) {
        console.error("Error inserting facts:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        facts_extracted: facts.length,
        facts_valid: validFacts.length,
        facts_ignored: facts.length - validFacts.length,
        facts: validFacts,
        all_facts: facts, // Include all facts for transparency
        validacoes: {
          ...validacoes,
          alertas_servidor: serverValidations
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-facts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
