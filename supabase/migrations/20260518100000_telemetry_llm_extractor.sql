-- FASE 3.4 — telemetria do LLM extractor (shadow check parser × IA).
--
-- Cada download de CSV passa agora pelo comparador parser × LLM. As 4
-- colunas abaixo registram:
--   - llm_invoked:               TRUE se a edge function extract-rubricas-ai
--                                foi chamada nesse export (today: sempre
--                                para holerite). Permite KPI de adoção.
--   - llm_ai_confidence:         0..100, autoreportado pela IA. Útil pra
--                                cruzar com taxa de aprovação real.
--   - llm_parser_concordancia:   0.000..1.000, fração de rubricas em que
--                                parser e IA chegaram ao MESMO nome+valor.
--                                taxa < 0.70 força bloqueador no dialog.
--   - llm_status:                'ok' | 'unavailable' | 'timeout' |
--                                'rate_limit' | 'error' | 'not_attempted'.
--                                Vital para entender por que IA não rodou.
--
-- Compatível com `npx supabase db reset` local — usa IF NOT EXISTS.
-- Não edita migrations já aplicadas (CLAUDE.md).

ALTER TABLE public.csv_export_telemetry
  ADD COLUMN IF NOT EXISTS llm_invoked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS llm_ai_confidence integer,
  ADD COLUMN IF NOT EXISTS llm_parser_concordancia numeric(4, 3),
  ADD COLUMN IF NOT EXISTS llm_status text;

-- Constraint informativa: llm_status só aceita o union conhecido. Não
-- bloqueia inserção quando NULL (campo opcional).
ALTER TABLE public.csv_export_telemetry
  DROP CONSTRAINT IF EXISTS csv_export_telemetry_llm_status_check;

ALTER TABLE public.csv_export_telemetry
  ADD CONSTRAINT csv_export_telemetry_llm_status_check
  CHECK (
    llm_status IS NULL OR
    llm_status IN ('ok', 'unavailable', 'timeout', 'rate_limit', 'error', 'not_attempted')
  );

COMMENT ON COLUMN public.csv_export_telemetry.llm_invoked IS
  'FASE 3.4: true quando extract-rubricas-ai foi chamada (shadow check parser × IA).';
COMMENT ON COLUMN public.csv_export_telemetry.llm_ai_confidence IS
  'FASE 3.4: 0..100, confiança autoreportada pela IA (response.ai_confidence).';
COMMENT ON COLUMN public.csv_export_telemetry.llm_parser_concordancia IS
  'FASE 3.4: 0.000..1.000, taxa de rubricas em que IA e parser determinístico bateram.';
COMMENT ON COLUMN public.csv_export_telemetry.llm_status IS
  'FASE 3.4: status da chamada IA — ok/unavailable/timeout/rate_limit/error/not_attempted.';
