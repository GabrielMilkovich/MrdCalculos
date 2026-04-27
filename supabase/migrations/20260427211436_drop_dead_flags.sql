-- ============================================================
-- Sprint 4.2-C2: drop dead flag columns (cleanup)
--
-- Removes columns identified as dead in Sprint 4.1 triagem
-- (.claude/agents/state/SPRINT-AUDIT/I-SPRINT4-1-TRIAGEM.md)
-- that have:
--   - 0 references in src/lib/pjecalc/* engine code, AND
--   - duplicates of an already-active column, OR
--   - no consumer downstream.
--
-- Idempotent: uses DROP COLUMN IF EXISTS so the migration is safe
-- to re-run on environments where the columns were never present.
-- ============================================================

-- pjecalc_calculos: drop 3 dead boolean flags
--   * considera_feriado_nacional       — 0 refs, sem efeito (engine usa lista de feriados nacionais por padrao)
--   * zera_valor_negativo              — duplica zera_negativo (col legacy ativa via view pjecalc_parametros)
--   * limitar_avos_periodo_calculo     — duplica limitar_avos (col legacy ativa via view pjecalc_parametros)
ALTER TABLE public.pjecalc_calculos
  DROP COLUMN IF EXISTS considera_feriado_nacional,
  DROP COLUMN IF EXISTS zera_valor_negativo,
  DROP COLUMN IF EXISTS limitar_avos_periodo_calculo;

NOTIFY pgrst, 'reload schema';
