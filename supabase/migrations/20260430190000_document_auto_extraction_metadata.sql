-- Auto-classificação de tipo de extração + auto-disparo com gate humano.
-- Adiciona 5 colunas em documents pra rastrear se o tipo veio de regex
-- automática ou foi escolhido manualmente, e se a extração foi auto-disparada.
-- Spec §5/§6 do briefing data_extraction.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tipo_extracao_origem TEXT NOT NULL DEFAULT 'manual'
  CHECK (tipo_extracao_origem IN ('manual', 'auto'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tipo_extracao_confianca TEXT
  CHECK (tipo_extracao_confianca IS NULL OR tipo_extracao_confianca IN ('alta', 'media', 'baixa'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tipo_extracao_motivos TEXT[];

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracao_origem TEXT NOT NULL DEFAULT 'manual'
  CHECK (extracao_origem IN ('manual', 'auto'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracao_skipped_reason TEXT;

COMMENT ON COLUMN public.documents.tipo_extracao_origem IS
  'manual = usuário escolheu; auto = regex pós-OCR detectou.';
COMMENT ON COLUMN public.documents.tipo_extracao_confianca IS
  'alta/media/baixa do score de regex. Auto-disparo só com alta.';
COMMENT ON COLUMN public.documents.tipo_extracao_motivos IS
  'Lista de sinais que dispararam a detecção (pra tooltip da UI).';
COMMENT ON COLUMN public.documents.extracao_origem IS
  'manual = usuário clicou Extrair; auto = ocr-document auto-disparou após OCR.';
COMMENT ON COLUMN public.documents.extracao_skipped_reason IS
  'rate_limit / low_confidence / etc — quando auto-detect não disparou auto-extração.';
