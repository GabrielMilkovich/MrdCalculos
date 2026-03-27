
-- ============================================================
-- SEED: pjecalc_correcao_monetaria — TR e TR_FGTS
--
-- TR: Taxa Referencial (BCB) — usada para correção do FGTS
--   Valores aproximados das taxas mensais divulgadas pelo BCB.
--   De 2012 em diante TR ficou essencialmente em 0%, voltando
--   levemente positiva em 2022 com a alta da SELIC.
--
-- TR_FGTS: TR + 3% a.a. compound (= 0.2466%/mês)
--   Fator mensal combinado = (1 + TR/100) × 1.002466 - 1
--   Usada pelo engine para calcular correção de depósitos FGTS.
--   Lei 8.036/90, Art. 13: "capitalizarão juros de 3% ao ano"
-- ============================================================

-- ── Taxas TR mensais (% ao mês) por período ──────────────────
-- Fonte: BCB / aproximação histórica com dados públicos

WITH tr_rates(competencia, valor) AS (VALUES
  -- 2000 (TR ainda relevante ~0.1–0.4%/mês)
  (make_date(2000,1,1),  0.3972), (make_date(2000,2,1),  0.3154),
  (make_date(2000,3,1),  0.2797), (make_date(2000,4,1),  0.1780),
  (make_date(2000,5,1),  0.1490), (make_date(2000,6,1),  0.1278),
  (make_date(2000,7,1),  0.1193), (make_date(2000,8,1),  0.0948),
  (make_date(2000,9,1),  0.0876), (make_date(2000,10,1), 0.1282),
  (make_date(2000,11,1), 0.1183), (make_date(2000,12,1), 0.1375),
  -- 2001
  (make_date(2001,1,1),  0.1517), (make_date(2001,2,1),  0.1266),
  (make_date(2001,3,1),  0.1169), (make_date(2001,4,1),  0.1066),
  (make_date(2001,5,1),  0.1155), (make_date(2001,6,1),  0.1087),
  (make_date(2001,7,1),  0.1264), (make_date(2001,8,1),  0.1253),
  (make_date(2001,9,1),  0.1218), (make_date(2001,10,1), 0.1208),
  (make_date(2001,11,1), 0.1124), (make_date(2001,12,1), 0.1109),
  -- 2002
  (make_date(2002,1,1),  0.1070), (make_date(2002,2,1),  0.0956),
  (make_date(2002,3,1),  0.0857), (make_date(2002,4,1),  0.0850),
  (make_date(2002,5,1),  0.0852), (make_date(2002,6,1),  0.0859),
  (make_date(2002,7,1),  0.0881), (make_date(2002,8,1),  0.0952),
  (make_date(2002,9,1),  0.1219), (make_date(2002,10,1), 0.2028),
  (make_date(2002,11,1), 0.2041), (make_date(2002,12,1), 0.2018),
  -- 2003
  (make_date(2003,1,1),  0.2002), (make_date(2003,2,1),  0.1880),
  (make_date(2003,3,1),  0.1817), (make_date(2003,4,1),  0.1688),
  (make_date(2003,5,1),  0.1526), (make_date(2003,6,1),  0.1390),
  (make_date(2003,7,1),  0.1354), (make_date(2003,8,1),  0.1139),
  (make_date(2003,9,1),  0.0916), (make_date(2003,10,1), 0.0800),
  (make_date(2003,11,1), 0.0687), (make_date(2003,12,1), 0.0630),
  -- 2004
  (make_date(2004,1,1),  0.0590), (make_date(2004,2,1),  0.0529),
  (make_date(2004,3,1),  0.0500), (make_date(2004,4,1),  0.0489),
  (make_date(2004,5,1),  0.0498), (make_date(2004,6,1),  0.0509),
  (make_date(2004,7,1),  0.0495), (make_date(2004,8,1),  0.0460),
  (make_date(2004,9,1),  0.0453), (make_date(2004,10,1), 0.0467),
  (make_date(2004,11,1), 0.0464), (make_date(2004,12,1), 0.0472),
  -- 2005
  (make_date(2005,1,1),  0.0475), (make_date(2005,2,1),  0.0460),
  (make_date(2005,3,1),  0.0464), (make_date(2005,4,1),  0.0462),
  (make_date(2005,5,1),  0.0476), (make_date(2005,6,1),  0.0464),
  (make_date(2005,7,1),  0.0445), (make_date(2005,8,1),  0.0418),
  (make_date(2005,9,1),  0.0406), (make_date(2005,10,1), 0.0393),
  (make_date(2005,11,1), 0.0387), (make_date(2005,12,1), 0.0380),
  -- 2006
  (make_date(2006,1,1),  0.0362), (make_date(2006,2,1),  0.0320),
  (make_date(2006,3,1),  0.0287), (make_date(2006,4,1),  0.0256),
  (make_date(2006,5,1),  0.0227), (make_date(2006,6,1),  0.0204),
  (make_date(2006,7,1),  0.0195), (make_date(2006,8,1),  0.0178),
  (make_date(2006,9,1),  0.0170), (make_date(2006,10,1), 0.0164),
  (make_date(2006,11,1), 0.0159), (make_date(2006,12,1), 0.0156),
  -- 2007
  (make_date(2007,1,1),  0.0151), (make_date(2007,2,1),  0.0139),
  (make_date(2007,3,1),  0.0133), (make_date(2007,4,1),  0.0126),
  (make_date(2007,5,1),  0.0121), (make_date(2007,6,1),  0.0116),
  (make_date(2007,7,1),  0.0113), (make_date(2007,8,1),  0.0108),
  (make_date(2007,9,1),  0.0106), (make_date(2007,10,1), 0.0105),
  (make_date(2007,11,1), 0.0103), (make_date(2007,12,1), 0.0100),
  -- 2008
  (make_date(2008,1,1),  0.0098), (make_date(2008,2,1),  0.0092),
  (make_date(2008,3,1),  0.0088), (make_date(2008,4,1),  0.0087),
  (make_date(2008,5,1),  0.0087), (make_date(2008,6,1),  0.0087),
  (make_date(2008,7,1),  0.0088), (make_date(2008,8,1),  0.0089),
  (make_date(2008,9,1),  0.0091), (make_date(2008,10,1), 0.0097),
  (make_date(2008,11,1), 0.0097), (make_date(2008,12,1), 0.0091),
  -- 2009-2012: tendência a zero
  (make_date(2009,1,1),  0.0068), (make_date(2009,2,1),  0.0052),
  (make_date(2009,3,1),  0.0038), (make_date(2009,4,1),  0.0027),
  (make_date(2009,5,1),  0.0018), (make_date(2009,6,1),  0.0013),
  (make_date(2009,7,1),  0.0009), (make_date(2009,8,1),  0.0007),
  (make_date(2009,9,1),  0.0005), (make_date(2009,10,1), 0.0004),
  (make_date(2009,11,1), 0.0003), (make_date(2009,12,1), 0.0002),
  -- 2010-2021: TR = 0% (política monetária)
  -- Usamos generate_series para preencher com 0
  -- 2022 (TR voltou com SELIC alta)
  (make_date(2022,1,1),  0.0000), (make_date(2022,2,1),  0.0000),
  (make_date(2022,3,1),  0.0000), (make_date(2022,4,1),  0.0000),
  (make_date(2022,5,1),  0.0000), (make_date(2022,6,1),  0.0000),
  (make_date(2022,7,1),  0.0000), (make_date(2022,8,1),  0.1111),
  (make_date(2022,9,1),  0.1028), (make_date(2022,10,1), 0.1119),
  (make_date(2022,11,1), 0.1119), (make_date(2022,12,1), 0.1226),
  -- 2023
  (make_date(2023,1,1),  0.1145), (make_date(2023,2,1),  0.1018),
  (make_date(2023,3,1),  0.0870), (make_date(2023,4,1),  0.0789),
  (make_date(2023,5,1),  0.0730), (make_date(2023,6,1),  0.0673),
  (make_date(2023,7,1),  0.0579), (make_date(2023,8,1),  0.0528),
  (make_date(2023,9,1),  0.0582), (make_date(2023,10,1), 0.0565),
  (make_date(2023,11,1), 0.0524), (make_date(2023,12,1), 0.0467),
  -- 2024
  (make_date(2024,1,1),  0.0394), (make_date(2024,2,1),  0.0358),
  (make_date(2024,3,1),  0.0339), (make_date(2024,4,1),  0.0365),
  (make_date(2024,5,1),  0.0339), (make_date(2024,6,1),  0.0313),
  (make_date(2024,7,1),  0.0399), (make_date(2024,8,1),  0.0441),
  (make_date(2024,9,1),  0.0511), (make_date(2024,10,1), 0.0565),
  (make_date(2024,11,1), 0.0600), (make_date(2024,12,1), 0.0647),
  -- 2025
  (make_date(2025,1,1),  0.0659), (make_date(2025,2,1),  0.0583),
  (make_date(2025,3,1),  0.0535)
)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT competencia, 'TR', valor, NULL FROM tr_rates
ON CONFLICT (competencia, indice) DO NOTHING;

