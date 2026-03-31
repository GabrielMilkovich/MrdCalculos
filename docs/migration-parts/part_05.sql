-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 5 (files 41 to 50 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260228001443_128237d0-be5e-4b90-9440-74f6fcc12873.sql ──


-- =====================================================
-- FASE 5: Persistência de Ocorrências
-- =====================================================

-- [1A] pjecalc_ocorrencias (ocorrências de verbas)
CREATE TABLE IF NOT EXISTS public.pjecalc_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  verba_id UUID NOT NULL,
  competencia TEXT NOT NULL, -- YYYY-MM
  ativa BOOLEAN NOT NULL DEFAULT true,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  base_valor NUMERIC NOT NULL DEFAULT 0,
  divisor_valor NUMERIC NOT NULL DEFAULT 30,
  multiplicador_valor NUMERIC NOT NULL DEFAULT 1,
  quantidade_valor NUMERIC NOT NULL DEFAULT 1,
  dobra NUMERIC NOT NULL DEFAULT 1,
  devido NUMERIC NOT NULL DEFAULT 0,
  pago NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  correcao NUMERIC NOT NULL DEFAULT 0,
  juros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  meta_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, verba_id, competencia)
);

CREATE INDEX idx_pjecalc_ocorrencias_calculo ON public.pjecalc_ocorrencias(calculo_id);
CREATE INDEX idx_pjecalc_ocorrencias_verba ON public.pjecalc_ocorrencias(verba_id);
CREATE INDEX idx_pjecalc_ocorrencias_comp ON public.pjecalc_ocorrencias(competencia);

-- [1B] pjecalc_fgts_ocorrencias
CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  base_historico NUMERIC NOT NULL DEFAULT 0,
  base_verbas NUMERIC NOT NULL DEFAULT 0,
  base_total NUMERIC NOT NULL DEFAULT 0,
  aliquota NUMERIC NOT NULL DEFAULT 0.08,
  valor NUMERIC NOT NULL DEFAULT 0,
  multa NUMERIC NOT NULL DEFAULT 0,
  recolhido NUMERIC NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, competencia)
);

CREATE INDEX idx_pjecalc_fgts_oc_calculo ON public.pjecalc_fgts_ocorrencias(calculo_id);

-- [1C] pjecalc_cs_ocorrencias
CREATE TABLE IF NOT EXISTS public.pjecalc_cs_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  aba TEXT NOT NULL DEFAULT 'DEVIDOS' CHECK (aba IN ('DEVIDOS','PAGOS')),
  ativa BOOLEAN NOT NULL DEFAULT true,
  base NUMERIC NOT NULL DEFAULT 0,
  segurado NUMERIC NOT NULL DEFAULT 0,
  empresa NUMERIC NOT NULL DEFAULT 0,
  sat NUMERIC NOT NULL DEFAULT 0,
  terceiros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, competencia, aba)
);

CREATE INDEX idx_pjecalc_cs_oc_calculo ON public.pjecalc_cs_ocorrencias(calculo_id);

-- RLS Policies (open for authenticated users - same pattern as rest of system)
ALTER TABLE public.pjecalc_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_fgts_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cs_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.pjecalc_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pjecalc_fgts_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pjecalc_cs_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for dev (same as other pjecalc tables)
CREATE POLICY "Allow all for anon" ON public.pjecalc_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.pjecalc_fgts_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.pjecalc_cs_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);

-- RPC for batch update
CREATE OR REPLACE FUNCTION public.pjecalc_batch_update_ocorrencias(
  p_calculo_id UUID,
  p_filtro JSONB, -- { verba_ids?: string[], competencia_inicio?: string, competencia_fim?: string }
  p_changes JSONB  -- { campo: valor } ex: { "pago": 100, "ativa": false }
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE pjecalc_ocorrencias
  SET
    base_valor = COALESCE((p_changes->>'base_valor')::numeric, base_valor),
    divisor_valor = COALESCE((p_changes->>'divisor_valor')::numeric, divisor_valor),
    multiplicador_valor = COALESCE((p_changes->>'multiplicador_valor')::numeric, multiplicador_valor),
    quantidade_valor = COALESCE((p_changes->>'quantidade_valor')::numeric, quantidade_valor),
    dobra = COALESCE((p_changes->>'dobra')::numeric, dobra),
    pago = COALESCE((p_changes->>'pago')::numeric, pago),
    ativa = COALESCE((p_changes->>'ativa')::boolean, ativa),
    origem = 'INFORMADA',
    updated_at = now()
  WHERE calculo_id = p_calculo_id
    AND (p_filtro->>'verba_ids' IS NULL OR verba_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filtro->'verba_ids'))))
    AND (p_filtro->>'competencia_inicio' IS NULL OR competencia >= p_filtro->>'competencia_inicio')
    AND (p_filtro->>'competencia_fim' IS NULL OR competencia <= p_filtro->>'competencia_fim');

  GET DIAGNOSTICS affected = ROW_COUNT;
  
  -- Recalculate devido and diferenca for affected rows
  UPDATE pjecalc_ocorrencias
  SET
    devido = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2),
    diferenca = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2) - pago,
    total = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2) - pago + correcao + juros
  WHERE calculo_id = p_calculo_id
    AND (p_filtro->>'verba_ids' IS NULL OR verba_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filtro->'verba_ids'))))
    AND (p_filtro->>'competencia_inicio' IS NULL OR competencia >= p_filtro->>'competencia_inicio')
    AND (p_filtro->>'competencia_fim' IS NULL OR competencia <= p_filtro->>'competencia_fim');

  RETURN affected;
END;
$$;


-- ── Migration: 20260228005008_0c910704-801a-47c9-a8cd-6eb2eb402ba8.sql ──


