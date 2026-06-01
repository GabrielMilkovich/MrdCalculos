-- Seção 1 — modo_calculo como coluna real (ADC 58 / modo do cálculo).
-- orchestrator.ts:1613 já lê dadosProcesso.modo_calculo esperando coluna real;
-- até agora inexistente (sempre caía no fallback 'independent'). Aditiva e reversível.
-- Aplicada via MCP em xhvlhrgfoeahgofhljbs (MRDCALCC) em 2026-05-29.
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS modo_calculo text DEFAULT 'independent';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_modo_calculo_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_modo_calculo_chk
      CHECK (modo_calculo IS NULL OR modo_calculo IN ('assisted_from_pjc','independent'));
  END IF;
END $$;
CREATE OR REPLACE VIEW public.pjecalc_dados_processo AS
SELECT id, case_id, processo_cnj, vara, tribunal, instancia, fase,
       data_admissao, data_demissao, data_ajuizamento, data_citacao,
       data_inicio_calculo, data_fim_calculo, data_liquidacao, tipo_demissao,
       reclamante_nome, reclamante_cpf, reclamado_nome, reclamado_cnpj,
       created_at, updated_at,
       tipo_calculo, valor_causa, data_autuacao,
       reclamante_doc_tipo, reclamante_pis_nit, reclamante_pis_nit_tipo, reclamado_doc_tipo,
       modo_calculo
FROM public.pjecalc_calculos;
NOTIFY pgrst, 'reload schema';
