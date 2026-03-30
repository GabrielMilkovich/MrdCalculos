-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 4 (files 31 to 40 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260227203919_9417152c-6f2f-41b2-aa1d-dd838db2962b.sql ──


-- =============================================
-- TABELAS DE REFERÊNCIA PJe-Calc (Nacionais)
-- =============================================

-- 1. Salário Mínimo (Nacional)
CREATE TABLE public.pjecalc_salario_minimo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_salario_minimo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_minimo" ON public.pjecalc_salario_minimo FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_minimo" ON public.pjecalc_salario_minimo FOR ALL USING (auth.role() = 'authenticated');

-- 2. Salário-família (faixas por competência)
CREATE TABLE public.pjecalc_salario_familia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  valor_cota numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_salario_familia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_familia" ON public.pjecalc_salario_familia FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_familia" ON public.pjecalc_salario_familia FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seguro-desemprego (faixas por competência)
CREATE TABLE public.pjecalc_seguro_desemprego (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor_piso numeric NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  percentual numeric NOT NULL,
  valor_soma numeric,
  valor_teto numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR ALL USING (auth.role() = 'authenticated');

-- 4. Contribuição Social (faixas progressivas por competência e tipo)
CREATE TABLE public.pjecalc_contribuicao_social (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'segurado_empregado',  -- segurado_empregado, empregado_domestico
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  aliquota numeric NOT NULL,
  teto_maximo numeric,
  teto_beneficio numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo, faixa)
);
ALTER TABLE public.pjecalc_contribuicao_social ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read contribuicao_social" ON public.pjecalc_contribuicao_social FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage contribuicao_social" ON public.pjecalc_contribuicao_social FOR ALL USING (auth.role() = 'authenticated');

-- 5. Imposto de Renda (tabela progressiva + deduções por competência)
CREATE TABLE public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  deducao_aposentado_65 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read imposto_renda" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage imposto_renda" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');

-- 5b. Faixas do Imposto de Renda
CREATE TABLE public.pjecalc_imposto_renda_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_id uuid NOT NULL REFERENCES public.pjecalc_imposto_renda(id) ON DELETE CASCADE,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric,
  aliquota numeric NOT NULL DEFAULT 0,
  parcela_deduzir numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ir_id, faixa)
);
ALTER TABLE public.pjecalc_imposto_renda_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR ALL USING (auth.role() = 'authenticated');

-- 6. Custas Judiciais (por TRT/período)
CREATE TABLE public.pjecalc_custas_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  atos_oficiais_urbana numeric DEFAULT 0,
  atos_oficiais_rural numeric DEFAULT 0,
  agravo_instrumento numeric DEFAULT 0,
  agravo_peticao numeric DEFAULT 0,
  impugnacao_sentenca numeric DEFAULT 0,
  recurso_revista numeric DEFAULT 0,
  embargos_arrematacao numeric DEFAULT 0,
  embargos_execucao numeric DEFAULT 0,
  embargos_terceiros numeric DEFAULT 0,
  piso_custas_conhecimento numeric DEFAULT 0,
  teto_custas_liquidacao numeric DEFAULT 0,
  teto_custas_autos numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vigencia_inicio)
);
ALTER TABLE public.pjecalc_custas_judiciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read custas" ON public.pjecalc_custas_judiciais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage custas" ON public.pjecalc_custas_judiciais FOR ALL USING (auth.role() = 'authenticated');

-- 7. Correção Monetária (índices mensais por tipo)
CREATE TABLE public.pjecalc_correcao_monetaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  indice text NOT NULL, -- IPCA-E, INPC, TR, SELIC, etc.
  valor numeric NOT NULL,
  acumulado numeric,
  fonte text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, indice)
);
ALTER TABLE public.pjecalc_correcao_monetaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read correcao" ON public.pjecalc_correcao_monetaria FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage correcao" ON public.pjecalc_correcao_monetaria FOR ALL USING (auth.role() = 'authenticated');

-- 8. Juros de Mora (taxas por período)
CREATE TABLE public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'trabalhista', -- trabalhista, selic, civil
  taxa_mensal numeric NOT NULL,
  acumulado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');

