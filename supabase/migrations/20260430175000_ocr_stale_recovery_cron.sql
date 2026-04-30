-- =====================================================
-- Recovery automático de OCR travado (definitivo)
-- =====================================================
-- Causa raiz: edge function ocr-document usa EdgeRuntime.waitUntil para
-- tasks de OCR (>150s wall-time). Background tasks são killed silently
-- por: (a) pool de isolates saturado, (b) Mistral API timeout, ou (c)
-- edge runtime cap. Sintoma: documents.status='ocr_running' indefinidamente
-- com ocr_chunks_done=1/total=1 mas sem update final.
--
-- Threshold: 3 min. OCRs reais via Mistral completam em 6-15s (medido em
-- 9 docs anteriores, incluindo PDF de 78 páginas em 12.5s). 3 min = 18x
-- tempo típico, ainda lenient pra arquivos atípicos.
--
-- Combina com fix client-side em DocumentsManager.tsx (polling sequencial
-- entre uploads — evita o problema na origem).
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

COMMENT ON FUNCTION public.recover_stale_ocr_documents() IS
  'Reseta documentos travados em ocr_running/processing há > 5 min. Marca como ocr_failed com mensagem acionável. Idempotente — seguro chamar a qualquer momento. Agendado via pg_cron a cada 1 min.';

-- Agenda execução automática a cada 1 minuto via pg_cron
DO $$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'recover_stale_ocr_every_minute';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule('recover_stale_ocr_every_minute');
  END IF;

  PERFORM cron.schedule(
    'recover_stale_ocr_every_minute',
    '* * * * *',
    $cron$SELECT public.recover_stale_ocr_documents();$cron$
  );
END;
$$;