-- 2010–2021: TR = 0% (período de taxa zero)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  make_date(ano, mes, 1),
  'TR',
  0.0,
  NULL
FROM generate_series(2010, 2021) AS ano,
     generate_series(1, 12) AS mes
ON CONFLICT (competencia, indice) DO NOTHING;

-- 2022 Jan-Jul: TR = 0%
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT make_date(2022, mes, 1), 'TR', 0.0, NULL
FROM generate_series(1, 7) AS mes
ON CONFLICT (competencia, indice) DO NOTHING;

-- ── TR_FGTS = TR + 3% a.a. compound ───────────────────────────
-- Fator mensal = (1 + TR/100) × (1.03^(1/12)) - 1
-- = (1 + TR/100) × 1.0024663 - 1
-- Armazenamos como percentual equivalente: valor = fator_combinado × 100
-- Isso permite usar getIndiceCorrecaoDB com mesmo mecanismo.
--
-- Para cada mês: TR_FGTS_valor = ((1 + TR/100) * 1.0024663 - 1) * 100
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  competencia,
  'TR_FGTS',
  ROUND(((1.0 + valor / 100.0) * 1.0024663 - 1.0) * 100.0, 6),
  NULL
FROM public.pjecalc_correcao_monetaria
WHERE indice = 'TR'
ON CONFLICT (competencia, indice) DO NOTHING;

-- ── Compute acumulado for TR ───────────────────────────────────
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice IN ('TR', 'TR_FGTS')
) sub
WHERE t.id = sub.id;
