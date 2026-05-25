// =====================================================
// EDGE FUNCTION: BACKFILL V6 (lote, admin)
// =====================================================
// PR-6: processa em lote documentos antigos sem `parsed` (anteriores ao
// deploy V6) chamando `reprocess-v6` internamente para cada um. Útil pra
// indexar docs históricos sem o operador clicar doc-por-doc.
//
// Diferença de `reprocess-v6`:
//   - Sempre `admin_mode=true` (cross-user). Exige role admin.
//   - Aceita `before_iso` (paginação por timestamp): processa docs com
//     `created_at <= before_iso`. Cliente passa o created_at do último
//     doc do lote anterior pra continuar de onde parou.
//   - `mode` semântico: '30d' | '90d' | 'all' calcula `since_iso`
//     automaticamente (since = now - X dias).
//   - Limite máximo 25 por chamada (gestão de tempo OpenAI).
//   - Idempotente: se um doc já tem `parsed`, é PULADO sem custo.
//
// Body:
//   { mode: '30d' | '90d' | 'all', limit?: number, before_iso?: string }
//
// Response:
//   { total, sucessos, falhas, ultima_created_at?, processados: [{ id, ok, motivo }] }
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const LIMIT_MAX = 25;
const LIMIT_DEFAULT = 10;

type Mode = "30d" | "90d" | "all";

function sinceIsoFromMode(mode: Mode): string | null {
  if (mode === "all") return null;
  const dias = mode === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

interface ProcessadoResult {
  id: string;
  ok: boolean;
  motivo?: string;
  outcome?: string;
  mapper?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return jsonResponse({ error: "Invalid authorization token" }, 401);
    }

    // Admin gate (mesma RPC usada em reprocess-v6 admin_mode).
    const { data: isAdmin, error: roleError } = await supabase.rpc(
      "has_role",
      { _user_id: user.id, _role: "admin" },
    );
    if (roleError || !isAdmin) {
      return jsonResponse(
        { error: "backfill-v6-batch exige role 'admin'" },
        403,
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode: Mode =
      body.mode === "30d" || body.mode === "90d" || body.mode === "all"
        ? body.mode
        : "30d";
    const limit: number = Math.min(
      Math.max(1, typeof body.limit === "number" ? body.limit : LIMIT_DEFAULT),
      LIMIT_MAX,
    );
    const beforeIsoIn: string | null =
      typeof body.before_iso === "string" && body.before_iso.length > 0
        ? body.before_iso
        : null;
    const sinceIso = sinceIsoFromMode(mode);

    // Seleciona docs sem `parsed`, filtrados por janela e cursor.
    let q = supabase
      .from("documents")
      .select("id, created_at, mime_type, metadata")
      .is("parsed", null)
      .eq("mime_type", "application/pdf")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (sinceIso) q = q.gte("created_at", sinceIso);
    if (beforeIsoIn) q = q.lte("created_at", beforeIsoIn);

    const { data: docs, error: dbError } = await q;
    if (dbError) {
      return jsonResponse({ error: dbError.message }, 500);
    }

    const lista = docs ?? [];
    if (lista.length === 0) {
      return jsonResponse({
        total: 0,
        sucessos: 0,
        falhas: 0,
        processados: [],
        message: "Nenhum doc pendente nessa janela.",
      });
    }

    // Para cada doc, invoca reprocess-v6 com admin_mode + document_id.
    // Funciona sequencialmente — paralelo daria pressão indevida em
    // OpenAI/Mistral. Para lotes maiores o cliente repagina via
    // `ultima_created_at` recebido na resposta.
    const reprocessUrl = `${SUPABASE_URL}/functions/v1/reprocess-v6`;
    const processados: ProcessadoResult[] = [];
    for (const d of lista) {
      try {
        const resp = await fetch(reprocessUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            document_id: d.id,
            admin_mode: true,
          }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          processados.push({
            id: d.id,
            ok: false,
            motivo: typeof json.error === "string"
              ? json.error
              : `HTTP ${resp.status}`,
          });
          continue;
        }
        const r = Array.isArray(json.resultados) ? json.resultados[0] : null;
        if (r?.sucesso) {
          processados.push({
            id: d.id,
            ok: true,
            outcome: r.outcome,
            mapper: r.mapper,
          });
        } else {
          processados.push({
            id: d.id,
            ok: false,
            outcome: r?.outcome,
            motivo: r?.razao ?? "sem razão reportada",
          });
        }
      } catch (err) {
        processados.push({
          id: d.id,
          ok: false,
          motivo: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const sucessos = processados.filter((p) => p.ok).length;
    const ultimaCreatedAt = lista[lista.length - 1]?.created_at ?? null;

    return jsonResponse({
      total: processados.length,
      sucessos,
      falhas: processados.length - sucessos,
      ultima_created_at: ultimaCreatedAt,
      mode,
      since_iso: sinceIso,
      before_iso: beforeIsoIn,
      processados,
    });
  } catch (err) {
    console.error("backfill-v6-batch error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
