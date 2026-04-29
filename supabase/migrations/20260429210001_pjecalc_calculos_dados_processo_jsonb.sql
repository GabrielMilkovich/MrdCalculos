-- =====================================================
-- ModuloParametrosGerais — bloco CNJ persistente em jsonb
-- =====================================================
--
-- Adiciona coluna jsonb `dados_processo` em pjecalc_calculos para
-- persistir os campos do bloco CNJ exibido em ModuloParametrosGerais
-- (paridade UI com PJe-Calc oficial). Usa namespace cnj_* nas chaves.
-- Esta abordagem evita acoplar a UI à view pjecalc_dados_processo e
-- mantém os campos junto à linha mestre do cálculo.
-- =====================================================

ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS dados_processo JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pjecalc_calculos.dados_processo IS
  'Bloco CNJ de identificação do processo (paridade PJe-Calc): chaves cnj_numero_processo, cnj_valor_causa, cnj_tribunal, cnj_justica, cnj_vara, cnj_doc_previdenciario.';

NOTIFY pgrst, 'reload schema';
