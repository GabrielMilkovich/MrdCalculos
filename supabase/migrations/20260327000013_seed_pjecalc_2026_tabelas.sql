
-- ============================================================
-- SEED: Tabelas de Referência 2026
-- Salário mínimo, INSS, Seguro-Desemprego, Salário-Família
--
-- Fonte: Decreto 12.302/2024 (SM 2025=1518), estimativas 2026
-- baseadas no INPC acumulado 2025 (~6.84%) aplicado às tabelas.
-- Valores INSS: EC 103/2019 (sistema progressivo).
-- ============================================================

-- ============================================================
-- SALÁRIO MÍNIMO 2026
-- Decreto publicado em jan/2026 (estimativa INPC ≈ 6.84%)
-- ============================================================
INSERT INTO public.pjecalc_salario_minimo (competencia, valor)
VALUES
('2026-01-01', 1622.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- INSS FAIXAS 2026 — EC 103/2019 (Sistema Progressivo)
-- Tabela reajustada com base no SM 2026 = R$ 1.622,00
-- faixa 1: até 1 SM @ 7,5%
-- faixa 2: até ~1,76 SM @ 9%
-- faixa 3: até ~2,65 SM @ 12%
-- faixa 4: até ~5,14 SM @ 14%  (teto INSS)
-- ============================================================
INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
('2026-01-01','2026-12-31',1, 1622.00, 0.075),
('2026-01-01','2026-12-31',2, 2857.16, 0.090),
('2026-01-01','2026-12-31',3, 4287.01, 0.120),
('2026-01-01','2026-12-31',4, 8341.15, 0.140)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEGURO-DESEMPREGO 2026 (Res. CODEFAT — estimativa)
-- Fórmula: parcela = valor_soma + (salario - valor_inicial) × percentual/100
-- Teto estimado com base em INPC 2025 sobre 2025 teto
-- ============================================================
INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
('2026-01-01',1,    0.00, 1949.97, 80.00,    0.00, 1622.00, 3085.38),
('2026-01-01',2, 1949.97, 3249.94, 50.00, 1559.98, 1622.00, 3085.38),
('2026-01-01',3, 3249.94,999999.0, 40.00, 2209.97, 1622.00, 3085.38)
ON CONFLICT (competencia, faixa) DO NOTHING;

-- ============================================================
-- SALÁRIO-FAMÍLIA 2026 (Portaria MF — estimativa INPC)
-- 2025: faixa 1 até 1.819,26 → R$ 62,04/filho
--       faixa 2 acima → R$ 43,71/filho
-- 2026 ajustado por ~6.84%:
-- ============================================================
INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
('2026-01-01',1,   0.00, 1943.47, 66.28),
('2026-01-01',2,1943.47, 2915.21, 46.70)
ON CONFLICT (competencia, faixa) DO NOTHING;
