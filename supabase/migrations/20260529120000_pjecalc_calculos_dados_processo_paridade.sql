-- Seção 1 — Dados do Processo: campos de paridade PJe-Calc Cidadão v2.15.1
-- Aditiva e reversível. Base: pjecalc_calculos (tabela). View: pjecalc_dados_processo.
-- Origem dos campos: docs/specs/dados-do-processo.md (citações Java arquivo:linha).
-- Aplicada via MCP em xhvlhrgfoeahgofhljbs (MRDCALCC) em 2026-05-29.

ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS tipo_calculo            text DEFAULT 'ADVOGADO',   -- TipoCalculoEnum (Calculo.java:290-294)
  ADD COLUMN IF NOT EXISTS valor_causa             numeric(19,2),             -- Processo.java:72 (MVLCAUSA precision 19,2)
  ADD COLUMN IF NOT EXISTS data_autuacao           date,                      -- Processo.java:75 (DDTAUTUACAO)
  ADD COLUMN IF NOT EXISTS reclamante_doc_tipo     text DEFAULT 'CPF',        -- TipoDocumentoFiscalEnum
  ADD COLUMN IF NOT EXISTS reclamante_pis_nit      text,                      -- Reclamante.java:38-40 (doc previdenciário)
  ADD COLUMN IF NOT EXISTS reclamante_pis_nit_tipo text DEFAULT 'PIS',        -- TipoDocumentoPrevidenciarioEnum
  ADD COLUMN IF NOT EXISTS reclamado_doc_tipo      text DEFAULT 'CNPJ';       -- TipoDocumentoFiscalEnum

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_tipo_calculo_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_tipo_calculo_chk
      CHECK (tipo_calculo IS NULL OR tipo_calculo IN ('ADVOGADO','CREDOR','DEVEDOR','VARA','GABINETE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_recl_doc_tipo_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_recl_doc_tipo_chk
      CHECK (reclamante_doc_tipo IS NULL OR reclamante_doc_tipo IN ('CPF','CNPJ','CEI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_recld_doc_tipo_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_recld_doc_tipo_chk
      CHECK (reclamado_doc_tipo IS NULL OR reclamado_doc_tipo IN ('CPF','CNPJ','CEI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_recl_pisnit_tipo_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_recl_pisnit_tipo_chk
      CHECK (reclamante_pis_nit_tipo IS NULL OR reclamante_pis_nit_tipo IN ('PIS','PASEP','NIT'));
  END IF;
END $$;

-- Expandir a view mantendo as 21 colunas originais NA MESMA ORDEM (regra do
-- CREATE OR REPLACE VIEW: só permite ANEXAR colunas ao final) + 7 novas.
CREATE OR REPLACE VIEW public.pjecalc_dados_processo AS
SELECT id, case_id, processo_cnj, vara, tribunal, instancia, fase,
       data_admissao, data_demissao, data_ajuizamento, data_citacao,
       data_inicio_calculo, data_fim_calculo, data_liquidacao, tipo_demissao,
       reclamante_nome, reclamante_cpf, reclamado_nome, reclamado_cnpj,
       created_at, updated_at,
       tipo_calculo, valor_causa, data_autuacao,
       reclamante_doc_tipo, reclamante_pis_nit, reclamante_pis_nit_tipo, reclamado_doc_tipo
FROM public.pjecalc_calculos;

NOTIFY pgrst, 'reload schema';
