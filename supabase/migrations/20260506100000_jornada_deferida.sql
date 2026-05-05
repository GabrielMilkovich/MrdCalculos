-- =====================================================
-- Sistema de Jornada Deferida pela Sentença (PR 2 v5)
-- =====================================================
-- Captura a regra que o juiz fixou na sentença e permite aplicá-la sobre
-- o CSV gerado pelo parser de cartão de ponto, transformando os horários
-- antes do download.
--
-- Padrão típico:
--   "Fixo a jornada do reclamante como sendo os dias constantes dos cartões
--    de ponto, com início da jornada 1 hora antes e término 1 hora depois
--    do horário lá registrado e intervalo de 30 minutos."
--   "Em datas comemorativas, como dia das mães, dia dos pais, Black Friday
--    etc., trabalhavam das 7:30 até 21:30, com 30 minutos de intervalo."
--
-- 1:1 com cases — uma regra base por caso. Overrides específicos via
-- `case_jornada_override` (data fixa OU regra recorrente do calendário
-- comemorativo).
-- =====================================================

BEGIN;

CREATE TYPE jornada_tipo AS ENUM ('offset', 'fixa', 'mista');

CREATE TABLE case_jornada_regra (
  case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  tipo jornada_tipo NOT NULL DEFAULT 'offset',
  delta_inicio_min int NOT NULL DEFAULT 0,
  delta_fim_min int NOT NULL DEFAULT 0,
  intervalo_min int,
  vigencia_inicio date,
  vigencia_fim date,
  texto_sentenca text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE case_jornada_regra IS
  'Regra base de jornada deferida pela sentença. delta_inicio negativo = antes; delta_fim positivo = depois. intervalo_min NULL = manter intervalo do cartão.';

CREATE TABLE case_jornada_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  data_especifica date,
  regra_recorrente jsonb,
  inicio_hora time NOT NULL,
  fim_hora time NOT NULL,
  intervalo_min int NOT NULL,
  descricao text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_jornada_override_data_xor_regra
    CHECK (
      (data_especifica IS NOT NULL AND regra_recorrente IS NULL) OR
      (data_especifica IS NULL AND regra_recorrente IS NOT NULL)
    )
);

CREATE INDEX idx_case_jornada_override_case ON case_jornada_override(case_id);
CREATE INDEX idx_case_jornada_override_data ON case_jornada_override(case_id, data_especifica);

COMMENT ON COLUMN case_jornada_override.regra_recorrente IS
  'Regra do calendário comemorativo. Ex: {"tipo":"dia_das_maes"} (2º domingo de maio), {"tipo":"black_friday"} (última sexta de novembro), {"tipo":"dia_fixo","mes":12,"dia":24}.';

ALTER TABLE case_jornada_regra ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_jornada_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_jornada_regra_select_via_case_ownership
  ON case_jornada_regra FOR SELECT
  USING (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()));

CREATE POLICY case_jornada_regra_mutate_via_case_ownership
  ON case_jornada_regra FOR ALL
  USING (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()));

CREATE POLICY case_jornada_override_select_via_case_ownership
  ON case_jornada_override FOR SELECT
  USING (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()));

CREATE POLICY case_jornada_override_mutate_via_case_ownership
  ON case_jornada_override FOR ALL
  USING (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE criado_por = auth.uid()));

-- Trigger pra manter atualizado_em
CREATE OR REPLACE FUNCTION case_jornada_regra_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_jornada_regra_updated_at
BEFORE UPDATE ON case_jornada_regra
FOR EACH ROW EXECUTE FUNCTION case_jornada_regra_set_updated_at();

COMMIT;
