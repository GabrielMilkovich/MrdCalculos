
-- ============================================================
-- FIX: INSS Jan-Fev/2020 — separar da tabela progressiva Mar-Dez/2020
--
-- EC 103/2019 entrou em vigor em 01/03/2020.
-- Jan e Fev/2020 ainda usam o sistema FLAT-RATE de 2019
-- (Portaria SPREV 1/2019 — mesmos valores do ano anterior).
--
-- A migração anterior armazenou 2020 inteiro como progressivo
-- (2020-01-01 to 2020-12-31). Isso causa erro no cálculo flat-rate
-- de Jan-Fev/2020 pois aplica alíquotas erradas da tabela progressiva.
-- ============================================================

-- 1. Atualizar vigência do bloco progressivo 2020 para Mar-Dez apenas
UPDATE public.pjecalc_inss_faixas
SET competencia_inicio = '2020-03-01'
WHERE competencia_inicio = '2020-01-01'
  AND competencia_fim = '2020-12-31';

-- 2. Inserir Jan-Fev/2020 com tabela flat-rate (valores de 2019/Portaria SPREV 1/2019)
INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
  ('2020-01-01', '2020-02-29', 1, 1751.81, 0.08),
  ('2020-01-01', '2020-02-29', 2, 2919.72, 0.09),
  ('2020-01-01', '2020-02-29', 3, 5839.45, 0.11)
ON CONFLICT DO NOTHING;
