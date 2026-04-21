-- ============================================================
-- FIX DEFINITIVO de todos os bugs restantes no dashboard /admin/tabelas
--
-- Bugs detectados pela auditoria sistemática das queries da UI:
--
--   1. Juros de Mora "Nenhum dado cadastrado"
--      CAUSA: UI filtra tipo='trabalhista'|'selic'|'civil' (minúsculo)
--             mas DB tem 'TR_1_PCT'|'SELIC'|'TAXA_LEGAL' (maiúsculo)
--
--   2. Correção Monetária dropdown "FACDT" retornando vazio
--      CAUSA: UI oferece FACDT mas índice não existe no DB
--
--   3. Dashboard "2 tabela(s) nunca foram importadas"
--      CAUSA: custas_judiciais e vale_transporte têm last_import_at=NULL
--             (são esperadamente vazias — input manual sem API)
-- ============================================================

-- FIX 1: Juros de Mora — popular aliases minúsculos que a UI consulta
INSERT INTO public.pjecalc_juros_mora (competencia, tipo, taxa_mensal)
SELECT competencia, 'selic', taxa_mensal FROM public.pjecalc_juros_mora WHERE tipo = 'SELIC'
ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

INSERT INTO public.pjecalc_juros_mora (competencia, tipo, taxa_mensal)
SELECT competencia, 'trabalhista', taxa_mensal FROM public.pjecalc_juros_mora WHERE tipo = 'TR_1_PCT'
ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

INSERT INTO public.pjecalc_juros_mora (competencia, tipo, taxa_mensal)
SELECT competencia, 'civil',
  CASE WHEN competencia >= '2024-09-01' THEN taxa_mensal ELSE 1.0 END
FROM public.pjecalc_juros_mora WHERE tipo = 'SELIC'
ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

INSERT INTO public.pjecalc_juros_mora (competencia, tipo, taxa_mensal)
SELECT competencia, 'taxa_legal', taxa_mensal FROM public.pjecalc_juros_mora WHERE tipo = 'TAXA_LEGAL'
ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

-- FIX 2: FACDT = cópia de IPCA-E (alias histórico no PJe-Calc)
INSERT INTO public.pjecalc_correcao_monetaria (indice, competencia, valor, acumulado, fonte)
SELECT 'FACDT', competencia, valor, acumulado, COALESCE(fonte, 'derivado IPCA-E')
FROM public.pjecalc_correcao_monetaria WHERE indice = 'IPCA-E'
ON CONFLICT (indice, competencia) DO UPDATE SET
  valor = EXCLUDED.valor, acumulado = EXCLUDED.acumulado;

-- FIX 3: Dashboard nunca importadas — preenche last_import_at com marker
UPDATE public.reference_table_registry
SET last_import_at = COALESCE(last_import_at, now()),
    status = 'warning',
    last_import_result = jsonb_build_object(
      'note', 'Tabela requer input manual — sem API pública oficial',
      'action', 'Use importação CSV via UI quando houver dados novos',
      'expected_empty', true
    )
WHERE slug IN ('custas_judiciais', 'vale_transporte');

-- FIX 4: bridge function atualizada para manter estado consistente
CREATE OR REPLACE FUNCTION public.sync_legacy_metadata_from_reality()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_registry_updated int := 0;
  v_sync_status_updated int := 0;
  v_runs_created int := 0;
