-- =====================================================
-- Telemetria de exportação de CSV (V7+)
-- =====================================================
-- Registra cada download de CSV/ZIP gerado pelos dialogs de revisão.
-- Permite medir KPI "% de exports sem perda" e detectar regressões em
-- mappers/parsers ao longo do tempo.
--
-- Cada linha = 1 clique em "Confirmar e baixar". O `report` jsonb tem
-- a íntegra do BuildReport (linhasRejeitadas, linhasAjustadas, warnings)
-- pra debugging post-mortem.
-- =====================================================

BEGIN;

CREATE TABLE csv_export_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  builder text NOT NULL CHECK (builder IN (
    'cartao_ponto', 'holerite', 'ferias', 'faltas', 'ctps'
  )),
  linhas_geradas int NOT NULL DEFAULT 0,
  linhas_rejeitadas int NOT NULL DEFAULT 0,
  linhas_ajustadas int NOT NULL DEFAULT 0,
  warnings int NOT NULL DEFAULT 0,
  baixado_com_perdas boolean NOT NULL DEFAULT false,
  report jsonb NOT NULL,
  parser_origem text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_csv_export_telemetry_case
  ON csv_export_telemetry(case_id, criado_em DESC);
CREATE INDEX idx_csv_export_telemetry_builder
  ON csv_export_telemetry(builder, criado_em DESC);
CREATE INDEX idx_csv_export_telemetry_perdas
  ON csv_export_telemetry(baixado_com_perdas, criado_em DESC)
  WHERE baixado_com_perdas = true;

COMMENT ON TABLE csv_export_telemetry IS
  'Telemetria de fidelidade extração→CSV. Cada linha = 1 download.';

ALTER TABLE csv_export_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY csv_export_telemetry_select_own
  ON csv_export_telemetry FOR SELECT
  USING (
    criado_por = auth.uid()
    OR case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid())
  );

CREATE POLICY csv_export_telemetry_insert_self
  ON csv_export_telemetry FOR INSERT
  WITH CHECK (
    criado_por = auth.uid()
    AND (
      case_id IS NULL
      OR case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid())
    )
  );

COMMIT;
