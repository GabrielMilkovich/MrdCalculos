// =====================================================
// EDGE FUNCTION: EXECUTAR TAREFA DE EXTRAÇÃO
// Agente Extrator anti-alucinação com citação obrigatória
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interfaces do novo formato estruturado
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
  value_type: "text" | "money" | "date" | "time" | "hours" | "percent" | "boolean";
  confidence: number;
  conflict: boolean;
  sources: FactSource[];
  notes?: string;
}

interface NotFoundItem {
  expected_key: string;
  why: string;
}

interface ExtractionResult {
  task_type: string;
  facts: ExtractedFact[];
  not_found: NotFoundItem[];
  warnings: string[];
}

// Função para gerar embedding
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
}

// Sistema de prompt anti-alucinação
const SYSTEM_PROMPT = `Você é um extrator de fatos para o sistema JurisCalculo (direito do trabalho). Você recebe APENAS trechos (chunks) selecionados via busca semântica.

REGRAS OBRIGATÓRIAS:

1. Você NÃO pode inventar nenhuma informação.
2. Se um dado não estiver literalmente presente em algum trecho fornecido, marque como not_found.
3. Cada fato extraído DEVE conter citação: chunk_id, document_id, page_number e quote (trecho literal copiado do chunk).
4. Se houver conflito entre trechos, retorne ambos e marque conflict=true.
5. Retorne apenas JSON válido, sem texto fora do JSON.

FORMATO DE SAÍDA OBRIGATÓRIO:
{
  "task_type": "string do tema",
  "facts": [
    {
      "key": "string_curta_padrao_snake_case",
      "label": "descrição humana curta",
      "value": "string|number|date",
      "value_type": "text|money|date|time|hours|percent|boolean",
      "confidence": 0.0,
      "conflict": false,
      "sources": [
        {
          "chunk_id": "uuid",
          "document_id": "uuid",
          "page_number": 1,
          "quote": "trecho literal que comprova o valor"
        }
      ],
      "notes": "curto, opcional"
    }
  ],
  "not_found": [
    {
      "expected_key": "o_que_era_para_achar",
      "why": "não aparece nos trechos fornecidos"
    }
  ],
  "warnings": ["texto curto opcional"]
}

TIPOS DE VALOR:
- text: strings normais
- money: valores monetários (apenas números, sem R$, formato 1234.56)
- date: datas no formato YYYY-MM-DD
- time: horários no formato HH:MM
- hours: quantidade de horas (número decimal)
- percent: percentuais (número decimal, ex: 30 para 30%)
- boolean: true/false`;

// Chaves esperadas por tipo de tarefa
function getExpectedKeys(taskType: string): string {
  const keysByType: Record<string, string> = {
    vinculo_datas: `
CHAVES ESPERADAS:
- data_admissao: data de início do contrato (YYYY-MM-DD)
- data_demissao: data de término se houver (YYYY-MM-DD)
- cargo: função/cargo exercido
- empregador: razão social da empresa
- cnpj_empregador: CNPJ da empresa
- tipo_contrato: CLT, temporário, experiência, etc.
- motivo_rescisao: dispensa sem justa causa, pedido de demissão, etc.`,
    
    remuneracao: `
CHAVES ESPERADAS:
- salario_base: último salário base mensal
- salario_inicial: primeiro salário
- ultimo_salario: última remuneração total
- adicional_periculosidade: percentual (30%)
- adicional_insalubridade: percentual ou grau
- adicional_noturno: percentual
- comissoes_media: média mensal de comissões
- gratificacoes: valores de gratificações
- horas_extras_habituais: se recebia HE com habitualidade`,
    
    jornada: `
CHAVES ESPERADAS:
- horario_entrada: hora de entrada (HH:MM)
- horario_saida: hora de saída (HH:MM)
- intervalo_refeicao: duração do intervalo em minutos
- dias_semana: dias trabalhados por semana (1-7)
- horas_extras_media_diaria: média de HE por dia
- trabalho_noturno: se havia trabalho noturno
- escala_trabalho: 5x2, 6x1, 12x36, etc.
- banco_horas: se havia banco de horas`,
    
    fgts: `
CHAVES ESPERADAS:
- saldo_fgts: saldo total da conta FGTS
- depositos_regulares: se os depósitos eram regulares
- multa_40_paga: se a multa de 40% foi paga
- valor_multa_40: valor da multa rescisória
- extrato_disponivel: se há extrato nos documentos`,
    
    beneficios: `
CHAVES ESPERADAS:
- vale_transporte: valor diário ou mensal
- vale_alimentacao: valor mensal
- vale_refeicao: valor por dia
- plano_saude: se tinha e valor do desconto
- seguro_vida: se tinha
- outros_beneficios: lista de outros benefícios`,
  };
  
  return keysByType[taskType] || `Extraia todos os fatos relevantes encontrados para o tema "${taskType}".`;
}

