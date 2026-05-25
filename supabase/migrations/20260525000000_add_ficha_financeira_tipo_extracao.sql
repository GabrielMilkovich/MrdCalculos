-- Sprint 1 Tarefa 1.1: Adiciona 'ficha_financeira' ao CHECK constraint de
-- documents.tipo_extracao. Tipo é text (não enum), constraint existente:
--   documents_tipo_extracao_check CHECK (tipo_extracao = ANY (ARRAY[...]))
--
-- Plano: docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md Sprint 1

BEGIN;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_tipo_extracao_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tipo_extracao_check
  CHECK (tipo_extracao = ANY (ARRAY[
    'nao_extrair'::text,
    'holerite'::text,
    'cartao_ponto'::text,
    'ctps'::text,
    'ficha_financeira'::text
  ]));

COMMIT;
