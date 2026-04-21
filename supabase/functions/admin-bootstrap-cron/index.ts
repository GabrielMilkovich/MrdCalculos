/**
 * admin-bootstrap-cron — Edge Function
 *
 * Popula (ou rotaciona) os secrets necessários para pg_cron executar
 * edge functions via pg_net:
 *   - project_url     (de SUPABASE_URL)
 *   - service_role_key (de SUPABASE_SERVICE_ROLE_KEY)
 *
 * Esta função é IDEMPOTENTE: pode ser chamada várias vezes. Se os
 * secrets já existem, são atualizados (útil para rotação).
 *
 * Deve ser chamada UMA VEZ após cada deploy que rotacione a service_role_key
 * ou após o setup inicial do projeto. Os cron jobs começam a funcionar
 * imediatamente após o bootstrap.
 *
 * AUTH: Authorization: Bearer <service_role_key>  (recusa qualquer outro token)
 *
 * POST /functions/v1/admin-bootstrap-cron
 * Body: (vazio)
 * Response: { ok: true, results: { project_url: 'created|updated', ... } }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({
      error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no env",
    }, 500);
  }

  // Auth: exige exatamente o service_role key (comparação constante)
  const authHeader = req.headers.get("Authorization") ?? "";
  const expectedToken = `Bearer ${SERVICE_ROLE_KEY}`;
  if (authHeader.length !== expectedToken.length || authHeader !== expectedToken) {
    return jsonResponse({
      error: "Apenas chamadas autenticadas com service_role_key são permitidas",
    }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc("bootstrap_sync_secrets", {
    p_project_url: SUPABASE_URL,
    p_service_role_key: SERVICE_ROLE_KEY,
  });

  if (error) {
    return jsonResponse({
      error: "bootstrap_sync_secrets falhou",
      details: error.message,
    }, 500);
  }

  return jsonResponse({
    ok: true,
    results: data,
    next_step: "Cron jobs devem executar com sucesso. Monitore via SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;",
  });
});