-- 9. Pisos Salariais (regionais, por TRT)
CREATE TABLE public.pjecalc_pisos_salariais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL,
  competencia date NOT NULL,
  valor numeric NOT NULL,
  categoria text,
  sindicato text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_pisos_salariais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pisos" ON public.pjecalc_pisos_salariais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage pisos" ON public.pjecalc_pisos_salariais FOR ALL USING (auth.role() = 'authenticated');

-- 10. Vale-Transporte (regional)
CREATE TABLE public.pjecalc_vale_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha text NOT NULL,
  uf text NOT NULL,
  municipio text,
  valor numeric NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_vale_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vt" ON public.pjecalc_vale_transporte FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage vt" ON public.pjecalc_vale_transporte FOR ALL USING (auth.role() = 'authenticated');

-- 11. Verbas Padrão (cadastro nacional de verbas)
CREATE TABLE public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'principal', -- principal, reflexa
  valor_tipo text NOT NULL DEFAULT 'calculado', -- calculado, informado
  caracteristica text NOT NULL DEFAULT 'comum', -- comum, 13_salario, ferias
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  divisor_padrao numeric DEFAULT 30,
  multiplicador_padrao numeric DEFAULT 1,
  incidencia_fgts boolean DEFAULT false,
  incidencia_cs boolean DEFAULT false,
  incidencia_irpf boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verbas_padrao" ON public.pjecalc_verbas_padrao FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');

-- 12. Feriados (complementar à tabela calendars existente - dados regionais)
-- Já existe a tabela calendars, vamos usá-la


-- ── Migration: 20260227204923_413e92a0-6bb3-48f0-85b2-c8d81c0731bb.sql ──


