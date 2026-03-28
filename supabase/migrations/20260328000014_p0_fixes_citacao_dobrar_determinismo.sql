
-- ============================================================
-- P0 FIXES — Paridade com PJe-Calc
-- 1. data_citacao: adiciona coluna real em pjecalc_calculos,
--    corrige VIEW pjecalc_dados_processo (estava mapeando
--    data_ajuizamento incorretamente), atualiza trigger.
-- 2. dobrar_valor_devido: adiciona coluna em pjecalc_verba_base,
--    expõe na VIEW pjecalc_verbas, atualiza trigger de INSERT.
-- ============================================================

-- ============================================================
-- 1. ADICIONAR data_citacao em pjecalc_calculos
-- ============================================================
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS data_citacao TEXT;

-- ============================================================
-- 2. CORRIGIR VIEW pjecalc_dados_processo
--    Antes: c.data_ajuizamento::text AS data_citacao  ← ERRADO
--    Depois: c.data_citacao AS data_citacao           ← CORRETO
-- ============================================================
CREATE OR REPLACE VIEW public.pjecalc_dados_processo AS
SELECT
  c.id,
  c.case_id,
  c.processo_cnj        AS numero_processo,
  c.reclamante_nome,
  c.reclamante_cpf,
  c.reclamado_nome      AS reclamada_nome,
  c.reclamado_cnpj      AS reclamada_cnpj,
  c.vara,
  c.reclamado_nome      AS reclamado,
  NULL::text            AS perito,
  NULL::text            AS funcao,
  c.data_citacao,                     -- ← coluna real (não mais data_ajuizamento)
  c.created_at,
  c.updated_at
FROM public.pjecalc_calculos c;

ALTER VIEW public.pjecalc_dados_processo SET (security_invoker = on);

-- ============================================================
-- 3. ATUALIZAR trigger pjecalc_dp_ioi para persistir data_citacao
-- ============================================================
CREATE OR REPLACE FUNCTION public.pjecalc_dp_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  UPDATE public.pjecalc_calculos SET
    processo_cnj   = COALESCE(NEW.numero_processo, processo_cnj),
    reclamante_nome= COALESCE(NEW.reclamante_nome, reclamante_nome),
    reclamante_cpf = COALESCE(NEW.reclamante_cpf, reclamante_cpf),
    reclamado_nome = COALESCE(NEW.reclamada_nome, reclamado_nome),
    reclamado_cnpj = COALESCE(NEW.reclamada_cnpj, reclamado_cnpj),
    vara           = COALESCE(NEW.vara, vara),
    data_citacao   = COALESCE(NEW.data_citacao, data_citacao),   -- ← NOVO
    updated_at     = now()
  WHERE id = v_cid;
  NEW.id := v_cid;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pjecalc_dp_insert ON public.pjecalc_dados_processo;
DROP TRIGGER IF EXISTS pjecalc_dp_update ON public.pjecalc_dados_processo;

CREATE TRIGGER pjecalc_dp_insert
  INSTEAD OF INSERT ON public.pjecalc_dados_processo
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_dp_ioi();

CREATE TRIGGER pjecalc_dp_update
  INSTEAD OF UPDATE ON public.pjecalc_dados_processo
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_dp_ioi();

-- ============================================================
-- 4. ADICIONAR dobrar_valor_devido em pjecalc_verba_base
-- ============================================================
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS dobrar_valor_devido BOOLEAN DEFAULT false;

-- ============================================================
-- 5. RECONSTRUIR pjecalc_verbas VIEW para expor dobrar_valor_devido
--    (mantém todos os campos de migration 000010)
-- ============================================================
DROP TRIGGER IF EXISTS pjecalc_verbas_instead_insert ON public.pjecalc_verbas;
DROP TRIGGER IF EXISTS pjecalc_verbas_instead_delete ON public.pjecalc_verbas;
DROP VIEW IF EXISTS public.pjecalc_verbas;

CREATE OR REPLACE VIEW public.pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade                            AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END                                         AS tipo,
  v.multiplicador,
  v.divisor                                   AS divisor_informado,
  v.periodo_inicio::text                      AS periodo_inicio,
  v.periodo_fim::text                         AS periodo_fim,
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
  -- Engine-critical fields (from migration 000010)
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
  -- P0 FIX: dobrar_valor_devido now exposed
  v.dobrar_valor_devido,
  -- base_calculo JSON
  jsonb_build_object(
    'historicos', COALESCE(
      (SELECT jsonb_agg(hs.id)
       FROM public.pjecalc_hist_salarial hs
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
FROM public.pjecalc_verba_base v
JOIN public.pjecalc_calculos c ON v.calculo_id = c.id;

ALTER VIEW public.pjecalc_verbas SET (security_invoker = on);

-- ============================================================
-- 6. ATUALIZAR pjecalc_verbas_ioi para persistir dobrar_valor_devido
-- ============================================================
CREATE OR REPLACE FUNCTION public.pjecalc_verbas_ioi()
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

  IF NEW.base_calculo IS NOT NULL AND NEW.base_calculo ? 'tabelas' THEN
    SELECT array_agg(t::text) INTO v_tabelas
    FROM jsonb_array_elements_text(NEW.base_calculo->'tabelas') t;
  ELSE
    v_tabelas := '{}';
  END IF;

  INSERT INTO public.pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago,
    incide_inss, incide_fgts, incide_ir,
    base_tabelas,
    -- engine-critical fields
    divisor_tipo, quantidade_tipo, quantidade_valor,
    fracao_mes_modo, compor_principal,
    gerar_principal, gerar_reflexo,
    excluir_falta_justificada, excluir_falta_nao_justificada, excluir_ferias_gozadas,
    comportamento_reflexo, periodo_media_reflexo,
    quantidade_proporcionalizar, hora_noturna_ficticia, constante_mensal,
    dobrar_valor_devido   -- P0 FIX
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
    COALESCE(NEW.incide_inss, (NEW.incidencias->>'contribuicao_social')::boolean, true),
    COALESCE(NEW.incide_fgts, (NEW.incidencias->>'fgts')::boolean, true),
    COALESCE(NEW.incide_ir, (NEW.incidencias->>'irpf')::boolean, true),
    v_tabelas,
    COALESCE(NEW.divisor_tipo, 'informado'),
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
    NEW.constante_mensal,
    COALESCE(NEW.dobrar_valor_devido, false)  -- P0 FIX
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pjecalc_verbas_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.pjecalc_verba_base WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER pjecalc_verbas_instead_insert
  INSTEAD OF INSERT ON public.pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_verbas_ioi();

CREATE TRIGGER pjecalc_verbas_instead_delete
  INSTEAD OF DELETE ON public.pjecalc_verbas
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_verbas_iod();

NOTIFY pgrst, 'reload schema';
