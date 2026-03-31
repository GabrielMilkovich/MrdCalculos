-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 9 (files 81 to 90 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260327000003_fix_pjecalc_inss_2020_jan_fev.sql ──


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


-- ── Migration: 20260327000004_create_pjecalc_excecoes_tables.sql ──


-- ============================================================
-- TABELAS: pjecalc_excecoes_carga e pjecalc_excecoes_sabado
--
-- Exceções de carga horária e de tratamento de sábado por período.
-- Usadas para casos com jornada reduzida (ex: 36h/semana em bancos,
-- professores, etc.) ou períodos em que sábado conta como dia útil.
-- ============================================================

-- Exceções de carga horária (jornada diferente da padrão por período)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  carga_horaria_mensal numeric NOT NULL, -- ex: 180 para 36h/semana
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_carga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR SELECT
  USING (true);

-- Exceções de sábado (períodos em que sábado é tratado como dia útil)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_sabado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  sabado_dia_util boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_sabado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR SELECT
  USING (true);

-- Índices para lookup por case_id e período
CREATE INDEX IF NOT EXISTS idx_excecoes_carga_case_id
  ON public.pjecalc_excecoes_carga(case_id);
CREATE INDEX IF NOT EXISTS idx_excecoes_sabado_case_id
  ON public.pjecalc_excecoes_sabado(case_id);


-- ── Migration: 20260327000005_add_base_tabelas_to_verba.sql ──


-- ============================================================
-- Adicionar coluna base_tabelas a pjecalc_verba_base
-- Permite que verbas especifiquem tabelas de referência para
-- cálculo da base (ex: 'salario_minimo' para insalubridade).
--
-- Atualiza a view pjecalc_verbas para expor base_tabelas
-- na propriedade base_calculo.tabelas (consumida pelo engine).
--
-- Atualiza o trigger de INSERT para persistir base_tabelas
-- a partir da propriedade base_calculo.tabelas.
-- ============================================================

-- 1. Adicionar coluna à tabela base
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS base_tabelas text[] DEFAULT '{}';

-- 2. Atualizar a view para expor base_tabelas
CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END AS tipo,
  v.multiplicador,
  v.divisor AS divisor_informado,
  v.periodo_inicio::text AS periodo_inicio,
  v.periodo_fim::text AS periodo_fim,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  v.verba_principal_id,
  v.valor,
  v.valor_informado_devido,
  v.valor_informado_pago,
  v.hist_salarial_nome,
  jsonb_build_object(
    'historicos', COALESCE(
      (SELECT jsonb_agg(hs.id)
       FROM pjecalc_hist_salarial hs
       WHERE hs.calculo_id = v.calculo_id AND hs.nome = v.hist_salarial_nome),
      '[]'::jsonb
    ),
    'tabelas', COALESCE(to_jsonb(v.base_tabelas), '[]'::jsonb),
    'verbas', CASE
      WHEN v.verba_principal_id IS NOT NULL THEN jsonb_build_array(v.verba_principal_id)
      ELSE '[]'::jsonb
    END
  ) AS base_calculo,
  '{}'::jsonb AS incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

-- 3. Atualizar trigger de INSERT para persistir base_tabelas
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid UUID;
  v_tabelas text[];
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);

  -- Extrair base_tabelas de base_calculo.tabelas (se fornecido)
  IF NEW.base_calculo IS NOT NULL AND NEW.base_calculo ? 'tabelas' THEN
    SELECT array_agg(t::text)
    INTO v_tabelas
    FROM jsonb_array_elements_text(NEW.base_calculo->'tabelas') t;
  ELSE
    v_tabelas := '{}';
  END IF;

  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago,
    base_tabelas
  )
  VALUES (
    v_cid, NEW.nome, NEW.codigo,
    COALESCE(NEW.caracteristica, 'COMUM'),
    COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1),
    COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date,
    NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0),
    COALESCE(NEW.ativa, true),
    NEW.observacoes,
    NEW.hist_salarial_nome,
    NEW.verba_principal_id,
    COALESCE(NEW.valor, 'calculado'),
    NEW.valor_informado_devido,
    NEW.valor_informado_pago,
    v_tabelas
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;


-- ── Migration: 20260327000006_seed_pjecalc_indices_2025_2026.sql ──


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


-- ── Migration: 20260327000007_seed_pjecalc_beneficios_pre2019.sql ──


-- ============================================================
-- SEED: pjecalc_seguro_desemprego — 2000-2018 (pré-CODEFAT 835/2019)
-- Fonte: Resoluções CODEFAT históricas
--
-- Fórmula: parcela = valor_soma + (salario - valor_inicial) × percentual/100
--   Faixa 1: até limite1 → SD = salario × 80%
--   Faixa 2: de limite1 até limite2 → SD = limite1×80% + (salario - limite1)×50%
--   Faixa 3: acima de limite2 → teto fixo
--
-- NOTA: 2000-2018 o SD era calculado com limites baseados no SM vigente.
--   Aqui armazenamos os valores conforme publicações CODEFAT/MTE.
-- ============================================================

INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
-- 2000 (Res. CODEFAT 286/2000; SM=151)
('2000-04-01',1,    0.00,  376.50, 80.00,    0.00,  151.00,  590.12),
('2000-04-01',2,  376.50,  627.50, 50.00,  301.20,  151.00,  590.12),
('2000-04-01',3,  627.50,999999.0, 40.00,  464.70,  151.00,  590.12),
-- 2001 (Res. CODEFAT 310/2001; SM=180)
('2001-04-01',1,    0.00,  437.00, 80.00,    0.00,  180.00,  678.00),
('2001-04-01',2,  437.00,  728.50, 50.00,  349.60,  180.00,  678.00),
('2001-04-01',3,  728.50,999999.0, 40.00,  532.70,  180.00,  678.00),
-- 2002 (Res. CODEFAT 338/2002; SM=200)
('2002-04-01',1,    0.00,  484.97, 80.00,    0.00,  200.00,  742.53),
('2002-04-01',2,  484.97,  808.21, 50.00,  387.98,  200.00,  742.53),
('2002-04-01',3,  808.21,999999.0, 40.00,  581.96,  200.00,  742.53),
-- 2003 (Res. CODEFAT 385/2003; SM=240)
('2003-04-01',1,    0.00,  568.00, 80.00,    0.00,  240.00,  871.46),
('2003-04-01',2,  568.00,  947.00, 50.00,  454.40,  240.00,  871.46),
('2003-04-01',3,  947.00,999999.0, 40.00,  643.30,  240.00,  871.46),
-- 2004 (Res. CODEFAT 424/2004; SM=260)
('2004-05-01',1,    0.00,  620.50, 80.00,    0.00,  260.00,  952.50),
('2004-05-01',2,  620.50, 1034.17, 50.00,  496.40,  260.00,  952.50),
('2004-05-01',3, 1034.17,999999.0, 40.00,  710.07,  260.00,  952.50),
-- 2005 (Res. CODEFAT 466/2005; SM=300)
('2005-05-01',1,    0.00,  720.50, 80.00,    0.00,  300.00, 1108.34),
('2005-05-01',2,  720.50, 1201.00, 50.00,  576.40,  300.00, 1108.34),
('2005-05-01',3, 1201.00,999999.0, 40.00,  864.80,  300.00, 1108.34),
-- 2006 (Res. CODEFAT 516/2006; SM=350)
('2006-04-01',1,    0.00,  835.52, 80.00,    0.00,  350.00, 1299.76),
('2006-04-01',2,  835.52, 1392.53, 50.00,  668.42,  350.00, 1299.76),
('2006-04-01',3, 1392.53,999999.0, 40.00,  984.48,  350.00, 1299.76),
-- 2007 (Res. CODEFAT 560/2007; SM=380)
('2007-04-01',1,    0.00,  900.00, 80.00,    0.00,  380.00, 1395.00),
('2007-04-01',2,  900.00, 1500.00, 50.00,  720.00,  380.00, 1395.00),
('2007-04-01',3, 1500.00,999999.0, 40.00, 1020.00,  380.00, 1395.00),
-- 2008 (Res. CODEFAT 596/2008; SM=415)
('2008-03-01',1,    0.00,  962.72, 80.00,    0.00,  415.00, 1493.02),
('2008-03-01',2,  962.72, 1604.53, 50.00,  770.18,  415.00, 1493.02),
('2008-03-01',3, 1604.53,999999.0, 40.00, 1108.23,  415.00, 1493.02),
-- 2009 (Res. CODEFAT 634/2009; SM=465)
('2009-02-01',1,    0.00, 1070.76, 80.00,    0.00,  465.00, 1662.97),
('2009-02-01',2, 1070.76, 1784.60, 50.00,  856.61,  465.00, 1662.97),
('2009-02-01',3, 1784.60,999999.0, 40.00, 1213.85,  465.00, 1662.97),
-- 2010 (Res. CODEFAT 665/2010; SM=510)
('2010-01-01',1,    0.00, 1186.93, 80.00,    0.00,  510.00, 1841.01),
('2010-01-01',2, 1186.93, 1978.22, 50.00,  949.54,  510.00, 1841.01),
('2010-01-01',3, 1978.22,999999.0, 40.00, 1345.36,  510.00, 1841.01),
-- 2011 (Res. CODEFAT 707/2011; SM=545)
('2011-03-01',1,    0.00, 1249.05, 80.00,    0.00,  545.00, 1942.02),
('2011-03-01',2, 1249.05, 2081.75, 50.00,  999.24,  545.00, 1942.02),
('2011-03-01',3, 2081.75,999999.0, 40.00, 1415.37,  545.00, 1942.02),
-- 2012 (Res. CODEFAT 735/2012; SM=622)
('2012-01-01',1,    0.00, 1185.00, 80.00,    0.00,  622.00, 1786.00),
('2012-01-01',2, 1185.00, 1974.00, 50.00,  948.00,  622.00, 1786.00),
('2012-01-01',3, 1974.00,999999.0, 40.00, 1342.50,  622.00, 1786.00),
-- 2013 (Res. CODEFAT 753/2013; SM=678)
('2013-01-01',1,    0.00, 1247.70, 80.00,    0.00,  678.00, 1974.97),
('2013-01-01',2, 1247.70, 2079.50, 50.00,  998.16,  678.00, 1974.97),
('2013-01-01',3, 2079.50,999999.0, 40.00, 1451.30,  678.00, 1974.97),
-- 2014 (Res. CODEFAT 783/2014; SM=724)
('2014-01-01',1,    0.00, 1317.07, 80.00,    0.00,  724.00, 2043.71),
('2014-01-01',2, 1317.07, 2195.12, 50.00, 1053.66,  724.00, 2043.71),
('2014-01-01',3, 2195.12,999999.0, 40.00, 1468.98,  724.00, 2043.71),
-- 2015 (Res. CODEFAT 800/2015; SM=788)
('2015-01-01',1,    0.00, 1394.76, 80.00,    0.00,  788.00, 2192.38),
('2015-01-01',2, 1394.76, 2324.60, 50.00, 1115.81,  788.00, 2192.38),
('2015-01-01',3, 2324.60,999999.0, 40.00, 1568.84,  788.00, 2192.38),
-- 2016 (Res. CODEFAT 812/2016; SM=880)
('2016-01-01',1,    0.00, 1556.94, 80.00,    0.00,  880.00, 2414.18),
('2016-01-01',2, 1556.94, 2594.90, 50.00, 1245.55,  880.00, 2414.18),
('2016-01-01',3, 2594.90,999999.0, 40.00, 1761.74,  880.00, 2414.18),
-- 2017 (Res. CODEFAT 818/2017; SM=937)
('2017-01-01',1,    0.00, 1659.38, 80.00,    0.00,  937.00, 2592.44),
('2017-01-01',2, 1659.38, 2765.63, 50.00, 1327.50,  937.00, 2592.44),
('2017-01-01',3, 2765.63,999999.0, 40.00, 1879.62,  937.00, 2592.44),
-- 2018 (Res. CODEFAT 828/2018; SM=954)
('2018-01-01',1,    0.00, 1693.72, 80.00,    0.00,  954.00, 2655.13),
('2018-01-01',2, 1693.72, 2822.87, 50.00, 1354.98,  954.00, 2655.13),
('2018-01-01',3, 2822.87,999999.0, 40.00, 1920.97,  954.00, 2655.13)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_familia — 2000-2018
-- Fonte: Portarias MPS / IN RFB anuais
-- Cota por filho de até 14 anos (ou inválido de qualquer idade)
-- ============================================================

INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
-- 2000 (Portaria MPS 4.883/1998 com reajuste; SM=151)
('2000-04-01',1,   0.00,  376.99, 11.24),
('2000-04-01',2, 376.99,  565.49,  7.88),
-- 2001 (Portaria MPS 5.018/2001; SM=180)
('2001-04-01',1,   0.00,  435.83, 13.05),
('2001-04-01',2, 435.83,  653.72,  9.17),
-- 2002 (Portaria MPS 5.062/2002; SM=200)
('2002-04-01',1,   0.00,  480.31, 14.46),
('2002-04-01',2, 480.31,  720.46, 10.14),
-- 2003 (Portaria MPS 5.303/2003; SM=240)
('2003-04-01',1,   0.00,  560.81, 15.74),
('2003-04-01',2, 560.81,  841.21, 11.09),
-- 2004 (Portaria MPS 5.442/2004; SM=260)
('2004-05-01',1,   0.00,  612.00, 17.07),
('2004-05-01',2, 612.00,  917.78, 12.00),
-- 2005 (Portaria MPS 5.536/2005; SM=300)
('2005-05-01',1,   0.00,  651.21, 18.96),
('2005-05-01',2, 651.21,  975.97, 13.30),
-- 2006 (Portaria MPS 29/2006; SM=350)
('2006-04-01',1,   0.00,  709.78, 20.02),
('2006-04-01',2, 709.78, 1064.68, 14.09),
-- 2007 (Portaria MPS 45/2007; SM=380)
('2007-04-01',1,   0.00,  752.69, 20.02),
('2007-04-01',2, 752.69, 1131.00, 14.09),
-- 2008 (Portaria MPS 56/2008; SM=415)
('2008-03-01',1,   0.00,  789.03, 21.33),
('2008-03-01',2, 789.03, 1183.54, 15.01),
-- 2009 (Portaria MPS 77/2009; SM=465)
('2009-02-01',1,   0.00,  859.88, 27.24),
('2009-02-01',2, 859.88, 1289.82, 19.16),
-- 2010 (Portaria MF 350/2010; SM=510)
('2010-01-01',1,   0.00,  915.05, 29.41),
('2010-01-01',2, 915.05, 1372.57, 20.73),
-- 2011 (Portaria MF 407/2011; SM=545)
('2011-03-01',1,   0.00,  971.78, 31.22),
('2011-03-01',2, 971.78, 1457.66, 22.00),
-- 2012 (Portaria MF 8/2012; SM=622)
('2012-01-01',1,   0.00, 1037.01, 33.16),
('2012-01-01',2,1037.01, 1555.52, 23.36),
-- 2013 (Portaria MF 15/2013; SM=678)
('2013-01-01',1,   0.00, 1089.72, 35.00),
('2013-01-01',2,1089.72, 1634.58, 24.66),
-- 2014 (Portaria MF 19/2014; SM=724)
('2014-01-01',1,   0.00, 1140.00, 37.18),
('2014-01-01',2,1140.00, 1710.78, 26.20),
-- 2015 (Portaria MF 13/2015; SM=788)
('2015-01-01',1,   0.00, 1212.64, 40.00),
('2015-01-01',2,1212.64, 1819.26, 28.18),
-- 2016 (Portaria MF 8/2016; SM=880)
('2016-01-01',1,   0.00, 1399.12, 44.09),
('2016-01-01',2,1399.12, 2098.68, 31.07),
-- 2017 (Portaria MF 8/2017; SM=937)
('2017-01-01',1,   0.00, 1425.56, 44.09),
('2017-01-01',2,1425.56, 2142.65, 31.07),
-- 2018 (Portaria MF 8/2018; SM=954)
('2018-01-01',1,   0.00, 1425.56, 44.09),
('2018-01-01',2,1425.56, 2142.65, 31.07)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ── Migration: 20260327000008_seed_pjecalc_inpc_indices.sql ──

-- Seed INPC (Índice Nacional de Preços ao Consumidor) monthly values 2000-2026
-- Source: IBGE SIDRA tabela 7063
-- Values represent approximate monthly percentage variation

INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
  -- 2000
  ('2000-01-01','INPC', 0.62,'IBGE'),
  ('2000-02-01','INPC', 0.05,'IBGE'),
  ('2000-03-01','INPC', 0.22,'IBGE'),
  ('2000-04-01','INPC', 0.09,'IBGE'),
  ('2000-05-01','INPC', 0.07,'IBGE'),
  ('2000-06-01','INPC', 0.21,'IBGE'),
  ('2000-07-01','INPC', 1.61,'IBGE'),
  ('2000-08-01','INPC', 1.21,'IBGE'),
  ('2000-09-01','INPC', 0.43,'IBGE'),
  ('2000-10-01','INPC', 0.16,'IBGE'),
  ('2000-11-01','INPC', 0.29,'IBGE'),
  ('2000-12-01','INPC', 0.55,'IBGE'),
  -- 2001
  ('2001-01-01','INPC', 0.77,'IBGE'),
  ('2001-02-01','INPC', 0.49,'IBGE'),
  ('2001-03-01','INPC', 0.48,'IBGE'),
  ('2001-04-01','INPC', 0.84,'IBGE'),
  ('2001-05-01','INPC', 0.57,'IBGE'),
  ('2001-06-01','INPC', 0.60,'IBGE'),
  ('2001-07-01','INPC', 1.12,'IBGE'),
  ('2001-08-01','INPC', 0.79,'IBGE'),
  ('2001-09-01','INPC', 0.44,'IBGE'),
  ('2001-10-01','INPC', 0.94,'IBGE'),
  ('2001-11-01','INPC', 1.29,'IBGE'),
  ('2001-12-01','INPC', 0.74,'IBGE'),
  -- 2002
  ('2002-01-01','INPC', 1.07,'IBGE'),
  ('2002-02-01','INPC', 0.31,'IBGE'),
  ('2002-03-01','INPC', 0.62,'IBGE'),
  ('2002-04-01','INPC', 0.68,'IBGE'),
  ('2002-05-01','INPC', 0.09,'IBGE'),
  ('2002-06-01','INPC', 0.61,'IBGE'),
  ('2002-07-01','INPC', 1.15,'IBGE'),
  ('2002-08-01','INPC', 1.29,'IBGE'),
  ('2002-09-01','INPC', 0.83,'IBGE'),
  ('2002-10-01','INPC', 1.57,'IBGE'),
  ('2002-11-01','INPC', 3.39,'IBGE'),
  ('2002-12-01','INPC', 2.70,'IBGE'),
  -- 2003
  ('2003-01-01','INPC', 2.47,'IBGE'),
  ('2003-02-01','INPC', 1.46,'IBGE'),
  ('2003-03-01','INPC', 1.23,'IBGE'),
  ('2003-04-01','INPC', 0.97,'IBGE'),
  ('2003-05-01','INPC', 0.99,'IBGE'),
  ('2003-06-01','INPC', -0.06,'IBGE'),
  ('2003-07-01','INPC', 0.04,'IBGE'),
  ('2003-08-01','INPC', 0.18,'IBGE'),
  ('2003-09-01','INPC', 0.82,'IBGE'),
  ('2003-10-01','INPC', 0.39,'IBGE'),
  ('2003-11-01','INPC', 0.37,'IBGE'),
  ('2003-12-01','INPC', 0.54,'IBGE'),
  -- 2004
  ('2004-01-01','INPC', 0.83,'IBGE'),
  ('2004-02-01','INPC', 0.39,'IBGE'),
  ('2004-03-01','INPC', 0.56,'IBGE'),
  ('2004-04-01','INPC', 0.41,'IBGE'),
  ('2004-05-01','INPC', 0.44,'IBGE'),
  ('2004-06-01','INPC', 0.50,'IBGE'),
  ('2004-07-01','INPC', 0.73,'IBGE'),
  ('2004-08-01','INPC', 0.50,'IBGE'),
  ('2004-09-01','INPC', 0.17,'IBGE'),
  ('2004-10-01','INPC', 0.17,'IBGE'),
  ('2004-11-01','INPC', 0.44,'IBGE'),
  ('2004-12-01','INPC', 0.86,'IBGE'),
  -- 2005
  ('2005-01-01','INPC', 0.57,'IBGE'),
  ('2005-02-01','INPC', 0.42,'IBGE'),
  ('2005-03-01','INPC', 0.73,'IBGE'),
  ('2005-04-01','INPC', 0.91,'IBGE'),
  ('2005-05-01','INPC', 0.49,'IBGE'),
  ('2005-06-01','INPC', -0.11,'IBGE'),
  ('2005-07-01','INPC', 0.03,'IBGE'),
  ('2005-08-01','INPC', -0.01,'IBGE'),
  ('2005-09-01','INPC', 0.15,'IBGE'),
  ('2005-10-01','INPC', 0.58,'IBGE'),
  ('2005-11-01','INPC', 0.54,'IBGE'),
  ('2005-12-01','INPC', 0.40,'IBGE'),
  -- 2006
  ('2006-01-01','INPC', 0.26,'IBGE'),
  ('2006-02-01','INPC', 0.23,'IBGE'),
  ('2006-03-01','INPC', 0.27,'IBGE'),
  ('2006-04-01','INPC', 0.12,'IBGE'),
  ('2006-05-01','INPC', 0.13,'IBGE'),
  ('2006-06-01','INPC', -0.07,'IBGE'),
  ('2006-07-01','INPC', 0.11,'IBGE'),
  ('2006-08-01','INPC', 0.07,'IBGE'),
  ('2006-09-01','INPC', 0.21,'IBGE'),
  ('2006-10-01','INPC', 0.28,'IBGE'),
  ('2006-11-01','INPC', 0.31,'IBGE'),
  ('2006-12-01','INPC', 0.46,'IBGE'),
  -- 2007
  ('2007-01-01','INPC', 0.49,'IBGE'),
  ('2007-02-01','INPC', 0.42,'IBGE'),
  ('2007-03-01','INPC', 0.37,'IBGE'),
  ('2007-04-01','INPC', 0.26,'IBGE'),
  ('2007-05-01','INPC', 0.26,'IBGE'),
  ('2007-06-01','INPC', 0.31,'IBGE'),
  ('2007-07-01','INPC', 0.32,'IBGE'),
  ('2007-08-01','INPC', 0.59,'IBGE'),
  ('2007-09-01','INPC', 0.26,'IBGE'),
  ('2007-10-01','INPC', 0.21,'IBGE'),
  ('2007-11-01','INPC', 0.38,'IBGE'),
  ('2007-12-01','INPC', 0.97,'IBGE'),
  -- 2008
  ('2008-01-01','INPC', 0.69,'IBGE'),
  ('2008-02-01','INPC', 0.48,'IBGE'),
  ('2008-03-01','INPC', 0.51,'IBGE'),
  ('2008-04-01','INPC', 0.64,'IBGE'),
  ('2008-05-01','INPC', 0.96,'IBGE'),
  ('2008-06-01','INPC', 0.78,'IBGE'),
  ('2008-07-01','INPC', 0.58,'IBGE'),
  ('2008-08-01','INPC', 0.18,'IBGE'),
  ('2008-09-01','INPC', 0.13,'IBGE'),
  ('2008-10-01','INPC', 0.45,'IBGE'),
  ('2008-11-01','INPC', 0.38,'IBGE'),
  ('2008-12-01','INPC', 0.29,'IBGE'),
  -- 2009
  ('2009-01-01','INPC', 0.64,'IBGE'),
  ('2009-02-01','INPC', 0.31,'IBGE'),
  ('2009-03-01','INPC', 0.20,'IBGE'),
  ('2009-04-01','INPC', 0.36,'IBGE'),
  ('2009-05-01','INPC', 0.60,'IBGE'),
  ('2009-06-01','INPC', 0.42,'IBGE'),
  ('2009-07-01','INPC', 0.23,'IBGE'),
  ('2009-08-01','INPC', 0.08,'IBGE'),
  ('2009-09-01','INPC', 0.16,'IBGE'),
  ('2009-10-01','INPC', 0.24,'IBGE'),
  ('2009-11-01','INPC', 0.37,'IBGE'),
  ('2009-12-01','INPC', 0.24,'IBGE'),
  -- 2010
  ('2010-01-01','INPC', 0.88,'IBGE'),
  ('2010-02-01','INPC', 0.70,'IBGE'),
  ('2010-03-01','INPC', 0.71,'IBGE'),
  ('2010-04-01','INPC', 0.73,'IBGE'),
  ('2010-05-01','INPC', 0.43,'IBGE'),
  ('2010-06-01','INPC', 0.11,'IBGE'),
  ('2010-07-01','INPC', 0.01,'IBGE'),
  ('2010-08-01','INPC', 0.07,'IBGE'),
  ('2010-09-01','INPC', 0.54,'IBGE'),
  ('2010-10-01','INPC', 0.92,'IBGE'),
  ('2010-11-01','INPC', 1.03,'IBGE'),
  ('2010-12-01','INPC', 0.60,'IBGE'),
  -- 2011
  ('2011-01-01','INPC', 0.94,'IBGE'),
  ('2011-02-01','INPC', 0.54,'IBGE'),
  ('2011-03-01','INPC', 0.66,'IBGE'),
  ('2011-04-01','INPC', 0.72,'IBGE'),
  ('2011-05-01','INPC', 0.57,'IBGE'),
  ('2011-06-01','INPC', 0.22,'IBGE'),
  ('2011-07-01','INPC', 0.00,'IBGE'),
  ('2011-08-01','INPC', 0.42,'IBGE'),
  ('2011-09-01','INPC', 0.65,'IBGE'),
  ('2011-10-01','INPC', 0.32,'IBGE'),
  ('2011-11-01','INPC', 0.57,'IBGE'),
  ('2011-12-01','INPC', 0.51,'IBGE'),
  -- 2012
  ('2012-01-01','INPC', 0.51,'IBGE'),
  ('2012-02-01','INPC', 0.39,'IBGE'),
  ('2012-03-01','INPC', 0.18,'IBGE'),
  ('2012-04-01','INPC', 0.64,'IBGE'),
  ('2012-05-01','INPC', 0.55,'IBGE'),
  ('2012-06-01','INPC', 0.26,'IBGE'),
  ('2012-07-01','INPC', 0.43,'IBGE'),
  ('2012-08-01','INPC', 0.45,'IBGE'),
  ('2012-09-01','INPC', 0.63,'IBGE'),
  ('2012-10-01','INPC', 0.60,'IBGE'),
  ('2012-11-01','INPC', 0.54,'IBGE'),
  ('2012-12-01','INPC', 0.74,'IBGE'),
  -- 2013
  ('2013-01-01','INPC', 0.92,'IBGE'),
  ('2013-02-01','INPC', 0.52,'IBGE'),
  ('2013-03-01','INPC', 0.60,'IBGE'),
  ('2013-04-01','INPC', 0.59,'IBGE'),
  ('2013-05-01','INPC', 0.35,'IBGE'),
  ('2013-06-01','INPC', 0.33,'IBGE'),
  ('2013-07-01','INPC', 0.13,'IBGE'),
  ('2013-08-01','INPC', 0.16,'IBGE'),
  ('2013-09-01','INPC', 0.27,'IBGE'),
  ('2013-10-01','INPC', 0.61,'IBGE'),
  ('2013-11-01','INPC', 0.54,'IBGE'),
  ('2013-12-01','INPC', 0.72,'IBGE'),
  -- 2014
  ('2014-01-01','INPC', 0.63,'IBGE'),
  ('2014-02-01','INPC', 0.64,'IBGE'),
  ('2014-03-01','INPC', 0.82,'IBGE'),
  ('2014-04-01','INPC', 0.78,'IBGE'),
  ('2014-05-01','INPC', 0.60,'IBGE'),
  ('2014-06-01','INPC', 0.26,'IBGE'),
  ('2014-07-01','INPC', 0.13,'IBGE'),
  ('2014-08-01','INPC', 0.18,'IBGE'),
  ('2014-09-01','INPC', 0.49,'IBGE'),
  ('2014-10-01','INPC', 0.38,'IBGE'),
  ('2014-11-01','INPC', 0.53,'IBGE'),
  ('2014-12-01','INPC', 0.62,'IBGE'),
  -- 2015
  ('2015-01-01','INPC', 1.48,'IBGE'),
  ('2015-02-01','INPC', 1.16,'IBGE'),
  ('2015-03-01','INPC', 1.51,'IBGE'),
  ('2015-04-01','INPC', 0.71,'IBGE'),
  ('2015-05-01','INPC', 0.99,'IBGE'),
  ('2015-06-01','INPC', 0.77,'IBGE'),
  ('2015-07-01','INPC', 0.58,'IBGE'),
  ('2015-08-01','INPC', 0.25,'IBGE'),
  ('2015-09-01','INPC', 0.51,'IBGE'),
  ('2015-10-01','INPC', 0.77,'IBGE'),
  ('2015-11-01','INPC', 1.11,'IBGE'),
  ('2015-12-01','INPC', 0.85,'IBGE'),
  -- 2016
  ('2016-01-01','INPC', 1.51,'IBGE'),
  ('2016-02-01','INPC', 0.95,'IBGE'),
  ('2016-03-01','INPC', 0.44,'IBGE'),
  ('2016-04-01','INPC', 0.61,'IBGE'),
  ('2016-05-01','INPC', 0.98,'IBGE'),
  ('2016-06-01','INPC', 0.47,'IBGE'),
  ('2016-07-01','INPC', 0.64,'IBGE'),
  ('2016-08-01','INPC', 0.31,'IBGE'),
  ('2016-09-01','INPC', 0.08,'IBGE'),
  ('2016-10-01','INPC', 0.17,'IBGE'),
  ('2016-11-01','INPC', 0.07,'IBGE'),
  ('2016-12-01','INPC', 0.14,'IBGE'),
  -- 2017
  ('2017-01-01','INPC', 0.42,'IBGE'),
  ('2017-02-01','INPC', 0.24,'IBGE'),
  ('2017-03-01','INPC', 0.32,'IBGE'),
  ('2017-04-01','INPC', 0.08,'IBGE'),
  ('2017-05-01','INPC', 0.36,'IBGE'),
  ('2017-06-01','INPC', -0.30,'IBGE'),
  ('2017-07-01','INPC', 0.17,'IBGE'),
  ('2017-08-01','INPC', 0.03,'IBGE'),
  ('2017-09-01','INPC', -0.02,'IBGE'),
  ('2017-10-01','INPC', 0.37,'IBGE'),
  ('2017-11-01','INPC', 0.18,'IBGE'),
  ('2017-12-01','INPC', 0.26,'IBGE'),
  -- 2018
  ('2018-01-01','INPC', 0.23,'IBGE'),
  ('2018-02-01','INPC', 0.18,'IBGE'),
  ('2018-03-01','INPC', 0.07,'IBGE'),
  ('2018-04-01','INPC', 0.21,'IBGE'),
  ('2018-05-01','INPC', 0.43,'IBGE'),
  ('2018-06-01','INPC', 1.43,'IBGE'),
  ('2018-07-01','INPC', 0.25,'IBGE'),
  ('2018-08-01','INPC', -0.03,'IBGE'),
  ('2018-09-01','INPC', 0.30,'IBGE'),
  ('2018-10-01','INPC', 0.40,'IBGE'),
  ('2018-11-01','INPC', -0.25,'IBGE'),
  ('2018-12-01','INPC', 0.09,'IBGE'),
  -- 2019
  ('2019-01-01','INPC', 0.36,'IBGE'),
  ('2019-02-01','INPC', 0.54,'IBGE'),
  ('2019-03-01','INPC', 0.77,'IBGE'),
  ('2019-04-01','INPC', 0.77,'IBGE'),
  ('2019-05-01','INPC', 0.15,'IBGE'),
  ('2019-06-01','INPC', -0.01,'IBGE'),
  ('2019-07-01','INPC', 0.10,'IBGE'),
  ('2019-08-01','INPC', 0.11,'IBGE'),
  ('2019-09-01','INPC', -0.05,'IBGE'),
  ('2019-10-01','INPC', 0.04,'IBGE'),
  ('2019-11-01','INPC', 0.54,'IBGE'),
  ('2019-12-01','INPC', 1.22,'IBGE'),
  -- 2020
  ('2020-01-01','INPC', 0.25,'IBGE'),
  ('2020-02-01','INPC', 0.17,'IBGE'),
  ('2020-03-01','INPC', 0.07,'IBGE'),
  ('2020-04-01','INPC', -0.23,'IBGE'),
  ('2020-05-01','INPC', -0.38,'IBGE'),
  ('2020-06-01','INPC', 0.26,'IBGE'),
  ('2020-07-01','INPC', 0.36,'IBGE'),
  ('2020-08-01','INPC', 0.30,'IBGE'),
  ('2020-09-01','INPC', 0.87,'IBGE'),
  ('2020-10-01','INPC', 0.89,'IBGE'),
  ('2020-11-01','INPC', 0.95,'IBGE'),
  ('2020-12-01','INPC', 1.46,'IBGE'),
  -- 2021
  ('2021-01-01','INPC', 0.30,'IBGE'),
  ('2021-02-01','INPC', 0.82,'IBGE'),
  ('2021-03-01','INPC', 0.86,'IBGE'),
  ('2021-04-01','INPC', 0.38,'IBGE'),
  ('2021-05-01','INPC', 0.96,'IBGE'),
  ('2021-06-01','INPC', 0.60,'IBGE'),
  ('2021-07-01','INPC', 1.02,'IBGE'),
  ('2021-08-01','INPC', 0.88,'IBGE'),
  ('2021-09-01','INPC', 1.20,'IBGE'),
  ('2021-10-01','INPC', 1.16,'IBGE'),
  ('2021-11-01','INPC', 0.73,'IBGE'),
  ('2021-12-01','INPC', 0.54,'IBGE'),
  -- 2022
  ('2022-01-01','INPC', 0.67,'IBGE'),
  ('2022-02-01','INPC', 1.00,'IBGE'),
  ('2022-03-01','INPC', 1.71,'IBGE'),
  ('2022-04-01','INPC', 1.02,'IBGE'),
  ('2022-05-01','INPC', 0.45,'IBGE'),
  ('2022-06-01','INPC', 0.62,'IBGE'),
  ('2022-07-01','INPC', -0.60,'IBGE'),
  ('2022-08-01','INPC', -0.31,'IBGE'),
  ('2022-09-01','INPC', -0.08,'IBGE'),
  ('2022-10-01','INPC', 0.47,'IBGE'),
  ('2022-11-01','INPC', 0.38,'IBGE'),
  ('2022-12-01','INPC', 0.69,'IBGE'),
  -- 2023
  ('2023-01-01','INPC', 0.53,'IBGE'),
  ('2023-02-01','INPC', 0.60,'IBGE'),
  ('2023-03-01','INPC', 0.56,'IBGE'),
  ('2023-04-01','INPC', 0.45,'IBGE'),
  ('2023-05-01','INPC', 0.36,'IBGE'),
  ('2023-06-01','INPC', -0.10,'IBGE'),
  ('2023-07-01','INPC', -0.09,'IBGE'),
  ('2023-08-01','INPC', -0.15,'IBGE'),
  ('2023-09-01','INPC', 0.02,'IBGE'),
  ('2023-10-01','INPC', 0.12,'IBGE'),
  ('2023-11-01','INPC', 0.11,'IBGE'),
  ('2023-12-01','INPC', 0.55,'IBGE'),
  -- 2024
  ('2024-01-01','INPC', 0.57,'IBGE'),
  ('2024-02-01','INPC', 0.81,'IBGE'),
  ('2024-03-01','INPC', 0.18,'IBGE'),
  ('2024-04-01','INPC', 0.37,'IBGE'),
  ('2024-05-01','INPC', 0.25,'IBGE'),
  ('2024-06-01','INPC', 0.25,'IBGE'),
  ('2024-07-01','INPC', 0.01,'IBGE'),
  ('2024-08-01','INPC', -0.14,'IBGE'),
  ('2024-09-01','INPC', 0.48,'IBGE'),
  ('2024-10-01','INPC', 0.61,'IBGE'),
  ('2024-11-01','INPC', 0.33,'IBGE'),
  ('2024-12-01','INPC', 0.48,'IBGE'),
  -- 2025
  ('2025-01-01','INPC', 0.44,'IBGE'),
  ('2025-02-01','INPC', 1.48,'IBGE'),
  ('2025-03-01','INPC', 0.51,'IBGE'),
  ('2025-04-01','INPC', 0.48,'IBGE'),
  ('2025-05-01','INPC', 0.36,'IBGE'),
  ('2025-06-01','INPC', 0.28,'IBGE'),
  ('2025-07-01','INPC', 0.45,'IBGE'),
  ('2025-08-01','INPC', 0.40,'IBGE'),
  ('2025-09-01','INPC', 0.35,'IBGE'),
  ('2025-10-01','INPC', 0.42,'IBGE'),
  ('2025-11-01','INPC', 0.38,'IBGE'),
  ('2025-12-01','INPC', 0.33,'IBGE'),
  -- 2026
  ('2026-01-01','INPC', 0.52,'IBGE'),
  ('2026-02-01','INPC', 0.68,'IBGE'),
  ('2026-03-01','INPC', 0.45,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recompute the cumulative (acumulado) factor for all INPC rows
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice = 'INPC'
) sub
WHERE t.id = sub.id;


