-- =====================================================
-- TELEMETRIA DE DIVERGENCIAS — opcao D do PLANO-PARA-99
-- =====================================================
-- Coleta automatica de divergencias entre engine v3 e PJe-Calc oficial
-- reportadas pelos 20-50 usuarios piloto. Cada caso real onde o usuario
-- digitar valor PJe-Calc oficial diferente do calculado pelo engine vira
-- 1 row aqui.
--
-- Apos 30+ rows, recalibrar matriz authority + investigar bugs comuns.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.engine_divergence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Campo onde a divergencia foi observada
  campo TEXT NOT NULL CHECK (campo IN (
    'liquido_reclamante', 'principal_corrigido', 'juros_mora',
    'cs_segurado', 'cs_empregador', 'ir_retido',
    'fgts_total', 'multa_523', 'multa_467', 'multa_477',
    'honorarios_sucumbenciais', 'honorarios_contratuais',
    'custas', 'pensao_total', 'previdencia_privada',
    'salario_familia', 'seguro_desemprego', 'outro'
  )),
  campo_outro TEXT,                -- Quando campo='outro'
  valor_engine NUMERIC(20,2) NOT NULL,
  valor_pjecalc_oficial NUMERIC(20,2) NOT NULL,
  delta_absoluto NUMERIC(20,2) GENERATED ALWAYS AS (valor_engine - valor_pjecalc_oficial) STORED,
  delta_pct NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE
      WHEN valor_pjecalc_oficial = 0 THEN 0
      ELSE ((valor_engine - valor_pjecalc_oficial) / valor_pjecalc_oficial * 100)
    END
  ) STORED,
  observacao TEXT,                 -- usuario explica o que viu
  pjecalc_oficial_arquivo TEXT,    -- url/path do PDF/print PJe-Calc oficial
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'investigando', 'fix_planejado', 'fix_aplicado', 'falso_positivo', 'aceito_atipico')),
  fix_commit_sha TEXT,             -- SHA do commit que fixou (quando status=fix_aplicado)
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_divergence_status ON public.engine_divergence_reports(status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_divergence_campo ON public.engine_divergence_reports(campo, abs(delta_pct));
CREATE INDEX IF NOT EXISTS idx_divergence_case ON public.engine_divergence_reports(case_id);

ALTER TABLE public.engine_divergence_reports ENABLE ROW LEVEL SECURITY;

-- User can insert reports for their own cases
CREATE POLICY "user_insert_divergence" ON public.engine_divergence_reports
  FOR INSERT WITH CHECK (
    case_id IN (SELECT id FROM public.cases WHERE criado_por = auth.uid())
    AND user_id = auth.uid()
  );

-- User sees only their own reports
CREATE POLICY "user_select_own_divergence" ON public.engine_divergence_reports
  FOR SELECT USING (user_id = auth.uid());

-- Admin (service_role) sees all + can update status
CREATE POLICY "admin_all_divergence" ON public.engine_divergence_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.touch_divergence_reports()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_divergence_touch
  BEFORE UPDATE ON public.engine_divergence_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_divergence_reports();

COMMENT ON TABLE public.engine_divergence_reports IS
  'Telemetria de divergencias engine vs PJe-Calc oficial (opcao D PLANO-PARA-99). Apos 30+ casos, recalibra engine.';
