-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 3 (files 21 to 30 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260121195335_545970c8-10e3-4614-9953-d1b4ac1d6450.sql ──

-- Move vector extension out of public schema (security linter)
ALTER EXTENSION vector SET SCHEMA extensions;

-- Recreate view as security invoker (avoid SECURITY DEFINER)
DROP VIEW IF EXISTS public.case_processing_stats;

CREATE VIEW public.case_processing_stats
WITH (security_invoker=on)
AS
SELECT c.id AS case_id,
  c.criado_por AS owner_id,
  count(d.id) AS total_documents,
  count(d.id) FILTER (WHERE d.status = 'embedded'::text) AS indexed_documents,
  count(d.id) FILTER (WHERE d.status = ANY (ARRAY['uploaded'::text, 'pending'::text])) AS pending_documents,
  count(d.id) FILTER (WHERE d.status = 'processing'::text) AS processing_documents,
  count(d.id) FILTER (WHERE d.status = 'failed'::text) AS failed_documents,
  COALESCE(sum(dc.chunk_count), 0::numeric) AS total_chunks,
  max(d.processing_completed_at) AS last_processed_at
FROM cases c
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN (
  SELECT document_chunks.document_id,
    count(*) AS chunk_count
  FROM document_chunks
  WHERE document_chunks.embedding IS NOT NULL
  GROUP BY document_chunks.document_id
) dc ON dc.document_id = d.id
WHERE c.criado_por = auth.uid()
GROUP BY c.id, c.criado_por;


-- ── Migration: 20260124050428_53c6086c-88e4-4ec9-b42a-89da241ada8d.sql ──

-- =====================================================
-- MODELO DE DADOS AUDITÁVEL - LIQUIDAÇÃO TRABALHISTA
-- =====================================================

-- 1. ENUM para tipo de parte
DO $$ BEGIN
  CREATE TYPE party_type AS ENUM ('reclamante', 'reclamada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. ENUM para tipo de demissão
DO $$ BEGIN
  CREATE TYPE termination_type AS ENUM (
    'sem_justa_causa', 
    'justa_causa', 
    'pedido_demissao', 
    'rescisao_indireta', 
    'acordo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. ENUM para status de validação
DO $$ BEGIN
  CREATE TYPE validation_action AS ENUM ('aprovar', 'editar', 'rejeitar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. ENUM para status de snapshot
DO $$ BEGIN
  CREATE TYPE snapshot_status AS ENUM ('gerado', 'revisao', 'aprovado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABELA: parties (Partes do processo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo party_type NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT, -- CPF ou CNPJ
  documento_tipo TEXT, -- 'cpf' ou 'cnpj'
  contato JSONB DEFAULT '{}'::jsonb, -- telefone, email, endereço
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para parties
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parties of their cases"
ON public.parties FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert parties to their cases"
ON public.parties FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update parties of their cases"
ON public.parties FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete parties of their cases"
ON public.parties FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: employment_contracts (Contrato de trabalho)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employment_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  
  -- Datas
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  tipo_demissao termination_type,
  
  -- Informações do cargo
  funcao TEXT,
  local_trabalho TEXT,
  sindicato TEXT,
  
  -- Salário inicial
  salario_inicial DECIMAL(15,2),
  
  -- Histórico salarial (JSON array)
  historico_salarial JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{data_inicio, data_fim, salario_base, adicionais_fixos: {nome, valor}[]}]
  
  -- Jornada
  jornada_contratual JSONB DEFAULT '{"horas_semanais": 44, "divisor": 220}'::jsonb,
  
  -- Observações
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para employment_contracts
ALTER TABLE public.employment_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts of their cases"
ON public.employment_contracts FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert contracts to their cases"
ON public.employment_contracts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update contracts of their cases"
ON public.employment_contracts FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete contracts of their cases"
ON public.employment_contracts FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: extractions (Extrações OCR/IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  
  -- Campo extraído
  campo TEXT NOT NULL, -- ex: salario_base, horas_extras_50
  valor_proposto TEXT NOT NULL,
  tipo_valor TEXT NOT NULL DEFAULT 'texto', -- money, number, date, string, duration
  
  -- Confiança
  confianca DECIMAL(3,2), -- 0.00 a 1.00
  
  -- Origem/Proveniência
  origem JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Formato: {pagina, trecho_texto, linha, bounding_box?, coordenadas?}
  
  metodo TEXT DEFAULT 'ocr', -- ocr, regra, modelo
  
  -- Status
  status TEXT DEFAULT 'pendente', -- pendente, validado, rejeitado
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para extractions
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions of their cases"
ON public.extractions FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert extractions to their cases"
ON public.extractions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update extractions of their cases"
ON public.extractions FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete extractions of their cases"
ON public.extractions FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: validations (Validações humanas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES public.extractions(id) ON DELETE SET NULL,
  snapshot_id UUID, -- Será referenciado após criar calc_snapshots
  
  -- Campo validado
  campo TEXT NOT NULL,
  
  -- Valores
  valor_anterior TEXT, -- proposto
  valor_validado TEXT, -- aprovado/editado
  
  -- Ação
  acao validation_action NOT NULL,
  justificativa TEXT,
  
  -- Auditoria
  usuario_id UUID NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS para validations
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations of their cases"
ON public.validations FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert validations to their cases"
ON public.validations FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update validations of their cases"
ON public.validations FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: calc_rules (Regras/Rubricas de cálculo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE, -- HE50, HE100, DSR_HE, ADIC_NOT, etc.
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL, -- horas_extras, reflexos, rescisao, tributos
  
  -- Fórmula estruturada
  formula JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Formato: {expressao, variaveis[], operacoes[]}
  
  -- Parâmetros requeridos
  parametros_requeridos JSONB DEFAULT '[]'::jsonb,
  
  -- Versionamento
  versao TEXT NOT NULL DEFAULT 'v1',
  versao_numero INTEGER NOT NULL DEFAULT 1,
  
  -- Vigência
  vigencia_inicio DATE,
  vigencia_fim DATE,
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_rules (leitura pública para autenticados)
ALTER TABLE public.calc_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view calc rules"
ON public.calc_rules FOR SELECT
USING (ativo = true);

-- =====================================================
-- TABELA: calc_snapshots (Execuções de cálculo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.calculation_profiles(id),
  
  -- Versionamento
  versao INTEGER NOT NULL DEFAULT 1,
  engine_version TEXT NOT NULL DEFAULT '2.0.0',
  ruleset_hash TEXT, -- Hash do conjunto de regras usado
  
  -- Status
  status snapshot_status NOT NULL DEFAULT 'gerado',
  
  -- Snapshot de inputs
  inputs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contém: fatos validados, parâmetros do perfil, regras usadas
  
  -- Resultados consolidados
  resultado_bruto JSONB DEFAULT '{}'::jsonb,
  resultado_liquido JSONB DEFAULT '{}'::jsonb,
  total_bruto DECIMAL(15,2),
  total_liquido DECIMAL(15,2),
  total_descontos DECIMAL(15,2),
  
  -- Warnings e alertas
  warnings JSONB DEFAULT '[]'::jsonb,
  alertas_consistencia JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT
);

-- RLS para calc_snapshots
ALTER TABLE public.calc_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots of their cases"
ON public.calc_snapshots FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can create snapshots for their cases"
ON public.calc_snapshots FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update snapshots of their cases"
ON public.calc_snapshots FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: calc_result_items (Itens de resultado)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_result_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.calc_snapshots(id) ON DELETE CASCADE,
  
  -- Rubrica
  rubrica_codigo TEXT NOT NULL,
  rubrica_nome TEXT,
  
  -- Período
  competencia TEXT, -- "2024-01" ou null para itens únicos
  periodo_inicio DATE,
  periodo_fim DATE,
  
  -- Valores de cálculo
  base_calculo DECIMAL(15,4),
  quantidade DECIMAL(15,4), -- horas, dias, meses
  percentual DECIMAL(8,4),
  fator DECIMAL(8,4),
  
  -- Resultado
  valor_bruto DECIMAL(15,2) NOT NULL,
  valor_liquido DECIMAL(15,2),
  
  -- Memória detalhada
  memoria_detalhada JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{passo, descricao, formula, valor}]
  
  -- Dependências (outras rubricas que este item usa)
  dependencias JSONB DEFAULT '[]'::jsonb,
  
  -- Ordem de exibição
  ordem INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_result_items
ALTER TABLE public.calc_result_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view result items of their snapshots"
ON public.calc_result_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_result_items.snapshot_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert result items to their snapshots"
ON public.calc_result_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_result_items.snapshot_id AND c.criado_por = auth.uid()
));

-- =====================================================
-- TABELA: calc_lineage (Proveniência/Rastreabilidade)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_lineage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.calc_snapshots(id) ON DELETE CASCADE,
  result_item_id UUID REFERENCES public.calc_result_items(id) ON DELETE CASCADE,
  
  -- Regra/Fórmula usada
  rule_id UUID REFERENCES public.calc_rules(id),
  rule_codigo TEXT,
  rule_versao TEXT,
  
  -- Inputs com origem
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{campo, valor, tipo, fonte_documento_id, fonte_pagina, fonte_trecho, validacao_id}]
  
  -- Parâmetros do perfil usados
  parametros JSONB DEFAULT '{}'::jsonb,
  
  -- Fórmula aplicada (string legível)
  formula_aplicada TEXT,
  
  -- Output
  output_valor DECIMAL(15,4),
  output_tipo TEXT,
  
  -- Hash para reprodutibilidade
  hash_reproducao TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_lineage
ALTER TABLE public.calc_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lineage of their snapshots"
ON public.calc_lineage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_lineage.snapshot_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert lineage to their snapshots"
ON public.calc_lineage FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_lineage.snapshot_id AND c.criado_por = auth.uid()
));

-- =====================================================
-- TABELA: test_scenarios (Cenários de teste)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.test_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Inputs do cenário
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Resultados esperados
  resultados_esperados JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Última execução
  ultima_execucao TIMESTAMPTZ,
  ultimo_resultado TEXT, -- pass, fail
  ultimo_diff JSONB,
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para test_scenarios
ALTER TABLE public.test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view test scenarios"
ON public.test_scenarios FOR SELECT
USING (ativo = true);

-- =====================================================
-- Adicionar FK de validations para calc_snapshots
-- =====================================================
ALTER TABLE public.validations 
ADD CONSTRAINT validations_snapshot_fk 
FOREIGN KEY (snapshot_id) REFERENCES public.calc_snapshots(id) ON DELETE SET NULL;

-- =====================================================
-- Adicionar campos extras à tabela cases
-- =====================================================
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tribunal TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =====================================================
-- Adicionar campos extras à tabela documents
-- =====================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS periodo_inicio DATE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS periodo_fim DATE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS competencia TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS hash_integridade TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS versao_documento INTEGER DEFAULT 1;

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_parties_case ON public.parties(case_id);
CREATE INDEX IF NOT EXISTS idx_contracts_case ON public.employment_contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_extractions_case ON public.extractions(case_id);
CREATE INDEX IF NOT EXISTS idx_extractions_document ON public.extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_validations_case ON public.validations(case_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_case ON public.calc_snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_result_items_snapshot ON public.calc_result_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_lineage_snapshot ON public.calc_lineage(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_calc_rules_codigo ON public.calc_rules(codigo);

-- ── Migration: 20260124122925_d0ddd4ec-e586-4dbb-94aa-fc9319d17ed3.sql ──

-- Seed calculators matching the registry in engine.ts (using gen_random_uuid for UUIDs)
INSERT INTO public.calculators (id, nome, categoria, descricao, inputs_esperados, outputs, ativo, tags) VALUES
  (gen_random_uuid(), 'horas_extras', 'verbas_base', 'Cálculo de horas extras 50% e 100%', '{"horas_50": "number", "horas_100": "number", "salario_hora": "number"}', '{"he_50": "number", "he_100": "number", "total": "number"}', true, ARRAY['hora-extra', 'verba-base']),
  (gen_random_uuid(), 'reflexos_13', 'reflexos', 'Reflexos sobre 13º salário', '{"base_calculo": "number", "meses": "number"}', '{"reflexo_13": "number"}', true, ARRAY['reflexo', '13-salario']),
  (gen_random_uuid(), 'reflexos_ferias', 'reflexos', 'Reflexos sobre férias + 1/3', '{"base_calculo": "number", "meses": "number"}', '{"reflexo_ferias": "number"}', true, ARRAY['reflexo', 'ferias']),
  (gen_random_uuid(), 'fgts', 'encargos', 'Cálculo de FGTS sobre verbas', '{"base_fgts": "number"}', '{"fgts": "number", "multa_40": "number"}', true, ARRAY['fgts', 'encargo']),
  (gen_random_uuid(), 'inss', 'descontos', 'Cálculo de INSS progressivo', '{"base_inss": "number", "competencia": "string"}', '{"desconto_inss": "number"}', true, ARRAY['inss', 'desconto']),
  (gen_random_uuid(), 'atualizacao_monetaria', 'atualizacao', 'Atualização monetária e juros', '{"valor_original": "number", "data_base": "string"}', '{"valor_atualizado": "number", "correcao": "number", "juros": "number"}', true, ARRAY['atualizacao', 'juros']);

-- ── Migration: 20260124122944_5b1d68f7-bb0f-4b63-b021-9dc4acf73af8.sql ──

-- Create calculator versions for each calculator
INSERT INTO public.calculator_versions (calculator_id, versao, vigencia_inicio, ativo, regras, changelog) VALUES
  ('7f39fe1e-e210-4d17-bd53-b78b236a2c4d', '1.0.0', '2024-01-01', true, '{"adicional_50": 0.5, "adicional_100": 1.0, "regras": {"base": "salario_hora", "divisor": 220}}', 'Versão inicial - horas extras'),
  ('8e72e1d4-25ef-404f-97c2-b4f3ac57eb29', '1.0.0', '2024-01-01', true, '{"fator_13": 0.0833, "regras": {"proporcional": true}}', 'Versão inicial - reflexos 13º'),
  ('bc90b40e-ab4a-44f8-9baa-7b8f8be1f718', '1.0.0', '2024-01-01', true, '{"fator_ferias": 0.1111, "terco_constitucional": true, "regras": {"proporcional": true}}', 'Versão inicial - reflexos férias'),
  ('5efb4e02-87fc-43c5-a1de-bbf96218d3bb', '1.0.0', '2024-01-01', true, '{"aliquota": 0.08, "multa_rescisoria": 0.4, "regras": {"incide_sobre": ["he_50", "he_100", "dsr"]}}', 'Versão inicial - FGTS'),
  ('92de77f5-49bb-40f9-aea8-0ab0c1df7e98', '1.0.0', '2024-01-01', true, '{"progressivo": true, "regras": {"tabela_vigente": true}}', 'Versão inicial - INSS'),
  ('fcde3bbf-4170-42a5-b913-6b508bbf0f6a', '1.0.0', '2024-01-01', true, '{"indice": "ipca_e", "juros": "selic", "regras": {"aplicar_juros": true}}', 'Versão inicial - atualização monetária');

-- ── Migration: 20260124123001_30bc4f12-669f-4b53-bcad-d9a1d5eb3cfa.sql ──

-- Link calculator versions to the TRT-3 Padrão profile (all calculators)
INSERT INTO public.profile_calculators (profile_id, calculator_version_id) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '0835c819-6d15-43c6-9aa5-490443f8a74d'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a9afe84e-d609-4abd-b860-2c1e87ca762d'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'e8d71ae2-e019-49ba-8508-e4b64a302914'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8042dbed-1ce9-4db2-8a83-539c6b73e2fe'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'd6501751-5ca3-49db-ad53-e367dd963696'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '360a6a5a-e0d4-4725-b86a-d40f9c53edb8');

-- Link to Acordo profile (without some reflexos)
INSERT INTO public.profile_calculators (profile_id, calculator_version_id) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '0835c819-6d15-43c6-9aa5-490443f8a74d'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '8042dbed-1ce9-4db2-8a83-539c6b73e2fe'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'd6501751-5ca3-49db-ad53-e367dd963696');

-- Link to Trabalho Noturno profile (all calculators)
INSERT INTO public.profile_calculators (profile_id, calculator_version_id) VALUES
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '0835c819-6d15-43c6-9aa5-490443f8a74d'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'a9afe84e-d609-4abd-b860-2c1e87ca762d'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'e8d71ae2-e019-49ba-8508-e4b64a302914'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '8042dbed-1ce9-4db2-8a83-539c6b73e2fe'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'd6501751-5ca3-49db-ad53-e367dd963696'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '360a6a5a-e0d4-4725-b86a-d40f9c53edb8');

