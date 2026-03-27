
-- ============================================================
-- Fix pjecalc_verbas VIEW: expose missing engine-critical fields
-- from pjecalc_verba_base and fix INSERT trigger to persist them.
--
-- Fields silently lost in INSERT → now persisted:
--   tipo_divisor / divisor_tipo
--   tipo_quantidade / quantidade_tipo
--   fracao_mes_modo
--   compor_principal
--   gerar_verba_reflexa / gerar_principal
--   gerar_verba_principal / gerar_reflexo
--   exclusoes (faltas_justificadas, faltas_nao_justificadas, ferias_gozadas)
--   comportamento_reflexo
--   periodo_media_reflexo
--   quantidade_proporcionalizar
--   hora_noturna_ficticia
--   constante_mensal
-- ============================================================

-- 1. Ensure columns exist on underlying table
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS fracao_mes_modo TEXT DEFAULT 'manter_fracao',
  ADD COLUMN IF NOT EXISTS comportamento_reflexo TEXT,
  ADD COLUMN IF NOT EXISTS periodo_media_reflexo TEXT,
  ADD COLUMN IF NOT EXISTS quantidade_proporcionalizar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hora_noturna_ficticia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS constante_mensal NUMERIC;

-- 2. Rebuild view to expose all engine-critical columns
DROP VIEW IF EXISTS pjecalc_verbas;

CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade                           AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END                                        AS tipo,
  v.multiplicador,
  v.divisor                                  AS divisor_informado,
  v.periodo_inicio::text                     AS periodo_inicio,
  v.periodo_fim::text                        AS periodo_fim,
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
  -- Engine-critical fields (previously lost)
  v.divisor_tipo,
  v.quantidade_tipo,
  v.quantidade_valor,
  v.fracao_mes_modo,
  v.compor_principal,
  v.gerar_principal,
  v.gerar_reflexo,
  v.excluir_falta_justificada,
  v.excluir_falta_nao_justificada,
  v.excluir_ferias_gozadas,
  v.comportamento_reflexo,
  v.periodo_media_reflexo,
  v.quantidade_proporcionalizar,
  v.hora_noturna_ficticia,
  v.constante_mensal,
  -- base_calculo JSON (for backward compat + tabelas)
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
  )                                          AS base_calculo,
  '{}'::jsonb                                AS incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

ALTER VIEW pjecalc_verbas SET (security_invoker = on);

-- 3. Rebuild INSERT trigger to persist ALL fields
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

  -- Extract base_tabelas from base_calculo.tabelas JSON (if provided)
  IF NEW.base_calculo IS NOT NULL AND NEW.base_calculo ? 'tabelas' THEN
    SELECT array_agg(t::text)
    INTO v_tabelas
    FROM jsonb_array_elements_text(NEW.base_calculo->'tabelas') t;
  ELSE
    v_tabelas := '{}';
  END IF;

  -- Extract incidências from incidencias JSONB column (if provided)
  -- Supports both direct bool columns AND incidencias JSON blob
  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago,
    incide_inss, incide_fgts, incide_ir,
    base_tabelas,
    -- Engine-critical fields
    divisor_tipo, quantidade_tipo, quantidade_valor,
    fracao_mes_modo,
    compor_principal,
    gerar_principal, gerar_reflexo,
    excluir_falta_justificada, excluir_falta_nao_justificada, excluir_ferias_gozadas,
    comportamento_reflexo, periodo_media_reflexo,
    quantidade_proporcionalizar, hora_noturna_ficticia, constante_mensal
  )
  VALUES (
    v_cid,
    NEW.nome,
    NEW.codigo,
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
    -- incidências: prefer direct columns, fall back to incidencias JSON
    COALESCE(
      NEW.incide_inss,
      (NEW.incidencias->>'contribuicao_social')::boolean,
      true
    ),
    COALESCE(
      NEW.incide_fgts,
      (NEW.incidencias->>'fgts')::boolean,
      true
    ),
    COALESCE(
      NEW.incide_ir,
      (NEW.incidencias->>'irpf')::boolean,
      true
    ),
    v_tabelas,
    -- Engine-critical fields
    COALESCE(NEW.tipo_divisor, 'informado'),
    COALESCE(NEW.tipo_quantidade, 'informada'),
    COALESCE(NEW.quantidade_informada, 1),
    COALESCE(NEW.fracao_mes_modo, 'manter_fracao'),
    COALESCE(NEW.compor_principal, true),
    COALESCE(NEW.gerar_verba_principal, 'diferenca'),
    COALESCE(NEW.gerar_verba_reflexa, 'diferenca'),
    COALESCE((NEW.exclusoes->>'faltas_justificadas')::boolean, false),
    COALESCE((NEW.exclusoes->>'faltas_nao_justificadas')::boolean, false),
    COALESCE((NEW.exclusoes->>'ferias_gozadas')::boolean, false),
    NEW.comportamento_reflexo,
    NEW.periodo_media_reflexo,
    COALESCE(NEW.quantidade_proporcionalizar, false),
    COALESCE(NEW.hora_noturna_ficticia, false),
    NEW.constante_mensal
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;

-- Re-attach trigger (it may already exist from previous migrations)
DROP TRIGGER IF EXISTS pjecalc_verbas_instead_insert ON pjecalc_verbas;
CREATE TRIGGER pjecalc_verbas_instead_insert
  INSTEAD OF INSERT ON pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_ioi();

-- DELETE trigger (preserve existing)
CREATE OR REPLACE FUNCTION pjecalc_verbas_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM pjecalc_verba_base WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS pjecalc_verbas_instead_delete ON pjecalc_verbas;
CREATE TRIGGER pjecalc_verbas_instead_delete
  INSTEAD OF DELETE ON pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_iod();