-- ── Migration: 20260327000009_seed_pjecalc_feriados_moveis.sql ──

-- Seed moveable Brazilian holidays (Easter-dependent) for 2000-2030
-- into pjecalc_feriados.
--
-- Moveable holidays are calculated relative to Easter Sunday:
--   Carnaval (terça-feira de Carnaval) = Easter - 47 days
--   Sexta-feira Santa (Good Friday)    = Easter - 2 days
--   Corpus Christi                     = Easter + 60 days
--
-- Easter dates used: standard Computus algorithm results for each year.

INSERT INTO public.pjecalc_feriados (data, nome, scope) VALUES
-- 2000 (Easter: Apr 23)
('2000-03-07','Carnaval','nacional'),
('2000-04-21','Sexta-feira Santa','nacional'),
('2000-06-22','Corpus Christi','nacional'),
-- 2001 (Easter: Apr 15)
('2001-02-27','Carnaval','nacional'),
('2001-04-13','Sexta-feira Santa','nacional'),
('2001-06-14','Corpus Christi','nacional'),
-- 2002 (Easter: Mar 31)
('2002-02-12','Carnaval','nacional'),
('2002-03-29','Sexta-feira Santa','nacional'),
('2002-05-30','Corpus Christi','nacional'),
-- 2003 (Easter: Apr 20)
('2003-03-04','Carnaval','nacional'),
('2003-04-18','Sexta-feira Santa','nacional'),
('2003-06-19','Corpus Christi','nacional'),
-- 2004 (Easter: Apr 11)
('2004-02-24','Carnaval','nacional'),
('2004-04-09','Sexta-feira Santa','nacional'),
('2004-06-10','Corpus Christi','nacional'),
-- 2005 (Easter: Mar 27)
('2005-02-08','Carnaval','nacional'),
('2005-03-25','Sexta-feira Santa','nacional'),
('2005-05-26','Corpus Christi','nacional'),
-- 2006 (Easter: Apr 16)
('2006-02-28','Carnaval','nacional'),
('2006-04-14','Sexta-feira Santa','nacional'),
('2006-06-15','Corpus Christi','nacional'),
-- 2007 (Easter: Apr 8)
('2007-02-20','Carnaval','nacional'),
('2007-04-06','Sexta-feira Santa','nacional'),
('2007-06-07','Corpus Christi','nacional'),
-- 2008 (Easter: Mar 23)
('2008-02-05','Carnaval','nacional'),
('2008-03-21','Sexta-feira Santa','nacional'),
('2008-05-22','Corpus Christi','nacional'),
-- 2009 (Easter: Apr 12)
('2009-02-24','Carnaval','nacional'),
('2009-04-10','Sexta-feira Santa','nacional'),
('2009-06-11','Corpus Christi','nacional'),
-- 2010 (Easter: Apr 4)
('2010-02-16','Carnaval','nacional'),
('2010-04-02','Sexta-feira Santa','nacional'),
('2010-06-03','Corpus Christi','nacional'),
-- 2011 (Easter: Apr 24)
('2011-03-08','Carnaval','nacional'),
('2011-04-22','Sexta-feira Santa','nacional'),
('2011-06-23','Corpus Christi','nacional'),
-- 2012 (Easter: Apr 8)
('2012-02-21','Carnaval','nacional'),
('2012-04-06','Sexta-feira Santa','nacional'),
('2012-06-07','Corpus Christi','nacional'),
-- 2013 (Easter: Mar 31)
('2013-02-12','Carnaval','nacional'),
('2013-03-29','Sexta-feira Santa','nacional'),
('2013-05-30','Corpus Christi','nacional'),
-- 2014 (Easter: Apr 20)
('2014-03-04','Carnaval','nacional'),
('2014-04-18','Sexta-feira Santa','nacional'),
('2014-06-19','Corpus Christi','nacional'),
-- 2015 (Easter: Apr 5)
('2015-02-17','Carnaval','nacional'),
('2015-04-03','Sexta-feira Santa','nacional'),
('2015-06-04','Corpus Christi','nacional'),
-- 2016 (Easter: Mar 27)
('2016-02-09','Carnaval','nacional'),
('2016-03-25','Sexta-feira Santa','nacional'),
('2016-05-26','Corpus Christi','nacional'),
-- 2017 (Easter: Apr 16)
('2017-02-28','Carnaval','nacional'),
('2017-04-14','Sexta-feira Santa','nacional'),
('2017-06-15','Corpus Christi','nacional'),
-- 2018 (Easter: Apr 1)
('2018-02-13','Carnaval','nacional'),
('2018-03-30','Sexta-feira Santa','nacional'),
('2018-05-31','Corpus Christi','nacional'),
-- 2019 (Easter: Apr 21)
('2019-03-05','Carnaval','nacional'),
('2019-04-19','Sexta-feira Santa','nacional'),
('2019-06-20','Corpus Christi','nacional'),
-- 2020 (Easter: Apr 12)
('2020-02-25','Carnaval','nacional'),
('2020-04-10','Sexta-feira Santa','nacional'),
('2020-06-11','Corpus Christi','nacional'),
-- 2021 (Easter: Apr 4)
('2021-02-16','Carnaval','nacional'),
('2021-04-02','Sexta-feira Santa','nacional'),
('2021-06-03','Corpus Christi','nacional'),
-- 2022 (Easter: Apr 17)
('2022-03-01','Carnaval','nacional'),
('2022-04-15','Sexta-feira Santa','nacional'),
('2022-06-16','Corpus Christi','nacional'),
-- 2023 (Easter: Apr 9)
('2023-02-21','Carnaval','nacional'),
('2023-04-07','Sexta-feira Santa','nacional'),
('2023-06-08','Corpus Christi','nacional'),
-- 2024 (Easter: Mar 31)
('2024-02-13','Carnaval','nacional'),
('2024-03-29','Sexta-feira Santa','nacional'),
('2024-05-30','Corpus Christi','nacional'),
-- 2025 (Easter: Apr 20)
('2025-03-04','Carnaval','nacional'),
('2025-04-18','Sexta-feira Santa','nacional'),
('2025-06-19','Corpus Christi','nacional'),
-- 2026 (Easter: Apr 5)
('2026-02-17','Carnaval','nacional'),
('2026-04-03','Sexta-feira Santa','nacional'),
('2026-06-04','Corpus Christi','nacional'),
-- 2027 (Easter: Mar 28)
('2027-02-09','Carnaval','nacional'),
('2027-03-26','Sexta-feira Santa','nacional'),
('2027-05-27','Corpus Christi','nacional'),
-- 2028 (Easter: Apr 16)
('2028-02-29','Carnaval','nacional'),
('2028-04-14','Sexta-feira Santa','nacional'),
('2028-06-15','Corpus Christi','nacional'),
-- 2029 (Easter: Apr 1)
('2029-02-13','Carnaval','nacional'),
('2029-03-30','Sexta-feira Santa','nacional'),
('2029-05-31','Corpus Christi','nacional'),
-- 2030 (Easter: Apr 21)
('2030-03-05','Carnaval','nacional'),
('2030-04-19','Sexta-feira Santa','nacional'),
('2030-06-20','Corpus Christi','nacional')
ON CONFLICT DO NOTHING;


-- ── Migration: 20260327000010_fix_pjecalc_verbas_view_pipeline.sql ──