-- pjecalc_imposto_renda_faixas: unique on (ir_id, faixa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_imposto_renda_faixas_irid_faixa_unique') THEN
    ALTER TABLE public.pjecalc_imposto_renda_faixas ADD CONSTRAINT pjecalc_imposto_renda_faixas_irid_faixa_unique UNIQUE (ir_id, faixa);
  END IF;
END $$;


-- ── Migration: 20260227210104_ff40baa8-f0e0-4440-a3b8-e7797a5048e7.sql ──


-- Config tables for PJe-Calc modules
CREATE TABLE IF NOT EXISTS public.pjecalc_dados_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  numero_processo TEXT,
  vara TEXT,
  comarca TEXT,
  uf TEXT DEFAULT 'SP',
  tipo_acao TEXT DEFAULT 'trabalhista',
  rito TEXT DEFAULT 'ordinario',
  fase TEXT DEFAULT 'conhecimento',
  data_distribuicao TEXT,
  data_citacao TEXT,
  data_transito TEXT,
  juiz TEXT,
  reclamante_nome TEXT,
  reclamante_cpf TEXT,
  reclamada_nome TEXT,
  reclamada_cnpj TEXT,
  objeto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL,
  dias_uteis INTEGER DEFAULT 22,
  dias_trabalhados INTEGER DEFAULT 22,
  horas_normais NUMERIC DEFAULT 0,
  horas_extras_50 NUMERIC DEFAULT 0,
  horas_extras_100 NUMERIC DEFAULT 0,
  horas_noturnas NUMERIC DEFAULT 0,
  adicional_noturno_pct NUMERIC DEFAULT 20,
  intervalo_suprimido NUMERIC DEFAULT 0,
  sobreaviso NUMERIC DEFAULT 0,
  dsr_horas NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, competencia)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  destino TEXT DEFAULT 'pagar_reclamante',
  compor_principal BOOLEAN DEFAULT true,
  multa_apurar BOOLEAN DEFAULT true,
  multa_tipo TEXT DEFAULT 'calculada',
  multa_percentual NUMERIC DEFAULT 40,
  multa_base TEXT DEFAULT 'devido',
  multa_valor_informado NUMERIC,
  deduzir_saldo BOOLEAN DEFAULT false,
  lc110_10 BOOLEAN DEFAULT false,
  lc110_05 BOOLEAN DEFAULT false,
  saldos_saques JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_segurado BOOLEAN DEFAULT true,
  cobrar_reclamante BOOLEAN DEFAULT true,
  cs_sobre_salarios_pagos BOOLEAN DEFAULT false,
  aliquota_segurado_tipo TEXT DEFAULT 'empregado',
  aliquota_segurado_fixa NUMERIC,
  limitar_teto BOOLEAN DEFAULT true,
  apurar_empresa BOOLEAN DEFAULT true,
  apurar_sat BOOLEAN DEFAULT true,
  apurar_terceiros BOOLEAN DEFAULT true,
  aliquota_empresa_fixa NUMERIC DEFAULT 20,
  aliquota_sat_fixa NUMERIC DEFAULT 2,
  aliquota_terceiros_fixa NUMERIC DEFAULT 5.8,
  periodos_simples JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_ir_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  incidir_sobre_juros BOOLEAN DEFAULT false,
  cobrar_reclamado BOOLEAN DEFAULT false,
  tributacao_exclusiva_13 BOOLEAN DEFAULT true,
  tributacao_separada_ferias BOOLEAN DEFAULT false,
  deduzir_cs BOOLEAN DEFAULT true,
  deduzir_prev_privada BOOLEAN DEFAULT false,
  deduzir_pensao BOOLEAN DEFAULT false,
  deduzir_honorarios BOOLEAN DEFAULT false,
  aposentado_65 BOOLEAN DEFAULT false,
  dependentes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_correcao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  indice TEXT DEFAULT 'IPCA-E',
  epoca TEXT DEFAULT 'mensal',
  data_fixa TEXT,
  juros_tipo TEXT DEFAULT 'selic',
  juros_percentual NUMERIC DEFAULT 1,
  juros_inicio TEXT DEFAULT 'ajuizamento',
  multa_523 BOOLEAN DEFAULT false,
  multa_523_percentual NUMERIC DEFAULT 10,
  data_liquidacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_desemprego (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT false,
  parcelas INTEGER DEFAULT 5,
  valor_parcela NUMERIC,
  recebeu BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_honorarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_sucumbenciais BOOLEAN DEFAULT true,
  percentual_sucumbenciais NUMERIC DEFAULT 15,
  base_sucumbenciais TEXT DEFAULT 'condenacao',
  apurar_contratuais BOOLEAN DEFAULT false,
  percentual_contratuais NUMERIC DEFAULT 20,
  valor_fixo NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_custas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  percentual NUMERIC DEFAULT 2,
  valor_minimo NUMERIC DEFAULT 10.64,
  valor_maximo NUMERIC,
  isento BOOLEAN DEFAULT false,
  assistencia_judiciaria BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_liquidacao_resultado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  resultado JSONB NOT NULL,
  engine_version TEXT DEFAULT '1.0.0',
  data_liquidacao TEXT,
  total_bruto NUMERIC,
  total_liquido NUMERIC,
  total_reclamante NUMERIC,
  total_reclamada NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pjecalc_dados_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cartao_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_fgts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_ir_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_correcao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_custas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_liquidacao_resultado ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'pjecalc_dados_processo','pjecalc_cartao_ponto','pjecalc_fgts_config',
    'pjecalc_cs_config','pjecalc_ir_config','pjecalc_correcao_config',
    'pjecalc_seguro_desemprego','pjecalc_honorarios','pjecalc_custas',
    'pjecalc_liquidacao_resultado'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow authenticated full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END;
$$;


-- ── Migration: 20260227211523_478d366d-b046-440d-a8bd-25feb4ae7339.sql ──


-- Only create the two missing tables (cs_config already exists)

-- Case-level Custas config (if not already created by previous partial migration)
CREATE TABLE IF NOT EXISTS public.pjecalc_custas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT true,
  percentual numeric DEFAULT 2,
  valor_minimo numeric DEFAULT 10.64,
  valor_maximo numeric,
  isento boolean DEFAULT false,
  assistencia_judiciaria boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_custas_config' AND policyname = 'Allow authenticated full access on pjecalc_custas_config') THEN
    ALTER TABLE public.pjecalc_custas_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_custas_config" ON public.pjecalc_custas_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Case-level Seguro Desemprego config
CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT false,
  parcelas integer DEFAULT 5,
  valor_parcela numeric,
  recebeu boolean DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_seguro_config' AND policyname = 'Allow authenticated full access on pjecalc_seguro_config') THEN
    ALTER TABLE public.pjecalc_seguro_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_seguro_config" ON public.pjecalc_seguro_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ── Migration: 20260227215631_0156e511-6563-41eb-b043-55152c585755.sql ──


-- Step 1: Create audit/versioning infrastructure
CREATE TABLE IF NOT EXISTS public.reference_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'api',
  url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_sources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_sources') THEN
    CREATE POLICY "auth_manage_ref_sources" ON public.reference_sources FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  update_frequency text NOT NULL DEFAULT 'monthly',
  source_id uuid REFERENCES public.reference_sources(id),
  is_auto_importable boolean NOT NULL DEFAULT false,
  requires_manual_input boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ok',
  last_import_at timestamptz,
  last_import_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_table_registry ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_registry') THEN
    CREATE POLICY "auth_manage_registry" ON public.reference_table_registry FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'manual',
  result text NOT NULL DEFAULT 'pending',
  errors jsonb DEFAULT '[]'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  raw_file_path text,
  raw_file_hash text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_import_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_import_runs') THEN
    CREATE POLICY "auth_manage_import_runs" ON public.reference_import_runs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  competency_year int NOT NULL,
  competency_month int,
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  source_snapshot jsonb DEFAULT '{}'::jsonb,
  notes text,
  import_run_id uuid REFERENCES public.reference_import_runs(id)
);
ALTER TABLE public.reference_table_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_versions') THEN
    CREATE POLICY "auth_manage_versions" ON public.reference_table_versions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;


