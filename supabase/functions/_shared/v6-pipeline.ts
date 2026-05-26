// =====================================================
// _shared/v6-pipeline.ts
// =====================================================
// Pipeline V6 compartilhado: extrator geométrico (pdfjs/unpdf) → escolha
// de mapper → mapeamento → telemetria estruturada.
//
// Extraído de `process-document-mistral/index.ts` em 2026-05-20 para que
// `ocr-document/index.ts` (e qualquer outra edge function que decida
// processar PDFs no futuro) possa tentar V6 antes de cair pro Mistral OCR.
//
// CONTRATO: este módulo NÃO faz side-effects — devolve a tentativa pra o
// caller decidir o que fazer (gravar success no banco, gravar metadata
// de falha e cair pro fallback, etc).
//
// Histórico do "porquê":
//   - Diagnóstico via 4 queries em xhvlhrgfoeahgofhljbs (2026-05-20) mostrou
//     que 42/46 docs nos últimos 90 dias pularam V6 porque o frontend
//     chama `ocr-document` em 7 callsites e só 1 callsite (`process-
//     document-mistral`) tentava V6. Esse arquivo permite plugar V6 em
//     todos os callers sem duplicar código.
//   - O comportamento aqui é IDÊNTICO ao que vivia em
//     `process-document-mistral/index.ts:66-188` antes da extração.
//     Qualquer alteração de comportamento deve ser feita aqui (centralizada)
//     e propagada por testes em produção via re-upload de PDFs.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { extrairGeometrico } from "./extrator-geometrico.ts";
import { escolherEMapear, prewarmOntologiaIfNeeded } from "./mappers/dispatcher.ts";
import { sanitizePII } from "./sanitize-pii.ts";

// Possíveis transições do caminho V6. Vira `metadata.v6_outcome`. Cada
// valor deve ser INDIVÍDUAL (não combinado) — query `WHERE v6_outcome = X`
// vira métrica direta.
export type V6Outcome =
  | "success"
  | "not_pdf"                  // mime_type != application/pdf
  | "pdf_download_failed"      // signed URL ok mas fetch falhou
  | "pdf_extraction_failed"    // unpdf não carregou ou doc.numPages = 0
  | "score_below_threshold"    // extrator extraiu, qualidade < 0.7
  | "no_mapper_matched"        // nenhum mapper aceitou o doc
  | "mapper_returned_null"     // mapper aceitou mas mapear() retornou null
  | "pdf_too_large_for_v6"    // PDF > 5MB, skip pra Mistral (OOM prevention)
  | "exception";               // erro não previsto no try/catch

export interface V6Tentativa {
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

export async function baixarBytes(url: string): Promise<Uint8Array | null> {
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
export function serializarParaParsed(resultado: any): Record<string, unknown> {
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
export async function tentarV6(
  // deno-lint-ignore no-explicit-any
  doc: any,
  signedUrl: string,
  supabase: SupabaseClient,
): Promise<V6Tentativa> {
  try {
    if (doc.mime_type !== "application/pdf") {
      return { outcome: "not_pdf" };
    }
    const bytes = await baixarBytes(signedUrl);
    if (!bytes) {
      return { outcome: "pdf_download_failed" };
    }
    // PDFs >5MB estouraram memória no plano Free (150MB limit).
    // Cartão de ponto 63pg = ~8MB → OOM no pdfjs. Skip V6, cai pro Mistral.
    const MAX_V6_BYTES = 5 * 1024 * 1024;
    if (bytes.length > MAX_V6_BYTES) {
      return {
        outcome: "pdf_too_large_for_v6",
        errorMessage: `PDF ${(bytes.length / 1024 / 1024).toFixed(1)}MB > ${MAX_V6_BYTES / 1024 / 1024}MB limit V6 — skip pra Mistral OCR`,
      } as V6Tentativa;
    }
    const docTab = await extrairGeometrico(bytes);
    if (!docTab) {
      return {
        outcome: "pdf_extraction_failed",
        errorMessage: "extrairGeometrico devolveu null (PDF sem texto nativo ou unpdf falhou)",
      };
    }
    // Sample do textoCompleto pra qualquer outcome pós-extração — debugging.
    // LGPD: sanitiza PII (CPF/CNPJ/PIS/email/telefone) antes de gravar em
    // metadata jsonb. Layout/valores/datas preservados pra calibração.
    const textPreview = sanitizePII(docTab.textoCompleto.slice(0, 4000));
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
    // Sprint 3: escolherEMapear encapsula merge de PDFs híbridos de
    // cartão de ponto (Via Varejo Antigo + Espelho Minha). Pra outros
    // tipos, comportamento idêntico a escolherMapper + mapear.
    // Discriminated union preserva distinção entre no_mapper_matched
    // e mapper_returned_null pra telemetria.
    //
    // Sprint 3c (2026-05-23): prewarm da ontologia V2 antes do mapper sync.
    // No-op quando mapper escolhido não declara `requiresOntologiaPrewarm`
    // (atualmente, só mappers de holerite). TTL 5min interno.
    await prewarmOntologiaIfNeeded(docTab, supabase);
    const dispatch = escolherEMapear(docTab);
    if (dispatch.kind === "no_mapper_matched") {
      return {
        outcome: "no_mapper_matched",
        score: docTab.qualidade.score,
        qualidadeRazao: docTab.qualidade.razao,
        pageCount: docTab.numeroPaginas,
        textPreview,
        textFullLength,
      };
    }
    if (dispatch.kind === "mapper_returned_null") {
      return {
        outcome: "mapper_returned_null",
        mapper: dispatch.tentados[0]?.mapper.slug ?? "unknown",
        score: dispatch.tentados[0]?.score ?? 0,
        pageCount: docTab.numeroPaginas,
        textPreview,
        textFullLength,
      };
    }
    return {
      outcome: "success",
      mapper: dispatch.executado.slug,
      score: dispatch.executado.score,
      parsedJson: serializarParaParsed(dispatch.executado.resultado),
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
export function metadataV6(t: V6Tentativa): Record<string, unknown> {
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
