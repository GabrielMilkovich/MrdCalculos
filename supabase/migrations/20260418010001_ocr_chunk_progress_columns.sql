-- ============================================================
-- OCR com chunking: colunas de progresso na tabela `documents`
--
-- Suporta o novo pipeline `ocr-document` (Mistral OCR):
--   ocr_chunks_total  — quantidade de sub-PDFs criados no split
--   ocr_chunks_done   — chunks concluídos com sucesso
--   ocr_chunks_failed — chunks que falharam após todos os retries
--
-- O status 'ocr_partial' aparece quando chunks_failed > 0 mas chunks_done > 0.
-- UI pode renderizar barra de progresso: (done + failed) / total × 100.
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ocr_chunks_total  integer,
  ADD COLUMN IF NOT EXISTS ocr_chunks_done   integer,
  ADD COLUMN IF NOT EXISTS ocr_chunks_failed integer;

COMMENT ON COLUMN public.documents.ocr_chunks_total
  IS 'Quantidade de sub-PDFs criados no split (ocr-document). NULL quando não houve split.';
COMMENT ON COLUMN public.documents.ocr_chunks_done
  IS 'Chunks OCRizados com sucesso. Usado em barra de progresso da UI.';
COMMENT ON COLUMN public.documents.ocr_chunks_failed
  IS 'Chunks que falharam após todos os retries. Se > 0, status vira ocr_partial.';