-- Fix calc_irrf to use pjecalc_imposto_renda_faixas table instead of non-existent faixas column
CREATE OR REPLACE FUNCTION public.calc_irrf(p_base numeric, p_dependentes integer DEFAULT 0, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_competencia date; 
  v_deducao_dep numeric; 
  v_faixa RECORD; 
  v_base_calc numeric; 
  v_imposto numeric := 0;
BEGIN
  SELECT competencia, COALESCE(deducao_dependente, 0) 
  INTO v_competencia, v_deducao_dep
  FROM pjecalc_imposto_renda 
  WHERE competencia <= p_date 
  ORDER BY competencia DESC LIMIT 1;

  IF v_competencia IS NULL THEN 
    RETURN jsonb_build_object('valor', 0, 'error', 'Tabela IRRF não encontrada'); 
  END IF;

  v_base_calc := p_base - (v_deducao_dep * p_dependentes);
  IF v_base_calc <= 0 THEN 
    RETURN jsonb_build_object('valor', 0, 'isento', true); 
  END IF;

  -- Query from the faixas table joined by ir_id
  FOR v_faixa IN 
    SELECT f.faixa, f.valor_inicial, f.valor_final, f.aliquota, f.parcela_deduzir
    FROM pjecalc_imposto_renda_faixas f
    JOIN pjecalc_imposto_renda ir ON ir.id = f.ir_id
    WHERE ir.competencia = v_competencia
    ORDER BY f.faixa
  LOOP
    IF v_base_calc >= v_faixa.valor_inicial AND
       (v_faixa.valor_final IS NULL OR v_base_calc <= v_faixa.valor_final) THEN
      v_imposto := ROUND(v_base_calc * v_faixa.aliquota / 100 - COALESCE(v_faixa.parcela_deduzir, 0), 2);
      RETURN jsonb_build_object(
        'valor', GREATEST(v_imposto, 0), 
        'base_original', p_base, 
        'deducao_dependentes', v_deducao_dep * p_dependentes,
        'base_calc', v_base_calc, 
        'aliquota', v_faixa.aliquota, 
        'competencia_tabela', v_competencia
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('valor', 0, 'isento', true, 'base_calc', v_base_calc);
END;
$function$;


-- ── Migration: 20260228011143_29cd99b4-75f5-47d6-b4a6-f679a477d876.sql ──


-- Add status and lock fields to liquidacao_resultado for lock/unlock/duplicate
ALTER TABLE IF EXISTS pjecalc_liquidacao_resultado 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fechado_por TEXT,
  ADD COLUMN IF NOT EXISTS duplicado_de UUID;

-- Add proporcionalizar_devido and proporcionalizar_pago to verbas
ALTER TABLE IF EXISTS pjecalc_verbas
  ADD COLUMN IF NOT EXISTS proporcionalizar_devido BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS proporcionalizar_pago BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_multiplicador TEXT DEFAULT 'informado',
  ADD COLUMN IF NOT EXISTS media_quantidade BOOLEAN DEFAULT false;


-- ── Migration: 20260228020541_201c73b7-c49f-41db-9029-9194e9cef97b.sql ──


CREATE TABLE IF NOT EXISTS public.pjecalc_parametros_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_inicial DATE,
  data_final DATE,
  valor_booleano BOOLEAN DEFAULT false,
  valor_numerico NUMERIC,
  valor_texto TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pjecalc_parametros_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their case extras"
  ON public.pjecalc_parametros_extras
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_pjecalc_parametros_extras_case ON public.pjecalc_parametros_extras(case_id, tipo);


-- ── Migration: 20260301073605_502a6954-5e38-4bb8-a83a-9d4da903e09e.sql ──


-- Add metadata columns to pjecalc_ocorrencias for enhanced audit trail
ALTER TABLE public.pjecalc_ocorrencias 
  ADD COLUMN IF NOT EXISTS parametros_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verba_principal_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_fracao text DEFAULT 'manter_fracao';

-- Add fracao_mes_modo to pjecalc_verbas for fraction handling
ALTER TABLE public.pjecalc_verbas
  ADD COLUMN IF NOT EXISTS fracao_mes_modo text DEFAULT 'manter_fracao';

-- Comment for documentation
COMMENT ON COLUMN public.pjecalc_ocorrencias.parametros_json IS 'Snapshot of parameters used to generate this occurrence';
COMMENT ON COLUMN public.pjecalc_ocorrencias.verba_principal_id IS 'Link to parent verba for reflexa occurrences';
COMMENT ON COLUMN public.pjecalc_ocorrencias.tipo_fracao IS 'Fraction mode: manter_fracao, integralizar, desprezar, desprezar_menor_15';
COMMENT ON COLUMN public.pjecalc_verbas.fracao_mes_modo IS 'How to handle partial months: manter_fracao, integralizar, desprezar, desprezar_menor_15';


-- ── Migration: 20260304115537_3fbcc82b-b49f-477a-8cd0-e9ede5c15ec0.sql ──


-- Tabela de registros diários de ponto (como no PJe-Calc real)
-- Cada linha = 1 dia com horários de entrada, saída, intervalo
CREATE TABLE public.pjecalc_ponto_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  dia_semana TEXT, -- 'Segunda', 'Terça', etc.
  entrada_1 TEXT, -- '08:00'
  saida_1 TEXT,   -- '12:00'
  entrada_2 TEXT, -- '13:00' (volta intervalo)
  saida_2 TEXT,   -- '17:00'
  entrada_3 TEXT, -- turno extra
  saida_3 TEXT,
  frequencia TEXT, -- horários concatenados para exibição
  horas_trabalhadas NUMERIC(6,2) DEFAULT 0,
  horas_extras_diarias NUMERIC(6,2) DEFAULT 0,
  horas_extras_semanais NUMERIC(6,2) DEFAULT 0,
  horas_extras_dsr NUMERIC(6,2) DEFAULT 0,
  horas_noturnas NUMERIC(6,2) DEFAULT 0,
  intervalo_suprimido NUMERIC(6,2) DEFAULT 0,
  sobreaviso NUMERIC(6,2) DEFAULT 0,
  tipo TEXT DEFAULT 'normal', -- 'normal', 'falta', 'feriado', 'folga', 'atestado', 'ferias'
  observacao TEXT,
  origem TEXT DEFAULT 'INFORMADA', -- 'INFORMADA', 'FIXADA' (jornada fixada pelo juiz)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, data)
);

-- Índice para busca rápida por caso e período
CREATE INDEX idx_ponto_diario_case_data ON public.pjecalc_ponto_diario(case_id, data);

-- RLS
ALTER TABLE public.pjecalc_ponto_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ponto_diario" ON public.pjecalc_ponto_diario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Função para calcular horas entre dois horários (texto HH:MM)
CREATE OR REPLACE FUNCTION public.pjecalc_calc_horas_entre(h_inicio TEXT, h_fim TEXT)
RETURNS NUMERIC AS $$
DECLARE
  t1 TIME;
  t2 TIME;
  diff INTERVAL;
BEGIN
  IF h_inicio IS NULL OR h_fim IS NULL OR h_inicio = '' OR h_fim = '' THEN
    RETURN 0;
  END IF;
  t1 := h_inicio::TIME;
  t2 := h_fim::TIME;
  IF t2 < t1 THEN
    -- Atravessou meia-noite
    diff := (t2 + INTERVAL '24 hours') - t1;
  ELSE
    diff := t2 - t1;
  END IF;
  RETURN EXTRACT(EPOCH FROM diff) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ── Migration: 20260304124329_cecbac01-3dd9-44fc-aed0-45055209347c.sql ──


-- =====================================================
-- CORE MODEL PJe-Calc v2 — Baseado no .PJC real
-- Substitui tabelas de modelagem, mantém referências
-- =====================================================