-- ── Migration: 20260124124001_83af783c-9d60-434e-b719-14e3d5ad3da4.sql ──

-- =============================================
-- MODO PERICIAL: Tabelas para Cálculo Defensável
-- =============================================

-- 1) CENÁRIOS/TESES: Premissas travadas por snapshot
CREATE TABLE IF NOT EXISTS public.calc_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('conservador', 'tese_forte', 'sentenca', 'custom')),
  descricao TEXT,
  -- Premissas travadas
  prescricao_tipo TEXT CHECK (prescricao_tipo IN ('quinquenal', 'bienal', 'nenhuma', 'custom')),
  prescricao_data_limite DATE,
  divisor INTEGER NOT NULL DEFAULT 220,
  metodo_he TEXT NOT NULL DEFAULT 'diaria' CHECK (metodo_he IN ('diaria', 'semanal', 'hibrida')),
  metodo_dsr TEXT NOT NULL DEFAULT 'calendario' CHECK (metodo_dsr IN ('calendario', 'fator_fixo')),
  dsr_fator NUMERIC(4,2) DEFAULT 6,
  media_variaveis_metodo TEXT DEFAULT 'ultimos_12' CHECK (media_variaveis_metodo IN ('ultimos_12', 'todo_periodo', 'maior_remuneracao', 'custom')),
  indice_correcao TEXT DEFAULT 'IPCA-E',
  taxa_juros NUMERIC(5,2) DEFAULT 1.0,
  -- Config completa em JSON para flexibilidade
  premissas_completas JSONB DEFAULT '{}',
  hash_config TEXT,
  -- Auditoria
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) PONTOS CONTROVERTIDOS: Gestão de controvérsias
CREATE TABLE IF NOT EXISTS public.case_controversies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('incontroverso', 'controvertido', 'resolvido')),
  -- Escolha e justificativa
  valor_escolhido TEXT,
  justificativa TEXT,
  fundamentacao_legal TEXT,
  -- Evidências vinculadas
  fact_ids UUID[] DEFAULT '{}',
  document_ids UUID[] DEFAULT '{}',
  -- Impacto
  impacto_estimado NUMERIC(15,2),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  -- Auditoria
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) ANÁLISE DE RISCO: Cálculo de risco do caso
CREATE TABLE IF NOT EXISTS public.case_risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  -- Nível geral
  nivel_risco TEXT NOT NULL CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
  score_risco INTEGER CHECK (score_risco >= 0 AND score_risco <= 100),
  -- Fatores de risco individuais
  fatores JSONB NOT NULL DEFAULT '[]',
  -- Resumo
  resumo TEXT,
  recomendacoes TEXT[],
  -- Versão/snapshot
  snapshot_id UUID REFERENCES public.calc_snapshots(id),
  -- Auditoria
  analisado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  analisado_por UUID REFERENCES auth.users(id)
);

