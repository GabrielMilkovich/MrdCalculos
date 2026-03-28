
-- ============================================================
-- TABELAS: pjecalc_excecoes_carga e pjecalc_excecoes_sabado
--
-- Exceções de carga horária e de tratamento de sábado por período.
-- Usadas para casos com jornada reduzida (ex: 36h/semana em bancos,
-- professores, etc.) ou períodos em que sábado conta como dia útil.
-- ============================================================

-- Exceções de carga horária (jornada diferente da padrão por período)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  carga_horaria_mensal numeric NOT NULL, -- ex: 180 para 36h/semana
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_carga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR SELECT
  USING (true);

-- Exceções de sábado (períodos em que sábado é tratado como dia útil)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_sabado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  sabado_dia_util boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_sabado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR SELECT
  USING (true);

-- Índices para lookup por case_id e período
CREATE INDEX IF NOT EXISTS idx_excecoes_carga_case_id
  ON public.pjecalc_excecoes_carga(case_id);
CREATE INDEX IF NOT EXISTS idx_excecoes_sabado_case_id
  ON public.pjecalc_excecoes_sabado(case_id);
