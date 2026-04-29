-- P0-1 fix: colunas OCR usadas pela UI mas ausentes na DB.
-- Sintoma anterior: DocumentsManager/DocumentOcrValidation/ocr-document tentavam
-- .select("ocr_text, ocr_validated, ...") e UPDATE em colunas inexistentes,
-- documento ficava preso em status='ocr_running' sem texto persistido.
-- Refs: src/components/cases/DocumentsManager.tsx:215-217,810-814
--       src/components/cases/DocumentOcrValidation.tsx:108,171,214-216,229,294,313,342
--       supabase/functions/ocr-document/index.ts (UPDATE ocr_text/ocr_validated_by)

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ocr_text          TEXT,
  ADD COLUMN IF NOT EXISTS ocr_validated     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ocr_validated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ocr_validated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.documents.ocr_text         IS 'Texto bruto extraido por OCR (Mistral) ou PDF nativo. Persistido para revisao humana e re-extracao.';
COMMENT ON COLUMN public.documents.ocr_validated    IS 'true quando humano confirmou o OCR via DocumentOcrValidation.';
COMMENT ON COLUMN public.documents.ocr_validated_at IS 'Timestamp da confirmacao humana.';
COMMENT ON COLUMN public.documents.ocr_validated_by IS 'Usuario que confirmou. NULL se ainda nao validado.';

-- Indice para listagens que filtram por documentos pendentes de validacao.
CREATE INDEX IF NOT EXISTS idx_documents_ocr_validated
  ON public.documents (case_id, ocr_validated)
  WHERE ocr_validated = false;
