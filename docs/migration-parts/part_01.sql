-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 1 (files 1 to 10 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260121101854_6dc64426-407a-498a-be2c-e79c9c07319d.sql ──

-- Create status enum for cases
CREATE TYPE public.case_status AS ENUM ('rascunho', 'em_analise', 'calculado', 'revisado');

-- Create document type enum
CREATE TYPE public.doc_type AS ENUM ('peticao', 'trct', 'holerite', 'cartao_ponto', 'sentenca', 'outro');

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente TEXT NOT NULL,
  numero_processo TEXT,
  status case_status DEFAULT 'rascunho',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  tipo doc_type DEFAULT 'outro',
  arquivo_url TEXT,
  hash TEXT,
  uploaded_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document chunks for RAG
CREATE TABLE public.doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536)
);

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases (users can only see their own cases)
CREATE POLICY "Users can view their own cases"
ON public.cases FOR SELECT
USING (auth.uid() = criado_por);

CREATE POLICY "Users can create their own cases"
ON public.cases FOR INSERT
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Users can update their own cases"
ON public.cases FOR UPDATE
USING (auth.uid() = criado_por);

CREATE POLICY "Users can delete their own cases"
ON public.cases FOR DELETE
USING (auth.uid() = criado_por);

-- RLS Policies for documents (through case ownership)
CREATE POLICY "Users can view documents of their cases"
ON public.documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can insert documents to their cases"
ON public.documents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete documents from their cases"
ON public.documents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

-- RLS Policies for doc_chunks (through document/case ownership)
CREATE POLICY "Users can view chunks of their documents"
ON public.doc_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = doc_chunks.document_id 
  AND c.criado_por = auth.uid()
));

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-documents', 'case-documents', false);

-- Storage policies
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── Migration: 20260121102233_fadc8d8f-b26a-4788-ac5e-724e06a6b441.sql ──

-- Fix function search path only
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ── Migration: 20260121170610_88dfcc6c-080f-4b1e-a84c-bab6f551dbb6.sql ──

-- Enum for fact types
CREATE TYPE public.fact_type AS ENUM ('data', 'moeda', 'numero', 'texto', 'boolean');

-- Enum for fact origin
CREATE TYPE public.fact_origem AS ENUM ('ia_extracao', 'usuario', 'documento');

-- Facts table - stores extracted information from documents
CREATE TABLE public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor text NOT NULL,
  tipo public.fact_type NOT NULL DEFAULT 'texto',
  origem public.fact_origem NOT NULL DEFAULT 'usuario',
  confianca float CHECK (confianca >= 0.0 AND confianca <= 1.0),
  confirmado boolean DEFAULT false,
  confirmado_por uuid,
  confirmado_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now()
);

-- Fact sources table - links facts to document excerpts
CREATE TABLE public.fact_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  pagina int,
  trecho text
);

-- Enable RLS
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for facts (via case ownership)
CREATE POLICY "Users can view facts of their cases"
ON public.facts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can insert facts to their cases"
ON public.facts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can update facts of their cases"
ON public.facts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete facts of their cases"
ON public.facts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

-- RLS policies for fact_sources (via fact -> case ownership)
CREATE POLICY "Users can view fact sources of their cases"
ON public.fact_sources FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert fact sources to their cases"
ON public.fact_sources FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete fact sources of their cases"
ON public.fact_sources FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

-- Index for faster lookups
CREATE INDEX idx_facts_case_id ON public.facts(case_id);
CREATE INDEX idx_facts_chave ON public.facts(chave);
CREATE INDEX idx_fact_sources_fact_id ON public.fact_sources(fact_id);
CREATE INDEX idx_fact_sources_document_id ON public.fact_sources(document_id);

-- ── Migration: 20260121170711_7298ef89-b049-4c04-83d7-badd4c95e6c8.sql ──

-- Calculators table - available calculation formulas
CREATE TABLE public.calculators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  categoria text NOT NULL,
  descricao text,
  inputs_esperados jsonb DEFAULT '{}',
  outputs jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now()
);

-- Calculator versions table - versioned rules when laws change
CREATE TABLE public.calculator_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.calculators(id) ON DELETE CASCADE,
  versao text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  regras jsonb DEFAULT '{}',
  codigo_ref text,
  changelog text,
  ativo boolean DEFAULT true,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_versions ENABLE ROW LEVEL SECURITY;

