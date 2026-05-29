// =====================================================
// EDGE FUNCTION: REPROCESSAR V6 (admin)
// =====================================================
// Re-roda o pipeline V6 (extrator geométrico + mapper) para um documento
// específico OU em lote (parsed IS NULL). Usado para documentos enviados
// ANTES do deploy V6 — eles ficam com `parsed=null` e o parser regex
// sobre OCR Mistral falha em layouts complexos (ex: Via Varejo Layout B
// colapsado → "Nenhuma apuração extraída").
//
// Auth: JWT do usuário (verify_jwt=true). Ownership do `case` é validada
// — só processa docs cujo case foi criado pelo usuário autenticado.
//
// Body:
//   { document_id: string }      → reprocessa 1 doc específico
//   { limit?: number }           → reprocessa até N docs sem `parsed`
//                                  (default 1, máx 50) do usuário.

import { createClient } from "npm:@supabase/supabase-js@2";
import { extrairGeometrico } from "../_shared/extrator-geometrico.ts";
import type { DocumentoTabular } from "../_shared/documento-tabular.ts";
import { escolherEMapear, prewarmOntologiaIfNeeded } from "../_shared/mappers/dispatcher.ts";
import { sanitizePII } from "../_shared/sanitize-pii.ts";
import { parseFichaFinanceiraDeterministico } from "../_shared/parsers/ficha-financeira-deterministic.ts";
import { mapperFichaFinanceiraViaVarejo } from "../_shared/mappers/ficha-financeira-via-varejo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// deno-lint-ignore no-explicit-any
function mapToObj(m: Map<string, any>): Record<string, any> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of m) out[k] = v;
  return out;
}

// deno-lint-ignore no-explicit-any
function serializarParaParsed(resultado: any): Record<string, unknown> {
  if (!resultado || typeof resultado !== "object") return resultado;
  if (Array.isArray(resultado)) {
    return resultado as unknown as Record<string, unknown>;
  }
  const out: Record<string, unknown> = { ...resultado };
  if (out.competencias instanceof Map) {
    out.competencias = mapToObj(out.competencias as Map<string, unknown>);
  }
  return out;
}

type V6Outcome =
  | "success"
  | "not_pdf"
  | "pdf_download_failed"
  | "pdf_extraction_failed"
  | "score_below_threshold"
  | "no_mapper_matched"
  | "mapper_returned_null"
  | "exception";

interface ProcessamentoResult {
  id: string;
  sucesso: boolean;
  outcome?: V6Outcome;
  mapper?: string;
  razao?: string;
  /** Sample primeiros 4KB do textoCompleto extraído — alimenta calibração. */
  textPreview?: string;
  textFullLength?: number;
  score?: number;
  pageCount?: number;
}

function metadataV6Falha(r: ProcessamentoResult): Record<string, unknown> {
  return {
    v6_attempted_at: new Date().toISOString(),
    v6_outcome: r.outcome ?? "exception",
    v6_mapper_tried: r.mapper ?? null,
    v6_score: r.score ?? null,
    v6_page_count: r.pageCount ?? null,
    v6_error_message: r.razao ?? null,
    v6_text_preview: r.textPreview ?? null,
    v6_text_full_length: r.textFullLength ?? null,
  };
}

/**
 * F3.3 — Dispara chunk-and-embed após sucesso V6 pra popular doc_chunks
 * (RAG semantic search). Antes desta correção, "Reprocessar V6" gravava
 * `parsed/ocr_text` mas RAG ficava cego — 0 chunks em produção apesar de
 * 35+ docs com texto extraído.
 *
 * Falha silenciosa: erro de chunk-and-embed loga mas NÃO bloqueia o
 * retorno do reprocess (parsed já foi gravado, vale o esforço parcial).
 */