-- 4) VALIDAÇÃO PERICIAL: Status estendido para fatos
ALTER TABLE public.facts 
  ADD COLUMN IF NOT EXISTS status_pericial TEXT CHECK (status_pericial IN ('incontroverso', 'controvertido', 'pendente')) DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS justificativa_validacao TEXT,
  ADD COLUMN IF NOT EXISTS prova_qualidade TEXT CHECK (prova_qualidade IN ('forte', 'media', 'fraca', 'ausente')) DEFAULT 'media';

-- 5) REQUISITOS DE PROVA por Rubrica
CREATE TABLE IF NOT EXISTS public.rubrica_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_codigo TEXT NOT NULL UNIQUE,
  rubrica_nome TEXT NOT NULL,
  -- Requisitos de prova
  documentos_requeridos TEXT[] NOT NULL DEFAULT '{}',
  fatos_requeridos TEXT[] NOT NULL DEFAULT '{}',
  descricao_requisito TEXT,
  -- Alertas
  alerta_sem_prova TEXT,
  nivel_exigencia TEXT DEFAULT 'obrigatorio' CHECK (nivel_exigencia IN ('obrigatorio', 'recomendado', 'opcional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) CALENDÁRIO VERSIONADO
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  municipio TEXT,
  ano INTEGER NOT NULL,
  feriados JSONB NOT NULL DEFAULT '[]',
  hash_versao TEXT NOT NULL,
  fonte TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) SNAPSHOT: Adicionar campos periciais
ALTER TABLE public.calc_snapshots
  ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES public.calc_scenarios(id),
  ADD COLUMN IF NOT EXISTS periodo_inicio DATE,
  ADD COLUMN IF NOT EXISTS periodo_fim DATE,
  ADD COLUMN IF NOT EXISTS prescricao_aplicada DATE,
  ADD COLUMN IF NOT EXISTS calendario_hash TEXT,
  ADD COLUMN IF NOT EXISTS qualidade_score INTEGER CHECK (qualidade_score >= 0 AND qualidade_score <= 100),
  ADD COLUMN IF NOT EXISTS pendencias JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS diff_anterior JSONB;

-- 8) DOCUMENTOS: Campos adicionais para validação
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS periodo_referencia_inicio DATE,
  ADD COLUMN IF NOT EXISTS periodo_referencia_fim DATE,
  ADD COLUMN IF NOT EXISTS ocr_confianca NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS validado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES auth.users(id);

