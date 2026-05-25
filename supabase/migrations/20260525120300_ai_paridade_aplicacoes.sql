-- Audit log de aplicações de sugestões IA na paridade forense.
-- Cada row = 1 correção aceita pelo operador.
-- Sprint 5 — Paridade Forense IA

CREATE TABLE public.ai_paridade_aplicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  applied_at timestamptz NOT NULL DEFAULT now(),
  builder text NOT NULL,
  field_path text NOT NULL,
  value_before jsonb,
  value_after jsonb,
  ai_confidence integer NOT NULL CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
  ai_severidade text NOT NULL CHECK (ai_severidade IN ('critica', 'alta', 'media', 'baixa')),
  ai_reason text NOT NULL,
  ai_evidence_pdf text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reverted')),
  reverted_at timestamptz,
  reverted_by uuid REFERENCES auth.users(id),
  ia_model text NOT NULL,
  ia_duration_ms integer
);

CREATE INDEX idx_ai_paridade_document ON ai_paridade_aplicacoes(document_id);
CREATE INDEX idx_ai_paridade_user_date ON ai_paridade_aplicacoes(user_id, applied_at DESC);

ALTER TABLE ai_paridade_aplicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai_paridade applications"
  ON ai_paridade_aplicacoes FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_id AND c.criado_por = auth.uid()
    )
  );

CREATE POLICY "Users insert own ai_paridade applications"
  ON ai_paridade_aplicacoes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own ai_paridade applications"
  ON ai_paridade_aplicacoes FOR UPDATE
  TO authenticated USING (user_id = auth.uid());