-- ── Migration: 20260227215738_145e56f7-a0e6-4f87-a985-c13d4171347b.sql ──


-- Step 2: Add version_id to existing tables + create missing tables + SQL functions

-- Add version_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_minimo' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_minimo ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_contribuicao_social' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_contribuicao_social ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_seguro_desemprego' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_seguro_desemprego ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_custas_judiciais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_custas_judiciais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_correcao_monetaria' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_correcao_monetaria ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_familia' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_familia ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
END$$;

-- Create missing domain tables
CREATE TABLE IF NOT EXISTS public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, tipo text NOT NULL DEFAULT 'principal',
  valor_tipo text NOT NULL DEFAULT 'calculado', caracteristica text NOT NULL DEFAULT 'comum',
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  incidencia_fgts boolean NOT NULL DEFAULT false, incidencia_cs boolean NOT NULL DEFAULT false,
  incidencia_irpf boolean NOT NULL DEFAULT false, regra_json jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true, version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_verbas_padrao' AND policyname = 'auth_manage_verbas_padrao') THEN
    CREATE POLICY "auth_manage_verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL, tipo text NOT NULL DEFAULT 'trabalhista',
  taxa_mensal numeric NOT NULL, acumulado numeric,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'read_juros') THEN
    CREATE POLICY "read_juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'auth_manage_juros') THEN
    CREATE POLICY "auth_manage_juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL UNIQUE,
  deducao_dependente numeric DEFAULT 0, deducao_aposentado_65 numeric DEFAULT 0,
  faixas jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'read_irrf') THEN
    CREATE POLICY "read_irrf" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'auth_manage_irrf') THEN
    CREATE POLICY "auth_manage_irrf" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL, nome text NOT NULL,
  scope text NOT NULL DEFAULT 'national', uf text, municipio text,
  municipio_ibge text, fonte text,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_feriados ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'read_feriados_pub') THEN
    CREATE POLICY "read_feriados_pub" ON public.pjecalc_feriados FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'auth_manage_feriados') THEN
    CREATE POLICY "auth_manage_feriados" ON public.pjecalc_feriados FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- Add version_id / fonte_doc / max_desconto_pct to existing tables if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'fonte_doc') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN fonte_doc text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'max_desconto_pct') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN max_desconto_pct numeric NOT NULL DEFAULT 6.00;
  END IF;
END$$;