-- Seed: Requisitos de prova para rubricas principais
INSERT INTO public.rubrica_requirements (rubrica_codigo, rubrica_nome, documentos_requeridos, fatos_requeridos, alerta_sem_prova, nivel_exigencia) VALUES
  ('HE50', 'Horas Extras 50%', ARRAY['cartao_ponto', 'holerite'], ARRAY['jornada_contratual', 'salario_base'], 'Cálculo de HE sem cartão de ponto ou holerite pode ser impugnado', 'obrigatorio'),
  ('HE100', 'Horas Extras 100%', ARRAY['cartao_ponto', 'holerite'], ARRAY['jornada_contratual', 'salario_base'], 'Cálculo de HE sem cartão de ponto ou holerite pode ser impugnado', 'obrigatorio'),
  ('DSR_HE', 'DSR sobre Horas Extras', ARRAY['cartao_ponto'], ARRAY['jornada_contratual'], 'DSR depende de prova de jornada extraordinária', 'obrigatorio'),
  ('ADIC_NOT', 'Adicional Noturno', ARRAY['cartao_ponto'], ARRAY['jornada_contratual'], 'Adicional noturno requer prova de trabalho noturno', 'obrigatorio'),
  ('FGTS', 'FGTS', ARRAY['holerite', 'trct'], ARRAY['salario_mensal'], 'FGTS pode ser calculado com base em salário presumido', 'recomendado'),
  ('SALDO_SAL', 'Saldo de Salário', ARRAY['trct'], ARRAY['data_demissao', 'salario_mensal'], 'Saldo requer data exata de demissão', 'obrigatorio'),
  ('AVISO_PREVIO', 'Aviso Prévio', ARRAY['trct'], ARRAY['data_admissao', 'data_demissao'], 'Aviso prévio requer tempo de serviço comprovado', 'obrigatorio'),
  ('FERIAS_PROP', 'Férias Proporcionais', ARRAY['trct', 'holerite'], ARRAY['data_admissao', 'data_demissao', 'salario_mensal'], 'Férias proporcionais dependem de período aquisitivo', 'obrigatorio'),
  ('DECIMO_PROP', '13º Proporcional', ARRAY['trct', 'holerite'], ARRAY['data_demissao', 'salario_mensal'], '13º proporcional depende de meses trabalhados no ano', 'obrigatorio'),
  ('MULTA_FGTS', 'Multa 40% FGTS', ARRAY['trct'], ARRAY['tipo_demissao'], 'Multa depende de tipo de demissão e saldo de FGTS', 'obrigatorio')
