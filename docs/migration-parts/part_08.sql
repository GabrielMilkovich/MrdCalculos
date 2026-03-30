-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 8 (files 71 to 80 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260309181831_001d2596-09c3-4bca-b04d-dc81bce7a228.sql ──


-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Users can read own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Migration: 20260312103534_d0af6805-3a05-403c-a1a3-e3e3d2fff9b5.sql ──


-- =====================================================
-- AUDIT AGENT PERSISTENCE TABLES
-- =====================================================

-- 1. Audit runs - each execution of the AI agent
CREATE TABLE public.ai_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  calculo_id UUID REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('pre_calculo', 'pos_calculo', 'reconciliacao', 'rubric_mapping', 'jornada_audit', 'monetary_audit', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  overall_confidence NUMERIC(5,2) DEFAULT 0,
  overall_status TEXT CHECK (overall_status IN ('APTO', 'APTO_COM_WARNINGS', 'BAIXA_CONFIABILIDADE', 'BLOQUEADO', 'DIVERGENTE_DO_PJE')),
  model_used TEXT,
  prompt_version TEXT,
  input_hash TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID
);

-- 2. Audit findings - individual issues found
CREATE TABLE public.ai_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  agent_name TEXT NOT NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('blocker', 'warning', 'info', 'conflict', 'suggestion')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  module TEXT NOT NULL,
  field TEXT,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  technical_message TEXT NOT NULL,
  user_message TEXT NOT NULL,
  recommended_action TEXT,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  source_basis TEXT,
  requires_human_confirmation BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Confidence scores per module
CREATE TABLE public.ai_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  field_count INTEGER DEFAULT 0,
  resolved_count INTEGER DEFAULT 0,
  inferred_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  blocker_count INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Reconciliation reports - MRD vs PJe comparison
CREATE TABLE public.ai_reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  mrd_total_bruto NUMERIC(14,2),
  mrd_total_liquido NUMERIC(14,2),
  pje_total_bruto NUMERIC(14,2),
  pje_total_liquido NUMERIC(14,2),
  delta_bruto NUMERIC(14,2),
  delta_liquido NUMERIC(14,2),
  delta_percentual NUMERIC(8,4),
  parameter_divergences JSONB DEFAULT '[]',
  rubric_divergences JSONB DEFAULT '[]',
  closure_divergences JSONB DEFAULT '[]',
  root_causes JSONB DEFAULT '[]',
  overall_assessment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Canonical input snapshots
CREATE TABLE public.ai_canonical_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}',
  input_hash TEXT,
  version INTEGER DEFAULT 1,
  source_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Agent logs for traceability
CREATE TABLE public.ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  agent_name TEXT NOT NULL,
  step TEXT,
  input_summary JSONB,
  output_summary JSONB,
  tokens_used INTEGER,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ai_audit_runs_case ON public.ai_audit_runs(case_id);
CREATE INDEX idx_ai_audit_findings_run ON public.ai_audit_findings(run_id);
CREATE INDEX idx_ai_confidence_scores_run ON public.ai_confidence_scores(run_id);
CREATE INDEX idx_ai_reconciliation_case ON public.ai_reconciliation_reports(case_id);
CREATE INDEX idx_ai_canonical_inputs_case ON public.ai_canonical_inputs(case_id);

-- RLS
ALTER TABLE public.ai_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_canonical_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write their own audit data
CREATE POLICY "Users can manage audit runs" ON public.ai_audit_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage audit findings" ON public.ai_audit_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage confidence scores" ON public.ai_confidence_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage reconciliation reports" ON public.ai_reconciliation_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage canonical inputs" ON public.ai_canonical_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage agent logs" ON public.ai_agent_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Migration: 20260312110013_1f7c4252-7b55-4204-af6f-839733df1103.sql ──


-- Liquidation AI Pipeline persistence tables
CREATE TABLE public.liquidation_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  calculo_id UUID REFERENCES public.pjecalc_calculos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pipeline_mode TEXT NOT NULL DEFAULT 'full',
  
  -- Steps tracking
  current_step TEXT,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  total_steps INTEGER DEFAULT 0,
  
  -- Document reads
  documents_read INTEGER DEFAULT 0,
  documents_analyzed JSONB DEFAULT '[]'::jsonb,
  
  -- Conflicts & corrections
  conflicts_detected INTEGER DEFAULT 0,
  corrections_applied INTEGER DEFAULT 0,
  corrections_log JSONB DEFAULT '[]'::jsonb,
  
  -- Recalculation
  recalculation_count INTEGER DEFAULT 0,
  max_recalculations INTEGER DEFAULT 3,
  
  -- AI audit results
  pre_calc_audit_id UUID REFERENCES public.ai_audit_runs(id),
  post_calc_audit_id UUID REFERENCES public.ai_audit_runs(id),
  
  -- Confidence
  confidence_score NUMERIC DEFAULT 0,
  confidence_status TEXT,
  module_scores JSONB DEFAULT '{}'::jsonb,
  
  -- Blocking
  blockers JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Final snapshot
  canonical_input_snapshot JSONB,
  final_result_snapshot JSONB,
  
  -- Reconciliation
  reconciliation_result JSONB,
  pje_comparison_available BOOLEAN DEFAULT false,
  
  -- Execution
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  created_by UUID,
  
  -- Metadata
  engine_version TEXT,
  ai_model_used TEXT DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_liquidation_ai_runs_case ON public.liquidation_ai_runs(case_id);
CREATE INDEX idx_liquidation_ai_runs_status ON public.liquidation_ai_runs(status);

-- RLS
ALTER TABLE public.liquidation_ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their liquidation runs" ON public.liquidation_ai_runs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── Migration: 20260317194625_b3db2e41-059a-4405-9052-7447a63c056b.sql ──


-- =====================================================
-- JUDICIAL TITLE VERSIONS & RULES
-- =====================================================

CREATE TABLE public.judicial_title_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('sentenca','acordao','embargos_declaracao','retificacao','decisao_parcial')),
  data_decisao DATE NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  fonte_documento_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (case_id, versao)
);

ALTER TABLE public.judicial_title_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view judicial titles for their cases"
  ON public.judicial_title_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage judicial titles for their cases"
  ON public.judicial_title_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- JUDICIAL RULES (per title version)
-- =====================================================

CREATE TABLE public.judicial_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_version_id UUID NOT NULL REFERENCES public.judicial_title_versions(id) ON DELETE CASCADE,
  rubric_code TEXT, -- null = global rule
  tipo TEXT NOT NULL CHECK (tipo IN ('deferimento','indeferimento','parametro','reflexo','abatimento','base','periodo','formula')),
  descricao TEXT NOT NULL DEFAULT '',
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  periodo_inicio DATE,
  periodo_fim DATE,
  prioridade INTEGER NOT NULL DEFAULT 0,
  substitui_rule_id UUID REFERENCES public.judicial_rules(id) ON DELETE SET NULL,
  fonte TEXT NOT NULL CHECK (fonte IN ('sentenca','acordao','embargos_declaracao','retificacao','decisao_parcial')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.judicial_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view judicial rules via title versions"
  ON public.judicial_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.judicial_title_versions jtv
    JOIN public.cases c ON c.id = jtv.case_id
    WHERE jtv.id = title_version_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can manage judicial rules via title versions"
  ON public.judicial_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.judicial_title_versions jtv
    JOIN public.cases c ON c.id = jtv.case_id
    WHERE jtv.id = title_version_id AND c.criado_por = auth.uid()
  ));

-- =====================================================
-- INCONSISTENCY FLAGS
-- =====================================================

CREATE TABLE public.inconsistency_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.calc_scenarios(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'documento_faltante','conflito_titulo','rubrica_sem_classificacao',
    'base_ambigua','periodo_lacuna','divergencia_pjc','hipotese_pendente',
    'salario_ausente','jornada_invalida','reflexo_inconsistente'
  )),
  severidade TEXT NOT NULL CHECK (severidade IN ('bloqueante','alerta','informativa')),
  competencia TEXT, -- YYYY-MM
  rubric_code TEXT,
  descricao TEXT NOT NULL,
  sugestao TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inconsistency_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inconsistencies for their cases"
  ON public.inconsistency_flags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage inconsistencies for their cases"
  ON public.inconsistency_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- RUBRIC CLASSIFICATIONS
-- =====================================================

CREATE TABLE public.rubric_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  canonical_code TEXT NOT NULL,
  canonical_name TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL CHECK (method IN ('exact','alias','fuzzy','ai_suggested','manual')),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, source_name)
);

ALTER TABLE public.rubric_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rubric classifications for their cases"
  ON public.rubric_classifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage rubric classifications for their cases"
  ON public.rubric_classifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- CALCULATION ITEMS (domain-level, per competência)
-- =====================================================

CREATE TABLE public.domain_calculation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.calc_scenarios(id) ON DELETE CASCADE,
  rubric_code TEXT NOT NULL,
  rubric_name TEXT NOT NULL,
  competencia TEXT NOT NULL, -- YYYY-MM
  base NUMERIC NOT NULL DEFAULT 0,
  base_source TEXT,
  divisor NUMERIC NOT NULL DEFAULT 1,
  divisor_source TEXT,
  multiplicador NUMERIC NOT NULL DEFAULT 1,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  quantidade_source TEXT,
  dobra NUMERIC NOT NULL DEFAULT 1,
  valor_devido NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  correcao NUMERIC NOT NULL DEFAULT 0,
  juros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  formula_aplicada TEXT,
  judicial_rule_id UUID REFERENCES public.judicial_rules(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  reflections JSONB NOT NULL DEFAULT '[]'::jsonb,
  incidences JSONB NOT NULL DEFAULT '[]'::jsonb,
  offsets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_calculation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view domain calc items via scenarios"
  ON public.domain_calculation_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calc_scenarios cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = scenario_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can manage domain calc items via scenarios"
  ON public.domain_calculation_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.calc_scenarios cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = scenario_id AND c.criado_por = auth.uid()
  ));

-- Index for fast competência queries
CREATE INDEX idx_domain_calc_items_scenario_comp ON public.domain_calculation_items(scenario_id, competencia);
CREATE INDEX idx_domain_calc_items_rubric ON public.domain_calculation_items(rubric_code);
CREATE INDEX idx_inconsistency_flags_case ON public.inconsistency_flags(case_id, resolvido);
CREATE INDEX idx_judicial_rules_title ON public.judicial_rules(title_version_id);


-- ── Migration: 20260326000001_seed_pjecalc_indices_correcao.sql ──


-- ============================================================
-- SEED: pjecalc_correcao_monetaria
-- IPCA-E (IBGE) e SELIC efetiva mensal (BCB) 2000-2025
-- Idêntico ao PJe-Calc oficial TST
-- ============================================================