-- 1) DROP das tabelas de modelagem antigas (ordem: dependentes primeiro)
DROP TABLE IF EXISTS pjecalc_verba_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_fgts_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_cs_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_historico_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_liquidacao_resultado CASCADE;
DROP TABLE IF EXISTS pjecalc_metricas CASCADE;
DROP TABLE IF EXISTS pjecalc_observacoes CASCADE;
DROP TABLE IF EXISTS pjecalc_vale_transporte CASCADE;
DROP TABLE IF EXISTS pjecalc_verbas_padrao CASCADE;
DROP TABLE IF EXISTS pjecalc_verbas CASCADE;
DROP TABLE IF EXISTS pjecalc_ponto_diario CASCADE;
DROP TABLE IF EXISTS pjecalc_cartao_ponto_colunas CASCADE;
DROP TABLE IF EXISTS pjecalc_cartao_ponto CASCADE;
DROP TABLE IF EXISTS pjecalc_ferias CASCADE;
DROP TABLE IF EXISTS pjecalc_faltas CASCADE;
DROP TABLE IF EXISTS pjecalc_historico_salarial CASCADE;
DROP TABLE IF EXISTS pjecalc_parametros_extras CASCADE;
DROP TABLE IF EXISTS pjecalc_parametros CASCADE;
DROP TABLE IF EXISTS pjecalc_correcao_config CASCADE;
DROP TABLE IF EXISTS pjecalc_fgts_config CASCADE;
DROP TABLE IF EXISTS pjecalc_cs_config CASCADE;
DROP TABLE IF EXISTS pjecalc_ir_config CASCADE;
DROP TABLE IF EXISTS pjecalc_ir_faixas CASCADE;
DROP TABLE IF EXISTS pjecalc_multas_config CASCADE;
DROP TABLE IF EXISTS pjecalc_custas_config CASCADE;
DROP TABLE IF EXISTS pjecalc_custas CASCADE;
DROP TABLE IF EXISTS pjecalc_custas_judiciais CASCADE;
DROP TABLE IF EXISTS pjecalc_honorarios CASCADE;
DROP TABLE IF EXISTS pjecalc_pensao_config CASCADE;
DROP TABLE IF EXISTS pjecalc_previdencia_privada_config CASCADE;
DROP TABLE IF EXISTS pjecalc_seguro_config CASCADE;
DROP TABLE IF EXISTS pjecalc_salario_familia_config CASCADE;
DROP TABLE IF EXISTS pjecalc_dados_processo CASCADE;

-- =====================================================
-- 2) TABELA CENTRAL: pjecalc_calculos
-- =====================================================
CREATE TABLE pjecalc_calculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  processo_cnj TEXT,
  vara TEXT,
  tribunal TEXT,
  reclamante_nome TEXT,
  reclamante_cpf TEXT,
  reclamado_nome TEXT,
  reclamado_cnpj TEXT,
  data_admissao DATE,
  data_demissao DATE,
  data_ajuizamento DATE,
  data_inicio_calculo DATE,
  data_fim_calculo DATE,
  data_liquidacao DATE,
  tipo_demissao TEXT DEFAULT 'sem_justa_causa',
  aviso_previo_tipo TEXT DEFAULT 'indenizado',
  aviso_previo_dias INTEGER DEFAULT 30,
  jornada_contratual_horas NUMERIC(5,2) DEFAULT 44,
  divisor_horas NUMERIC(7,2) DEFAULT 220,
  percentual_he_50 NUMERIC(5,2) DEFAULT 50,
  percentual_he_100 NUMERIC(5,2) DEFAULT 100,
  percentual_adicional_noturno NUMERIC(5,2) DEFAULT 20,
  honorarios_percentual NUMERIC(5,2) DEFAULT 15,
  honorarios_sobre TEXT DEFAULT 'liquido',
  custas_percentual NUMERIC(5,2) DEFAULT 2,
  custas_limite NUMERIC(12,2),
  multa_477_habilitada BOOLEAN DEFAULT false,
  multa_467_habilitada BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'rascunho',
  versao INTEGER DEFAULT 1,
  hash_estado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calculos_case ON pjecalc_calculos(case_id);
CREATE INDEX idx_calculos_user ON pjecalc_calculos(user_id);

-- =====================================================
-- 3) EVENTOS POR INTERVALO
-- =====================================================
CREATE TABLE pjecalc_evento_intervalo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ferias_aquisitivo_inicio DATE,
  ferias_aquisitivo_fim DATE,
  ferias_concessivo_inicio DATE,
  ferias_concessivo_fim DATE,
  ferias_dias INTEGER DEFAULT 30,
  ferias_abono BOOLEAN DEFAULT false,
  ferias_dias_abono INTEGER DEFAULT 0,
  ferias_dobra BOOLEAN DEFAULT false,
  ferias_situacao TEXT DEFAULT 'GOZADAS',
  ferias_gozo2_inicio DATE,
  ferias_gozo2_fim DATE,
  ferias_gozo3_inicio DATE,
  ferias_gozo3_fim DATE,
  motivo TEXT,
  justificado BOOLEAN DEFAULT false,
  observacoes TEXT,
  documento_id UUID,
  pagina INTEGER,
  confianca NUMERIC(3,2),
  status_revisao TEXT DEFAULT 'AUTO',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evento_calculo ON pjecalc_evento_intervalo(calculo_id);

-- =====================================================
-- 4) APURAÇÃO DIÁRIA
-- =====================================================
CREATE TABLE pjecalc_apuracao_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  frequencia_str TEXT,
  minutos_trabalhados INTEGER DEFAULT 0,
  minutos_extra_diaria INTEGER DEFAULT 0,
  minutos_extra_semanal INTEGER DEFAULT 0,
  minutos_extra_repouso INTEGER DEFAULT 0,
  minutos_extra_feriado INTEGER DEFAULT 0,
  minutos_noturno INTEGER DEFAULT 0,
  minutos_intrajornada INTEGER DEFAULT 0,
  minutos_interjornada INTEGER DEFAULT 0,
  minutos_art384 INTEGER DEFAULT 0,
  minutos_art253 INTEGER DEFAULT 0,
  horas_trabalhadas NUMERIC(8,4) DEFAULT 0,
  horas_extras_diaria NUMERIC(8,4) DEFAULT 0,
  horas_extras_semanal NUMERIC(8,4) DEFAULT 0,
  horas_noturnas NUMERIC(8,4) DEFAULT 0,
  is_dsr BOOLEAN DEFAULT false,
  is_feriado BOOLEAN DEFAULT false,
  is_falta BOOLEAN DEFAULT false,
  is_ferias BOOLEAN DEFAULT false,
  is_afastamento BOOLEAN DEFAULT false,
  is_compensado BOOLEAN DEFAULT false,
  feriado_nome TEXT,
  origem TEXT DEFAULT 'CALCULADA',
  documento_id UUID,
  pagina INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, data)
);

CREATE INDEX idx_apuracao_calculo ON pjecalc_apuracao_diaria(calculo_id);

-- =====================================================
-- 5) HISTÓRICO SALARIAL
-- =====================================================
CREATE TABLE pjecalc_hist_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_variacao TEXT DEFAULT 'VARIAVEL',
  incide_inss BOOLEAN DEFAULT true,
  incide_fgts BOOLEAN DEFAULT true,
  incide_ir BOOLEAN DEFAULT true,
  valor_fixo NUMERIC(12,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, nome)
);

CREATE TABLE pjecalc_hist_salarial_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  hist_salarial_id UUID NOT NULL REFERENCES pjecalc_hist_salarial(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  origem TEXT DEFAULT 'IMPORTADA',
  documento_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hist_salarial_id, competencia)
);

CREATE INDEX idx_hist_mes_calculo ON pjecalc_hist_salarial_mes(calculo_id);

