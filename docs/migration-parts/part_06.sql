-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 6 (files 51 to 60 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260304230624_cf1648e3-7d17-4a74-9476-84ce7cb02640.sql ──


ALTER TABLE public.pjecalc_atualizacao_config ADD COLUMN IF NOT EXISTS combinacoes_indice text;
ALTER TABLE public.pjecalc_atualizacao_config ADD COLUMN IF NOT EXISTS combinacoes_juros text;


-- ── Migration: 20260304230705_53494869-4efe-41eb-afec-a2bda00c3dc2.sql ──


DROP VIEW IF EXISTS public.pjecalc_correcao_config;

CREATE VIEW public.pjecalc_correcao_config AS
SELECT c.id,
    c.case_id,
    ac.regime_padrao AS indice,
    ac.combinacoes_indice,
    ac.combinacoes_juros,
    c.created_at,
    (SELECT regime_padrao FROM pjecalc_atualizacao_config WHERE calculo_id = c.id AND tipo = 'juros' LIMIT 1) AS juros_tipo,
    CASE WHEN ac.regime_padrao IN ('IPCAE','IPCA-E') AND 
         EXISTS (SELECT 1 FROM pjecalc_atualizacao_config WHERE calculo_id = c.id AND tipo = 'juros' AND regime_padrao = 'SELIC')
    THEN true ELSE false END AS transicao_adc58,
    c.data_ajuizamento::text AS data_citacao,
    'mensal'::text AS epoca,
    NULL::text AS data_fixa,
    1 AS juros_percentual,
    'ajuizamento'::text AS juros_inicio,
    true AS juros_pro_rata,
    NULL::text AS indice_pos_citacao,
    false AS multa_523,
    10 AS multa_523_percentual,
    false AS multa_467,
    50 AS multa_467_percentual,
    c.data_liquidacao::text AS data_liquidacao
FROM pjecalc_calculos c
LEFT JOIN pjecalc_atualizacao_config ac ON ac.calculo_id = c.id AND ac.tipo = 'correcao';


-- ── Migration: 20260304230722_87066e9b-6173-4ccb-8adf-ceeffe788650.sql ──


ALTER VIEW public.pjecalc_correcao_config SET (security_invoker = on);


-- ── Migration: 20260305015210_0d28a6e3-11e2-400f-9aea-466e06001075.sql ──


-- Add missing columns to pjecalc_calculos for PJC import parity
ALTER TABLE public.pjecalc_calculos 
  ADD COLUMN IF NOT EXISTS sabado_dia_util boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS projeta_aviso boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS considera_feriado_estadual boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS considera_feriado_municipal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescricao_quinquenal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescricao_fgts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS zera_negativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS limitar_avos boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dia_fechamento integer DEFAULT 31,
  ADD COLUMN IF NOT EXISTS duplicado_de uuid REFERENCES public.pjecalc_calculos(id),
  ADD COLUMN IF NOT EXISTS pjc_import_metadata jsonb;

-- Add missing columns to pjecalc_verba_base for full PJC formula parity
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS quantidade_tipo text DEFAULT 'INFORMADA',
  ADD COLUMN IF NOT EXISTS quantidade_valor numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS divisor_tipo text DEFAULT 'OUTRO_VALOR',
  ADD COLUMN IF NOT EXISTS base_tabelada text,
  ADD COLUMN IF NOT EXISTS excluir_falta_justificada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluir_falta_nao_justificada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluir_ferias_gozadas boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gerar_principal text DEFAULT 'DIFERENCA',
  ADD COLUMN IF NOT EXISTS gerar_reflexo text DEFAULT 'DIFERENCA',
  ADD COLUMN IF NOT EXISTS compor_principal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS pjc_id text;

-- Add missing columns to pjecalc_reflexo for full behavior parity  
ALTER TABLE public.pjecalc_reflexo
  ADD COLUMN IF NOT EXISTS multiplicador numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS divisor numeric DEFAULT 12,
  ADD COLUMN IF NOT EXISTS divisor_tipo text DEFAULT 'INFORMADO',
  ADD COLUMN IF NOT EXISTS quantidade_tipo text DEFAULT 'AVOS',
  ADD COLUMN IF NOT EXISTS pjc_id text;

-- Add integral tracking columns to pjecalc_ocorrencia_calculo
ALTER TABLE public.pjecalc_ocorrencia_calculo
  ADD COLUMN IF NOT EXISTS base_integral numeric,
  ADD COLUMN IF NOT EXISTS quantidade_integral numeric,
  ADD COLUMN IF NOT EXISTS devido_integral numeric,
  ADD COLUMN IF NOT EXISTS pago_integral numeric,
  ADD COLUMN IF NOT EXISTS indice_acumulado numeric,
  ADD COLUMN IF NOT EXISTS parametros_snapshot jsonb;

-- Create pjc_import_jobs table for tracking imports
CREATE TABLE IF NOT EXISTS public.pjc_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'PENDENTE',
  arquivo_nome text,
  arquivo_hash text,
  resultado jsonb,
  verbas_importadas integer DEFAULT 0,
  reflexos_importados integer DEFAULT 0,
  historicos_importados integer DEFAULT 0,
  warnings jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.pjc_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own imports" ON public.pjc_import_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Create function to block edits on FECHADO calculations
CREATE OR REPLACE FUNCTION public.pjecalc_block_fechado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  -- Get status of parent calculation
  SELECT status INTO v_status FROM pjecalc_calculos WHERE id = COALESCE(NEW.calculo_id, OLD.calculo_id);
  IF v_status = 'FECHADO' THEN
    RAISE EXCEPTION 'Cálculo está FECHADO. Operações de escrita bloqueadas.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to key child tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'pjecalc_verba_base',
    'pjecalc_reflexo',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_hist_salarial',
    'pjecalc_hist_salarial_mes',
    'pjecalc_evento_intervalo'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_block_fechado ON %I; CREATE TRIGGER trg_block_fechado BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pjecalc_block_fechado();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ── Migration: 20260305020650_c0272f7b-841e-49aa-a5d4-c8407c8e1b17.sql ──

-- Create pjecalc_historico_ocorrencias as a view over the real v2 table
CREATE OR REPLACE VIEW public.pjecalc_historico_ocorrencias AS
SELECT 
  m.id,
  m.hist_salarial_id AS historico_id,
  c.case_id,
  m.competencia::text AS competencia,
  m.valor,
  COALESCE(m.origem, 'informado') AS tipo,
  m.created_at
FROM pjecalc_hist_salarial_mes m
JOIN pjecalc_hist_salarial h ON m.hist_salarial_id = h.id
JOIN pjecalc_calculos c ON h.calculo_id = c.id;

-- Create trigger function for INSERT on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_calculo_id UUID;
BEGIN
  -- Get calculo_id from the hist_salarial record
  SELECT calculo_id INTO v_calculo_id FROM pjecalc_hist_salarial WHERE id = NEW.historico_id;
  IF v_calculo_id IS NULL THEN
    RAISE EXCEPTION 'historico_id not found in pjecalc_hist_salarial';
  END IF;
  
  INSERT INTO pjecalc_hist_salarial_mes (calculo_id, hist_salarial_id, competencia, valor, origem)
  VALUES (
    v_calculo_id,
    NEW.historico_id,
    CASE WHEN length(NEW.competencia) = 7 THEN NEW.competencia || '-01' ELSE NEW.competencia END::date,
    COALESCE(NEW.valor, 0),
    COALESCE(NEW.tipo, 'informado')
  );
  RETURN NEW;
END;
$$;

-- Create trigger function for UPDATE on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_iou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pjecalc_hist_salarial_mes SET
    valor = COALESCE(NEW.valor, valor),
    origem = COALESCE(NEW.tipo, origem)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger function for DELETE on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM pjecalc_hist_salarial_mes WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Attach triggers to the view
CREATE TRIGGER pjecalc_hist_ocorr_insert INSTEAD OF INSERT ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_ioi();
CREATE TRIGGER pjecalc_hist_ocorr_update INSTEAD OF UPDATE ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_iou();
CREATE TRIGGER pjecalc_hist_ocorr_delete INSTEAD OF DELETE ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_iod();

-- ── Migration: 20260305042839_e1b10159-ca06-4374-8b19-199ed865b2f2.sql ──


-- 1. Add missing columns to pjecalc_verba_base
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS verba_principal_id UUID REFERENCES pjecalc_verba_base(id) ON DELETE SET NULL;
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor TEXT NOT NULL DEFAULT 'calculado';
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor_informado_devido NUMERIC;
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor_informado_pago NUMERIC;

-- 2. Drop existing triggers and view
DROP TRIGGER IF EXISTS pjecalc_verbas_insert ON pjecalc_verbas;
DROP TRIGGER IF EXISTS pjecalc_verbas_delete ON pjecalc_verbas;
DROP FUNCTION IF EXISTS pjecalc_verbas_ioi() CASCADE;
DROP FUNCTION IF EXISTS pjecalc_verbas_iod() CASCADE;
DROP VIEW IF EXISTS pjecalc_verbas;

-- 3. Recreate view with proper base_calculo, verba_principal_id, tipo, valor
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
    'tabelas', '[]'::jsonb,
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

-- 4. Recreate INSERT trigger with all new fields
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago
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
    NEW.valor_informado_pago
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;

-- 5. Recreate DELETE trigger
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

-- 6. Attach triggers to view
CREATE TRIGGER pjecalc_verbas_insert
  INSTEAD OF INSERT ON pjecalc_verbas
  FOR EACH ROW
  EXECUTE FUNCTION pjecalc_verbas_ioi();

CREATE TRIGGER pjecalc_verbas_delete
  INSTEAD OF DELETE ON pjecalc_verbas
  FOR EACH ROW
  EXECUTE FUNCTION pjecalc_verbas_iod();


-- ── Migration: 20260305062630_8d3771a4-24e3-4a15-b35a-b81978f2afc6.sql ──


-- Create the underlying table for seguro-desemprego config
CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_desemprego_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  parcelas integer NOT NULL DEFAULT 5,
  valor_parcela numeric,
  recebeu boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);

