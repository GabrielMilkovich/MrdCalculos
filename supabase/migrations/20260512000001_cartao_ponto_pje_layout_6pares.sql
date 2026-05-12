-- =====================================================
-- Cartão de Ponto — layout PJE-Calc (6 pares E/S por dia)
-- Estende pjecalc_apuracao_diaria (fonte do motor) com as
-- colunas estruturadas que a UI estilo PJE-Calc precisa,
-- e recria a view pjecalc_ponto_diario para projetá-las.
-- =====================================================

ALTER TABLE public.pjecalc_apuracao_diaria
  ADD COLUMN IF NOT EXISTS dia_semana TEXT,
  ADD COLUMN IF NOT EXISTS ocorrencia TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (ocorrencia IN ('NORMAL','FALTA','FERIADO','FOLGA','FERIAS','ATESTADO','LICENCA_MEDICA','DSR','COMPENSADO')),
  ADD COLUMN IF NOT EXISTS entrada_1 TEXT, ADD COLUMN IF NOT EXISTS saida_1 TEXT,
  ADD COLUMN IF NOT EXISTS entrada_2 TEXT, ADD COLUMN IF NOT EXISTS saida_2 TEXT,
  ADD COLUMN IF NOT EXISTS entrada_3 TEXT, ADD COLUMN IF NOT EXISTS saida_3 TEXT,
  ADD COLUMN IF NOT EXISTS entrada_4 TEXT, ADD COLUMN IF NOT EXISTS saida_4 TEXT,
  ADD COLUMN IF NOT EXISTS entrada_5 TEXT, ADD COLUMN IF NOT EXISTS saida_5 TEXT,
  ADD COLUMN IF NOT EXISTS entrada_6 TEXT, ADD COLUMN IF NOT EXISTS saida_6 TEXT,
  ADD COLUMN IF NOT EXISTS observacao TEXT;

UPDATE public.pjecalc_apuracao_diaria
SET ocorrencia = CASE
  WHEN is_ferias THEN 'FERIAS'
  WHEN is_falta THEN 'FALTA'
  WHEN is_feriado THEN 'FERIADO'
  WHEN is_afastamento THEN 'ATESTADO'
  WHEN is_dsr THEN 'DSR'
  WHEN is_compensado THEN 'COMPENSADO'
  ELSE 'NORMAL'
END
WHERE ocorrencia = 'NORMAL';

DROP VIEW IF EXISTS public.pjecalc_ponto_diario;

CREATE VIEW public.pjecalc_ponto_diario AS
SELECT
  a.id, a.calculo_id, a.case_id, a.data, a.dia_semana,
  a.ocorrencia,
  a.entrada_1, a.saida_1, a.entrada_2, a.saida_2, a.entrada_3, a.saida_3,
  a.entrada_4, a.saida_4, a.entrada_5, a.saida_5, a.entrada_6, a.saida_6,
  a.frequencia_str,
  a.minutos_trabalhados, a.minutos_extra_diaria, a.minutos_extra_semanal,
  a.minutos_extra_repouso, a.minutos_extra_feriado, a.minutos_noturno,
  a.minutos_intrajornada, a.minutos_interjornada, a.minutos_art384, a.minutos_art253,
  a.horas_trabalhadas, a.horas_extras_diaria, a.horas_extras_semanal, a.horas_noturnas,
  a.is_dsr, a.is_feriado, a.is_falta, a.is_ferias, a.is_afastamento, a.is_compensado,
  a.feriado_nome, a.origem, a.documento_id, a.pagina, a.observacao,
  a.created_at,
  to_char((a.data)::timestamp with time zone, 'YYYY-MM') AS competencia
FROM public.pjecalc_apuracao_diaria a;

CREATE OR REPLACE FUNCTION public.pjecalc_min_entre(h_inicio TEXT, h_fim TEXT)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  m1 INTEGER; m2 INTEGER;
BEGIN
  IF h_inicio IS NULL OR h_fim IS NULL OR h_inicio = '' OR h_fim = '' THEN RETURN 0; END IF;
  m1 := (split_part(h_inicio, ':', 1))::INT * 60 + (split_part(h_inicio, ':', 2))::INT;
  m2 := (split_part(h_fim, ':', 1))::INT * 60 + (split_part(h_fim, ':', 2))::INT;
  IF m2 < m1 THEN m2 := m2 + 1440; END IF;
  RETURN m2 - m1;
EXCEPTION WHEN OTHERS THEN RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.pjecalc_apuracao_diaria_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total_min INTEGER := 0;
BEGIN
  total_min := COALESCE(public.pjecalc_min_entre(NEW.entrada_1, NEW.saida_1), 0)
             + COALESCE(public.pjecalc_min_entre(NEW.entrada_2, NEW.saida_2), 0)
             + COALESCE(public.pjecalc_min_entre(NEW.entrada_3, NEW.saida_3), 0)
             + COALESCE(public.pjecalc_min_entre(NEW.entrada_4, NEW.saida_4), 0)
             + COALESCE(public.pjecalc_min_entre(NEW.entrada_5, NEW.saida_5), 0)
             + COALESCE(public.pjecalc_min_entre(NEW.entrada_6, NEW.saida_6), 0);

  IF total_min > 0 THEN
    NEW.minutos_trabalhados := total_min;
    NEW.horas_trabalhadas := ROUND((total_min / 60.0)::numeric, 2);
  END IF;

  NEW.frequencia_str := NULLIF(
    array_to_string(
      ARRAY(
        SELECT v FROM unnest(ARRAY[
          NEW.entrada_1, NEW.saida_1, NEW.entrada_2, NEW.saida_2,
          NEW.entrada_3, NEW.saida_3, NEW.entrada_4, NEW.saida_4,
          NEW.entrada_5, NEW.saida_5, NEW.entrada_6, NEW.saida_6
        ]) v WHERE v IS NOT NULL AND v <> ''
      ),
      ' | '
    ),
    ''
  );

  NEW.is_falta       := NEW.ocorrencia = 'FALTA';
  NEW.is_feriado     := NEW.ocorrencia = 'FERIADO';
  NEW.is_ferias      := NEW.ocorrencia = 'FERIAS';
  NEW.is_afastamento := NEW.ocorrencia IN ('ATESTADO','LICENCA_MEDICA');
  NEW.is_dsr         := NEW.ocorrencia = 'DSR';
  NEW.is_compensado  := NEW.ocorrencia = 'COMPENSADO';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pjecalc_apuracao_diaria_recompute ON public.pjecalc_apuracao_diaria;
CREATE TRIGGER trg_pjecalc_apuracao_diaria_recompute
  BEFORE INSERT OR UPDATE ON public.pjecalc_apuracao_diaria
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_apuracao_diaria_recompute();

CREATE INDEX IF NOT EXISTS idx_apuracao_case_data ON public.pjecalc_apuracao_diaria(case_id, data);
