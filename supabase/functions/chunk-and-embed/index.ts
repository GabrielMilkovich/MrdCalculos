// =====================================================
// EDGE FUNCTION: CHUNKING E EMBEDDINGS
// Divide texto em chunks e gera embeddings vetoriais
// =====================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações de chunking otimizadas
const CHUNK_SIZE = 800; // ~200 tokens
const CHUNK_OVERLAP = 150; // ~40 tokens de overlap

interface ChunkResult {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  charCount: number;
}

// Função para dividir texto em chunks com overlap
function splitTextIntoChunks(
  fullText: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  
  // Primeiro, tentar dividir por páginas
  const pagePattern = /---\s*PÁGINA\s*(\d+)\s*---/gi;
  const pages: { pageNum: number; text: string }[] = [];
  
  let lastIndex = 0;
  let match;
  let currentPage = 1;
  
  while ((match = pagePattern.exec(fullText)) !== null) {
    if (lastIndex > 0 || match.index > 0) {
      const pageText = fullText.substring(lastIndex, match.index).trim();
      if (pageText) {
        pages.push({ pageNum: currentPage, text: pageText });
      }
    }
    currentPage = parseInt(match[1], 10);
    lastIndex = match.index + match[0].length;
  }
  
  // Último pedaço de texto
  if (lastIndex < fullText.length) {
    const remainingText = fullText.substring(lastIndex).trim();
    if (remainingText) {
      pages.push({ pageNum: currentPage, text: remainingText });
    }
  }
  
  // Se não encontrou páginas, tratar como página única
  if (pages.length === 0) {
    pages.push({ pageNum: 1, text: fullText.trim() });
  }
  
  // Agora, dividir cada página em chunks
  let globalChunkIndex = 0;
  
  for (const page of pages) {
    const cleanText = page.text.replace(/\s+/g, ' ').trim();
    if (!cleanText) continue;
    
    let startIndex = 0;
    
    while (startIndex < cleanText.length) {
      let endIndex = Math.min(startIndex + chunkSize, cleanText.length);
      
      // Tentar quebrar em um limite natural
      if (endIndex < cleanText.length) {
        // Procurar por ponto final, quebra de linha ou vírgula
        const searchStart = Math.max(startIndex + Math.floor(chunkSize * 0.7), startIndex);
        const searchText = cleanText.substring(searchStart, endIndex);
        
        const lastPeriod = searchText.lastIndexOf('. ');
        const lastNewline = searchText.lastIndexOf('\n');
        const lastComma = searchText.lastIndexOf(', ');
        const lastSpace = searchText.lastIndexOf(' ');
        
        // Escolher o melhor ponto de quebra
        let breakPoint = -1;
        if (lastPeriod !== -1) breakPoint = searchStart + lastPeriod + 2;
        else if (lastNewline !== -1) breakPoint = searchStart + lastNewline + 1;
        else if (lastComma !== -1) breakPoint = searchStart + lastComma + 2;
        else if (lastSpace !== -1) breakPoint = searchStart + lastSpace + 1;
        
        if (breakPoint > startIndex) {
          endIndex = breakPoint;
        }
      }
      
      const chunkText = cleanText.substring(startIndex, endIndex).trim();
      
      if (chunkText.length >= 50) { // Mínimo de 50 caracteres
        chunks.push({
          text: chunkText,
          pageNumber: page.pageNum,
          chunkIndex: globalChunkIndex,
          charCount: chunkText.length,
        });
        globalChunkIndex++;
      }
      
      // Próximo chunk com overlap
      startIndex = endIndex - overlap;
      if (startIndex >= cleanText.length || startIndex < 0) break;
    }
  }
  
  return chunks;
}

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
      input: text.substring(0, 8000), // Limitar para não exceder contexto
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

// Gerar hash simples para deduplicação
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, extracted_text } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
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

    // Buscar documento
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar permissão
    if (document.cases.criado_por !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this document" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Texto pode vir do request ou dos metadados
    let textToProcess = extracted_text;
    if (!textToProcess && document.metadata?.extracted_text_preview) {
      // Se não veio texto, pode ser que precise re-executar OCR
      return new Response(
        JSON.stringify({ error: "extracted_text is required. Run OCR first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting chunking for document ${document_id}, text length: ${textToProcess?.length || 0}`);

    // Atualizar status
    await supabase
      .from("documents")
      .update({
        status: "chunk_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    try {
      // Dividir em chunks
      const chunks = splitTextIntoChunks(textToProcess);
      console.log(`Created ${chunks.length} chunks`);

      // Remover chunks antigos deste documento (da nova tabela)
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", document_id);

      // Processar chunks em lotes
      const batchSize = 5;
      let insertedChunks = 0;
      let failedChunks = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const chunksWithEmbeddings = await Promise.all(
          batch.map(async (chunk) => {
            try {
              const embedding = await generateEmbedding(chunk.text, OPENAI_API_KEY);
              return {
                case_id: document.case_id,
                document_id,
                page_number: chunk.pageNumber,
                chunk_index: chunk.chunkIndex,
                content: chunk.text,
                content_hash: simpleHash(chunk.text),
                doc_type: document.tipo || "outro",
                metadata: {
                  char_count: chunk.charCount,
                  created_at: new Date().toISOString(),
                },
                embedding: `[${embedding.join(',')}]`,
              };
            } catch (embeddingError) {
              console.error(`Embedding error for chunk ${chunk.chunkIndex}:`, embeddingError);
              failedChunks++;
              return {
                case_id: document.case_id,
                document_id,
                page_number: chunk.pageNumber,
                chunk_index: chunk.chunkIndex,
                content: chunk.text,
                content_hash: simpleHash(chunk.text),
                doc_type: document.tipo || "outro",
                metadata: {
                  char_count: chunk.charCount,
                  created_at: new Date().toISOString(),
                  embedding_error: true,
                },
                embedding: null,
              };
            }
          })
        );

        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert(chunksWithEmbeddings);

        if (insertError) {
          console.error("Chunk insert error:", insertError);
          failedChunks += chunksWithEmbeddings.length;
        } else {
          insertedChunks += chunksWithEmbeddings.length;
        }

        console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} completed`);
      }

      // Atualizar documento
      const finalStatus = failedChunks === 0 ? "embedded" : "embedded_partial";
      
      await supabase
        .from("documents")
        .update({
          status: finalStatus,
          updated_at: new Date().toISOString(),
          metadata: {
            ...document.metadata,
            chunks_created: insertedChunks,
            chunks_failed: failedChunks,
            chunking_completed_at: new Date().toISOString(),
          },
        })
        .eq("id", document_id);

      console.log(`Chunking completed: ${insertedChunks} inserted, ${failedChunks} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          status: finalStatus,
          chunks_created: insertedChunks,
          chunks_failed: failedChunks,
          message: "Document embedded and ready for semantic search.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (chunkError) {
      console.error("Chunking error:", chunkError);
      
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: chunkError instanceof Error ? chunkError.message : "Chunking failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);

      throw chunkError;
    }

  } catch (error) {
    console.error("chunk-and-embed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
