-- =====================================================
-- V6: colunas dedicadas para resultado do extrator geométrico
-- =====================================================
-- Antes: pipeline V5 = Mistral OCR → regex parser → resultado em memória.
--        V6 era observabilidade pura (gravava em metadata jsonb).
-- Agora: V6 grava resultado pronto em `parsed` jsonb. Quando presente,
--        o client pula o parser regex (V5) e consome direto. ocr_text
--        é populado com o textoCompleto do extrator (debug/UI).
--
-- Compatibilidade: colunas opcionais. Documentos antigos seguem com V5.
-- Quando v6 falha (mapper null, score baixo) → parsed permanece NULL,
-- pipeline V5 continua funcionando.
-- =====================================================

BEGIN;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS parsed jsonb,
  ADD COLUMN IF NOT EXISTS parsed_by text,
  ADD COLUMN IF NOT EXISTS ocr_provider text;

COMMENT ON COLUMN documents.parsed IS
  'Resultado do extrator geométrico V6 (apuracoes/competencias serializado). NULL = pipeline V5 (regex sobre OCR Mistral) continua sendo a fonte.';
COMMENT ON COLUMN documents.parsed_by IS
  'Slug do mapper V6 que produziu o resultado (ex: cartao_via_varejo_v1, cartao_generico_v1).';
COMMENT ON COLUMN documents.ocr_provider IS
  'Provedor do texto: pdfjs_geometric (V6) ou mistral (V5).';

-- Index parcial — só V6 sucessos. Útil pra dashboards de telemetria.
CREATE INDEX IF NOT EXISTS idx_documents_parsed_by
  ON documents(parsed_by)
  WHERE parsed_by IS NOT NULL;

COMMIT;
