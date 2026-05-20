// =====================================================
// BACKEND FUNCTION: GET SIGNED DOCUMENT URL
// Gera URL assinada curta para preview/download, evitando links expirados.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type Body = {
  document_id?: string;
  expires_in?: number; // seconds
  mode?: "url" | "blob";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const documentId = body.document_id;
    // Política: TTL default 15min, máximo 30min (para casos de processamento
    // assíncrono no caller). Antes era 1h-default/1h-max, considerado largo
    // demais para um endpoint genérico de URL fresca.
    const expiresIn = Math.max(60, Math.min(1800, body.expires_in ?? 900));
    const mode = body.mode ?? "url";

    if (!documentId) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar documento
    const { data: document, error: docErr } = await supabase
      .from("documents")
      .select("id, case_id, owner_user_id, storage_path, file_name, mime_type")
      .eq("id", documentId)
      .single();

    if (docErr || !document) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar ownership (documento) ou (caso)
    let allowed = false;
    if (document.owner_user_id && document.owner_user_id === user.id) {
      allowed = true;
    } else {
      const { data: caseData, error: caseErr } = await supabase
        .from("cases")
        .select("id, criado_por")
        .eq("id", document.case_id)
        .single();

      if (!caseErr && caseData?.criado_por === user.id) {
        allowed = true;
      }
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: "You don't have access to this document" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!document.storage_path) {
      return new Response(JSON.stringify({ error: "Document has no storage_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bucket atual (privado)
    const bucket = "juriscalculo-documents";

    // Modo blob: retorna bytes do arquivo para prévia inline sem bloqueio de iframe
    if (mode === "blob") {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from(bucket)
        .download(document.storage_path);

      if (downloadErr || !fileData) {
        console.error("download error:", downloadErr);
        return new Response(JSON.stringify({ error: "Could not download document" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const safeFileName = (document.file_name ?? "documento").replace(/[\r\n"]/g, "");

      return new Response(arrayBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": document.mime_type || "application/pdf",
          "Content-Disposition": `inline; filename="${safeFileName}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    // Modo url (padrão): gera URL assinada
    const { data: signedUrlData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.storage_path, expiresIn);

    if (signedErr || !signedUrlData?.signedUrl) {
      console.error("createSignedUrl error:", signedErr);
      return new Response(JSON.stringify({ error: "Could not generate signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Opcional: atualizar URL no DB para reutilização rápida em outras telas
    await supabase
      .from("documents")
      .update({ arquivo_url: signedUrlData.signedUrl, updated_at: new Date().toISOString() })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        expiresIn,
        fileName: document.file_name ?? null,
        mimeType: document.mime_type ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("get-signed-document-url error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