-- Calculators are PUBLIC READ (all authenticated users can see them)
CREATE POLICY "Authenticated users can view active calculators"
ON public.calculators FOR SELECT
TO authenticated
USING (ativo = true);

-- Calculator versions are also PUBLIC READ
CREATE POLICY "Authenticated users can view calculator versions"
ON public.calculator_versions FOR SELECT
TO authenticated
USING (ativo = true);

-- Only admins/system can insert/update calculators (via service role)
-- No insert/update/delete policies for regular users

-- Indexes for performance
CREATE INDEX idx_calculators_nome ON public.calculators(nome);
CREATE INDEX idx_calculators_categoria ON public.calculators(categoria);
CREATE INDEX idx_calculator_versions_calculator_id ON public.calculator_versions(calculator_id);
CREATE INDEX idx_calculator_versions_vigencia ON public.calculator_versions(vigencia_inicio, vigencia_fim);

-- Unique constraint: one version per calculator per validity period
CREATE UNIQUE INDEX idx_calculator_version_unique ON public.calculator_versions(calculator_id, versao);

-- ── Migration: 20260121170747_e7c13879-804a-4169-8730-0f2dbda29a82.sql ──

-- Calculation profiles - preset configurations for different scenarios
CREATE TABLE public.calculation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  config jsonb DEFAULT '{}',
  calculadoras_incluidas uuid[] DEFAULT '{}',
  ativo boolean DEFAULT true,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculation_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all active profiles (shared resource)
CREATE POLICY "Authenticated users can view active profiles"
ON public.calculation_profiles FOR SELECT
TO authenticated
USING (ativo = true);

-- Users can create their own profiles
CREATE POLICY "Users can create their own profiles"
ON public.calculation_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por);

-- Users can update their own profiles
CREATE POLICY "Users can update their own profiles"
ON public.calculation_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = criado_por);

-- Users can delete their own profiles
CREATE POLICY "Users can delete their own profiles"
ON public.calculation_profiles FOR DELETE
TO authenticated
USING (auth.uid() = criado_por);

-- Indexes
CREATE INDEX idx_calculation_profiles_nome ON public.calculation_profiles(nome);
CREATE INDEX idx_calculation_profiles_criado_por ON public.calculation_profiles(criado_por);

-- ── Migration: 20260121170830_0ce13de0-8a6c-4bb6-af6e-630730a18b1f.sql ──

-- Calculation runs - each calculation execution
CREATE TABLE public.calculation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.calculation_profiles(id) ON DELETE SET NULL,
  facts_snapshot jsonb DEFAULT '{}',
  calculators_used jsonb DEFAULT '{}',
  resultado_bruto jsonb DEFAULT '{}',
  resultado_liquido jsonb DEFAULT '{}',
  warnings jsonb DEFAULT '[]',
  executado_em timestamp with time zone DEFAULT now(),
  executado_por uuid
);

-- Audit lines - line-by-line calculation memory
CREATE TABLE public.audit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.calculation_runs(id) ON DELETE CASCADE,
  calculadora text NOT NULL,
  competencia text,
  linha int NOT NULL,
  descricao text,
  formula text,
  valor_bruto numeric(12,2),
  valor_liquido numeric(12,2),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.calculation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_lines ENABLE ROW LEVEL SECURITY;

-- RLS for calculation_runs (via case ownership)
CREATE POLICY "Users can view runs of their cases"
ON public.calculation_runs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can create runs for their cases"
ON public.calculation_runs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete runs of their cases"
ON public.calculation_runs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

-- RLS for audit_lines (via run -> case ownership)
CREATE POLICY "Users can view audit lines of their runs"
ON public.audit_lines FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can create audit lines for their runs"
ON public.audit_lines FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete audit lines of their runs"
ON public.audit_lines FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_calculation_runs_case_id ON public.calculation_runs(case_id);
CREATE INDEX idx_calculation_runs_profile_id ON public.calculation_runs(profile_id);
CREATE INDEX idx_calculation_runs_executado_em ON public.calculation_runs(executado_em DESC);
CREATE INDEX idx_audit_lines_run_id ON public.audit_lines(run_id);
CREATE INDEX idx_audit_lines_calculadora ON public.audit_lines(calculadora);
CREATE INDEX idx_audit_lines_competencia ON public.audit_lines(competencia);
CREATE INDEX idx_audit_lines_ordem ON public.audit_lines(run_id, linha);

