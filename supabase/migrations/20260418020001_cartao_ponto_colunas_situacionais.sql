-- ============================================================
-- Cartão de Ponto: colunas situacionais PJe-Calc
--
-- Adiciona colunas discriminadas por situação (feriado/repouso) em
-- `pjecalc_cartao_ponto` para permitir apuração idêntica ao PJe-Calc.
--
-- Colunas legadas (horas_extras_50/100, dsr_horas, intervalo_suprimido)
-- são mantidas para backward-compat com CSVs existentes.
-- ============================================================

DO $$
BEGIN
  -- Se a tabela existir (não é só view), adiciona as colunas
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pjecalc_cartao_ponto' AND table_type='BASE TABLE') THEN

    ALTER TABLE public.pjecalc_cartao_ponto
      ADD COLUMN IF NOT EXISTS feriados_repousos_trabalhados numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_ext_diarias                numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_ext_feriados               numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_ext_repousos               numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_ext_feriados_repousos      numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_interjornada               numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_interjornada_feriado       numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_interjornada_repouso       numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hs_interjornada_trabalhada    numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS repousos_trabalhados          numeric DEFAULT 0;

    COMMENT ON COLUMN public.pjecalc_cartao_ponto.feriados_repousos_trabalhados
      IS 'Qtd. de feriados+repousos em que houve trabalho (Súm. 146 TST)';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.hs_ext_diarias
      IS 'Horas extras em dias úteis normais';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.hs_ext_feriados
      IS 'Horas extras executadas em feriados';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.hs_ext_repousos
      IS 'Horas extras executadas em repousos semanais (DSR)';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.hs_ext_feriados_repousos
      IS 'Horas extras em dias que eram feriado + repouso';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.hs_interjornada
      IS 'Horas de interjornada suprimida (Art. 66 CLT — 11h entre jornadas)';
    COMMENT ON COLUMN public.pjecalc_cartao_ponto.repousos_trabalhados
      IS 'Qtd. de repousos semanais remunerados trabalhados';
  END IF;
END $$;