-- =====================================================
-- 6) RUBRICAS RAW + MAPEAMENTO
-- =====================================================
CREATE TABLE pjecalc_rubrica_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  tipo_documento TEXT,
  documento_id UUID,
  pagina INTEGER,
  confianca NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rubrica_raw_calc ON pjecalc_rubrica_raw(calculo_id);

CREATE TABLE pjecalc_rubrica_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_match TEXT,
  descricao_regex TEXT,
  empresa_cnpj TEXT,
  conceito TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  prioridade INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pjecalc_rubrica_map (codigo_match, descricao_regex, conceito, categoria, prioridade) VALUES
  ('0620', '(?i)comiss', 'COMISSOES_PAGAS', 'comissao', 10),
  ('1307', '(?i)comiss', 'COMISSOES_PAGAS', 'comissao', 9),
  ('0501', '(?i)dsr.*comiss', 'DSR_COMISSAO', 'dsr', 10),
  ('0502', '(?i)dsr.*h.*extra', 'DSR_HORA_EXTRA', 'dsr', 10),
  ('2377', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 10),
  ('2477', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 9),
  ('2481', '(?i)antecipa.*pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 9),
  ('3290', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 8),
  ('1800', '(?i)adic.*noturn', 'ADICIONAL_NOTURNO', 'adicional_noturno', 10),
  ('4001', '(?i)hora.*extra', 'HORAS_EXTRAS', 'hora_extra', 10),
  (NULL, '(?i)sal[aá]rio.*base', 'SALARIO_BASE', 'salario_base', 5),
  (NULL, '(?i)sal[aá]rio.*fixo', 'SALARIO_BASE', 'salario_base', 5),
  (NULL, '(?i)m[ií]nimo.*garant', 'MINIMO_GARANTIDO', 'salario_base', 5),
  (NULL, '(?i)vendas?.*(?:vf|prazo)', 'VENDAS_VF', 'comissao', 5);

-- =====================================================
-- 7) VERBAS BASE (Calculada no PJC)
-- =====================================================
CREATE TABLE pjecalc_verba_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  fonte TEXT DEFAULT 'historico_mensal',
  hist_salarial_nome TEXT,
  tipo_variacao TEXT DEFAULT 'VARIAVEL',
  incide_inss BOOLEAN DEFAULT true,
  incide_fgts BOOLEAN DEFAULT true,
  incide_ir BOOLEAN DEFAULT true,
  periodicidade TEXT DEFAULT 'MENSAL',
  periodo_inicio DATE,
  periodo_fim DATE,
  multiplicador NUMERIC(10,4) DEFAULT 1,
  divisor NUMERIC(10,4) DEFAULT 1,
  caracteristica TEXT DEFAULT 'COMUM',
  ordem INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verba_base_calc ON pjecalc_verba_base(calculo_id);

-- =====================================================
-- 8) REFLEXOS
-- =====================================================
CREATE TABLE pjecalc_reflexo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT NOT NULL,
  comportamento_reflexo TEXT,
  periodo_media_reflexo TEXT,
  tratamento_fracao_mes TEXT,
  media_tipo TEXT DEFAULT 'PERIODO_CALCULO',
  media_meses INTEGER,
  incide_inss BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  incide_ir BOOLEAN DEFAULT false,
  periodo_inicio DATE,
  periodo_fim DATE,
  ordem INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  gerar_principal BOOLEAN DEFAULT false,
  gerar_reflexo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reflexo_calc ON pjecalc_reflexo(calculo_id);

CREATE TABLE pjecalc_reflexo_base_verba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflexo_id UUID NOT NULL REFERENCES pjecalc_reflexo(id) ON DELETE CASCADE,
  verba_base_id UUID NOT NULL REFERENCES pjecalc_verba_base(id) ON DELETE CASCADE,
  integralizar BOOLEAN DEFAULT false,
  UNIQUE(reflexo_id, verba_base_id)
);

-- =====================================================
-- 9) ATUALIZAÇÃO CONFIG
-- =====================================================
CREATE TABLE pjecalc_atualizacao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  regimes JSONB NOT NULL DEFAULT '[]',
  regime_padrao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, tipo)
);

-- =====================================================
-- 10) OCORRÊNCIAS DE CÁLCULO
-- =====================================================
CREATE TABLE pjecalc_ocorrencia_calculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  verba_base_id UUID REFERENCES pjecalc_verba_base(id) ON DELETE CASCADE,
  reflexo_id UUID REFERENCES pjecalc_reflexo(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  competencia DATE NOT NULL,
  base_valor NUMERIC(14,2) DEFAULT 0,
  multiplicador NUMERIC(10,4) DEFAULT 1,
  divisor NUMERIC(10,4) DEFAULT 1,
  quantidade NUMERIC(10,4) DEFAULT 1,
  dobra NUMERIC(4,2) DEFAULT 1,
  devido NUMERIC(14,2) DEFAULT 0,
  pago NUMERIC(14,2) DEFAULT 0,
  diferenca NUMERIC(14,2) DEFAULT 0,
  correcao NUMERIC(14,2) DEFAULT 0,
  juros NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  fator_correcao NUMERIC(12,8) DEFAULT 1,
  taxa_juros NUMERIC(8,4) DEFAULT 0,
  indice_usado TEXT,
  juros_regime_usado TEXT,
  origem TEXT DEFAULT 'CALCULADA',
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ocorr_calc ON pjecalc_ocorrencia_calculo(calculo_id);
CREATE INDEX idx_ocorr_comp ON pjecalc_ocorrencia_calculo(calculo_id, competencia);

-- =====================================================
-- 11) RESULTADO DA LIQUIDAÇÃO
-- =====================================================
CREATE TABLE pjecalc_resultado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  total_bruto NUMERIC(14,2) DEFAULT 0,
  total_pago NUMERIC(14,2) DEFAULT 0,
  total_diferenca NUMERIC(14,2) DEFAULT 0,
  total_correcao NUMERIC(14,2) DEFAULT 0,
  total_juros NUMERIC(14,2) DEFAULT 0,
  total_liquido_antes_descontos NUMERIC(14,2) DEFAULT 0,
  desconto_inss_reclamante NUMERIC(14,2) DEFAULT 0,
  desconto_ir NUMERIC(14,2) DEFAULT 0,
  desconto_inss_reclamado NUMERIC(14,2) DEFAULT 0,
  honorarios NUMERIC(14,2) DEFAULT 0,
  custas NUMERIC(14,2) DEFAULT 0,
  multa_477 NUMERIC(14,2) DEFAULT 0,
  multa_467 NUMERIC(14,2) DEFAULT 0,
  fgts_depositar NUMERIC(14,2) DEFAULT 0,
  fgts_multa_40 NUMERIC(14,2) DEFAULT 0,
  total_reclamante NUMERIC(14,2) DEFAULT 0,
  total_reclamado NUMERIC(14,2) DEFAULT 0,
  engine_version TEXT DEFAULT '2.0.0',
  calculado_em TIMESTAMPTZ DEFAULT now(),
  hash_resultado TEXT,
  resumo_verbas JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id)
);

