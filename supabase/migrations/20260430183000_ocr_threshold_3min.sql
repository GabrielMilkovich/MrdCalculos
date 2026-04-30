-- =====================================================
-- Ajuste de threshold: 5 min → 3 min
-- =====================================================
-- OCRs reais via Mistral OCR completam em 6-15s (medido em 9 docs
-- anteriores). 5 min era frustração de UX sem ganho real. 3 min = 18x
-- tempo típico, ainda lenient pra PDFs atípicos.
-- =====================================================

CREATE OR REPLACE FUNCTION public.recover_stale_ocr_documents()
RETURNS TABLE(id uuid, file_name text, stale_seconds int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.documents d
  SET
    status = 'ocr_failed',
    error_message = COALESCE(d.error_message,
      'OCR travado por mais de 3 minutos sem progresso. OCRs típicos completam em 10-15s. Provável: pool de isolates do Supabase saturado, Mistral API timeout, ou edge runtime killou o background task. Re-clique "Processar" para tentar novamente — se persistir, verifique tamanho do PDF (>50MB) ou faça upload de um PDF por vez.'),
    processing_completed_at = NOW(),
    updated_at = NOW()
  WHERE d.status IN ('ocr_running', 'processing')
    AND d.processing_started_at IS NOT NULL
    AND d.processing_started_at < NOW() - INTERVAL '3 minutes'
  RETURNING d.id, d.file_name, EXTRACT(EPOCH FROM (NOW() - d.processing_started_at))::int;
END;
$$;
