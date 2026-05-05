// =====================================================
// EDGE FUNCTION: INICIAR PROCESSAMENTO DE DOCUMENTO
// =====================================================
// V6: tenta extrator geométrico (texto nativo + coordenadas) antes de
// agendar OCR Mistral. Para PDFs com texto nativo extraível, mappers
// produzem o resultado direto e marcam status='parsed' — pulando o
// Mistral inteiro. Quando extrator geométrico falha (PDF escaneado ou
// muito complexo), cai pro fluxo v5 (ocr_pending → ocr-document).
//
// MIGRATION DE COMPORTAMENTO:
//   - V5: PDF → ocr_pending (sempre Mistral)
//   - V6: PDF → tenta extrator → mapper → parsed (90% dos casos)
//                            → ocr_pending (10% escaneados)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extrairGeometrico } from "../_shared/extrator-geometrico.ts";
import { escolherMapper } from "../_shared/mappers/dispatcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OCR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/tiff",
];
const PDF_MIME_TYPES = ["application/pdf"];
const DOCX_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function baixarBytes(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Tenta o caminho v6: extrator geométrico → mapper → parsed.
 * Retorna `true` quando conseguiu — caller pode pular o resto do fluxo.
 * `false` significa "cai pro fluxo v5".
 */
// deno-lint-ignore no-explicit-any
async function tentarCaminhoV6(supabase: any, document_id: string, signedUrl: string): Promise<boolean> {
  try {
    const bytes = await baixarBytes(signedUrl);
    if (!bytes) return false;
    const docTab = await extrairGeometrico(bytes);
    if (!docTab || docTab.qualidade.score < 0.7) {
      console.log(
        `[process-start] doc ${document_id}: extrator geométrico falhou ou qualidade < 0.7 — caminho v5`,
      );
      return false;
    }
    const dispatch = escolherMapper(docTab);
    if (!dispatch) {
      console.log(
        `[process-start] doc ${document_id}: extrator OK mas nenhum mapper aplica — caminho v5 com texto nativo`,
      );
      // Salva texto nativo no ocr_text — parsers v5 podem aproveitar.
      await supabase
        .from("documents")
        .update({
          ocr_text: docTab.textoCompleto,
          ocr_provider: "pdfjs_geometric",
          metadata: {
            extractor: "pdfjs_geometric",
            quality_score: docTab.qualidade.score,
            quality_reason: docTab.qualidade.razao,
            page_count: docTab.numeroPaginas,
            v6_path: "native_text_only",
          },
        })
        .eq("id", document_id);
      return false;
    }
    const resultado = dispatch.mapper.mapear(docTab);
    if (!resultado) {
      console.log(
        `[process-start] doc ${document_id}: mapper ${dispatch.mapper.slug} retornou null — caminho v5`,
      );
      // Idem — salva texto nativo pra v5 aproveitar.
      await supabase
        .from("documents")
        .update({
          ocr_text: docTab.textoCompleto,
          ocr_provider: "pdfjs_geometric",
        })
        .eq("id", document_id);
      return false;
    }
    // Sucesso v6 — marca como parsed direto.
    console.log(
      `[process-start] doc ${document_id}: V6 SUCCESS — mapper=${dispatch.mapper.slug} score=${dispatch.score.toFixed(2)}`,
    );
    await supabase
      .from("documents")
      .update({
        status: "parsed",
        ocr_text: docTab.textoCompleto,
        ocr_provider: "pdfjs_geometric",
        // `parsed` é coluna jsonb opcional — quando não existir no schema,
        // o update silenciosamente ignora. Migration pra criá-la fica em v7+.
        parsed: resultado,
        parsed_by: dispatch.mapper.slug,
        metadata: {
          extractor: "pdfjs_geometric",
          quality_score: docTab.qualidade.score,
          quality_reason: docTab.qualidade.razao,
          page_count: docTab.numeroPaginas,
          v6_mapper: dispatch.mapper.slug,
          v6_mapper_score: dispatch.score,
          v6_mapper_motivos: dispatch.motivos,
        },
      })
      .eq("id", document_id);
    return true;
  } catch (err) {
    console.warn(
      `[process-start] doc ${document_id}: caminho v6 lançou erro — caindo pro v5:`,
      err,
    );
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json();
    if (!document_id) return jsonResponse({ error: "document_id is required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header required" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Invalid authorization token" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();
    if (docError || !document) return jsonResponse({ error: "Document not found" }, 404);
    if (document.cases.criado_por !== user.id) {
      return jsonResponse({ error: "You don't have access to this document" }, 403);
    }

    const mimeType = document.mime_type || "";
    let newStatus = "processing";
    let processType = "unknown";

    if (OCR_MIME_TYPES.includes(mimeType)) {
      newStatus = "ocr_pending";
      processType = "ocr_image";
    } else if (PDF_MIME_TYPES.includes(mimeType)) {
      newStatus = "ocr_pending";
      processType = "ocr_pdf";
    } else if (DOCX_MIME_TYPES.includes(mimeType)) {
      newStatus = "chunk_pending";
      processType = "docx_extract";
    } else {
      newStatus = "ocr_pending";
      processType = "ocr_fallback";
    }

    console.log(`Document ${document_id}: mime=${mimeType}, processType=${processType}`);

    await supabase
      .from("documents")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...document.metadata,
          process_type: processType,
          process_started_at: new Date().toISOString(),
        },
      })
      .eq("id", document_id);

    const { data: signedUrlData } = await supabase.storage
      .from("juriscalculo-documents")
      .createSignedUrl(document.storage_path, 3600);

    if (!signedUrlData?.signedUrl) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Could not generate signed URL for file",
        })
        .eq("id", document_id);
      return jsonResponse({ error: "Could not access file in storage" }, 500);
    }

    await supabase
      .from("documents")
      .update({ arquivo_url: signedUrlData.signedUrl })
      .eq("id", document_id);

    // V6: para PDFs, tenta extrator geométrico ANTES de mandar pro Mistral.
    // Se sucesso, marca status='parsed' direto (sem invocar OCR).
    let v6Sucesso = false;
    if (PDF_MIME_TYPES.includes(mimeType)) {
      v6Sucesso = await tentarCaminhoV6(supabase, document_id, signedUrlData.signedUrl);
    }

    return jsonResponse({
      success: true,
      document_id,
      status: v6Sucesso ? "parsed" : newStatus,
      process_type: processType,
      mime_type: mimeType,
      v6_path: v6Sucesso ? "geometric_native" : "fallback_v5",
      message: v6Sucesso
        ? "Documento processado via extrator geométrico (V6) — sem invocar Mistral."
        : `Processing started. Type: ${processType}. Call ocr-document to continue.`,
    });
  } catch (error) {
    console.error("process-document-start error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