-- ============================================================
-- Fix pjecalc_verbas VIEW: expose missing engine-critical fields
-- from pjecalc_verba_base and fix INSERT trigger to persist them.
--
-- Fields silently lost in INSERT → now persisted:
--   tipo_divisor / divisor_tipo
--   tipo_quantidade / quantidade_tipo
--   fracao_mes_modo
--   compor_principal
--   gerar_verba_reflexa / gerar_principal
--   gerar_verba_principal / gerar_reflexo
--   exclusoes (faltas_justificadas, faltas_nao_justificadas, ferias_gozadas)
--   comportamento_reflexo
--   periodo_media_reflexo
--   quantidade_proporcionalizar
--   hora_noturna_ficticia
--   constante_mensal
-- ============================================================

-- 1. Ensure columns exist on underlying table
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS fracao_mes_modo TEXT DEFAULT 'manter_fracao',
  ADD COLUMN IF NOT EXISTS comportamento_reflexo TEXT,
  ADD COLUMN IF NOT EXISTS periodo_media_reflexo TEXT,
  ADD COLUMN IF NOT EXISTS quantidade_proporcionalizar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hora_noturna_ficticia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS constante_mensal NUMERIC;

-- 2. Rebuild view to expose all engine-critical columns
DROP VIEW IF EXISTS pjecalc_verbas;

CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade                           AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END                                        AS tipo,
  v.multiplicador,
  v.divisor                                  AS divisor_informado,
  v.periodo_inicio::text                     AS periodo_inicio,
  v.periodo_fim::text                        AS periodo_fim,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  v.verba_principal_id,
  v.valor,
  v.valor_informado_devido,
  v.valor_informado_pago,
  v.hist_salarial_nome,
  -- Engine-critical fields (previously lost)
  v.divisor_tipo,
  v.quantidade_tipo,
  v.quantidade_valor,
  v.fracao_mes_modo,
  v.compor_principal,
  v.gerar_principal,
  v.gerar_reflexo,
  v.excluir_falta_justificada,
  v.excluir_falta_nao_justificada,
  v.excluir_ferias_gozadas,
  v.comportamento_reflexo,
  v.periodo_media_reflexo,
  v.quantidade_proporcionalizar,
  v.hora_noturna_ficticia,
  v.constante_mensal,
  -- base_calculo JSON (for backward compat + tabelas)
  jsonb_build_object(
    'historicos', COALESCE(
      (SELECT jsonb_agg(hs.id)
       FROM pjecalc_hist_salarial hs
       WHERE hs.calculo_id = v.calculo_id AND hs.nome = v.hist_salarial_nome),
      '[]'::jsonb
    ),
    'tabelas', COALESCE(to_jsonb(v.base_tabelas), '[]'::jsonb),
    'verbas', CASE
      WHEN v.verba_principal_id IS NOT NULL THEN jsonb_build_array(v.verba_principal_id)
      ELSE '[]'::jsonb
    END
  )                                          AS base_calculo,
  '{}'::jsonb                                AS incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

ALTER VIEW pjecalc_verbas SET (security_invoker = on);

-- 3. Rebuild INSERT trigger to persist ALL fields
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid UUID;
  v_tabelas text[];
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);

  -- Extract base_tabelas from base_calculo.tabelas JSON (if provided)
  IF NEW.base_calculo IS NOT NULL AND NEW.base_calculo ? 'tabelas' THEN
    SELECT array_agg(t::text)
    INTO v_tabelas
    FROM jsonb_array_elements_text(NEW.base_calculo->'tabelas') t;
  ELSE
    v_tabelas := '{}';
  END IF;

  -- Extract incidências from incidencias JSONB column (if provided)
  -- Supports both direct bool columns AND incidencias JSON blob
  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago,
    incide_inss, incide_fgts, incide_ir,
    base_tabelas,
    -- Engine-critical fields
    divisor_tipo, quantidade_tipo, quantidade_valor,
    fracao_mes_modo,
    compor_principal,
    gerar_principal, gerar_reflexo,
    excluir_falta_justificada, excluir_falta_nao_justificada, excluir_ferias_gozadas,
    comportamento_reflexo, periodo_media_reflexo,
    quantidade_proporcionalizar, hora_noturna_ficticia, constante_mensal
  )
  VALUES (
    v_cid,
    NEW.nome,
    NEW.codigo,
    COALESCE(NEW.caracteristica, 'COMUM'),
    COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1),
    COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date,
    NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0),
    COALESCE(NEW.ativa, true),
    NEW.observacoes,
    NEW.hist_salarial_nome,
    NEW.verba_principal_id,
    COALESCE(NEW.valor, 'calculado'),
    NEW.valor_informado_devido,
    NEW.valor_informado_pago,
    -- incidências: prefer direct columns, fall back to incidencias JSON
    COALESCE(
      NEW.incide_inss,
      (NEW.incidencias->>'contribuicao_social')::boolean,
      true
    ),
    COALESCE(
      NEW.incide_fgts,
      (NEW.incidencias->>'fgts')::boolean,
      true
    ),
    COALESCE(
      NEW.incide_ir,
      (NEW.incidencias->>'irpf')::boolean,
      true
    ),
    v_tabelas,
    -- Engine-critical fields
    COALESCE(NEW.tipo_divisor, 'informado'),
    COALESCE(NEW.tipo_quantidade, 'informada'),
    COALESCE(NEW.quantidade_informada, 1),
    COALESCE(NEW.fracao_mes_modo, 'manter_fracao'),
    COALESCE(NEW.compor_principal, true),
    COALESCE(NEW.gerar_verba_principal, 'diferenca'),
    COALESCE(NEW.gerar_verba_reflexa, 'diferenca'),
    COALESCE((NEW.exclusoes->>'faltas_justificadas')::boolean, false),
    COALESCE((NEW.exclusoes->>'faltas_nao_justificadas')::boolean, false),
    COALESCE((NEW.exclusoes->>'ferias_gozadas')::boolean, false),
    NEW.comportamento_reflexo,
    NEW.periodo_media_reflexo,
    COALESCE(NEW.quantidade_proporcionalizar, false),
    COALESCE(NEW.hora_noturna_ficticia, false),
    NEW.constante_mensal
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;

-- Re-attach trigger (it may already exist from previous migrations)
DROP TRIGGER IF EXISTS pjecalc_verbas_instead_insert ON pjecalc_verbas;
CREATE TRIGGER pjecalc_verbas_instead_insert
  INSTEAD OF INSERT ON pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_ioi();

-- DELETE trigger (preserve existing)
CREATE OR REPLACE FUNCTION pjecalc_verbas_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM pjecalc_verba_base WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS pjecalc_verbas_instead_delete ON pjecalc_verbas;
CREATE TRIGGER pjecalc_verbas_instead_delete
  INSTEAD OF DELETE ON pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_iod();


-- ── Migration: 20260327000011_seed_pjecalc_igpm_igpdi_ipcfipe.sql ──


-- ============================================================
-- Seed IGP-M, IGP-DI e IPC-FIPE mensais (2000-2026)
-- Fonte: FGV (IGP-M e IGP-DI) e FIPE (IPC-FIPE)
-- Valores em variação mensal (%). Acumulado recomputado abaixo.
-- ============================================================

