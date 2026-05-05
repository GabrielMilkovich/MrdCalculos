// =====================================================
// EDGE FUNCTION: INICIAR PROCESSAMENTO DE DOCUMENTO
// =====================================================
// V6: tenta extrator geométrico (texto nativo + coordenadas) antes de
// agendar OCR Mistral. SOBRE PRODUÇÃO ATUAL:
//
//   O schema `documents` NÃO tem ainda colunas dedicadas pra v6
//   (parsed jsonb, parsed_by text, ocr_provider text). Até a migration
//   delas sair, a v6 grava SOMENTE em `metadata` (jsonb existente) e
//   NÃO sobrescreve `ocr_text` (parser v5 espera formato Mistral).
//   Status NUNCA é 'parsed' — usamos os valores originais para evitar
//   quebrar enums e RLS.
//
//   Resultado: hoje a v6 funciona como observabilidade — extrai e
//   mapeia em memória, registra telemetria em metadata, mas o pipeline
//   continua usando V5 para entregar o resultado final ao cliente.
//
//   PRÓXIMO PR (separado): migration que adiciona as 3 colunas + update
//   no client pra ler `metadata.v6_parsed` quando presente. Aí v6 entra
//   em ação real.

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
 * Caminho v6 em modo SAFE — gravação restrita a `metadata` jsonb.
 *
 * Comportamento atual:
 *   - Extrai e mapeia em memória.
 *   - Sucesso → grava telemetria em metadata.v6_* + parsed em
 *     metadata.v6_parsed. NÃO altera status, ocr_text ou outras colunas.
 *   - Falha (mapper null, qualidade ruim, exceção) → não grava nada.
 *
 * Pipeline V5 segue normal — Mistral é invocado, parser v5 roda. A v6
 * vira camada de observabilidade até as colunas dedicadas existirem
 * no schema.
 */
// deno-lint-ignore no-explicit-any
async function tentarCaminhoV6Safe(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  document_id: string,
  signedUrl: string,
  // deno-lint-ignore no-explicit-any
  metadataAtual: any,
): Promise<{ tentado: boolean; sucesso: boolean; mapper?: string }> {
  try {
    const bytes = await baixarBytes(signedUrl);
    if (!bytes) return { tentado: false, sucesso: false };
    const docTab = await extrairGeometrico(bytes);
    if (!docTab || docTab.qualidade.score < 0.7) {
      console.log(
        `[process-start] doc ${document_id}: v6 extrator score < 0.7 ou null — caminho v5`,
      );
      return { tentado: true, sucesso: false };
    }
    const dispatch = escolherMapper(docTab);
    if (!dispatch) {
      console.log(
        `[process-start] doc ${document_id}: v6 nenhum mapper aplica — caminho v5`,
      );
      return { tentado: true, sucesso: false };
    }
    const resultado = dispatch.mapper.mapear(docTab);
    if (!resultado) {
      console.log(
        `[process-start] doc ${document_id}: v6 mapper ${dispatch.mapper.slug} retornou null — caminho v5`,
      );
      return { tentado: true, sucesso: false };
    }
    // SUCESSO V6 — apenas grava em metadata jsonb (campo existente).
    // NÃO mexe em status, ocr_text, ocr_provider, parsed, parsed_by.
    console.log(
      `[process-start] doc ${document_id}: v6 SUCCESS — mapper=${dispatch.mapper.slug} score=${dispatch.score.toFixed(2)} (gravando só em metadata, pipeline continua via V5)`,
    );
    await supabase
      .from("documents")
      .update({
        metadata: {
          ...(metadataAtual ?? {}),
          v6_extractor: "pdfjs_geometric",
          v6_quality_score: docTab.qualidade.score,
          v6_quality_reason: docTab.qualidade.razao,
          v6_page_count: docTab.numeroPaginas,
          v6_mapper: dispatch.mapper.slug,
          v6_mapper_score: dispatch.score,
          v6_mapper_motivos: dispatch.motivos,
          v6_parsed: resultado, // serializável (apuracoes/competencias map)
          v6_attempted_at: new Date().toISOString(),
        },
      })
      .eq("id", document_id);
    return { tentado: true, sucesso: true, mapper: dispatch.mapper.slug };
  } catch (err) {
    console.warn(
      `[process-start] doc ${document_id}: caminho v6 lançou erro — caindo pro v5:`,
      err,
    );
    return { tentado: true, sucesso: false };
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

    // V6 modo SAFE — só grava em metadata, pipeline V5 continua normal.
    let v6Resultado = { tentado: false, sucesso: false, mapper: undefined as string | undefined };
    if (PDF_MIME_TYPES.includes(mimeType)) {
      v6Resultado = await tentarCaminhoV6Safe(
        supabase,
        document_id,
        signedUrlData.signedUrl,
        document.metadata,
      );
    }

    return jsonResponse({
      success: true,
      document_id,
      status: newStatus,
      process_type: processType,
      mime_type: mimeType,
      v6_attempted: v6Resultado.tentado,
      v6_success: v6Resultado.sucesso,
      v6_mapper: v6Resultado.mapper,
      message: `Processing started. Type: ${processType}. Call ocr-document to continue.`,
    });
  } catch (error) {
    console.error("process-document-start error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
