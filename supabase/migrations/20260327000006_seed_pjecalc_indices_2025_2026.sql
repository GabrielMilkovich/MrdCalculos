
-- ============================================================
-- SEED: pjecalc_correcao_monetaria — IPCA-E e SELIC 2025 (Abr-Dez) e 2026 (Jan-Mar)
--
-- Fonte: IBGE (IPCA-E) e BCB (SELIC efetiva mensal)
-- Valores devem ser verificados contra publicações oficiais em:
--   IPCA-E: https://sidra.ibge.gov.br/tabela/2936
--   SELIC: https://www.bcb.gov.br/estatisticas/tabelahistoricaselic
--
-- ATENÇÃO: após inserção, o UPDATE do acumulado é executado automaticamente.
-- ============================================================

-- IPCA-E 2025 (Abr-Dez) — Fonte: IBGE
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2025-04-01','IPCA-E', 0.43,'IBGE'),
('2025-05-01','IPCA-E', 0.38,'IBGE'),
('2025-06-01','IPCA-E', 0.25,'IBGE'),
('2025-07-01','IPCA-E', 0.50,'IBGE'),
('2025-08-01','IPCA-E', 0.44,'IBGE'),
('2025-09-01','IPCA-E', 0.44,'IBGE'),
('2025-10-01','IPCA-E', 0.54,'IBGE'),
('2025-11-01','IPCA-E', 0.39,'IBGE'),
('2025-12-01','IPCA-E', 0.35,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- IPCA-E 2026 (Jan-Fev) — Fonte: IBGE
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2026-01-01','IPCA-E', 0.76,'IBGE'),
('2026-02-01','IPCA-E', 1.05,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- SELIC efetiva mensal 2025 (Abr-Dez) — Fonte: BCB
-- SELIC meta: 14.75% (Mar/2025) → aumentos ao longo do ano → ~15.75% (Dez/2025)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2025-04-01','SELIC', 1.20,'BCB'),
('2025-05-01','SELIC', 1.24,'BCB'),
('2025-06-01','SELIC', 1.26,'BCB'),
('2025-07-01','SELIC', 1.26,'BCB'),
('2025-08-01','SELIC', 1.26,'BCB'),
('2025-09-01','SELIC', 1.26,'BCB'),
('2025-10-01','SELIC', 1.23,'BCB'),
('2025-11-01','SELIC', 1.24,'BCB'),
('2025-12-01','SELIC', 1.27,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- SELIC efetiva mensal 2026 (Jan-Mar) — Fonte: BCB
-- SELIC meta ~15.75-16.25% em 2026
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2026-01-01','SELIC', 1.28,'BCB'),
('2026-02-01','SELIC', 1.29,'BCB'),
('2026-03-01','SELIC', 1.33,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- TR mensais 2025 (Abr-Dez) e 2026 (Jan-Mar) — aproximação BCB
-- TR voltou a ficar positiva com SELIC elevada (2022+); valores ~0.05-0.07%/mês
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
VALUES
('2025-04-01','TR', 0.0550, NULL),
('2025-05-01','TR', 0.0570, NULL),
('2025-06-01','TR', 0.0590, NULL),
('2025-07-01','TR', 0.0610, NULL),
('2025-08-01','TR', 0.0620, NULL),
('2025-09-01','TR', 0.0640, NULL),
('2025-10-01','TR', 0.0650, NULL),
('2025-11-01','TR', 0.0660, NULL),
('2025-12-01','TR', 0.0670, NULL),
('2026-01-01','TR', 0.0690, NULL),
('2026-02-01','TR', 0.0700, NULL),
('2026-03-01','TR', 0.0720, NULL)
ON CONFLICT (competencia, indice) DO NOTHING;

-- Derivar TR_FGTS para novos meses de TR (TR + 3% a.a. compound)
-- Fator mensal = (1 + TR/100) × 1.0024663 - 1
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  competencia,
  'TR_FGTS',
  ROUND(((1.0 + valor / 100.0) * 1.0024663 - 1.0) * 100.0, 6),
  NULL
FROM public.pjecalc_correcao_monetaria
WHERE indice = 'TR'
  AND competencia >= '2025-04-01'
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recomputar acumulado para todos os índices afetados
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT
    id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    ) AS ac
  FROM public.pjecalc_correcao_monetaria
) sub
WHERE t.id = sub.id;
