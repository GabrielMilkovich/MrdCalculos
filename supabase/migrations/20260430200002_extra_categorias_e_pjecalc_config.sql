INSERT INTO public.categorias_rubrica
  (slug, nome_exibicao, nome_pjecalc, ordem,
   default_incide_fgts, default_fgts_recolhido, default_incide_inss, default_inss_recolhido)
VALUES
  ('minimo_garantido', 'Mínimo Garantido', 'Mínimo Garantido', 5, true, true, true, true),
  ('salario_familia',  'Salário Família',  'Salário Família',  6, false, false, false, false)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.case_pjecalc_config (
  case_id UUID PRIMARY KEY REFERENCES public.cases(id) ON DELETE CASCADE,
  data_admissao DATE,
  data_demissao DATE,
  data_inicio_calculo DATE,
  data_termino_calculo DATE,
  data_ajuizamento DATE,
  cpf_beneficiario TEXT,
  nome_beneficiario TEXT,
  carga_horaria_padrao_minutos INTEGER DEFAULT 480,
  sabado_dia_util BOOLEAN DEFAULT false,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.case_pjecalc_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_pjecalc_config_owner" ON public.case_pjecalc_config;
CREATE POLICY "case_pjecalc_config_owner" ON public.case_pjecalc_config
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_pjecalc_config.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_pjecalc_config.case_id AND c.criado_por = auth.uid())
  );
