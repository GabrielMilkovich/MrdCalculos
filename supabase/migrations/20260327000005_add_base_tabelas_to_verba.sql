
-- ============================================================
-- Adicionar coluna base_tabelas a pjecalc_verba_base
-- Permite que verbas especifiquem tabelas de referência para
-- cálculo da base (ex: 'salario_minimo' para insalubridade).
--
-- Atualiza a view pjecalc_verbas para expor base_tabelas
-- na propriedade base_calculo.tabelas (consumida pelo engine).
--
-- Atualiza o trigger de INSERT para persistir base_tabelas
-- a partir da propriedade base_calculo.tabelas.
-- ============================================================

-- 1. Adicionar coluna à tabela base
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS base_tabelas text[] DEFAULT '{}';

-- 2. Atualizar a view para expor base_tabelas
CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END AS tipo,
  v.multiplicador,
  v.divisor AS divisor_informado,
  v.periodo_inicio::text AS periodo_inicio,
  v.periodo_fim::text AS periodo_fim,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  v.verba_principal_id,
  v.valor,
  v.valor_informado_devido,
  v.valor_informado_pago,
  v.hist_salarial_nome,
  jsonb_build_object(
    'historicos', COALESCE(
      (SELECT jsonb_agg(hs.id)
       FROM pjecalc_hist_salarial hs
       WHERE hs.calculo_id = v.calculo_id AND hs.nome = v.hist_salarial_nome),
      '[]'::jsonb
    ),
    'tabelas', COALESCE(to_jsonb(v.base_tabelas), '[]'::jsonb),
    'verbas', CASE
      WHEN v.verba_principal_id IS NOT NULL THEN jsonb_build_array(v.verba_principal_id)
      ELSE '[]'::jsonb
    END
  ) AS base_calculo,
  '{}'::jsonb AS incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

-- 3. Atualizar trigger de INSERT para persistir base_tabelas
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid UUID;
  v_tabelas text[];
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);

  -- Extrair base_tabelas de base_calculo.tabelas (se fornecido)
  IF NEW.base_calculo IS NOT NULL AND NEW.base_calculo ? 'tabelas' THEN
    SELECT array_agg(t::text)
    INTO v_tabelas
    FROM jsonb_array_elements_text(NEW.base_calculo->'tabelas') t;
  ELSE
    v_tabelas := '{}';
  END IF;

  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago,
    base_tabelas
  )
  VALUES (
    v_cid, NEW.nome, NEW.codigo,
    COALESCE(NEW.caracteristica, 'COMUM'),
    COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1),
    COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date,
    NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0),
    COALESCE(NEW.ativa, true),
    NEW.observacoes,
    NEW.hist_salarial_nome,
    NEW.verba_principal_id,
    COALESCE(NEW.valor, 'calculado'),
    NEW.valor_informado_devido,
    NEW.valor_informado_pago,
    v_tabelas
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;