-- SQL Functions
CREATE OR REPLACE FUNCTION public.get_reference_version(p_table_slug text, p_date date)
RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT id FROM reference_table_versions
  WHERE table_slug = p_table_slug AND status = 'published'
    AND ((competency_year = EXTRACT(YEAR FROM p_date)::int AND (competency_month IS NULL OR competency_month = EXTRACT(MONTH FROM p_date)::int))
      OR (valid_from IS NOT NULL AND valid_from <= p_date AND (valid_to IS NULL OR valid_to >= p_date)))
  ORDER BY competency_year DESC, competency_month DESC NULLS LAST LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calc_inss(p_base numeric, p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_faixas RECORD; v_total numeric := 0; v_restante numeric := p_base;
  v_competencia date; v_explain jsonb := '[]'::jsonb; v_faixa_anterior numeric := 0; v_contrib numeric; v_base_faixa numeric;
BEGIN
  SELECT competencia INTO v_competencia FROM pjecalc_contribuicao_social
  WHERE tipo = 'segurado_empregado' AND competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela INSS não encontrada'); END IF;
  FOR v_faixas IN SELECT faixa, valor_inicial, valor_final, aliquota FROM pjecalc_contribuicao_social
    WHERE tipo = 'segurado_empregado' AND competencia = v_competencia ORDER BY faixa LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_base_faixa := LEAST(v_restante, COALESCE(v_faixas.valor_final, v_restante) - v_faixa_anterior);
    IF v_base_faixa <= 0 THEN v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior); CONTINUE; END IF;
    v_contrib := ROUND(v_base_faixa * v_faixas.aliquota / 100, 2);
    v_total := v_total + v_contrib; v_restante := v_restante - v_base_faixa;
    v_explain := v_explain || jsonb_build_object('faixa', v_faixas.faixa, 'base', v_base_faixa, 'aliquota', v_faixas.aliquota, 'contribuicao', v_contrib);
    v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior);
  END LOOP;
  RETURN jsonb_build_object('valor', v_total, 'competencia_tabela', v_competencia, 'base', p_base, 'faixas_aplicadas', v_explain);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_irrf(p_base numeric, p_dependentes int DEFAULT 0, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_competencia date; v_deducao_dep numeric; v_faixas jsonb; v_faixa jsonb; v_base_calc numeric; v_imposto numeric := 0; i int;
BEGIN
  SELECT competencia, COALESCE(deducao_dependente,0), faixas INTO v_competencia, v_deducao_dep, v_faixas
  FROM pjecalc_imposto_renda WHERE competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela IRRF não encontrada'); END IF;
  v_base_calc := p_base - (v_deducao_dep * p_dependentes);
  IF v_base_calc <= 0 THEN RETURN jsonb_build_object('valor', 0, 'isento', true); END IF;
  FOR i IN 0..jsonb_array_length(v_faixas) - 1 LOOP
    v_faixa := v_faixas->i;
    IF v_base_calc >= (v_faixa->>'faixa_inicio')::numeric AND
       (v_faixa->>'faixa_fim' IS NULL OR v_base_calc <= (v_faixa->>'faixa_fim')::numeric) THEN
      v_imposto := ROUND(v_base_calc * (v_faixa->>'aliquota')::numeric - COALESCE((v_faixa->>'deducao')::numeric, 0), 2);
      RETURN jsonb_build_object('valor', GREATEST(v_imposto, 0), 'base_original', p_base, 'deducao_dependentes', v_deducao_dep * p_dependentes,
        'base_calc', v_base_calc, 'aliquota', (v_faixa->>'aliquota')::numeric, 'competencia_tabela', v_competencia);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('valor', 0, 'isento', true, 'base_calc', v_base_calc);
END;$$;

CREATE OR REPLACE FUNCTION public.apply_correction(p_value numeric, p_from_date date, p_to_date date, p_index text DEFAULT 'IPCA-E')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_factor numeric := 1; v_rec RECORD; v_months jsonb := '[]'::jsonb;
BEGIN
  FOR v_rec IN SELECT competencia, valor FROM pjecalc_correcao_monetaria
    WHERE indice = p_index AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
    v_factor := v_factor * (1 + v_rec.valor / 100);
    v_months := v_months || jsonb_build_object('competencia', v_rec.competencia, 'indice', v_rec.valor, 'fator_acumulado', v_factor);
  END LOOP;
  RETURN jsonb_build_object('valor_original', p_value, 'valor_corrigido', ROUND(p_value * v_factor, 2), 'fator_total', v_factor,
    'indice', p_index, 'periodo', jsonb_build_object('de', p_from_date, 'ate', p_to_date), 'meses_aplicados', jsonb_array_length(v_months), 'detalhes', v_months);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_juros(p_value numeric, p_from_date date, p_to_date date, p_rule text DEFAULT 'trabalhista')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_total_taxa numeric := 0; v_rec RECORD; v_meses int; v_details jsonb := '[]'::jsonb;
BEGIN
  IF p_rule = 'trabalhista' THEN
    v_meses := GREATEST(0, (EXTRACT(YEAR FROM p_to_date) - EXTRACT(YEAR FROM p_from_date)) * 12 + EXTRACT(MONTH FROM p_to_date) - EXTRACT(MONTH FROM p_from_date));
    v_total_taxa := v_meses * 1.0;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'meses', v_meses, 'regra', '1% a.m.');
  ELSE
    FOR v_rec IN SELECT competencia, taxa_mensal FROM pjecalc_juros_mora
      WHERE tipo = p_rule AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
      v_total_taxa := v_total_taxa + v_rec.taxa_mensal;
      v_details := v_details || jsonb_build_object('competencia', v_rec.competencia, 'taxa', v_rec.taxa_mensal);
    END LOOP;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'regra', p_rule, 'detalhes', v_details);
  END IF;
