// =====================================================
// EDGE FUNCTION: PIPELINE COMPLETO PÓS-UPLOAD (V6 + Mistral fallback)
// =====================================================
// Chamado pelo DocumentsManager do frontend após cada upload.
// Orquestra:
//   0. (G0) **Tenta V6 — extrator geométrico + mappers**.
//      Quando sucesso: grava `parsed/parsed_by/ocr_provider/ocr_text` direto
//      do PDF nativo, popula `metadata.v6_outcome='success'`, e segue
//      para chunk-and-embed (R2 — embeddings continuam gerados).
//      Quando falha: registra outcome estruturado em metadata e segue para
//      o caminho V5.
//   1. ocr-document  → Mistral OCR (apenas se V6 não conseguiu).
//   2. chunk-and-embed → divide texto em chunks + gera embeddings OpenAI.
//
// IDEMPOTÊNCIA (R1): se o doc já tem `parsed_by != null` (V6 já rodou
// numa execução anterior — ex: reprocess-v6, ou retry da própria função),
// pulamos V6 + Mistral e vamos direto para chunk-and-embed (se necessário).
//
// LOG ESTRUTURADO (R3): metadata.v6_outcome assume 5+ valores discretos
// pra alimentar o painel de telemetria sem arqueologia.
//
// Mudanças vs versão anterior:
//   - V6 plugado ao fluxo real (antes era só process-document-start, que
//     nenhum cliente chamava — era código zumbi).
//   - Mistral só roda quando V6 falha (PDF escaneado, mapper genérico, etc.).
//   - chunk-and-embed continua disparado em ambos os caminhos (R2).
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { extrairGeometrico } from "../_shared/extrator-geometrico.ts";
import { escolherMapper } from "../_shared/mappers/dispatcher.ts";

// Possíveis transições do caminho V6. Vira `metadata.v6_outcome`. Cada
// valor deve ser INDIVÍDUAL (não combinado) — query `WHERE v6_outcome = X`
// vira métrica direta.
type V6Outcome =
  | "success"
  | "not_pdf"                  // mime_type != application/pdf
  | "pdf_download_failed"      // signed URL ok mas fetch falhou
  | "pdf_extraction_failed"    // unpdf não carregou ou doc.numPages = 0
  | "score_below_threshold"    // extrator extraiu, qualidade < 0.7
  | "no_mapper_matched"        // nenhum mapper aceitou o doc
  | "mapper_returned_null"     // mapper aceitou mas mapear() retornou null
  | "exception";               // erro não previsto no try/catch

interface V6Tentativa {
  outcome: V6Outcome;
  mapper?: string;
  score?: number;
  errorMessage?: string;
  // Apenas quando outcome = 'success':
  parsedJson?: Record<string, unknown>;
  textoCompleto?: string;
  pageCount?: number;
  qualidadeRazao?: string;
  // Sample do textoCompleto pra debugging quando V6 EXTRAIU mas mapper não
  // casou. Permite calibrar detectores com base em texto REAL produzido pelo
  // unpdf, não fixture sintética.
  textPreview?: string;
  textFullLength?: number;
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

// deno-lint-ignore no-explicit-any
function mapToObj(m: Map<string, any>): Record<string, any> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of m) out[k] = v;
  return out;
}

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
 * Roda o pipeline V6 (extrator geométrico → escolha de mapper → mapeamento).
 * Não faz side-effects — devolve a tentativa pra o caller decidir o que fazer.
 */
