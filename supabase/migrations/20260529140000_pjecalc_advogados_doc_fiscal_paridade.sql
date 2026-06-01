-- Seção 3 (Advogados): paridade com Advogado.java — documento fiscal genérico
-- (tipo CPF/CNPJ/CEI + número), que o MRD não tinha (só `cpf`). Aditiva/reversível.
-- Aplicada via MCP em xhvlhrgfoeahgofhljbs (MRDCALCC) 2026-05-29.
-- O `cpf` existente é mantido (retrocompat); numero_documento é o campo de paridade.
ALTER TABLE public.pjecalc_advogados
  ADD COLUMN IF NOT EXISTS tipo_documento  text DEFAULT 'CPF',   -- TipoDocumentoFiscalEnum (Advogado.java:57-59)
  ADD COLUMN IF NOT EXISTS numero_documento text;                -- Advogado.java:60-61 (SNRDOCFISCALADVOGADO)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_advogados_tipo_doc_chk') THEN
    ALTER TABLE public.pjecalc_advogados ADD CONSTRAINT pjecalc_advogados_tipo_doc_chk
      CHECK (tipo_documento IS NULL OR tipo_documento IN ('CPF','CNPJ','CEI'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
