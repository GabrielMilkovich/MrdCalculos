// =====================================================
// ocr-document — versão simplificada (match n8n workflow)
// =====================================================
// Mimics o fluxo do n8n que funciona em produção:
//   1. POST /v1/files (upload PDF/imagem)        → file_id
//   2. GET  /v1/files/{id}/url                   → signed URL Mistral
//   3. POST /v1/ocr  { document_url: ... }       → resultado
//   4. DELETE /v1/files/{id}                     (cleanup, best-effort)
//
// Diferente da versão anterior: SEM splitting, SEM parallel chunks, SEM
// retryWeakPages, SEM native PDF extraction, SEM EdgeRuntime.waitUntil.
// Síncrono — handler não retorna até o OCR completar (Mistral leva 5-15s
// na média; edge timeout é 150s, com folga 10x).
//
// Vantagens:
//   - 1 ponto de falha (chamada Mistral), não 5
//   - Cliente recebe resultado direto, sem polling
//   - Sem background tasks que podem ser killed silenciosamente
//   - Match 1:1 com workflow n8n já comprovado em produção
//
// Limites:
//   - Mistral OCR API aceita até 50MB / 1000 páginas. Limitamos em 30MB
//     pra ter folga no edge runtime payload limit.
//   - PDFs maiores: usuário deve dividir manualmente.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { arrayBufferToBase64 } from "../_shared/pdf-utils.ts";
import { ocrBytes, runOcr, type MistralOcrOptions } from "../_shared/mistral-ocr.ts";

const ABSOLUTE_MAX_BYTES = 30 * 1024 * 1024; // 30MB

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"]);

function detectMimeFromName(name: string | null | undefined): string {
  if (!name) return "application/pdf";
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/pdf";
}

