-- ============================================================
-- Atualização automática dos índices monetários
--
-- 1. Reschedule sync-pjecalc-indices:
--    * Antes: mensal (dia 5), apenas SELIC/IPCA-E/TR (serie_ids: [4390,10764,226])
--    * Agora: semanal (segunda 11:00 UTC), TODAS as séries configuradas na
--      edge function (SELIC, IPCA-E, IPCA, INPC, IGP-M, IGP-DI, TR + TR_FGTS
--      derivado). Sem filtro serie_ids → edge function usa lista padrão.
--
-- 2. Rationale:
--    * BCB/IBGE publicam alguns índices semanalmente (IGP-M)
--    * Semanal garante no máximo 7 dias de atraso em qualquer índice
--    * Custo marginal: 4× execuções/mês × ~5s cada ≈ irrelevante
-- ============================================================

-- Remove schedule antigo (mensal, apenas 3 séries)
SELECT cron.unschedule('sync-pjecalc-indices-monthly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-pjecalc-indices-monthly'
);

-- Também remove schedule semanal anterior (idempotência em re-run)
SELECT cron.unschedule('sync-pjecalc-indices-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-pjecalc-indices-weekly'
);

-- Novo schedule: toda segunda-feira às 11:00 UTC (08:00 BRT), todas as séries.
-- Body vazio faz a edge function sincronizar a lista completa padrão.
SELECT cron.schedule(
  'sync-pjecalc-indices-weekly',
  '0 11 * * 1',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-pjecalc-indices',
      body    := '{}'::jsonb,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      )
    );
  $$
);