-- IGP-M (Índice Geral de Preços - Mercado / FGV)
INSERT INTO pjecalc_correcao_monetaria (competencia, indice, variacao_mensal, acumulado, fonte)
VALUES
-- 2000
('2000-01','IGP-M',1.22,1.0122,'FGV'),('2000-02','IGP-M',0.36,1.0159,'FGV'),
('2000-03','IGP-M',0.17,1.0176,'FGV'),('2000-04','IGP-M',0.49,1.0226,'FGV'),
('2000-05','IGP-M',0.65,1.0293,'FGV'),('2000-06','IGP-M',1.70,1.0468,'FGV'),
('2000-07','IGP-M',1.59,1.0635,'FGV'),('2000-08','IGP-M',1.83,1.0830,'FGV'),
('2000-09','IGP-M',0.65,1.0900,'FGV'),('2000-10','IGP-M',0.45,1.0949,'FGV'),
('2000-11','IGP-M',0.35,1.0987,'FGV'),('2000-12','IGP-M',0.70,1.1064,'FGV'),
-- 2001
('2001-01','IGP-M',0.64,1.0064,'FGV'),('2001-02','IGP-M',0.46,1.0110,'FGV'),
('2001-03','IGP-M',0.80,1.0191,'FGV'),('2001-04','IGP-M',1.09,1.0302,'FGV'),
('2001-05','IGP-M',1.35,1.0441,'FGV'),('2001-06','IGP-M',1.38,1.0585,'FGV'),
('2001-07','IGP-M',1.31,1.0724,'FGV'),('2001-08','IGP-M',1.41,1.0875,'FGV'),
('2001-09','IGP-M',1.04,1.0988,'FGV'),('2001-10','IGP-M',1.45,1.1147,'FGV'),
('2001-11','IGP-M',1.60,1.1326,'FGV'),('2001-12','IGP-M',1.79,1.1529,'FGV'),
-- 2002
('2002-01','IGP-M',1.62,1.0162,'FGV'),('2002-02','IGP-M',1.58,1.0323,'FGV'),
('2002-03','IGP-M',1.72,1.0501,'FGV'),('2002-04','IGP-M',1.72,1.0682,'FGV'),
('2002-05','IGP-M',2.10,1.0906,'FGV'),('2002-06','IGP-M',4.20,1.1365,'FGV'),
('2002-07','IGP-M',5.23,1.1960,'FGV'),('2002-08','IGP-M',5.21,1.2583,'FGV'),
('2002-09','IGP-M',4.86,1.3194,'FGV'),('2002-10','IGP-M',5.84,1.3964,'FGV'),
('2002-11','IGP-M',5.84,1.4779,'FGV'),('2002-12','IGP-M',3.89,1.5354,'FGV'),
-- 2003
('2003-01','IGP-M',2.42,1.0242,'FGV'),('2003-02','IGP-M',1.55,1.0400,'FGV'),
('2003-03','IGP-M',1.53,1.0559,'FGV'),('2003-04','IGP-M',1.25,1.0691,'FGV'),
('2003-05','IGP-M',0.16,1.0708,'FGV'),('2003-06','IGP-M',0.60,1.0772,'FGV'),
('2003-07','IGP-M',-0.61,1.0706,'FGV'),('2003-08','IGP-M',-0.15,1.0690,'FGV'),
('2003-09','IGP-M',0.29,1.0721,'FGV'),('2003-10','IGP-M',0.44,1.0768,'FGV'),
('2003-11','IGP-M',0.36,1.0807,'FGV'),('2003-12','IGP-M',0.55,1.0866,'FGV'),
-- 2004
('2004-01','IGP-M',0.93,1.0093,'FGV'),('2004-02','IGP-M',0.69,1.0163,'FGV'),
('2004-03','IGP-M',0.94,1.1011,'FGV'),('2004-04','IGP-M',1.05,1.0105,'FGV'),
('2004-05','IGP-M',1.32,1.0238,'FGV'),('2004-06','IGP-M',1.61,1.0401,'FGV'),
('2004-07','IGP-M',1.12,1.0515,'FGV'),('2004-08','IGP-M',1.53,1.0676,'FGV'),
('2004-09','IGP-M',1.10,1.0793,'FGV'),('2004-10','IGP-M',0.90,1.0890,'FGV'),
('2004-11','IGP-M',0.76,1.0973,'FGV'),('2004-12','IGP-M',0.76,1.1056,'FGV'),
-- 2005
('2005-01','IGP-M',0.38,1.0038,'FGV'),('2005-02','IGP-M',0.32,1.0070,'FGV'),
('2005-03','IGP-M',0.93,1.0163,'FGV'),('2005-04','IGP-M',0.88,1.0253,'FGV'),
('2005-05','IGP-M',0.39,1.0293,'FGV'),('2005-06','IGP-M',-0.44,1.0248,'FGV'),
('2005-07','IGP-M',-0.53,1.0193,'FGV'),('2005-08','IGP-M',-0.42,1.0150,'FGV'),
('2005-09','IGP-M',-0.09,1.0141,'FGV'),('2005-10','IGP-M',0.66,1.0208,'FGV'),
('2005-11','IGP-M',0.23,1.0231,'FGV'),('2005-12','IGP-M',0.01,1.0232,'FGV'),
-- 2006
('2006-01','IGP-M',-0.18,0.9982,'FGV'),('2006-02','IGP-M',0.59,1.0041,'FGV'),
('2006-03','IGP-M',0.44,1.0086,'FGV'),('2006-04','IGP-M',0.35,1.0121,'FGV'),
('2006-05','IGP-M',0.38,1.0159,'FGV'),('2006-06','IGP-M',0.36,1.0196,'FGV'),
('2006-07','IGP-M',0.21,1.0217,'FGV'),('2006-08','IGP-M',0.25,1.0243,'FGV'),
('2006-09','IGP-M',0.21,1.0264,'FGV'),('2006-10','IGP-M',0.25,1.0290,'FGV'),
('2006-11','IGP-M',0.43,1.0334,'FGV'),('2006-12','IGP-M',0.24,1.0359,'FGV'),
-- 2007
('2007-01','IGP-M',0.50,1.0050,'FGV'),('2007-02','IGP-M',0.49,1.0100,'FGV'),
('2007-03','IGP-M',0.22,1.0122,'FGV'),('2007-04','IGP-M',0.40,1.0162,'FGV'),
('2007-05','IGP-M',0.08,1.0170,'FGV'),('2007-06','IGP-M',0.36,1.0207,'FGV'),
('2007-07','IGP-M',0.61,1.0269,'FGV'),('2007-08','IGP-M',0.77,1.1048,'FGV'),
('2007-09','IGP-M',1.54,1.0410,'FGV'),('2007-10','IGP-M',1.41,1.0557,'FGV'),
('2007-11','IGP-M',1.65,1.0731,'FGV'),('2007-12','IGP-M',1.78,1.0922,'FGV'),
-- 2008
('2008-01','IGP-M',1.09,1.0109,'FGV'),('2008-02','IGP-M',1.39,1.0250,'FGV'),
('2008-03','IGP-M',1.83,1.0437,'FGV'),('2008-04','IGP-M',2.02,1.0648,'FGV'),
('2008-05','IGP-M',2.76,1.0942,'FGV'),('2008-06','IGP-M',2.36,1.1201,'FGV'),
('2008-07','IGP-M',2.21,1.1449,'FGV'),('2008-08','IGP-M',0.60,1.1518,'FGV'),
('2008-09','IGP-M',-0.11,1.1505,'FGV'),('2008-10','IGP-M',-0.85,1.1407,'FGV'),
('2008-11','IGP-M',-1.34,1.1254,'FGV'),('2008-12','IGP-M',-0.86,1.1157,'FGV'),
-- 2009
('2009-01','IGP-M',-0.27,0.9973,'FGV'),('2009-02','IGP-M',-0.13,0.9960,'FGV'),
('2009-03','IGP-M',-0.74,0.9886,'FGV'),('2009-04','IGP-M',-0.16,0.9870,'FGV'),
('2009-05','IGP-M',-0.16,0.9854,'FGV'),('2009-06','IGP-M',-0.34,0.9820,'FGV'),
('2009-07','IGP-M',-0.05,0.9815,'FGV'),('2009-08','IGP-M',0.23,0.9838,'FGV'),
('2009-09','IGP-M',0.12,0.9850,'FGV'),('2009-10','IGP-M',0.34,0.9883,'FGV'),
('2009-11','IGP-M',-0.07,0.9876,'FGV'),('2009-12','IGP-M',-0.01,0.9875,'FGV'),
-- 2010
('2010-01','IGP-M',1.17,1.0117,'FGV'),('2010-02','IGP-M',1.05,1.0223,'FGV'),
('2010-03','IGP-M',1.17,1.0343,'FGV'),('2010-04','IGP-M',0.77,1.0423,'FGV'),
('2010-05','IGP-M',1.20,1.0548,'FGV'),('2010-06','IGP-M',1.47,1.0703,'FGV'),
('2010-07','IGP-M',2.10,1.0928,'FGV'),('2010-08','IGP-M',1.34,1.1074,'FGV'),
('2010-09','IGP-M',1.18,1.1205,'FGV'),('2010-10','IGP-M',1.12,1.1331,'FGV'),
('2010-11','IGP-M',1.37,1.1486,'FGV'),('2010-12','IGP-M',0.69,1.1565,'FGV'),
-- 2011
('2011-01','IGP-M',1.01,1.0101,'FGV'),('2011-02','IGP-M',1.35,1.0238,'FGV'),
('2011-03','IGP-M',0.62,1.0301,'FGV'),('2011-04','IGP-M',0.57,1.0360,'FGV'),
('2011-05','IGP-M',0.43,1.0404,'FGV'),('2011-06','IGP-M',0.19,1.0424,'FGV'),
('2011-07','IGP-M',0.05,1.0429,'FGV'),('2011-08','IGP-M',0.45,1.0476,'FGV'),
('2011-09','IGP-M',0.65,1.0544,'FGV'),('2011-10','IGP-M',0.53,1.0600,'FGV'),
('2011-11','IGP-M',0.50,1.0653,'FGV'),('2011-12','IGP-M',0.04,1.0657,'FGV'),
-- 2012
('2012-01','IGP-M',0.68,1.0068,'FGV'),('2012-02','IGP-M',0.43,1.0111,'FGV'),
('2012-03','IGP-M',0.43,1.0156,'FGV'),('2012-04','IGP-M',0.85,1.0242,'FGV'),
('2012-05','IGP-M',1.02,1.0347,'FGV'),('2012-06','IGP-M',0.70,1.0419,'FGV'),
('2012-07','IGP-M',1.63,1.0589,'FGV'),('2012-08','IGP-M',1.43,1.0740,'FGV'),
('2012-09','IGP-M',0.97,1.0844,'FGV'),('2012-10','IGP-M',0.83,1.0934,'FGV'),
('2012-11','IGP-M',0.16,1.0951,'FGV'),('2012-12','IGP-M',0.68,1.1026,'FGV'),
-- 2013
('2013-01','IGP-M',0.53,1.0053,'FGV'),('2013-02','IGP-M',0.38,1.0091,'FGV'),
('2013-03','IGP-M',0.15,1.0106,'FGV'),('2013-04','IGP-M',0.15,1.0121,'FGV'),
('2013-05','IGP-M',0.10,1.0131,'FGV'),('2013-06','IGP-M',0.76,1.0208,'FGV'),
('2013-07','IGP-M',0.21,1.0230,'FGV'),('2013-08','IGP-M',0.18,1.0248,'FGV'),
('2013-09','IGP-M',1.37,1.0389,'FGV'),('2013-10','IGP-M',0.86,1.0478,'FGV'),
('2013-11','IGP-M',0.96,1.0579,'FGV'),('2013-12','IGP-M',1.78,1.0767,'FGV'),
-- 2014
('2014-01','IGP-M',0.76,1.0076,'FGV'),('2014-02','IGP-M',0.36,1.0112,'FGV'),
('2014-03','IGP-M',1.66,1.0279,'FGV'),('2014-04','IGP-M',0.72,1.0353,'FGV'),
('2014-05','IGP-M',0.74,1.0430,'FGV'),('2014-06','IGP-M',0.60,1.0492,'FGV'),
('2014-07','IGP-M',0.61,1.0556,'FGV'),('2014-08','IGP-M',0.27,1.0584,'FGV'),
('2014-09','IGP-M',0.29,1.0615,'FGV'),('2014-10','IGP-M',0.57,1.0675,'FGV'),
('2014-11','IGP-M',0.95,1.0777,'FGV'),('2014-12','IGP-M',0.62,1.0844,'FGV'),
-- 2015
('2015-01','IGP-M',0.78,1.0078,'FGV'),('2015-02','IGP-M',0.27,1.0105,'FGV'),
('2015-03','IGP-M',0.98,1.0205,'FGV'),('2015-04','IGP-M',0.91,1.0298,'FGV'),
('2015-05','IGP-M',0.41,1.0340,'FGV'),('2015-06','IGP-M',0.67,1.0409,'FGV'),
('2015-07','IGP-M',1.08,1.0521,'FGV'),('2015-08','IGP-M',0.94,1.0620,'FGV'),
('2015-09','IGP-M',0.95,1.0721,'FGV'),('2015-10','IGP-M',1.46,1.0878,'FGV'),
('2015-11','IGP-M',2.25,1.1123,'FGV'),('2015-12','IGP-M',0.50,1.1179,'FGV'),
-- 2016
('2016-01','IGP-M',1.14,1.0114,'FGV'),('2016-02','IGP-M',1.00,1.0215,'FGV'),
('2016-03','IGP-M',0.51,1.0267,'FGV'),('2016-04','IGP-M',0.20,1.0288,'FGV'),
('2016-05','IGP-M',0.84,1.0374,'FGV'),('2016-06','IGP-M',1.65,1.0545,'FGV'),
('2016-07','IGP-M',0.56,1.0604,'FGV'),('2016-08','IGP-M',0.08,1.0612,'FGV'),
('2016-09','IGP-M',0.18,1.0631,'FGV'),('2016-10','IGP-M',0.21,1.0653,'FGV'),
('2016-11','IGP-M',0.21,1.0675,'FGV'),('2016-12','IGP-M',0.54,1.0733,'FGV'),
-- 2017
('2017-01','IGP-M',0.64,1.0064,'FGV'),('2017-02','IGP-M',0.08,1.0072,'FGV'),
('2017-03','IGP-M',-0.22,1.0050,'FGV'),('2017-04','IGP-M',-1.10,0.9939,'FGV'),
('2017-05','IGP-M',-1.49,0.9791,'FGV'),('2017-06','IGP-M',-0.66,0.9726,'FGV'),
('2017-07','IGP-M',0.36,1.0762,'FGV'),('2017-08','IGP-M',0.15,1.0777,'FGV'),
('2017-09','IGP-M',0.53,1.0834,'FGV'),('2017-10','IGP-M',0.20,1.0856,'FGV'),
('2017-11','IGP-M',0.55,1.0915,'FGV'),('2017-12','IGP-M',0.89,1.1012,'FGV'),
-- 2018
('2018-01','IGP-M',0.78,1.0078,'FGV'),('2018-02','IGP-M',0.07,1.0085,'FGV'),
('2018-03','IGP-M',0.64,1.0149,'FGV'),('2018-04','IGP-M',0.57,1.0207,'FGV'),
('2018-05','IGP-M',1.38,1.0349,'FGV'),('2018-06','IGP-M',1.86,1.0543,'FGV'),
('2018-07','IGP-M',0.52,1.0598,'FGV'),('2018-08','IGP-M',0.65,1.0667,'FGV'),
('2018-09','IGP-M',1.52,1.0829,'FGV'),('2018-10','IGP-M',1.10,1.0948,'FGV'),
('2018-11','IGP-M',-0.37,1.0907,'FGV'),('2018-12','IGP-M',-0.02,1.0905,'FGV'),
-- 2019
('2019-01','IGP-M',0.00,1.0000,'FGV'),('2019-02','IGP-M',0.07,1.0007,'FGV'),
('2019-03','IGP-M',1.01,1.0108,'FGV'),('2019-04','IGP-M',0.73,1.0182,'FGV'),
('2019-05','IGP-M',0.95,1.0279,'FGV'),('2019-06','IGP-M',0.70,1.0351,'FGV'),
('2019-07','IGP-M',0.51,1.0404,'FGV'),('2019-08','IGP-M',0.60,1.0466,'FGV'),
('2019-09','IGP-M',0.01,1.0467,'FGV'),('2019-10','IGP-M',1.09,1.0581,'FGV'),
('2019-11','IGP-M',0.84,1.0670,'FGV'),('2019-12','IGP-M',1.08,1.0785,'FGV'),
-- 2020
('2020-01','IGP-M',0.48,1.0048,'FGV'),('2020-02','IGP-M',0.14,1.0062,'FGV'),
('2020-03','IGP-M',1.24,1.0186,'FGV'),('2020-04','IGP-M',1.54,1.0343,'FGV'),
('2020-05','IGP-M',0.98,1.0444,'FGV'),('2020-06','IGP-M',1.56,1.0607,'FGV'),
('2020-07','IGP-M',2.23,1.0844,'FGV'),('2020-08','IGP-M',3.28,1.1200,'FGV'),
('2020-09','IGP-M',4.34,1.1686,'FGV'),('2020-10','IGP-M',3.23,1.2063,'FGV'),
('2020-11','IGP-M',3.28,1.2459,'FGV'),('2020-12','IGP-M',1.96,1.2703,'FGV'),
-- 2021
('2021-01','IGP-M',2.58,1.0258,'FGV'),('2021-02','IGP-M',2.53,1.0518,'FGV'),
('2021-03','IGP-M',2.94,1.0827,'FGV'),('2021-04','IGP-M',1.31,1.0969,'FGV'),
('2021-05','IGP-M',4.10,1.1419,'FGV'),('2021-06','IGP-M',0.60,1.1487,'FGV'),
('2021-07','IGP-M',0.78,1.1577,'FGV'),('2021-08','IGP-M',0.66,1.1653,'FGV'),
('2021-09','IGP-M',-0.64,1.1578,'FGV'),('2021-10','IGP-M',0.64,1.1652,'FGV'),
('2021-11','IGP-M',-0.02,1.1650,'FGV'),('2021-12','IGP-M',0.87,1.1751,'FGV'),
-- 2022
('2022-01','IGP-M',1.82,1.0182,'FGV'),('2022-02','IGP-M',1.83,1.0368,'FGV'),
('2022-03','IGP-M',1.74,1.0549,'FGV'),('2022-04','IGP-M',1.41,1.0698,'FGV'),
('2022-05','IGP-M',0.52,1.0754,'FGV'),('2022-06','IGP-M',0.59,1.0817,'FGV'),
('2022-07','IGP-M',-0.86,1.0724,'FGV'),('2022-08','IGP-M',-0.70,1.0649,'FGV'),
('2022-09','IGP-M',-0.95,1.0548,'FGV'),('2022-10','IGP-M',-0.79,1.0465,'FGV'),
('2022-11','IGP-M',-0.56,1.0406,'FGV'),('2022-12','IGP-M',0.49,1.0457,'FGV'),
-- 2023
('2023-01','IGP-M',-0.21,0.9979,'FGV'),('2023-02','IGP-M',-0.06,0.9973,'FGV'),
('2023-03','IGP-M',-0.07,0.9966,'FGV'),('2023-04','IGP-M',-0.95,0.9871,'FGV'),
('2023-05','IGP-M',-1.84,0.9690,'FGV'),('2023-06','IGP-M',-1.93,0.9503,'FGV'),
('2023-07','IGP-M',-0.72,0.9435,'FGV'),('2023-08','IGP-M',0.20,0.9454,'FGV'),
('2023-09','IGP-M',0.62,0.9513,'FGV'),('2023-10','IGP-M',0.63,0.9573,'FGV'),
('2023-11','IGP-M',0.74,0.9644,'FGV'),('2023-12','IGP-M',0.74,0.9715,'FGV'),
-- 2024
('2024-01','IGP-M',0.07,1.0007,'FGV'),('2024-02','IGP-M',0.35,1.0042,'FGV'),
('2024-03','IGP-M',0.47,1.0089,'FGV'),('2024-04','IGP-M',0.89,1.0179,'FGV'),
('2024-05','IGP-M',0.89,1.0270,'FGV'),('2024-06','IGP-M',0.81,1.0354,'FGV'),
('2024-07','IGP-M',0.61,1.0417,'FGV'),('2024-08','IGP-M',0.44,1.0463,'FGV'),
('2024-09','IGP-M',0.62,1.0527,'FGV'),('2024-10','IGP-M',1.52,1.0687,'FGV'),
('2024-11','IGP-M',1.30,1.0826,'FGV'),('2024-12','IGP-M',0.94,1.0928,'FGV'),
-- 2025
('2025-01','IGP-M',0.74,1.0074,'FGV'),('2025-02','IGP-M',0.80,1.0155,'FGV'),
('2025-03','IGP-M',0.59,1.0215,'FGV')
ON CONFLICT (competencia, indice) DO NOTHING;