// Função de extração anti-alucinação
async function extractFactsFromChunks(
  query: string,
  chunks: Array<{
    chunk_id: string;
    document_id: string;
    page_number: number;
    content: string;
    doc_type: string;
    similarity: number;
  }>,
  taskType: string,
  apiKey: string
): Promise<ExtractionResult> {
  
  // Formatar chunks para o contexto
  const chunksArray = chunks.map((c) => ({
    chunk_id: c.chunk_id,
    document_id: c.document_id,
    page_number: c.page_number || 1,
    doc_type: c.doc_type || "outro",
    content: c.content,
  }));

  const userPrompt = `ENTRADA:
task_type: "${taskType}"
question: "${query}"

${getExpectedKeys(taskType)}

chunks:
${JSON.stringify(chunksArray, null, 2)}

INSTRUÇÕES:
1. Analise cada chunk cuidadosamente.
2. Extraia APENAS informações que estejam literalmente presentes.
3. Para cada fato, copie o trecho LITERAL que comprova o valor no campo "quote".
4. Se não encontrar uma chave esperada, liste em "not_found" com explicação.
5. Se houver informações conflitantes, marque conflict=true e liste ambas as fontes.

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
    console.error("Extraction API error:", errorText);
    throw new Error(`Extraction API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    const result = JSON.parse(content);
    
    // Validar e normalizar o resultado
    return {
      task_type: result.task_type || taskType,
      facts: (result.facts || []).map((f: any) => ({
        key: f.key || "",
        label: f.label || f.key || "",
        value: f.value ?? "",
        value_type: f.value_type || "text",
        confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
        conflict: f.conflict === true,
        sources: (f.sources || []).map((s: any) => ({
          chunk_id: s.chunk_id || "",
          document_id: s.document_id || "",
          page_number: s.page_number || 1,
          quote: s.quote || "",
        })),
        notes: f.notes || undefined,
      })),
      not_found: (result.not_found || []).map((nf: any) => ({
        expected_key: nf.expected_key || nf,
        why: nf.why || "Não encontrado nos trechos fornecidos",
      })),
      warnings: result.warnings || [],
    };
  } catch (parseError) {
    console.error("Failed to parse extraction result:", content);
    throw new Error("Failed to parse extraction result as JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id } = await req.json();

    if (!task_id) {
      return new Response(
        JSON.stringify({ error: "task_id is required" }),
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

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar tarefa
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

    // Verificar permissão
    if (task.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this task" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Running extraction task ${task_id}: ${task.task_type}`);

    // Atualizar status
    await supabase
      .from("extraction_tasks")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id);

    const startTime = Date.now();
    
    try {
      // Configurações de performance
      const topK = Math.min(Math.max(task.top_k || 25, 10), 40); // Limitar entre 10-40
      const docTypes = task.filters?.doc_types || null;
      const similarityThreshold = task.similarity_threshold || 0.7;
      
      console.log(`[EXTRACTION] Config: top_k=${topK}, threshold=${similarityThreshold}, doc_types=${JSON.stringify(docTypes)}`);
      
      // 1. Gerar embedding da query
      const queryEmbedding = await generateEmbedding(task.query, OPENAI_API_KEY);
      console.log(`Generated query embedding for query: "${task.query.substring(0, 50)}..."`);

      // 2. Buscar chunks relevantes usando a função de match
      // IMPORTANTE: Limitar top_k para performance (20-40)
      const { data: chunks, error: searchError } = await supabase.rpc(
        "match_document_chunks",
        {
          p_case_id: task.case_id,
          p_query_embedding: `[${queryEmbedding.join(',')}]`,
          p_top_k: topK,
          p_doc_types: docTypes, // Filtro por tipo de documento para precisão
        }
      );

      if (searchError) {
        console.error("Semantic search error:", searchError);
        throw new Error(`Semantic search failed: ${searchError.message}`);
      }

      console.log(`Found ${chunks?.length || 0} relevant chunks`);

      if (!chunks || chunks.length === 0) {
        const emptyResult: ExtractionResult = {
          task_type: task.task_type,
          facts: [],
          not_found: [{
            expected_key: "*",
            why: "Nenhum documento indexado encontrado para este caso"
          }],
          warnings: ["Execute o processamento de documentos primeiro"],
        };

        await supabase
          .from("extraction_tasks")
          .update({
            status: "done",
            result_json: {
              ...emptyResult,
              chunks_searched: 0,
              extracted_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", task_id);

        return new Response(
          JSON.stringify({
            success: true,
            task_id,
            status: "done",
            result: emptyResult,
            message: "No indexed documents found for this case",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Executar extração anti-alucinação com novo formato
      const extractionResult = await extractFactsFromChunks(
        task.query,
        chunks.map((c: any) => ({
          chunk_id: c.chunk_id,
          document_id: c.document_id,
          page_number: c.page_number || 1,
          content: c.content,
          doc_type: c.doc_type || "outro",
          similarity: c.similarity,
        })),
        task.task_type,
        OPENAI_API_KEY
      );

      console.log(`Extracted ${extractionResult.facts.length} facts, ${extractionResult.not_found.length} not found`);

      // Log facts with conflicts
      const conflictFacts = extractionResult.facts.filter(f => f.conflict);
      if (conflictFacts.length > 0) {
        console.log(`⚠️ Found ${conflictFacts.length} facts with conflicts:`, conflictFacts.map(f => f.key));
      }

      // 4. Calcular tempo de processamento
      const processingTime = Date.now() - startTime;
      
      // 5. Salvar resultado na tarefa com métricas
      await supabase
        .from("extraction_tasks")
        .update({
          status: "done",
          result_json: {
            ...extractionResult,
            chunks_searched: chunks.length,
            extracted_at: new Date().toISOString(),
          },
          processing_time_ms: processingTime,
          chunks_analyzed: chunks.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id);

      // 5. Log evidence summary (não inserir ainda - aguardar confirmação do usuário)
      const evidenceCount = extractionResult.facts.reduce(
        (acc, fact) => acc + fact.sources.length, 
        0
      );
      console.log(`Prepared ${evidenceCount} evidence records across ${extractionResult.facts.length} facts for user confirmation`);

      return new Response(
        JSON.stringify({
          success: true,
          task_id,
          status: "done",
          result: extractionResult,
          chunks_searched: chunks.length,
          message: "Extraction completed. Facts ready for user review.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (extractionError) {
      console.error("Extraction error:", extractionError);
      
      await supabase
        .from("extraction_tasks")
        .update({
          status: "failed",
          error_message: extractionError instanceof Error ? extractionError.message : "Extraction failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id);

      throw extractionError;
    }

  } catch (error) {
    console.error("run-extraction-task error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
