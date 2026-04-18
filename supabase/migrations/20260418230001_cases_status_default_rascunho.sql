-- ============================================================
-- cases.status: DEFAULT 'rascunho' + NOT NULL
--
-- Bug: CreateCaseDialog nao setava `status` no INSERT, e a coluna
-- nao tinha DEFAULT, entao o DB aceitava NULL -- o que quebrava o
-- CaseCard / CaseWorkspace ao acessar statusConfig[null].icon.
--
-- Fix em 2 camadas:
--   1. Normaliza rows existentes com status NULL -> 'rascunho'.
--   2. DEFAULT 'rascunho' + NOT NULL garante que qualquer INSERT
--      futuro (mesmo sem o campo) vai criar status valido.
-- ============================================================

UPDATE public.cases SET status='rascunho' WHERE status IS NULL;

ALTER TABLE public.cases
  ALTER COLUMN status SET DEFAULT 'rascunho',
  ALTER COLUMN status SET NOT NULL;

NOTIFY pgrst, 'reload schema';
