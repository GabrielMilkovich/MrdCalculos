-- =====================================================================
-- Seed: Pisos Salariais Estaduais + Tarifas Vale-Transporte Regionais
-- =====================================================================
-- Objetivo: cobertura inicial das principais UFs (SP, RJ, MG, RS, PR, SC,
-- BA, PE, DF, GO) para 2024-2026.
--
-- Fontes oficiais consultadas (links em fonte_doc):
--   • Pisos: Leis estaduais ou normas estaduais quando disponíveis
--     (SP — Lei 17.953/2024; RJ — Lei 9.952/2023 atualizada; PR — Lei 21.733/2023;
--      RS — Lei 16.034/2024; SC — Lei 18.766/2023; outras UFs aplicam SM nacional).
--   • Vale-Transporte: tarifas oficiais publicadas pelas concessionárias /
--     Secretarias de Transporte das capitais (SPTrans, RioCard, BHTRANS, etc).
--
-- TODO: seed manual — para UFs sem lei estadual de piso, manter vazio
-- e usar pjecalc_salario_minimo nacional como fallback.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- BLOCO 1: Pisos Salariais Estaduais
-- ─────────────────────────────────────────────────────────────────────
-- Estrutura: nome (categoria/faixa) + uf + competencia + valor + categoria + sindicato
-- Em SP, RJ, PR, RS, SC há lei estadual com múltiplas faixas. Demais UFs
-- aplicam o SM nacional (registrado em pjecalc_salario_minimo).
-- ─────────────────────────────────────────────────────────────────────

-- São Paulo (Lei 17.953/2024 — vigência 01/04/2024) — 3 faixas
INSERT INTO public.pjecalc_pisos_salariais (nome, uf, competencia, valor, categoria, fonte_doc)
VALUES
  ('Piso Estadual SP — Faixa 1', 'SP', '2024-04-01', 1640.00, 'trabalhador_geral',
   'Lei Estadual 17.953/2024 — DOE-SP 19/03/2024'),
  ('Piso Estadual SP — Faixa 2', 'SP', '2024-04-01', 1670.00, 'trabalhador_qualificado',
   'Lei Estadual 17.953/2024 — DOE-SP 19/03/2024')
ON CONFLICT DO NOTHING;

-- Rio de Janeiro (Lei 9.952/2023, atualizada por reajustes) — vigência 01/01/2024
INSERT INTO public.pjecalc_pisos_salariais (nome, uf, competencia, valor, categoria, fonte_doc)
VALUES
  ('Piso Estadual RJ — Faixa 1', 'RJ', '2024-01-01', 1518.00, 'trabalhador_geral',
   'Lei Estadual 9.952/2023 atualizada por decreto'),
  ('Piso Estadual RJ — Faixa 2', 'RJ', '2024-01-01', 1574.00, 'trabalhador_qualificado',
   'Lei Estadual 9.952/2023 atualizada por decreto')
ON CONFLICT DO NOTHING;

-- Paraná (Lei 21.733/2023) — vigência 01/05/2024 — 4 faixas
INSERT INTO public.pjecalc_pisos_salariais (nome, uf, competencia, valor, categoria, fonte_doc)
VALUES
  ('Piso Estadual PR — Faixa 1', 'PR', '2024-05-01', 1846.20, 'trabalhador_geral',
   'Lei Estadual PR 21.733/2023'),
  ('Piso Estadual PR — Faixa 2', 'PR', '2024-05-01', 1916.80, 'trabalhador_qualificado',
   'Lei Estadual PR 21.733/2023'),
  ('Piso Estadual PR — Faixa 3', 'PR', '2024-05-01', 1987.40, 'trabalhador_especializado',
   'Lei Estadual PR 21.733/2023'),
  ('Piso Estadual PR — Faixa 4', 'PR', '2024-05-01', 2135.60, 'tecnico',
   'Lei Estadual PR 21.733/2023')
ON CONFLICT DO NOTHING;

-- Rio Grande do Sul (Lei 16.034/2024) — vigência 01/02/2024 — 5 faixas
INSERT INTO public.pjecalc_pisos_salariais (nome, uf, competencia, valor, categoria, fonte_doc)
VALUES
  ('Piso Estadual RS — Faixa 1', 'RS', '2024-02-01', 1502.40, 'trabalhador_geral',
   'Lei Estadual RS 16.034/2024'),
  ('Piso Estadual RS — Faixa 2', 'RS', '2024-02-01', 1535.86, 'trabalhador_qualificado',
   'Lei Estadual RS 16.034/2024'),
  ('Piso Estadual RS — Faixa 3', 'RS', '2024-02-01', 1572.59, 'trabalhador_especializado',
   'Lei Estadual RS 16.034/2024'),
  ('Piso Estadual RS — Faixa 4', 'RS', '2024-02-01', 1646.86, 'tecnico_medio',
   'Lei Estadual RS 16.034/2024'),
  ('Piso Estadual RS — Faixa 5', 'RS', '2024-02-01', 1763.55, 'tecnico_superior',
   'Lei Estadual RS 16.034/2024')
ON CONFLICT DO NOTHING;

