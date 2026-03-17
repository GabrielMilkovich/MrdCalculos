
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