ON CONFLICT (rubrica_codigo) DO NOTHING;

-- Seed: Calendário 2024/2025 para MG
INSERT INTO public.calendars (nome, uf, municipio, ano, feriados, hash_versao, fonte) VALUES
  ('Calendário MG 2024', 'MG', NULL, 2024, '[
    {"data": "2024-01-01", "nome": "Confraternização Universal"},
    {"data": "2024-02-12", "nome": "Carnaval"},
    {"data": "2024-02-13", "nome": "Carnaval"},
    {"data": "2024-03-29", "nome": "Sexta-feira Santa"},
    {"data": "2024-04-21", "nome": "Tiradentes"},
    {"data": "2024-05-01", "nome": "Dia do Trabalho"},
    {"data": "2024-05-30", "nome": "Corpus Christi"},
    {"data": "2024-09-07", "nome": "Independência"},
    {"data": "2024-10-12", "nome": "Nossa Senhora Aparecida"},
    {"data": "2024-11-02", "nome": "Finados"},
    {"data": "2024-11-15", "nome": "Proclamação da República"},
    {"data": "2024-12-25", "nome": "Natal"}
  ]'::jsonb, 'mg_2024_v1', 'TST'),
  ('Calendário MG 2025', 'MG', NULL, 2025, '[
    {"data": "2025-01-01", "nome": "Confraternização Universal"},
    {"data": "2025-03-03", "nome": "Carnaval"},
    {"data": "2025-03-04", "nome": "Carnaval"},
    {"data": "2025-04-18", "nome": "Sexta-feira Santa"},
    {"data": "2025-04-21", "nome": "Tiradentes"},
    {"data": "2025-05-01", "nome": "Dia do Trabalho"},
    {"data": "2025-06-19", "nome": "Corpus Christi"},
    {"data": "2025-09-07", "nome": "Independência"},
    {"data": "2025-10-12", "nome": "Nossa Senhora Aparecida"},
    {"data": "2025-11-02", "nome": "Finados"},
    {"data": "2025-11-15", "nome": "Proclamação da República"},
    {"data": "2025-12-25", "nome": "Natal"}
  ]'::jsonb, 'mg_2025_v1', 'TST')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.calc_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_controversies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrica_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para usuários autenticados
