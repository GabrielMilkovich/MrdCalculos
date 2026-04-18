-- ============================================================
-- cases.arquivado: sinalizador para ocultar casos da lista principal
--
-- `arquivado` + `arquivado_em` permitem que o usuario "arquive"
-- um caso sem excluir. A UI filtra arquivados por default e tem
-- uma aba "Arquivados" pra reabrir ou excluir definitivamente.
--
-- Index parcial: so indexa `arquivado = false` (ativo), que e
-- o caso de leitura quente.
-- ============================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

CREATE INDEX IF NOT EXISTS cases_arquivado_idx ON public.cases(arquivado) WHERE arquivado = false;

NOTIFY pgrst, 'reload schema';