ALTER TABLE public.pjecalc_seguro_desemprego_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage seguro config" ON public.pjecalc_seguro_desemprego_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create the compatibility view
CREATE OR REPLACE VIEW public.pjecalc_seguro_config AS
SELECT
  sd.id,
  c.case_id,
  sd.calculo_id,
  sd.apurar,
  sd.parcelas,
  sd.valor_parcela,
  sd.recebeu,
  sd.observacoes,
  sd.created_at,
  sd.updated_at
FROM public.pjecalc_seguro_desemprego_config sd
JOIN public.pjecalc_calculos c ON c.id = sd.calculo_id;

-- IOI trigger for the view
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_seguro_desemprego_config (calculo_id, apurar, parcelas, valor_parcela, recebeu, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.parcelas, 5), NEW.valor_parcela, COALESCE(NEW.recebeu, false), NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET
    apurar = EXCLUDED.apurar,
    parcelas = EXCLUDED.parcelas,
    valor_parcela = EXCLUDED.valor_parcela,
    recebeu = EXCLUDED.recebeu,
    observacoes = EXCLUDED.observacoes,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_ioi
  INSTEAD OF INSERT ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_ioi();

-- IOU trigger
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_iou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pjecalc_seguro_desemprego_config SET
    apurar = COALESCE(NEW.apurar, apurar),
    parcelas = COALESCE(NEW.parcelas, parcelas),
    valor_parcela = NEW.valor_parcela,
    recebeu = COALESCE(NEW.recebeu, recebeu),
    observacoes = COALESCE(NEW.observacoes, observacoes),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_iou
  INSTEAD OF UPDATE ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_iou();

