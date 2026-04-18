// =====================================================
// EDGE FUNCTION: PIPELINE COMPLETO COM MISTRAL OCR
// =====================================================
// Orquestra as duas etapas necessárias pós-upload:
//   1. ocr-document  → extrai texto (Mistral OCR com chunking de PDF)
//   2. chunk-and-embed → divide em chunks + gera embeddings OpenAI
//
// Drop-in replacement para `process-document` (legado OpenAI Vision),
// mantendo mesma interface de entrada ({ document_id }) e sendo chamado
// pelo DocumentsManager do frontend.
//
// Vantagens sobre process-document:
//   - OCR via Mistral (mais preciso p/ documentos trabalhistas)
//   - Chunking de PDF para arquivos grandes (cartão de ponto)
//   - Progresso rastreado em documents.ocr_chunks_done/total
//   - Falha parcial tolerada (status='ocr_partial')
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return jsonResponse({ error: "document_id é obrigatório" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization obrigatório" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Etapa 1: OCR (Mistral, com chunking interno).
    console.log(`[pipeline] Etapa 1/2: OCR Mistral — document ${document_id}`);
    const { data: ocrData, error: ocrError } = await supabase.functions.invoke(
      "ocr-document",
      {
        body: { document_id },
        headers: { Authorization: authHeader },
      },
    );
    if (ocrError) {
      throw new Error(`OCR falhou: ${ocrError.message || JSON.stringify(ocrError)}`);
    }
    if (!ocrData?.success) {
      throw new Error(`OCR sem sucesso: ${ocrData?.error || "erro desconhecido"}`);
    }

    const extractedText = ocrData.extracted_text as string;
    if (!extractedText || extractedText.length < 20) {
      throw new Error("OCR retornou texto insuficiente (< 20 chars)");
    }

    // Etapa 2: chunking + embeddings (OpenAI, pipeline existente).
    console.log(`[pipeline] Etapa 2/2: chunk-and-embed (${extractedText.length} chars)`);
    const { data: chunkData, error: chunkError } = await supabase.functions.invoke(
      "chunk-and-embed",
      {
        body: { document_id, extracted_text: extractedText },
        headers: { Authorization: authHeader },
      },
    );
    if (chunkError) {
      // OCR já concluiu e foi salvo; chunking falhou mas documento existe.
      // Retornamos 200 com warning para UI refletir OCR ok + chunking pendente.
      console.warn(`[pipeline] chunking falhou (OCR preservado):`, chunkError);
      return jsonResponse({
        success: true,
        partial: true,
        ocr: ocrData,
        chunking_error: chunkError.message || String(chunkError),
        message: "OCR concluído, chunking falhou. O texto está salvo — rode chunk-and-embed novamente.",
      });
    }

    return jsonResponse({
      success: true,
      document_id,
      ocr: {
        page_count: ocrData.page_count,
        doc_type: ocrData.doc_type,
        confidence: ocrData.confidence,
        chunks: ocrData.chunks,
        text_length: ocrData.text_length,
        provider: ocrData.provider,
        status: ocrData.status,
      },
      chunking: chunkData,
      message: `Pipeline concluído: OCR (${ocrData.page_count} pg, ${ocrData.provider}) + ${chunkData?.chunks_created ?? "?"} chunks`,
    });
  } catch (err) {
    console.error("[pipeline] erro:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