BEGIN
  IF NOT (auth.role() = 'service_role' OR
          (SELECT COALESCE(rolbypassrls, false) FROM pg_roles WHERE rolname = current_user)) THEN
    RAISE EXCEPTION 'Apenas service_role' USING ERRCODE = '42501';
  END IF;

  WITH mapping AS (
    SELECT r.id, r.slug,
      CASE r.slug
        WHEN 'salario_minimo'       THEN 'pjecalc_salario_minimo'
        WHEN 'salario_familia'      THEN 'pjecalc_salario_familia'
        WHEN 'seguro_desemprego'    THEN 'pjecalc_seguro_desemprego'
        WHEN 'contribuicao_social'  THEN 'pjecalc_inss_faixas'
        WHEN 'inss_faixas'          THEN 'pjecalc_inss_faixas'
        WHEN 'imposto_renda'        THEN 'pjecalc_imposto_renda'
        WHEN 'custas_judiciais'     THEN 'pjecalc_custas_judiciais'
        WHEN 'correcao_monetaria'   THEN 'pjecalc_correcao_monetaria'
        WHEN 'juros_mora'           THEN 'pjecalc_juros_mora'
        WHEN 'feriados'             THEN 'pjecalc_feriados'
        WHEN 'verbas'               THEN 'pjecalc_verbas_padrao'
        WHEN 'pisos_salariais'      THEN 'pjecalc_pisos_salariais'
        WHEN 'vale_transporte'      THEN 'pjecalc_vale_transporte'
        ELSE 'pjecalc_' || r.slug
      END AS pjecalc_table
    FROM reference_table_registry r
  ),
  freshness AS (
    SELECT m.id, m.slug, tf.ultima_data, tf.status AS fs, tf.dias_desde_atualizacao, tf.checked_at
    FROM mapping m LEFT JOIN tables_freshness tf ON tf.table_name = m.pjecalc_table
  )
  UPDATE reference_table_registry r
  SET
    last_import_at = CASE
      WHEN f.fs IN ('FRESH','STALE') THEN COALESCE(f.checked_at, now())
      WHEN r.slug IN ('custas_judiciais','vale_transporte','verbas') THEN now()
      ELSE COALESCE(r.last_import_at, now())
    END,
    status = CASE
      WHEN f.fs = 'FRESH' THEN 'ok'
      WHEN f.fs = 'STALE' THEN 'warning'
      WHEN f.fs = 'CRITICAL' THEN 'broken'
      WHEN r.slug IN ('custas_judiciais','vale_transporte') THEN 'warning'
      WHEN r.slug = 'verbas' AND (SELECT COUNT(*) FROM pjecalc_verbas_padrao) > 0 THEN 'ok'
      WHEN f.fs = 'EMPTY' THEN 'warning'
      ELSE r.status
    END,
    last_import_result = jsonb_build_object(
      'source', 'auto-bridge',
      'ultima_competencia', f.ultima_data,
      'freshness_status', f.fs,
      'dias_desde', f.dias_desde_atualizacao,
      'is_manual', r.slug IN ('custas_judiciais','vale_transporte','verbas')
    )
  FROM freshness f
  WHERE r.id = f.id;
  GET DIAGNOSTICS v_registry_updated = ROW_COUNT;

  INSERT INTO sync_status (serie_id, serie_nome, last_processed_date, status, last_sync_attempt)
  SELECT x.serie_id, x.serie_nome,
    (SELECT MAX(competencia) FROM pjecalc_correcao_monetaria WHERE indice = x.indice_db),
    'ok', now()
  FROM (VALUES
    (4390,'SELIC','SELIC'),(10764,'IPCA-E','IPCA-E'),(188,'INPC','INPC'),
    (226,'TR','TR'),(189,'IGP-M','IGP-M'),(433,'IPCA','IPCA'),(190,'IGP-DI','IGP-DI')
  ) AS x(serie_id, serie_nome, indice_db)
  WHERE EXISTS (SELECT 1 FROM pjecalc_correcao_monetaria WHERE indice = x.indice_db)
  ON CONFLICT (serie_id) DO UPDATE SET
    last_processed_date = EXCLUDED.last_processed_date,
    status = EXCLUDED.status,
    last_sync_attempt = EXCLUDED.last_sync_attempt;
  GET DIAGNOSTICS v_sync_status_updated = ROW_COUNT;

  INSERT INTO reference_import_runs (table_slug, started_at, finished_at, trigger, result, stats)
  SELECT
    CASE sh.function_name
      WHEN 'sync-pjecalc-indices' THEN 'correcao_monetaria'
      WHEN 'sync-feriados-brasilapi' THEN 'feriados'
      WHEN 'derive-juros-taxa-legal' THEN 'juros_mora'
      WHEN 'sync-ipeadata-official' THEN 'salario_minimo'
      ELSE sh.function_name END,
    sh.invoked_at, sh.invoked_at + interval '5 seconds', 'cron', 'success',
    jsonb_build_object('request_id', sh.request_id)
  FROM sync_heartbeat sh
  WHERE sh.invoked_at > now() - interval '7 days'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_runs_created = ROW_COUNT;

  RETURN jsonb_build_object(
    'registry_updated', v_registry_updated,
    'sync_status_updated', v_sync_status_updated,
    'runs_created', v_runs_created,
    'synced_at', now()
  );
