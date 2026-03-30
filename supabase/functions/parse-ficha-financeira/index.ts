import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto_documento, tipo_documento, ano_referencia } = await req.json();

    if (!texto_documento) {
      return new Response(JSON.stringify({ error: "Texto do documento é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const tipoLabel = tipo_documento === "contracheque" ? "Demonstrativo de Pagamento (Contracheque)" : "Ficha Financeira";

    const systemPrompt = `Você é um perito contábil trabalhista especializado em análise de ${tipoLabel}.

OBJETIVO: Extrair TODAS as rubricas de pagamento com seus valores mensais.

REGRAS DE EXTRAÇÃO — ${tipoLabel}:
${tipo_documento === "contracheque" ? `
- Extraia APENAS valores da coluna "VENCIMENTOS" (créditos ao empregado)
- IGNORE a coluna "DESCONTOS"  
- O mês de referência está no cabeçalho (ex: "REFERÊNCIA: JAN/2018" ou "Competência: 01/2018")
- Se houver múltiplos contracheques, extraia cada um com sua competência
` : `
- REGRA FUNDAMENTAL: Extraia APENAS linhas com classificação "PGTO" (pagamento)
- IGNORE linhas com classificação "DESC" (desconto), "BASE", "INFO" ou qualquer outra
- A classificação geralmente está na 3ª coluna, marcada como "Clas." ou "Cl."
- Cada coluna numérica após a classificação representa um mês (Jan, Fev, Mar, etc.)
- Valores em branco ou zero significam que não houve pagamento naquele mês — OMITA-OS
- Se o documento tiver formato de tabela com meses nas colunas, mapeie cada coluna para YYYY-MM
`}

IDENTIFICAÇÃO DE RUBRICAS — Categorize cada rubrica:
| Padrão no nome/código | Categoria |
|---|---|
| Comissão, Comissões, COMISSOES, cod 0620 | comissao |
| DSR, Repouso, Rep.Sem.Rem., cod 0501/0502 | dsr |
| Prêmio, Premio, Gratificação, Estímulo, cod 2377/2477/2481/3290 | premio |
| Adicional Noturno, Ad.Not., cod 1800 | adicional_noturno |
| Hora Extra, H.Extra, HE, cod 4001 | hora_extra |
| Salário, Sal.Base, Piso, Mínimo Garantido | salario_base |
| Qualquer outro vencimento PGTO | outros |

FORMATO MONETÁRIO:
- Documentos brasileiros usam: 1.234,56 (ponto = milhar, vírgula = decimal)
- Converta para número decimal: 1234.56
- Nunca inclua R$, pontos de milhar no output numérico

FORMATO DE COMPETÊNCIA: sempre YYYY-MM (ex: 2018-01, 2019-12)

EXTRAIA TUDO: Não omita rubricas. Se existem 10 rubricas PGTO, retorne as 10.
Se uma rubrica tem valores em 12 meses, retorne os 12 valores.

O ano de referência provável é ${ano_referencia || "indicado no documento"}.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise o seguinte documento e extraia TODAS as rubricas de pagamento com seus valores mensais.\n\nDOCUMENTO:\n${texto_documento.slice(0, 50000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extrair_dados_financeiros",
            description: "Extrai dados estruturados de ficha financeira ou contracheque trabalhista",
            parameters: {
              type: "object",
              properties: {
                ano: { type: "number", description: "Ano principal de referência" },
                empregado: { type: "string", description: "Nome do empregado" },
                empresa: { type: "string", description: "Nome da empresa/empregador" },
                rubricas: {
                  type: "array",
                  description: "Lista de rubricas de pagamento extraídas",
                  items: {
                    type: "object",
                    properties: {
                      codigo: { type: "string", description: "Código da rubrica (ex: 0620)" },
                      denominacao: { type: "string", description: "Nome da rubrica (ex: Comissões)" },
                      classificacao: { type: "string", description: "Classificação: PGTO, DESC, etc." },
                      categoria: { 
                        type: "string", 
                        enum: ["comissao", "dsr", "premio", "adicional_noturno", "hora_extra", "salario_base", "outros"],
                        description: "Categoria funcional da rubrica" 
                      },
                      valores_mensais: {
                        type: "array",
                        description: "Valores por competência (apenas meses com valor > 0)",
                        items: {
                          type: "object",
                          properties: {
                            competencia: { type: "string", description: "YYYY-MM" },
                            valor: { type: "number", description: "Valor numérico decimal" }
                          },
                          required: ["competencia", "valor"]
                        }
                      }
                    },
                    required: ["codigo", "denominacao", "categoria", "valores_mensais"]
                  }
                },
                resumo_mensal: {
                  type: "array",
                  description: "Total de vencimentos por mês",
                  items: {
                    type: "object",
                    properties: {
                      competencia: { type: "string" },
                      total_vencimentos: { type: "number" }
                    },
                    required: ["competencia", "total_vencimentos"]
                  }
                }
              },
              required: ["ano", "rubricas"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extrair_dados_financeiros" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Falha na análise do documento");
    }

    const aiResult = await response.json();
    
    // Handle both tool_calls and content-based responses
    let extracted: any;
    
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      extracted = JSON.parse(toolCall.function.arguments);
    } else {
      // Try to parse from content (some models return JSON in content)
      const content = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("IA não retornou dados estruturados. Tente novamente.");
      }
    }

    // Post-process: validate and clean data
    if (extracted.rubricas) {
      extracted.rubricas = extracted.rubricas
        .filter((r: any) => r.valores_mensais && r.valores_mensais.length > 0)
        .map((r: any) => ({
          ...r,
          valores_mensais: r.valores_mensais
            .filter((v: any) => v.valor != null && v.valor > 0)
            .map((v: any) => ({
              competencia: v.competencia,
              valor: typeof v.valor === 'string' ? parseFloat(v.valor.replace(/[^\d.,-]/g, '').replace(',', '.')) : v.valor,
            }))
            .filter((v: any) => !isNaN(v.valor) && v.valor > 0),
        }))
        .filter((r: any) => r.valores_mensais.length > 0);
    }

    console.log(`Extracted ${extracted.rubricas?.length || 0} rubricas from ${tipoLabel}`);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("parse-ficha-financeira error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
