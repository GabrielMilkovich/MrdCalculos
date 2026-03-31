-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 7 (files 61 to 70 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260305080912_c55d7fe2-37ec-489e-841c-e47af547308d.sql ──


CREATE OR REPLACE FUNCTION public.pjecalc_get_calculo_id(p_case_id uuid, p_user_id uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id UUID; v_uid UUID;
BEGIN
  SELECT id INTO v_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_id IS NULL THEN
    v_uid := COALESCE(p_user_id, auth.uid());
    IF v_uid IS NULL THEN
      -- Fallback: get user from the case's criado_por
      SELECT criado_por INTO v_uid FROM cases WHERE id = p_case_id;
    END IF;
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Cannot determine user_id for pjecalc_calculos';
    END IF;
    INSERT INTO pjecalc_calculos (case_id, user_id) VALUES (p_case_id, v_uid) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;$function$;


-- ── Migration: 20260305082409_89767f5a-c085-467e-b136-713aec21d899.sql ──


-- Add CS employer config columns to pjecalc_calculos
ALTER TABLE public.pjecalc_calculos 
  ADD COLUMN IF NOT EXISTS cs_aliquota_empresa numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS cs_aliquota_sat numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS cs_aliquota_terceiros numeric DEFAULT 5.8,
  ADD COLUMN IF NOT EXISTS cs_cobrar_reclamante boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cs_sobre_salarios_pagos boolean DEFAULT false;

-- Recreate pjecalc_cs_config view with new columns
DROP VIEW IF EXISTS public.pjecalc_cs_config;
CREATE OR REPLACE VIEW public.pjecalc_cs_config AS
SELECT 
  c.id,
  c.case_id,
  true AS habilitado,
  'progressiva'::text AS regime,
  COALESCE(c.cs_aliquota_empresa, 20) AS aliquota_empresa,
  COALESCE(c.cs_aliquota_sat, 2) AS aliquota_sat,
  COALESCE(c.cs_aliquota_terceiros, 5.8) AS aliquota_terceiros,
  COALESCE(c.cs_cobrar_reclamante, true) AS cobrar_reclamante,
  COALESCE(c.cs_sobre_salarios_pagos, false) AS cs_sobre_salarios_pagos,
  c.created_at
FROM public.pjecalc_calculos c;


-- ── Migration: 20260305090920_40d84abc-f562-48ba-8670-14905dbce752.sql ──

-- Drop the old single-parameter version that conflicts with the 2-param version
DROP FUNCTION IF EXISTS public.pjecalc_get_calculo_id(uuid);


-- ── Migration: 20260305104225_66bdbe9c-17e0-46b2-a5e7-77354f6ae067.sql ──

DELETE FROM cases WHERE id IN ('6e8150f5-c360-441d-ac7d-81378f344096', 'f78752c0-ff29-47f0-9012-4ae14d69acd6');

-- ── Migration: 20260305104753_0e500f66-530d-47e5-8aa3-b0f71e5ab4df.sql ──

DELETE FROM cases WHERE id = '4aa9c170-f0f5-4502-b34d-f7f98d428019';

-- ── Migration: 20260305115843_0d202469-1451-4962-bbcc-b260c96576e6.sql ──


-- Table: sentenca_rulesets (rules from court decisions for worktime adjustment)
CREATE TABLE public.sentenca_rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Regra da Sentença',
  texto_sentenca TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_range_start DATE,
  date_range_end DATE,
  apply_days TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sentenca_rulesets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case rulesets" ON public.sentenca_rulesets FOR ALL USING (true) WITH CHECK (true);

-- Table: worktime_adjustments (adjusted daily records with audit trail)
CREATE TABLE public.worktime_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  ponto_diario_id UUID,
  data DATE NOT NULL,
  original_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjusted_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_rules UUID[] DEFAULT '{}',
  horas_trabalhadas_original NUMERIC(6,2) DEFAULT 0,
  horas_trabalhadas_ajustadas NUMERIC(6,2) DEFAULT 0,
  extras_diarias NUMERIC(6,2) DEFAULT 0,
  flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, data)
);

ALTER TABLE public.worktime_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage worktime adjustments" ON public.worktime_adjustments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_worktime_adjustments_case_date ON public.worktime_adjustments(case_id, data);
CREATE INDEX idx_sentenca_rulesets_case ON public.sentenca_rulesets(case_id);


-- ── Migration: 20260306165722_c14334e6-8390-443a-acc4-16f7fbbb0a3b.sql ──

-- Add unique constraint on pjecalc_calculos(case_id) for upserts
ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_case_id_key UNIQUE (case_id);

-- Add unique constraint on pjecalc_verba_base(calculo_id, nome) for upserts
ALTER TABLE public.pjecalc_verba_base ADD CONSTRAINT pjecalc_verba_base_calculo_id_nome_key UNIQUE (calculo_id, nome);

-- ── Migration: 20260306170442_3ba2b9c5-7795-4cba-870b-7d1dba4a9df4.sql ──

ALTER TABLE public.facts ADD CONSTRAINT facts_case_id_chave_unique UNIQUE (case_id, chave);

-- ── Migration: 20260306172409_ef358557-6ff1-4616-8122-b39d77b73d41.sql ──

ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'ctps';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'contrato';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'cct';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'fgts';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'ponto';

-- ── Migration: 20260306185114_57d5fc7c-0bd3-4d7e-825e-b0c34dac7ee7.sql ──


-- Table: indices_oficiais - stores BCB time series data (IPCA-E, SELIC)
CREATE TABLE IF NOT EXISTS public.indices_oficiais (
  serie_id INTEGER NOT NULL,
  data_referencia DATE NOT NULL,
  valor DECIMAL(12, 6) NOT NULL,
  ultima_atualizacao TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (serie_id, data_referencia)
);

-- Table: sync_status - tracks sync state per series
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id INTEGER NOT NULL UNIQUE,
  serie_nome TEXT,
  last_processed_date DATE,
  status TEXT DEFAULT 'pending',
  last_sync_attempt TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: indices_oficiais is public read, authenticated write
ALTER TABLE public.indices_oficiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read indices" ON public.indices_oficiais FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert indices" ON public.indices_oficiais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update indices" ON public.indices_oficiais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS: sync_status
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sync_status" ON public.sync_status FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage sync_status" ON public.sync_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial sync_status entries
INSERT INTO public.sync_status (serie_id, serie_nome, status) VALUES
  (10764, 'IPCA-E', 'pending'),
  (4390, 'SELIC', 'pending')
ON CONFLICT (serie_id) DO NOTHING;

