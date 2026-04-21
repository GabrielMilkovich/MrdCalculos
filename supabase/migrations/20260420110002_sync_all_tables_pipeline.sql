-- ============================================================
-- PIPELINE COMPLETO DE SINCRONIZAÇÃO
--
-- Adiciona cobertura de:
--  1. Feriados nacionais via BrasilAPI (anual em janeiro)
--  2. Juros mora + taxa legal DERIVADOS de SELIC/IPCA (diário)
--  3. Watchdog de frescor de todas as tabelas (semanal)
--
-- IMPORTANTE — LIMITAÇÕES REAIS:
--
-- APIs oficiais disponíveis:
--   ✓ Índices monetários (SELIC, IPCA-E, IPCA, INPC, IGP-M, IGP-DI, TR) → BCB SGS API
--   ✓ Feriados nacionais                                                 → BrasilAPI
--   ✓ Juros mora, taxa legal                                             → derivados de SELIC/IPCA
--
-- SEM API pública oficial (governo brasileiro não expõe):
--   ✗ pjecalc_inss_faixas      — Portaria Interministerial MPS/MF (DOU)
--   ✗ pjecalc_imposto_renda    — Instrução Normativa RFB (PDF)
--   ✗ pjecalc_salario_minimo   — Decreto federal (DOU)
--   ✗ pjecalc_salario_familia  — Portaria Interministerial (DOU)
--   ✗ pjecalc_seguro_desemprego — Resolução CODEFAT (DOU)
--   ✗ pjecalc_pisos_salariais  — CCTs sindicais por estado
--   ✗ pjecalc_vale_transporte  — ANTT/prefeituras
--   ✗ pjecalc_custas_judiciais — Lei 8.620/1993 + TRTs
--
-- Para estas, o watchdog detecta STALE e sinaliza na UI /admin/tabelas
-- para admin atualizar manualmente via upload de planilha (já suportado).
-- ============================================================

-- Tabela de snapshot do frescor
CREATE TABLE IF NOT EXISTS public.tables_freshness (
  table_name text PRIMARY KEY,
  ultima_data date,
  dias_desde_atualizacao int,
  status text NOT NULL CHECK (status IN ('FRESH','STALE','CRITICAL','EMPTY')),
  source_type text NOT NULL,
  source_detail text,
  frequency text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tables_freshness_status
  ON public.tables_freshness (status) WHERE status != 'FRESH';

ALTER TABLE public.tables_freshness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS freshness_read_authenticated ON public.tables_freshness;
CREATE POLICY freshness_read_authenticated ON public.tables_freshness
  FOR SELECT USING (
    auth.role() IN ('authenticated','service_role') OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

DROP POLICY IF EXISTS freshness_write_service ON public.tables_freshness;
CREATE POLICY freshness_write_service ON public.tables_freshness
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

COMMENT ON TABLE public.tables_freshness IS
  'Snapshot de frescor das tabelas de referência. Populado por tables-freshness-watchdog.';

-- Unique index para deduplicar pjecalc_feriados (antes só tinha PK no id)
-- Evita múltiplos INSERTs do mesmo feriado se cron rodar várias vezes
CREATE UNIQUE INDEX IF NOT EXISTS uq_pjecalc_feriados_data_scope_uf_muni
  ON public.pjecalc_feriados (data, scope, COALESCE(uf,''), COALESCE(municipio,''));

-- Cron jobs (usam reschedule_cron() de 20260420110001)
SELECT public.reschedule_cron(
  'sync-feriados-yearly',
  '0 2 2 1 *',  -- 02h UTC do dia 2 de janeiro
  $$ SELECT public.sync_cron_invoke_function('sync-feriados-brasilapi', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'derive-juros-taxa-legal-daily',
  '30 3 * * *',  -- 03h30 UTC (logo após sync de índices às 03h)
  $$ SELECT public.sync_cron_invoke_function('derive-juros-taxa-legal', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'tables-freshness-watchdog-weekly',
  '0 8 * * 1',  -- Segundas 08h UTC
  $$ SELECT public.sync_cron_invoke_function('tables-freshness-watchdog', '{}'::jsonb); $$
);
