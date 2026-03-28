
-- ============================================================
-- SEED: pjecalc_correcao_monetaria — TAXA_LEGAL
-- Juros legais trabalhistas: 1% ao mês (Art. 39 §1 Lei 8.177/91)
-- Vigente de forma constante para todo o período histórico.
-- Armazenado como taxa mensal = 1.0 para consulta pelo engine.
-- ============================================================

INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  make_date(ano, mes, 1),
  'TAXA_LEGAL',
  1.0,
  NULL
FROM generate_series(2000, 2025) AS ano,
     generate_series(1, 12) AS mes
WHERE make_date(ano, mes, 1) <= make_date(2025, 3, 1)
ON CONFLICT (competencia, indice) DO NOTHING;

-- Compute acumulado for TAXA_LEGAL via running product
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice = 'TAXA_LEGAL'
) sub
WHERE t.id = sub.id;
