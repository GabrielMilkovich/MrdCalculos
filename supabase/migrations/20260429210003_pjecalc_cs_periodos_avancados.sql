-- =====================================================
-- ModuloCS — 3 períodos avançados (paridade PJe-Calc oficial)
-- =====================================================
-- O PJe-Calc oficial expõe três intervalos para a Contribuição
-- Social/INSS na tela de "Sobre Quais Verbas Calcular":
--   1) Sobre Salários Devidos  (cs_devidos_data_inicial/final)
--   2) Sobre Salários Pagos    (cs_pagos_data_inicial/final)
--   3) Mês da Reclamação       (cs_mes_reclamacao — DATE)
-- Os campos atuais inicio_periodo/fim_periodo continuam servindo
-- ao modo SIMPLES (retrocompatibilidade).
-- =====================================================

ALTER TABLE public.pjecalc_cs_config
  ADD COLUMN IF NOT EXISTS cs_devidos_data_inicial DATE,
  ADD COLUMN IF NOT EXISTS cs_devidos_data_final DATE,
  ADD COLUMN IF NOT EXISTS cs_pagos_data_inicial DATE,
  ADD COLUMN IF NOT EXISTS cs_pagos_data_final DATE,
  ADD COLUMN IF NOT EXISTS cs_mes_reclamacao DATE;

COMMENT ON COLUMN public.pjecalc_cs_config.cs_devidos_data_inicial IS
  'Período "Sobre Salários Devidos" — data inicial (paridade PJe-Calc).';
COMMENT ON COLUMN public.pjecalc_cs_config.cs_devidos_data_final IS
  'Período "Sobre Salários Devidos" — data final (paridade PJe-Calc).';
COMMENT ON COLUMN public.pjecalc_cs_config.cs_pagos_data_inicial IS
  'Período "Sobre Salários Pagos" — data inicial (paridade PJe-Calc).';
COMMENT ON COLUMN public.pjecalc_cs_config.cs_pagos_data_final IS
  'Período "Sobre Salários Pagos" — data final (paridade PJe-Calc).';
COMMENT ON COLUMN public.pjecalc_cs_config.cs_mes_reclamacao IS
  'Mês da Reclamação para cálculo da Contribuição Social (paridade PJe-Calc).';

NOTIFY pgrst, 'reload schema';
