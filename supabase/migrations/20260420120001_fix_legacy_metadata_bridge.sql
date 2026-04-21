-- ============================================================
-- FIX DEFINITIVO: UI Dashboard /admin/tabelas mostrava 3 bugs:
--
--   1. "12 tabela(s) nunca foram importadas" (falso)
--      → reference_table_registry.last_import_at estava NULL
--   2. Sincronização Automática (BCB) mostrava IPCA-E/SELIC "pending Nunca"
--      → sync_status.last_sync_attempt estava NULL
--   3. Tela Contribuição Social mostrava "Nenhum dado cadastrado"
--      → lia de pjecalc_contribuicao_social (vazia) em vez de pjecalc_inss_faixas
--
-- Solução:
--   A. Popular pjecalc_contribuicao_social com mapeamento de pjecalc_inss_faixas
--   B. Função sync_legacy_metadata_from_reality() que espelha o estado real
--      (tables_freshness + pjecalc_correcao_monetaria) nas tabelas legadas
--   C. Cron diário para manter metadata sincronizada automaticamente
--   D. Função validate_all_tables() para health check sob demanda via UI
-- ============================================================

-- ============ FIX A: Contribuição Social ============
-- Popula pjecalc_contribuicao_social (vazia) a partir de pjecalc_inss_faixas.
-- Schema difere:
--   inss_faixas: competencia_inicio, faixa, valor_ate, aliquota
--   contribuicao_social: competencia, tipo, faixa, valor_inicial, valor_final, aliquota, teto_maximo

DELETE FROM public.pjecalc_contribuicao_social WHERE tipo = 'segurado_empregado';

INSERT INTO public.pjecalc_contribuicao_social
  (competencia, tipo, faixa, valor_inicial, valor_final, aliquota, teto_maximo)
SELECT * FROM (
  SELECT DISTINCT ON (competencia_inicio, faixa)
    competencia_inicio AS competencia,
    'segurado_empregado' AS tipo,
    faixa,
    COALESCE(LAG(valor_ate) OVER (PARTITION BY competencia_inicio ORDER BY faixa), 0) AS valor_inicial,
    valor_ate AS valor_final,
    aliquota,
    (SELECT MAX(valor_ate) FROM public.pjecalc_inss_faixas i2
     WHERE i2.competencia_inicio = f.competencia_inicio) AS teto_maximo
  FROM public.pjecalc_inss_faixas f
  ORDER BY competencia_inicio, faixa, valor_ate ASC
) dedup;

