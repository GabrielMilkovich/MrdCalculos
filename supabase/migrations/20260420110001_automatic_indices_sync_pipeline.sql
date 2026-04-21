-- ============================================================
-- SINCRONIZAÇÃO AUTOMÁTICA DE ÍNDICES E TABELAS
--
-- Problema anterior:
--   - Único cron job existente (sync-pjecalc-indices-weekly) FALHAVA desde
--     sempre com "schema net does not exist". Nenhum índice sincronizado
--     automaticamente. Atualizações só via trigger manual na UI.
--
-- Solução:
--   1. Habilita pg_net (http_post do Postgres)
--   2. Armazena project_url + gateway_jwt no Supabase Vault (encrypted)
--   3. Função helper sync_cron_invoke_function() que qualquer job pode usar
--   4. 6 cron jobs cobrindo todos os cenários
--   5. Tabela sync_heartbeat para observabilidade
--   6. Edge function admin-bootstrap-cron faz self-bootstrap do vault
--
-- AUTH STRATEGY (gateway JWT vs internal service_role):
--   O gateway das Supabase Edge Functions exige JWT formato legacy (eyJ...).
--   O service_role_key atual é formato novo (sb_secret_...) incompatível.
--   Estratégia: vault guarda 'gateway_jwt' (anon legacy) APENAS para passar
--   o gateway. Auth real (service_role) acontece DENTRO de cada edge function
--   via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), fornecido pelo Supabase.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============ HELPERS ============

CREATE OR REPLACE FUNCTION public.get_sync_secret(p_name text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','vault'
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NOT (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  ) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;

  RETURN v_secret;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_sync_secret(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_sync_secret(text) TO postgres;

COMMENT ON FUNCTION public.get_sync_secret IS
  'Lê secret do vault. Só service_role/superuser podem chamar.';

-- ============ BOOTSTRAP DE SECRETS ============

CREATE OR REPLACE FUNCTION public.bootstrap_sync_secrets(
  p_project_url text,
  p_service_role_key text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','vault'
AS $$
DECLARE
  v_url_id uuid;
  v_key_id uuid;
  v_results jsonb := '{}'::jsonb;
BEGIN
  IF NOT (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  ) THEN
    RAISE EXCEPTION 'Apenas service_role pode bootstrap secrets' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_url_id FROM vault.secrets WHERE name = 'project_url' LIMIT 1;
  IF v_url_id IS NULL THEN
    PERFORM vault.create_secret(p_project_url, 'project_url',
      'Supabase project URL (pg_cron → http_post)');
    v_results := v_results || jsonb_build_object('project_url', 'created');
  ELSE
    PERFORM vault.update_secret(v_url_id, p_project_url, 'project_url',
      'Supabase project URL (pg_cron → http_post)');
    v_results := v_results || jsonb_build_object('project_url', 'updated');
  END IF;

  SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_key_id IS NULL THEN
    PERFORM vault.create_secret(p_service_role_key, 'service_role_key',
      'Supabase service_role key (ref. para rotação)');
    v_results := v_results || jsonb_build_object('service_role_key', 'created');
  ELSE
    PERFORM vault.update_secret(v_key_id, p_service_role_key, 'service_role_key',
      'Supabase service_role key');
    v_results := v_results || jsonb_build_object('service_role_key', 'updated');
  END IF;

  v_results := v_results || jsonb_build_object(
    'verification', jsonb_build_object(
      'project_url_readable', public.get_sync_secret('project_url') IS NOT NULL,
      'service_role_key_readable', public.get_sync_secret('service_role_key') IS NOT NULL
    )
  );

  RETURN v_results;
END $$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_sync_secrets(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.bootstrap_sync_secrets(text, text) TO postgres, service_role;

COMMENT ON FUNCTION public.bootstrap_sync_secrets IS
  'Bootstrap idempotente. Chamado pela edge function admin-bootstrap-cron em cada deploy.';

-- ============ HEARTBEAT TABLE ============

CREATE TABLE IF NOT EXISTS public.sync_heartbeat (
  id bigserial PRIMARY KEY,
  function_name text NOT NULL,
  invoked_at timestamptz NOT NULL DEFAULT now(),
  request_id bigint,
  note text
);

CREATE INDEX IF NOT EXISTS idx_sync_heartbeat_fn_time
  ON public.sync_heartbeat (function_name, invoked_at DESC);

ALTER TABLE public.sync_heartbeat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_heartbeat_admin_only ON public.sync_heartbeat;
CREATE POLICY sync_heartbeat_admin_only ON public.sync_heartbeat
  FOR ALL USING (auth.role() = 'service_role' OR
                 (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user))
  WITH CHECK (auth.role() = 'service_role' OR
              (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user));

-- ============ EDGE FUNCTION INVOCATION HELPER ============

CREATE OR REPLACE FUNCTION public.sync_cron_invoke_function(
  p_function_name text,
  p_body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','vault','net'
AS $$
DECLARE
  v_url text;
  v_jwt text;
  v_request_id bigint;
BEGIN
  v_url := public.get_sync_secret('project_url');
  v_jwt := public.get_sync_secret('gateway_jwt');

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Secret project_url ausente no vault. Chame admin-bootstrap-cron.';
  END IF;
  IF v_jwt IS NULL THEN
    RAISE EXCEPTION 'Secret gateway_jwt ausente. Configure com anon JWT legacy via vault.create_secret.';
  END IF;

  SELECT net.http_post(
    url     := v_url || '/functions/v1/' || p_function_name,
    body    := p_body,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_jwt,
      'Content-Type',  'application/json'
    ),
    timeout_milliseconds := 300000
  ) INTO v_request_id;

  INSERT INTO public.sync_heartbeat (function_name, invoked_at, request_id)
  VALUES (p_function_name, now(), v_request_id);

  RETURN v_request_id;
END $$;

COMMENT ON FUNCTION public.sync_cron_invoke_function IS
  'Invoca edge function via pg_net + vault. Usado por todos os jobs pg_cron.';

-- ============ CRON JOBS ============

-- Remove job antigo quebrado, se existir
DO $$ BEGIN
  PERFORM cron.unschedule('sync-pjecalc-indices-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Helper para re-agendar idempotente
CREATE OR REPLACE FUNCTION public.reschedule_cron(p_name text, p_schedule text, p_command text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','cron'
AS $$
BEGIN
  BEGIN PERFORM cron.unschedule(p_name);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule(p_name, p_schedule, p_command);
END $$;

SELECT public.reschedule_cron(
  'sync-monetary-indices-daily',
  '0 3 * * *',
  $$ SELECT public.sync_cron_invoke_function('sync-pjecalc-indices', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'sync-historical-indices-weekly',
  '0 4 * * 0',
  $$ SELECT public.sync_cron_invoke_function('populate-indices-historicos', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'sync-indices-automatico-12h',
  '0 6,18 * * *',
  $$ SELECT public.sync_cron_invoke_function('sync-indices-automatico', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'prune-sync-heartbeat-weekly',
  '0 5 * * 1',
  $$ DELETE FROM public.sync_heartbeat WHERE invoked_at < now() - interval '60 days'; $$
);

SELECT public.reschedule_cron(
  'prune-rate-limit-daily',
  '0 7 * * *',
  $$ SELECT public.prune_rate_limit_log(); $$
);

SELECT public.reschedule_cron(
  'reset-stale-ocr-every-30min',
  '*/30 * * * *',
  $$ SELECT public.reset_stale_ocr_documents(); $$
);

COMMENT ON FUNCTION public.reschedule_cron IS
  'Reagenda pg_cron idempotentemente (unschedule + schedule).';