CREATE POLICY "Authenticated users can manage scenarios" ON public.calc_scenarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage controversies" ON public.case_controversies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view risk analysis" ON public.case_risk_analysis FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can view rubrica requirements" ON public.rubrica_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can view calendars" ON public.calendars FOR SELECT USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calc_scenarios_case_id ON public.calc_scenarios(case_id);
CREATE INDEX IF NOT EXISTS idx_case_controversies_case_id ON public.case_controversies(case_id);
CREATE INDEX IF NOT EXISTS idx_case_risk_analysis_case_id ON public.case_risk_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_calendars_uf_ano ON public.calendars(uf, ano);

-- ── Migration: 20260226053558_02054d5f-1dfc-4aa1-81f0-414b7aff54bf.sql ──


-- =====================================================
-- TABELA: legal_sources (Fontes Oficiais)
-- =====================================================
CREATE TABLE public.legal_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orgao TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('lei','decreto','portaria','sumula','oj','tema_stf','decisao','nr','cct','act','tabela','instrucao_normativa')),
  publicado_em DATE,
  observado_em DATE DEFAULT CURRENT_DATE,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  notas TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view legal sources" ON public.legal_sources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage legal sources" ON public.legal_sources FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: legal_rules (Regras Jurídicas Versionadas)
-- =====================================================
CREATE TABLE public.legal_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  formula_texto TEXT,
  parametros_json JSONB DEFAULT '{}'::jsonb,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  prioridade INTEGER DEFAULT 0,
  jurisdicao TEXT NOT NULL DEFAULT 'lei' CHECK (jurisdicao IN ('lei','jurisprudencia','instrumento_coletivo','administrativo')),
  source_id UUID REFERENCES public.legal_sources(id),
  referencia TEXT,
  link_ref TEXT,
  flag_controversia BOOLEAN DEFAULT FALSE,
  tese_opcoes JSONB DEFAULT '[]'::jsonb,
  categoria TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_rules_codigo ON public.legal_rules(codigo);
