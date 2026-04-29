-- =====================================================
-- ModuloFGTS — período de incidência explícito (paridade PJe-Calc)
-- =====================================================
-- Adiciona DATE colunas opcionais ao pjecalc_fgts_config para
-- delimitar o intervalo de incidência do FGTS quando o usuário
-- precisa restringir o cálculo (paridade com tela oficial).
-- =====================================================

ALTER TABLE public.pjecalc_fgts_config
  ADD COLUMN IF NOT EXISTS data_inicial_incidencia DATE,
  ADD COLUMN IF NOT EXISTS data_final_incidencia DATE;

COMMENT ON COLUMN public.pjecalc_fgts_config.data_inicial_incidencia IS
  'Data inicial do período de incidência do FGTS (paridade PJe-Calc).';
COMMENT ON COLUMN public.pjecalc_fgts_config.data_final_incidencia IS
  'Data final do período de incidência do FGTS (paridade PJe-Calc).';

NOTIFY pgrst, 'reload schema';
