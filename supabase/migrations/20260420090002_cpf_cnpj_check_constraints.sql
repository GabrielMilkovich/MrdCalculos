-- ============================================================
-- LGPD hygiene: CHECK constraints em colunas de CPF/CNPJ/PIS.
--
-- Objetivo: rejeitar valores claramente malformados antes de serem
-- persistidos (ex.: OCR ruim, campo misturado). Isso NÃO substitui
-- validação de checkdigit (que fica no app), apenas garante formato
-- mínimo (11 dígitos CPF, 14 CNPJ, 11 PIS/PASEP) com limpeza de
-- máscara permitida.
--
-- Uso de helpers:
--   is_valid_cpf_format(text)   -> 11 dígitos pós-strip
--   is_valid_cnpj_format(text)  -> 14 dígitos pós-strip
--   is_valid_pis_format(text)   -> 11 dígitos pós-strip
--
-- As constraints são ADD IF NOT EXISTS via DO block porque PG ainda
-- não suporta IF NOT EXISTS em ADD CONSTRAINT.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_valid_cpf_format(v text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT v IS NULL OR regexp_replace(v, '\D', '', 'g') ~ '^\d{11}$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_cnpj_format(v text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT v IS NULL OR regexp_replace(v, '\D', '', 'g') ~ '^\d{14}$';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_pis_format(v text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT v IS NULL OR regexp_replace(v, '\D', '', 'g') ~ '^\d{11}$';
$$;

-- Adicionar constraints apenas se colunas existirem E constraint ainda não existir.
-- CASOS:
--   pjecalc_calculos.reclamante_cpf / reclamado_cnpj
--   cases.* se houver
--   pjecalc_participantes.cpf / cnpj / pis (se coluna existir)
DO $$
DECLARE
  r record;
BEGIN
  -- pjecalc_calculos.reclamante_cpf
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pjecalc_calculos'
      AND column_name = 'reclamante_cpf'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_calculos_reclamante_cpf_format'
  ) THEN
    EXECUTE 'ALTER TABLE public.pjecalc_calculos
             ADD CONSTRAINT pjecalc_calculos_reclamante_cpf_format
             CHECK (public.is_valid_cpf_format(reclamante_cpf)) NOT VALID';
  END IF;

  -- pjecalc_calculos.reclamado_cnpj
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pjecalc_calculos'
      AND column_name = 'reclamado_cnpj'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_calculos_reclamado_cnpj_format'
  ) THEN
    EXECUTE 'ALTER TABLE public.pjecalc_calculos
             ADD CONSTRAINT pjecalc_calculos_reclamado_cnpj_format
             CHECK (public.is_valid_cnpj_format(reclamado_cnpj)) NOT VALID';
  END IF;

  -- document_format_patterns.cnpj (learning system)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_format_patterns'
      AND column_name = 'cnpj'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_format_patterns_cnpj_format'
  ) THEN
    EXECUTE 'ALTER TABLE public.document_format_patterns
             ADD CONSTRAINT document_format_patterns_cnpj_format
             CHECK (public.is_valid_cnpj_format(cnpj)) NOT VALID';
  END IF;
END $$;

-- NOT VALID: constraint aplica-se apenas a rows futuras. Para validar as
-- existentes, rodar manualmente (fora desta migration, para evitar falhar
-- deploy em dados legados):
--   ALTER TABLE public.pjecalc_calculos VALIDATE CONSTRAINT pjecalc_calculos_reclamante_cpf_format;
--   etc.

COMMENT ON FUNCTION public.is_valid_cpf_format IS
  'Formato: 11 dígitos após strip de máscara. NULL é aceito. Não valida checkdigit.';
COMMENT ON FUNCTION public.is_valid_cnpj_format IS
  'Formato: 14 dígitos após strip de máscara. NULL é aceito. Não valida checkdigit.';
COMMENT ON FUNCTION public.is_valid_pis_format IS
  'Formato: 11 dígitos após strip de máscara. NULL é aceito. Não valida checkdigit.';