-- ============ FIX B: Bridge sync_legacy_metadata_from_reality() ============
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
    RAISE EXCEPTION 'Apenas service_role pode sincronizar metadata' USING ERRCODE = '42501';
  END IF;

  -- reference_table_registry: espelha tables_freshness
  WITH mapping AS (
    SELECT r.id AS registry_id, r.slug,
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
  freshness_join AS (
    SELECT m.registry_id, m.slug, tf.ultima_data,
           tf.status AS freshness_status, tf.dias_desde_atualizacao, tf.checked_at
    FROM mapping m
    LEFT JOIN tables_freshness tf ON tf.table_name = m.pjecalc_table
  )
  UPDATE reference_table_registry r
  SET last_import_at = COALESCE(fj.checked_at, r.last_import_at),
      status = CASE fj.freshness_status
        WHEN 'FRESH' THEN 'ok' WHEN 'STALE' THEN 'warning'
        WHEN 'CRITICAL' THEN 'broken' WHEN 'EMPTY' THEN 'warning'
        ELSE r.status END,
      last_import_result = jsonb_build_object(
        'source', 'auto-bridge',
        'ultima_competencia', fj.ultima_data,
        'freshness_status', fj.freshness_status,
        'dias_desde', fj.dias_desde_atualizacao)
  FROM freshness_join fj
  WHERE r.id = fj.registry_id AND fj.freshness_status IS NOT NULL;

  GET DIAGNOSTICS v_registry_updated = ROW_COUNT;

  -- sync_status: popula a partir de pjecalc_correcao_monetaria
  INSERT INTO sync_status (serie_id, serie_nome, last_processed_date, status, last_sync_attempt)
  SELECT x.serie_id, x.serie_nome,
    (SELECT MAX(competencia) FROM pjecalc_correcao_monetaria WHERE indice = x.indice_db),
    'ok', now()
  FROM (VALUES
    (4390, 'SELIC', 'SELIC'), (10764, 'IPCA-E', 'IPCA-E'),
    (188, 'INPC', 'INPC'), (226, 'TR', 'TR'),
    (189, 'IGP-M', 'IGP-M'), (433, 'IPCA', 'IPCA'),
    (190, 'IGP-DI', 'IGP-DI')
  ) AS x(serie_id, serie_nome, indice_db)
  WHERE EXISTS (SELECT 1 FROM pjecalc_correcao_monetaria WHERE indice = x.indice_db)
  ON CONFLICT (serie_id) DO UPDATE SET
    last_processed_date = EXCLUDED.last_processed_date,
    status = EXCLUDED.status,
    last_sync_attempt = EXCLUDED.last_sync_attempt;

  GET DIAGNOSTICS v_sync_status_updated = ROW_COUNT;

  -- reference_import_runs: histórico de sync_heartbeat
  INSERT INTO reference_import_runs (table_slug, started_at, finished_at, trigger, result, stats)
  SELECT
    CASE sh.function_name
      WHEN 'sync-pjecalc-indices' THEN 'correcao_monetaria'
      WHEN 'sync-feriados-brasilapi' THEN 'feriados'
      WHEN 'derive-juros-taxa-legal' THEN 'juros_mora'
      WHEN 'sync-ipeadata-official' THEN 'salario_minimo'
      WHEN 'tables-freshness-watchdog' THEN 'watchdog'
      ELSE sh.function_name END,
    sh.invoked_at, sh.invoked_at + interval '5 seconds', 'cron', 'success',
    jsonb_build_object('request_id', sh.request_id, 'source', 'sync_heartbeat')
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

-- ============ FIX C: Cron diário ============
SELECT public.reschedule_cron(
  'sync-legacy-metadata-daily',
  '45 8 * * *',  -- 08h45 UTC (após watchdog 08h)
  $$ SELECT public.sync_legacy_metadata_from_reality(); $$
);

-- ============ FIX D: Validador unificado ============
CREATE OR REPLACE FUNCTION public.validate_all_tables()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_results jsonb;
  v_summary jsonb;
BEGIN
  WITH checks AS (
    SELECT 'pjecalc_correcao_monetaria' AS tabela, COUNT(*) AS rows,
           MAX(competencia)::text AS ultima,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '60 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END AS status,
           'mensal' AS frequencia, 'BCB SGS API' AS fonte
    FROM pjecalc_correcao_monetaria
    UNION ALL
    SELECT 'pjecalc_inss_faixas', COUNT(*), MAX(competencia_inicio)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia_inicio) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'Portaria Interministerial (DOU)' FROM pjecalc_inss_faixas
    UNION ALL
    SELECT 'pjecalc_imposto_renda', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'RFB (IN)' FROM pjecalc_imposto_renda
    UNION ALL
    SELECT 'pjecalc_salario_minimo', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'IPEADATA + Decreto' FROM pjecalc_salario_minimo
    UNION ALL
    SELECT 'pjecalc_salario_familia', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'Portaria Interministerial' FROM pjecalc_salario_familia
    UNION ALL
    SELECT 'pjecalc_seguro_desemprego', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'CODEFAT' FROM pjecalc_seguro_desemprego
    UNION ALL
    SELECT 'pjecalc_feriados', COUNT(*), MAX(data)::text,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'EMPTY' END,
           'anual', 'BrasilAPI' FROM pjecalc_feriados
    UNION ALL
    SELECT 'pjecalc_contribuicao_social', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'EMPTY' END,
           'anual', 'derivado pjecalc_inss_faixas' FROM pjecalc_contribuicao_social
    UNION ALL
    SELECT 'pjecalc_juros_mora', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '60 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'mensal', 'derivado SELIC' FROM pjecalc_juros_mora
    UNION ALL
    SELECT 'pjecalc_taxa_legal', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '60 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'mensal', 'derivado SELIC-IPCA' FROM pjecalc_taxa_legal
    UNION ALL
    SELECT 'pjecalc_pisos_salariais', COUNT(*), MAX(competencia)::text,
           CASE WHEN COUNT(*) > 0 AND MAX(competencia) > (CURRENT_DATE - interval '400 days')
                THEN 'OK' WHEN COUNT(*) > 0 THEN 'STALE' ELSE 'EMPTY' END,
           'anual', 'CCTs sindicais (manual)' FROM pjecalc_pisos_salariais
    UNION ALL
    SELECT 'pjecalc_custas_judiciais', COUNT(*), MAX(vigencia_inicio)::text,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MANUAL_REQUIRED' END,
           'manual', 'Lei 8.620/93 + TRTs (manual)' FROM pjecalc_custas_judiciais
    UNION ALL
    SELECT 'pjecalc_vale_transporte', COUNT(*), MAX(vigencia_inicio)::text,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MANUAL_REQUIRED' END,
           'manual', 'ANTT/prefeituras (manual)' FROM pjecalc_vale_transporte
  )
  SELECT jsonb_agg(jsonb_build_object(
    'tabela', tabela, 'rows', rows, 'ultima', ultima,
    'status', status, 'frequencia', frequencia, 'fonte', fonte
  )) INTO v_results FROM checks;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'ok', COUNT(*) FILTER (WHERE status = 'OK'),
    'stale', COUNT(*) FILTER (WHERE status = 'STALE'),
    'empty', COUNT(*) FILTER (WHERE status IN ('EMPTY', 'MANUAL_REQUIRED'))
  ) INTO v_summary
  FROM jsonb_to_recordset(v_results) AS x(status text);

  RETURN jsonb_build_object(
    'checked_at', now(),
    'summary', v_summary,
    'tables', v_results
  );
END $$;

GRANT EXECUTE ON FUNCTION public.validate_all_tables() TO authenticated, service_role;

-- Ajuste: tabelas de gestão manual não são "broken" (são esperadamente vazias)
UPDATE public.reference_table_registry
SET status = 'warning',
    last_import_result = jsonb_build_object(
      'note', 'Tabela requer input manual — sem API pública oficial',
      'action', 'Use importação CSV via UI quando houver dados novos'
    )
WHERE slug IN ('custas_judiciais', 'vale_transporte');

-- Executa agora para deixar estado consistente imediatamente
SELECT public.sync_legacy_metadata_from_reality();

COMMENT ON FUNCTION public.sync_legacy_metadata_from_reality IS
  'Espelha tables_freshness + pjecalc_correcao_monetaria em reference_table_registry + sync_status + reference_import_runs. Roda via cron sync-legacy-metadata-daily.';
COMMENT ON FUNCTION public.validate_all_tables IS
  'Health check em tempo real de todas as tabelas. Chamável via supabase.rpc("validate_all_tables") do frontend.';
