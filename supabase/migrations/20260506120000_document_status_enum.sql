-- =====================================================
-- documents.status → enum (PR 5 v5)
-- =====================================================
-- Antes: documents.status era text livre. Inserts com strings fora do
-- conjunto observado quebravam silenciosamente o pipeline (UI ficava
-- esperando indefinidamente um status que nunca chegaria).
--
-- Agora: enum document_status com os 9 valores observados em produção.
-- Postgres rejeita inserts inválidos com erro claro.
--
-- IMPORTANTE: este migration assume que NENHUMA linha existente tem
-- status fora do conjunto. Validação prévia (rodar em staging primeiro):
--   SELECT DISTINCT status FROM documents;
-- =====================================================

BEGIN;

-- 1. Cria o enum
CREATE TYPE document_status AS ENUM (
  'uploaded',
  'processing',
  'ocr_pending',
  'ocr_running',
  'ocr_done',
  'ocr_failed',
  'chunk_pending',
  'failed',
  'rejected_unsupported_layout'
);

-- 2. Backup do tipo atual em coluna sombra (rollback fácil)
ALTER TABLE documents ADD COLUMN status_text_legacy text;
UPDATE documents SET status_text_legacy = status;

-- 3. Valida que todos os valores existentes batem com o enum
DO $$
DECLARE
  invalido text;
BEGIN
  SELECT DISTINCT status INTO invalido
  FROM documents
  WHERE status IS NOT NULL
    AND status NOT IN (
      'uploaded', 'processing', 'ocr_pending', 'ocr_running',
      'ocr_done', 'ocr_failed', 'chunk_pending', 'failed',
      'rejected_unsupported_layout'
    )
  LIMIT 1;
  IF invalido IS NOT NULL THEN
    RAISE EXCEPTION 'documents.status contém valor fora do enum: %', invalido;
  END IF;
END $$;

-- 4. Converte coluna text → enum
ALTER TABLE documents
  ALTER COLUMN status TYPE document_status
  USING status::document_status;

-- 5. Mantém coluna sombra por 1 release pra rollback rápido. Pode ser
-- removida em migration futura quando v5 estiver estável em prod.
COMMENT ON COLUMN documents.status_text_legacy IS
  'Backup do status text antes da conversão para enum (PR 5 v5). Remover após v5 estabilizar.';

COMMIT;
