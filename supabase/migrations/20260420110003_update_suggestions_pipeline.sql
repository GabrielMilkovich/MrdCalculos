-- ============================================================
-- PIPELINE DE SUGESTÕES AUTOMÁTICAS PARA TABELAS DE REFERÊNCIA
--
-- Complementa a infra de sync (20260420110001/110002) adicionando 3 fontes
-- automáticas de sugestão para tabelas sem API oficial:
--
--  1. IPEADATA (OData oficial IPEA/MTE): salário mínimo histórico
--  2. DOU Monitor (in.gov.br): detecta publicações por keywords
--  3. LLM Suggestion (GPT-4o-mini): consulta web e propõe valor com citação
--
-- Todas escrevem em public.table_update_suggestions (status=pending) e
-- aguardam aprovação do admin via UI /admin/tabelas.
-- ============================================================

-- Sugestões pending precisam de admin review
CREATE TABLE IF NOT EXISTS public.table_update_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  target_table text NOT NULL,
  target_competencia date,
  target_field text,
  valor_atual jsonb,
  valor_sugerido jsonb NOT NULL,
  fonte text NOT NULL,
  fonte_url text,
  citacao text,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','applied','superseded')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status
  ON public.table_update_suggestions (status, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_suggestions_table
  ON public.table_update_suggestions (target_table, created_at DESC);

ALTER TABLE public.table_update_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suggestions_read_auth ON public.table_update_suggestions;
CREATE POLICY suggestions_read_auth ON public.table_update_suggestions
  FOR SELECT USING (
    auth.role() IN ('authenticated','service_role') OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

DROP POLICY IF EXISTS suggestions_write_service ON public.table_update_suggestions;
CREATE POLICY suggestions_write_service ON public.table_update_suggestions
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

-- DOU alertas
CREATE TABLE IF NOT EXISTS public.dou_publications_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz NOT NULL DEFAULT now(),
  publicacao_date date NOT NULL,
  titulo text NOT NULL,
  orgao text,
  ementa text,
  url text,
  keywords_matched text[] NOT NULL,
  related_table text,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  action_taken text
);

CREATE INDEX IF NOT EXISTS idx_dou_unreviewed
  ON public.dou_publications_alerts (detected_at DESC) WHERE NOT reviewed;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dou_pub_url
  ON public.dou_publications_alerts (COALESCE(url, titulo), publicacao_date);

ALTER TABLE public.dou_publications_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dou_read_auth ON public.dou_publications_alerts;
CREATE POLICY dou_read_auth ON public.dou_publications_alerts
  FOR SELECT USING (
    auth.role() IN ('authenticated','service_role') OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

DROP POLICY IF EXISTS dou_write_service ON public.dou_publications_alerts;
CREATE POLICY dou_write_service ON public.dou_publications_alerts
  FOR ALL USING (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)
  );

-- Cron jobs
SELECT public.reschedule_cron(
  'sync-ipeadata-monthly',
  '0 5 5 * *',  -- Dia 5 de cada mês 05h UTC
  $$ SELECT public.sync_cron_invoke_function('sync-ipeadata-official', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'monitor-dou-publications-daily',
  '0 9 * * *',  -- Diário 09h UTC
  $$ SELECT public.sync_cron_invoke_function('monitor-dou-publications', '{}'::jsonb); $$
);

SELECT public.reschedule_cron(
  'suggest-table-update-llm-weekly',
  '0 10 * * 1',  -- Segundas 10h UTC (após watchdog 08h)
  $$ SELECT public.sync_cron_invoke_function('suggest-table-update-llm', '{}'::jsonb); $$
);

COMMENT ON TABLE public.table_update_suggestions IS
  'Sugestões de atualização (LLM/IPEADATA/DOU). Admin revisa e aprova via UI /admin/tabelas.';
COMMENT ON TABLE public.dou_publications_alerts IS
  'Publicações do DOU detectadas por keywords (INSS, salário mínimo, IRRF, etc).';