-- =====================================================
-- 12) RLS POLICIES
-- =====================================================
ALTER TABLE pjecalc_calculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_evento_intervalo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_apuracao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_hist_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_hist_salarial_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_rubrica_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_rubrica_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_verba_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_reflexo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_reflexo_base_verba ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_atualizacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_ocorrencia_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_resultado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calculos" ON pjecalc_calculos
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own eventos" ON pjecalc_evento_intervalo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own apuracao" ON pjecalc_apuracao_diaria
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own hist_salarial" ON pjecalc_hist_salarial
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own hist_salarial_mes" ON pjecalc_hist_salarial_mes
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own rubrica_raw" ON pjecalc_rubrica_raw
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read rubrica_map" ON pjecalc_rubrica_map
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own verba_base" ON pjecalc_verba_base
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own reflexo" ON pjecalc_reflexo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own reflexo_base" ON pjecalc_reflexo_base_verba
  FOR ALL TO authenticated USING (reflexo_id IN (
    SELECT r.id FROM pjecalc_reflexo r JOIN pjecalc_calculos c ON r.calculo_id = c.id WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users manage own atualizacao" ON pjecalc_atualizacao_config
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own ocorrencias" ON pjecalc_ocorrencia_calculo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own resultado" ON pjecalc_resultado
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));


-- ── Migration: 20260304124551_0e0e17bc-eb91-4381-89ea-cf13605f2ac9.sql ──


-- =====================================================
-- VIEWS DE COMPATIBILIDADE
-- Permite que código existente continue funcionando
-- enquanto a migração gradual para as novas tabelas acontece
-- =====================================================

-- 1) pjecalc_parametros → view sobre pjecalc_calculos
CREATE OR REPLACE VIEW pjecalc_parametros AS
SELECT
  c.id,
  c.case_id,
  c.data_admissao::text as data_admissao,
  c.data_demissao::text as data_demissao,
  c.data_ajuizamento::text as data_ajuizamento,
  c.data_inicio_calculo::text as data_inicial,
  c.data_fim_calculo::text as data_final,
  c.tribunal as estado,
  c.vara as municipio,
  false as prescricao_quinquenal,
  false as prescricao_fgts,
  'tempo_integral' as regime_trabalho,
  c.divisor_horas as carga_horaria_padrao,
  NULL::numeric as maior_remuneracao,
  NULL::numeric as ultima_remuneracao,
  c.aviso_previo_tipo as prazo_aviso_previo,
  c.aviso_previo_dias::text as prazo_aviso_dias,
  false as projetar_aviso_indenizado,
  false as limitar_avos_periodo,
  false as zerar_valor_negativo,
  true as sabado_dia_util,
  false as considerar_feriado_estadual,
  false as considerar_feriado_municipal,
  c.observacoes as comentarios,
  c.created_at,
  c.updated_at
FROM pjecalc_calculos c;

-- 2) pjecalc_dados_processo → view sobre pjecalc_calculos
CREATE OR REPLACE VIEW pjecalc_dados_processo AS
SELECT
  c.id,
  c.case_id,
  c.processo_cnj as numero_processo,
  c.reclamante_nome,
  c.reclamante_cpf,
  c.reclamado_nome as reclamada_nome,
  c.reclamado_cnpj as reclamada_cnpj,
  c.vara,
  NULL::text as comarca,
  NULL::text as objeto,
  c.created_at,
  c.updated_at
FROM pjecalc_calculos c;

-- 3) pjecalc_faltas → view sobre pjecalc_evento_intervalo (tipo != FERIAS)
CREATE OR REPLACE VIEW pjecalc_faltas AS
SELECT
  e.id,
  c.case_id,
  e.calculo_id,
  e.data_inicio::text as data_inicial,
  e.data_fim::text as data_final,
  e.tipo as tipo_falta,
  e.justificado as justificada,
  e.motivo,
  e.observacoes,
  e.created_at
FROM pjecalc_evento_intervalo e
JOIN pjecalc_calculos c ON e.calculo_id = c.id
WHERE e.tipo != 'FERIAS';

-- 4) pjecalc_ferias → view sobre pjecalc_evento_intervalo (tipo = FERIAS)
CREATE OR REPLACE VIEW pjecalc_ferias AS
SELECT
  e.id,
  c.case_id,
  e.calculo_id,
  e.ferias_aquisitivo_inicio::text as periodo_aquisitivo_inicio,
  e.ferias_aquisitivo_fim::text as periodo_aquisitivo_fim,
  e.ferias_concessivo_inicio::text as periodo_concessivo_inicio,
  e.ferias_concessivo_fim::text as periodo_concessivo_fim,
  e.data_inicio::text as gozo_inicio,
  e.data_fim::text as gozo_fim,
  e.ferias_dias as dias,
  e.ferias_abono as abono,
  e.ferias_dias_abono as dias_abono,
  e.ferias_dobra as dobra,
  e.ferias_situacao as situacao,
  e.ferias_gozo2_inicio::text as gozo2_inicio,
  e.ferias_gozo2_fim::text as gozo2_fim,
  e.ferias_gozo3_inicio::text as gozo3_inicio,
  e.ferias_gozo3_fim::text as gozo3_fim,
  e.observacoes,
  e.created_at
FROM pjecalc_evento_intervalo e
JOIN pjecalc_calculos c ON e.calculo_id = c.id
WHERE e.tipo = 'FERIAS';

-- 5) pjecalc_historico_salarial → view sobre pjecalc_hist_salarial
CREATE OR REPLACE VIEW pjecalc_historico_salarial AS
SELECT
  h.id,
  c.case_id,
  h.calculo_id,
  h.nome,
  h.tipo_variacao as tipo_valor,
  h.valor_fixo as valor_informado,
  NULL::text as periodo_inicio,
  NULL::text as periodo_fim,
  h.incide_fgts as incidencia_fgts,
  h.incide_inss as incidencia_cs,
  h.observacoes,
  h.created_at
FROM pjecalc_hist_salarial h
JOIN pjecalc_calculos c ON h.calculo_id = c.id;

-- 6) pjecalc_verbas → view sobre pjecalc_verba_base
CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade as ocorrencia_pagamento,
  CASE WHEN EXISTS(SELECT 1 FROM pjecalc_reflexo_base_verba rbv WHERE rbv.verba_base_id = v.id) THEN 'reflexa' ELSE 'principal' END as tipo,
  v.multiplicador,
  v.divisor as divisor_informado,
  v.periodo_inicio::text,
  v.periodo_fim::text,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  NULL::uuid as verba_principal_id,
  '{}'::jsonb as base_calculo,
  '{}'::jsonb as incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

-- 7) pjecalc_liquidacao_resultado → view sobre pjecalc_resultado
CREATE OR REPLACE VIEW pjecalc_liquidacao_resultado AS
SELECT
  r.id,
  c.case_id,
  r.calculo_id,
  r.total_bruto,
  r.total_liquido_antes_descontos as total_liquido,
  r.desconto_inss_reclamante as inss_segurado,
  r.desconto_ir as irrf,
  r.desconto_inss_reclamado as inss_patronal,
  r.honorarios,
  r.custas,
  r.fgts_depositar,
  r.fgts_multa_40,
  r.total_reclamante,
  r.total_reclamado,
  r.resumo_verbas as resultado,
  r.engine_version,
  r.calculado_em,
  r.created_at