-- IOD trigger
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM pjecalc_seguro_desemprego_config WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_iod
  INSTEAD OF DELETE ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_iod();

NOTIFY pgrst, 'reload schema';


-- ── Migration: 20260305062922_20f841b4-c38d-45a6-8090-986dac4d251d.sql ──


-- =====================================================
-- 1. PENSÃO ALIMENTÍCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_pensao_alimenticia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'percentual',
  percentual numeric DEFAULT 0,
  valor_fixo numeric DEFAULT 0,
  base_incidencia text DEFAULT 'liquido',
  beneficiario text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_pensao_alimenticia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage pensao config" ON public.pjecalc_pensao_alimenticia_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_pensao_config AS
SELECT pc.id, c.case_id, pc.calculo_id, pc.apurar, pc.tipo, pc.percentual, pc.valor_fixo,
       pc.base_incidencia, pc.beneficiario, pc.observacoes, pc.created_at, pc.updated_at
FROM public.pjecalc_pensao_alimenticia_config pc
JOIN public.pjecalc_calculos c ON c.id = pc.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_pensao_alimenticia_config (calculo_id, apurar, tipo, percentual, valor_fixo, base_incidencia, beneficiario, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.tipo, 'percentual'), COALESCE(NEW.percentual, 0), COALESCE(NEW.valor_fixo, 0), COALESCE(NEW.base_incidencia, 'liquido'), NEW.beneficiario, NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, tipo=EXCLUDED.tipo, percentual=EXCLUDED.percentual, valor_fixo=EXCLUDED.valor_fixo, base_incidencia=EXCLUDED.base_incidencia, beneficiario=EXCLUDED.beneficiario, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_pensao_config_ioi INSTEAD OF INSERT ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_pensao_alimenticia_config SET apurar=COALESCE(NEW.apurar,apurar), tipo=COALESCE(NEW.tipo,tipo), percentual=COALESCE(NEW.percentual,percentual), valor_fixo=COALESCE(NEW.valor_fixo,valor_fixo), base_incidencia=COALESCE(NEW.base_incidencia,base_incidencia), beneficiario=COALESCE(NEW.beneficiario,beneficiario), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_pensao_config_iou INSTEAD OF UPDATE ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_pensao_alimenticia_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_pensao_config_iod INSTEAD OF DELETE ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_iod();

