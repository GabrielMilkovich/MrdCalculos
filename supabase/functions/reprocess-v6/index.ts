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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extrairGeometrico } from "../_shared/extrator-geometrico.ts";
import { escolherMapper } from "../_shared/mappers/dispatcher.ts";

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

interface ProcessamentoResult {
  id: string;
  sucesso: boolean;
  mapper?: string;
  razao?: string;
}

async function processarDoc(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  doc: any,
): Promise<ProcessamentoResult> {
  if (!doc.storage_path) {
    return { id: doc.id, sucesso: false, razao: "sem storage_path" };
  }
  const { data: signedUrlData } = await supabase.storage
    .from("juriscalculo-documents")
    .createSignedUrl(doc.storage_path, 3600);
  if (!signedUrlData?.signedUrl) {
    return { id: doc.id, sucesso: false, razao: "sem signed url" };
  }
  const bytes = await baixarBytes(signedUrlData.signedUrl);
  if (!bytes) return { id: doc.id, sucesso: false, razao: "falha download" };
  const docTab = await extrairGeometrico(bytes);
  if (!docTab || docTab.qualidade.score < 0.7) {
    return {
      id: doc.id,
      sucesso: false,
      razao: `extrator score ${docTab?.qualidade.score ?? "null"}`,
    };
  }
  const dispatch = escolherMapper(docTab);
  if (!dispatch) {
    return { id: doc.id, sucesso: false, razao: "nenhum mapper aplica" };
  }
  const resultado = dispatch.mapper.mapear(docTab);
  if (!resultado) {
    return {
      id: doc.id,
      sucesso: false,
      razao: `mapper ${dispatch.mapper.slug} retornou null`,
    };
  }
  const parsedJson = serializarParaParsed(resultado);
  await supabase
    .from("documents")
    .update({
      parsed: parsedJson,
      parsed_by: dispatch.mapper.slug,
      ocr_provider: "pdfjs_geometric",
      ocr_text: docTab.textoCompleto,
      ocr_validated: true,
      status: "ocr_done",
      extracao_status: "done",
      updated_at: new Date().toISOString(),
      metadata: {
        ...(doc.metadata ?? {}),
        v6_extractor: "pdfjs_geometric",
        v6_quality_score: docTab.qualidade.score,
        v6_quality_reason: docTab.qualidade.razao,
        v6_page_count: docTab.numeroPaginas,
        v6_mapper: dispatch.mapper.slug,
        v6_mapper_score: dispatch.score,
        v6_mapper_motivos: dispatch.motivos,
        v6_reprocessed_at: new Date().toISOString(),
      },
    })
    .eq("id", doc.id);
  return {
    id: doc.id,
    sucesso: true,
    mapper: dispatch.mapper.slug,
    razao: `score ${dispatch.score.toFixed(2)}`,
  };
}

serve(async (req) => {
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

    let docs;
    if (documentId) {
      const { data, error } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type, metadata, cases!inner(criado_por)")
        .eq("id", documentId);
      if (error) return jsonResponse({ error: error.message }, 500);
      docs = data ?? [];
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
    } else {
      const { data, error } = await supabase
        .from("documents")
        .select("id, storage_path, mime_type, metadata, cases!inner(criado_por)")
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
        resultados.push(await processarDoc(supabase, doc));
      } catch (err) {
        resultados.push({
          id: doc.id,
          sucesso: false,
          razao: `erro: ${err instanceof Error ? err.message : String(err)}`,
        });
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