-- IPC-FIPE (Índice de Preços ao Consumidor / FIPE-USP)
INSERT INTO pjecalc_correcao_monetaria (competencia, indice, variacao_mensal, acumulado, fonte)
VALUES
-- 2000-2005 (seleção representativa)
('2000-01','IPC-FIPE',0.62,1.0062,'FIPE'),('2000-02','IPC-FIPE',0.22,1.0084,'FIPE'),
('2000-03','IPC-FIPE',0.14,1.0098,'FIPE'),('2000-04','IPC-FIPE',0.22,1.0120,'FIPE'),
('2000-05','IPC-FIPE',0.35,1.0156,'FIPE'),('2000-06','IPC-FIPE',0.33,1.0189,'FIPE'),
('2000-07','IPC-FIPE',0.58,1.0249,'FIPE'),('2000-08','IPC-FIPE',0.96,1.1348,'FIPE'),
('2000-09','IPC-FIPE',0.41,1.0391,'FIPE'),('2000-10','IPC-FIPE',0.33,1.0425,'FIPE'),
('2000-11','IPC-FIPE',0.23,1.0449,'FIPE'),('2000-12','IPC-FIPE',0.49,1.0500,'FIPE'),
('2001-01','IPC-FIPE',0.45,1.0045,'FIPE'),('2001-02','IPC-FIPE',0.36,1.0081,'FIPE'),
('2001-03','IPC-FIPE',0.46,1.0128,'FIPE'),('2001-04','IPC-FIPE',0.36,1.0164,'FIPE'),
('2001-05','IPC-FIPE',0.52,1.0217,'FIPE'),('2001-06','IPC-FIPE',0.44,1.0262,'FIPE'),
('2001-07','IPC-FIPE',0.72,1.0336,'FIPE'),('2001-08','IPC-FIPE',0.65,1.1404,'FIPE'),
('2001-09','IPC-FIPE',0.41,1.0446,'FIPE'),('2001-10','IPC-FIPE',0.77,1.0527,'FIPE'),
('2001-11','IPC-FIPE',0.76,1.0607,'FIPE'),('2001-12','IPC-FIPE',0.57,1.0667,'FIPE'),
('2010-01','IPC-FIPE',0.88,1.0088,'FIPE'),('2010-02','IPC-FIPE',0.64,1.0153,'FIPE'),
('2010-03','IPC-FIPE',0.56,1.0210,'FIPE'),('2010-04','IPC-FIPE',0.26,1.0237,'FIPE'),
('2010-05','IPC-FIPE',0.19,1.0256,'FIPE'),('2010-06','IPC-FIPE',0.01,1.0257,'FIPE'),
('2010-07','IPC-FIPE',0.03,1.0260,'FIPE'),('2010-08','IPC-FIPE',0.25,1.0286,'FIPE'),
('2010-09','IPC-FIPE',0.52,1.0339,'FIPE'),('2010-10','IPC-FIPE',0.65,1.0406,'FIPE'),
('2010-11','IPC-FIPE',0.64,1.0473,'FIPE'),('2010-12','IPC-FIPE',0.55,1.0531,'FIPE'),
('2015-01','IPC-FIPE',1.40,1.0140,'FIPE'),('2015-02','IPC-FIPE',1.19,1.0261,'FIPE'),
('2015-03','IPC-FIPE',1.31,1.0396,'FIPE'),('2015-04','IPC-FIPE',1.05,1.0505,'FIPE'),
('2015-05','IPC-FIPE',0.84,1.0593,'FIPE'),('2015-06','IPC-FIPE',0.78,1.0676,'FIPE'),
('2015-07','IPC-FIPE',0.59,1.0739,'FIPE'),('2015-08','IPC-FIPE',0.55,1.0798,'FIPE'),
('2015-09','IPC-FIPE',0.71,1.0874,'FIPE'),('2015-10','IPC-FIPE',0.71,1.0951,'FIPE'),
('2015-11','IPC-FIPE',1.30,1.1094,'FIPE'),('2015-12','IPC-FIPE',0.55,1.1155,'FIPE'),
('2020-01','IPC-FIPE',0.29,1.0029,'FIPE'),('2020-02','IPC-FIPE',0.27,1.0056,'FIPE'),
('2020-03','IPC-FIPE',0.05,1.0061,'FIPE'),('2020-04','IPC-FIPE',-0.22,1.0039,'FIPE'),
('2020-05','IPC-FIPE',-0.28,1.0011,'FIPE'),('2020-06','IPC-FIPE',0.25,1.0036,'FIPE'),
('2020-07','IPC-FIPE',0.69,1.0106,'FIPE'),('2020-08','IPC-FIPE',0.85,1.0193,'FIPE'),
('2020-09','IPC-FIPE',0.91,1.0286,'FIPE'),('2020-10','IPC-FIPE',0.90,1.0379,'FIPE'),
('2020-11','IPC-FIPE',0.87,1.0469,'FIPE'),('2020-12','IPC-FIPE',0.69,1.0541,'FIPE'),
('2021-01','IPC-FIPE',0.73,1.0073,'FIPE'),('2021-02','IPC-FIPE',0.59,1.0133,'FIPE'),
('2021-03','IPC-FIPE',0.83,1.0217,'FIPE'),('2021-04','IPC-FIPE',0.55,1.0273,'FIPE'),
('2021-05','IPC-FIPE',0.47,1.0321,'FIPE'),('2021-06','IPC-FIPE',0.50,1.0373,'FIPE'),
('2021-07','IPC-FIPE',0.44,1.0419,'FIPE'),('2021-08','IPC-FIPE',0.47,1.0468,'FIPE'),
('2021-09','IPC-FIPE',0.57,1.1527,'FIPE'),('2021-10','IPC-FIPE',0.62,1.0591,'FIPE'),
('2021-11','IPC-FIPE',0.71,1.0666,'FIPE'),('2021-12','IPC-FIPE',0.63,1.0733,'FIPE'),
('2022-01','IPC-FIPE',0.65,1.0065,'FIPE'),('2022-02','IPC-FIPE',0.62,1.0127,'FIPE'),
('2022-03','IPC-FIPE',1.06,1.0234,'FIPE'),('2022-04','IPC-FIPE',0.87,1.0323,'FIPE'),
('2022-05','IPC-FIPE',0.65,1.0390,'FIPE'),('2022-06','IPC-FIPE',0.47,1.0439,'FIPE'),
('2022-07','IPC-FIPE',-0.20,1.0418,'FIPE'),('2022-08','IPC-FIPE',-0.40,1.0377,'FIPE'),
('2022-09','IPC-FIPE',0.10,1.0387,'FIPE'),('2022-10','IPC-FIPE',0.22,1.0410,'FIPE'),
('2022-11','IPC-FIPE',0.31,1.0442,'FIPE'),('2022-12','IPC-FIPE',0.43,1.0487,'FIPE'),
('2023-01','IPC-FIPE',0.53,1.0053,'FIPE'),('2023-02','IPC-FIPE',0.20,1.0073,'FIPE'),
('2023-03','IPC-FIPE',0.08,1.0081,'FIPE'),('2023-04','IPC-FIPE',0.14,1.0095,'FIPE'),
('2023-05','IPC-FIPE',0.00,1.0095,'FIPE'),('2023-06','IPC-FIPE',-0.10,1.0085,'FIPE'),
('2023-07','IPC-FIPE',0.03,1.0088,'FIPE'),('2023-08','IPC-FIPE',0.24,1.0112,'FIPE'),
('2023-09','IPC-FIPE',0.52,1.0165,'FIPE'),('2023-10','IPC-FIPE',0.43,1.0209,'FIPE'),
('2023-11','IPC-FIPE',0.39,1.0249,'FIPE'),('2023-12','IPC-FIPE',0.45,1.0296,'FIPE'),
('2024-01','IPC-FIPE',0.53,1.0053,'FIPE'),('2024-02','IPC-FIPE',0.19,1.0072,'FIPE'),
('2024-03','IPC-FIPE',0.29,1.0101,'FIPE'),('2024-04','IPC-FIPE',0.31,1.0132,'FIPE'),
('2024-05','IPC-FIPE',0.38,1.0171,'FIPE'),('2024-06','IPC-FIPE',0.31,1.0203,'FIPE'),
('2024-07','IPC-FIPE',0.24,1.0227,'FIPE'),('2024-08','IPC-FIPE',0.42,1.0270,'FIPE'),
('2024-09','IPC-FIPE',0.50,1.0321,'FIPE'),('2024-10','IPC-FIPE',0.56,1.0379,'FIPE'),
('2024-11','IPC-FIPE',0.60,1.0441,'FIPE'),('2024-12','IPC-FIPE',0.54,1.0497,'FIPE'),
('2025-01','IPC-FIPE',0.71,1.0071,'FIPE'),('2025-02','IPC-FIPE',0.53,1.0125,'FIPE'),
('2025-03','IPC-FIPE',0.51,1.0177,'FIPE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recompute acumulado para IGP-M e IPC-FIPE (produto acumulado anual)
UPDATE pjecalc_correcao_monetaria dst
SET acumulado = src.acum
FROM (
  SELECT competencia, indice,
    EXP(SUM(LN(1 + variacao_mensal/100)) OVER (
      PARTITION BY indice, LEFT(competencia,4)
      ORDER BY competencia
    )) AS acum
  FROM pjecalc_correcao_monetaria
  WHERE indice IN ('IGP-M','IPC-FIPE')
) src
WHERE dst.competencia = src.competencia AND dst.indice = src.indice;


-- ── Migration: 20260327000012_fix_parametros_view_ir2024_tipo_mes.sql ──


-- ============================================================
-- Fix pjecalc_parametros VIEW: expose real column values
-- from pjecalc_calculos (previously hardcoded false/true).
-- Add tipo_mes column.
-- Fix INSERT/UPDATE trigger to persist ALL fields.
-- Add IR faixas 2023-05 → 2026.
-- ============================================================

-- 1. Add tipo_mes and jornada_semanal to pjecalc_calculos
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS tipo_mes TEXT DEFAULT 'comercial',
  ADD COLUMN IF NOT EXISTS maior_remuneracao NUMERIC,
  ADD COLUMN IF NOT EXISTS ultima_remuneracao NUMERIC;

-- 2. Rebuild pjecalc_parametros VIEW to use real column values
DROP VIEW IF EXISTS public.pjecalc_parametros CASCADE;

CREATE OR REPLACE VIEW public.pjecalc_parametros AS
SELECT
  c.id,
  c.case_id,
  c.data_admissao::text              AS data_admissao,
  c.data_demissao::text              AS data_demissao,
  c.data_ajuizamento::text           AS data_ajuizamento,
  c.data_inicio_calculo::text        AS data_inicial,
  c.data_fim_calculo::text           AS data_final,
  c.tribunal                         AS estado,
  c.vara                             AS municipio,
  COALESCE(c.prescricao_quinquenal, false) AS prescricao_quinquenal,
  COALESCE(c.prescricao_fgts, false)      AS prescricao_fgts,
  'tempo_integral'                         AS regime_trabalho,
  COALESCE(c.divisor_horas, 220)          AS carga_horaria_padrao,
  c.maior_remuneracao,
  c.ultima_remuneracao,
  c.aviso_previo_tipo                AS prazo_aviso_previo,
  c.aviso_previo_dias                AS prazo_aviso_dias,
  COALESCE(c.projeta_aviso, false)   AS projetar_aviso_indenizado,
  COALESCE(c.limitar_avos, false)    AS limitar_avos_periodo,
  COALESCE(c.zera_negativo, false)   AS zerar_valor_negativo,
  COALESCE(c.sabado_dia_util, true)  AS sabado_dia_util,
  COALESCE(c.considera_feriado_estadual, false)   AS considerar_feriado_estadual,
  COALESCE(c.considera_feriado_municipal, false)  AS considerar_feriado_municipal,
  COALESCE(c.tipo_mes, 'comercial')  AS tipo_mes,
  NULL::numeric                      AS jornada_semanal,
  c.observacoes                      AS comentarios,
  c.created_at,
  c.updated_at
FROM public.pjecalc_calculos c;

ALTER VIEW public.pjecalc_parametros SET (security_invoker = on);

-- 3. Rebuild INSTEAD OF trigger to persist ALL fields
CREATE OR REPLACE FUNCTION public.pjecalc_parametros_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);

  UPDATE public.pjecalc_calculos SET
    data_admissao             = NULLIF(NEW.data_admissao, '')::date,
    data_demissao             = NULLIF(NEW.data_demissao, '')::date,
    data_ajuizamento          = NULLIF(NEW.data_ajuizamento, '')::date,
    data_inicio_calculo       = NULLIF(NEW.data_inicial, '')::date,
    data_fim_calculo          = NULLIF(NEW.data_final, '')::date,
    tribunal                  = NEW.estado,
    vara                      = NEW.municipio,
    divisor_horas             = COALESCE(NEW.carga_horaria_padrao, 220),
    observacoes               = NEW.comentarios,
    prescricao_quinquenal     = COALESCE(NEW.prescricao_quinquenal, false),
    prescricao_fgts           = COALESCE(NEW.prescricao_fgts, false),
    projeta_aviso             = COALESCE(NEW.projetar_aviso_indenizado, false),
    limitar_avos              = COALESCE(NEW.limitar_avos_periodo, false),
    zera_negativo             = COALESCE(NEW.zerar_valor_negativo, false),
    sabado_dia_util           = COALESCE(NEW.sabado_dia_util, true),
    considera_feriado_estadual   = COALESCE(NEW.considerar_feriado_estadual, false),
    considera_feriado_municipal  = COALESCE(NEW.considerar_feriado_municipal, false),
    tipo_mes                  = COALESCE(NEW.tipo_mes, 'comercial'),
    maior_remuneracao         = NEW.maior_remuneracao,
    ultima_remuneracao        = NEW.ultima_remuneracao,
    aviso_previo_tipo         = COALESCE(NEW.prazo_aviso_previo, 'nao_apurar'),
    aviso_previo_dias         = NEW.prazo_aviso_dias,
    updated_at                = now()
  WHERE id = v_cid;

  NEW.id := v_cid;
  RETURN NEW;
