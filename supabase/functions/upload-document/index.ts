// =====================================================
// EDGE FUNCTION: UPLOAD DE DOCUMENTOS
// Recebe arquivo, salva no Storage, cria registro em documents
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair user_id do token JWT
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const caseId = formData.get("case_id") as string;
    const docType = formData.get("doc_type") as string || "outro";

    if (!file || !caseId) {
      return new Response(
        JSON.stringify({ error: "file and case_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verificar se o usuário é dono do caso
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, criado_por")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (caseData.criado_por !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this case" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar caminho único no storage: user_id/case_id/timestamp_filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${caseId}/${timestamp}_${sanitizedFilename}`;

    console.log(`Uploading file to: ${storagePath}`);

    // Upload para o bucket privado
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("juriscalculo-documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar URL assinada (válida por 1 hora para processamento)
    // TTL 15min — URL persistida em DB; consumers devem regenerar via storage_path.
    const { data: signedUrlData } = await supabase.storage
      .from("juriscalculo-documents")
      .createSignedUrl(storagePath, 900);

    // Criar registro em documents
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        owner_user_id: user.id,
        file_name: file.name,
        mime_type: file.type,
        storage_path: storagePath,
        tipo: docType,
        status: "uploaded",
        arquivo_url: signedUrlData?.signedUrl || null,
        metadata: {
          original_name: file.name,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (docError) {
      console.error("Document insert error:", docError);
      // Tentar deletar o arquivo do storage se falhar
      await supabase.storage.from("juriscalculo-documents").remove([storagePath]);
      return new Response(
        JSON.stringify({ error: `Failed to create document record: ${docError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Document created: ${document.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        storage_path: storagePath,
        status: "uploaded",
        message: "Document uploaded successfully. Call process-document-start to begin processing.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("upload-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