-- =====================================================
-- 2. PREVIDÊNCIA PRIVADA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_prev_privada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  percentual_empregado numeric DEFAULT 0,
  percentual_empregador numeric DEFAULT 0,
  entidade text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_prev_privada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage prev privada config" ON public.pjecalc_prev_privada_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_previdencia_privada_config AS
SELECT pp.id, c.case_id, pp.calculo_id, pp.apurar, pp.percentual_empregado, pp.percentual_empregador,
       pp.entidade, pp.observacoes, pp.created_at, pp.updated_at
FROM public.pjecalc_prev_privada_config pp
JOIN public.pjecalc_calculos c ON c.id = pp.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_prev_privada_config (calculo_id, apurar, percentual_empregado, percentual_empregador, entidade, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.percentual_empregado, 0), COALESCE(NEW.percentual_empregador, 0), NEW.entidade, NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, percentual_empregado=EXCLUDED.percentual_empregado, percentual_empregador=EXCLUDED.percentual_empregador, entidade=EXCLUDED.entidade, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_ioi INSTEAD OF INSERT ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_prev_privada_config SET apurar=COALESCE(NEW.apurar,apurar), percentual_empregado=COALESCE(NEW.percentual_empregado,percentual_empregado), percentual_empregador=COALESCE(NEW.percentual_empregador,percentual_empregador), entidade=COALESCE(NEW.entidade,entidade), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_iou INSTEAD OF UPDATE ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_prev_privada_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_iod INSTEAD OF DELETE ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_iod();

-- =====================================================
-- 3. SALÁRIO-FAMÍLIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_sal_familia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  numero_filhos integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_sal_familia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage sal familia config" ON public.pjecalc_sal_familia_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_salario_familia_config AS
SELECT sf.id, c.case_id, sf.calculo_id, sf.apurar, sf.numero_filhos,
       sf.observacoes, sf.created_at, sf.updated_at
FROM public.pjecalc_sal_familia_config sf
JOIN public.pjecalc_calculos c ON c.id = sf.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_sal_familia_config (calculo_id, apurar, numero_filhos, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.numero_filhos, 0), NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, numero_filhos=EXCLUDED.numero_filhos, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_ioi INSTEAD OF INSERT ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_sal_familia_config SET apurar=COALESCE(NEW.apurar,apurar), numero_filhos=COALESCE(NEW.numero_filhos,numero_filhos), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_iou INSTEAD OF UPDATE ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_sal_familia_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_iod INSTEAD OF DELETE ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_iod();

NOTIFY pgrst, 'reload schema';


-- ── Migration: 20260305063403_7627d608-f5d3-458a-b058-4b8cf3680c1a.sql ──


-- =====================================================
-- 1. pjecalc_ir_faixas — View over pjecalc_imposto_renda + pjecalc_imposto_renda_faixas
-- =====================================================
CREATE OR REPLACE VIEW public.pjecalc_ir_faixas AS
SELECT 
  f.id,
  ir.competencia AS competencia_inicio,
  f.faixa,
  f.valor_inicial,
  f.valor_final,
  f.aliquota,
  f.parcela_deduzir,
  ir.deducao_dependente
FROM public.pjecalc_imposto_renda_faixas f
JOIN public.pjecalc_imposto_renda ir ON ir.id = f.ir_id
ORDER BY ir.competencia, f.faixa;

-- =====================================================
-- 2. pjecalc_fgts_saldos_saques
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_saldos_saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'saldo',
  data date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_fgts_saldos_saques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage fgts saldos" ON public.pjecalc_fgts_saldos_saques
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 3. pjecalc_observacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  modulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota',
  texto text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage observacoes" ON public.pjecalc_observacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';


-- ── Migration: 20260305065509_b7a0d2d9-9be7-4700-b1a2-8ffd00acd778.sql ──

DELETE FROM public.cases;