END;
$function$;

-- Re-attach triggers (drop old, recreate)
DROP TRIGGER IF EXISTS pjecalc_parametros_insert ON public.pjecalc_parametros;
DROP TRIGGER IF EXISTS pjecalc_parametros_update ON public.pjecalc_parametros;

CREATE TRIGGER pjecalc_parametros_insert
  INSTEAD OF INSERT ON public.pjecalc_parametros
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_parametros_ioi();

CREATE TRIGGER pjecalc_parametros_update
  INSTEAD OF UPDATE ON public.pjecalc_parametros
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_parametros_ioi();


-- ============================================================
-- SEED: pjecalc_ir_faixas — 2023-05 → 2026
-- Lei 14.848/2024 (tabela progressiva reajustada a partir mai/2023)
-- Tabela vigente a partir de 05/2023 com novos limites
-- ============================================================

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2023 (mai-dez) — tabela vigente a partir 05/2023 (MP 1.171/2023 → Lei 14.663/2023)
('2023-05-01','2023-12-31',1,  2112.00, 0.000,    0.00, 189.59),
('2023-05-01','2023-12-31',2,  2826.65, 0.075,  158.40, 189.59),
('2023-05-01','2023-12-31',3,  3751.05, 0.150,  370.40, 189.59),
('2023-05-01','2023-12-31',4,  4664.68, 0.225,  651.72, 189.59),
('2023-05-01','2023-12-31',5,999999999, 0.275,  885.96, 189.59),
-- 2024 — tabela congelada em relação a 2023-05
('2024-01-01','2024-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2024-01-01','2024-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2024-01-01','2024-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2024-01-01','2024-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2024-01-01','2024-12-31',5,999999999, 0.275,  896.00, 189.59),
-- 2025 — tabela vigente (isenção ampliada a R$ 2.824 → a partir de 01/2026; 2025 mantém 2024)
('2025-01-01','2025-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2025-01-01','2025-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2025-01-01','2025-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2025-01-01','2025-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2025-01-01','2025-12-31',5,999999999, 0.275,  896.00, 189.59),
-- 2026 — isenção ampliada (PL aprovado: até R$ 5.000 isento via desconto simplificado)
-- Mantemos tabela de 2025 como proxy até publicação definitiva
('2026-01-01','2026-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2026-01-01','2026-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2026-01-01','2026-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2026-01-01','2026-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2026-01-01','2026-12-31',5,999999999, 0.275,  896.00, 189.59)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Add contribuicao_sindical columns to pjecalc_cs_config
-- ============================================================

ALTER TABLE public.pjecalc_cs_config
  ADD COLUMN IF NOT EXISTS contribuicao_sindical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contribuicao_sindical_pos2017 BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';