async function disparaChunkAndEmbed(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  documentId: string,
  textoCompleto: string,
  authHeader: string,
): Promise<{ ok: boolean; chunks_created?: number; error?: string }> {
  if (!textoCompleto || textoCompleto.length < 20) {
    return { ok: false, error: "texto curto (< 20 chars)" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("chunk-and-embed", {
      body: { document_id: documentId, extracted_text: textoCompleto },
      headers: { Authorization: authHeader },
    });
    if (error) {
      console.warn(
        `[reprocess-v6] chunk-and-embed para ${documentId} falhou:`,
        error,
      );
      return { ok: false, error: error.message ?? String(error) };
    }
    return {
      ok: true,
      chunks_created: data?.chunks_created ?? 0,
    };
  } catch (err) {
    console.warn(
      `[reprocess-v6] chunk-and-embed throw para ${documentId}:`,
      err,
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fallback determinístico de Ficha Financeira sobre texto cru extraído.
 *
 * O parser `parseFichaFinanceiraDeterministico` é robusto e opera direto no
 * texto (regex), independente do score de qualidade ou do detector do mapper
 * Via Varejo (que tem regex estrita e às vezes nega). Por isso é seguro
 * tentá-lo SEMPRE que houver texto de ficha — inclusive quando o score ficou
 * abaixo do limiar (fichas ADP são densas em espaço de alinhamento) ou quando
 * nenhum mapper casou.
 *
 * Retorna o resultado de sucesso, ou `null` quando não é ficha / o parser não
 * encontrou rubricas (o caller decide o próximo passo).
 */
async function tentarFichaFallback(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  doc: any,
  docTab: DocumentoTabular,
  authHeader: string,
): Promise<ProcessamentoResult | null> {
  const ehFicha =
    doc.tipo_extracao === "ficha_financeira" ||
    /ficha\s*financeira/i.test(docTab.textoCompleto.slice(0, 5000));
  if (!ehFicha) return null;
  try {
    const parseResult = parseFichaFinanceiraDeterministico(docTab.textoCompleto);
    if (!parseResult || parseResult.rubricas.length === 0) return null;
    const dominio = mapperFichaFinanceiraViaVarejo.mapear({
      textoCompleto: docTab.textoCompleto,
    } as Parameters<typeof mapperFichaFinanceiraViaVarejo.mapear>[0]);
    if (!dominio) return null;
    await supabase
      .from("documents")
      .update({
        parsed: dominio,
        parsed_by: "ficha-financeira-fallback-determinist",
        ocr_provider: "pdfjs_geometric",
        ocr_text: docTab.textoCompleto,
        ocr_validated: true,
        ocr_confidence: docTab.qualidade.score,
        status: "ocr_done",
        extracao_status: "done",
        error_message: null,
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(doc.metadata ?? {}),
          v6_attempted_at: new Date().toISOString(),
          v6_outcome: "ficha_financeira_fallback",
          v6_score: docTab.qualidade.score,
          v6_page_count: docTab.numeroPaginas,
          v6_reprocessed_at: new Date().toISOString(),
          v6_fallback_ficha_financeira: true,
        },
      })
      .eq("id", doc.id);
    const chunkResult = await disparaChunkAndEmbed(
      supabase,
      doc.id,
      docTab.textoCompleto,
      authHeader,
    );
    return {
      id: doc.id,
      sucesso: true,
      outcome: "success",
      mapper: "ficha-financeira-fallback-determinist",
      score: docTab.qualidade.score,
      pageCount: docTab.numeroPaginas,
      razao: `${parseResult.rubricas.length} rubricas · parser determinístico` +
        (chunkResult.ok
          ? ` · ${chunkResult.chunks_created ?? "?"} chunks RAG`
          : ` · chunk-and-embed falhou`),
    };
  } catch (err) {
    console.error(
      `[reprocess-v6] ${doc.id} ficha_financeira fallback exception:`,
      err,
    );
    return null;
  }
}

async function processarDoc(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  doc: any,
  authHeader: string,
): Promise<ProcessamentoResult> {
  if (!doc.storage_path) {
    return { id: doc.id, sucesso: false, outcome: "exception", razao: "sem storage_path" };
  }
  const { data: signedUrlData } = await supabase.storage
    .from("juriscalculo-documents")
    .createSignedUrl(doc.storage_path, 900); // TTL 15min
  if (!signedUrlData?.signedUrl) {
    return { id: doc.id, sucesso: false, outcome: "pdf_download_failed", razao: "sem signed url" };
  }
  const bytes = await baixarBytes(signedUrlData.signedUrl);
  if (!bytes) {
    return { id: doc.id, sucesso: false, outcome: "pdf_download_failed", razao: "falha download" };
  }
  const docTab = await extrairGeometrico(bytes);
  if (!docTab) {
    return {
      id: doc.id,
      sucesso: false,
      outcome: "pdf_extraction_failed",
      razao: "extrairGeometrico retornou null (PDF sem texto nativo ou unpdf falhou)",
    };
  }
  // Captura sample do textoCompleto pra qualquer outcome pós-extração.
  // LGPD: sanitiza PII antes de gravar em metadata jsonb.
  const textPreview = sanitizePII(docTab.textoCompleto.slice(0, 4000));
  const textFullLength = docTab.textoCompleto.length;
  if (docTab.qualidade.score < 0.7) {
    // Defesa: fichas ADP são densas em espaço de alinhamento e podem pontuar
    // abaixo do limiar mesmo com texto nativo perfeito. O parser
    // determinístico não depende do score — tenta antes de desistir.
    const fb = await tentarFichaFallback(supabase, doc, docTab, authHeader);
    if (fb) return fb;
    return {
      id: doc.id,
      sucesso: false,
      outcome: "score_below_threshold",
      razao: `score ${docTab.qualidade.score.toFixed(2)} — ${docTab.qualidade.razao}`,
      score: docTab.qualidade.score,
      pageCount: docTab.numeroPaginas,
      textPreview,
      textFullLength,
    };
  }
  // Sprint 3: escolherEMapear encapsula merge de PDFs híbridos de cartão
  // de ponto. Discriminated union preserva telemetria granular.
  //
  // Sprint 3c (2026-05-23): prewarm da ontologia V2 antes do mapper sync.
  // No-op se mapper escolhido não declara `requiresOntologiaPrewarm`.
  await prewarmOntologiaIfNeeded(docTab, supabase);
  // BUG FIX (2026-05-29): inferir tipo_extracao do texto se vier vazio.
  // Sem isso, os fallbacks abaixo (CTPS/ficha_financeira) nunca casam quando
  // o documento foi uploadado sem tipo definido.
  if (
    !doc.tipo_extracao ||
    doc.tipo_extracao === "outros" ||
    doc.tipo_extracao === "outro"
  ) {
    const t = docTab.textoCompleto.toLowerCase().slice(0, 5000);
    if (/ficha\s*financeira/.test(t)) doc.tipo_extracao = "ficha_financeira";
    else if (/ctps|carteira\s*de\s*trabalho/.test(t)) doc.tipo_extracao = "ctps";
  }

  const dispatch = escolherEMapear(docTab);
  if (dispatch.kind === "no_mapper_matched") {
    // Ficha Financeira fallback: parser determinístico no texto cru. Cobre
    // o caso onde o detector do mapper Via Varejo nega mas o parser funciona.
    const fb = await tentarFichaFallback(supabase, doc, docTab, authHeader);
    if (fb) return fb;

    // CTPS V2: extrator geométrico produziu texto de qualidade mas não existe
    // mapper pra CTPS no dispatcher (o parser V2 roda no cliente). Grava o
    // texto geométrico como `ocr_provider='pdfjs_geometric'` pra o export
    // `per-doc/index.ts` acionar o parser V2 client-side.
    if (doc.tipo_extracao === "ctps") {
      await supabase
        .from("documents")
        .update({
          parsed: null,
          parsed_by: "ctps-v2-text",
          ocr_provider: "pdfjs_geometric",
          ocr_text: docTab.textoCompleto,
          ocr_validated: true,
          status: "ocr_done",
          extracao_status: "done",
          updated_at: new Date().toISOString(),
          metadata: {
            ...(doc.metadata ?? {}),
            v6_attempted_at: new Date().toISOString(),
            v6_outcome: "ctps_text_only",
            v6_score: docTab.qualidade.score,
            v6_quality_reason: docTab.qualidade.razao,
            v6_page_count: docTab.numeroPaginas,
            v6_text_full_length: docTab.textoCompleto.length,
            v6_reprocessed_at: new Date().toISOString(),
          },
        })
        .eq("id", doc.id);

      const chunkResult = await disparaChunkAndEmbed(
        supabase,
        doc.id,
        docTab.textoCompleto,
        authHeader,
      );

      return {
        id: doc.id,
        sucesso: true,
        outcome: "success",
        mapper: "ctps-v2-text",
        score: docTab.qualidade.score,
        pageCount: docTab.numeroPaginas,
        razao: `score ${docTab.qualidade.score.toFixed(2)} · texto geométrico CTPS V2` +
          (chunkResult.ok
            ? ` · ${chunkResult.chunks_created ?? "?"} chunks RAG`
            : ` · chunk-and-embed falhou (${chunkResult.error ?? "?"}) — re-rodar`),
      };
    }

    return {
      id: doc.id,
      sucesso: false,
      outcome: "no_mapper_matched",
      razao: "nenhum mapper aplica",
      score: docTab.qualidade.score,
      pageCount: docTab.numeroPaginas,
      textPreview,
      textFullLength,
    };
  }
  if (dispatch.kind === "mapper_returned_null") {
    const slugs = dispatch.tentados.map((t) => t.mapper.slug).join(", ");
    const primeiroSlug = dispatch.tentados[0]?.mapper.slug ?? "unknown";
    return {
      id: doc.id,
      sucesso: false,
      outcome: "mapper_returned_null",
      mapper: primeiroSlug,
      razao: `mapper(s) [${slugs}] retornou null`,
      score: dispatch.tentados[0]?.score ?? 0,
      pageCount: docTab.numeroPaginas,
      textPreview,
      textFullLength,
    };
  }
  const { executado } = dispatch;
  const parsedJson = serializarParaParsed(executado.resultado);
  await supabase
    .from("documents")
    .update({
      parsed: parsedJson,
      parsed_by: executado.slug,
      ocr_provider: "pdfjs_geometric",
      ocr_text: docTab.textoCompleto,
      ocr_validated: true,
      status: "ocr_done",
      extracao_status: "done",
      updated_at: new Date().toISOString(),
      metadata: {
        ...(doc.metadata ?? {}),
        v6_attempted_at: new Date().toISOString(),
        v6_outcome: "success",
        v6_extractor: "pdfjs_geometric",
        v6_quality_score: docTab.qualidade.score,
        v6_quality_reason: docTab.qualidade.razao,
        v6_page_count: docTab.numeroPaginas,
        v6_mapper: executado.slug,
        v6_mapper_tried: executado.slug,
        v6_mapper_score: executado.score,
        v6_mapper_motivos: executado.motivos,
        // Sprint 3 — lista de mappers que rodaram (1 elemento se não-híbrido)
        v6_mappers_executados: executado.mappers_executados,
        v6_reprocessed_at: new Date().toISOString(),
      },
    })
    .eq("id", doc.id);

  // F3.3 — fix RAG cego: dispara chunk-and-embed pra popular doc_chunks
  // (antes essa função só gravava parsed/ocr_text e RAG ficava sem dados).
  const chunkResult = await disparaChunkAndEmbed(
    supabase,
    doc.id,
    docTab.textoCompleto,
    authHeader,
  );

  return {
    id: doc.id,
    sucesso: true,
    outcome: "success",
    mapper: executado.slug,
    score: executado.score,
    pageCount: docTab.numeroPaginas,
    razao: `score ${executado.score.toFixed(2)}` +
      (executado.mappers_executados.length > 1
        ? ` · merged=[${executado.mappers_executados.join("+")}]`
        : "") +
      (chunkResult.ok
        ? ` · ${chunkResult.chunks_created ?? "?"} chunks RAG`
        : ` · chunk-and-embed falhou (${chunkResult.error ?? "?"}) — re-rodar`),
  };
}

/**
 * Wrapper que persiste metadata.v6_* em qualquer outcome (R3 retroportada).
 * Antes, `reprocess-v6` só gravava metadata em sucesso — falhas ficavam
 * sem evidência no banco e o auditor tinha que confiar no toast da UI.
 */
async function processarDocComLog(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  doc: any,
  authHeader: string,
): Promise<ProcessamentoResult> {
  const r = await processarDoc(supabase, doc, authHeader);
  if (!r.sucesso) {
    // Persiste outcome estruturado + sample do texto pra calibração.
    await supabase
      .from("documents")
      .update({
        metadata: { ...(doc.metadata ?? {}), ...metadataV6Falha(r) },
      })
      .eq("id", doc.id);
  }
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return jsonResponse({ error: "Invalid authorization token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const documentId: string | undefined =
      typeof body.document_id === "string" ? body.document_id : undefined;
    const limit: number = typeof body.limit === "number"
      ? Math.min(body.limit, 50)
      : 1;
    // F3.4 — admin mode permite backfill de TODOS docs sem `parsed` no banco
    // (cross-user). Quando body.admin_mode=true, valida via has_role(admin).
    const adminMode = body.admin_mode === true;

    if (adminMode) {
      const { data: isAdmin, error: roleError } = await supabase.rpc(
        "has_role",
        { _user_id: user.id, _role: "admin" },
      );
      if (roleError || !isAdmin) {
        return jsonResponse(
          { error: "admin_mode exige role 'admin' em user_roles" },
          403,
        );
      }
    }

    let docs;
    if (documentId) {
      const { data, error } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type, metadata, tipo_extracao, cases!inner(criado_por)")
        .eq("id", documentId);
      if (error) return jsonResponse({ error: error.message }, 500);
      docs = data ?? [];
      if (!adminMode) {
        const owned = docs.filter((d: { cases: { criado_por: string } }) =>
          d.cases.criado_por === user.id
        );
        if (owned.length === 0) {
          return jsonResponse(
            { error: "Document not found ou sem permissão" },
            404,
          );
        }
        docs = owned;
      }
    } else if (adminMode) {
      // Backfill cross-user: ignora filtro por criado_por.
      const { data, error } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type, metadata, tipo_extracao, cases!inner(criado_por)")
        .is("parsed", null)
        .eq("mime_type", "application/pdf")
        .limit(limit);
      if (error) return jsonResponse({ error: error.message }, 500);
      docs = data ?? [];
    } else {
      const { data, error } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type, metadata, tipo_extracao, cases!inner(criado_por)")
        .is("parsed", null)
        .eq("mime_type", "application/pdf")
        .eq("cases.criado_por", user.id)
        .limit(limit);
      if (error) return jsonResponse({ error: error.message }, 500);
      docs = data ?? [];
    }

    const resultados: ProcessamentoResult[] = [];
    for (const doc of docs) {
      try {
        resultados.push(await processarDocComLog(supabase, doc, authHeader));
      } catch (err) {
        const r: ProcessamentoResult = {
          id: doc.id,
          sucesso: false,
          outcome: "exception",
          razao: `erro: ${err instanceof Error ? err.message : String(err)}`,
        };
        try {
          await supabase
            .from("documents")
            .update({ metadata: { ...(doc.metadata ?? {}), ...metadataV6Falha(r) } })
            .eq("id", doc.id);
        } catch {
          // Falha de update do log não quebra o lote.
        }
        resultados.push(r);
      }
    }
    const sucessos = resultados.filter((r) => r.sucesso).length;
    return jsonResponse({
      total: resultados.length,
      sucessos,
      falhas: resultados.length - sucessos,
      resultados,
    });
  } catch (error) {
    console.error("reprocess-v6 error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
