// =====================================================
// EDGE FUNCTION: PROCESSAMENTO DE DOCUMENTOS
// OCR, Chunking e Geração de Embeddings
// =====================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações de chunking
const CHUNK_SIZE = 1000; // caracteres por chunk
const CHUNK_OVERLAP = 200; // sobreposição entre chunks

interface ChunkResult {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
}

// Função para dividir texto em chunks com overlap
function splitTextIntoChunks(
  text: string, 
  pageNumber: number = 1,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  
  // Limpar o texto
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length === 0) return chunks;
  
  let startIndex = 0;
  let chunkIndex = 0;
  
  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;
    
    // Tentar quebrar em um limite de frase ou parágrafo
    if (endIndex < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf('.', endIndex);
      const lastNewline = cleanText.lastIndexOf('\n', endIndex);
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      
      // Preferir quebrar em período, depois newline, depois espaço
      if (lastPeriod > startIndex + chunkSize / 2) {
        endIndex = lastPeriod + 1;
      } else if (lastNewline > startIndex + chunkSize / 2) {
        endIndex = lastNewline + 1;
      } else if (lastSpace > startIndex + chunkSize / 2) {
        endIndex = lastSpace + 1;
      }
    }
    
    const chunkText = cleanText.substring(startIndex, endIndex).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        pageNumber,
        chunkIndex,
        tokenCount: Math.ceil(chunkText.length / 4), // Estimativa simples
      });
      chunkIndex++;
    }
    
    startIndex = endIndex - overlap;
    if (startIndex >= cleanText.length) break;
  }
  
  return chunks;
}

