
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
