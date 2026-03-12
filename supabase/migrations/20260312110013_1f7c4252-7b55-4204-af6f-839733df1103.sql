
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
