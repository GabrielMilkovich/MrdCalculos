-- =====================================================
-- AUTO-FILL PROPOSALS — infra inteligente de auto-preenchimento
-- =====================================================
-- Antes de aplicar mudancas no pjecalc_calculos/parametros, o pipeline
-- extract-and-fill agora cria PROPOSTAS aqui. UI revisa, usuario aprova/
-- rejeita, snapshot anterior fica disponivel para rollback.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auto_fill_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  campo TEXT NOT NULL,                      -- ex: 'data_admissao', 'salario_base'
  doc_tipo TEXT NOT NULL,                   -- ex: 'CTPS', 'TRCT', 'HOLERITE'
  valor_proposto JSONB NOT NULL,            -- valor sugerido pelo extract
  valor_anterior JSONB,                     -- snapshot pre-aplicacao (para rollback)
  authority_score NUMERIC(5,2) NOT NULL,    -- 0-100 da matriz authority
  confianca NUMERIC(4,3) NOT NULL,          -- 0-1 confianca do extract
  score_final NUMERIC(7,3) NOT NULL,        -- authority × confianca
  motivo_resolucao TEXT,                    -- 'authority' | 'confidence' | 'recency' | 'unico'
  conflitantes JSONB DEFAULT '[]'::jsonb,   -- candidatos perdedores [{doc_tipo, valor, score}]
  evidencia TEXT,                           -- trecho/pagina de origem
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'aplicada', 'revertida')),
  aplicado_em TIMESTAMPTZ,
  aplicado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revertido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_fill_proposals_case
  ON public.auto_fill_proposals(case_id, status);

CREATE INDEX IF NOT EXISTS idx_auto_fill_proposals_doc
  ON public.auto_fill_proposals(document_id);

CREATE INDEX IF NOT EXISTS idx_auto_fill_proposals_pendentes
  ON public.auto_fill_proposals(case_id, criado_em DESC)
  WHERE status = 'pendente';

ALTER TABLE public.auto_fill_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_proposals" ON public.auto_fill_proposals
  FOR SELECT USING (
    case_id IN (SELECT id FROM public.cases WHERE criado_por = auth.uid())
  );

CREATE POLICY "owner_update_proposals" ON public.auto_fill_proposals
  FOR UPDATE USING (
    case_id IN (SELECT id FROM public.cases WHERE criado_por = auth.uid())
  );

CREATE POLICY "service_insert_proposals" ON public.auto_fill_proposals
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'service_role')
  );

CREATE POLICY "owner_delete_proposals" ON public.auto_fill_proposals
  FOR DELETE USING (
    case_id IN (SELECT id FROM public.cases WHERE criado_por = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_auto_fill_proposals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_fill_proposals_touch
  BEFORE UPDATE ON public.auto_fill_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_auto_fill_proposals();

COMMENT ON TABLE public.auto_fill_proposals IS
  'Propostas de auto-preenchimento geradas pelo pipeline extract-and-fill. UI permite revisao/aprovacao antes de aplicar em pjecalc_calculos. valor_anterior preserva o estado pre-aplicacao para rollback.';