CREATE INDEX idx_legal_rules_vigencia ON public.legal_rules(vigencia_inicio, vigencia_fim);

ALTER TABLE public.legal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view legal rules" ON public.legal_rules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage legal rules" ON public.legal_rules FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: reference_tables (Tabelas Oficiais com Hash)
-- =====================================================
CREATE TABLE public.reference_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT NOT NULL,
  dados_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_id UUID REFERENCES public.legal_sources(id),
  coletado_em DATE DEFAULT CURRENT_DATE,
  hash_integridade TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_tables_nome_comp ON public.reference_tables(nome, competencia);

ALTER TABLE public.reference_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reference tables" ON public.reference_tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage reference tables" ON public.reference_tables FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: audit_log (Log de Auditoria Geral)
-- =====================================================
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  acao TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entidade ON public.audit_log(entidade, entidade_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audit logs" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: calculation_cases (Dados Ampliados do Caso)
-- =====================================================
CREATE TABLE public.calculation_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo_contrato TEXT DEFAULT 'clt' CHECK (tipo_contrato IN ('clt','domestico','rural','aprendiz','intermitente','temporario','estagio')),
  categoria TEXT DEFAULT 'urbano' CHECK (categoria IN ('urbano','rural','domestico','aprendiz','intermitente')),
  uf TEXT,
  cidade TEXT,
  cct_act TEXT,
  ajuizamento_data DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

ALTER TABLE public.calculation_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their calculation cases" ON public.calculation_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calculation_cases.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: case_inputs (Eventos Normalizados)
-- =====================================================
CREATE TABLE public.case_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'salario','comissao','horas_extras_50','horas_extras_100',
    'adicional_noturno','adicional_periculosidade','adicional_insalubridade',
    'faltas','feriados','afastamento','mudanca_salario','intervalo',
    'gratificacao','premio','dsr','plantao','sobreaviso','outro'
  )),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor NUMERIC,
  quantidade NUMERIC,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_inputs_case ON public.case_inputs(case_id);
