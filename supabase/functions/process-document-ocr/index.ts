// =====================================================
// EDGE FUNCTION: PIPELINE COMPLETO PÓS-UPLOAD (V6 + Claude fallback)
// =====================================================
// Chamado pelo DocumentsManager do frontend após cada upload.
// Orquestra:
//   0. (G0) **Tenta V6 — extrator geométrico + mappers**.
//      Quando sucesso: grava `parsed/parsed_by/ocr_provider/ocr_text` direto
//      do PDF nativo, popula `metadata.v6_outcome='success'`, e segue
//      para chunk-and-embed (R2 — embeddings continuam gerados).
//      Quando falha: registra outcome estruturado em metadata e segue para
//      o caminho V5.
//   1. ocr-document  → Claude OCR (apenas se V6 não conseguiu).
//   2. chunk-and-embed → divide texto em chunks + gera embeddings OpenAI.
//
// IDEMPOTÊNCIA (R1): se o doc já tem `parsed_by != null` (V6 já rodou
// numa execução anterior — ex: reprocess-v6, ou retry da própria função),
// pulamos V6 + Claude e vamos direto para chunk-and-embed (se necessário).
//
// LOG ESTRUTURADO (R3): metadata.v6_outcome assume 5+ valores discretos
// pra alimentar o painel de telemetria sem arqueologia.
//
// Mudanças vs versão anterior:
//   - V6 plugado ao fluxo real (antes era só process-document-start, que
//     nenhum cliente chamava — era código zumbi).
//   - Claude só roda quando V6 falha (PDF escaneado, mapper genérico, etc.).
//   - chunk-and-embed continua disparado em ambos os caminhos (R2).
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
// V6 pipeline extraído para _shared/v6-pipeline.ts em 2026-05-20 para reuso
// no ocr-document (que tinha 7 callsites pulando V6, ver diagnóstico em
// xhvlhrgfoeahgofhljbs verificações C/D/E).
import {
  tentarV6,
  metadataV6,
  type V6Tentativa,
} from "../_shared/v6-pipeline.ts";

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

    // ===== R1: Idempotência =====
    // Buscar o documento ANTES de qualquer processamento. Se V6 já rodou
    // numa chamada anterior (parsed_by != null), pulamos V6 + Claude
    // e vamos direto para chunk-and-embed (se ainda não tiver embeddings).
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select(
        "id, mime_type, storage_path, parsed_by, ocr_provider, ocr_text, metadata",
      )
      .eq("id", document_id)
      .single();
    if (docErr || !doc) {
      return jsonResponse({ error: `documento não encontrado: ${docErr?.message ?? "?"}` }, 404);
    }

    if (doc.parsed_by) {
      // V6 já consolidou em chamada anterior. Apenas garante chunk-and-embed.
      console.log(`[pipeline] doc ${document_id}: idempotência — parsed_by=${doc.parsed_by}, skip V6+Claude`);
      const textoExistente = (doc.ocr_text as string | null) ?? "";
      if (textoExistente.length >= 20) {
        const { data: chunkData, error: chunkError } = await supabase.functions.invoke(
          "chunk-and-embed",
          {
            body: { document_id, extracted_text: textoExistente },
            headers: { Authorization: authHeader },
          },
        );
        return jsonResponse({
          success: true,
          document_id,
          path: "v6_idempotent",
          v6: { outcome: "already_done", mapper: doc.parsed_by, provider: doc.ocr_provider },
          chunking: chunkError ? { error: chunkError.message ?? String(chunkError) } : chunkData,
          message: `Documento já processado por V6 (${doc.parsed_by}) — pipeline pulado.`,
        });
      }
      // Sem texto — cai pra Claude mesmo (defesa: V6 deveria ter populado ocr_text).
    }

    // ===== G0: Tenta caminho V6 antes do Claude =====
    let v6: V6Tentativa | null = null;
    if (doc.mime_type === "application/pdf") {
      const { data: signed } = await supabase.storage
        .from("juriscalculo-documents")
        .createSignedUrl(doc.storage_path, 1800); // 30min — Claude OCR pode demorar
      if (signed?.signedUrl) {
        v6 = await tentarV6(doc, signed.signedUrl, supabase);
        console.log(
          `[pipeline] doc ${document_id}: V6 outcome=${v6.outcome}` +
            (v6.mapper ? ` mapper=${v6.mapper}` : "") +
            (v6.score !== undefined ? ` score=${v6.score.toFixed(2)}` : ""),
        );

        if (v6.outcome === "success" && v6.parsedJson && v6.textoCompleto) {
          // Grava resultado V6 + popula ocr_text com texto geométrico (que
          // alimenta chunk-and-embed depois — R2).
          await supabase
            .from("documents")
            .update({
              parsed: v6.parsedJson,
              parsed_by: v6.mapper,
              ocr_provider: "pdfjs_geometric",
              ocr_text: v6.textoCompleto,
              ocr_validated: true,
              status: "ocr_done",
              extracao_status: "done",
              updated_at: new Date().toISOString(),
              metadata: { ...(doc.metadata ?? {}), ...metadataV6(v6) },
            })
            .eq("id", document_id);

          // R2: embeddings continuam gerados, mas com texto LIMPO do extrator
          // (nada de markdown sujo do Claude). Custo OpenAI menor + qualidade
          // de RAG maior.
          const { data: chunkData, error: chunkError } = await supabase.functions.invoke(
            "chunk-and-embed",
            {
              body: { document_id, extracted_text: v6.textoCompleto },
              headers: { Authorization: authHeader },
            },
          );
          if (chunkError) {
            console.warn(`[pipeline] doc ${document_id}: V6 ok mas chunk-and-embed falhou:`, chunkError);
            return jsonResponse({
              success: true,
              partial: true,
              document_id,
              path: "v6_success_chunk_failed",
              v6: { outcome: "success", mapper: v6.mapper, score: v6.score, page_count: v6.pageCount },
              chunking_error: chunkError.message ?? String(chunkError),
              message: `V6 sucesso (${v6.mapper}); chunk-and-embed falhou — rode novamente.`,
            });
          }
          return jsonResponse({
            success: true,
            document_id,
            path: "v6_success",
            v6: {
              outcome: "success",
              mapper: v6.mapper,
              score: v6.score,
              page_count: v6.pageCount,
              quality_reason: v6.qualidadeRazao,
            },
            chunking: chunkData,
            message: `V6 extraiu via ${v6.mapper} (${v6.pageCount} pg) — sem Claude. ${chunkData?.chunks_created ?? "?"} chunks gerados.`,
          });
        }

        // V6 NÃO conseguiu — registra outcome estruturado e segue pro V5.
        await supabase
          .from("documents")
          .update({ metadata: { ...(doc.metadata ?? {}), ...metadataV6(v6) } })
          .eq("id", document_id);
      } else {
        v6 = { outcome: "pdf_download_failed", errorMessage: "signed URL não gerada" };
        await supabase
          .from("documents")
          .update({ metadata: { ...(doc.metadata ?? {}), ...metadataV6(v6) } })
          .eq("id", document_id);
      }
    } else {
      // Não-PDF: registra outcome 'not_pdf' apenas pra auditoria.
      v6 = { outcome: "not_pdf" };
      await supabase
        .from("documents")
        .update({ metadata: { ...(doc.metadata ?? {}), ...metadataV6(v6) } })
        .eq("id", document_id);
    }

    // ===== Caminho V5: OCR Claude + chunk-and-embed (mesmo de antes) =====
    console.log(`[pipeline] doc ${document_id}: caminho V5 (Claude) — V6 outcome=${v6?.outcome ?? "skipped"}`);
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

    const { data: chunkData, error: chunkError } = await supabase.functions.invoke(
      "chunk-and-embed",
      {
        body: { document_id, extracted_text: extractedText },
        headers: { Authorization: authHeader },
      },
    );
    if (chunkError) {
      console.warn(`[pipeline] chunking falhou (OCR Claude preservado):`, chunkError);
      return jsonResponse({
        success: true,
        partial: true,
        document_id,
        path: "v5_chunk_failed",
        v6: v6 ?? { outcome: "skipped" },
        ocr: ocrData,
        chunking_error: chunkError.message || String(chunkError),
        message: "OCR Claude concluído, chunking falhou. Rode chunk-and-embed novamente.",
      });
    }

    return jsonResponse({
      success: true,
      document_id,
      path: "v5_success",
      v6: v6 ?? { outcome: "skipped" },
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
      message: `Pipeline V5: OCR (${ocrData.page_count} pg, ${ocrData.provider}) + ${chunkData?.chunks_created ?? "?"} chunks. V6 outcome: ${v6?.outcome ?? "skipped"}.`,
    });
  } catch (err) {
    console.error("[pipeline] erro:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
