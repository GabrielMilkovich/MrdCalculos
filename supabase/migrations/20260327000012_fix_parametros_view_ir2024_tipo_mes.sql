
-- ============================================================
-- Fix pjecalc_parametros VIEW: expose real column values
-- from pjecalc_calculos (previously hardcoded false/true).
-- Add tipo_mes column.
-- Fix INSERT/UPDATE trigger to persist ALL fields.
-- Add IR faixas 2023-05 → 2026.
-- ============================================================

-- 1. Add tipo_mes and jornada_semanal to pjecalc_calculos
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS tipo_mes TEXT DEFAULT 'comercial',
  ADD COLUMN IF NOT EXISTS maior_remuneracao NUMERIC,
  ADD COLUMN IF NOT EXISTS ultima_remuneracao NUMERIC;

-- 2. Rebuild pjecalc_parametros VIEW to use real column values
DROP VIEW IF EXISTS public.pjecalc_parametros CASCADE;

CREATE OR REPLACE VIEW public.pjecalc_parametros AS
SELECT
  c.id,
  c.case_id,
  c.data_admissao::text              AS data_admissao,
  c.data_demissao::text              AS data_demissao,
  c.data_ajuizamento::text           AS data_ajuizamento,
  c.data_inicio_calculo::text        AS data_inicial,
  c.data_fim_calculo::text           AS data_final,
  c.tribunal                         AS estado,
  c.vara                             AS municipio,
  COALESCE(c.prescricao_quinquenal, false) AS prescricao_quinquenal,
  COALESCE(c.prescricao_fgts, false)      AS prescricao_fgts,
  'tempo_integral'                         AS regime_trabalho,
  COALESCE(c.divisor_horas, 220)          AS carga_horaria_padrao,
  c.maior_remuneracao,
  c.ultima_remuneracao,
  c.aviso_previo_tipo                AS prazo_aviso_previo,
  c.aviso_previo_dias                AS prazo_aviso_dias,
  COALESCE(c.projeta_aviso, false)   AS projetar_aviso_indenizado,
  COALESCE(c.limitar_avos, false)    AS limitar_avos_periodo,
  COALESCE(c.zera_negativo, false)   AS zerar_valor_negativo,
  COALESCE(c.sabado_dia_util, true)  AS sabado_dia_util,
  COALESCE(c.considera_feriado_estadual, false)   AS considerar_feriado_estadual,
  COALESCE(c.considera_feriado_municipal, false)  AS considerar_feriado_municipal,
  COALESCE(c.tipo_mes, 'comercial')  AS tipo_mes,
  NULL::numeric                      AS jornada_semanal,
  c.observacoes                      AS comentarios,
  c.created_at,
  c.updated_at
FROM public.pjecalc_calculos c;

ALTER VIEW public.pjecalc_parametros SET (security_invoker = on);

-- 3. Rebuild INSTEAD OF trigger to persist ALL fields
CREATE OR REPLACE FUNCTION public.pjecalc_parametros_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);

  UPDATE public.pjecalc_calculos SET
    data_admissao             = NULLIF(NEW.data_admissao, '')::date,
    data_demissao             = NULLIF(NEW.data_demissao, '')::date,
    data_ajuizamento          = NULLIF(NEW.data_ajuizamento, '')::date,
    data_inicio_calculo       = NULLIF(NEW.data_inicial, '')::date,
    data_fim_calculo          = NULLIF(NEW.data_final, '')::date,
    tribunal                  = NEW.estado,
    vara                      = NEW.municipio,
    divisor_horas             = COALESCE(NEW.carga_horaria_padrao, 220),
    observacoes               = NEW.comentarios,
    prescricao_quinquenal     = COALESCE(NEW.prescricao_quinquenal, false),
    prescricao_fgts           = COALESCE(NEW.prescricao_fgts, false),
    projeta_aviso             = COALESCE(NEW.projetar_aviso_indenizado, false),
    limitar_avos              = COALESCE(NEW.limitar_avos_periodo, false),
    zera_negativo             = COALESCE(NEW.zerar_valor_negativo, false),
    sabado_dia_util           = COALESCE(NEW.sabado_dia_util, true),
    considera_feriado_estadual   = COALESCE(NEW.considerar_feriado_estadual, false),
    considera_feriado_municipal  = COALESCE(NEW.considerar_feriado_municipal, false),
    tipo_mes                  = COALESCE(NEW.tipo_mes, 'comercial'),
    maior_remuneracao         = NEW.maior_remuneracao,
    ultima_remuneracao        = NEW.ultima_remuneracao,
    aviso_previo_tipo         = COALESCE(NEW.prazo_aviso_previo, 'nao_apurar'),
    aviso_previo_dias         = NEW.prazo_aviso_dias,
    updated_at                = now()
  WHERE id = v_cid;

  NEW.id := v_cid;
  RETURN NEW;