CREATE INDEX idx_case_inputs_tipo ON public.case_inputs(tipo_evento);

ALTER TABLE public.case_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case inputs" ON public.case_inputs FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_inputs.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: case_outputs (Resultados com Base Legal)
-- =====================================================
CREATE TABLE public.case_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.calc_snapshots(id),
  verba_codigo TEXT NOT NULL,
  verba_nome TEXT,
  periodo_ref TEXT,
  base_calculo NUMERIC,
  formula_aplicada TEXT,
  valor_bruto NUMERIC NOT NULL,
  reflexos_json JSONB DEFAULT '[]'::jsonb,
  descontos_json JSONB DEFAULT '[]'::jsonb,
  valor_liquido NUMERIC,
  legal_basis_json JSONB DEFAULT '[]'::jsonb,
  memoria_json JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_outputs_case ON public.case_outputs(case_id);
CREATE INDEX idx_case_outputs_snapshot ON public.case_outputs(snapshot_id);

ALTER TABLE public.case_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case outputs" ON public.case_outputs FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_outputs.case_id AND c.criado_por = auth.uid()));


-- ── Migration: 20260226054944_896626b3-84f4-42f2-a090-2d455d344042.sql ──


-- V3 Schema changes (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_sources' AND column_name='status') THEN
    ALTER TABLE public.legal_sources ADD COLUMN status text NOT NULL DEFAULT 'vigente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_rules' AND column_name='status') THEN
    ALTER TABLE public.legal_rules ADD COLUMN status text NOT NULL DEFAULT 'vigente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_rules' AND column_name='referencia_curta') THEN
    ALTER TABLE public.legal_rules ADD COLUMN referencia_curta text;
  END IF;
END $$;


-- ── Migration: 20260226071538_98563374-5dcd-4645-813a-6205ab753de8.sql ──

CREATE TABLE public.case_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view briefings of their cases" ON public.case_briefings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can insert briefings to their cases" ON public.case_briefings
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can update briefings of their cases" ON public.case_briefings
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can delete briefings of their cases" ON public.case_briefings
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

-- ── Migration: 20260226083310_f7ed4c9c-41cd-4951-afea-ae406c10a26d.sql ──

-- Inserir tabelas INSS progressivas (Portaria MPS/MF)
-- 2024: Portaria MPS/MF nº 12/2024
INSERT INTO tax_tables (id, tipo, vigencia_inicio, vigencia_fim, faixas) VALUES
(gen_random_uuid(), 'inss', '2024-01-01', '2024-12-31', 
  '[{"ate": 1412.00, "aliquota": 0.075}, {"ate": 2666.68, "aliquota": 0.09}, {"ate": 4000.03, "aliquota": 0.12}, {"ate": 7786.02, "aliquota": 0.14}]'::jsonb
),
-- 2025: Portaria MPS/MF nº 6/2025
(gen_random_uuid(), 'inss', '2025-01-01', NULL, 
  '[{"ate": 1518.00, "aliquota": 0.075}, {"ate": 2793.88, "aliquota": 0.09}, {"ate": 4190.83, "aliquota": 0.12}, {"ate": 8157.41, "aliquota": 0.14}]'::jsonb
);