FROM pjecalc_resultado r
JOIN pjecalc_calculos c ON r.calculo_id = c.id;

-- 8) pjecalc_ocorrencias → view sobre pjecalc_ocorrencia_calculo
CREATE OR REPLACE VIEW pjecalc_ocorrencias AS
SELECT
  o.id,
  c.case_id,
  o.calculo_id,
  o.verba_base_id as verba_id,
  o.nome as verba_nome,
  o.competencia::text,
  o.base_valor,
  o.multiplicador as multiplicador_valor,
  o.divisor as divisor_valor,
  o.quantidade as quantidade_valor,
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
  o.updated_at
FROM pjecalc_ocorrencia_calculo o
JOIN pjecalc_calculos c ON o.calculo_id = c.id;

-- 9) Config views (empty stubs for sub-components that query them)
CREATE OR REPLACE VIEW pjecalc_fgts_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  8.0::numeric as percentual_deposito,
  40.0::numeric as percentual_multa,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_cs_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  'progressiva'::text as regime,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_ir_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  'rra'::text as metodo,
  0::integer as dependentes,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_correcao_config AS
SELECT
  c.id,
  c.case_id,
  ac.regimes as config,
  ac.regime_padrao as indice_correcao,
  c.created_at
FROM pjecalc_calculos c
LEFT JOIN pjecalc_atualizacao_config ac ON ac.calculo_id = c.id AND ac.tipo = 'correcao';

CREATE OR REPLACE VIEW pjecalc_honorarios AS
SELECT
  c.id,
  c.case_id,
  c.honorarios_percentual as percentual,
  c.honorarios_sobre as sobre,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_multas_config AS
SELECT
  c.id,
  c.case_id,
  c.multa_477_habilitada as multa_477,
  c.multa_467_habilitada as multa_467,
  c.created_at
FROM pjecalc_calculos c;

-- 10) Cartão de ponto view (monthly aggregate from daily)
CREATE OR REPLACE VIEW pjecalc_cartao_ponto AS
SELECT
  gen_random_uuid() as id,
  c.case_id,
  a.calculo_id,
  to_char(a.data, 'YYYY-MM') as competencia,
  SUM(a.horas_trabalhadas) as horas_trabalhadas,
  SUM(a.horas_extras_diaria) as horas_extras_50,
  0::numeric as horas_extras_100,
  SUM(a.horas_noturnas) as horas_noturnas,
  0::numeric as horas_intrajornada,
  0::numeric as horas_interjornada,
  COUNT(*) FILTER (WHERE a.is_dsr) as dias_dsr,
  COUNT(*) FILTER (WHERE a.is_feriado) as dias_feriado,
  COUNT(*) FILTER (WHERE a.is_falta) as dias_falta,
  MIN(a.created_at) as created_at
FROM pjecalc_apuracao_diaria a
JOIN pjecalc_calculos c ON a.calculo_id = c.id
GROUP BY c.case_id, a.calculo_id, to_char(a.data, 'YYYY-MM');

-- 11) FGTS/CS ocorrencias views
CREATE OR REPLACE VIEW pjecalc_fgts_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias WHERE 1=0;

CREATE OR REPLACE VIEW pjecalc_cs_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias WHERE 1=0;

-- 12) pjecalc_verba_ocorrencias compatibility
CREATE OR REPLACE VIEW pjecalc_verba_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias;

-- 13) Custas config view
CREATE OR REPLACE VIEW pjecalc_custas_config AS
SELECT
  c.id,
  c.case_id,
  c.custas_percentual as percentual,
  c.custas_limite as limite,
  c.created_at
FROM pjecalc_calculos c;


-- ── Migration: 20260304124817_671167f0-a5dd-487a-bdef-ca07d7d5f96d.sql ──


-- Fix security definer views + add INSTEAD OF triggers for write compatibility

-- Set security invoker on all views
ALTER VIEW pjecalc_parametros SET (security_invoker = on);
ALTER VIEW pjecalc_dados_processo SET (security_invoker = on);
ALTER VIEW pjecalc_faltas SET (security_invoker = on);
ALTER VIEW pjecalc_ferias SET (security_invoker = on);
ALTER VIEW pjecalc_historico_salarial SET (security_invoker = on);
ALTER VIEW pjecalc_verbas SET (security_invoker = on);
ALTER VIEW pjecalc_liquidacao_resultado SET (security_invoker = on);
ALTER VIEW pjecalc_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_fgts_config SET (security_invoker = on);
ALTER VIEW pjecalc_cs_config SET (security_invoker = on);
ALTER VIEW pjecalc_ir_config SET (security_invoker = on);
ALTER VIEW pjecalc_correcao_config SET (security_invoker = on);
ALTER VIEW pjecalc_honorarios SET (security_invoker = on);
ALTER VIEW pjecalc_multas_config SET (security_invoker = on);
ALTER VIEW pjecalc_cartao_ponto SET (security_invoker = on);
ALTER VIEW pjecalc_fgts_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_cs_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_verba_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_custas_config SET (security_invoker = on);

