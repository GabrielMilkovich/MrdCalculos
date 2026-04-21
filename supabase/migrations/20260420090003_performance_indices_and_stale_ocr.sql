-- ============================================================
-- Correções de performance + integridade
--   1. Índices faltantes para queries hot-path
--   2. Reset automático de OCR stale (documents stuck em 'ocr_running')
--   3. DOCUMENTAÇÃO: parse_holerite_from_ocr mantém DELETE global do
--      hist_salarial por design (holerite define rubricas do caso).
--      O parâmetro p_document_id escopeia apenas pjecalc_hist_salarial_mes.
-- ============================================================

-- 1. Índices ------------------------------------------------------------

-- pjecalc_liquidacao_resultado: query hot é ".eq(case_id).order(created_at DESC)"
-- usada em service.ts:284 e mrdstate-export.ts:68. Sem este índice, seq scan em
-- toda a tabela a cada liquidação.
CREATE INDEX IF NOT EXISTS idx_pjecalc_resultado_case_created
  ON public.pjecalc_liquidacao_resultado (case_id, created_at DESC);

-- pjecalc_hist_salarial_mes: ".eq(calculo_id).order(competencia)" (pjc-persist.ts:72)
-- Essencial: tabela chega a centenas de linhas por caso.
CREATE INDEX IF NOT EXISTS idx_hist_salarial_mes_calc_comp
  ON public.pjecalc_hist_salarial_mes (calculo_id, competencia);

-- pjecalc_cartao_ponto: chunked inserts ".eq(case_id, competencia)"
CREATE INDEX IF NOT EXISTS idx_cartao_ponto_case_comp
  ON public.pjecalc_cartao_ponto (case_id, competencia);

-- documents: OcrValidationList filtra ".eq(case_id, status)" a cada 3s
CREATE INDEX IF NOT EXISTS idx_documents_case_status
  ON public.documents (case_id, status);

-- pjecalc_ocorrencias: join frequente verba_id + competencia (ModuloOcorrencias)
CREATE INDEX IF NOT EXISTS idx_pjecalc_ocorrencias_verba_comp
  ON public.pjecalc_ocorrencias (verba_id, competencia);

-- 2. Reset de OCR stale -------------------------------------------------

-- Marca documentos com status='ocr_running' ou 'extracting' há > 30 min como
-- falhados, permitindo o usuário tentar novamente.
CREATE OR REPLACE FUNCTION public.reset_stale_ocr_documents()
RETURNS TABLE (document_id uuid, previous_status text, staleness_min int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_role text := auth.role();
  v_can_bypass boolean;
BEGIN
  -- Permite bypass para service_role e postgres (admin tooling)
  SELECT rolbypassrls INTO v_can_bypass FROM pg_roles WHERE rolname = current_user;
  IF v_role <> 'service_role' AND NOT COALESCE(v_can_bypass, false) THEN
    RAISE EXCEPTION 'Apenas service_role pode resetar OCR stale' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH updated AS (
    UPDATE public.documents d
    SET status = 'failed',
        error_message = COALESCE(d.error_message, '') ||
          ' [auto-reset após 30min em ' || d.status || ']',
        updated_at = now()
    WHERE d.status IN ('ocr_running', 'extracting')
      AND d.processing_started_at IS NOT NULL
      AND d.processing_started_at < now() - interval '30 minutes'
    RETURNING d.id, d.status AS prev_status,
              EXTRACT(EPOCH FROM (now() - d.processing_started_at))::int / 60 AS mins
  )
  SELECT u.id, u.prev_status, u.mins FROM updated u;
END $$;

COMMENT ON FUNCTION public.reset_stale_ocr_documents IS
  'Limpa documentos presos em ocr_running/extracting por >30min. Invocável por edge function scheduled ou via admin.';

-- 3. Check: colunas necessárias existem ---------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
      AND column_name = 'processing_started_at'
  ) THEN
    RAISE NOTICE 'Aviso: documents.processing_started_at não existe — reset_stale_ocr_documents precisará de ajuste';
  END IF;
END $$;
