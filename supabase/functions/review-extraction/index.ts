// =====================================================
// EDGE FUNCTION: AGENTE REVISOR
// Valida consistência dos fatos extraídos
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interfaces
interface FactSource {
  chunk_id: string;
  document_id: string;
  page_number: number;
  quote: string;
}

interface ExtractedFact {
  key: string;
  label: string;
  value: string | number | boolean;
  value_type: string;
  confidence: number;
  conflict: boolean;
  sources: FactSource[];
  notes?: string;
}

interface ReviewIssue {
  fact_key: string;
  issue_type: "insufficient_citation" | "citation_mismatch" | "inferred_value" | "conflict_unresolved" | "missing_source" | "suspicious_confidence";
  severity: "error" | "warning" | "info";
  description: string;
  suggestion?: string;
}

interface ReviewResult {
  valid: boolean;
  total_facts: number;
  issues: ReviewIssue[];
  approved_facts: string[];
  rejected_facts: string[];
  warnings: string[];
}

const SYSTEM_PROMPT = `Você é um revisor crítico para o sistema JurisCalculo (direito do trabalho).

Você recebe:
1. chunks: os trechos originais dos documentos
2. extracted_facts: o JSON com os fatos extraídos pelo Agente Extrator

SUA TAREFA: Validar rigorosamente cada fato extraído.

REGRAS DE VALIDAÇÃO:

1. CITAÇÃO SUFICIENTE
   - Cada fato DEVE ter pelo menos uma fonte (sources) com quote não vazio
   - O quote deve ter contexto suficiente (mínimo ~10 palavras relevantes)
   - Se não tiver citação válida → issue_type: "missing_source"

2. CITAÇÃO SUPORTA O VALOR
   - O valor extraído DEVE estar literalmente presente ou claramente derivável da citação
   - Compare o "value" com o "quote" de cada source
   - Se o valor não aparecer na citação → issue_type: "citation_mismatch"

3. FATOS INFERIDOS (PROIBIDO)
   - O valor NÃO pode ser uma inferência ou dedução
   - Exemplo proibido: "salário de R$ 2.000" quando o texto diz "remuneração mensal aproximada"
   - Se parecer inferido → issue_type: "inferred_value", severity: "error"

4. CONFLITOS
   - Se conflict=true, verifique se ambas as fontes estão listadas
   - Se há conflito não declarado entre sources → issue_type: "conflict_unresolved"

5. CONFIANÇA SUSPEITA
   - confidence > 0.9 mas quote é vago → issue_type: "suspicious_confidence"
   - confidence < 0.5 deve ter nota explicativa

FORMATO DE SAÍDA (JSON estrito):
{
  "valid": boolean,
  "total_facts": number,
  "issues": [
    {
      "fact_key": "chave_do_fato",
      "issue_type": "tipo_do_problema",
      "severity": "error|warning|info",
      "description": "descrição clara do problema",
      "suggestion": "como corrigir (opcional)"
    }
  ],
  "approved_facts": ["fact_key1", "fact_key2"],
  "rejected_facts": ["fact_key3"],
  "warnings": ["observação geral opcional"]
}

IMPORTANTE:
- NÃO crie fatos novos
- NÃO modifique valores
- Apenas avalie e reporte problemas
- Um fato com issue severity="error" deve ir para rejected_facts
- Um fato sem issues ou apenas warnings vai para approved_facts`;

