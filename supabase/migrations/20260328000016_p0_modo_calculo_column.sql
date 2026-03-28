-- ============================================================
-- P0-1: adiciona coluna modo_calculo em pjecalc_calculos
-- Remove dependência de leitura via (caseData as any).dadosProcesso?.modo_calculo
-- Garante que o modo seja persistido e tipado no banco.
-- Valores: 'assisted_from_pjc' | 'independent'
-- Default: 'assisted_from_pjc' (compatibilidade retroativa)
-- ============================================================

ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS modo_calculo TEXT
  DEFAULT 'assisted_from_pjc'
  CHECK (modo_calculo IN ('assisted_from_pjc', 'independent'));

COMMENT ON COLUMN public.pjecalc_calculos.modo_calculo IS
  'Modo de cálculo: assisted_from_pjc (importação PJC com GT override) ou independent (sem âncora PJC, exige data_citacao).';

-- ============================================================
-- Atualizar VIEW pjecalc_dados_processo para expor modo_calculo
-- (junto com data_citacao já adicionado na migration 000014)
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
  c.data_citacao,
  c.modo_calculo,                    -- ← agora exposto com tipo real
  c.created_at,
  c.updated_at
FROM public.pjecalc_calculos c;

ALTER VIEW public.pjecalc_dados_processo SET (security_invoker = on);

-- ============================================================
-- Atualizar trigger pjecalc_dp_ioi para persistir modo_calculo
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
    data_citacao   = COALESCE(NEW.data_citacao, data_citacao),
    modo_calculo   = COALESCE(NEW.modo_calculo, modo_calculo),  -- ← NOVO
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

NOTIFY pgrst, 'reload schema';
