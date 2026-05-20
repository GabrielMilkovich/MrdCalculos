-- pjecalc_parametros: colunas que o pjc-persist.ts grava mas que não existiam
-- na tabela. Sem essas colunas, o upsert era rejeitado por PostgREST com
-- "column does not exist", e o try/catch geral do persist engolia o erro
-- como mero warning, deixando o caso sem parâmetros e bloqueando Liquidar
-- com "Configure os Parâmetros primeiro."
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- Backfill no final cura casos órfãos (calculo persistido sem parametros).

ALTER TABLE public.pjecalc_parametros
  ADD COLUMN IF NOT EXISTS data_ajuizamento date,
  ADD COLUMN IF NOT EXISTS data_citacao date,
  ADD COLUMN IF NOT EXISTS data_inicial date,
  ADD COLUMN IF NOT EXISTS data_final date,
  ADD COLUMN IF NOT EXISTS regime_trabalho text DEFAULT 'tempo_integral',
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS prescricao_quinquenal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescricao_fgts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS projetar_aviso_indenizado boolean DEFAULT false;

-- Backfill: cura casos onde a importação .PJC criou pjecalc_calculos mas o
-- upsert de pjecalc_parametros falhou silenciosamente. Copia os campos
-- equivalentes do calculo para o parametros recém-criado.
-- regime_contrato 'INTEGRAL' → regime_trabalho 'tempo_integral' (default já é esse).
INSERT INTO public.pjecalc_parametros (
  case_id,
  data_admissao,
  data_demissao,
  data_ajuizamento,
  data_citacao,
  carga_horaria_padrao,
  regime_trabalho,
  estado,
  municipio,
  prescricao_quinquenal,
  prescricao_fgts,
  projetar_aviso_indenizado
)
SELECT
  c.case_id,
  c.data_admissao,
  c.data_demissao,
  c.data_ajuizamento,
  c.data_citacao,
  COALESCE((c.jornada_contratual_horas * 5)::int, 220),
  CASE
    WHEN lower(coalesce(c.regime_contrato, '')) = 'parcial' THEN 'tempo_parcial'
    WHEN lower(coalesce(c.regime_contrato, '')) = 'intermitente' THEN 'intermitente'
    ELSE 'tempo_integral'
  END,
  c.uf,
  c.municipio_ibge,
  COALESCE(c.prescricao_quinquenal, true),
  COALESCE(c.prescricao_fgts, false),
  COALESCE(c.projetar_aviso_indenizado, false)
FROM public.pjecalc_calculos c
WHERE c.case_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pjecalc_parametros p WHERE p.case_id = c.case_id
  );
