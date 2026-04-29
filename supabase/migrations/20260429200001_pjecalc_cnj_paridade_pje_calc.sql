-- =====================================================
-- Paridade UI MRD Calc vs PJe-Calc oficial — Identificação CNJ formal
-- =====================================================
--
-- Adiciona colunas para os campos visíveis nos prints do PJe-Calc oficial
-- na seção "Identificação do Processo" do módulo Parâmetros Gerais:
--   - numero_cnj / digito_cnj / ano_cnj   (CNJ decomposto)
--   - justica                              (TRABALHO/FEDERAL/ESTADUAL)
--   - tribunal                             (TRT01..TRT24, etc.)
--   - valor_causa                          (monetário, NUMERIC(14,2))
--   - doc_previdenciario                   (PIS/PASEP/NIT/CTPS do reclamante)
--   - reclamados                           (jsonb — lista de reclamados +
--                                           seus advogados, paridade
--                                           com a grade do print)
--
-- Nota: a tabela já tem colunas legacy (numero_processo, vara, etc.) que
-- são mantidas; estas novas refletem a decomposição CNJ exibida no
-- formulário oficial.
-- =====================================================

ALTER TABLE public.pjecalc_dados_processo
  ADD COLUMN IF NOT EXISTS numero_cnj TEXT,
  ADD COLUMN IF NOT EXISTS digito_cnj TEXT,
  ADD COLUMN IF NOT EXISTS ano_cnj TEXT,
  ADD COLUMN IF NOT EXISTS justica TEXT,
  ADD COLUMN IF NOT EXISTS tribunal TEXT,
  ADD COLUMN IF NOT EXISTS valor_causa NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS doc_previdenciario TEXT,
  ADD COLUMN IF NOT EXISTS reclamados JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pjecalc_dados_processo.numero_cnj IS
  'Número (parte 1 do CNJ) — paridade com PJe-Calc.';
COMMENT ON COLUMN public.pjecalc_dados_processo.digito_cnj IS
  'Dígito verificador CNJ.';
COMMENT ON COLUMN public.pjecalc_dados_processo.ano_cnj IS
  'Ano CNJ (4 dígitos).';
COMMENT ON COLUMN public.pjecalc_dados_processo.justica IS
  'Tipo de Justiça: TRABALHO | FEDERAL | ESTADUAL.';
COMMENT ON COLUMN public.pjecalc_dados_processo.tribunal IS
  'Tribunal (ex.: TRT01..TRT24).';
COMMENT ON COLUMN public.pjecalc_dados_processo.valor_causa IS
  'Valor da causa em reais — paridade com PJe-Calc (NUMERIC(14,2)).';
COMMENT ON COLUMN public.pjecalc_dados_processo.doc_previdenciario IS
  'PIS/PASEP/NIT/CTPS do reclamante.';
COMMENT ON COLUMN public.pjecalc_dados_processo.reclamados IS
  'Array JSONB de reclamados; cada um com nome, doc_fiscal, doc_prev e advogados[].';

-- Reflect to PostgREST schema cache
NOTIFY pgrst, 'reload schema';