// Função para extrair texto de diferentes formatos usando Vision AI
async function extractTextWithVision(
  fileUrl: string,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; pageCount: number }> {
  console.log(`Extracting text from ${mimeType} using Vision AI...`);
  
  // Baixar o arquivo
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.status}`);
  }
  
  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  // Usar Gemini Vision para OCR
  const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extraia TODO o texto deste documento de forma estruturada. 
              
              REGRAS:
              1. Mantenha a formatação original (parágrafos, listas, tabelas)
              2. Se for um documento com múltiplas páginas, indique "--- PÁGINA X ---" antes de cada página
              3. Para tabelas, use formato markdown
              4. NÃO resuma ou interprete - apenas transcreva
              5. Se houver texto manuscrito, faça OCR e indique [manuscrito]
              6. Se houver imagens com texto, extraia o texto
              
              Responda APENAS com o texto extraído, sem explicações.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 16000,
      temperature: 0.1,
    }),
  });

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    console.error("Vision API error:", errorText);
    throw new Error(`Vision API error: ${visionResponse.status}`);
  }

  const visionData = await visionResponse.json();
  const extractedText = visionData.choices?.[0]?.message?.content || "";
  
  // Contar páginas baseado nos marcadores
  const pageMatches = extractedText.match(/---\s*PÁGINA\s*\d+\s*---/gi) || [];
  const pageCount = Math.max(pageMatches.length, 1);
  
  return { text: extractedText, pageCount };
}

function guessMimeTypeFromUrl(fileUrl: string): string {
  try {
    const pathname = new URL(fileUrl).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "application/pdf";
    if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (["doc", "docx"].includes(ext)) return "application/msword";
  } catch {
    // ignore
  }
  return "application/octet-stream";
}

// Embedding generation skipped - not used in this function (see chunk-and-embed for full embedding pipeline)
// Chunks are stored without embeddings for text-based search
async function generateEmbedding(_text: string, _apiKey: string): Promise<number[]> {
  // Return empty array - embeddings handled by chunk-and-embed function
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar documento
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If arquivo_url is missing but storage_path exists, create a signed URL on demand.
    if (!document.arquivo_url) {
      if (!document.storage_path) {
        return new Response(
          JSON.stringify({ error: "Document has no file URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedUrlData, error: signedErr } = await supabase.storage
        .from("juriscalculo-documents")
        // TTL 15min — URL só viva durante o processamento da edge function.
        .createSignedUrl(document.storage_path, 900);

      if (signedErr || !signedUrlData?.signedUrl) {
        console.error("Could not create signed URL:", signedErr);
        return new Response(
          JSON.stringify({ error: "Could not generate signed URL for file" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("documents")
        .update({ arquivo_url: signedUrlData.signedUrl, updated_at: new Date().toISOString() })
        .eq("id", document_id);

      document.arquivo_url = signedUrlData.signedUrl;
    }

    console.log(`Processing document ${document_id}: ${document.arquivo_url}`);

    // Atualizar status para "processing"
    await supabase
      .from("documents")
      .update({ processing_status: "processing", processing_error: null })
      .eq("id", document_id);

    try {
      // Determinar tipo de arquivo
      const fileUrl = document.arquivo_url;
      const mimeType = document.mime_type || guessMimeTypeFromUrl(fileUrl);

      // Extrair texto usando Vision AI
      const { text: extractedText, pageCount } = await extractTextWithVision(
        fileUrl,
        mimeType,
        OPENAI_API_KEY
      );

      console.log(`Extracted ${extractedText.length} characters from ${pageCount} pages`);

      // Dividir em chunks por página
      const allChunks: ChunkResult[] = [];
      
      // Tentar dividir por marcadores de página
      const pageTexts = extractedText.split(/---\s*PÁGINA\s*\d+\s*---/gi).filter(t => t.trim());
      
      if (pageTexts.length > 1) {
        // Documento com múltiplas páginas
        pageTexts.forEach((pageText, pageIndex) => {
          const pageChunks = splitTextIntoChunks(pageText, pageIndex + 1);
          allChunks.push(...pageChunks);
        });
      } else {
        // Documento sem marcadores de página
        allChunks.push(...splitTextIntoChunks(extractedText, 1));
      }

      console.log(`Created ${allChunks.length} chunks`);

      // Remover chunks antigos deste documento (ambas as tabelas para compatibilidade)
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", document_id);

      await supabase
        .from("doc_chunks")
        .delete()
        .eq("document_id", document_id);

      // Inserir novos chunks com embeddings na nova tabela document_chunks
      let insertedChunks = 0;
      const batchSize = 5;

      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        
        const chunksWithEmbeddings = await Promise.all(
          batch.map(async (chunk) => {
            try {
              const embedding = await generateEmbedding(chunk.text, OPENAI_API_KEY);
              return {
                case_id: document.case_id,
                document_id,
                content: chunk.text,
                page_number: chunk.pageNumber,
                chunk_index: chunk.chunkIndex,
                doc_type: document.tipo || "outro",
                metadata: {
                  page: chunk.pageNumber,
                  index: chunk.chunkIndex,
                  char_count: chunk.text.length,
                  token_count: chunk.tokenCount,
                },
                embedding: `[${embedding.join(',')}]`,
              };
            } catch (embeddingError) {
              console.error(`Error generating embedding for chunk ${chunk.chunkIndex}:`, embeddingError);
              return {
                case_id: document.case_id,
                document_id,
                content: chunk.text,
                page_number: chunk.pageNumber,
                chunk_index: chunk.chunkIndex,
                doc_type: document.tipo || "outro",
                metadata: {
                  page: chunk.pageNumber,
                  index: chunk.chunkIndex,
                  char_count: chunk.text.length,
                  token_count: chunk.tokenCount,
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
          console.error("Error inserting chunks:", insertError);
        } else {
          insertedChunks += chunksWithEmbeddings.length;
        }
        
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
      }

      // Atualizar documento com status de sucesso
      await supabase
        .from("documents")
        .update({
          status: "embedded",
          page_count: pageCount,
          updated_at: new Date().toISOString(),
          metadata: {
            chunks_created: insertedChunks,
            text_length: extractedText.length,
            processing_completed_at: new Date().toISOString(),
          },
        })
        .eq("id", document_id);

      console.log(`Document processing completed: ${insertedChunks} chunks created`);

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          chunks_created: insertedChunks,
          page_count: pageCount,
          text_length: extractedText.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (processingError) {
      console.error("Document processing error:", processingError);
      
      // Atualizar status de erro
      await supabase
        .from("documents")
        .update({
          processing_status: "error",
          processing_error: processingError instanceof Error ? processingError.message : "Unknown error",
        })
        .eq("id", document_id);

      throw processingError;
    }

  } catch (error) {
    console.error("process-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