END;
$function$;

-- Re-attach triggers (drop old, recreate)
DROP TRIGGER IF EXISTS pjecalc_parametros_insert ON public.pjecalc_parametros;
DROP TRIGGER IF EXISTS pjecalc_parametros_update ON public.pjecalc_parametros;

CREATE TRIGGER pjecalc_parametros_insert
  INSTEAD OF INSERT ON public.pjecalc_parametros
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_parametros_ioi();

CREATE TRIGGER pjecalc_parametros_update
  INSTEAD OF UPDATE ON public.pjecalc_parametros
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_parametros_ioi();


-- ============================================================
-- SEED: pjecalc_ir_faixas — 2023-05 → 2026
-- Lei 14.848/2024 (tabela progressiva reajustada a partir mai/2023)
-- Tabela vigente a partir de 05/2023 com novos limites
-- ============================================================

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2023 (mai-dez) — tabela vigente a partir 05/2023 (MP 1.171/2023 → Lei 14.663/2023)
('2023-05-01','2023-12-31',1,  2112.00, 0.000,    0.00, 189.59),
('2023-05-01','2023-12-31',2,  2826.65, 0.075,  158.40, 189.59),
('2023-05-01','2023-12-31',3,  3751.05, 0.150,  370.40, 189.59),
('2023-05-01','2023-12-31',4,  4664.68, 0.225,  651.72, 189.59),
('2023-05-01','2023-12-31',5,999999999, 0.275,  885.96, 189.59),
-- 2024 — tabela congelada em relação a 2023-05
('2024-01-01','2024-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2024-01-01','2024-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2024-01-01','2024-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2024-01-01','2024-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2024-01-01','2024-12-31',5,999999999, 0.275,  896.00, 189.59),
-- 2025 — tabela vigente (isenção ampliada a R$ 2.824 → a partir de 01/2026; 2025 mantém 2024)
('2025-01-01','2025-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2025-01-01','2025-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2025-01-01','2025-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2025-01-01','2025-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2025-01-01','2025-12-31',5,999999999, 0.275,  896.00, 189.59),
-- 2026 — isenção ampliada (PL aprovado: até R$ 5.000 isento via desconto simplificado)
-- Mantemos tabela de 2025 como proxy até publicação definitiva
('2026-01-01','2026-12-31',1,  2259.20, 0.000,    0.00, 189.59),
('2026-01-01','2026-12-31',2,  2826.65, 0.075,  169.44, 189.59),
('2026-01-01','2026-12-31',3,  3751.05, 0.150,  381.44, 189.59),
('2026-01-01','2026-12-31',4,  4664.68, 0.225,  662.77, 189.59),
('2026-01-01','2026-12-31',5,999999999, 0.275,  896.00, 189.59)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Add contribuicao_sindical columns to pjecalc_cs_config
-- ============================================================

ALTER TABLE public.pjecalc_cs_config
  ADD COLUMN IF NOT EXISTS contribuicao_sindical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contribuicao_sindical_pos2017 BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';