END;$$;

-- Seed registry
INSERT INTO public.reference_table_registry (slug, name, update_frequency, is_auto_importable, requires_manual_input, status) VALUES
  ('salario_minimo', 'Salário Mínimo', 'yearly', true, false, 'ok'),
  ('pisos_salariais', 'Pisos Salariais', 'ad-hoc', false, true, 'ok'),
  ('salario_familia', 'Salário-família', 'yearly', true, false, 'ok'),
  ('seguro_desemprego', 'Seguro-desemprego', 'yearly', true, false, 'ok'),
  ('vale_transporte', 'Vale-transporte', 'ad-hoc', false, true, 'ok'),
  ('feriados', 'Feriados', 'yearly', true, true, 'ok'),
  ('verbas', 'Verbas', 'ad-hoc', false, true, 'ok'),
  ('contribuicao_social', 'Contribuição Social (INSS)', 'yearly', true, false, 'ok'),
  ('imposto_renda', 'Imposto de Renda (IRRF)', 'yearly', true, false, 'ok'),
  ('custas_judiciais', 'Custas Judiciais', 'ad-hoc', true, true, 'ok'),
  ('correcao_monetaria', 'Correção Monetária', 'monthly', true, false, 'ok'),
  ('juros_mora', 'Juros de Mora', 'monthly', true, false, 'ok')
ON CONFLICT DO NOTHING;


-- ── Migration: 20260227221516_82989af1-23a2-4162-a8cd-41db8d52c8cb.sql ──


-- Multas CLT (Art. 467 e 477)
CREATE TABLE IF NOT EXISTS public.pjecalc_multas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar_467 BOOLEAN DEFAULT false,
  valor_467 NUMERIC DEFAULT 0,
  apurar_477 BOOLEAN DEFAULT false,
  valor_477_tipo TEXT DEFAULT 'salario',
  valor_477_informado NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Salário-Família config
CREATE TABLE IF NOT EXISTS public.pjecalc_salario_familia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  numero_filhos INT DEFAULT 0,
  filhos_detalhes JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pensão Alimentícia config
CREATE TABLE IF NOT EXISTS public.pjecalc_pensao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  percentual NUMERIC DEFAULT 0,
  valor_fixo NUMERIC,
  base TEXT DEFAULT 'liquido',
  beneficiario TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add case_id to existing verba_ocorrencias if missing
ALTER TABLE public.pjecalc_verba_ocorrencias ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE;


-- ── Migration: 20260227230010_4ca65e1f-5ee3-4015-8d2b-ae603cb984f7.sql ──


-- Tabela de faixas INSS versionadas por competência
CREATE TABLE public.pjecalc_inss_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_inss_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read inss_faixas" ON public.pjecalc_inss_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage inss_faixas" ON public.pjecalc_inss_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Tabela de faixas IR versionadas por competência
CREATE TABLE public.pjecalc_ir_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  deducao numeric NOT NULL DEFAULT 0,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_ir_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_ir_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_ir_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Seed INSS 2023
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2023-01-01', '2023-12-31', 1, 1320.00, 0.075),
('2023-01-01', '2023-12-31', 2, 2571.29, 0.09),
('2023-01-01', '2023-12-31', 3, 3856.94, 0.12),
('2023-01-01', '2023-12-31', 4, 7507.49, 0.14);