async function downloadBytes(url: string): Promise<ArrayBuffer> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Falha ao baixar arquivo do storage: ${resp.status} ${resp.statusText}`);
  }
  return resp.arrayBuffer();
}

function detectDocType(text: string): string {
  const t = text.toLowerCase().slice(0, 5000);
  if (/cart[ãa]o\s*(de\s*)?ponto|espelho\s*de\s*ponto/.test(t)) return "cartao_ponto";
  if (/holerite|contracheque|recibo\s*de\s*pagamento|sal[áa]rio.*l[íi]quido/.test(t)) return "holerite";
  if (/ficha\s*financeira/.test(t)) return "ficha_financeira";
  if (/ctps|carteira\s*de\s*trabalho/.test(t)) return "ctps";
  if (/contrato\s*de\s*trabalho|contrato\s*individual/.test(t)) return "contrato";
  if (/sentença|senten[çc]a|ac[óo]rd[ãa]o|despacho/.test(t)) return "sentenca";
  if (/conven[çc][ãa]o\s*coletiva|cct|acordo\s*coletivo/.test(t)) return "cct";
  if (/extrato\s*fgts|fgts\s*pf/.test(t)) return "fgts";
  if (/peti[çc][ãa]o\s*inicial|exordial/.test(t)) return "peticao";
  if (/trct|termo\s*de\s*rescis[ãa]o/.test(t)) return "trct";
  return "outro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const document_id: string | undefined = body?.document_id;
    if (!document_id) return jsonResponse({ error: "document_id obrigatório" }, 400);

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      return jsonResponse({ error: "MISTRAL_API_KEY não configurado nas Edge Function Secrets." }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header obrigatório" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega doc + ownership check
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();
    if (docError || !document) return jsonResponse({ error: "Documento não encontrado" }, 404);
    if (document.cases.criado_por !== user.id) {
      return jsonResponse({ error: "Sem acesso a este documento" }, 403);
    }

    // Idempotência: se já está processando, não duplica.
    if (document.status === "ocr_running") {
      const startedAt = document.processing_started_at
        ? new Date(document.processing_started_at).getTime()
        : 0;
      const elapsedMs = Date.now() - startedAt;
      const STALE_AFTER_MS = 60 * 1000; // 60s — versão simplificada não fica > 30s
      if (elapsedMs < STALE_AFTER_MS) {
        return jsonResponse(
          { error: "OCR já em execução", hint: `Processamento iniciou há ${Math.round(elapsedMs / 1000)}s.` },
          409,
        );
      }
      console.warn(`[ocr] doc ${document_id} 'ocr_running' há ${Math.round(elapsedMs / 1000)}s — recuperando`);
    }

    // Regenera signed URL pra storage (URL salva no upload pode ter expirado).
    let fileUrl: string | null = null;
    if (document.storage_path) {
      const buckets = ["juriscalculo-documents", "case-documents", "documents"];
      for (const b of buckets) {
        const { data } = await supabase.storage.from(b).createSignedUrl(document.storage_path, 7200);
        if (data?.signedUrl) {
          fileUrl = data.signedUrl;
          break;
        }
      }
    }
    if (!fileUrl) fileUrl = (document.arquivo_url as string | null) ?? null;
    if (!fileUrl) return jsonResponse({ error: "Sem URL de download para o documento" }, 400);

    // Marca em processamento
    await supabase
      .from("documents")
      .update({
        status: "ocr_running",
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
        ocr_chunks_total: 1,
        ocr_chunks_done: 0,
      })
      .eq("id", document_id);

    const t0 = Date.now();

    try {
      const buffer = await downloadBytes(fileUrl);
      const sizeBytes = buffer.byteLength;
      if (sizeBytes > ABSOLUTE_MAX_BYTES) {
        throw new Error(
          `Arquivo tem ${(sizeBytes / 1024 / 1024).toFixed(1)}MB, acima do limite de ${(ABSOLUTE_MAX_BYTES / 1024 / 1024).toFixed(0)}MB. Divida o PDF em arquivos menores.`,
        );
      }

      const mimeType = document.mime_type || detectMimeFromName(document.file_name);
      const isImage = IMAGE_MIMES.has(mimeType);
      const mistralOpts: MistralOcrOptions = { apiKey: MISTRAL_API_KEY };

      // Chamada única ao Mistral — sem splitting, sem retry-weak-pages.
      // Para PDF: ocrBytes faz o fluxo files→get-url→ocr→delete (igual n8n).
      // Para imagem: data URL inline.
      let result;
      if (isImage) {
        const base64 = arrayBufferToBase64(buffer);
        result = await runOcr(
          { type: "image_url", image_url: `data:${mimeType};base64,${base64}` },
          mistralOpts,
        );
      } else {
        result = await ocrBytes(new Uint8Array(buffer), document.file_name ?? "documento.pdf", mistralOpts);
      }

      const markdown = result.pages
        .map((p, i) => `--- PAGE ${i + 1} ---\n\n${p.markdown}`)
        .join("\n\n");

      const docType = detectDocType(markdown);
      const currentTipo = (document as { tipo?: string }).tipo;
      const shouldAutoSetTipo = docType !== "outro" && (!currentTipo || currentTipo === "outro");

      const durationMs = Date.now() - t0;

      await supabase
        .from("documents")
        .update({
          status: "ocr_done",
          ...(shouldAutoSetTipo ? { tipo: docType } : {}),
          page_count: result.pages.length,
          ocr_confidence: 1.0, // Mistral não retorna confidence; assumimos alto
          ocr_chunks_total: 1,
          ocr_chunks_done: 1,
          ocr_chunks_failed: 0,
          ocr_text:
            markdown.length > 10_000_000
              ? markdown.slice(0, 10_000_000) + "\n\n[... truncado ...]"
              : markdown,
          ocr_validated: false,
          ocr_validated_at: null,
          ocr_validated_by: null,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(document.metadata || {}),
            ocr_provider: "mistral-ocr",
            ocr_completed_at: new Date().toISOString(),
            ocr_duration_ms: durationMs,
            ocr_doc_type: docType,
            text_length: markdown.length,
            extracted_text_preview: markdown.slice(0, 500),
            mistral_model: result.model,
            mistral_usage: result.usage,
          },
        })
        .eq("id", document_id);

      console.log(`[ocr] doc ${document_id} concluído em ${durationMs}ms (${result.pages.length} páginas)`);

      return jsonResponse({
        success: true,
        document_id,
        status: "ocr_done",
        page_count: result.pages.length,
        text_length: markdown.length,
        duration_ms: durationMs,
        doc_type: docType,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ocr] OCR falhou para doc ${document_id}:`, err);

      try {
        await supabase
          .from("documents")
          .update({
            status: "ocr_failed",
            error_message: msg.slice(0, 1000),
            processing_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            retry_count: ((document as { retry_count?: number }).retry_count || 0) + 1,
            metadata: {
              ...(document.metadata || {}),
              ocr_failed_at: new Date().toISOString(),
              ocr_provider: "mistral-ocr",
              ocr_error: msg.slice(0, 1000),
            },
          })
          .eq("id", document_id);
      } catch (updateErr) {
        console.error(`[ocr] falha ao marcar doc como failed:`, updateErr);
      }

      return jsonResponse(
        { success: false, document_id, status: "ocr_failed", error: msg },
        500,
      );
    }
  } catch (err) {
    console.error("[ocr] erro fatal no handler:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
  }
});
