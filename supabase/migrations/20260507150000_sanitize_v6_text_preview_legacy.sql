-- =====================================================
-- LGPD — redact retroativo de v6_text_preview legacy
-- =====================================================
-- F0.1 do prompt mestre. Aplica REDACTED em todo v6_text_preview gravado
-- antes do deploy do helper sanitizePII (process-document-mistral v15
-- e reprocess-v6 v4 gravaram texto cru).
--
-- Trade-off: perde-se sample de texto pra calibração desses docs antigos.
-- Mitigação: próximo Reprocessar V6 sobre eles repopula com texto JÁ
-- sanitizado pelo helper novo. Para os docs onde preview é necessário
-- pra debug, operador re-processa.
-- =====================================================

BEGIN;

UPDATE documents
SET metadata = jsonb_set(
  metadata,
  '{v6_text_preview}',
  '"[REDACTED_LEGACY_LGPD]"'::jsonb
)
WHERE metadata ? 'v6_text_preview'
  AND metadata->>'v6_text_preview' NOT LIKE '[REDACTED%';

COMMIT;
