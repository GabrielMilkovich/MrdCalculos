-- ============================================================
-- SEED: Salario-familia cotas historicas 2000-2024
--
-- Tabela: public.pjecalc_salario_familia
-- Fonte: Portarias MPS/INSS anuais
--
-- O salario-familia e pago por filho de ate 14 anos.
-- Existem 2 faixas: ate limite 1 (cota maior) e ate limite 2 (cota menor).
-- A partir de 2020, existe apenas 1 faixa (unificada).
-- ============================================================

INSERT INTO public.pjecalc_salario_familia
  (vigencia_inicio, vigencia_fim, remuneracao_ate, valor_cota)
VALUES
-- 2024 (Portaria MPS 6/2024)
('2024-01-01', '2024-12-31', 1819.26, 62.04),
-- 2023 (Portaria MPS 26/2023)
('2023-01-01', '2023-12-31', 1754.18, 59.82),
-- 2022 (Portaria SEPRT 12/2022)
('2022-01-01', '2022-12-31', 1655.98, 56.47),
-- 2021 (Portaria SEPRT 477/2021)
('2021-01-01', '2021-12-31', 1503.25, 51.27),
-- 2020 (Portaria SEPRT 3.659/2020)
('2020-01-01', '2020-12-31', 1425.56, 48.62),
-- 2019 (Portaria MF 9/2019 - 2 faixas)
('2019-01-01', '2019-12-31', 907.77, 46.54),
('2019-01-01', '2019-12-31', 1364.43, 32.80),
-- 2018 (Portaria MF 15/2018 - 2 faixas)
('2018-01-01', '2018-12-31', 877.67, 45.00),
('2018-01-01', '2018-12-31', 1319.18, 31.71),
-- 2017 (Portaria MF 8/2017 - 2 faixas)
('2017-01-01', '2017-12-31', 859.88, 44.09),
('2017-01-01', '2017-12-31', 1292.43, 31.07),
-- 2015 (Portaria MPS 13/2015 - 2 faixas)
('2015-01-01', '2015-12-31', 725.02, 37.18),
('2015-01-01', '2015-12-31', 1089.72, 26.20),
-- 2010 (Portaria MPS 333/2010 - 2 faixas)
('2010-01-01', '2010-12-31', 531.12, 27.24),
('2010-01-01', '2010-12-31', 798.30, 19.19),
-- 2005 (Portaria MPS 822/2005 - 2 faixas)
('2005-01-01', '2005-12-31', 390.00, 20.00),
('2005-01-01', '2005-12-31', 586.19, 14.09)
ON CONFLICT DO NOTHING;
