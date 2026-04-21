// =====================================================
// PRÉ-CÁLCULO: REVISÃO DOCUMENTAL COMPLETA COM IA
// Lê TODOS os chunks + fatos e cruza informações antes de calcular
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedUser, requireCaseOwnership, authErrorResponse } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const reviewTool = {
  type: "function",
  function: {
    name: "document_review_result",
    description: "Resultado da revisão documental pré-cálculo",
    parameters: {
      type: "object",
      properties: {
        aprovado: {
          type: "boolean",
          description: "Se os dados estão suficientemente confiáveis para prosseguir com o cálculo"
        },
        score_confianca: {
          type: "number",
          description: "Score de confiança geral dos dados (0-100)"
        },
        divergencias: {
          type: "array",
          description: "Divergências encontradas entre documentos e fatos cadastrados",
          items: {
            type: "object",
            properties: {
              campo: { type: "string", description: "Campo afetado (ex: data_admissao, salario_base)" },
              valor_fato: { type: "string", description: "Valor registrado no sistema (fatos)" },
              valor_documento: { type: "string", description: "Valor encontrado nos documentos" },
              documento_fonte: { type: "string", description: "Qual documento contém essa informação" },
              severidade: { type: "string", enum: ["critica", "alta", "media", "baixa"] },
              recomendacao: { type: "string", description: "Como resolver a divergência, sempre a favor do reclamante" },
              impacto_financeiro: { type: "string", description: "Impacto estimado no cálculo" }
            },
            required: ["campo", "severidade", "recomendacao"],
            additionalProperties: false
          }
        },
        dados_extraidos_nao_cadastrados: {
          type: "array",
          description: "Dados importantes encontrados nos documentos mas NÃO cadastrados como fatos",
          items: {
            type: "object",
            properties: {
              campo: { type: "string", description: "Nome do campo que deveria existir" },
              valor_sugerido: { type: "string", description: "Valor encontrado nos documentos" },
              documento_fonte: { type: "string", description: "Documento de origem" },
              importancia: { type: "string", enum: ["critica", "alta", "media"] },
              justificativa: { type: "string", description: "Por que esse dado é importante para o cálculo" }
            },
            required: ["campo", "valor_sugerido", "importancia", "justificativa"],
            additionalProperties: false
          }
        },
        correcoes_sugeridas: {
          type: "array",
          description: "Correções que devem ser aplicadas nos fatos antes de calcular",
          items: {
            type: "object",
            properties: {
              campo: { type: "string" },
              valor_atual: { type: "string" },
              valor_correto: { type: "string" },
              fonte: { type: "string", description: "Base documental para a correção" },
              motivo: { type: "string" }
            },
            required: ["campo", "valor_correto", "fonte", "motivo"],
            additionalProperties: false
          }
        },
        alertas_calculo: {
          type: "array",
          description: "Alertas específicos que impactam o cálculo",
          items: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["prescricao", "verba_faltante", "base_incorreta", "periodo_incorreto", "tipo_demissao", "jornada", "adicional", "fgts", "ferias", "decimo_terceiro", "outro"] },
              descricao: { type: "string" },
              impacto: { type: "string", description: "O que muda no cálculo" },
              acao_necessaria: { type: "string", description: "O que o advogado precisa fazer" }
            },
            required: ["tipo", "descricao", "impacto"],
            additionalProperties: false
          }
        },
        resumo_documental: {
          type: "string",
          description: "Resumo de 3-5 linhas sobre a qualidade dos dados documentais e confiabilidade para cálculo"
        },
        verbas_identificadas: {
          type: "array",
          description: "Verbas que podem ser calculadas com base nos documentos",
          items: {
            type: "object",
            properties: {
              verba: { type: "string" },
              base_documental: { type: "string", description: "Qual documento sustenta essa verba" },
              confianca: { type: "string", enum: ["alta", "media", "baixa"] }
            },
            required: ["verba", "base_documental", "confianca"],
            additionalProperties: false
          }
        }
      },
      required: ["aprovado", "score_confianca", "divergencias", "dados_extraidos_nao_cadastrados", "correcoes_sugeridas", "alertas_calculo", "resumo_documental"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id } = await req.json();
    if (!case_id) {
      return new Response(JSON.stringify({ error: "case_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth + ownership (responde dados sensíveis do caso — exige JWT válido)
    const auth = await requireAuthedUser(req, supabase);
    await requireCaseOwnership(supabase, auth.user.id, case_id);

    // Rate limit: 15 reviews/hora (LLM call + chunks completos)
    await checkRateLimit(supabase, {
      userId: auth.user.id,
      bucket: "pre-calc-review",
      maxRequests: 15,
      windowSeconds: 3600,
    });

    // 1. Fetch ALL document chunks (raw OCR text)
    const { data: chunks, error: chunksErr } = await supabase
      .from("document_chunks")
      .select("id, document_id, content, page_number, doc_type, chunk_index")
      .eq("case_id", case_id)
      .order("document_id")
      .order("chunk_index")
      .limit(200);

    if (chunksErr) throw chunksErr;

    // 2. Fetch ALL facts
    const { data: facts, error: factsErr } = await supabase
      .from("facts")
      .select("id, chave, valor, tipo, origem, confianca, confirmado, citacao")
      .eq("case_id", case_id);

    if (factsErr) throw factsErr;

    // 3. Fetch document metadata
    const { data: documents, error: docsErr } = await supabase
      .from("documents")
      .select("id, file_name, tipo, status, ocr_confidence")
      .eq("case_id", case_id);

    if (docsErr) throw docsErr;

    // 4. Fetch employment contract if exists
    const { data: contracts } = await supabase
      .from("employment_contracts")
      .select("*")
      .eq("case_id", case_id);

    // 5. Build document map for reference
    const docMap = new Map((documents || []).map((d: any) => [d.id, d]));

    // 6. Organize chunks by document
    const chunksByDoc: Record<string, string[]> = {};
    for (const chunk of (chunks || [])) {
      const doc = docMap.get(chunk.document_id);
      const docName = doc?.file_name || chunk.document_id;
      if (!chunksByDoc[docName]) chunksByDoc[docName] = [];
      chunksByDoc[docName].push(chunk.content);
    }

    // 7. Build comprehensive text for AI
    let documentText = "=== CONTEÚDO COMPLETO DOS DOCUMENTOS ===\n\n";
    for (const [docName, contents] of Object.entries(chunksByDoc)) {
      const doc = documents?.find((d: any) => d.file_name === docName);
      documentText += `--- DOCUMENTO: ${docName} (Tipo: ${doc?.tipo || 'desconhecido'}, OCR Confiança: ${doc?.ocr_confidence || 'N/A'}) ---\n`;
      documentText += contents.join("\n");
      documentText += "\n\n";
    }

    let factsText = "=== FATOS CADASTRADOS NO SISTEMA ===\n\n";
    for (const fact of (facts || [])) {
      factsText += `- ${fact.chave}: "${fact.valor}" (tipo: ${fact.tipo}, origem: ${fact.origem}, confiança: ${fact.confianca ?? 'N/A'}, confirmado: ${fact.confirmado})\n`;
    }

    let contractText = "";
    if (contracts && contracts.length > 0) {
      const c = contracts[0];
      contractText = `\n=== CONTRATO DE TRABALHO CADASTRADO ===\n`;
      contractText += `Admissão: ${c.data_admissao}\n`;
      contractText += `Demissão: ${c.data_demissao || 'N/A'}\n`;
      contractText += `Tipo demissão: ${c.tipo_demissao || 'N/A'}\n`;
      contractText += `Salário inicial: ${c.salario_inicial || 'N/A'}\n`;
      contractText += `Função: ${c.funcao || 'N/A'}\n`;
      contractText += `Jornada: ${JSON.stringify(c.jornada_contratual)}\n`;
      contractText += `Histórico salarial: ${JSON.stringify(c.historico_salarial)}\n`;
    }

    const systemPrompt = `Você é um AUDITOR TRABALHISTA SÊNIOR especializado em liquidação de sentenças.
Sua missão é REVISAR MINUCIOSAMENTE todos os documentos e compará-los com os fatos cadastrados no sistema.

REGRA FUNDAMENTAL: Você atua EXCLUSIVAMENTE a favor do RECLAMANTE (trabalhador). 
Toda interpretação ambígua deve favorecer o trabalhador (in dubio pro operario).

INSTRUÇÕES DE REVISÃO:

1. COMPARE cada fato cadastrado com o texto bruto dos documentos
   - Verifique datas (admissão, demissão, férias, etc.) cruzando CTPS, FGTS, holerites, TRCT
   - Verifique valores (salários, adicionais, FGTS) em múltiplas fontes
   - Se houver divergência entre fontes, escolha a que MAIS BENEFICIA o reclamante
   
2. IDENTIFIQUE dados nos documentos que NÃO foram cadastrados como fatos
   - Adicionais (periculosidade, insalubridade, noturno)
   - Horas extras habituais evidenciadas em holerites
   - Verbas pagas a menor ou não pagas
   - Depósitos de FGTS irregulares
   - Férias não gozadas ou pagas incorretamente
   - 13º salário pago a menor
   
3. VERIFIQUE a consistência temporal
   - Período de férias vs registro na CTPS
   - Evolução salarial vs holerites
   - Depósitos FGTS vs salário declarado
   
4. CALCULE se as verbas rescisórias pagas estão corretas
   - Compare TRCT com o que seria devido
   - Identifique diferenças a favor do reclamante
   
5. IDENTIFIQUE PRESCRIÇÃO
   - Com base na data de ajuizamento (se disponível)
   - Alerte sobre verbas que podem estar prescritas

6. AVALIE TIPO DE DEMISSÃO
   - Cruze código FGTS, TRCT e motivo alegado
   - Se for justa causa, avalie se há base para reversão

IMPORTANTE: Seja EXTREMAMENTE RIGOROSO. Cada centavo conta. 
Prefira errar para mais (a favor do reclamante) do que para menos.
NÃO INVENTE dados. Se algo não está nos documentos, diga que não encontrou.`;

    console.log(`Pre-calc review for case ${case_id}: ${(chunks || []).length} chunks, ${(facts || []).length} facts, ${(documents || []).length} docs`);

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
          { role: "user", content: `Revise TODOS os dados abaixo e compare documentos com fatos cadastrados:\n\n${documentText}\n\n${factsText}\n${contractText}` },
        ],
        tools: [reviewTool],
        tool_choice: { type: "function", function: { name: "document_review_result" } },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    let review = {
      aprovado: false,
      score_confianca: 0,
      divergencias: [],
      dados_extraidos_nao_cadastrados: [],
      correcoes_sugeridas: [],
      alertas_calculo: [],
      resumo_documental: "Revisão não completada",
      verbas_identificadas: [],
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        review = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse review:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      review,
      metadata: {
        chunks_analisados: (chunks || []).length,
        fatos_verificados: (facts || []).length,
        documentos_analisados: (documents || []).length,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const authResp = authErrorResponse(error, corsHeaders);
    if (authResp) return authResp;
    console.error("pre-calc-review error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
