-- =====================================================
-- FIX RLS POLICIES ON pjecalc_* TABLES
-- =====================================================
-- Problem: All pjecalc_* tables had USING(true) / WITH CHECK(true)
-- policies, meaning any authenticated user could read/write any
-- other user's calculation data. This migration drops those open
-- policies and creates owner-restricted policies.
--
-- Tables fall into three categories:
--   1. Tables with case_id directly (link to cases.criado_por)
--   2. Tables with calculo_id (link via pjecalc_calculos.case_id → cases.criado_por)
--   3. Reference/global tables (no case_id, no calculo_id) — public read only
-- =====================================================

-- Step 1: Drop ALL existing policies on pjecalc_* tables
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END
$$;

-- Step 2: Ensure RLS is enabled on all pjecalc_* tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$$;

-- Step 3: Create owner-restricted policies
-- We categorize tables by how they link to the case owner.

-- ── Category A: Tables with case_id column (direct link to cases) ──
-- These tables have a case_id FK to cases(id).
DO $$
DECLARE
  tbl text;
  case_id_tables text[] := ARRAY[
    'pjecalc_calculos',
    'pjecalc_parametros',
    'pjecalc_dados_processo',
    'pjecalc_cartao_ponto',
    'pjecalc_fgts_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_correcao_config',
    'pjecalc_honorarios',
    'pjecalc_custas',
    'pjecalc_custas_config',
    'pjecalc_liquidacao_resultado',
    'pjecalc_multas_config',
    'pjecalc_salario_familia_config',
    'pjecalc_pensao_config',
    'pjecalc_previdencia_privada_config',
    'pjecalc_seguro_config',
    'pjecalc_seguro_desemprego_config',
    'pjecalc_pensao_alimenticia_config',
    'pjecalc_prev_privada_config',
    'pjecalc_sal_familia_config',
    'pjecalc_fgts_saldos_saques',
    'pjecalc_observacoes',
    'pjecalc_audit_log',
    'pjecalc_metricas',
    'pjecalc_parametros_extras',
    'pjecalc_ponto_diario',
    'pjecalc_cartao_ponto_colunas',
    'pjecalc_excecoes_carga',
    'pjecalc_excecoes_sabado',
    'pjecalc_ocorrencias',
    'pjecalc_fgts_ocorrencias',
    'pjecalc_cs_ocorrencias',
    'pjecalc_faltas',
    'pjecalc_ferias',
    'pjecalc_historico_salarial',
    'pjecalc_historico_ocorrencias',
    'pjecalc_verbas'
  ];
BEGIN
  FOREACH tbl IN ARRAY case_id_tables
  LOOP
    -- Only create policy if table actually exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- Check if table actually has case_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'case_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "owner_access" ON public.%I FOR ALL TO authenticated '
          'USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = %I.case_id AND c.criado_por = auth.uid())) '
          'WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = %I.case_id AND c.criado_por = auth.uid()))',
          tbl, tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- ── Category B: Tables with calculo_id (link via pjecalc_calculos → cases) ──
-- These tables have calculo_id FK to pjecalc_calculos(id), no direct case_id.
DO $$
DECLARE
  tbl text;
  calculo_id_tables text[] := ARRAY[
    'pjecalc_evento_intervalo',
    'pjecalc_apuracao_diaria',
    'pjecalc_hist_salarial',
    'pjecalc_hist_salarial_mes',
    'pjecalc_rubrica_raw',
    'pjecalc_rubrica_map',
    'pjecalc_verba_base',
    'pjecalc_reflexo',
    'pjecalc_reflexo_base_verba',
    'pjecalc_atualizacao_config',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_resultado'
  ];
BEGIN
  FOREACH tbl IN ARRAY calculo_id_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- Check if table actually has calculo_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'calculo_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "owner_access" ON public.%I FOR ALL TO authenticated '
          'USING (EXISTS ('
            'SELECT 1 FROM public.pjecalc_calculos pc '
            'JOIN public.cases c ON c.id = pc.case_id '
            'WHERE pc.id = %I.calculo_id AND c.criado_por = auth.uid()'
          ')) '
          'WITH CHECK (EXISTS ('
            'SELECT 1 FROM public.pjecalc_calculos pc '
            'JOIN public.cases c ON c.id = pc.case_id '
            'WHERE pc.id = %I.calculo_id AND c.criado_por = auth.uid()'
          '))',
          tbl, tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- ── Category C: Reference/global tables — authenticated read-only, no write ──
-- These are shared lookup tables (INSS faixas, IR faixas, feriados, índices, etc.)
-- They have no case_id or calculo_id. All authenticated users can read them.
-- Only service_role can write (no authenticated write policy).
DO $$
DECLARE
  tbl text;
  reference_tables text[] := ARRAY[
    'pjecalc_inss_faixas',
    'pjecalc_ir_faixas',
    'pjecalc_feriados',
    'pjecalc_correcao_monetaria',
    'pjecalc_juros_mora',
    'pjecalc_salario_minimo',
    'pjecalc_salario_familia',
    'pjecalc_seguro_desemprego',
    'pjecalc_contribuicao_social',
    'pjecalc_imposto_renda',
    'pjecalc_imposto_renda_faixas',
    'pjecalc_custas_judiciais',
    'pjecalc_pisos_salariais',
    'pjecalc_vale_transporte',
    'pjecalc_verbas_padrao'
  ];
BEGIN
  FOREACH tbl IN ARRAY reference_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "authenticated_read" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl
      );
    END IF;
  END LOOP;
END
$$;

-- ── Step 4: Explicitly revoke anon access from ALL pjecalc_* tables ──
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
  END LOOP;
END
$$;
