-- =====================================================
-- Modo "Extração de Dados" + dados extraídos por documento
-- =====================================================
-- Adiciona modo do caso (calculation/data_extraction) e tabela para
-- armazenar linhas estruturadas extraidas via LLM (categoria por
-- documento, status de validacao por humano, fonte rastreavel).
-- =====================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'calculation'
  CHECK (mode IN ('calculation', 'data_extraction'));

COMMENT ON COLUMN public.cases.mode IS
  'Modo do caso: calculation (liquidacao trabalhista completa) ou data_extraction (extrai documentos para CSVs PJe-Calc Cidadao). Imutavel apos criacao.';

CREATE TABLE IF NOT EXISTS public.document_extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('historico_salarial', 'ferias', 'faltas')),
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'running', 'success', 'failed')),
  extraction_error TEXT,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_extracted_data_document ON public.document_extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_category ON public.document_extracted_data(category);
CREATE INDEX IF NOT EXISTS idx_extracted_data_pending
  ON public.document_extracted_data(validation_status)
  WHERE validation_status = 'pending';

ALTER TABLE public.document_extracted_data ENABLE ROW LEVEL SECURITY;

-- RLS: replicar padrao de documents (acesso via dono do case).
CREATE POLICY "Users can view extracted data of their cases"
ON public.document_extracted_data FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = document_extracted_data.document_id
  AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert extracted data for their cases"
ON public.document_extracted_data FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = document_extracted_data.document_id
  AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can update extracted data of their cases"
ON public.document_extracted_data FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = document_extracted_data.document_id
  AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete extracted data of their cases"
ON public.document_extracted_data FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = document_extracted_data.document_id
  AND c.criado_por = auth.uid()
));

CREATE OR REPLACE FUNCTION public.touch_document_extracted_data()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_extracted_data_touch
  BEFORE UPDATE ON public.document_extracted_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_document_extracted_data();

COMMENT ON TABLE public.document_extracted_data IS
  'Linhas tipadas extraidas de documentos (1 doc = 1 categoria) para exportacao em CSV PJe-Calc Cidadao. Status de extracao + validacao humana.';