-- ── Migration: 20260121170907_bd7f9a10-282e-4de2-8537-d34a95010b34.sql ──

-- Index series - economic indices (IPCA-E, INPC, Selic, etc.)
CREATE TABLE public.index_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  competencia date NOT NULL,
  valor numeric(10,6) NOT NULL,
  fonte text,
  versao int DEFAULT 1,
  criado_em timestamp with time zone DEFAULT now()
);

-- Tax tables - INSS/IRRF brackets by period
CREATE TABLE public.tax_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  faixas jsonb NOT NULL DEFAULT '[]',
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.index_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_tables ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users (reference data)
CREATE POLICY "Authenticated users can view index series"
ON public.index_series FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view tax tables"
ON public.tax_tables FOR SELECT
TO authenticated
USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_index_series_nome ON public.index_series(nome);
CREATE INDEX idx_index_series_competencia ON public.index_series(competencia);
CREATE INDEX idx_index_series_lookup ON public.index_series(nome, competencia);
CREATE UNIQUE INDEX idx_index_series_unique ON public.index_series(nome, competencia, versao);

CREATE INDEX idx_tax_tables_tipo ON public.tax_tables(tipo);
CREATE INDEX idx_tax_tables_vigencia ON public.tax_tables(vigencia_inicio, vigencia_fim);
CREATE INDEX idx_tax_tables_lookup ON public.tax_tables(tipo, vigencia_inicio);

-- ── Migration: 20260121173821_8f9caf64-9588-427b-b848-5a8e368f2ebe.sql ──

-- Tabela de ligação N:N entre Perfil e Versão da Calculadora
CREATE TABLE public.profile_calculators (
  profile_id uuid NOT NULL REFERENCES public.calculation_profiles(id) ON DELETE CASCADE,
  calculator_version_id uuid NOT NULL REFERENCES public.calculator_versions(id) ON DELETE CASCADE,
  criado_em timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, calculator_version_id)
);

-- Habilitar RLS
ALTER TABLE public.profile_calculators ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view profile calculators of active profiles"
ON public.profile_calculators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.ativo = true
  )
);

CREATE POLICY "Users can manage their own profile calculators"
ON public.profile_calculators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can delete their own profile calculators"
ON public.profile_calculators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.criado_por = auth.uid()
  )
);

-- ── Migration: 20260121175457_ed469ebc-fefd-403e-b5a5-5a774ddcf3a9.sql ──

-- Adicionar campo de citação original na tabela facts
ALTER TABLE public.facts 
ADD COLUMN citacao TEXT,
ADD COLUMN pagina INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN public.facts.citacao IS 'Trecho exato do documento onde o fato foi encontrado';
COMMENT ON COLUMN public.facts.pagina IS 'Número da página do documento onde o fato foi encontrado';

-- ── Migration: 20260121180411_cd65920b-3bc0-4f8d-b81e-bdb7894a638d.sql ──

-- =====================================================
-- MÓDULO 5A: COMPLETAR SETUP RAG
-- =====================================================

-- Adicionar chunk_id na tabela facts para rastreabilidade
ALTER TABLE facts ADD COLUMN IF NOT EXISTS chunk_id uuid REFERENCES doc_chunks(id);

-- Policy para permitir INSERT de chunks para documentos de casos do usuário
DROP POLICY IF EXISTS "Users can insert chunks to their documents" ON doc_chunks;
CREATE POLICY "Users can insert chunks to their documents"
ON doc_chunks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.id = doc_chunks.document_id 
    AND c.criado_por = auth.uid()
  )
);

-- Policy para permitir DELETE de chunks para documentos de casos do usuário
DROP POLICY IF EXISTS "Users can delete chunks of their documents" ON doc_chunks;
CREATE POLICY "Users can delete chunks of their documents"
ON doc_chunks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.id = doc_chunks.document_id 
    AND c.criado_por = auth.uid()
  )
);

-- Policy para UPDATE nos documentos
DROP POLICY IF EXISTS "Users can update their documents" ON documents;
CREATE POLICY "Users can update their documents"
ON documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = documents.case_id 
    AND cases.criado_por = auth.uid()
  )
);
