-- Sprint Hotfix bug #4 (importação PJC orchestrator reads):
--
-- A view `pjecalc_ocorrencias` originalmente expunha apenas `verba_base_id AS verba_id`,
-- ignorando completamente as ocorrências de REFLEXO (`reflexo_id`). O persist
-- (`pjc-persist.ts:264`) distingue corretamente entre `verba_base_id` (Calculada) e
-- `reflexo_id` (Reflexo), mas como a view filtrava só pelo primeiro, todas as
-- ocorrências de reflexo ficavam invisíveis no caminho de leitura — orfanizadas no banco.
--
-- Além disso, a coluna `indice_acumulado` (adicionada via migration 20260305015210
-- na tabela base) nunca foi exposta pela view, fazendo o motor V3 perder o índice
-- de correção pré-computado do PJe-Calc (ground truth) ao ler de volta.
--
-- Fix: CREATE OR REPLACE VIEW com:
--   - `COALESCE(verba_base_id, reflexo_id) AS verba_id` (unifica os 2 lados)
--   - colunas `verba_base_id` e `reflexo_id` expostas separadamente para que
--     o consumidor distinga reflexo vs principal quando precisar
--   - `indice_acumulado` exposto
--   - `base_integral`, `quantidade_integral`, `devido_integral`, `pago_integral`
--     também expostos (relevantes pra D1/D2 do motor)
--
-- Operação não-destrutiva (CREATE OR REPLACE). Preserva security_invoker=on.
-- PostgreSQL não permite renomear nem mudar tipos de colunas existentes via
-- REPLACE — por isso a ordem original é mantida e novas colunas vão ao final.

CREATE OR REPLACE VIEW public.pjecalc_ocorrencias AS
SELECT
  o.id,
  c.case_id,
  o.calculo_id,
  COALESCE(o.verba_base_id, o.reflexo_id) AS verba_id,
  o.nome AS verba_nome,
  o.competencia,
  o.base_valor,
  o.multiplicador AS multiplicador_valor,
  o.divisor AS divisor_valor,
  o.quantidade AS quantidade_valor,
  o.dobra,
  o.devido,
  o.pago,
  o.diferenca,
  o.correcao,
  o.juros,
  o.total,
  o.origem,
  o.ativa,
  o.created_at,
  o.updated_at,
  -- Novas colunas (Sprint Hotfix bug #4):
  o.verba_base_id,
  o.reflexo_id,
  o.indice_acumulado,
  o.base_integral,
  o.quantidade_integral,
  o.devido_integral,
  o.pago_integral
FROM public.pjecalc_ocorrencia_calculo o
JOIN public.pjecalc_calculos c ON o.calculo_id = c.id;

ALTER VIEW public.pjecalc_ocorrencias SET (security_invoker = on);