-- Helper: get or create calculo_id for a case_id
CREATE OR REPLACE FUNCTION pjecalc_get_calculo_id(p_case_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO pjecalc_calculos (case_id, user_id) VALUES (p_case_id, auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;$$;

-- INSTEAD OF triggers for pjecalc_parametros
CREATE OR REPLACE FUNCTION pjecalc_parametros_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  UPDATE pjecalc_calculos SET
    data_admissao = NULLIF(NEW.data_admissao,'')::date,
    data_demissao = NULLIF(NEW.data_demissao,'')::date,
    data_ajuizamento = NULLIF(NEW.data_ajuizamento,'')::date,
    data_inicio_calculo = NULLIF(NEW.data_inicial,'')::date,
    data_fim_calculo = NULLIF(NEW.data_final,'')::date,
    tribunal = NEW.estado,
    vara = NEW.municipio,
    divisor_horas = COALESCE(NEW.carga_horaria_padrao, 220),
    observacoes = NEW.comentarios,
    updated_at = now()
  WHERE id = v_cid;
  NEW.id := v_cid;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_parametros_insert INSTEAD OF INSERT ON pjecalc_parametros FOR EACH ROW EXECUTE FUNCTION pjecalc_parametros_ioi();
CREATE TRIGGER pjecalc_parametros_update INSTEAD OF UPDATE ON pjecalc_parametros FOR EACH ROW EXECUTE FUNCTION pjecalc_parametros_ioi();

-- INSTEAD OF triggers for pjecalc_faltas
CREATE OR REPLACE FUNCTION pjecalc_faltas_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_evento_intervalo (calculo_id, tipo, data_inicio, data_fim, justificado, motivo, observacoes)
  VALUES (v_cid, COALESCE(NEW.tipo_falta, 'FALTA'), NULLIF(NEW.data_inicial,'')::date, NULLIF(NEW.data_final,'')::date, COALESCE(NEW.justificada, false), NEW.motivo, NEW.observacoes);
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_faltas_insert INSTEAD OF INSERT ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_ioi();

CREATE OR REPLACE FUNCTION pjecalc_faltas_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_evento_intervalo SET
    data_inicio = COALESCE(NULLIF(NEW.data_inicial,'')::date, data_inicio),
    data_fim = COALESCE(NULLIF(NEW.data_final,'')::date, data_fim),
    justificado = COALESCE(NEW.justificada, justificado),
    motivo = COALESCE(NEW.motivo, motivo)
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_faltas_update INSTEAD OF UPDATE ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_iou();

CREATE OR REPLACE FUNCTION pjecalc_faltas_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM pjecalc_evento_intervalo WHERE id = OLD.id;
  RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_faltas_delete INSTEAD OF DELETE ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_iod();

-- INSTEAD OF triggers for pjecalc_ferias
CREATE OR REPLACE FUNCTION pjecalc_ferias_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_evento_intervalo (
    calculo_id, tipo, data_inicio, data_fim,
    ferias_aquisitivo_inicio, ferias_aquisitivo_fim,
    ferias_concessivo_inicio, ferias_concessivo_fim,
    ferias_dias, ferias_abono, ferias_dias_abono, ferias_dobra, ferias_situacao,
    ferias_gozo2_inicio, ferias_gozo2_fim, ferias_gozo3_inicio, ferias_gozo3_fim,
    observacoes
  ) VALUES (
    v_cid, 'FERIAS',
    COALESCE(NULLIF(NEW.gozo_inicio,'')::date, NULLIF(NEW.periodo_aquisitivo_inicio,'')::date, CURRENT_DATE),
    COALESCE(NULLIF(NEW.gozo_fim,'')::date, NULLIF(NEW.periodo_aquisitivo_fim,'')::date, CURRENT_DATE),
    NULLIF(NEW.periodo_aquisitivo_inicio,'')::date, NULLIF(NEW.periodo_aquisitivo_fim,'')::date,
    NULLIF(NEW.periodo_concessivo_inicio,'')::date, NULLIF(NEW.periodo_concessivo_fim,'')::date,
    COALESCE(NEW.dias, 30), COALESCE(NEW.abono, false), COALESCE(NEW.dias_abono, 0),
    COALESCE(NEW.dobra, false), COALESCE(NEW.situacao, 'GOZADAS'),
    NULLIF(NEW.gozo2_inicio,'')::date, NULLIF(NEW.gozo2_fim,'')::date,
    NULLIF(NEW.gozo3_inicio,'')::date, NULLIF(NEW.gozo3_fim,'')::date,
    NEW.observacoes
  );
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ferias_insert INSTEAD OF INSERT ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_ioi();

CREATE OR REPLACE FUNCTION pjecalc_ferias_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_evento_intervalo SET
    ferias_situacao = COALESCE(NEW.situacao, ferias_situacao),
    ferias_dobra = COALESCE(NEW.dobra, ferias_dobra),
    ferias_abono = COALESCE(NEW.abono, ferias_abono)
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ferias_update INSTEAD OF UPDATE ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_iou();

CREATE OR REPLACE FUNCTION pjecalc_ferias_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_evento_intervalo WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_ferias_delete INSTEAD OF DELETE ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_iod();

-- INSTEAD OF triggers for pjecalc_historico_salarial
CREATE OR REPLACE FUNCTION pjecalc_hist_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_hist_salarial (calculo_id, nome, tipo_variacao, valor_fixo, incide_fgts, incide_inss, observacoes)
  VALUES (v_cid, NEW.nome, COALESCE(NEW.tipo_valor, 'VARIAVEL'), NEW.valor_informado, COALESCE(NEW.incidencia_fgts, true), COALESCE(NEW.incidencia_cs, true), NEW.observacoes)
  ON CONFLICT (calculo_id, nome) DO UPDATE SET valor_fixo = EXCLUDED.valor_fixo, observacoes = EXCLUDED.observacoes;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_hist_insert INSTEAD OF INSERT ON pjecalc_historico_salarial FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ioi();

CREATE OR REPLACE FUNCTION pjecalc_hist_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_hist_salarial WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_hist_delete INSTEAD OF DELETE ON pjecalc_historico_salarial FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_iod();

-- INSTEAD OF triggers for pjecalc_verbas
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_verba_base (calculo_id, nome, codigo, caracteristica, periodicidade, multiplicador, divisor, periodo_inicio, periodo_fim, ordem, ativa, observacoes)
  VALUES (v_cid, NEW.nome, NEW.codigo, COALESCE(NEW.caracteristica, 'COMUM'), COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1), COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date, NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0), COALESCE(NEW.ativa, true), NEW.observacoes)
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_verbas_insert INSTEAD OF INSERT ON pjecalc_verbas FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_ioi();

CREATE OR REPLACE FUNCTION pjecalc_verbas_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_verba_base WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_verbas_delete INSTEAD OF DELETE ON pjecalc_verbas FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_iod();

-- INSTEAD OF triggers for pjecalc_ocorrencias
CREATE OR REPLACE FUNCTION pjecalc_ocorr_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_ocorrencia_calculo (calculo_id, verba_base_id, tipo, nome, competencia, base_valor, multiplicador, divisor, quantidade, dobra, devido, pago, diferenca, correcao, juros, total, origem, ativa)
  VALUES (v_cid, NEW.verba_id, COALESCE(NEW.verba_nome, 'VERBA'), COALESCE(NEW.verba_nome, ''), NEW.competencia::date,
    COALESCE(NEW.base_valor, 0), COALESCE(NEW.multiplicador_valor, 1), COALESCE(NEW.divisor_valor, 1),
    COALESCE(NEW.quantidade_valor, 1), COALESCE(NEW.dobra, 1), COALESCE(NEW.devido, 0), COALESCE(NEW.pago, 0),
    COALESCE(NEW.diferenca, 0), COALESCE(NEW.correcao, 0), COALESCE(NEW.juros, 0), COALESCE(NEW.total, 0),
    COALESCE(NEW.origem, 'CALCULADA'), COALESCE(NEW.ativa, true));
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ocorr_insert INSTEAD OF INSERT ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_ioi();

CREATE OR REPLACE FUNCTION pjecalc_ocorr_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_ocorrencia_calculo SET
    base_valor = COALESCE(NEW.base_valor, base_valor),
    multiplicador = COALESCE(NEW.multiplicador_valor, multiplicador),
    divisor = COALESCE(NEW.divisor_valor, divisor),
    quantidade = COALESCE(NEW.quantidade_valor, quantidade),
    dobra = COALESCE(NEW.dobra, dobra),
    devido = COALESCE(NEW.devido, devido),
    pago = COALESCE(NEW.pago, pago),
    diferenca = COALESCE(NEW.diferenca, diferenca),
    correcao = COALESCE(NEW.correcao, correcao),
    juros = COALESCE(NEW.juros, juros),
    total = COALESCE(NEW.total, total),
    origem = COALESCE(NEW.origem, origem),
    ativa = COALESCE(NEW.ativa, ativa),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ocorr_update INSTEAD OF UPDATE ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_iou();

