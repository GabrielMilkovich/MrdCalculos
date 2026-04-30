-- =====================================================
-- Recovery automático de OCR travado (definitivo)
-- =====================================================
-- Causa raiz: edge function ocr-document usa EdgeRuntime.waitUntil para
-- tasks de OCR (>150s wall-time). Quando 2+ tasks rodam concorrentemente,
-- o pool de isolates do Supabase fica saturado e tasks são killed
-- silenciosamente, deixando documents.status='ocr_running' indefinidamente.
--
-- Solução: cron job a cada 1 min reseta docs presos > 5 min.
-- Combina com fix client-side em DocumentsManager.tsx (polling de status
-- entre uploads pra serializar — evita o problema na origem).
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
      'OCR travado por mais de 5 minutos sem progresso. Provável: pool de isolates saturado por uploads concorrentes. Re-clique "Processar" para tentar novamente — se persistir, faça uploads em lotes menores.'),
    processing_completed_at = NOW(),
    updated_at = NOW()
  WHERE d.status IN ('ocr_running', 'processing')
    AND d.processing_started_at IS NOT NULL
    AND d.processing_started_at < NOW() - INTERVAL '5 minutes'
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