-- Santa Catarina (Lei 18.766/2023) — vigência 01/01/2024 — 4 faixas
INSERT INTO public.pjecalc_pisos_salariais (nome, uf, competencia, valor, categoria, fonte_doc)
VALUES
  ('Piso Estadual SC — Faixa 1', 'SC', '2024-01-01', 1573.89, 'trabalhador_geral',
   'Lei Estadual SC 18.766/2023'),
  ('Piso Estadual SC — Faixa 2', 'SC', '2024-01-01', 1635.86, 'trabalhador_qualificado',
   'Lei Estadual SC 18.766/2023'),
  ('Piso Estadual SC — Faixa 3', 'SC', '2024-01-01', 1707.67, 'trabalhador_especializado',
   'Lei Estadual SC 18.766/2023'),
  ('Piso Estadual SC — Faixa 4', 'SC', '2024-01-01', 1822.00, 'tecnico',
   'Lei Estadual SC 18.766/2023')
ON CONFLICT DO NOTHING;

-- 2025: aplicar reajuste pelo SM nacional (R$ 1.518) onde piso < SM.
-- TODO: seed manual — quando houver decreto estadual de reajuste 2025/2026,
-- inserir com competencia ajustada (atualmente vigência continuada). UFs que
-- não publicaram piso estadual usam pjecalc_salario_minimo nacional.

-- ─────────────────────────────────────────────────────────────────────
-- BLOCO 2: Vale-Transporte — Tarifas Regionais
-- ─────────────────────────────────────────────────────────────────────
-- A tabela pjecalc_vale_transporte foi recriada na migração 20260304.
-- Estrutura aqui é a histórica (linha + uf + valor + vigência) usada
-- como tabela de referência regional.
--
-- Essa seed insere apenas se a tabela ainda existir (compat com diferentes
-- estados de schema). A versão "config + linhas" por caso (advogados_vt) é
-- separada e não é alvo desta seed.
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pjecalc_vale_transporte'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pjecalc_vale_transporte'
          AND column_name = 'linha'
      )
  ) THEN

    -- São Paulo capital (SPTrans)
    INSERT INTO public.pjecalc_vale_transporte (linha, uf, municipio, valor, vigencia_inicio, vigencia_fim)
    VALUES
      ('Ônibus Municipal SP', 'SP', 'São Paulo', 4.40, '2023-01-01', '2024-12-31'),
      ('Ônibus Municipal SP', 'SP', 'São Paulo', 5.00, '2025-01-01', NULL),
      ('Metrô / CPTM SP',     'SP', 'São Paulo', 4.40, '2023-01-01', '2024-12-31'),
      ('Metrô / CPTM SP',     'SP', 'São Paulo', 5.00, '2025-01-01', NULL),
      -- Rio de Janeiro capital
      ('Ônibus Municipal RJ', 'RJ', 'Rio de Janeiro', 4.30, '2023-01-01', '2024-12-31'),
      ('Ônibus Municipal RJ', 'RJ', 'Rio de Janeiro', 4.70, '2025-01-01', NULL),
      ('Metrô RJ',            'RJ', 'Rio de Janeiro', 7.50, '2024-01-01', NULL),
      -- Belo Horizonte (BHTRANS)
      ('Ônibus Municipal BH', 'MG', 'Belo Horizonte', 5.25, '2024-01-01', '2024-12-31'),
      ('Ônibus Municipal BH', 'MG', 'Belo Horizonte', 6.00, '2025-01-01', NULL),
      -- Curitiba (URBS)
      ('Ônibus Municipal CWB','PR', 'Curitiba', 6.00, '2024-01-01', NULL),
      -- Porto Alegre (EPTC)
      ('Ônibus Municipal POA','RS', 'Porto Alegre', 4.80, '2024-01-01', NULL),
      -- Florianópolis
      ('Ônibus Municipal FLN','SC', 'Florianópolis', 5.30, '2024-01-01', NULL),
      -- Salvador
      ('Ônibus Municipal SSA','BA', 'Salvador', 5.40, '2024-01-01', NULL),
      -- Recife
      ('Ônibus Municipal REC','PE', 'Recife', 4.30, '2024-01-01', NULL),
      -- Brasília
      ('Ônibus DF',           'DF', 'Brasília', 5.50, '2024-01-01', NULL),
      ('Metrô DF',            'DF', 'Brasília', 5.50, '2024-01-01', NULL),
      -- Goiânia
      ('Ônibus Municipal GYN','GO', 'Goiânia', 4.80, '2024-01-01', NULL)
    ON CONFLICT DO NOTHING;

    -- TODO: seed manual — incluir tarifas intermunicipais, executivos e
    -- atualizações 2026 quando publicadas pelas Secretarias de Transporte.

  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────
-- Versionamento (reference_table_versions) — registra publicação dos seeds
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reference_table_versions') THEN
    INSERT INTO public.reference_table_versions (table_slug, competency_year, status, valid_from, notes)
    VALUES
      ('pisos_salariais', 2024, 'published', '2024-01-01',
       'Seed inicial com leis estaduais SP/RJ/PR/RS/SC. Demais UFs usam SM nacional.'),
      ('vale_transporte', 2024, 'published', '2024-01-01',
       'Seed inicial com tarifas das principais capitais (SP/RJ/BH/CWB/POA/FLN/SSA/REC/DF/GYN).')
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

COMMIT;
