-- View pjecalc_liquidacao_resultado expunha colunas com nomes diferentes do
-- que o TS espera (PjecalcLiquidacaoResultadoRow em src/lib/pjecalc/types.ts).
-- Causava ModuloResumo:617 ler `resultado?.resultado` como undefined → res=null
-- → tela mostrava "Configure os módulos e clique em Liquidar" mesmo quando a
-- liquidação já havia gravado o resultado em pjecalc_resultado.
--
-- Fix: aliasar resumo_verbas AS resultado, calculado_em AS data_liquidacao,
-- e expor status como NULL (placeholder — coluna pode ser adicionada futuramente).

DROP VIEW IF EXISTS public.pjecalc_liquidacao_resultado CASCADE;
DROP VIEW IF EXISTS public.pjecalc_liquidacao CASCADE;

CREATE VIEW public.pjecalc_liquidacao_resultado AS
SELECT
  r.id,
  r.calculo_id,
  r.case_id,
  r.total_bruto,
  r.total_pago,
  r.total_diferenca,
  r.total_correcao,
  r.total_juros,
  r.total_liquido_antes_descontos,
  r.total_liquido_antes_descontos AS total_liquido,
  r.desconto_inss_reclamante,
  r.desconto_ir,
  r.desconto_inss_reclamado,
  r.honorarios,
  r.custas,
  r.multa_477,
  r.multa_467,
  r.fgts_depositar,
  r.fgts_multa_40,
  r.total_reclamante,
  r.total_reclamado,
  r.engine_version,
  r.calculado_em,
  r.calculado_em AS data_liquidacao,
  r.hash_resultado,
  r.resumo_verbas,
  r.resumo_verbas AS resultado,
  r.created_at,
  NULL::text AS status
FROM public.pjecalc_resultado r;

CREATE VIEW public.pjecalc_liquidacao AS
SELECT
  r.id, r.calculo_id, r.case_id,
  r.total_bruto, r.total_pago, r.total_diferenca, r.total_correcao, r.total_juros,
  r.total_liquido_antes_descontos, r.desconto_inss_reclamante, r.desconto_ir,
  r.desconto_inss_reclamado, r.honorarios, r.custas, r.multa_477, r.multa_467,
  r.fgts_depositar, r.fgts_multa_40, r.total_reclamante, r.total_reclamado,
  r.engine_version, r.calculado_em, r.hash_resultado, r.resumo_verbas, r.created_at
FROM public.pjecalc_resultado r;