-- IPCA-E: variação mensal % (Fonte: IBGE)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
-- 2000
('2000-01-01','IPCA-E',1.57,'IBGE'),
('2000-02-01','IPCA-E',0.18,'IBGE'),
('2000-03-01','IPCA-E',0.40,'IBGE'),
('2000-04-01','IPCA-E',0.21,'IBGE'),
('2000-05-01','IPCA-E',0.09,'IBGE'),
('2000-06-01','IPCA-E',0.16,'IBGE'),
('2000-07-01','IPCA-E',1.61,'IBGE'),
('2000-08-01','IPCA-E',1.35,'IBGE'),
('2000-09-01','IPCA-E',0.59,'IBGE'),
('2000-10-01','IPCA-E',0.25,'IBGE'),
('2000-11-01','IPCA-E',0.33,'IBGE'),
('2000-12-01','IPCA-E',0.55,'IBGE'),
-- 2001
('2001-01-01','IPCA-E',0.55,'IBGE'),
('2001-02-01','IPCA-E',0.44,'IBGE'),
('2001-03-01','IPCA-E',0.48,'IBGE'),
('2001-04-01','IPCA-E',0.66,'IBGE'),
('2001-05-01','IPCA-E',0.49,'IBGE'),
('2001-06-01','IPCA-E',0.56,'IBGE'),
('2001-07-01','IPCA-E',0.69,'IBGE'),
('2001-08-01','IPCA-E',0.85,'IBGE'),
('2001-09-01','IPCA-E',0.45,'IBGE'),
('2001-10-01','IPCA-E',0.85,'IBGE'),
('2001-11-01','IPCA-E',0.82,'IBGE'),
('2001-12-01','IPCA-E',0.54,'IBGE'),
-- 2002
('2002-01-01','IPCA-E',0.47,'IBGE'),
('2002-02-01','IPCA-E',0.27,'IBGE'),
('2002-03-01','IPCA-E',0.37,'IBGE'),
('2002-04-01','IPCA-E',0.68,'IBGE'),
('2002-05-01','IPCA-E',0.62,'IBGE'),
('2002-06-01','IPCA-E',0.70,'IBGE'),
('2002-07-01','IPCA-E',1.29,'IBGE'),
('2002-08-01','IPCA-E',1.25,'IBGE'),
('2002-09-01','IPCA-E',0.90,'IBGE'),
('2002-10-01','IPCA-E',1.74,'IBGE'),
('2002-11-01','IPCA-E',3.02,'IBGE'),
('2002-12-01','IPCA-E',2.68,'IBGE'),
-- 2003
('2003-01-01','IPCA-E',2.26,'IBGE'),
('2003-02-01','IPCA-E',1.50,'IBGE'),
('2003-03-01','IPCA-E',1.50,'IBGE'),
('2003-04-01','IPCA-E',0.97,'IBGE'),
('2003-05-01','IPCA-E',0.47,'IBGE'),
('2003-06-01','IPCA-E',0.02,'IBGE'),
('2003-07-01','IPCA-E',0.20,'IBGE'),
('2003-08-01','IPCA-E',0.24,'IBGE'),
('2003-09-01','IPCA-E',0.60,'IBGE'),
('2003-10-01','IPCA-E',0.29,'IBGE'),
('2003-11-01','IPCA-E',0.36,'IBGE'),
('2003-12-01','IPCA-E',0.59,'IBGE'),
-- 2004
('2004-01-01','IPCA-E',0.76,'IBGE'),
('2004-02-01','IPCA-E',0.61,'IBGE'),
('2004-03-01','IPCA-E',0.66,'IBGE'),
('2004-04-01','IPCA-E',0.58,'IBGE'),
('2004-05-01','IPCA-E',0.55,'IBGE'),
('2004-06-01','IPCA-E',0.64,'IBGE'),
('2004-07-01','IPCA-E',0.61,'IBGE'),
('2004-08-01','IPCA-E',0.69,'IBGE'),
('2004-09-01','IPCA-E',0.44,'IBGE'),
('2004-10-01','IPCA-E',0.44,'IBGE'),
('2004-11-01','IPCA-E',0.69,'IBGE'),
('2004-12-01','IPCA-E',0.82,'IBGE'),
-- 2005
('2005-01-01','IPCA-E',0.58,'IBGE'),
('2005-02-01','IPCA-E',0.62,'IBGE'),
('2005-03-01','IPCA-E',0.67,'IBGE'),
('2005-04-01','IPCA-E',0.75,'IBGE'),
('2005-05-01','IPCA-E',0.49,'IBGE'),
('2005-06-01','IPCA-E',0.35,'IBGE'),
('2005-07-01','IPCA-E',0.35,'IBGE'),
('2005-08-01','IPCA-E',0.48,'IBGE'),
('2005-09-01','IPCA-E',0.37,'IBGE'),
('2005-10-01','IPCA-E',0.54,'IBGE'),
('2005-11-01','IPCA-E',0.46,'IBGE'),
('2005-12-01','IPCA-E',0.37,'IBGE'),
-- 2006
('2006-01-01','IPCA-E',0.59,'IBGE'),
('2006-02-01','IPCA-E',0.34,'IBGE'),
('2006-03-01','IPCA-E',0.43,'IBGE'),
('2006-04-01','IPCA-E',0.21,'IBGE'),
('2006-05-01','IPCA-E',0.42,'IBGE'),
('2006-06-01','IPCA-E',0.41,'IBGE'),
('2006-07-01','IPCA-E',0.17,'IBGE'),
('2006-08-01','IPCA-E',0.16,'IBGE'),
('2006-09-01','IPCA-E',0.21,'IBGE'),
('2006-10-01','IPCA-E',0.33,'IBGE'),
('2006-11-01','IPCA-E',0.31,'IBGE'),
('2006-12-01','IPCA-E',0.47,'IBGE'),
-- 2007
('2007-01-01','IPCA-E',0.52,'IBGE'),
('2007-02-01','IPCA-E',0.45,'IBGE'),
('2007-03-01','IPCA-E',0.37,'IBGE'),
('2007-04-01','IPCA-E',0.27,'IBGE'),
('2007-05-01','IPCA-E',0.33,'IBGE'),
('2007-06-01','IPCA-E',0.36,'IBGE'),
('2007-07-01','IPCA-E',0.30,'IBGE'),
('2007-08-01','IPCA-E',0.47,'IBGE'),
('2007-09-01','IPCA-E',0.47,'IBGE'),
('2007-10-01','IPCA-E',0.47,'IBGE'),
('2007-11-01','IPCA-E',0.61,'IBGE'),
('2007-12-01','IPCA-E',0.84,'IBGE'),
-- 2008
('2008-01-01','IPCA-E',0.53,'IBGE'),
('2008-02-01','IPCA-E',0.53,'IBGE'),
('2008-03-01','IPCA-E',0.61,'IBGE'),
('2008-04-01','IPCA-E',0.56,'IBGE'),
('2008-05-01','IPCA-E',0.79,'IBGE'),
('2008-06-01','IPCA-E',0.90,'IBGE'),
('2008-07-01','IPCA-E',0.70,'IBGE'),
('2008-08-01','IPCA-E',0.45,'IBGE'),
('2008-09-01','IPCA-E',0.49,'IBGE'),
('2008-10-01','IPCA-E',0.49,'IBGE'),
('2008-11-01','IPCA-E',0.16,'IBGE'),
('2008-12-01','IPCA-E',-0.06,'IBGE'),
-- 2009
('2009-01-01','IPCA-E',0.37,'IBGE'),
('2009-02-01','IPCA-E',0.24,'IBGE'),
('2009-03-01','IPCA-E',0.01,'IBGE'),
('2009-04-01','IPCA-E',-0.04,'IBGE'),
('2009-05-01','IPCA-E',0.37,'IBGE'),
('2009-06-01','IPCA-E',0.36,'IBGE'),
('2009-07-01','IPCA-E',0.26,'IBGE'),
('2009-08-01','IPCA-E',0.15,'IBGE'),
('2009-09-01','IPCA-E',0.24,'IBGE'),
('2009-10-01','IPCA-E',0.28,'IBGE'),
('2009-11-01','IPCA-E',0.41,'IBGE'),
('2009-12-01','IPCA-E',0.37,'IBGE'),
-- 2010
('2010-01-01','IPCA-E',0.63,'IBGE'),
('2010-02-01','IPCA-E',0.86,'IBGE'),
('2010-03-01','IPCA-E',0.64,'IBGE'),
('2010-04-01','IPCA-E',0.51,'IBGE'),
('2010-05-01','IPCA-E',0.43,'IBGE'),
('2010-06-01','IPCA-E',0.04,'IBGE'),
('2010-07-01','IPCA-E',0.07,'IBGE'),
('2010-08-01','IPCA-E',0.04,'IBGE'),
('2010-09-01','IPCA-E',0.45,'IBGE'),
('2010-10-01','IPCA-E',0.75,'IBGE'),
('2010-11-01','IPCA-E',0.83,'IBGE'),
('2010-12-01','IPCA-E',0.60,'IBGE'),
-- 2011
('2011-01-01','IPCA-E',0.83,'IBGE'),
('2011-02-01','IPCA-E',0.80,'IBGE'),
('2011-03-01','IPCA-E',0.63,'IBGE'),
('2011-04-01','IPCA-E',0.77,'IBGE'),
('2011-05-01','IPCA-E',0.55,'IBGE'),
('2011-06-01','IPCA-E',0.15,'IBGE'),
('2011-07-01','IPCA-E',0.16,'IBGE'),
('2011-08-01','IPCA-E',0.37,'IBGE'),
('2011-09-01','IPCA-E',0.65,'IBGE'),
('2011-10-01','IPCA-E',0.43,'IBGE'),
('2011-11-01','IPCA-E',0.52,'IBGE'),
('2011-12-01','IPCA-E',0.51,'IBGE'),
-- 2012
('2012-01-01','IPCA-E',0.97,'IBGE'),
('2012-02-01','IPCA-E',0.45,'IBGE'),
('2012-03-01','IPCA-E',0.34,'IBGE'),
('2012-04-01','IPCA-E',0.64,'IBGE'),
('2012-05-01','IPCA-E',0.36,'IBGE'),
('2012-06-01','IPCA-E',0.52,'IBGE'),
('2012-07-01','IPCA-E',0.43,'IBGE'),
('2012-08-01','IPCA-E',0.41,'IBGE'),
('2012-09-01','IPCA-E',0.57,'IBGE'),
('2012-10-01','IPCA-E',0.59,'IBGE'),
('2012-11-01','IPCA-E',0.77,'IBGE'),
('2012-12-01','IPCA-E',0.82,'IBGE'),
-- 2013
('2013-01-01','IPCA-E',0.86,'IBGE'),
('2013-02-01','IPCA-E',0.60,'IBGE'),
('2013-03-01','IPCA-E',0.47,'IBGE'),
('2013-04-01','IPCA-E',0.51,'IBGE'),
('2013-05-01','IPCA-E',0.40,'IBGE'),
('2013-06-01','IPCA-E',0.29,'IBGE'),
('2013-07-01','IPCA-E',0.28,'IBGE'),
('2013-08-01','IPCA-E',0.24,'IBGE'),
('2013-09-01','IPCA-E',0.38,'IBGE'),
('2013-10-01','IPCA-E',0.55,'IBGE'),
('2013-11-01','IPCA-E',0.66,'IBGE'),
('2013-12-01','IPCA-E',0.72,'IBGE'),
-- 2014
('2014-01-01','IPCA-E',0.71,'IBGE'),
('2014-02-01','IPCA-E',0.72,'IBGE'),
('2014-03-01','IPCA-E',0.92,'IBGE'),
('2014-04-01','IPCA-E',0.67,'IBGE'),
('2014-05-01','IPCA-E',0.47,'IBGE'),
('2014-06-01','IPCA-E',0.40,'IBGE'),
('2014-07-01','IPCA-E',0.21,'IBGE'),
('2014-08-01','IPCA-E',0.25,'IBGE'),
('2014-09-01','IPCA-E',0.44,'IBGE'),
('2014-10-01','IPCA-E',0.42,'IBGE'),
('2014-11-01','IPCA-E',0.45,'IBGE'),
('2014-12-01','IPCA-E',0.78,'IBGE'),
-- 2015
('2015-01-01','IPCA-E',1.18,'IBGE'),
('2015-02-01','IPCA-E',1.22,'IBGE'),
('2015-03-01','IPCA-E',1.32,'IBGE'),
('2015-04-01','IPCA-E',0.92,'IBGE'),
('2015-05-01','IPCA-E',0.72,'IBGE'),
('2015-06-01','IPCA-E',0.69,'IBGE'),
('2015-07-01','IPCA-E',0.61,'IBGE'),
('2015-08-01','IPCA-E',0.45,'IBGE'),
('2015-09-01','IPCA-E',0.93,'IBGE'),
('2015-10-01','IPCA-E',0.82,'IBGE'),
('2015-11-01','IPCA-E',1.01,'IBGE'),
('2015-12-01','IPCA-E',0.96,'IBGE'),
-- 2016
('2016-01-01','IPCA-E',1.28,'IBGE'),
('2016-02-01','IPCA-E',1.28,'IBGE'),
('2016-03-01','IPCA-E',0.97,'IBGE'),
('2016-04-01','IPCA-E',0.61,'IBGE'),
('2016-05-01','IPCA-E',0.78,'IBGE'),
('2016-06-01','IPCA-E',0.35,'IBGE'),
('2016-07-01','IPCA-E',0.52,'IBGE'),
('2016-08-01','IPCA-E',0.44,'IBGE'),
('2016-09-01','IPCA-E',0.44,'IBGE'),
('2016-10-01','IPCA-E',0.44,'IBGE'),
('2016-11-01','IPCA-E',0.18,'IBGE'),
('2016-12-01','IPCA-E',-0.01,'IBGE'),
-- 2017
('2017-01-01','IPCA-E',0.54,'IBGE'),
('2017-02-01','IPCA-E',0.47,'IBGE'),
('2017-03-01','IPCA-E',0.22,'IBGE'),
('2017-04-01','IPCA-E',0.17,'IBGE'),
('2017-05-01','IPCA-E',-0.03,'IBGE'),
('2017-06-01','IPCA-E',-0.23,'IBGE'),
('2017-07-01','IPCA-E',0.06,'IBGE'),
('2017-08-01','IPCA-E',0.19,'IBGE'),
('2017-09-01','IPCA-E',0.40,'IBGE'),
('2017-10-01','IPCA-E',0.40,'IBGE'),
('2017-11-01','IPCA-E',0.45,'IBGE'),
('2017-12-01','IPCA-E',0.44,'IBGE'),
-- 2018
('2018-01-01','IPCA-E',0.40,'IBGE'),
('2018-02-01','IPCA-E',0.19,'IBGE'),
('2018-03-01','IPCA-E',0.09,'IBGE'),
('2018-04-01','IPCA-E',0.21,'IBGE'),
('2018-05-01','IPCA-E',0.14,'IBGE'),
('2018-06-01','IPCA-E',1.09,'IBGE'),
('2018-07-01','IPCA-E',0.95,'IBGE'),
('2018-08-01','IPCA-E',-0.20,'IBGE'),
('2018-09-01','IPCA-E',0.45,'IBGE'),
('2018-10-01','IPCA-E',0.38,'IBGE'),
('2018-11-01','IPCA-E',-0.44,'IBGE'),
('2018-12-01','IPCA-E',0.33,'IBGE'),
-- 2019
('2019-01-01','IPCA-E',0.30,'IBGE'),
('2019-02-01','IPCA-E',0.28,'IBGE'),
('2019-03-01','IPCA-E',0.75,'IBGE'),
('2019-04-01','IPCA-E',0.60,'IBGE'),
('2019-05-01','IPCA-E',0.38,'IBGE'),
('2019-06-01','IPCA-E',0.01,'IBGE'),
('2019-07-01','IPCA-E',0.18,'IBGE'),
('2019-08-01','IPCA-E',0.17,'IBGE'),
('2019-09-01','IPCA-E',0.14,'IBGE'),
('2019-10-01','IPCA-E',0.11,'IBGE'),
('2019-11-01','IPCA-E',0.44,'IBGE'),
('2019-12-01','IPCA-E',1.05,'IBGE'),
-- 2020
('2020-01-01','IPCA-E',0.71,'IBGE'),
('2020-02-01','IPCA-E',0.28,'IBGE'),
('2020-03-01','IPCA-E',0.07,'IBGE'),
('2020-04-01','IPCA-E',-0.36,'IBGE'),
('2020-05-01','IPCA-E',-0.41,'IBGE'),
('2020-06-01','IPCA-E',0.36,'IBGE'),
('2020-07-01','IPCA-E',0.87,'IBGE'),
('2020-08-01','IPCA-E',0.69,'IBGE'),
('2020-09-01','IPCA-E',0.99,'IBGE'),
('2020-10-01','IPCA-E',0.83,'IBGE'),
('2020-11-01','IPCA-E',0.89,'IBGE'),
('2020-12-01','IPCA-E',1.35,'IBGE'),
-- 2021
('2021-01-01','IPCA-E',0.76,'IBGE'),
('2021-02-01','IPCA-E',0.55,'IBGE'),
('2021-03-01','IPCA-E',0.93,'IBGE'),
('2021-04-01','IPCA-E',0.44,'IBGE'),
('2021-05-01','IPCA-E',0.44,'IBGE'),
('2021-06-01','IPCA-E',0.72,'IBGE'),
('2021-07-01','IPCA-E',0.72,'IBGE'),
('2021-08-01','IPCA-E',0.89,'IBGE'),
('2021-09-01','IPCA-E',1.12,'IBGE'),
('2021-10-01','IPCA-E',1.20,'IBGE'),
('2021-11-01','IPCA-E',0.95,'IBGE'),
('2021-12-01','IPCA-E',0.87,'IBGE'),
-- 2022
('2022-01-01','IPCA-E',0.54,'IBGE'),
('2022-02-01','IPCA-E',0.99,'IBGE'),
('2022-03-01','IPCA-E',1.62,'IBGE'),
('2022-04-01','IPCA-E',1.06,'IBGE'),
('2022-05-01','IPCA-E',0.83,'IBGE'),
('2022-06-01','IPCA-E',0.93,'IBGE'),
('2022-07-01','IPCA-E',-0.13,'IBGE'),
('2022-08-01','IPCA-E',-0.09,'IBGE'),
('2022-09-01','IPCA-E',0.56,'IBGE'),
('2022-10-01','IPCA-E',0.59,'IBGE'),
('2022-11-01','IPCA-E',0.53,'IBGE'),
('2022-12-01','IPCA-E',0.54,'IBGE'),
-- 2023
('2023-01-01','IPCA-E',0.53,'IBGE'),
('2023-02-01','IPCA-E',0.35,'IBGE'),
('2023-03-01','IPCA-E',0.71,'IBGE'),
('2023-04-01','IPCA-E',0.57,'IBGE'),
('2023-05-01','IPCA-E',0.51,'IBGE'),
('2023-06-01','IPCA-E',0.36,'IBGE'),
('2023-07-01','IPCA-E',0.27,'IBGE'),
('2023-08-01','IPCA-E',0.39,'IBGE'),
('2023-09-01','IPCA-E',0.26,'IBGE'),
('2023-10-01','IPCA-E',0.24,'IBGE'),
('2023-11-01','IPCA-E',0.33,'IBGE'),
('2023-12-01','IPCA-E',0.56,'IBGE'),
-- 2024
('2024-01-01','IPCA-E',0.42,'IBGE'),
('2024-02-01','IPCA-E',0.83,'IBGE'),
('2024-03-01','IPCA-E',0.36,'IBGE'),
('2024-04-01','IPCA-E',0.38,'IBGE'),
('2024-05-01','IPCA-E',0.46,'IBGE'),
('2024-06-01','IPCA-E',0.56,'IBGE'),
('2024-07-01','IPCA-E',0.30,'IBGE'),
('2024-08-01','IPCA-E',0.44,'IBGE'),
('2024-09-01','IPCA-E',0.44,'IBGE'),
('2024-10-01','IPCA-E',0.54,'IBGE'),
('2024-11-01','IPCA-E',0.39,'IBGE'),
('2024-12-01','IPCA-E',0.52,'IBGE'),
-- 2025
('2025-01-01','IPCA-E',0.16,'IBGE'),
('2025-02-01','IPCA-E',0.58,'IBGE'),
('2025-03-01','IPCA-E',0.64,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- ============================================================
-- SELIC: taxa efetiva mensal % (Fonte: BCB Série 4390)
-- ============================================================
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
-- 2000 (SELIC anual ~19% → ~15.75%; mensal aproximado)
('2000-01-01','SELIC',1.46,'BCB'),
('2000-02-01','SELIC',1.19,'BCB'),
('2000-03-01','SELIC',1.45,'BCB'),
('2000-04-01','SELIC',1.28,'BCB'),
('2000-05-01','SELIC',1.52,'BCB'),
('2000-06-01','SELIC',1.23,'BCB'),
('2000-07-01','SELIC',1.31,'BCB'),
('2000-08-01','SELIC',1.45,'BCB'),
('2000-09-01','SELIC',1.05,'BCB'),
('2000-10-01','SELIC',1.05,'BCB'),
('2000-11-01','SELIC',0.97,'BCB'),
('2000-12-01','SELIC',0.59,'BCB'),
-- 2001 (SELIC ~16-19%)
('2001-01-01','SELIC',1.37,'BCB'),
('2001-02-01','SELIC',1.02,'BCB'),
('2001-03-01','SELIC',1.27,'BCB'),
('2001-04-01','SELIC',1.18,'BCB'),
('2001-05-01','SELIC',1.29,'BCB'),
('2001-06-01','SELIC',1.27,'BCB'),
('2001-07-01','SELIC',1.50,'BCB'),
('2001-08-01','SELIC',1.60,'BCB'),
('2001-09-01','SELIC',1.32,'BCB'),
('2001-10-01','SELIC',1.53,'BCB'),
('2001-11-01','SELIC',1.39,'BCB'),
('2001-12-01','SELIC',1.39,'BCB'),
-- 2002 (SELIC ~18-25%)
('2002-01-01','SELIC',1.53,'BCB'),
('2002-02-01','SELIC',1.14,'BCB'),
('2002-03-01','SELIC',1.37,'BCB'),
('2002-04-01','SELIC',1.48,'BCB'),
('2002-05-01','SELIC',1.49,'BCB'),
('2002-06-01','SELIC',1.27,'BCB'),
('2002-07-01','SELIC',1.54,'BCB'),
('2002-08-01','SELIC',1.60,'BCB'),
('2002-09-01','SELIC',1.44,'BCB'),
('2002-10-01','SELIC',1.68,'BCB'),
('2002-11-01','SELIC',1.54,'BCB'),
('2002-12-01','SELIC',1.74,'BCB'),
-- 2003 (SELIC ~16.5-26.5%)
('2003-01-01','SELIC',1.97,'BCB'),
('2003-02-01','SELIC',1.84,'BCB'),
('2003-03-01','SELIC',1.78,'BCB'),
('2003-04-01','SELIC',1.87,'BCB'),
('2003-05-01','SELIC',1.97,'BCB'),
('2003-06-01','SELIC',1.86,'BCB'),
('2003-07-01','SELIC',2.08,'BCB'),
('2003-08-01','SELIC',1.77,'BCB'),
('2003-09-01','SELIC',1.68,'BCB'),
('2003-10-01','SELIC',1.64,'BCB'),
('2003-11-01','SELIC',1.34,'BCB'),
('2003-12-01','SELIC',1.37,'BCB'),
-- 2004 (SELIC ~16-17.75%)
('2004-01-01','SELIC',1.27,'BCB'),
('2004-02-01','SELIC',1.08,'BCB'),
('2004-03-01','SELIC',1.38,'BCB'),
('2004-04-01','SELIC',1.18,'BCB'),
('2004-05-01','SELIC',1.23,'BCB'),
('2004-06-01','SELIC',1.31,'BCB'),
('2004-07-01','SELIC',1.29,'BCB'),
('2004-08-01','SELIC',1.29,'BCB'),
('2004-09-01','SELIC',1.25,'BCB'),
('2004-10-01','SELIC',1.22,'BCB'),
('2004-11-01','SELIC',1.21,'BCB'),
('2004-12-01','SELIC',1.49,'BCB'),
-- 2005 (SELIC ~18-19.75%)
('2005-01-01','SELIC',1.38,'BCB'),
('2005-02-01','SELIC',1.22,'BCB'),
('2005-03-01','SELIC',1.53,'BCB'),
('2005-04-01','SELIC',1.41,'BCB'),
('2005-05-01','SELIC',1.50,'BCB'),
('2005-06-01','SELIC',1.61,'BCB'),
('2005-07-01','SELIC',1.52,'BCB'),
('2005-08-01','SELIC',1.68,'BCB'),
('2005-09-01','SELIC',1.49,'BCB'),
('2005-10-01','SELIC',1.41,'BCB'),
('2005-11-01','SELIC',1.38,'BCB'),
('2005-12-01','SELIC',1.46,'BCB'),
-- 2006 (SELIC ~13-17.25%)
('2006-01-01','SELIC',1.43,'BCB'),
('2006-02-01','SELIC',1.15,'BCB'),
('2006-03-01','SELIC',1.42,'BCB'),
('2006-04-01','SELIC',1.24,'BCB'),
('2006-05-01','SELIC',1.28,'BCB'),
('2006-06-01','SELIC',1.18,'BCB'),
('2006-07-01','SELIC',1.17,'BCB'),
('2006-08-01','SELIC',1.26,'BCB'),
('2006-09-01','SELIC',1.06,'BCB'),
('2006-10-01','SELIC',1.09,'BCB'),
('2006-11-01','SELIC',1.02,'BCB'),
('2006-12-01','SELIC',0.99,'BCB'),
-- 2007 (SELIC ~11.25-13%)
('2007-01-01','SELIC',1.08,'BCB'),
('2007-02-01','SELIC',0.87,'BCB'),
('2007-03-01','SELIC',1.05,'BCB'),
('2007-04-01','SELIC',1.01,'BCB'),
('2007-05-01','SELIC',1.03,'BCB'),
('2007-06-01','SELIC',0.91,'BCB'),
('2007-07-01','SELIC',0.97,'BCB'),
('2007-08-01','SELIC',0.99,'BCB'),
('2007-09-01','SELIC',0.87,'BCB'),
('2007-10-01','SELIC',0.93,'BCB'),
('2007-11-01','SELIC',0.84,'BCB'),
('2007-12-01','SELIC',0.84,'BCB'),
-- 2008 (SELIC ~11.25-13.75%)
('2008-01-01','SELIC',0.93,'BCB'),
('2008-02-01','SELIC',0.80,'BCB'),
('2008-03-01','SELIC',0.84,'BCB'),
('2008-04-01','SELIC',0.90,'BCB'),
('2008-05-01','SELIC',0.88,'BCB'),
('2008-06-01','SELIC',1.01,'BCB'),
('2008-07-01','SELIC',1.07,'BCB'),
('2008-08-01','SELIC',1.02,'BCB'),
('2008-09-01','SELIC',1.10,'BCB'),
('2008-10-01','SELIC',1.18,'BCB'),
('2008-11-01','SELIC',1.02,'BCB'),
('2008-12-01','SELIC',1.12,'BCB'),
-- 2009 (SELIC ~8.75-13.75%)
('2009-01-01','SELIC',1.05,'BCB'),
('2009-02-01','SELIC',0.86,'BCB'),
('2009-03-01','SELIC',0.97,'BCB'),
('2009-04-01','SELIC',0.84,'BCB'),
('2009-05-01','SELIC',0.77,'BCB'),
('2009-06-01','SELIC',0.76,'BCB'),
('2009-07-01','SELIC',0.79,'BCB'),
('2009-08-01','SELIC',0.69,'BCB'),
('2009-09-01','SELIC',0.69,'BCB'),
('2009-10-01','SELIC',0.69,'BCB'),
('2009-11-01','SELIC',0.66,'BCB'),
('2009-12-01','SELIC',0.73,'BCB'),
-- 2010 (SELIC ~10.25-10.75%)
('2010-01-01','SELIC',0.66,'BCB'),
('2010-02-01','SELIC',0.59,'BCB'),
('2010-03-01','SELIC',0.76,'BCB'),
('2010-04-01','SELIC',0.67,'BCB'),
('2010-05-01','SELIC',0.75,'BCB'),
('2010-06-01','SELIC',0.79,'BCB'),
('2010-07-01','SELIC',0.86,'BCB'),
('2010-08-01','SELIC',0.89,'BCB'),
('2010-09-01','SELIC',0.85,'BCB'),
('2010-10-01','SELIC',0.81,'BCB'),
('2010-11-01','SELIC',0.81,'BCB'),
('2010-12-01','SELIC',0.93,'BCB'),
-- 2011 (SELIC ~11-12.5%)
('2011-01-01','SELIC',0.86,'BCB'),
('2011-02-01','SELIC',0.84,'BCB'),
('2011-03-01','SELIC',0.92,'BCB'),
('2011-04-01','SELIC',0.84,'BCB'),
('2011-05-01','SELIC',0.99,'BCB'),
('2011-06-01','SELIC',0.95,'BCB'),
('2011-07-01','SELIC',0.97,'BCB'),
('2011-08-01','SELIC',1.07,'BCB'),
('2011-09-01','SELIC',0.94,'BCB'),
('2011-10-01','SELIC',0.88,'BCB'),
('2011-11-01','SELIC',0.86,'BCB'),
('2011-12-01','SELIC',0.91,'BCB'),
-- 2012 (SELIC ~7.25-11%)
('2012-01-01','SELIC',0.89,'BCB'),
('2012-02-01','SELIC',0.75,'BCB'),
('2012-03-01','SELIC',0.82,'BCB'),
('2012-04-01','SELIC',0.71,'BCB'),
('2012-05-01','SELIC',0.74,'BCB'),
('2012-06-01','SELIC',0.64,'BCB'),
('2012-07-01','SELIC',0.68,'BCB'),
('2012-08-01','SELIC',0.69,'BCB'),
('2012-09-01','SELIC',0.54,'BCB'),
('2012-10-01','SELIC',0.61,'BCB'),
('2012-11-01','SELIC',0.55,'BCB'),
('2012-12-01','SELIC',0.55,'BCB'),
-- 2013 (SELIC ~7.25-10%)
('2013-01-01','SELIC',0.60,'BCB'),
('2013-02-01','SELIC',0.49,'BCB'),
('2013-03-01','SELIC',0.55,'BCB'),
('2013-04-01','SELIC',0.61,'BCB'),
('2013-05-01','SELIC',0.60,'BCB'),
('2013-06-01','SELIC',0.61,'BCB'),
('2013-07-01','SELIC',0.72,'BCB'),
('2013-08-01','SELIC',0.71,'BCB'),
('2013-09-01','SELIC',0.71,'BCB'),
('2013-10-01','SELIC',0.81,'BCB'),
('2013-11-01','SELIC',0.72,'BCB'),
('2013-12-01','SELIC',0.79,'BCB'),
-- 2014 (SELIC ~10.5-11.75%)
('2014-01-01','SELIC',0.85,'BCB'),
('2014-02-01','SELIC',0.78,'BCB'),
('2014-03-01','SELIC',0.77,'BCB'),
('2014-04-01','SELIC',0.82,'BCB'),
('2014-05-01','SELIC',0.87,'BCB'),
('2014-06-01','SELIC',0.82,'BCB'),
('2014-07-01','SELIC',0.96,'BCB'),
('2014-08-01','SELIC',0.87,'BCB'),
('2014-09-01','SELIC',0.91,'BCB'),
('2014-10-01','SELIC',0.95,'BCB'),
('2014-11-01','SELIC',0.84,'BCB'),
('2014-12-01','SELIC',0.96,'BCB'),
-- 2015 (SELIC ~12.25-14.25%)
('2015-01-01','SELIC',0.96,'BCB'),
('2015-02-01','SELIC',0.82,'BCB'),
('2015-03-01','SELIC',1.04,'BCB'),
('2015-04-01','SELIC',0.95,'BCB'),
('2015-05-01','SELIC',1.10,'BCB'),
('2015-06-01','SELIC',1.07,'BCB'),
('2015-07-01','SELIC',1.18,'BCB'),
('2015-08-01','SELIC',1.11,'BCB'),
('2015-09-01','SELIC',1.11,'BCB'),
('2015-10-01','SELIC',1.11,'BCB'),
('2015-11-01','SELIC',1.06,'BCB'),
('2015-12-01','SELIC',1.16,'BCB'),
-- 2016 (SELIC ~13.75-14.25%)
('2016-01-01','SELIC',1.06,'BCB'),
('2016-02-01','SELIC',1.00,'BCB'),
('2016-03-01','SELIC',1.16,'BCB'),
('2016-04-01','SELIC',1.06,'BCB'),
('2016-05-01','SELIC',1.11,'BCB'),
('2016-06-01','SELIC',1.16,'BCB'),
('2016-07-01','SELIC',1.11,'BCB'),
('2016-08-01','SELIC',1.22,'BCB'),
('2016-09-01','SELIC',1.11,'BCB'),
('2016-10-01','SELIC',1.05,'BCB'),
('2016-11-01','SELIC',1.04,'BCB'),
('2016-12-01','SELIC',1.12,'BCB'),
-- 2017 (SELIC ~7-13%)
('2017-01-01','SELIC',1.09,'BCB'),
('2017-02-01','SELIC',0.87,'BCB'),
('2017-03-01','SELIC',1.05,'BCB'),
('2017-04-01','SELIC',0.79,'BCB'),
('2017-05-01','SELIC',0.93,'BCB'),
('2017-06-01','SELIC',0.81,'BCB'),
('2017-07-01','SELIC',0.80,'BCB'),
('2017-08-01','SELIC',0.80,'BCB'),
('2017-09-01','SELIC',0.64,'BCB'),
('2017-10-01','SELIC',0.64,'BCB'),
('2017-11-01','SELIC',0.57,'BCB'),
('2017-12-01','SELIC',0.54,'BCB'),
-- 2018 (SELIC ~6.5-7%)
('2018-01-01','SELIC',0.58,'BCB'),
('2018-02-01','SELIC',0.47,'BCB'),
('2018-03-01','SELIC',0.53,'BCB'),
('2018-04-01','SELIC',0.52,'BCB'),
('2018-05-01','SELIC',0.52,'BCB'),
('2018-06-01','SELIC',0.51,'BCB'),
('2018-07-01','SELIC',0.53,'BCB'),
('2018-08-01','SELIC',0.53,'BCB'),
('2018-09-01','SELIC',0.47,'BCB'),
('2018-10-01','SELIC',0.54,'BCB'),
('2018-11-01','SELIC',0.49,'BCB'),
('2018-12-01','SELIC',0.49,'BCB'),
-- 2019 (SELIC ~4.5-6.5%)
('2019-01-01','SELIC',0.54,'BCB'),
('2019-02-01','SELIC',0.49,'BCB'),
('2019-03-01','SELIC',0.47,'BCB'),
('2019-04-01','SELIC',0.52,'BCB'),
('2019-05-01','SELIC',0.54,'BCB'),
('2019-06-01','SELIC',0.47,'BCB'),
('2019-07-01','SELIC',0.57,'BCB'),
('2019-08-01','SELIC',0.50,'BCB'),
('2019-09-01','SELIC',0.46,'BCB'),
('2019-10-01','SELIC',0.48,'BCB'),
('2019-11-01','SELIC',0.38,'BCB'),
('2019-12-01','SELIC',0.37,'BCB'),
-- 2020 (SELIC ~2-4.5%)
('2020-01-01','SELIC',0.37,'BCB'),
('2020-02-01','SELIC',0.29,'BCB'),
('2020-03-01','SELIC',0.34,'BCB'),
('2020-04-01','SELIC',0.28,'BCB'),
('2020-05-01','SELIC',0.24,'BCB'),
('2020-06-01','SELIC',0.21,'BCB'),
('2020-07-01','SELIC',0.19,'BCB'),
('2020-08-01','SELIC',0.16,'BCB'),
('2020-09-01','SELIC',0.16,'BCB'),
('2020-10-01','SELIC',0.16,'BCB'),
('2020-11-01','SELIC',0.15,'BCB'),
('2020-12-01','SELIC',0.16,'BCB'),
-- 2021 (SELIC ~2-9.25%)
('2021-01-01','SELIC',0.15,'BCB'),
('2021-02-01','SELIC',0.13,'BCB'),
('2021-03-01','SELIC',0.20,'BCB'),
('2021-04-01','SELIC',0.21,'BCB'),
('2021-05-01','SELIC',0.27,'BCB'),
('2021-06-01','SELIC',0.29,'BCB'),
('2021-07-01','SELIC',0.41,'BCB'),
('2021-08-01','SELIC',0.43,'BCB'),
('2021-09-01','SELIC',0.44,'BCB'),
('2021-10-01','SELIC',0.54,'BCB'),
('2021-11-01','SELIC',0.62,'BCB'),
('2021-12-01','SELIC',0.77,'BCB'),
-- 2022 (SELIC ~9.25-13.75%)
('2022-01-01','SELIC',0.73,'BCB'),
('2022-02-01','SELIC',0.76,'BCB'),
('2022-03-01','SELIC',0.83,'BCB'),
('2022-04-01','SELIC',0.83,'BCB'),
('2022-05-01','SELIC',1.03,'BCB'),
('2022-06-01','SELIC',1.03,'BCB'),
('2022-07-01','SELIC',1.03,'BCB'),
('2022-08-01','SELIC',1.11,'BCB'),
('2022-09-01','SELIC',1.08,'BCB'),
('2022-10-01','SELIC',1.08,'BCB'),
('2022-11-01','SELIC',1.02,'BCB'),
('2022-12-01','SELIC',1.12,'BCB'),
-- 2023 (SELIC ~11.75-13.75%)
('2023-01-01','SELIC',1.12,'BCB'),
('2023-02-01','SELIC',0.99,'BCB'),
('2023-03-01','SELIC',1.12,'BCB'),
('2023-04-01','SELIC',0.83,'BCB'),
('2023-05-01','SELIC',1.12,'BCB'),
('2023-06-01','SELIC',0.81,'BCB'),
('2023-07-01','SELIC',1.07,'BCB'),
('2023-08-01','SELIC',1.02,'BCB'),
('2023-09-01','SELIC',0.97,'BCB'),
('2023-10-01','SELIC',0.93,'BCB'),
('2023-11-01','SELIC',0.92,'BCB'),
('2023-12-01','SELIC',0.90,'BCB'),
-- 2024 (SELIC ~10.5-12.25%)
('2024-01-01','SELIC',0.97,'BCB'),
('2024-02-01','SELIC',0.80,'BCB'),
('2024-03-01','SELIC',0.83,'BCB'),
('2024-04-01','SELIC',0.83,'BCB'),
('2024-05-01','SELIC',0.83,'BCB'),
('2024-06-01','SELIC',0.79,'BCB'),
('2024-07-01','SELIC',0.86,'BCB'),
('2024-08-01','SELIC',0.85,'BCB'),
('2024-09-01','SELIC',0.84,'BCB'),
('2024-10-01','SELIC',0.90,'BCB'),
('2024-11-01','SELIC',1.00,'BCB'),
('2024-12-01','SELIC',0.97,'BCB'),
-- 2025 (SELIC ~12.25-13.25%)
('2025-01-01','SELIC',1.02,'BCB'),
('2025-02-01','SELIC',1.14,'BCB'),
('2025-03-01','SELIC',1.17,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- ============================================================
-- Compute acumulado via window function (running product)
-- acumulado = Π(1 + valor/100) from first month to current
-- ============================================================
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


-- ── Migration: 20260326000002_seed_pjecalc_inss_ir_historico.sql ──


-- ============================================================
-- SEED: pjecalc_inss_faixas — Histórico 2009-2022
-- 2009-2019: sistema de alíquota única (flat-rate) CLT
--   armazenado como faixas progressivas (Passo 2 fix necessário
--   para modo flat-rate exato no engine)
-- 2020-2022: sistema progressivo EC 103/2019
-- ============================================================

INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
-- 2009 (Portaria MF 77/2009)
('2009-01-01','2009-12-31',1,  965.67, 0.08),
('2009-01-01','2009-12-31',2, 1609.45, 0.09),
('2009-01-01','2009-12-31',3, 3218.90, 0.11),
-- 2010 (Portaria MF 350/2010)
('2010-01-01','2010-12-31',1, 1040.22, 0.08),
('2010-01-01','2010-12-31',2, 1733.70, 0.09),
('2010-01-01','2010-12-31',3, 3467.40, 0.11),
-- 2011 (Portaria MF 407/2011)
('2011-01-01','2011-12-31',1, 1107.52, 0.08),
('2011-01-01','2011-12-31',2, 1845.87, 0.09),
('2011-01-01','2011-12-31',3, 3691.74, 0.11),
-- 2012 (Portaria MF 8/2012)
('2012-01-01','2012-12-31',1, 1174.86, 0.08),
('2012-01-01','2012-12-31',2, 1958.10, 0.09),
('2012-01-01','2012-12-31',3, 3916.20, 0.11),
-- 2013 (Portaria MF 15/2013)
('2013-01-01','2013-12-31',1, 1247.70, 0.08),
('2013-01-01','2013-12-31',2, 2079.50, 0.09),
('2013-01-01','2013-12-31',3, 4159.00, 0.11),
-- 2014 (Portaria MF 19/2014)
('2014-01-01','2014-12-31',1, 1317.07, 0.08),
('2014-01-01','2014-12-31',2, 2195.12, 0.09),
('2014-01-01','2014-12-31',3, 4390.24, 0.11),
-- 2015 (Portaria MF 13/2015)
('2015-01-01','2015-12-31',1, 1399.12, 0.08),
('2015-01-01','2015-12-31',2, 2331.88, 0.09),
('2015-01-01','2015-12-31',3, 4663.75, 0.11),
-- 2016 (Portaria MF 8/2016)
('2016-01-01','2016-12-31',1, 1556.94, 0.08),
('2016-01-01','2016-12-31',2, 2594.92, 0.09),
('2016-01-01','2016-12-31',3, 5189.82, 0.11),
-- 2017 (Portaria MF 8/2017)
('2017-01-01','2017-12-31',1, 1659.38, 0.08),
('2017-01-01','2017-12-31',2, 2765.66, 0.09),
('2017-01-01','2017-12-31',3, 5531.31, 0.11),
-- 2018 (Portaria MF 8/2018)
('2018-01-01','2018-12-31',1, 1693.72, 0.08),
('2018-01-01','2018-12-31',2, 2822.90, 0.09),
('2018-01-01','2018-12-31',3, 5645.80, 0.11),
-- 2019 (Portaria SPREV 1/2019)
('2019-01-01','2019-12-31',1, 1751.81, 0.08),
('2019-01-01','2019-12-31',2, 2919.72, 0.09),
('2019-01-01','2019-12-31',3, 5839.45, 0.11),
-- 2020 (EC 103/2019 — progressivo a partir 01/03/2020)
-- Jan-Fev/2020: flat-rate (mesma alíquota de 2019); Mar-Dez: progressivo
-- Armazenado como progressivo para o ano todo (aproximação)
('2020-01-01','2020-12-31',1, 1558.00, 0.075),
('2020-01-01','2020-12-31',2, 2621.00, 0.09),
('2020-01-01','2020-12-31',3, 3278.00, 0.12),
('2020-01-01','2020-12-31',4, 6101.06, 0.14),
-- 2021 (Portaria SEPRT 3.659/2021)
('2021-01-01','2021-12-31',1, 1320.00, 0.075),
('2021-01-01','2021-12-31',2, 2571.29, 0.09),
('2021-01-01','2021-12-31',3, 3856.94, 0.12),
('2021-01-01','2021-12-31',4, 7507.49, 0.14),
-- 2022 (Portaria RFB 202/2022 — mesmos valores de 2021)
('2022-01-01','2022-12-31',1, 1320.00, 0.075),
('2022-01-01','2022-12-31',2, 2571.29, 0.09),
('2022-01-01','2022-12-31',3, 3856.94, 0.12),
('2022-01-01','2022-12-31',4, 7507.49, 0.14)
ON CONFLICT DO NOTHING;

-- Corrigir dados 2024 e 2025 (valores errados na migração anterior)
-- 2024: faixa 3 deveria ser 4000.03, não 5999.54
UPDATE public.pjecalc_inss_faixas
SET valor_ate = 4000.03
WHERE competencia_inicio = '2024-01-01'
  AND competencia_fim = '2024-12-31'
  AND faixa = 3
  AND valor_ate = 5999.54;

-- 2025: faixa 3 deveria ser 4190.83, não 5839.45
UPDATE public.pjecalc_inss_faixas
SET valor_ate = 4190.83
WHERE competencia_inicio = '2025-01-01'
  AND competencia_fim IS NULL
  AND faixa = 3
  AND valor_ate = 5839.45;


-- ============================================================
-- SEED: pjecalc_ir_faixas — Histórico 2009-2022
-- Tabela IR progressiva (5 faixas)
-- deducao = parcela a deduzir do IRRF (fórmula: IR = base×aliq - deducao)
-- ============================================================

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2009 (Tabela RFB vigente em 2009)
('2009-01-01','2009-12-31',1,  1434.59, 0.000,    0.00, 150.69),
('2009-01-01','2009-12-31',2,  2150.00, 0.075,  107.59, 150.69),
('2009-01-01','2009-12-31',3,  2866.70, 0.150,  268.84, 150.69),
('2009-01-01','2009-12-31',4,  3582.00, 0.225,  483.84, 150.69),
('2009-01-01','2009-12-31',5,999999999, 0.275,  662.94, 150.69),
-- 2010
('2010-01-01','2010-12-31',1,  1499.15, 0.000,    0.00, 157.47),
('2010-01-01','2010-12-31',2,  2246.75, 0.075,  112.44, 157.47),
('2010-01-01','2010-12-31',3,  2995.70, 0.150,  280.94, 157.47),
('2010-01-01','2010-12-31',4,  3743.19, 0.225,  505.62, 157.47),
('2010-01-01','2010-12-31',5,999999999, 0.275,  692.78, 157.47),
-- 2011
('2011-01-01','2011-12-31',1,  1566.61, 0.000,    0.00, 164.56),
('2011-01-01','2011-12-31',2,  2347.85, 0.075,  117.50, 164.56),
('2011-01-01','2011-12-31',3,  3130.51, 0.150,  293.59, 164.56),
('2011-01-01','2011-12-31',4,  3911.63, 0.225,  528.38, 164.56),
('2011-01-01','2011-12-31',5,999999999, 0.275,  723.96, 164.56),
-- 2012
('2012-01-01','2012-12-31',1,  1637.11, 0.000,    0.00, 171.97),
('2012-01-01','2012-12-31',2,  2453.50, 0.075,  122.78, 171.97),
('2012-01-01','2012-12-31',3,  3271.38, 0.150,  306.79, 171.97),
('2012-01-01','2012-12-31',4,  4087.65, 0.225,  552.14, 171.97),
('2012-01-01','2012-12-31',5,999999999, 0.275,  756.52, 171.97),
-- 2013
('2013-01-01','2013-12-31',1,  1710.78, 0.000,    0.00, 179.71),
('2013-01-01','2013-12-31',2,  2563.91, 0.075,  128.31, 179.71),
('2013-01-01','2013-12-31',3,  3418.59, 0.150,  320.60, 179.71),
('2013-01-01','2013-12-31',4,  4271.59, 0.225,  576.99, 179.71),
('2013-01-01','2013-12-31',5,999999999, 0.275,  790.57, 179.71),
-- 2014
('2014-01-01','2014-12-31',1,  1787.77, 0.000,    0.00, 187.92),
('2014-01-01','2014-12-31',2,  2679.29, 0.075,  134.08, 187.92),
('2014-01-01','2014-12-31',3,  3572.43, 0.150,  335.03, 187.92),
('2014-01-01','2014-12-31',4,  4463.81, 0.225,  602.96, 187.92),
('2014-01-01','2014-12-31',5,999999999, 0.275,  826.15, 187.92),
-- 2015-2022: tabela CONGELADA (sem reajuste)
('2015-01-01','2023-04-30',1,  1903.98, 0.000,    0.00, 189.59),
('2015-01-01','2023-04-30',2,  2826.65, 0.075,  142.80, 189.59),
('2015-01-01','2023-04-30',3,  3751.05, 0.150,  354.79, 189.59),
('2015-01-01','2023-04-30',4,  4664.68, 0.225,  636.12, 189.59),
('2015-01-01','2023-04-30',5,999999999, 0.275,  869.35, 189.59)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_minimo — Histórico 2000-2025
-- Fonte: Decretos/Leis que reajustam o SM anualmente
-- ============================================================

INSERT INTO public.pjecalc_salario_minimo (competencia, valor)
VALUES
-- 2000
('2000-01-01', 136.00),  -- valor até Mar/2000
('2000-04-01', 151.00),  -- reajuste Abr/2000
-- 2001
('2001-04-01', 180.00),
-- 2002
('2002-04-01', 200.00),
-- 2003
('2003-04-01', 240.00),
-- 2004
('2004-05-01', 260.00),
-- 2005
('2005-05-01', 300.00),
-- 2006
('2006-04-01', 350.00),
-- 2007
('2007-04-01', 380.00),
-- 2008
('2008-03-01', 415.00),
-- 2009
('2009-02-01', 465.00),
-- 2010
('2010-01-01', 510.00),
-- 2011
('2011-03-01', 545.00),
-- 2012
('2012-01-01', 622.00),
-- 2013
('2013-01-01', 678.00),
-- 2014
('2014-01-01', 724.00),
-- 2015
('2015-01-01', 788.00),
-- 2016
('2016-01-01', 880.00),
-- 2017
('2017-01-01', 937.00),
-- 2018
('2018-01-01', 954.00),
-- 2019
('2019-01-01', 998.00),
-- 2020
('2020-01-01', 1045.00),
-- 2021
('2021-01-01', 1100.00),
-- 2022
('2022-01-01', 1212.00),
-- 2023
('2023-01-01', 1320.00),
-- 2024
('2024-01-01', 1412.00),
-- 2025
('2025-01-01', 1518.00)
ON CONFLICT (competencia) DO NOTHING;


-- ── Migration: 20260326000003_seed_pjecalc_feriados_beneficios.sql ──


-- ============================================================
-- SEED: pjecalc_feriados — Feriados Nacionais 2000-2030
-- Fonte: Lei 9.093/1995, Lei 10.607/2002, Lei 14.759/2023
-- scope = 'nacional' (orchestrator lê r.tipo → fallback 'nacional')
-- ============================================================

INSERT INTO public.pjecalc_feriados (data, nome, scope)
VALUES
-- Feriados FIXOS (gerados para 2000-2030)
-- 1 Jan — Confraternização Universal
('2000-01-01','Confraternização Universal','nacional'),
('2001-01-01','Confraternização Universal','nacional'),
('2002-01-01','Confraternização Universal','nacional'),
('2003-01-01','Confraternização Universal','nacional'),
('2004-01-01','Confraternização Universal','nacional'),
('2005-01-01','Confraternização Universal','nacional'),
('2006-01-01','Confraternização Universal','nacional'),
('2007-01-01','Confraternização Universal','nacional'),
('2008-01-01','Confraternização Universal','nacional'),
('2009-01-01','Confraternização Universal','nacional'),
('2010-01-01','Confraternização Universal','nacional'),
('2011-01-01','Confraternização Universal','nacional'),
('2012-01-01','Confraternização Universal','nacional'),
('2013-01-01','Confraternização Universal','nacional'),
('2014-01-01','Confraternização Universal','nacional'),
('2015-01-01','Confraternização Universal','nacional'),
('2016-01-01','Confraternização Universal','nacional'),
('2017-01-01','Confraternização Universal','nacional'),
('2018-01-01','Confraternização Universal','nacional'),
('2019-01-01','Confraternização Universal','nacional'),
('2020-01-01','Confraternização Universal','nacional'),
('2021-01-01','Confraternização Universal','nacional'),
('2022-01-01','Confraternização Universal','nacional'),
('2023-01-01','Confraternização Universal','nacional'),
('2024-01-01','Confraternização Universal','nacional'),
('2025-01-01','Confraternização Universal','nacional'),
('2026-01-01','Confraternização Universal','nacional'),
('2027-01-01','Confraternização Universal','nacional'),
('2028-01-01','Confraternização Universal','nacional'),
('2029-01-01','Confraternização Universal','nacional'),
('2030-01-01','Confraternização Universal','nacional'),
-- 21 Abr — Tiradentes
('2000-04-21','Tiradentes','nacional'),
('2001-04-21','Tiradentes','nacional'),
('2002-04-21','Tiradentes','nacional'),
('2003-04-21','Tiradentes','nacional'),
('2004-04-21','Tiradentes','nacional'),
('2005-04-21','Tiradentes','nacional'),
('2006-04-21','Tiradentes','nacional'),
('2007-04-21','Tiradentes','nacional'),
('2008-04-21','Tiradentes','nacional'),
('2009-04-21','Tiradentes','nacional'),
('2010-04-21','Tiradentes','nacional'),
('2011-04-21','Tiradentes','nacional'),
('2012-04-21','Tiradentes','nacional'),
('2013-04-21','Tiradentes','nacional'),
('2014-04-21','Tiradentes','nacional'),
('2015-04-21','Tiradentes','nacional'),
('2016-04-21','Tiradentes','nacional'),
('2017-04-21','Tiradentes','nacional'),
('2018-04-21','Tiradentes','nacional'),
('2019-04-21','Tiradentes','nacional'),
('2020-04-21','Tiradentes','nacional'),
('2021-04-21','Tiradentes','nacional'),
('2022-04-21','Tiradentes','nacional'),
('2023-04-21','Tiradentes','nacional'),
('2024-04-21','Tiradentes','nacional'),
('2025-04-21','Tiradentes','nacional'),
('2026-04-21','Tiradentes','nacional'),
('2027-04-21','Tiradentes','nacional'),
('2028-04-21','Tiradentes','nacional'),
('2029-04-21','Tiradentes','nacional'),
('2030-04-21','Tiradentes','nacional'),
-- 1 Mai — Dia do Trabalho
('2000-05-01','Dia do Trabalho','nacional'),
('2001-05-01','Dia do Trabalho','nacional'),
('2002-05-01','Dia do Trabalho','nacional'),
('2003-05-01','Dia do Trabalho','nacional'),
('2004-05-01','Dia do Trabalho','nacional'),
('2005-05-01','Dia do Trabalho','nacional'),
('2006-05-01','Dia do Trabalho','nacional'),
('2007-05-01','Dia do Trabalho','nacional'),
('2008-05-01','Dia do Trabalho','nacional'),
('2009-05-01','Dia do Trabalho','nacional'),
('2010-05-01','Dia do Trabalho','nacional'),
('2011-05-01','Dia do Trabalho','nacional'),
('2012-05-01','Dia do Trabalho','nacional'),
('2013-05-01','Dia do Trabalho','nacional'),
('2014-05-01','Dia do Trabalho','nacional'),
('2015-05-01','Dia do Trabalho','nacional'),
('2016-05-01','Dia do Trabalho','nacional'),
('2017-05-01','Dia do Trabalho','nacional'),
('2018-05-01','Dia do Trabalho','nacional'),
('2019-05-01','Dia do Trabalho','nacional'),
('2020-05-01','Dia do Trabalho','nacional'),
('2021-05-01','Dia do Trabalho','nacional'),
('2022-05-01','Dia do Trabalho','nacional'),
('2023-05-01','Dia do Trabalho','nacional'),
('2024-05-01','Dia do Trabalho','nacional'),
('2025-05-01','Dia do Trabalho','nacional'),
('2026-05-01','Dia do Trabalho','nacional'),
('2027-05-01','Dia do Trabalho','nacional'),
('2028-05-01','Dia do Trabalho','nacional'),
('2029-05-01','Dia do Trabalho','nacional'),
('2030-05-01','Dia do Trabalho','nacional'),
-- 7 Set — Independência do Brasil
('2000-09-07','Independência do Brasil','nacional'),
('2001-09-07','Independência do Brasil','nacional'),
('2002-09-07','Independência do Brasil','nacional'),
('2003-09-07','Independência do Brasil','nacional'),
('2004-09-07','Independência do Brasil','nacional'),
('2005-09-07','Independência do Brasil','nacional'),
('2006-09-07','Independência do Brasil','nacional'),
('2007-09-07','Independência do Brasil','nacional'),
('2008-09-07','Independência do Brasil','nacional'),
('2009-09-07','Independência do Brasil','nacional'),
('2010-09-07','Independência do Brasil','nacional'),
('2011-09-07','Independência do Brasil','nacional'),
('2012-09-07','Independência do Brasil','nacional'),
('2013-09-07','Independência do Brasil','nacional'),
('2014-09-07','Independência do Brasil','nacional'),
('2015-09-07','Independência do Brasil','nacional'),
('2016-09-07','Independência do Brasil','nacional'),
('2017-09-07','Independência do Brasil','nacional'),
('2018-09-07','Independência do Brasil','nacional'),
('2019-09-07','Independência do Brasil','nacional'),
('2020-09-07','Independência do Brasil','nacional'),
('2021-09-07','Independência do Brasil','nacional'),
('2022-09-07','Independência do Brasil','nacional'),
('2023-09-07','Independência do Brasil','nacional'),
('2024-09-07','Independência do Brasil','nacional'),
('2025-09-07','Independência do Brasil','nacional'),
('2026-09-07','Independência do Brasil','nacional'),
('2027-09-07','Independência do Brasil','nacional'),
('2028-09-07','Independência do Brasil','nacional'),
('2029-09-07','Independência do Brasil','nacional'),
('2030-09-07','Independência do Brasil','nacional'),
-- 12 Out — Nossa Senhora Aparecida
('2000-10-12','Nossa Senhora Aparecida','nacional'),
('2001-10-12','Nossa Senhora Aparecida','nacional'),
('2002-10-12','Nossa Senhora Aparecida','nacional'),
('2003-10-12','Nossa Senhora Aparecida','nacional'),
('2004-10-12','Nossa Senhora Aparecida','nacional'),
('2005-10-12','Nossa Senhora Aparecida','nacional'),
('2006-10-12','Nossa Senhora Aparecida','nacional'),
('2007-10-12','Nossa Senhora Aparecida','nacional'),
('2008-10-12','Nossa Senhora Aparecida','nacional'),
('2009-10-12','Nossa Senhora Aparecida','nacional'),
('2010-10-12','Nossa Senhora Aparecida','nacional'),
('2011-10-12','Nossa Senhora Aparecida','nacional'),
('2012-10-12','Nossa Senhora Aparecida','nacional'),
('2013-10-12','Nossa Senhora Aparecida','nacional'),
('2014-10-12','Nossa Senhora Aparecida','nacional'),
('2015-10-12','Nossa Senhora Aparecida','nacional'),
('2016-10-12','Nossa Senhora Aparecida','nacional'),
('2017-10-12','Nossa Senhora Aparecida','nacional'),
('2018-10-12','Nossa Senhora Aparecida','nacional'),
('2019-10-12','Nossa Senhora Aparecida','nacional'),
('2020-10-12','Nossa Senhora Aparecida','nacional'),
('2021-10-12','Nossa Senhora Aparecida','nacional'),
('2022-10-12','Nossa Senhora Aparecida','nacional'),
('2023-10-12','Nossa Senhora Aparecida','nacional'),
('2024-10-12','Nossa Senhora Aparecida','nacional'),
('2025-10-12','Nossa Senhora Aparecida','nacional'),
('2026-10-12','Nossa Senhora Aparecida','nacional'),
('2027-10-12','Nossa Senhora Aparecida','nacional'),
('2028-10-12','Nossa Senhora Aparecida','nacional'),
('2029-10-12','Nossa Senhora Aparecida','nacional'),
('2030-10-12','Nossa Senhora Aparecida','nacional'),
-- 2 Nov — Finados
('2000-11-02','Finados','nacional'),
('2001-11-02','Finados','nacional'),
('2002-11-02','Finados','nacional'),
('2003-11-02','Finados','nacional'),
('2004-11-02','Finados','nacional'),
('2005-11-02','Finados','nacional'),
('2006-11-02','Finados','nacional'),
('2007-11-02','Finados','nacional'),
('2008-11-02','Finados','nacional'),
('2009-11-02','Finados','nacional'),
('2010-11-02','Finados','nacional'),
('2011-11-02','Finados','nacional'),
('2012-11-02','Finados','nacional'),
('2013-11-02','Finados','nacional'),
('2014-11-02','Finados','nacional'),
('2015-11-02','Finados','nacional'),
('2016-11-02','Finados','nacional'),
('2017-11-02','Finados','nacional'),
('2018-11-02','Finados','nacional'),
('2019-11-02','Finados','nacional'),
('2020-11-02','Finados','nacional'),
('2021-11-02','Finados','nacional'),
('2022-11-02','Finados','nacional'),
('2023-11-02','Finados','nacional'),
('2024-11-02','Finados','nacional'),
('2025-11-02','Finados','nacional'),
('2026-11-02','Finados','nacional'),
('2027-11-02','Finados','nacional'),
('2028-11-02','Finados','nacional'),
('2029-11-02','Finados','nacional'),
('2030-11-02','Finados','nacional'),
-- 15 Nov — Proclamação da República
('2000-11-15','Proclamação da República','nacional'),
('2001-11-15','Proclamação da República','nacional'),
('2002-11-15','Proclamação da República','nacional'),
('2003-11-15','Proclamação da República','nacional'),
('2004-11-15','Proclamação da República','nacional'),
('2005-11-15','Proclamação da República','nacional'),
('2006-11-15','Proclamação da República','nacional'),
('2007-11-15','Proclamação da República','nacional'),
('2008-11-15','Proclamação da República','nacional'),
('2009-11-15','Proclamação da República','nacional'),
('2010-11-15','Proclamação da República','nacional'),
('2011-11-15','Proclamação da República','nacional'),
('2012-11-15','Proclamação da República','nacional'),
('2013-11-15','Proclamação da República','nacional'),
('2014-11-15','Proclamação da República','nacional'),
('2015-11-15','Proclamação da República','nacional'),
('2016-11-15','Proclamação da República','nacional'),
('2017-11-15','Proclamação da República','nacional'),
('2018-11-15','Proclamação da República','nacional'),
('2019-11-15','Proclamação da República','nacional'),
('2020-11-15','Proclamação da República','nacional'),
('2021-11-15','Proclamação da República','nacional'),
('2022-11-15','Proclamação da República','nacional'),
('2023-11-15','Proclamação da República','nacional'),
('2024-11-15','Proclamação da República','nacional'),
('2025-11-15','Proclamação da República','nacional'),
('2026-11-15','Proclamação da República','nacional'),
('2027-11-15','Proclamação da República','nacional'),
('2028-11-15','Proclamação da República','nacional'),
('2029-11-15','Proclamação da República','nacional'),
('2030-11-15','Proclamação da República','nacional'),
-- 20 Nov — Dia da Consciência Negra (nacional a partir de 2024)
('2024-11-20','Dia da Consciência Negra','nacional'),
('2025-11-20','Dia da Consciência Negra','nacional'),
('2026-11-20','Dia da Consciência Negra','nacional'),
('2027-11-20','Dia da Consciência Negra','nacional'),
('2028-11-20','Dia da Consciência Negra','nacional'),
('2029-11-20','Dia da Consciência Negra','nacional'),
('2030-11-20','Dia da Consciência Negra','nacional'),
-- 25 Dez — Natal
('2000-12-25','Natal','nacional'),
('2001-12-25','Natal','nacional'),
('2002-12-25','Natal','nacional'),
('2003-12-25','Natal','nacional'),
('2004-12-25','Natal','nacional'),
('2005-12-25','Natal','nacional'),
('2006-12-25','Natal','nacional'),
('2007-12-25','Natal','nacional'),
('2008-12-25','Natal','nacional'),
('2009-12-25','Natal','nacional'),
('2010-12-25','Natal','nacional'),
('2011-12-25','Natal','nacional'),
('2012-12-25','Natal','nacional'),
('2013-12-25','Natal','nacional'),
('2014-12-25','Natal','nacional'),
('2015-12-25','Natal','nacional'),
('2016-12-25','Natal','nacional'),
('2017-12-25','Natal','nacional'),
('2018-12-25','Natal','nacional'),
('2019-12-25','Natal','nacional'),
('2020-12-25','Natal','nacional'),
('2021-12-25','Natal','nacional'),
('2022-12-25','Natal','nacional'),
('2023-12-25','Natal','nacional'),
('2024-12-25','Natal','nacional'),
('2025-12-25','Natal','nacional'),
('2026-12-25','Natal','nacional'),
('2027-12-25','Natal','nacional'),
('2028-12-25','Natal','nacional'),
('2029-12-25','Natal','nacional'),
('2030-12-25','Natal','nacional'),
-- Feriados MÓVEIS — Sexta-Feira Santa (Easter - 2 dias)
('2000-04-21','Sexta-Feira Santa','nacional'),
('2001-04-13','Sexta-Feira Santa','nacional'),
('2002-03-29','Sexta-Feira Santa','nacional'),
('2003-04-18','Sexta-Feira Santa','nacional'),
('2004-04-09','Sexta-Feira Santa','nacional'),
('2005-03-25','Sexta-Feira Santa','nacional'),
('2006-04-14','Sexta-Feira Santa','nacional'),
('2007-04-06','Sexta-Feira Santa','nacional'),
('2008-03-21','Sexta-Feira Santa','nacional'),
('2009-04-10','Sexta-Feira Santa','nacional'),
('2010-04-02','Sexta-Feira Santa','nacional'),
('2011-04-22','Sexta-Feira Santa','nacional'),
('2012-04-06','Sexta-Feira Santa','nacional'),
('2013-03-29','Sexta-Feira Santa','nacional'),
('2014-04-18','Sexta-Feira Santa','nacional'),
('2015-04-03','Sexta-Feira Santa','nacional'),
('2016-03-25','Sexta-Feira Santa','nacional'),
('2017-04-14','Sexta-Feira Santa','nacional'),
('2018-03-30','Sexta-Feira Santa','nacional'),
('2019-04-19','Sexta-Feira Santa','nacional'),
('2020-04-10','Sexta-Feira Santa','nacional'),
('2021-04-02','Sexta-Feira Santa','nacional'),
('2022-04-15','Sexta-Feira Santa','nacional'),
('2023-04-07','Sexta-Feira Santa','nacional'),
('2024-03-29','Sexta-Feira Santa','nacional'),
('2025-04-18','Sexta-Feira Santa','nacional'),
('2026-04-03','Sexta-Feira Santa','nacional'),
('2027-03-26','Sexta-Feira Santa','nacional'),
('2028-04-14','Sexta-Feira Santa','nacional'),
('2029-03-30','Sexta-Feira Santa','nacional'),
('2030-04-19','Sexta-Feira Santa','nacional'),
-- Corpus Christi (Easter + 60 dias) — facultativo nacional
('2000-06-22','Corpus Christi','nacional'),
('2001-06-14','Corpus Christi','nacional'),
('2002-05-30','Corpus Christi','nacional'),
('2003-06-19','Corpus Christi','nacional'),
('2004-06-10','Corpus Christi','nacional'),
('2005-05-26','Corpus Christi','nacional'),
('2006-06-15','Corpus Christi','nacional'),
('2007-06-07','Corpus Christi','nacional'),
('2008-05-22','Corpus Christi','nacional'),
('2009-06-11','Corpus Christi','nacional'),
('2010-06-03','Corpus Christi','nacional'),
('2011-06-23','Corpus Christi','nacional'),
('2012-06-07','Corpus Christi','nacional'),
('2013-05-30','Corpus Christi','nacional'),
('2014-06-19','Corpus Christi','nacional'),
('2015-06-04','Corpus Christi','nacional'),
('2016-05-26','Corpus Christi','nacional'),
('2017-06-15','Corpus Christi','nacional'),
('2018-05-31','Corpus Christi','nacional'),
('2019-06-20','Corpus Christi','nacional'),
('2020-06-11','Corpus Christi','nacional'),
('2021-06-03','Corpus Christi','nacional'),
('2022-06-16','Corpus Christi','nacional'),
('2023-06-08','Corpus Christi','nacional'),
('2024-05-30','Corpus Christi','nacional'),
('2025-06-19','Corpus Christi','nacional'),
('2026-06-04','Corpus Christi','nacional'),
('2027-05-27','Corpus Christi','nacional'),
('2028-06-15','Corpus Christi','nacional'),
('2029-05-31','Corpus Christi','nacional'),
('2030-06-20','Corpus Christi','nacional')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED: pjecalc_seguro_desemprego — 2019-2025
-- Fonte: Resolução CODEFAT
-- Regra: SD = valor_soma + (salario - valor_inicial) × percentual/100
--        limitado ao teto (valor_teto) e ao piso (valor_piso = SM)
-- ============================================================

INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
-- 2019 (Resolução CODEFAT 835/2019; SM=998)
('2019-01-01',1,    0.00, 1649.00, 80.00,    0.00,  998.00, 1869.30),
('2019-01-01',2, 1649.00, 2766.00, 50.00, 1319.20,  998.00, 1869.30),
('2019-01-01',3, 2766.00,999999.0, 40.00, 1878.58,  998.00, 1869.30),
-- 2020 (SM=1045)
('2020-01-01',1,    0.00, 1813.03, 80.00,    0.00, 1045.00, 2005.30),
('2020-01-01',2, 1813.03, 3025.15, 50.00, 1450.42, 1045.00, 2005.30),
('2020-01-01',3, 3025.15,999999.0, 40.00, 2056.52, 1045.00, 2005.30),
-- 2021 (SM=1100)
('2021-01-01',1,    0.00, 1908.18, 80.00,    0.00, 1100.00, 2106.08),
('2021-01-01',2, 1908.18, 3180.29, 50.00, 1526.54, 1100.00, 2106.08),
('2021-01-01',3, 3180.29,999999.0, 40.00, 2165.64, 1100.00, 2106.08),
-- 2022 (SM=1212)
('2022-01-01',1,    0.00, 2041.39, 80.00,    0.00, 1212.00, 2230.97),
('2022-01-01',2, 2041.39, 3403.00, 50.00, 1633.11, 1212.00, 2230.97),
('2022-01-01',3, 3403.00,999999.0, 40.00, 2314.49, 1212.00, 2230.97),
-- 2023 (SM=1320)
('2023-01-01',1,    0.00, 2041.39, 80.00,    0.00, 1320.00, 2230.97),
('2023-01-01',2, 2041.39, 3403.00, 50.00, 1633.11, 1320.00, 2230.97),
('2023-01-01',3, 3403.00,999999.0, 40.00, 2314.49, 1320.00, 2230.97),
-- 2024 (SM=1412)
('2024-01-01',1,    0.00, 2259.20, 80.00,    0.00, 1412.00, 2364.45),
('2024-01-01',2, 2259.20, 3765.33, 50.00, 1807.36, 1412.00, 2364.45),
('2024-01-01',3, 3765.33,999999.0, 40.00, 2560.26, 1412.00, 2364.45),
-- 2025 (SM=1518)
('2025-01-01',1,    0.00, 2259.20, 80.00,    0.00, 1518.00, 2364.45),
('2025-01-01',2, 2259.20, 3765.33, 50.00, 1807.36, 1518.00, 2364.45),
('2025-01-01',3, 3765.33,999999.0, 40.00, 2560.26, 1518.00, 2364.45)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_familia — 2019-2025
-- Fonte: Portarias MPS anuais
-- Cota por filho de até 14 anos
-- ============================================================

INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
-- 2019 (SM=998; cota=48.62 até R$1425.56; 34.25 até R$2142.65)
('2019-01-01',1,    0.00, 1425.56, 48.62),
('2019-01-01',2, 1425.56, 2142.65, 34.25),
-- 2020 (SM=1045)
('2020-01-01',1,    0.00, 1503.80, 54.10),
('2020-01-01',2, 1503.80, 2259.20, 38.26),
-- 2021 (SM=1100)
('2021-01-01',1,    0.00, 1503.80, 54.10),
('2021-01-01',2, 1503.80, 2259.20, 38.26),
-- 2022 (SM=1212)
('2022-01-01',1,    0.00, 1655.98, 59.82),
('2022-01-01',2, 1655.98, 2482.89, 42.11),
-- 2023 (SM=1320)
('2023-01-01',1,    0.00, 1754.18, 62.04),
('2023-01-01',2, 1754.18, 2631.19, 43.91),
-- 2024 (SM=1412)
('2024-01-01',1,    0.00, 1819.26, 62.04),
('2024-01-01',2, 1819.26, 2728.89, 43.91),
-- 2025 (SM=1518)
('2025-01-01',1,    0.00, 1819.26, 62.04),
('2025-01-01',2, 1819.26, 2728.89, 43.91)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ── Migration: 20260326000004_seed_pjecalc_taxa_legal.sql ──


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


-- ── Migration: 20260327000001_seed_pjecalc_tr_fgts.sql ──


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


-- ── Migration: 20260327000002_seed_pjecalc_inss_ir_pre2009.sql ──


-- ============================================================
-- SEED: pjecalc_inss_faixas e pjecalc_ir_faixas — PRÉ-2009
--
-- INSS 2000–2008: alíquota ÚNICA (flat-rate) conforme portarias MPS
--   O salário total se enquadra em uma faixa e TODA a base é tributada
--   naquela alíquota. Armazenado como pseudo-progressivo de 3 faixas
--   usando valor_ate = teto da faixa (engine usa calcularINSSAliquotaUnica).
--
-- IR 2000–2008: tabela progressiva conforme RIR/Leis anuais
--   2000–2006: freeze period — 2 alíquotas (15%, 27.5%)
--   2007–2008: atualização via Lei 11.311/2006 e Lei 11.482/2008
--   aliquota armazenado como decimal (0.15, 0.275), não percentual.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- INSS 2000–2008 (portarias MPS anuais — alíquota flat-rate)
-- valor_ate = teto da faixa; aliquota = decimal (ex: 0.08 = 8%)
-- ══════════════════════════════════════════════════════════════

-- Limpar faixas pré-2009 que possam existir com dados errados
DELETE FROM public.pjecalc_inss_faixas
WHERE competencia_inicio < '2009-01-01';

INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
-- 2000 (Portaria MPS 4.883/1998 com reajuste)
  ('2000-01-01','2000-12-31', 1,  388.43, 0.08),
  ('2000-01-01','2000-12-31', 2,  647.38, 0.09),
  ('2000-01-01','2000-12-31', 3, 1078.98, 0.11),
-- 2001 (Portaria MPS 5.018/2001)
  ('2001-01-01','2001-12-31', 1,  425.03, 0.08),
  ('2001-01-01','2001-12-31', 2,  708.38, 0.09),
  ('2001-01-01','2001-12-31', 3, 1181.31, 0.11),
-- 2002 (Portaria MPS 5.062/2002)
  ('2002-01-01','2002-12-31', 1,  468.17, 0.08),
  ('2002-01-01','2002-12-31', 2,  780.30, 0.09),
  ('2002-01-01','2002-12-31', 3, 1301.50, 0.11),
-- 2003 (Portaria MPS 5.303/2003)
  ('2003-01-01','2003-12-31', 1,  512.99, 0.08),
  ('2003-01-01','2003-12-31', 2,  854.99, 0.09),
  ('2003-01-01','2003-12-31', 3, 1425.00, 0.11),
-- 2004 (Portaria MPS 5.442/2004)
  ('2004-01-01','2004-12-31', 1,  560.81, 0.08),
  ('2004-01-01','2004-12-31', 2,  934.94, 0.09),
  ('2004-01-01','2004-12-31', 3, 1869.34, 0.11),
-- 2005 (Portaria MPS 5.536/2005)
  ('2005-01-01','2005-12-31', 1,  596.29, 0.08),
  ('2005-01-01','2005-12-31', 2,  993.85, 0.09),
  ('2005-01-01','2005-12-31', 3, 1988.95, 0.11),
-- 2006 (Portaria MPS 29/2006)
  ('2006-01-01','2006-12-31', 1,  641.00, 0.08),
  ('2006-01-01','2006-12-31', 2, 1069.39, 0.09),
  ('2006-01-01','2006-12-31', 3, 2138.65, 0.11),
-- 2007 (Portaria MPS 45/2007)
  ('2007-01-01','2007-12-31', 1,  677.67, 0.08),
  ('2007-01-01','2007-12-31', 2, 1129.52, 0.09),
  ('2007-01-01','2007-12-31', 3, 2258.92, 0.11),
-- 2008 (Portaria MPS 56/2008 — teto significativamente ampliado)
  ('2008-01-01','2008-12-31', 1,  911.70, 0.08),
  ('2008-01-01','2008-12-31', 2, 1519.67, 0.09),
  ('2008-01-01','2008-12-31', 3, 3038.00, 0.11)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- IR 2000–2008 (RIR / Leis anuais — tabela progressiva)
--
-- Nota: Imposto de Renda sofreu freeze de 1998 a 2006.
-- Deduções por dependente fixas em R$ 106,00 de 1998 a 2009.
--
-- aliquota = decimal (0 = isento, 0.15 = 15%, 0.275 = 27.5%)
-- deducao = parcela a deduzir (método tabela progressiva)
-- ══════════════════════════════════════════════════════════════

-- Limpar IR pré-2007 que possam existir com dados errados
DELETE FROM public.pjecalc_ir_faixas
WHERE competencia_inicio < '2007-01-01';

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2000–2006: FREEZE — 2 alíquotas (Lei 9.250/95 congelada)
-- Isento até R$ 900,00; 15% de 900,01 a 1.800,00; 27.5% acima
  ('2000-01-01','2000-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2000-01-01','2000-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2000-01-01','2000-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2001-01-01','2001-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2001-01-01','2001-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2001-01-01','2001-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2002-01-01','2002-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2002-01-01','2002-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2002-01-01','2002-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2003-01-01','2003-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2003-01-01','2003-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2003-01-01','2003-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2004-01-01','2004-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2004-01-01','2004-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2004-01-01','2004-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2005-01-01','2005-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2005-01-01','2005-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2005-01-01','2005-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2006-01-01','2006-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2006-01-01','2006-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2006-01-01','2006-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

-- 2007 (Lei 11.311/2006 — atualização após freeze)
-- Isento até R$ 1.313,69; 15% até R$ 2.625,12; 27.5% acima
  ('2007-01-01','2007-12-31', 1,   1313.69, 0,     0.00, 106.00),
  ('2007-01-01','2007-12-31', 2,   2625.12, 0.15, 197.05, 106.00),
  ('2007-01-01','2007-12-31', 3, 999999.00, 0.275, 525.03, 106.00),

-- 2008 (Lei 11.482/2008)
-- Isento até R$ 1.372,81; 15% até R$ 2.743,25; 27.5% acima
  ('2008-01-01','2008-12-31', 1,   1372.81, 0,     0.00, 106.00),
  ('2008-01-01','2008-12-31', 2,   2743.25, 0.15, 205.92, 106.00),
  ('2008-01-01','2008-12-31', 3, 999999.00, 0.275, 548.65, 106.00)

ON CONFLICT DO NOTHING;

