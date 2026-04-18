-- ============================================================
-- FIX: função update_updated_at_column() robusta a ambos nomes
--
-- Problema: a função `public.update_updated_at_column()` foi criada
-- originalmente para tabelas com coluna `atualizado_em` (ex: cases,
-- petitions). Mas foi aplicada (via trigger criada fora deste repo,
-- possivelmente no dashboard) em tabelas com a coluna `updated_at`
-- (ex: pjecalc_calculos), resultando no erro:
--   "record 'new' has no field 'atualizado_em'"
--   ao fazer INSERT/UPDATE em pjecalc_calculos (import .PJC).
--
-- Correção: reescreve a função usando `hstore` para setar o timestamp
-- dinamicamente. O operador `#=` ignora chaves que não existem no
-- rowtype do NEW, permitindo que a MESMA função funcione em:
--   - cases / petitions (coluna 'atualizado_em')
--   - pjecalc_calculos / documents (coluna 'updated_at')
-- ============================================================

-- Extensão necessária para `record #= hstore`.
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Tenta atualizar 'atualizado_em' (pt). Se a coluna existir no tipo
  -- do NEW, é definida; caso contrário, é ignorada silenciosamente.
  BEGIN
    NEW := NEW #= hstore('atualizado_em', now()::text);
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- Tenta atualizar 'updated_at' (en).
  BEGIN
    NEW := NEW #= hstore('updated_at', now()::text);
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column()
  IS 'Trigger genérica que atualiza atualizado_em OU updated_at automaticamente, conforme a coluna existente na tabela-alvo. Robusta a nomes pt/en.';