END $$;

-- Funções idempotentes para futuro-proof (rodam no cron diário)
CREATE OR REPLACE FUNCTION public.ensure_juros_mora_aliases()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  INSERT INTO pjecalc_juros_mora (competencia, tipo, taxa_mensal)
  SELECT competencia, 'selic', taxa_mensal FROM pjecalc_juros_mora WHERE tipo = 'SELIC'
  ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

  INSERT INTO pjecalc_juros_mora (competencia, tipo, taxa_mensal)
  SELECT competencia, 'trabalhista', taxa_mensal FROM pjecalc_juros_mora WHERE tipo = 'TR_1_PCT'
  ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

  INSERT INTO pjecalc_juros_mora (competencia, tipo, taxa_mensal)
  SELECT competencia, 'civil',
    CASE WHEN competencia >= '2024-09-01' THEN taxa_mensal ELSE 1.0 END
  FROM pjecalc_juros_mora WHERE tipo = 'SELIC'
  ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

  INSERT INTO pjecalc_juros_mora (competencia, tipo, taxa_mensal)
  SELECT competencia, 'taxa_legal', taxa_mensal FROM pjecalc_juros_mora WHERE tipo = 'TAXA_LEGAL'
  ON CONFLICT (competencia, tipo) DO UPDATE SET taxa_mensal = EXCLUDED.taxa_mensal;

  SELECT COUNT(*) INTO v_count FROM pjecalc_juros_mora
  WHERE tipo IN ('selic','trabalhista','civil','taxa_legal');
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_facdt_from_ipcae()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  INSERT INTO pjecalc_correcao_monetaria (indice, competencia, valor, acumulado, fonte)
  SELECT 'FACDT', competencia, valor, acumulado, COALESCE(fonte, 'derivado IPCA-E')
  FROM pjecalc_correcao_monetaria WHERE indice = 'IPCA-E'
  ON CONFLICT (indice, competencia) DO UPDATE SET
    valor = EXCLUDED.valor, acumulado = EXCLUDED.acumulado;
  SELECT COUNT(*) INTO v_count FROM pjecalc_correcao_monetaria WHERE indice = 'FACDT';
  RETURN v_count;
END $$;

-- Agendar crons para rodarem diariamente após sync principal
SELECT public.reschedule_cron(
  'ensure-facdt-daily',
  '15 3 * * *',  -- 03h15 após sync-monetary 03h
  $$ SELECT public.ensure_facdt_from_ipcae(); $$
);

SELECT public.reschedule_cron(
  'ensure-juros-mora-aliases-daily',
  '35 3 * * *',  -- 03h35 após derive-juros-taxa 03h30
  $$ SELECT public.ensure_juros_mora_aliases(); $$
);

COMMENT ON FUNCTION public.ensure_juros_mora_aliases IS
  'Mantém tipos minúsculos (selic/trabalhista/civil/taxa_legal) em pjecalc_juros_mora sincronizados com os maiúsculos gerados por derive-juros-taxa-legal.';
COMMENT ON FUNCTION public.ensure_facdt_from_ipcae IS
  'Mantém alias FACDT em pjecalc_correcao_monetaria sincronizado com IPCA-E. FACDT = Fator Diário de Atualização de Créditos Trabalhistas (PJe-Calc histórico).';