async function reviewExtraction(
  chunks: Array<{
    chunk_id: string;
    document_id: string;
    page_number: number;
    content: string;
    doc_type: string;
  }>,
  extractedFacts: ExtractedFact[],
  apiKey: string
): Promise<ReviewResult> {
  
  const userPrompt = `DADOS PARA REVISÃO:

## CHUNKS ORIGINAIS (${chunks.length} trechos):
${JSON.stringify(chunks.map(c => ({
    chunk_id: c.chunk_id,
    page: c.page_number,
    doc_type: c.doc_type,
    content: c.content
  })), null, 2)}

## FATOS EXTRAÍDOS (${extractedFacts.length} fatos):
${JSON.stringify(extractedFacts, null, 2)}

INSTRUÇÕES:
1. Para CADA fato, verifique se a citação (quote) realmente contém o valor (value).
2. Identifique qualquer valor que pareça ter sido inferido em vez de extraído literalmente.
3. Verifique se há conflitos não declarados.
4. Classifique cada fato como aprovado ou rejeitado.

Responda APENAS com o JSON no formato especificado.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 8000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Review API error:", errorText);
    throw new Error(`Review API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    const result = JSON.parse(content);
    
    return {
      valid: result.valid ?? (result.issues?.filter((i: any) => i.severity === "error").length === 0),
      total_facts: result.total_facts || extractedFacts.length,
      issues: (result.issues || []).map((issue: any) => ({
        fact_key: issue.fact_key || "",
        issue_type: issue.issue_type || "citation_mismatch",
        severity: issue.severity || "warning",
        description: issue.description || "",
        suggestion: issue.suggestion || undefined,
      })),
      approved_facts: result.approved_facts || [],
      rejected_facts: result.rejected_facts || [],
      warnings: result.warnings || [],
    };
  } catch (parseError) {
    console.error("Failed to parse review result:", content);
    throw new Error("Failed to parse review result as JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id, extracted_facts, chunks } = await req.json();

    // Pode receber task_id (busca os dados) OU extracted_facts + chunks diretamente
    if (!task_id && (!extracted_facts || !chunks)) {
      return new Response(
        JSON.stringify({ error: "task_id OR (extracted_facts + chunks) is required" }),
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
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let factsToReview: ExtractedFact[] = extracted_facts || [];
    let chunksToReview = chunks || [];

    // Se task_id foi fornecido, buscar os dados da tarefa
    if (task_id) {
      const { data: task, error: taskError } = await supabase
        .from("extraction_tasks")
        .select("*")
        .eq("id", task_id)
        .single();

      if (taskError || !task) {
        return new Response(
          JSON.stringify({ error: "Task not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (task.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "You don't have access to this task" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (task.status !== "done" || !task.result_json) {
        return new Response(
          JSON.stringify({ error: "Task must be completed before review" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      factsToReview = task.result_json.facts || [];

      // Buscar os chunks originais usados
      const chunkIds = factsToReview.flatMap((f: ExtractedFact) => 
        f.sources.map(s => s.chunk_id)
      );
      
      if (chunkIds.length > 0) {
        const { data: chunkData } = await supabase
          .from("document_chunks")
          .select("id, document_id, page_number, content, doc_type")
          .in("id", chunkIds);

        chunksToReview = (chunkData || []).map((c: any) => ({
          chunk_id: c.id,
          document_id: c.document_id,
          page_number: c.page_number || 1,
          content: c.content,
          doc_type: c.doc_type || "outro",
        }));
      }

      console.log(`Reviewing task ${task_id}: ${factsToReview.length} facts, ${chunksToReview.length} chunks`);
    }

    if (factsToReview.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          review: {
            valid: true,
            total_facts: 0,
            issues: [],
            approved_facts: [],
            rejected_facts: [],
            warnings: ["Nenhum fato para revisar"],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Executar revisão
    const reviewResult = await reviewExtraction(
      chunksToReview,
      factsToReview,
      OPENAI_API_KEY
    );

    console.log(`Review complete: ${reviewResult.approved_facts.length} approved, ${reviewResult.rejected_facts.length} rejected, ${reviewResult.issues.length} issues`);

    // Se veio de uma task, atualizar o result_json com a revisão
    if (task_id) {
      const { data: task } = await supabase
        .from("extraction_tasks")
        .select("result_json")
        .eq("id", task_id)
        .single();

      if (task) {
        await supabase
          .from("extraction_tasks")
          .update({
            result_json: {
              ...task.result_json,
              review: reviewResult,
              reviewed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", task_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task_id || null,
        review: reviewResult,
        message: reviewResult.valid 
          ? "Todos os fatos passaram na revisão" 
          : `${reviewResult.issues.filter(i => i.severity === "error").length} problemas críticos encontrados`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("review-extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
