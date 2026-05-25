// =====================================================
// EDGE FUNCTION: INICIAR PROCESSAMENTO DE DOCUMENTO
// =====================================================
// V6: tenta extrator geométrico (texto nativo + coordenadas) antes de
// agendar OCR Mistral. Quando sucesso:
//   - Grava resultado serializado em `parsed` (jsonb dedicada).
//   - Grava slug do mapper em `parsed_by` (text).
//   - Grava 'pdfjs_geometric' em `ocr_provider`.
//   - Popula `ocr_text` com o textoCompleto do extrator (debug/UI).
//   - Marca status='ocr_done' (V5 já não roda — client lê parsed).
//
// Falha v6 (mapper null, score baixo, exceção) → fluxo V5 continua:
// agenda OCR Mistral, parser regex roda no client.

import { createClient } from "npm:@supabase/supabase-js@2";
import { extrairGeometrico } from "../_shared/extrator-geometrico.ts";
import { escolherEMapear, prewarmOntologiaIfNeeded } from "../_shared/mappers/dispatcher.ts";

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
 * Serializa Map<string, number> em objeto plano. Map não é JSON-friendly.
 */
// deno-lint-ignore no-explicit-any
function mapToObj(m: Map<string, any>): Record<string, any> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of m) out[k] = v;
  return out;
}

/**
 * Normaliza o resultado do mapper para JSON serializável.
 * `competencias` em ParseCartaoPontoResultDominio é Map — converte pra obj.
 */
// deno-lint-ignore no-explicit-any
function serializarParaParsed(resultado: any): Record<string, unknown> {
  if (!resultado || typeof resultado !== "object") return resultado;
  if (Array.isArray(resultado)) return resultado as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...resultado };
  if (out.competencias instanceof Map) {
    out.competencias = mapToObj(out.competencias as Map<string, unknown>);
  }
  return out;
}

/**
 * Caminho v6 REAL — grava em colunas dedicadas (parsed, parsed_by, ocr_provider).
 *
 * Sucesso: client lê `parsed` direto e pula o parser regex V5 + Mistral.
 * Falha:   pipeline V5 segue (Mistral OCR + regex).
 */
async function tentarCaminhoV6(
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
    // Sprint 3: escolherEMapear encapsula merge de PDFs híbridos de cartão
    // de ponto. Discriminated union preserva distinção telemétrica entre
    // "nenhum mapper aplica" e "mapper aplicou mas falhou em mapear()".
    //
    // Sprint 3c (2026-05-23): prewarm da ontologia V2 antes do mapper sync.
    // No-op se mapper escolhido não declara `requiresOntologiaPrewarm`.
    await prewarmOntologiaIfNeeded(docTab, supabase);
    const dispatch = escolherEMapear(docTab);
    if (dispatch.kind === "no_mapper_matched") {
      console.log(
        `[process-start] doc ${document_id}: v6 nenhum mapper aplica — caminho v5`,
      );
      return { tentado: true, sucesso: false };
    }
    if (dispatch.kind === "mapper_returned_null") {
      const slugs = dispatch.tentados.map((t) => t.mapper.slug).join(", ");
      console.log(
        `[process-start] doc ${document_id}: v6 mapper(s) [${slugs}] retornou null — caminho v5`,
      );
      return { tentado: true, sucesso: false };
    }
    const { executado } = dispatch;
    const parsedJson = serializarParaParsed(executado.resultado);
    const mappersLog =
      executado.mappers_executados.length > 1
        ? ` merged=[${executado.mappers_executados.join("+")}]`
        : "";
    console.log(
      `[process-start] doc ${document_id}: v6 SUCCESS — mapper=${executado.slug} score=${executado.score.toFixed(2)}${mappersLog} (gravando em parsed jsonb)`,
    );
    await supabase
      .from("documents")
      .update({
        parsed: parsedJson,
        parsed_by: executado.slug,
        ocr_provider: "pdfjs_geometric",
        // V6 popula ocr_text com o textoCompleto do extrator — UI continua
        // mostrando o "OCR" no painel de referência. Pipeline V5 (regex)
        // não roda mais porque o client detecta `parsed != null` e usa direto.
        ocr_text: docTab.textoCompleto,
        ocr_validated: true,
        status: "ocr_done",
        extracao_status: "done",
        updated_at: new Date().toISOString(),
        metadata: {
          ...(metadataAtual ?? {}),
          v6_extractor: "pdfjs_geometric",
          v6_quality_score: docTab.qualidade.score,
          v6_quality_reason: docTab.qualidade.razao,
          v6_page_count: docTab.numeroPaginas,
          v6_mapper: executado.slug,
          v6_mapper_score: executado.score,
          v6_mapper_motivos: executado.motivos,
          // Sprint 3: novo campo — lista de mappers que rodaram
          // (1 elemento em casos non-híbridos, 2+ em merge).
          v6_mappers_executados: executado.mappers_executados,
          v6_attempted_at: new Date().toISOString(),
        },
      })
      .eq("id", document_id);
    return { tentado: true, sucesso: true, mapper: executado.slug };
  } catch (err) {
    console.warn(
      `[process-start] doc ${document_id}: caminho v6 lançou erro — caindo pro v5:`,
      err,
    );
    return { tentado: true, sucesso: false };
  }
}

Deno.serve(async (req) => {
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
      .createSignedUrl(document.storage_path, 900); // TTL 15min

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

    // V6 — caminho real. Quando sucesso, grava parsed + parsed_by + ocr_provider
    // + ocr_text. Pipeline V5 (Mistral) é PULADO pelo client (vê parsed != null).
    let v6Resultado = { tentado: false, sucesso: false, mapper: undefined as string | undefined };
    if (PDF_MIME_TYPES.includes(mimeType)) {
      v6Resultado = await tentarCaminhoV6(
        supabase,
        document_id,
        signedUrlData.signedUrl,
        document.metadata,
      );
    }

    return jsonResponse({
      success: true,
      document_id,
      // V6 sucesso já marcou status='ocr_done'; senão segue para Mistral
      status: v6Resultado.sucesso ? "ocr_done" : newStatus,
      process_type: processType,
      mime_type: mimeType,
      v6_attempted: v6Resultado.tentado,
      v6_success: v6Resultado.sucesso,
      v6_mapper: v6Resultado.mapper,
      message: v6Resultado.sucesso
        ? `V6 extraiu via ${v6Resultado.mapper} — pipeline pronto, sem Mistral.`
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
