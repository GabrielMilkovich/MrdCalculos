-- Cache de extrações via LLM (OpenAI gpt-4o-mini etc.).
--
-- Problema resolvido:
--   Quando o parser determinístico tem confiança baixa, o frontend pode
--   pedir uma re-extração via LLM. Sem cache, o mesmo OCR seria reprocessado
--   N vezes (custo + latência). A chave é (document_id, ocr_hash, tipo_doc,
--   model) — mesmo OCR + mesmo modelo = mesmo resultado.
--
-- RLS:
--   Acesso apenas pelo dono do caso (via documents → cases.criado_por).

CREATE TABLE IF NOT EXISTS public.llm_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  -- SHA-256 hex (64 chars) do OCR usado.
  ocr_hash TEXT NOT NULL,
  tipo_doc TEXT NOT NULL CHECK (
    tipo_doc IN ('cartao_ponto', 'recibo_ferias', 'registro_faltas', 'holerite')
  ),
  model TEXT NOT NULL,
  -- JSON estruturado (validado por Zod no backend antes da escrita).
  output_json JSONB NOT NULL,
  -- Custo / debug (token usage do gateway).
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  -- Score de confiança calculado depois (preenchido pelo frontend ao usar).
  confidence_score INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, ocr_hash, tipo_doc, model)
);

CREATE INDEX IF NOT EXISTS idx_llm_extractions_doc
  ON public.llm_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_llm_extractions_case
  ON public.llm_extractions(case_id);
CREATE INDEX IF NOT EXISTS idx_llm_extractions_lookup
  ON public.llm_extractions(document_id, ocr_hash, tipo_doc, model);

ALTER TABLE public.llm_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "llm_extractions_owner_select" ON public.llm_extractions;
CREATE POLICY "llm_extractions_owner_select" ON public.llm_extractions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = llm_extractions.case_id
        AND c.criado_por = auth.uid()
    )
  );

-- INSERT/UPDATE só vem da edge function (service_role bypassa RLS).
DROP POLICY IF EXISTS "llm_extractions_owner_delete" ON public.llm_extractions;
CREATE POLICY "llm_extractions_owner_delete" ON public.llm_extractions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = llm_extractions.case_id
        AND c.criado_por = auth.uid()
    )
  );

COMMENT ON TABLE public.llm_extractions IS
  'Cache de extrações de OCR via LLM. Chave (document_id, ocr_hash, tipo_doc, model) garante idempotência.';
