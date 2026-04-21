// =====================================================
// EDGE FUNCTION: BUSCA SEMÂNTICA (RAG)
// Busca chunks relevantes por similaridade vetorial
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireAuthedUser,
  requireCaseOwnership,
  requireDocumentOwnership,
  authErrorResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para gerar embeddings
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
    const errorText = await response.text();
    console.error("Embedding API error:", errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
}

interface SearchResult {
  chunk_id: string;
  document_id: string;
  texto: string;
  page_number: number | null;
  similarity: number;
  metadata: Record<string, unknown>;
  document_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      case_id, 
      document_id,
      threshold = 0.7,
      limit = 10,
      topics // Opcional: lista de tópicos específicos para buscar
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth + ownership guard: exige JWT válido e valida case/document_id recebidos
    const auth = await requireAuthedUser(req, supabase);
    if (case_id) await requireCaseOwnership(supabase, auth.user.id, case_id);
    if (document_id) await requireDocumentOwnership(supabase, auth.user.id, document_id);

    console.log(`Semantic search: "${query}" (case: ${case_id || 'any'}, threshold: ${threshold})`);

    // Gerar embedding da query
    const queryEmbedding = await generateEmbedding(query, OPENAI_API_KEY);
    
    if (queryEmbedding.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate query embedding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);

    // Buscar chunks usando a função match_chunks
    const { data: chunks, error: searchError } = await supabase.rpc('match_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: threshold,
      match_count: limit,
      filter_case_id: case_id || null,
      filter_document_id: document_id || null,
    });

    if (searchError) {
      console.error("Search error:", searchError);
      throw searchError;
    }

    // Enriquecer resultados com informações do documento
    const results: SearchResult[] = [];
    
    if (chunks && chunks.length > 0) {
      // Buscar informações dos documentos
      const documentIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))];
      
      const { data: documents } = await supabase
        .from("documents")
        .select("id, tipo")
        .in("id", documentIds);

      const documentMap = new Map(documents?.map(d => [d.id, d.tipo]) || []);

      for (const chunk of chunks) {
        results.push({
          chunk_id: chunk.id,
          document_id: chunk.document_id,
          texto: chunk.texto,
          page_number: chunk.metadata?.page || null,
          similarity: chunk.similarity,
          metadata: chunk.metadata || {},
          document_type: documentMap.get(chunk.document_id) || 'unknown',
        });
      }
    }

    console.log(`Found ${results.length} relevant chunks`);

    // Se topics foi especificado, fazer buscas adicionais para cada tópico
    let topicResults: Record<string, SearchResult[]> = {};
    
    if (topics && Array.isArray(topics) && topics.length > 0) {
      console.log(`Searching for specific topics: ${topics.join(', ')}`);
      
      for (const topic of topics) {
        const topicEmbedding = await generateEmbedding(topic, OPENAI_API_KEY);
        
        const { data: topicChunks } = await supabase.rpc('match_chunks', {
          query_embedding: `[${topicEmbedding.join(',')}]`,
          match_threshold: threshold,
          match_count: 5,
          filter_case_id: case_id || null,
        });

        if (topicChunks && topicChunks.length > 0) {
          topicResults[topic] = topicChunks.map((chunk: { 
            id: string; 
            document_id: string; 
            texto: string; 
            similarity: number; 
            metadata: Record<string, unknown>; 
          }) => ({
            chunk_id: chunk.id,
            document_id: chunk.document_id,
            texto: chunk.texto,
            page_number: chunk.metadata?.page || null,
            similarity: chunk.similarity,
            metadata: chunk.metadata || {},
          }));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results,
        total_results: results.length,
        topic_results: Object.keys(topicResults).length > 0 ? topicResults : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const authResp = authErrorResponse(error, corsHeaders);
    if (authResp) return authResp;
    console.error("semantic-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
