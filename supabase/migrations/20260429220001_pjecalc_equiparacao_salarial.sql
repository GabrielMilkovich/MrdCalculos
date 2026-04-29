-- =====================================================
-- ModuloEquiparacaoSalarial — persistência canônica
-- Súmula 6 TST + Art. 461 CLT
-- =====================================================
--
-- 1) Tabela dedicada `pjecalc_equiparacao_salarial` para os dados estruturais
--    do paradigma (cabeçalho).
-- 2) Coluna `equiparacao_config` em `pjecalc_calculos` (JSONB) para a
--    configuração consumida pelo orchestrator (mantém paridade com os demais
--    blocos: periculosidade_config, danos_morais_config, estabilidade_config).
-- 3) View `pjecalc_multas_config` reescrita expondo o JSONB ao SDK.
-- =====================================================

-- 1) Coluna JSONB no calculo (consumida pelo orchestrator)
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS equiparacao_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pjecalc_calculos.equiparacao_config IS
  'Configuração de equiparação salarial (Súmula 6 TST + Art. 461 CLT). Chaves: ativo, paradigma_nome, paradigma_funcao, periodo_inicio, periodo_fim, salarios[].';

-- 2) Tabela estrutural opcional (cabeçalho + período do paradigma)
CREATE TABLE IF NOT EXISTS public.pjecalc_equiparacao_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  paradigma_nome TEXT NOT NULL,
  paradigma_funcao TEXT,
  paradigma_salario NUMERIC(14, 2),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pjecalc_equiparacao_calculo
  ON public.pjecalc_equiparacao_salarial(calculo_id);

ALTER TABLE public.pjecalc_equiparacao_salarial ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pjecalc_equiparacao_salarial'
      AND policyname = 'Users manage own equiparacao salarial'
  ) THEN
    CREATE POLICY "Users manage own equiparacao salarial"
      ON public.pjecalc_equiparacao_salarial
      FOR ALL TO authenticated
      USING (calculo_id IN (SELECT id FROM public.pjecalc_calculos WHERE user_id = auth.uid()))
      WITH CHECK (calculo_id IN (SELECT id FROM public.pjecalc_calculos WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 3) View pjecalc_multas_config — recriar expondo equiparacao_config
CREATE OR REPLACE VIEW public.pjecalc_multas_config AS
SELECT
  c.id,
  c.case_id,
  c.multa_477_habilitada AS multa_477,
  c.multa_467_habilitada AS multa_467,
  c.equiparacao_config,
  c.created_at
FROM public.pjecalc_calculos c;

ALTER VIEW public.pjecalc_multas_config SET (security_invoker = on);

NOTIFY pgrst, 'reload schema';