CREATE OR REPLACE FUNCTION pjecalc_ocorr_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_ocorrencia_calculo WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_ocorr_delete INSTEAD OF DELETE ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_iod();

-- INSTEAD OF for pjecalc_liquidacao_resultado
CREATE OR REPLACE FUNCTION pjecalc_liq_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_resultado (calculo_id, total_bruto, total_liquido_antes_descontos, desconto_inss_reclamante, desconto_ir, desconto_inss_reclamado, honorarios, custas, fgts_depositar, fgts_multa_40, total_reclamante, total_reclamado, resumo_verbas, engine_version)
  VALUES (v_cid, COALESCE(NEW.total_bruto, 0), COALESCE(NEW.total_liquido, 0), COALESCE(NEW.inss_segurado, 0), COALESCE(NEW.irrf, 0), COALESCE(NEW.inss_patronal, 0), COALESCE(NEW.honorarios, 0), COALESCE(NEW.custas, 0), COALESCE(NEW.fgts_depositar, 0), COALESCE(NEW.fgts_multa_40, 0), COALESCE(NEW.total_reclamante, 0), COALESCE(NEW.total_reclamado, 0), COALESCE(NEW.resultado, '[]'::jsonb), NEW.engine_version)
  ON CONFLICT (calculo_id) DO UPDATE SET
    total_bruto = EXCLUDED.total_bruto, total_liquido_antes_descontos = EXCLUDED.total_liquido_antes_descontos,
    desconto_inss_reclamante = EXCLUDED.desconto_inss_reclamante, desconto_ir = EXCLUDED.desconto_ir,
    honorarios = EXCLUDED.honorarios, custas = EXCLUDED.custas, fgts_depositar = EXCLUDED.fgts_depositar,
    fgts_multa_40 = EXCLUDED.fgts_multa_40, total_reclamante = EXCLUDED.total_reclamante,
    total_reclamado = EXCLUDED.total_reclamado, resumo_verbas = EXCLUDED.resumo_verbas,
    calculado_em = now();
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_liq_insert INSTEAD OF INSERT ON pjecalc_liquidacao_resultado FOR EACH ROW EXECUTE FUNCTION pjecalc_liq_ioi();

-- INSTEAD OF for pjecalc_dados_processo
CREATE OR REPLACE FUNCTION pjecalc_dp_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  UPDATE pjecalc_calculos SET
    processo_cnj = COALESCE(NEW.numero_processo, processo_cnj),
    reclamante_nome = COALESCE(NEW.reclamante_nome, reclamante_nome),
    reclamante_cpf = COALESCE(NEW.reclamante_cpf, reclamante_cpf),
    reclamado_nome = COALESCE(NEW.reclamada_nome, reclamado_nome),
    reclamado_cnpj = COALESCE(NEW.reclamada_cnpj, reclamado_cnpj),
    vara = COALESCE(NEW.vara, vara),
    updated_at = now()
  WHERE id = v_cid;
  NEW.id := v_cid;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_dp_insert INSTEAD OF INSERT ON pjecalc_dados_processo FOR EACH ROW EXECUTE FUNCTION pjecalc_dp_ioi();
CREATE TRIGGER pjecalc_dp_update INSTEAD OF UPDATE ON pjecalc_dados_processo FOR EACH ROW EXECUTE FUNCTION pjecalc_dp_ioi();


-- ── Migration: 20260304131453_ef4ef323-d72f-4f42-8c9c-d22e4c1c0ac9.sql ──


-- ============================================
-- A1) DocumentPipeline: ingestão robusta
-- ============================================

-- Tipos de documento para pipeline
CREATE TYPE public.pipeline_doc_type AS ENUM (
  'CTPS', 'CARTAO_PONTO', 'FICHA_FINANCEIRA', 'CONTRACHEQUE', 'PJC', 'OUTRO'
);

CREATE TYPE public.extracao_status AS ENUM (
  'AUTO', 'REVISAR', 'CONFIRMADO', 'REJEITADO'
);

-- Tabela principal do pipeline
CREATE TABLE public.document_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  pipeline_type pipeline_doc_type NOT NULL DEFAULT 'OUTRO',
  hash TEXT,
  pages_count INTEGER,
  empresa_detectada TEXT,
  template_detectado TEXT,
  template_version TEXT,
  periodo_detectado_inicio DATE,
  periodo_detectado_fim DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens de extração individuais
CREATE TABLE public.extracao_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.document_pipeline(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  field_key TEXT NOT NULL,
  valor TEXT,
  confidence NUMERIC(5,4),
  page INTEGER,
  evidence_text TEXT,
  bbox JSONB,
  source_doc_id UUID REFERENCES public.documents(id),
  status extracao_status NOT NULL DEFAULT 'AUTO',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  target_table TEXT,
  target_field TEXT,
  competencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mapeamento de rubricas versionado
CREATE TABLE public.rubrica_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_pattern TEXT,
  codigo_original TEXT NOT NULL,
  descricao_original TEXT NOT NULL,
  rubrica_destino TEXT NOT NULL,
  categoria TEXT,
  regex_pattern TEXT,
  is_pgto BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_pattern, codigo_original, descricao_original, version)
);

-- Conflitos entre fontes documentais
CREATE TABLE public.fonte_conflito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_fonte_a TEXT,
  fonte_a_doc_id UUID REFERENCES public.documents(id),
  valor_fonte_b TEXT,
  fonte_b_doc_id UUID REFERENCES public.documents(id),
  valor_escolhido TEXT,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  justificativa TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.document_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrica_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fonte_conflito ENABLE ROW LEVEL SECURITY;

-- Policies para document_pipeline
CREATE POLICY "Users can manage own pipeline docs" ON public.document_pipeline
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies para extracao_item (via pipeline ownership)
CREATE POLICY "Users can manage extraction items" ON public.extracao_item
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_pipeline dp WHERE dp.id = extracao_item.pipeline_id AND dp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.document_pipeline dp WHERE dp.id = extracao_item.pipeline_id AND dp.user_id = auth.uid()));

-- rubrica_map is shared (read all, write authenticated)
CREATE POLICY "Anyone can read rubrica maps" ON public.rubrica_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert rubrica maps" ON public.rubrica_map FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rubrica maps" ON public.rubrica_map FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- fonte_conflito via case ownership
CREATE POLICY "Users can manage conflicts" ON public.fonte_conflito
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = fonte_conflito.case_id AND c.criado_por = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = fonte_conflito.case_id AND c.criado_por = auth.uid()));

-- Indexes
CREATE INDEX idx_document_pipeline_case ON public.document_pipeline(case_id);
CREATE INDEX idx_document_pipeline_doc ON public.document_pipeline(document_id);
CREATE INDEX idx_extracao_item_pipeline ON public.extracao_item(pipeline_id);
CREATE INDEX idx_extracao_item_case ON public.extracao_item(case_id);
CREATE INDEX idx_extracao_item_status ON public.extracao_item(status);
CREATE INDEX idx_rubrica_map_empresa ON public.rubrica_map(empresa_pattern);
CREATE INDEX idx_fonte_conflito_case ON public.fonte_conflito(case_id);

