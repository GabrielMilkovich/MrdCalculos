-- ============================================================
-- P0-3: Pipeline de ingestão de índices monetários
--
-- 1. RPC pjecalc_recompute_acumulado — chamada pela edge function
--    sync-pjecalc-indices após cada ingestão incremental.
--
-- 2. VIEW pjecalc_indice_cobertura — para checar gaps facilmente.
--
-- 3. pg_cron: dispara sync-pjecalc-indices todo dia 5 do mês
--    (após BCB/IBGE publicarem os dados do mês anterior).
-- ============================================================

-- ============================================================
-- 1. RPC: recompute acumulado for a single indice
-- ============================================================
CREATE OR REPLACE FUNCTION public.pjecalc_recompute_acumulado(p_indice TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pjecalc_correcao_monetaria AS t
  SET acumulado = sub.ac
  FROM (
    SELECT
      id,
      EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
          OVER (PARTITION BY indice ORDER BY competencia
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      ) AS ac
    FROM public.pjecalc_correcao_monetaria
    WHERE indice = p_indice
  ) sub
  WHERE t.id = sub.id;
END;
$$;

COMMENT ON FUNCTION public.pjecalc_recompute_acumulado(TEXT) IS
  'Recomputes the running-product acumulado for a given indice after incremental inserts.';

-- ============================================================
-- 2. VIEW: cobertura dos índices críticos
-- Permite diagnóstico rápido de gaps por índice
-- ============================================================
CREATE OR REPLACE VIEW public.pjecalc_indice_cobertura AS
SELECT
  indice,
  COUNT(*)                              AS total_meses,
  MIN(competencia)::text                AS cobertura_inicio,
  MAX(competencia)::text                AS cobertura_fim,
  -- Gap to today (months since last record)
  EXTRACT(YEAR FROM age(now(), MAX(competencia))) * 12
    + EXTRACT(MONTH FROM age(now(), MAX(competencia)))
    AS meses_atrasado,
  -- Whether coverage reaches the current month
  (MAX(competencia) >= date_trunc('month', now()))::boolean AS esta_atualizado
FROM public.pjecalc_correcao_monetaria
WHERE indice IN ('IPCA-E', 'SELIC', 'TR', 'TR_FGTS', 'INPC', 'IGP-M', 'IGP-DI')
GROUP BY indice
ORDER BY indice;

COMMENT ON VIEW public.pjecalc_indice_cobertura IS
  'Diagnóstico de cobertura e atualidade dos índices de correção monetária.';

-- ============================================================
-- 3. pg_cron: mensal no dia 5 de cada mês às 11:00 UTC
-- (BCB/IBGE geralmente publicam até o dia 3-4 do mês seguinte)
-- ============================================================
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if any
SELECT cron.unschedule('sync-pjecalc-indices-monthly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-pjecalc-indices-monthly'
);

-- Schedule: 5th of every month at 11:00 UTC
SELECT cron.schedule(
  'sync-pjecalc-indices-monthly',
  '0 11 5 * *',
  $$
    SELECT net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/sync-pjecalc-indices',
      body   := '{"serie_ids": [4390, 10764, 226]}'::jsonb,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      )
    );
  $$
);

-- ============================================================
-- Grant execute on new function to authenticated users
-- (needed for edge function service role)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.pjecalc_recompute_acumulado(TEXT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