async function tentarV6(
  // deno-lint-ignore no-explicit-any
  doc: any,
  signedUrl: string,
): Promise<V6Tentativa> {
  try {
    if (doc.mime_type !== "application/pdf") {
      return { outcome: "not_pdf" };
    }
    const bytes = await baixarBytes(signedUrl);
    if (!bytes) {
      return { outcome: "pdf_download_failed" };
    }
    const docTab = await extrairGeometrico(bytes);
    if (!docTab) {
      return {
        outcome: "pdf_extraction_failed",
        errorMessage: "extrairGeometrico devolveu null (PDF sem texto nativo ou unpdf falhou)",
      };
    }
    // Sample do textoCompleto pra qualquer outcome pós-extração — debugging.
    const textPreview = docTab.textoCompleto.slice(0, 4000);
    const textFullLength = docTab.textoCompleto.length;
    if (docTab.qualidade.score < 0.7) {
      return {
        outcome: "score_below_threshold",
        score: docTab.qualidade.score,
        errorMessage: docTab.qualidade.razao,
        textPreview,
        textFullLength,
        pageCount: docTab.numeroPaginas,
      };
    }
    const dispatch = escolherMapper(docTab);
    if (!dispatch) {
      return {
        outcome: "no_mapper_matched",
        score: docTab.qualidade.score,
        qualidadeRazao: docTab.qualidade.razao,
        pageCount: docTab.numeroPaginas,
        textPreview,
        textFullLength,
      };
    }
    const resultado = dispatch.mapper.mapear(docTab);
    if (!resultado) {
      return {
        outcome: "mapper_returned_null",
        mapper: dispatch.mapper.slug,
        score: dispatch.score,
        pageCount: docTab.numeroPaginas,
        textPreview,
        textFullLength,
      };
    }
    return {
      outcome: "success",
      mapper: dispatch.mapper.slug,
      score: dispatch.score,
      parsedJson: serializarParaParsed(resultado),
      textoCompleto: docTab.textoCompleto,
      pageCount: docTab.numeroPaginas,
      qualidadeRazao: docTab.qualidade.razao,
    };
  } catch (err) {
    return {
      outcome: "exception",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Constrói o objeto que vai pra `metadata.v6_*` — log estruturado da
 * tentativa V6 pra alimentar a telemetria/dashboard sem arqueologia.
 */
function metadataV6(t: V6Tentativa): Record<string, unknown> {
  return {
    v6_attempted_at: new Date().toISOString(),
    v6_outcome: t.outcome,
    v6_mapper_tried: t.mapper ?? null,
    v6_score: t.score ?? null,
    v6_page_count: t.pageCount ?? null,
    v6_quality_reason: t.qualidadeRazao ?? null,
    v6_error_message: t.errorMessage ?? null,
    // Sample do texto extraído quando mapper falha — alimenta calibração
    // com texto REAL do unpdf em produção (não fixture sintética).
    v6_text_preview: t.textPreview ?? null,
    v6_text_full_length: t.textFullLength ?? null,
  };
}

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
    // numa chamada anterior (parsed_by != null), pulamos V6 + Mistral
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
      console.log(`[pipeline] doc ${document_id}: idempotência — parsed_by=${doc.parsed_by}, skip V6+Mistral`);
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
      // Sem texto — cai pra Mistral mesmo (defesa: V6 deveria ter populado ocr_text).
    }

    // ===== G0: Tenta caminho V6 antes do Mistral =====
    let v6: V6Tentativa | null = null;
    if (doc.mime_type === "application/pdf") {
      const { data: signed } = await supabase.storage
        .from("juriscalculo-documents")
        .createSignedUrl(doc.storage_path, 3600);
      if (signed?.signedUrl) {
        v6 = await tentarV6(doc, signed.signedUrl);
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
          // (nada de markdown sujo do Mistral). Custo OpenAI menor + qualidade
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
            message: `V6 extraiu via ${v6.mapper} (${v6.pageCount} pg) — sem Mistral. ${chunkData?.chunks_created ?? "?"} chunks gerados.`,
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

    // ===== Caminho V5: OCR Mistral + chunk-and-embed (mesmo de antes) =====
    console.log(`[pipeline] doc ${document_id}: caminho V5 (Mistral) — V6 outcome=${v6?.outcome ?? "skipped"}`);
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
      console.warn(`[pipeline] chunking falhou (OCR Mistral preservado):`, chunkError);
      return jsonResponse({
        success: true,
        partial: true,
        document_id,
        path: "v5_chunk_failed",
        v6: v6 ?? { outcome: "skipped" },
        ocr: ocrData,
        chunking_error: chunkError.message || String(chunkError),
        message: "OCR Mistral concluído, chunking falhou. Rode chunk-and-embed novamente.",
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
