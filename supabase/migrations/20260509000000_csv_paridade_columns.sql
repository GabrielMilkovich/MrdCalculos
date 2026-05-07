-- =====================================================
-- Paridade extração ↔ CSV — Fase C
-- =====================================================
-- Adiciona telemetria de paridade ao csv_export_telemetry:
--   - campos_nao_exportados: jsonb com {campo, motivo} de cada campo
--     do parsed que NÃO chegou ao CSV importável (vai só pra auditoria
--     ou completa). Útil pra dashboard de paridade.
--   - View v_csv_paridade_diaria: KPI agregado por builder/dia.
-- =====================================================

BEGIN;

ALTER TABLE csv_export_telemetry
  ADD COLUMN IF NOT EXISTS campos_nao_exportados jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN csv_export_telemetry.campos_nao_exportados IS
  'Campos do parsed que existem mas não chegam ao CSV importável (PJe-Calc). '
  'Cada item: {campo: string, motivo: string}. Vazio = paridade total.';

CREATE INDEX IF NOT EXISTS idx_csv_export_telemetry_paridade
  ON csv_export_telemetry((jsonb_array_length(campos_nao_exportados)));

-- =====================================================
-- View: paridade diária agregada por builder
-- =====================================================
-- KPIs:
--   - total_downloads: contagem total de exports no dia
--   - sem_perda_pct: % de exports sem rejeições nem campos não-exportados
--   - com_rejeicoes: contagem com linhas_rejeitadas > 0
--   - com_campos_omitidos: contagem com campos_nao_exportados não-vazio
--   - linhas_geradas_total / linhas_rejeitadas_total: somas absolutas
--
-- Útil pra dashboard /admin/telemetria-csv.
-- =====================================================

CREATE OR REPLACE VIEW v_csv_paridade_diaria AS
SELECT
  date_trunc('day', criado_em) AS dia,
  builder,
  COUNT(*) AS total_downloads,
  COUNT(*) FILTER (
    WHERE linhas_rejeitadas = 0
      AND jsonb_array_length(campos_nao_exportados) = 0
  ) AS downloads_paridade_total,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE linhas_rejeitadas = 0
        AND jsonb_array_length(campos_nao_exportados) = 0
    ) / NULLIF(COUNT(*), 0),
    2
  ) AS paridade_total_pct,
  COUNT(*) FILTER (WHERE linhas_rejeitadas > 0) AS com_rejeicoes,
  COUNT(*) FILTER (
    WHERE jsonb_array_length(campos_nao_exportados) > 0
  ) AS com_campos_omitidos,
  COUNT(*) FILTER (WHERE baixado_com_perdas = true) AS baixados_com_perda,
  COUNT(*) FILTER (
    WHERE baixado_com_perdas = true
      AND coalesce(bloqueio_burlado, false) = true
  ) AS bloqueio_burlado_count,
  SUM(linhas_geradas) AS linhas_geradas_total,
  SUM(linhas_rejeitadas) AS linhas_rejeitadas_total,
  SUM(linhas_ajustadas) AS linhas_ajustadas_total
FROM csv_export_telemetry
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

COMMENT ON VIEW v_csv_paridade_diaria IS
  'KPI diário de paridade extração ↔ CSV por builder. '
  'paridade_total_pct = % downloads sem rejeição nem campo omitido. '
  'Alimenta dashboard /admin/telemetria-csv.';

COMMIT;
