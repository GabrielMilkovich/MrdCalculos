-- =====================================================
-- F2 — Telemetria IA: rastrear invocações de verify-extraction-ai
-- =====================================================
-- Adiciona 4 colunas em `csv_export_telemetry` para audit trail das
-- decisões IA tomadas pelo operador antes do download do CSV:
--
--   ai_invoked        — operador clicou "Verificar com IA"?
--   ai_changed_fields — quais campos a IA sugeriu mudar (e foram aceitos)
--   ai_confidence     — score 0..100 retornado pela IA na resposta
--   ai_skipped_reason — operador clicou "Pular análise"; razão capturada
--
-- KPIs futuros:
--   - % de exports onde IA foi invocada (cobertura).
--   - Top campos sugeridos (validar se a IA aprende padrões úteis).
--   - Taxa de "Pular análise" — se > 30%, prompts/UI estão atrapalhando.
--
-- Importante: estas colunas são NULL pra exports SEM IA invocada — manter
-- `ai_invoked` default false simplifica queries.
-- =====================================================

BEGIN;

ALTER TABLE csv_export_telemetry
  ADD COLUMN ai_invoked boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_changed_fields text[] NULL,
  ADD COLUMN ai_confidence numeric(5,2) NULL CHECK (
    ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100)
  ),
  ADD COLUMN ai_skipped_reason text NULL;

COMMENT ON COLUMN csv_export_telemetry.ai_invoked IS
  'true quando operador clicou "Verificar com IA" no review dialog (score 50-85).';
COMMENT ON COLUMN csv_export_telemetry.ai_changed_fields IS
  'Lista de campos modificados pela IA E aceitos pelo operador. Ex: ["competencia", "rubrica[3].valor_vencimento"].';
COMMENT ON COLUMN csv_export_telemetry.ai_confidence IS
  'Score 0..100 retornado pela IA na resposta structured. NULL quando IA não invocada ou falhou.';
COMMENT ON COLUMN csv_export_telemetry.ai_skipped_reason IS
  'Razão capturada quando operador clicou "Pular análise" — texto livre. NULL caso contrário.';

CREATE INDEX idx_csv_export_telemetry_ai
  ON csv_export_telemetry(ai_invoked, criado_em DESC)
  WHERE ai_invoked = true;

COMMIT;
