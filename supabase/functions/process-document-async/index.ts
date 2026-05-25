// =====================================================
// EDGE FUNCTION: PROCESSAMENTO ASSÍNCRONO DE DOCUMENTOS
// Enfileira e processa documentos em background
// Com controle de status, retries e batch embedding
// =====================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações de chunking e batch
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 10; // Embeddings por lote
const MAX_RETRIES = 3;

interface ChunkResult {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
}

interface ProcessingStatus {
  stage: "queued" | "downloading" | "ocr" | "chunking" | "embedding" | "completed" | "failed";
  progress: number;
  message: string;
  chunksTotal?: number;
  chunksProcessed?: number;
}

// Função para dividir texto em chunks com overlap
function splitTextIntoChunks(
  text: string,
  pageNumber: number = 1,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length === 0) return chunks;

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf(".", endIndex);
      const lastNewline = cleanText.lastIndexOf("\n", endIndex);
      const lastSpace = cleanText.lastIndexOf(" ", endIndex);

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
        tokenCount: Math.ceil(chunkText.length / 4),
      });
      chunkIndex++;
    }

    startIndex = endIndex - overlap;
    if (startIndex >= cleanText.length) break;
  }

  return chunks;
}

// OCR com Vision AI
async function extractTextWithVision(
  fileUrl: string,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; pageCount: number }> {
  console.log(`[OCR] Starting extraction for ${mimeType}`);

  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.status}`);
  }

  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

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
              
              Responda APENAS com o texto extraído.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 16000,
      temperature: 0.1,
    }),
  });

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    console.error("[OCR] Vision API error:", errorText);
    throw new Error(`Vision API error: ${visionResponse.status}`);
  }

  const visionData = await visionResponse.json();
  const extractedText = visionData.choices?.[0]?.message?.content || "";

  const pageMatches = extractedText.match(/---\s*PÁGINA\s*\d+\s*---/gi) || [];
  const pageCount = Math.max(pageMatches.length, 1);

  console.log(`[OCR] Extracted ${extractedText.length} chars from ${pageCount} pages`);
  return { text: extractedText, pageCount };
}

// Gerar embeddings em lote
async function generateEmbeddingsBatch(
  texts: string[],
  apiKey: string
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];

  // Processar em lotes menores
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const embeddings = await Promise.all(
      batch.map(async (text) => {
        try {
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
            console.error(`Embedding error for batch item: ${response.status}`);
            return null;
          }

          const data = await response.json();
          return data.data?.[0]?.embedding || null;
        } catch (error) {
          console.error("Embedding generation failed:", error);
          return null;
        }
      })
    );

    results.push(...embeddings);

    // Pequeno delay entre batches para evitar rate limiting
    if (i + EMBEDDING_BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Atualizar status do documento
async function updateDocumentStatus(
  supabase: any,
  documentId: string,
  status: ProcessingStatus
) {
  await supabase
    .from("documents")
    .update({
      processing_status: status.stage,
      metadata: {
        processing_progress: status.progress,
        processing_message: status.message,
        chunks_total: status.chunksTotal,
        chunks_processed: status.chunksProcessed,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, case_id, mode = "single" } = await req.json();

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

    // Modo: processar fila do caso
    if (mode === "queue" && case_id) {
      console.log(`[QUEUE] Processing queue for case ${case_id}`);

      // Buscar documentos pendentes do caso
      const { data: pendingDocs, error: pendingError } = await supabase
        .from("documents")
        .select("id, arquivo_url, storage_path, mime_type, tipo, uploaded_em")
        .eq("case_id", case_id)
        .in("status", ["uploaded", "pending", "failed"])
        .order("queue_priority", { ascending: false })
        // documents table does not have created_at; use uploaded_em as stable ordering
        .order("uploaded_em", { ascending: true });

      if (pendingError) throw pendingError;

      if (!pendingDocs || pendingDocs.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No pending documents", processed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[QUEUE] Found ${pendingDocs.length} pending documents`);

      // Processar cada documento em background usando waitUntil
      const processQueue = async () => {
        let processed = 0;
        let failed = 0;

         for (const doc of pendingDocs) {
          try {
             await processDocumentInternal(supabase, doc.id, OPENAI_API_KEY);
            processed++;
          } catch (error) {
            console.error(`[QUEUE] Failed to process ${doc.id}:`, error);
            failed++;
          }
        }

        console.log(`[QUEUE] Completed: ${processed} success, ${failed} failed`);
      };

      // Iniciar processamento em background
      // @ts-ignore - EdgeRuntime é disponível no ambiente de execução
      (globalThis as any).EdgeRuntime?.waitUntil?.(processQueue()) ?? processQueue();

      return new Response(
        JSON.stringify({
          success: true,
          message: `Queued ${pendingDocs.length} documents for processing`,
          queued: pendingDocs.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Modo: processar documento único
    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    const result = await processDocumentInternal(supabase, document_id, OPENAI_API_KEY);
    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...result,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-document-async error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Função interna de processamento
async function processDocumentInternal(
  supabase: any,
  documentId: string,
  apiKey: string
): Promise<{
  success: boolean;
  document_id: string;
  chunks_created: number;
  page_count: number;
  text_length: number;
}> {
  // Buscar documento
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new Error("Document not found");
  }

  // If arquivo_url is missing but storage_path exists, create a signed URL on demand.
  if (!document.arquivo_url) {
    if (!document.storage_path) {
      throw new Error("Document has no file URL");
    }

    const { data: signedUrlData, error: signedErr } = await supabase.storage
      .from("juriscalculo-documents")
      .createSignedUrl(document.storage_path, 1800); // 30min — pipeline assíncrono pode demorar

    if (signedErr || !signedUrlData?.signedUrl) {
      console.error("[PROCESS] Could not create signed URL:", signedErr);
      throw new Error("Could not generate signed URL for file");
    }

    await supabase
      .from("documents")
      .update({ arquivo_url: signedUrlData.signedUrl, updated_at: new Date().toISOString() })
      .eq("id", documentId);

    document.arquivo_url = signedUrlData.signedUrl;
  }

  console.log(`[PROCESS] Starting ${documentId}: ${document.arquivo_url}`);

  // Atualizar status: downloading
  await updateDocumentStatus(supabase, documentId, {
    stage: "downloading",
    progress: 5,
    message: "Baixando arquivo...",
  });

  try {
    // Determinar tipo MIME
    const fileUrl = document.arquivo_url;
    const mimeType = document.mime_type || (() => {
      try {
        const pathname = new URL(fileUrl).pathname;
        const ext = pathname.split(".").pop()?.toLowerCase() || "";
        if (ext === "pdf") return "application/pdf";
        if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
        if (ext === "png") return "image/png";
        if (ext === "webp") return "image/webp";
      } catch {
        // ignore
      }
      return "application/octet-stream";
    })();

    // Atualizar status: OCR
    await updateDocumentStatus(supabase, documentId, {
      stage: "ocr",
      progress: 20,
      message: "Extraindo texto com OCR...",
    });

    // Extrair texto
    const { text: extractedText, pageCount } = await extractTextWithVision(
      fileUrl,
      mimeType,
      apiKey
    );

    console.log(`[PROCESS] OCR complete: ${extractedText.length} chars`);

    // Atualizar status: chunking
    await updateDocumentStatus(supabase, documentId, {
      stage: "chunking",
      progress: 40,
      message: "Dividindo em chunks...",
    });

    // Dividir em chunks por página
    const allChunks: ChunkResult[] = [];
    const pageTexts = extractedText.split(/---\s*PÁGINA\s*\d+\s*---/gi).filter((t) => t.trim());

    if (pageTexts.length > 1) {
      pageTexts.forEach((pageText, pageIndex) => {
        const pageChunks = splitTextIntoChunks(pageText, pageIndex + 1);
        allChunks.push(...pageChunks);
      });
    } else {
      allChunks.push(...splitTextIntoChunks(extractedText, 1));
    }

    console.log(`[PROCESS] Created ${allChunks.length} chunks`);

    // Atualizar status: embedding
    await updateDocumentStatus(supabase, documentId, {
      stage: "embedding",
      progress: 50,
      message: `Gerando embeddings para ${allChunks.length} chunks...`,
      chunksTotal: allChunks.length,
      chunksProcessed: 0,
    });

    // Remover chunks antigos
    await supabase.from("document_chunks").delete().eq("document_id", documentId);
    await supabase.from("doc_chunks").delete().eq("document_id", documentId);

    // Gerar embeddings em lote
    const texts = allChunks.map((c) => c.text);
    const embeddings = await generateEmbeddingsBatch(texts, apiKey);

    // Preparar chunks para inserção
    const chunksToInsert = allChunks.map((chunk, index) => ({
      case_id: document.case_id,
      document_id: documentId,
      content: chunk.text,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      doc_type: document.tipo || "outro",
      metadata: {
        page: chunk.pageNumber,
        index: chunk.chunkIndex,
        char_count: chunk.text.length,
        token_count: chunk.tokenCount,
        has_embedding: embeddings[index] !== null,
      },
      embedding: embeddings[index] ? `[${embeddings[index]!.join(",")}]` : null,
    }));

    // Inserir em lotes
    const insertBatchSize = 50;
    let insertedChunks = 0;

    for (let i = 0; i < chunksToInsert.length; i += insertBatchSize) {
      const batch = chunksToInsert.slice(i, i + insertBatchSize);

      const { error: insertError } = await supabase.from("document_chunks").insert(batch);

      if (insertError) {
        console.error("[PROCESS] Insert error:", insertError);
      } else {
        insertedChunks += batch.length;
      }

      // Atualizar progresso
      const progress = 50 + Math.floor((insertedChunks / allChunks.length) * 45);
      await updateDocumentStatus(supabase, documentId, {
        stage: "embedding",
        progress,
        message: `Salvando chunks (${insertedChunks}/${allChunks.length})...`,
        chunksTotal: allChunks.length,
        chunksProcessed: insertedChunks,
      });
    }

    // Atualizar documento com sucesso
    await supabase
      .from("documents")
      .update({
        status: "embedded",
        processing_status: "completed",
        page_count: pageCount,
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          chunks_created: insertedChunks,
          text_length: extractedText.length,
          processing_progress: 100,
          processing_message: "Concluído",
        },
      })
      .eq("id", documentId);

    console.log(`[PROCESS] Completed: ${insertedChunks} chunks created`);

    return {
      success: true,
      document_id: documentId,
      chunks_created: insertedChunks,
      page_count: pageCount,
      text_length: extractedText.length,
    };
  } catch (processingError) {
    console.error("[PROCESS] Error:", processingError);

    // Incrementar retry count
    const { data: doc } = await supabase
      .from("documents")
      .select("retry_count, max_retries")
      .eq("id", documentId)
      .single();

    const retryCount = (doc?.retry_count || 0) + 1;
    const shouldRetry = retryCount < (doc?.max_retries || MAX_RETRIES);

    await supabase
      .from("documents")
      .update({
        processing_status: shouldRetry ? "retrying" : "failed",
        processing_error: processingError instanceof Error ? processingError.message : "Unknown error",
        retry_count: retryCount,
      })
      .eq("id", documentId);

    throw processingError;
  }
}
