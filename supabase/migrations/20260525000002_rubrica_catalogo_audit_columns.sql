-- Sprint 2: Colunas de auditoria em rubrica_catalogo.
-- Decisões Q2/Q3: todo operador pode adicionar, com auditoria obrigatória
-- e flag de revisão por admin.
--
-- Plano: docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md Sprint 2

ALTER TABLE public.rubrica_catalogo
  ADD COLUMN IF NOT EXISTS adicionado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS adicionado_em timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS justificativa text,
  ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rubrica_catalogo.adicionado_por IS
  'UUID do operador que criou/classificou esta rubrica manualmente';
COMMENT ON COLUMN public.rubrica_catalogo.revisado IS
  'true = admin aprovou a classificação; false = pendente de revisão';
