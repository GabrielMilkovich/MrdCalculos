-- ============================================================
-- rate_limit_log: contabilização simples de requests por user+bucket.
-- Usado pelas edge functions via _shared/rate-limit.ts.
--
-- Limpeza: TTL de 24h via índice parcial + cron externo ou pg_cron.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice principal: COUNT por (user, bucket, window)
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_bucket_time
  ON public.rate_limit_log (user_id, bucket, created_at DESC);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Somente service_role (edge functions) escreve/lê
DROP POLICY IF EXISTS rate_limit_service_only ON public.rate_limit_log;
CREATE POLICY rate_limit_service_only ON public.rate_limit_log
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Função de housekeeping: remove rows > 24h. Pode ser chamada por edge
-- function scheduled ou via pg_cron se disponível.
CREATE OR REPLACE FUNCTION public.prune_rate_limit_log()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_role text := auth.role();
  v_can_bypass boolean;
  v_deleted int;
BEGIN
  SELECT rolbypassrls INTO v_can_bypass FROM pg_roles WHERE rolname = current_user;
  IF v_role <> 'service_role' AND NOT COALESCE(v_can_bypass, false) THEN
    RAISE EXCEPTION 'Apenas service_role pode rodar prune' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.rate_limit_log
  WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $$;

COMMENT ON TABLE public.rate_limit_log IS
  'Log efêmero (24h) para rate limiting de LLM endpoints. Limpado por prune_rate_limit_log().';
