-- =====================================================
-- F0.4 — Telemetria: rastrear quando operador BURLA o quality gate
-- =====================================================
-- Adiciona coluna `bloqueio_burlado` em `csv_export_telemetry` que
-- captura quando o operador marcou explicitamente o checkbox override
-- "Confirmo que revisei manualmente cada divergência acima" para baixar
-- um CSV apesar de divergências detectadas (linhas rejeitadas, score
-- baixo, warnings críticos do parser).
--
-- Diferente de `baixado_com_perdas` (= existem linhas rejeitadas), esta
-- coluna registra DECISÃO HUMANA consciente de prosseguir mesmo com
-- problema sinalizado. KPI:
--   - Se `bloqueio_burlado` virar > 5% dos exports, parser está
--     sinalizando demais (false positive) OU advogados estão ignorando
--     warnings reais — investigar via amostragem.
--   - Audit trail jurídico: em caso de questionamento da OAB, é possível
--     mostrar que o operador clicou "Confirmo" (cobertura ético-legal
--     do uso da ferramenta).
-- =====================================================

BEGIN;

ALTER TABLE csv_export_telemetry
  ADD COLUMN bloqueio_burlado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN csv_export_telemetry.bloqueio_burlado IS
  'true quando operador marcou checkbox override "Confirmo que revisei manualmente" para baixar CSV apesar de divergências sinalizadas pelo parser. Audit trail jurídico.';

CREATE INDEX idx_csv_export_telemetry_burlado
  ON csv_export_telemetry(bloqueio_burlado, criado_em DESC)
  WHERE bloqueio_burlado = true;

COMMIT;