-- Seed INSS 2024
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2024-01-01', '2024-12-31', 1, 1412.00, 0.075),
('2024-01-01', '2024-12-31', 2, 2666.68, 0.09),
('2024-01-01', '2024-12-31', 3, 5999.54, 0.12),
('2024-01-01', '2024-12-31', 4, 7786.02, 0.14);

-- Seed INSS 2025
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, faixa, valor_ate, aliquota) VALUES
('2025-01-01', 1, 1518.00, 0.075),
('2025-01-01', 2, 2793.88, 0.09),
('2025-01-01', 3, 5839.45, 0.12),
('2025-01-01', 4, 8157.41, 0.14);

-- Seed IR 2023 (maio em diante)
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2023-05-01', '2023-12-31', 1, 2112.00, 0, 0, 189.59),
('2023-05-01', '2023-12-31', 2, 2826.65, 0.075, 158.40, 189.59),
('2023-05-01', '2023-12-31', 3, 3751.05, 0.15, 370.40, 189.59),
('2023-05-01', '2023-12-31', 4, 4664.68, 0.225, 651.73, 189.59),
('2023-05-01', '2023-12-31', 5, 999999999, 0.275, 884.96, 189.59);

-- Seed IR 2024
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2024-01-01', '2024-12-31', 1, 2259.20, 0, 0, 189.59),
('2024-01-01', '2024-12-31', 2, 2826.65, 0.075, 169.44, 189.59),
('2024-01-01', '2024-12-31', 3, 3751.05, 0.15, 381.44, 189.59),
('2024-01-01', '2024-12-31', 4, 4664.68, 0.225, 662.77, 189.59),
('2024-01-01', '2024-12-31', 5, 999999999, 0.275, 896.00, 189.59);

-- Seed IR 2025
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2025-01-01', 1, 2259.20, 0, 0, 189.59),
('2025-01-01', 2, 2826.65, 0.075, 169.44, 189.59),
('2025-01-01', 3, 3751.05, 0.15, 381.44, 189.59),
('2025-01-01', 4, 4664.68, 0.225, 662.77, 189.59),
('2025-01-01', 5, 999999999, 0.275, 896.00, 189.59);


-- ── Migration: 20260227231420_bf72cf20-aa32-4909-a4cd-ccca8bbe877a.sql ──


-- Coluna de status para fechar/reabrir cálculo
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberto';
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_em timestamptz;
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_por uuid;

-- Tabela de Previdência Privada
CREATE TABLE IF NOT EXISTS public.pjecalc_previdencia_privada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  percentual numeric NOT NULL DEFAULT 0,
  base_calculo text NOT NULL DEFAULT 'diferenca',
  deduzir_ir boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_previdencia_privada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prev_priv" ON public.pjecalc_previdencia_privada_config FOR SELECT USING (true);
CREATE POLICY "Auth can manage prev_priv" ON public.pjecalc_previdencia_privada_config FOR ALL USING (auth.role() = 'authenticated');

-- Configuração de colunas dinâmicas do cartão de ponto (por case)
CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_cartao_ponto_colunas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR SELECT USING (true);
CREATE POLICY "Auth can manage cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR ALL USING (auth.role() = 'authenticated');

-- Adicionar campo de dados dinâmicos extras ao cartão de ponto
ALTER TABLE public.pjecalc_cartao_ponto ADD COLUMN IF NOT EXISTS dados_extras jsonb DEFAULT '{}'::jsonb;


-- ── Migration: 20260227232433_7f53071e-311d-4f4e-9a3f-f5c52bb0ebfc.sql ──


CREATE TABLE IF NOT EXISTS public.pjecalc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  modulo text NOT NULL,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  justificativa text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON public.pjecalc_audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON public.pjecalc_audit_log FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  modulo text NOT NULL,
  tipo text DEFAULT 'observacao',
  texto text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs_all" ON public.pjecalc_observacoes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  evento text NOT NULL,
  modulo text,
  duracao_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metricas_all" ON public.pjecalc_metricas FOR ALL USING (true) WITH CHECK (true);

