// =====================================================
// EDGE FUNCTION: OCR DE DOCUMENTOS — MISTRAL (SIMPLES)
// =====================================================
// Versão radicalmente simplificada para garantir confiabilidade:
//   - Sem chunking (Mistral OCR aceita PDFs até 50MB / 1000 páginas nativamente)
//   - Fluxo linear: upload Mistral Files → signed URL Mistral → /v1/ocr → save
//   - EdgeRuntime.waitUntil para não dar timeout da função HTTP (retorna 200
//     imediatamente, processa em background; cliente polla documents.status)
//   - Timeouts agressivos: se Mistral trava, documento marca "failed" em 3min
//   - Mensagens de erro claras salvas em documents.error_message
//
// Input: POST { document_id }
// Headers: Authorization: Bearer <user_token>
// Output imediato: 202 { accepted: true, document_id }  (OCR roda em bg)
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const MISTRAL_API = "https://api.mistral.ai";

// Timeouts (ms)
const UPLOAD_TIMEOUT = 60_000;   // upload PDF → Mistral
const URL_TIMEOUT = 15_000;      // obter signed URL
const OCR_TIMEOUT = 180_000;     // OCR end-to-end (máx 3min para PDFs grandes)

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return jsonResponse({ error: "document_id é obrigatório" }, 400);

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      return jsonResponse({
        error: "MISTRAL_API_KEY não configurada",
        hint: "Adicione em Supabase Dashboard → Edge Functions → Secrets",
      }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth (user)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header obrigatório" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    // Load + permission check
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();
    if (docError || !document) return jsonResponse({ error: "Documento não encontrado" }, 404);
    if (document.cases.criado_por !== user.id) {
      return jsonResponse({ error: "Sem acesso a este documento" }, 403);
    }

    // Signed URL fresca (arquivo_url pode estar expirada)
    let fileUrl: string | null = null;
    if (document.storage_path) {
      for (const bucket of ["juriscalculo-documents", "case-documents", "documents"]) {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(document.storage_path, 7200);
        if (data?.signedUrl) { fileUrl = data.signedUrl; break; }
      }
    }
    if (!fileUrl) fileUrl = document.arquivo_url;
    if (!fileUrl) return jsonResponse({ error: "Sem URL de download para o documento" }, 400);

    // Marca processing + limpa state anterior
    await supabase.from("documents").update({
      status: "ocr_running",
      processing_started_at: new Date().toISOString(),
      processing_completed_at: null,
      updated_at: new Date().toISOString(),
      error_message: null,
      ocr_text: null,
      ocr_chunks_done: 0,
      ocr_chunks_total: 1,
      ocr_chunks_failed: 0,
      ocr_validated: false,
    }).eq("id", document_id);

    // ========== PROCESSAMENTO EM BACKGROUND ==========
    // Retorna 202 imediatamente; OCR real roda em background task.
    // Cliente polla documents.status até chegar em ocr_done/failed.
    const bgTask = (async () => {
      const t0 = Date.now();
      try {
        console.log(`[ocr] ${document_id}: iniciando pipeline simples`);

        // 1) Baixa bytes do PDF
        const downResp = await fetchWithTimeout(fileUrl!, {}, UPLOAD_TIMEOUT);
        if (!downResp.ok) throw new Error(`Download do arquivo falhou: HTTP ${downResp.status}`);
        const bytes = new Uint8Array(await downResp.arrayBuffer());
        if (bytes.byteLength === 0) throw new Error("Arquivo vazio");
        if (bytes.byteLength > 50 * 1024 * 1024) {
          throw new Error(`Arquivo muito grande: ${(bytes.byteLength/1024/1024).toFixed(1)}MB (limite Mistral: 50MB)`);
        }
        console.log(`[ocr] ${document_id}: download ${Date.now()-t0}ms size=${bytes.byteLength}`);

        // 2) Upload para Mistral Files API
        const tUpload = Date.now();
        const fileId = await uploadToMistral(bytes, document.file_name || "document.pdf", MISTRAL_API_KEY);
        console.log(`[ocr] ${document_id}: upload mistral ${Date.now()-tUpload}ms file_id=${fileId}`);

        try {
          // 3) Obtém URL assinada do Mistral (expiry em HORAS, 1h basta)
          const tUrl = Date.now();
          const mistralUrl = await getMistralSignedUrl(fileId, MISTRAL_API_KEY);
          console.log(`[ocr] ${document_id}: got mistral url ${Date.now()-tUrl}ms`);

          // 4) Chama /v1/ocr com document_url
          const tOcr = Date.now();
          const ocrResult = await runMistralOcr(mistralUrl, MISTRAL_API_KEY);
          console.log(`[ocr] ${document_id}: ocr ${Date.now()-tOcr}ms pages=${ocrResult.pages.length}`);

          // 5) Junta markdown por página
          const fullText = ocrResult.pages
            .map((p: any, i: number) => `--- PAGE ${i+1} ---\n\n${p.markdown || ""}`)
            .join("\n\n");
          if (!fullText.trim()) throw new Error("OCR retornou texto vazio");

          // 6) Salva resultado
          await supabase.from("documents").update({
            status: "ocr_done",
            ocr_text: fullText.length > 10_000_000
              ? fullText.slice(0, 10_000_000) + "\n\n[... truncado em 10MB ...]"
              : fullText,
            page_count: ocrResult.pages.length,
            ocr_confidence: 0.95,  // Mistral não retorna score; assume alto
            ocr_confianca: 0.95,
            ocr_chunks_total: 1,
            ocr_chunks_done: 1,
            ocr_chunks_failed: 0,
            ocr_validated: false,
            processing_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null,
            metadata: {
              ...(document.metadata || {}),
              ocr_provider: "mistral-ocr",
              ocr_completed_at: new Date().toISOString(),
              ocr_duration_ms: Date.now() - t0,
              text_length: fullText.length,
              extracted_text_preview: fullText.slice(0, 500),
            },
          }).eq("id", document_id);

          console.log(`[ocr] ${document_id}: CONCLUÍDO em ${Date.now()-t0}ms, ${fullText.length} chars`);
        } finally {
          // cleanup Mistral file (async, best-effort)
          deleteMistralFile(fileId, MISTRAL_API_KEY).catch((e) =>
            console.warn(`[ocr] ${document_id}: delete file falhou:`, e)
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ocr] ${document_id}: FALHOU:`, msg);
        await supabase.from("documents").update({
          status: "failed",
          error_message: msg.slice(0, 500),
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(document.metadata || {}),
            ocr_failed_at: new Date().toISOString(),
            ocr_provider: "mistral-ocr",
            ocr_error: msg.slice(0, 500),
            ocr_duration_ms: Date.now() - t0,
          },
        }).eq("id", document_id);
      }
    })();

    // EdgeRuntime.waitUntil garante que a bgTask continua rodando após o
    // retorno HTTP (até 10min). Fallback: aguarda se waitUntil não existir.
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(bgTask);
    } else {
      // Deno puro (dev local) — aguarda
      await bgTask;
    }

    return jsonResponse({
      success: true,
      accepted: true,
      document_id,
      status: "ocr_running",
      message: "OCR iniciado em background. Acompanhe documents.status (ocr_done / failed).",
    }, 202);

  } catch (err) {
    console.error("[ocr] Handler error:", err);
    return jsonResponse({
      error: err instanceof Error ? err.message : "Erro desconhecido",
    }, 500);
  }
});

// =====================================================
// HELPERS
// =====================================================

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function uploadToMistral(
  bytes: Uint8Array,
  filename: string,
  apiKey: string,
): Promise<string> {
  const form = new FormData();
  form.append("purpose", "ocr");
  form.append("file", new Blob([bytes], { type: "application/pdf" }), filename);

  const resp = await fetchWithTimeout(
    `${MISTRAL_API}/v1/files`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    },
    UPLOAD_TIMEOUT,
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Upload Mistral falhou (${resp.status}): ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!data.id) throw new Error("Mistral upload sem id na resposta");
  return data.id as string;
}

async function getMistralSignedUrl(fileId: string, apiKey: string): Promise<string> {
  const resp = await fetchWithTimeout(
    `${MISTRAL_API}/v1/files/${fileId}/url?expiry=1`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
    URL_TIMEOUT,
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Mistral signed URL falhou (${resp.status}): ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!data.url) throw new Error("Mistral URL endpoint sem url na resposta");
  return data.url as string;
}

async function runMistralOcr(documentUrl: string, apiKey: string): Promise<{ pages: any[] }> {
  const resp = await fetchWithTimeout(
    `${MISTRAL_API}/v1/ocr`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: documentUrl },
      }),
    },
    OCR_TIMEOUT,
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Mistral OCR falhou (${resp.status}): ${txt.slice(0, 250)}`);
  }
  const data = await resp.json();
  if (!Array.isArray(data.pages)) throw new Error("Mistral OCR response sem pages[]");
  return data;
}

async function deleteMistralFile(fileId: string, apiKey: string): Promise<void> {
  await fetchWithTimeout(
    `${MISTRAL_API}/v1/files/${fileId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } },
    10_000,
  );
}
