-- Adiciona cartao_ponto como tipo válido + layout_usado pra rastrear qual
-- parser determinístico foi escolhido (via_varejo_v1, generico_v1, etc).
-- Atualiza extracao_origem pra incluir 'import_csv' (paste de planilha).

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_tipo_extracao_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tipo_extracao_check
  CHECK (tipo_extracao IN ('nao_extrair', 'holerite', 'recibo_ferias', 'registro_faltas', 'cartao_ponto'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS layout_usado TEXT;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_extracao_origem_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_extracao_origem_check
  CHECK (extracao_origem IN ('manual', 'auto', 'import_csv'));
