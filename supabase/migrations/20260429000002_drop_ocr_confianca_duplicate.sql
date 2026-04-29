-- P0-2 fix: remover coluna duplicada `ocr_confianca` (numeric).
-- Existe `ocr_confidence` desde 2026-01-24 e `ocr_confianca` foi adicionada em paralelo
-- na mesma migration (20260124124001) — duplicidade que confunde codigo (ora le um, ora outro).
-- Estrategia:
--   1) Migrar quaisquer valores ainda presentes em `ocr_confianca` para `ocr_confidence`
--      quando este estiver NULL (preferindo o nao-nulo entre os dois).
--   2) DROP da coluna `ocr_confianca`.
-- Codigo cliente continuara funcionando: src/lib/pjecalc/domain-audit.ts e CaseBriefing.tsx
-- ja faziam fallback `ocr_confidence ?? ocr_confianca`; a partir desta migration sempre
-- existira so `ocr_confidence`.
-- Refs:
--   supabase/migrations/20260124124001_*.sql:126 (origem da duplicidade)
--   supabase/functions/extract-and-fill/index.ts:1851 (escrevia em ambos — sera ajustado)
--   supabase/functions/ocr-document/index.ts:806 (escrevia em ambos — sera ajustado)

-- 1. Migrar dados se necessario
UPDATE public.documents
SET ocr_confidence = ocr_confianca
WHERE ocr_confidence IS NULL
  AND ocr_confianca IS NOT NULL;

-- 2. Drop da coluna duplicada
ALTER TABLE public.documents
  DROP COLUMN IF EXISTS ocr_confianca;

COMMENT ON COLUMN public.documents.ocr_confidence IS
  'Confianca media (0-1) do OCR. Antes coexistia com ocr_confianca (numeric 5,2) — consolidado em ocr_confidence apos migration 20260429000002.';
