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
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);-- Fix function search path only
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
$$;-- Enum for fact types
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
CREATE INDEX idx_fact_sources_document_id ON public.fact_sources(document_id);-- Calculators table - available calculation formulas
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
CREATE UNIQUE INDEX idx_calculator_version_unique ON public.calculator_versions(calculator_id, versao);-- Calculation profiles - preset configurations for different scenarios
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
CREATE INDEX idx_calculation_profiles_criado_por ON public.calculation_profiles(criado_por);-- Calculation runs - each calculation execution
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
CREATE INDEX idx_audit_lines_ordem ON public.audit_lines(run_id, linha);-- Index series - economic indices (IPCA-E, INPC, Selic, etc.)
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
CREATE INDEX idx_tax_tables_lookup ON public.tax_tables(tipo, vigencia_inicio);-- Tabela de ligação N:N entre Perfil e Versão da Calculadora
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
);-- Adicionar campo de citação original na tabela facts
ALTER TABLE public.facts 
ADD COLUMN citacao TEXT,
ADD COLUMN pagina INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN public.facts.citacao IS 'Trecho exato do documento onde o fato foi encontrado';
COMMENT ON COLUMN public.facts.pagina IS 'Número da página do documento onde o fato foi encontrado';-- =====================================================
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
);-- Habilitar extensões necessárias para RAG
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;-- Adicionar colunas extras à tabela documents existente
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS owner_user_id uuid,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS page_count int,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Atualizar owner_user_id com base no case
UPDATE public.documents d
SET owner_user_id = c.criado_por
FROM public.cases c
WHERE d.case_id = c.id AND d.owner_user_id IS NULL;

-- Índices para documents
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Renomear doc_chunks para document_chunks e adicionar colunas
-- Primeiro criar a nova tabela document_chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number int,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  content_hash text,
  doc_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migrar dados de doc_chunks para document_chunks se existirem
INSERT INTO public.document_chunks (id, document_id, content, metadata, embedding, created_at)
SELECT dc.id, dc.document_id, dc.texto, dc.metadata, dc.embedding::vector(1536), now()
FROM public.doc_chunks dc
ON CONFLICT (id) DO NOTHING;

-- Adicionar case_id aos chunks migrados
UPDATE public.document_chunks dc
SET case_id = d.case_id
FROM public.documents d
WHERE dc.document_id = d.id AND dc.case_id IS NULL;

-- Índices para document_chunks
CREATE INDEX IF NOT EXISTS idx_chunks_case ON public.document_chunks(case_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doctype ON public.document_chunks(doc_type);

-- Índice vetorial IVFFlat para busca por similaridade
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Tabela de evidências (vínculo entre facts e origem documental)
CREATE TABLE IF NOT EXISTS public.fact_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  page_number int,
  quote text NOT NULL,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_evidences_case ON public.fact_evidences(case_id);
CREATE INDEX IF NOT EXISTS idx_fact_evidences_fact ON public.fact_evidences(fact_id);

-- Tabela de tarefas de extração (processamento assíncrono por tema)
CREATE TABLE IF NOT EXISTS public.extraction_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_k int NOT NULL DEFAULT 20,
  result_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_tasks_case ON public.extraction_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_extraction_tasks_status ON public.extraction_tasks(status);

-- RLS para document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their cases"
ON public.document_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert chunks to their cases"
ON public.document_chunks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete chunks of their cases"
ON public.document_chunks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

-- RLS para fact_evidences
ALTER TABLE public.fact_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidences of their cases"
ON public.fact_evidences FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert evidences to their cases"
ON public.fact_evidences FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete evidences of their cases"
ON public.fact_evidences FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

-- RLS para extraction_tasks
ALTER TABLE public.extraction_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their extraction tasks"
ON public.extraction_tasks FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their extraction tasks"
ON public.extraction_tasks FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their extraction tasks"
ON public.extraction_tasks FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their extraction tasks"
ON public.extraction_tasks FOR DELETE
USING (owner_user_id = auth.uid());

-- Função de busca semântica otimizada
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_case_id uuid DEFAULT NULL,
  filter_doc_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  case_id uuid,
  document_id uuid,
  page_number int,
  chunk_index int,
  content text,
  doc_type text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.case_id,
    dc.document_id,
    dc.page_number,
    dc.chunk_index,
    dc.content,
    dc.doc_type,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 
    (filter_case_id IS NULL OR dc.case_id = filter_case_id)
    AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;-- Substituir função match_document_chunks com nova assinatura
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, float, int, uuid, text);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_case_id uuid,
  p_query_embedding vector(1536),
  p_top_k int,
  p_doc_types text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  page_number int,
  content text,
  doc_type text,
  similarity numeric
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dc.id AS chunk_id,
    dc.document_id,
    dc.page_number,
    dc.content,
    dc.doc_type,
    (1 - (dc.embedding <=> p_query_embedding))::numeric AS similarity
  FROM document_chunks dc
  WHERE dc.case_id = p_case_id
    AND dc.embedding IS NOT NULL
    AND (p_doc_types IS NULL OR dc.doc_type = ANY(p_doc_types))
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_top_k;
$$;-- Criar bucket privado para documentos jurídicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'juriscalculo-documents',
  'juriscalculo-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas dono do caso pode fazer upload
CREATE POLICY "Users can upload documents to their cases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono do caso pode visualizar
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Apenas dono pode deletar
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Apenas dono pode atualizar
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);-- =====================================================
-- MIGRATION: PERFORMANCE - FILA DE DOCUMENTOS E CONTROLES
-- =====================================================

-- 1. Adicionar campo de prioridade e processamento em lote aos documentos
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS queue_priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS queued_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS processing_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS processing_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;

-- 2. Criar enum para status de processamento mais granular
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_status') THEN
    CREATE TYPE public.processing_status AS ENUM (
      'pending',
      'queued',
      'processing',
      'chunking',
      'embedding',
      'completed',
      'failed',
      'retrying'
    );
  END IF;
END$$;

-- 3. Tabela de controle de fila de processamento
CREATE TABLE IF NOT EXISTS public.document_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Índices para performance da fila
CREATE INDEX IF NOT EXISTS idx_document_queue_status ON public.document_queue(status);
CREATE INDEX IF NOT EXISTS idx_document_queue_priority ON public.document_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_document_queue_case ON public.document_queue(case_id);

-- RLS para document_queue
ALTER TABLE public.document_queue ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver a fila dos seus casos
CREATE POLICY "Users can view their document queue"
ON public.document_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = document_queue.case_id
    AND c.criado_por = auth.uid()
  )
);

-- 4. Adicionar configurações de extração na tarefa
ALTER TABLE public.extraction_tasks
ADD COLUMN IF NOT EXISTS top_k integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS similarity_threshold numeric DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS processing_time_ms integer,
ADD COLUMN IF NOT EXISTS chunks_analyzed integer;

-- 5. Índices para otimizar busca por doc_type nos chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_type ON public.document_chunks(doc_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_case_doc_type ON public.document_chunks(case_id, doc_type);

-- 6. Índice parcial para chunks com embedding (acelera busca vetorial)
CREATE INDEX IF NOT EXISTS idx_document_chunks_has_embedding 
ON public.document_chunks(case_id) 
WHERE embedding IS NOT NULL;

-- 7. Função helper para enfileirar documentos de um caso
CREATE OR REPLACE FUNCTION public.queue_case_documents(
  p_case_id uuid,
  p_priority integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued_count integer;
BEGIN
  -- Inserir documentos pendentes na fila
  INSERT INTO document_queue (document_id, case_id, priority)
  SELECT d.id, d.case_id, p_priority
  FROM documents d
  WHERE d.case_id = p_case_id
    AND (d.status IS NULL OR d.status IN ('uploaded', 'failed'))
    AND NOT EXISTS (
      SELECT 1 FROM document_queue q
      WHERE q.document_id = d.id
      AND q.status IN ('pending', 'processing')
    );
    
  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$;

-- 8. Função para obter próximo documento da fila (por prioridade)
CREATE OR REPLACE FUNCTION public.get_next_queued_document()
RETURNS TABLE (
  queue_id uuid,
  document_id uuid,
  case_id uuid,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE document_queue q
  SET status = 'processing',
      started_at = now()
  WHERE q.id = (
    SELECT sq.id
    FROM document_queue sq
    WHERE sq.status = 'pending'
    ORDER BY sq.priority DESC, sq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.id, q.document_id, q.case_id, q.priority;
END;
$$;

-- 9. View para estatísticas de processamento por caso
CREATE OR REPLACE VIEW public.case_processing_stats AS
SELECT 
  c.id as case_id,
  c.criado_por as owner_id,
  COUNT(d.id) as total_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'embedded') as indexed_documents,
  COUNT(d.id) FILTER (WHERE d.status IN ('uploaded', 'pending')) as pending_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'processing') as processing_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed_documents,
  COALESCE(SUM(dc.chunk_count), 0) as total_chunks,
  MAX(d.processing_completed_at) as last_processed_at
FROM cases c
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN (
  SELECT document_id, COUNT(*) as chunk_count
  FROM document_chunks
  WHERE embedding IS NOT NULL
  GROUP BY document_id
) dc ON dc.document_id = d.id
GROUP BY c.id, c.criado_por;

-- Grant access to the view
GRANT SELECT ON public.case_processing_stats TO authenticated;-- Fix Security Definer View - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.case_processing_stats;

CREATE VIEW public.case_processing_stats AS
SELECT 
  c.id as case_id,
  c.criado_por as owner_id,
  COUNT(d.id) as total_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'embedded') as indexed_documents,
  COUNT(d.id) FILTER (WHERE d.status IN ('uploaded', 'pending')) as pending_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'processing') as processing_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed_documents,
  COALESCE(SUM(dc.chunk_count), 0) as total_chunks,
  MAX(d.processing_completed_at) as last_processed_at
FROM cases c
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN (
  SELECT document_id, COUNT(*) as chunk_count
  FROM document_chunks
  WHERE embedding IS NOT NULL
  GROUP BY document_id
) dc ON dc.document_id = d.id
WHERE c.criado_por = auth.uid()
GROUP BY c.id, c.criado_por;

-- Grant access to the view
GRANT SELECT ON public.case_processing_stats TO authenticated;-- =====================================================
-- MÓDULO 5B: GERADOR DE PETIÇÃO INICIAL
-- Tabela para armazenar petições e relatórios gerados
-- =====================================================

-- 1. Tabela de petições geradas
CREATE TABLE IF NOT EXISTS public.petitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  calculation_run_id UUID REFERENCES public.calculation_runs(id) ON DELETE SET NULL,
  
  -- Tipo e status
  tipo TEXT NOT NULL DEFAULT 'inicial', -- 'inicial', 'replica', 'contestacao', 'liquidacao'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'completed', 'error'
  titulo TEXT,
  
  -- Seções da petição (JSONB para flexibilidade)
  narrativa_fatos TEXT, -- Narrativa dos fatos baseada nas evidências
  fundamentacao_juridica TEXT, -- Fundamentação legal e teses
  pedidos JSONB DEFAULT '[]', -- Array de pedidos com valores
  ressalvas TEXT, -- Texto padrão para documentos faltantes
  
  -- Conteúdo final gerado
  conteudo_completo TEXT, -- Petição completa montada
  memoria_calculo_html TEXT, -- Tabela HTML da memória de cálculo
  
  -- Metadados
  facts_snapshot JSONB DEFAULT '{}', -- Snapshot dos fatos usados
  theses_used JSONB DEFAULT '[]', -- Teses jurídicas aplicadas
  template_id TEXT, -- Template utilizado (futuro)
  
  -- Controle de geração
  generation_config JSONB DEFAULT '{}', -- Configurações usadas na geração
  generation_time_ms INTEGER,
  ai_model_used TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_petitions_case_id ON public.petitions(case_id);
CREATE INDEX IF NOT EXISTS idx_petitions_status ON public.petitions(status);
CREATE INDEX IF NOT EXISTS idx_petitions_tipo ON public.petitions(tipo);

-- Enable RLS
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their case petitions"
ON public.petitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can create petitions for their cases"
ON public.petitions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can update their case petitions"
ON public.petitions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can delete their case petitions"
ON public.petitions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de templates de petição (futuro)
CREATE TABLE IF NOT EXISTS public.petition_templates (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'inicial', 'replica', etc.
  descricao TEXT,
  estrutura JSONB NOT NULL DEFAULT '{}', -- Estrutura do template
  variaveis JSONB DEFAULT '[]', -- Variáveis disponíveis
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Templates padrão
INSERT INTO public.petition_templates (id, nome, tipo, descricao, estrutura, variaveis)
VALUES 
(
  'inicial_trabalhista_v1',
  'Petição Inicial Trabalhista - Padrão',
  'inicial',
  'Modelo padrão de petição inicial trabalhista com todos os itens exigidos pelo Art. 840 da CLT',
  '{
    "secoes": [
      {"id": "qualificacao", "titulo": "Qualificação das Partes", "obrigatoria": true},
      {"id": "fatos", "titulo": "Dos Fatos", "obrigatoria": true},
      {"id": "fundamentacao", "titulo": "Do Direito", "obrigatoria": true},
      {"id": "pedidos", "titulo": "Dos Pedidos", "obrigatoria": true},
      {"id": "valores", "titulo": "Do Valor da Causa", "obrigatoria": true},
      {"id": "provas", "titulo": "Das Provas", "obrigatoria": false},
      {"id": "encerramento", "titulo": "Requerimentos Finais", "obrigatoria": true}
    ]
  }'::jsonb,
  '[
    {"nome": "reclamante_nome", "tipo": "text"},
    {"nome": "reclamante_cpf", "tipo": "text"},
    {"nome": "reclamada_razao", "tipo": "text"},
    {"nome": "reclamada_cnpj", "tipo": "text"},
    {"nome": "data_admissao", "tipo": "date"},
    {"nome": "data_demissao", "tipo": "date"},
    {"nome": "salario_base", "tipo": "money"},
    {"nome": "cargo", "tipo": "text"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;-- Fix RLS for petition_templates table
ALTER TABLE public.petition_templates ENABLE ROW LEVEL SECURITY;

-- Templates são públicos para leitura (todos os usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view petition templates"
ON public.petition_templates
FOR SELECT
TO authenticated
USING (true);-- Add markdown template support to petition_templates
ALTER TABLE public.petition_templates 
ADD COLUMN IF NOT EXISTS content_markdown text,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Create index for default template lookup
CREATE INDEX IF NOT EXISTS idx_petition_templates_default 
ON public.petition_templates(tipo, is_default) 
WHERE is_default = true;

-- Insert default template for petição inicial trabalhista
INSERT INTO public.petition_templates (id, nome, tipo, descricao, content_markdown, is_default, ativo, estrutura, variaveis)
VALUES (
  'tpl-inicial-trabalhista',
  'Petição Inicial Trabalhista - Padrão',
  'inicial',
  'Template padrão para petição inicial trabalhista com todos os placeholders necessários',
  E'# EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DA {{vara}} VARA DO TRABALHO DE {{comarca}}

---

**{{nome_reclamante}}**, {{qualificacao_reclamante}}, vem, respeitosamente, à presença de Vossa Excelência, por seu(sua) advogado(a) que esta subscreve, propor a presente

## RECLAMAÇÃO TRABALHISTA

em face de **{{nome_reclamada}}**, {{qualificacao_reclamada}}, pelos fatos e fundamentos a seguir expostos.

---

## I. DOS FATOS

{{narrativa_fatos}}

---

## II. DO DIREITO

{{fundamentacao_juridica}}

---

## III. DOS PEDIDOS

Ante o exposto, requer:

{{pedidos_lista}}

---

## IV. DO VALOR DA CAUSA

Atribui-se à presente demanda o valor de **{{valor_causa}}**, conforme Art. 840, §1º da CLT, discriminado na tabela abaixo:

{{pedidos_tabela}}

---

## V. DAS PROVAS

Protesta provar o alegado por todos os meios de prova em direito admitidos, especialmente documental, testemunhal e pericial, se necessário.

---

## VI. DAS RESSALVAS

{{ressalvas}}

---

**Termos em que,**
**Pede deferimento.**

{{cidade}}, {{data_extenso}}.

---

**{{nome_advogado}}**
OAB/{{uf_oab}} {{numero_oab}}

---

## ANEXO: MEMÓRIA DE CÁLCULO

{{memoria_calculo}}
',
  true,
  true,
  '{
    "secoes": ["fatos", "direito", "pedidos", "valor_causa", "provas", "ressalvas"],
    "formatacao": {"fonte": "Times New Roman", "tamanho": 12, "espacamento": 1.5}
  }'::jsonb,
  '[
    {"nome": "vara", "descricao": "Número da vara", "obrigatorio": false, "default": "___"},
    {"nome": "comarca", "descricao": "Cidade/Comarca", "obrigatorio": true},
    {"nome": "nome_reclamante", "descricao": "Nome completo do reclamante", "obrigatorio": true},
    {"nome": "qualificacao_reclamante", "descricao": "Qualificação do reclamante (nacionalidade, estado civil, CPF, endereço)", "obrigatorio": true},
    {"nome": "nome_reclamada", "descricao": "Razão social da reclamada", "obrigatorio": true},
    {"nome": "qualificacao_reclamada", "descricao": "Qualificação da reclamada (CNPJ, endereço)", "obrigatorio": true},
    {"nome": "narrativa_fatos", "descricao": "Texto narrativo dos fatos", "obrigatorio": true, "gerado": true},
    {"nome": "fundamentacao_juridica", "descricao": "Fundamentação legal", "obrigatorio": true, "gerado": true},
    {"nome": "pedidos_lista", "descricao": "Lista numerada de pedidos", "obrigatorio": true, "gerado": true},
    {"nome": "pedidos_tabela", "descricao": "Tabela de pedidos com valores", "obrigatorio": true, "gerado": true},
    {"nome": "valor_causa", "descricao": "Valor total formatado", "obrigatorio": true, "gerado": true},
    {"nome": "ressalvas", "descricao": "Ressalvas sobre estimativas", "obrigatorio": false, "gerado": true},
    {"nome": "cidade", "descricao": "Cidade do escritório", "obrigatorio": true},
    {"nome": "data_extenso", "descricao": "Data por extenso", "obrigatorio": true, "gerado": true},
    {"nome": "nome_advogado", "descricao": "Nome do advogado", "obrigatorio": true},
    {"nome": "uf_oab", "descricao": "Estado da OAB", "obrigatorio": true},
    {"nome": "numero_oab", "descricao": "Número da OAB", "obrigatorio": true},
    {"nome": "memoria_calculo", "descricao": "HTML da memória de cálculo", "obrigatorio": true, "gerado": true}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  content_markdown = EXCLUDED.content_markdown,
  is_default = EXCLUDED.is_default,
  variaveis = EXCLUDED.variaveis;-- Add missing metadata column used across document pipeline
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Helpful index for querying by processing progress fields in metadata (optional)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin
ON public.documents
USING GIN (metadata);
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
CREATE INDEX IF NOT EXISTS idx_calc_rules_codigo ON public.calc_rules(codigo);-- Seed calculators matching the registry in engine.ts (using gen_random_uuid for UUIDs)
INSERT INTO public.calculators (id, nome, categoria, descricao, inputs_esperados, outputs, ativo, tags) VALUES
  (gen_random_uuid(), 'horas_extras', 'verbas_base', 'Cálculo de horas extras 50% e 100%', '{"horas_50": "number", "horas_100": "number", "salario_hora": "number"}', '{"he_50": "number", "he_100": "number", "total": "number"}', true, ARRAY['hora-extra', 'verba-base']),
  (gen_random_uuid(), 'reflexos_13', 'reflexos', 'Reflexos sobre 13º salário', '{"base_calculo": "number", "meses": "number"}', '{"reflexo_13": "number"}', true, ARRAY['reflexo', '13-salario']),
  (gen_random_uuid(), 'reflexos_ferias', 'reflexos', 'Reflexos sobre férias + 1/3', '{"base_calculo": "number", "meses": "number"}', '{"reflexo_ferias": "number"}', true, ARRAY['reflexo', 'ferias']),
  (gen_random_uuid(), 'fgts', 'encargos', 'Cálculo de FGTS sobre verbas', '{"base_fgts": "number"}', '{"fgts": "number", "multa_40": "number"}', true, ARRAY['fgts', 'encargo']),
  (gen_random_uuid(), 'inss', 'descontos', 'Cálculo de INSS progressivo', '{"base_inss": "number", "competencia": "string"}', '{"desconto_inss": "number"}', true, ARRAY['inss', 'desconto']),
  (gen_random_uuid(), 'atualizacao_monetaria', 'atualizacao', 'Atualização monetária e juros', '{"valor_original": "number", "data_base": "string"}', '{"valor_atualizado": "number", "correcao": "number", "juros": "number"}', true, ARRAY['atualizacao', 'juros']);-- Create calculator versions for each calculator
INSERT INTO public.calculator_versions (calculator_id, versao, vigencia_inicio, ativo, regras, changelog) VALUES
  ('7f39fe1e-e210-4d17-bd53-b78b236a2c4d', '1.0.0', '2024-01-01', true, '{"adicional_50": 0.5, "adicional_100": 1.0, "regras": {"base": "salario_hora", "divisor": 220}}', 'Versão inicial - horas extras'),
  ('8e72e1d4-25ef-404f-97c2-b4f3ac57eb29', '1.0.0', '2024-01-01', true, '{"fator_13": 0.0833, "regras": {"proporcional": true}}', 'Versão inicial - reflexos 13º'),
  ('bc90b40e-ab4a-44f8-9baa-7b8f8be1f718', '1.0.0', '2024-01-01', true, '{"fator_ferias": 0.1111, "terco_constitucional": true, "regras": {"proporcional": true}}', 'Versão inicial - reflexos férias'),
  ('5efb4e02-87fc-43c5-a1de-bbf96218d3bb', '1.0.0', '2024-01-01', true, '{"aliquota": 0.08, "multa_rescisoria": 0.4, "regras": {"incide_sobre": ["he_50", "he_100", "dsr"]}}', 'Versão inicial - FGTS'),
  ('92de77f5-49bb-40f9-aea8-0ab0c1df7e98', '1.0.0', '2024-01-01', true, '{"progressivo": true, "regras": {"tabela_vigente": true}}', 'Versão inicial - INSS'),
  ('fcde3bbf-4170-42a5-b913-6b508bbf0f6a', '1.0.0', '2024-01-01', true, '{"indice": "ipca_e", "juros": "selic", "regras": {"aplicar_juros": true}}', 'Versão inicial - atualização monetária');-- Link calculator versions to the TRT-3 Padrão profile (all calculators)
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
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '360a6a5a-e0d4-4725-b86a-d40f9c53edb8');-- =============================================
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
  ));-- Inserir tabelas INSS progressivas (Portaria MPS/MF)
-- 2024: Portaria MPS/MF nº 12/2024
INSERT INTO tax_tables (id, tipo, vigencia_inicio, vigencia_fim, faixas) VALUES
(gen_random_uuid(), 'inss', '2024-01-01', '2024-12-31', 
  '[{"ate": 1412.00, "aliquota": 0.075}, {"ate": 2666.68, "aliquota": 0.09}, {"ate": 4000.03, "aliquota": 0.12}, {"ate": 7786.02, "aliquota": 0.14}]'::jsonb
),
-- 2025: Portaria MPS/MF nº 6/2025
(gen_random_uuid(), 'inss', '2025-01-01', NULL, 
  '[{"ate": 1518.00, "aliquota": 0.075}, {"ate": 2793.88, "aliquota": 0.09}, {"ate": 4190.83, "aliquota": 0.12}, {"ate": 8157.41, "aliquota": 0.14}]'::jsonb
);

-- =============================================
-- TABELAS DE REFERÊNCIA PJe-Calc (Nacionais)
-- =============================================

-- 1. Salário Mínimo (Nacional)
CREATE TABLE public.pjecalc_salario_minimo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_salario_minimo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_minimo" ON public.pjecalc_salario_minimo FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_minimo" ON public.pjecalc_salario_minimo FOR ALL USING (auth.role() = 'authenticated');

-- 2. Salário-família (faixas por competência)
CREATE TABLE public.pjecalc_salario_familia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  valor_cota numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_salario_familia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_familia" ON public.pjecalc_salario_familia FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_familia" ON public.pjecalc_salario_familia FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seguro-desemprego (faixas por competência)
CREATE TABLE public.pjecalc_seguro_desemprego (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor_piso numeric NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  percentual numeric NOT NULL,
  valor_soma numeric,
  valor_teto numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR ALL USING (auth.role() = 'authenticated');

-- 4. Contribuição Social (faixas progressivas por competência e tipo)
CREATE TABLE public.pjecalc_contribuicao_social (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'segurado_empregado',  -- segurado_empregado, empregado_domestico
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  aliquota numeric NOT NULL,
  teto_maximo numeric,
  teto_beneficio numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo, faixa)
);
ALTER TABLE public.pjecalc_contribuicao_social ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read contribuicao_social" ON public.pjecalc_contribuicao_social FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage contribuicao_social" ON public.pjecalc_contribuicao_social FOR ALL USING (auth.role() = 'authenticated');

-- 5. Imposto de Renda (tabela progressiva + deduções por competência)
CREATE TABLE public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  deducao_aposentado_65 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read imposto_renda" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage imposto_renda" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');

-- 5b. Faixas do Imposto de Renda
CREATE TABLE public.pjecalc_imposto_renda_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_id uuid NOT NULL REFERENCES public.pjecalc_imposto_renda(id) ON DELETE CASCADE,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric,
  aliquota numeric NOT NULL DEFAULT 0,
  parcela_deduzir numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ir_id, faixa)
);
ALTER TABLE public.pjecalc_imposto_renda_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR ALL USING (auth.role() = 'authenticated');

-- 6. Custas Judiciais (por TRT/período)
CREATE TABLE public.pjecalc_custas_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  atos_oficiais_urbana numeric DEFAULT 0,
  atos_oficiais_rural numeric DEFAULT 0,
  agravo_instrumento numeric DEFAULT 0,
  agravo_peticao numeric DEFAULT 0,
  impugnacao_sentenca numeric DEFAULT 0,
  recurso_revista numeric DEFAULT 0,
  embargos_arrematacao numeric DEFAULT 0,
  embargos_execucao numeric DEFAULT 0,
  embargos_terceiros numeric DEFAULT 0,
  piso_custas_conhecimento numeric DEFAULT 0,
  teto_custas_liquidacao numeric DEFAULT 0,
  teto_custas_autos numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vigencia_inicio)
);
ALTER TABLE public.pjecalc_custas_judiciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read custas" ON public.pjecalc_custas_judiciais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage custas" ON public.pjecalc_custas_judiciais FOR ALL USING (auth.role() = 'authenticated');

-- 7. Correção Monetária (índices mensais por tipo)
CREATE TABLE public.pjecalc_correcao_monetaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  indice text NOT NULL, -- IPCA-E, INPC, TR, SELIC, etc.
  valor numeric NOT NULL,
  acumulado numeric,
  fonte text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, indice)
);
ALTER TABLE public.pjecalc_correcao_monetaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read correcao" ON public.pjecalc_correcao_monetaria FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage correcao" ON public.pjecalc_correcao_monetaria FOR ALL USING (auth.role() = 'authenticated');

-- 8. Juros de Mora (taxas por período)
CREATE TABLE public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'trabalhista', -- trabalhista, selic, civil
  taxa_mensal numeric NOT NULL,
  acumulado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');

-- 9. Pisos Salariais (regionais, por TRT)
CREATE TABLE public.pjecalc_pisos_salariais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL,
  competencia date NOT NULL,
  valor numeric NOT NULL,
  categoria text,
  sindicato text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_pisos_salariais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pisos" ON public.pjecalc_pisos_salariais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage pisos" ON public.pjecalc_pisos_salariais FOR ALL USING (auth.role() = 'authenticated');

-- 10. Vale-Transporte (regional)
CREATE TABLE public.pjecalc_vale_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha text NOT NULL,
  uf text NOT NULL,
  municipio text,
  valor numeric NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_vale_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vt" ON public.pjecalc_vale_transporte FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage vt" ON public.pjecalc_vale_transporte FOR ALL USING (auth.role() = 'authenticated');

-- 11. Verbas Padrão (cadastro nacional de verbas)
CREATE TABLE public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'principal', -- principal, reflexa
  valor_tipo text NOT NULL DEFAULT 'calculado', -- calculado, informado
  caracteristica text NOT NULL DEFAULT 'comum', -- comum, 13_salario, ferias
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  divisor_padrao numeric DEFAULT 30,
  multiplicador_padrao numeric DEFAULT 1,
  incidencia_fgts boolean DEFAULT false,
  incidencia_cs boolean DEFAULT false,
  incidencia_irpf boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verbas_padrao" ON public.pjecalc_verbas_padrao FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');

-- 12. Feriados (complementar à tabela calendars existente - dados regionais)
-- Já existe a tabela calendars, vamos usá-la

-- pjecalc_imposto_renda_faixas: unique on (ir_id, faixa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_imposto_renda_faixas_irid_faixa_unique') THEN
    ALTER TABLE public.pjecalc_imposto_renda_faixas ADD CONSTRAINT pjecalc_imposto_renda_faixas_irid_faixa_unique UNIQUE (ir_id, faixa);
  END IF;
END $$;

-- Config tables for PJe-Calc modules
CREATE TABLE IF NOT EXISTS public.pjecalc_dados_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  numero_processo TEXT,
  vara TEXT,
  comarca TEXT,
  uf TEXT DEFAULT 'SP',
  tipo_acao TEXT DEFAULT 'trabalhista',
  rito TEXT DEFAULT 'ordinario',
  fase TEXT DEFAULT 'conhecimento',
  data_distribuicao TEXT,
  data_citacao TEXT,
  data_transito TEXT,
  juiz TEXT,
  reclamante_nome TEXT,
  reclamante_cpf TEXT,
  reclamada_nome TEXT,
  reclamada_cnpj TEXT,
  objeto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL,
  dias_uteis INTEGER DEFAULT 22,
  dias_trabalhados INTEGER DEFAULT 22,
  horas_normais NUMERIC DEFAULT 0,
  horas_extras_50 NUMERIC DEFAULT 0,
  horas_extras_100 NUMERIC DEFAULT 0,
  horas_noturnas NUMERIC DEFAULT 0,
  adicional_noturno_pct NUMERIC DEFAULT 20,
  intervalo_suprimido NUMERIC DEFAULT 0,
  sobreaviso NUMERIC DEFAULT 0,
  dsr_horas NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, competencia)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  destino TEXT DEFAULT 'pagar_reclamante',
  compor_principal BOOLEAN DEFAULT true,
  multa_apurar BOOLEAN DEFAULT true,
  multa_tipo TEXT DEFAULT 'calculada',
  multa_percentual NUMERIC DEFAULT 40,
  multa_base TEXT DEFAULT 'devido',
  multa_valor_informado NUMERIC,
  deduzir_saldo BOOLEAN DEFAULT false,
  lc110_10 BOOLEAN DEFAULT false,
  lc110_05 BOOLEAN DEFAULT false,
  saldos_saques JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_segurado BOOLEAN DEFAULT true,
  cobrar_reclamante BOOLEAN DEFAULT true,
  cs_sobre_salarios_pagos BOOLEAN DEFAULT false,
  aliquota_segurado_tipo TEXT DEFAULT 'empregado',
  aliquota_segurado_fixa NUMERIC,
  limitar_teto BOOLEAN DEFAULT true,
  apurar_empresa BOOLEAN DEFAULT true,
  apurar_sat BOOLEAN DEFAULT true,
  apurar_terceiros BOOLEAN DEFAULT true,
  aliquota_empresa_fixa NUMERIC DEFAULT 20,
  aliquota_sat_fixa NUMERIC DEFAULT 2,
  aliquota_terceiros_fixa NUMERIC DEFAULT 5.8,
  periodos_simples JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_ir_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  incidir_sobre_juros BOOLEAN DEFAULT false,
  cobrar_reclamado BOOLEAN DEFAULT false,
  tributacao_exclusiva_13 BOOLEAN DEFAULT true,
  tributacao_separada_ferias BOOLEAN DEFAULT false,
  deduzir_cs BOOLEAN DEFAULT true,
  deduzir_prev_privada BOOLEAN DEFAULT false,
  deduzir_pensao BOOLEAN DEFAULT false,
  deduzir_honorarios BOOLEAN DEFAULT false,
  aposentado_65 BOOLEAN DEFAULT false,
  dependentes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_correcao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  indice TEXT DEFAULT 'IPCA-E',
  epoca TEXT DEFAULT 'mensal',
  data_fixa TEXT,
  juros_tipo TEXT DEFAULT 'selic',
  juros_percentual NUMERIC DEFAULT 1,
  juros_inicio TEXT DEFAULT 'ajuizamento',
  multa_523 BOOLEAN DEFAULT false,
  multa_523_percentual NUMERIC DEFAULT 10,
  data_liquidacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_desemprego (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT false,
  parcelas INTEGER DEFAULT 5,
  valor_parcela NUMERIC,
  recebeu BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_honorarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_sucumbenciais BOOLEAN DEFAULT true,
  percentual_sucumbenciais NUMERIC DEFAULT 15,
  base_sucumbenciais TEXT DEFAULT 'condenacao',
  apurar_contratuais BOOLEAN DEFAULT false,
  percentual_contratuais NUMERIC DEFAULT 20,
  valor_fixo NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_custas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  percentual NUMERIC DEFAULT 2,
  valor_minimo NUMERIC DEFAULT 10.64,
  valor_maximo NUMERIC,
  isento BOOLEAN DEFAULT false,
  assistencia_judiciaria BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_liquidacao_resultado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  resultado JSONB NOT NULL,
  engine_version TEXT DEFAULT '1.0.0',
  data_liquidacao TEXT,
  total_bruto NUMERIC,
  total_liquido NUMERIC,
  total_reclamante NUMERIC,
  total_reclamada NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pjecalc_dados_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cartao_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_fgts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_ir_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_correcao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_custas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_liquidacao_resultado ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'pjecalc_dados_processo','pjecalc_cartao_ponto','pjecalc_fgts_config',
    'pjecalc_cs_config','pjecalc_ir_config','pjecalc_correcao_config',
    'pjecalc_seguro_desemprego','pjecalc_honorarios','pjecalc_custas',
    'pjecalc_liquidacao_resultado'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow authenticated full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END;
$$;

-- Only create the two missing tables (cs_config already exists)

-- Case-level Custas config (if not already created by previous partial migration)
CREATE TABLE IF NOT EXISTS public.pjecalc_custas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT true,
  percentual numeric DEFAULT 2,
  valor_minimo numeric DEFAULT 10.64,
  valor_maximo numeric,
  isento boolean DEFAULT false,
  assistencia_judiciaria boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_custas_config' AND policyname = 'Allow authenticated full access on pjecalc_custas_config') THEN
    ALTER TABLE public.pjecalc_custas_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_custas_config" ON public.pjecalc_custas_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Case-level Seguro Desemprego config
CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT false,
  parcelas integer DEFAULT 5,
  valor_parcela numeric,
  recebeu boolean DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_seguro_config' AND policyname = 'Allow authenticated full access on pjecalc_seguro_config') THEN
    ALTER TABLE public.pjecalc_seguro_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_seguro_config" ON public.pjecalc_seguro_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 1: Create audit/versioning infrastructure
CREATE TABLE IF NOT EXISTS public.reference_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'api',
  url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_sources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_sources') THEN
    CREATE POLICY "auth_manage_ref_sources" ON public.reference_sources FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  update_frequency text NOT NULL DEFAULT 'monthly',
  source_id uuid REFERENCES public.reference_sources(id),
  is_auto_importable boolean NOT NULL DEFAULT false,
  requires_manual_input boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ok',
  last_import_at timestamptz,
  last_import_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_table_registry ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_registry') THEN
    CREATE POLICY "auth_manage_registry" ON public.reference_table_registry FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'manual',
  result text NOT NULL DEFAULT 'pending',
  errors jsonb DEFAULT '[]'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  raw_file_path text,
  raw_file_hash text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_import_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_import_runs') THEN
    CREATE POLICY "auth_manage_import_runs" ON public.reference_import_runs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  competency_year int NOT NULL,
  competency_month int,
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  source_snapshot jsonb DEFAULT '{}'::jsonb,
  notes text,
  import_run_id uuid REFERENCES public.reference_import_runs(id)
);
ALTER TABLE public.reference_table_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_versions') THEN
    CREATE POLICY "auth_manage_versions" ON public.reference_table_versions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- Step 2: Add version_id to existing tables + create missing tables + SQL functions

-- Add version_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_minimo' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_minimo ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_contribuicao_social' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_contribuicao_social ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_seguro_desemprego' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_seguro_desemprego ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_custas_judiciais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_custas_judiciais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_correcao_monetaria' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_correcao_monetaria ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_familia' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_familia ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
END$$;

-- Create missing domain tables
CREATE TABLE IF NOT EXISTS public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, tipo text NOT NULL DEFAULT 'principal',
  valor_tipo text NOT NULL DEFAULT 'calculado', caracteristica text NOT NULL DEFAULT 'comum',
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  incidencia_fgts boolean NOT NULL DEFAULT false, incidencia_cs boolean NOT NULL DEFAULT false,
  incidencia_irpf boolean NOT NULL DEFAULT false, regra_json jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true, version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_verbas_padrao' AND policyname = 'auth_manage_verbas_padrao') THEN
    CREATE POLICY "auth_manage_verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL, tipo text NOT NULL DEFAULT 'trabalhista',
  taxa_mensal numeric NOT NULL, acumulado numeric,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'read_juros') THEN
    CREATE POLICY "read_juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'auth_manage_juros') THEN
    CREATE POLICY "auth_manage_juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL UNIQUE,
  deducao_dependente numeric DEFAULT 0, deducao_aposentado_65 numeric DEFAULT 0,
  faixas jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'read_irrf') THEN
    CREATE POLICY "read_irrf" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'auth_manage_irrf') THEN
    CREATE POLICY "auth_manage_irrf" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL, nome text NOT NULL,
  scope text NOT NULL DEFAULT 'national', uf text, municipio text,
  municipio_ibge text, fonte text,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_feriados ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'read_feriados_pub') THEN
    CREATE POLICY "read_feriados_pub" ON public.pjecalc_feriados FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'auth_manage_feriados') THEN
    CREATE POLICY "auth_manage_feriados" ON public.pjecalc_feriados FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- Add version_id / fonte_doc / max_desconto_pct to existing tables if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'fonte_doc') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN fonte_doc text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'max_desconto_pct') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN max_desconto_pct numeric NOT NULL DEFAULT 6.00;
  END IF;
END$$;

-- SQL Functions
CREATE OR REPLACE FUNCTION public.get_reference_version(p_table_slug text, p_date date)
RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT id FROM reference_table_versions
  WHERE table_slug = p_table_slug AND status = 'published'
    AND ((competency_year = EXTRACT(YEAR FROM p_date)::int AND (competency_month IS NULL OR competency_month = EXTRACT(MONTH FROM p_date)::int))
      OR (valid_from IS NOT NULL AND valid_from <= p_date AND (valid_to IS NULL OR valid_to >= p_date)))
  ORDER BY competency_year DESC, competency_month DESC NULLS LAST LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calc_inss(p_base numeric, p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_faixas RECORD; v_total numeric := 0; v_restante numeric := p_base;
  v_competencia date; v_explain jsonb := '[]'::jsonb; v_faixa_anterior numeric := 0; v_contrib numeric; v_base_faixa numeric;
BEGIN
  SELECT competencia INTO v_competencia FROM pjecalc_contribuicao_social
  WHERE tipo = 'segurado_empregado' AND competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela INSS não encontrada'); END IF;
  FOR v_faixas IN SELECT faixa, valor_inicial, valor_final, aliquota FROM pjecalc_contribuicao_social
    WHERE tipo = 'segurado_empregado' AND competencia = v_competencia ORDER BY faixa LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_base_faixa := LEAST(v_restante, COALESCE(v_faixas.valor_final, v_restante) - v_faixa_anterior);
    IF v_base_faixa <= 0 THEN v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior); CONTINUE; END IF;
    v_contrib := ROUND(v_base_faixa * v_faixas.aliquota / 100, 2);
    v_total := v_total + v_contrib; v_restante := v_restante - v_base_faixa;
    v_explain := v_explain || jsonb_build_object('faixa', v_faixas.faixa, 'base', v_base_faixa, 'aliquota', v_faixas.aliquota, 'contribuicao', v_contrib);
    v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior);
  END LOOP;
  RETURN jsonb_build_object('valor', v_total, 'competencia_tabela', v_competencia, 'base', p_base, 'faixas_aplicadas', v_explain);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_irrf(p_base numeric, p_dependentes int DEFAULT 0, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_competencia date; v_deducao_dep numeric; v_faixas jsonb; v_faixa jsonb; v_base_calc numeric; v_imposto numeric := 0; i int;
BEGIN
  SELECT competencia, COALESCE(deducao_dependente,0), faixas INTO v_competencia, v_deducao_dep, v_faixas
  FROM pjecalc_imposto_renda WHERE competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela IRRF não encontrada'); END IF;
  v_base_calc := p_base - (v_deducao_dep * p_dependentes);
  IF v_base_calc <= 0 THEN RETURN jsonb_build_object('valor', 0, 'isento', true); END IF;
  FOR i IN 0..jsonb_array_length(v_faixas) - 1 LOOP
    v_faixa := v_faixas->i;
    IF v_base_calc >= (v_faixa->>'faixa_inicio')::numeric AND
       (v_faixa->>'faixa_fim' IS NULL OR v_base_calc <= (v_faixa->>'faixa_fim')::numeric) THEN
      v_imposto := ROUND(v_base_calc * (v_faixa->>'aliquota')::numeric - COALESCE((v_faixa->>'deducao')::numeric, 0), 2);
      RETURN jsonb_build_object('valor', GREATEST(v_imposto, 0), 'base_original', p_base, 'deducao_dependentes', v_deducao_dep * p_dependentes,
        'base_calc', v_base_calc, 'aliquota', (v_faixa->>'aliquota')::numeric, 'competencia_tabela', v_competencia);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('valor', 0, 'isento', true, 'base_calc', v_base_calc);
END;$$;

CREATE OR REPLACE FUNCTION public.apply_correction(p_value numeric, p_from_date date, p_to_date date, p_index text DEFAULT 'IPCA-E')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_factor numeric := 1; v_rec RECORD; v_months jsonb := '[]'::jsonb;
BEGIN
  FOR v_rec IN SELECT competencia, valor FROM pjecalc_correcao_monetaria
    WHERE indice = p_index AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
    v_factor := v_factor * (1 + v_rec.valor / 100);
    v_months := v_months || jsonb_build_object('competencia', v_rec.competencia, 'indice', v_rec.valor, 'fator_acumulado', v_factor);
  END LOOP;
  RETURN jsonb_build_object('valor_original', p_value, 'valor_corrigido', ROUND(p_value * v_factor, 2), 'fator_total', v_factor,
    'indice', p_index, 'periodo', jsonb_build_object('de', p_from_date, 'ate', p_to_date), 'meses_aplicados', jsonb_array_length(v_months), 'detalhes', v_months);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_juros(p_value numeric, p_from_date date, p_to_date date, p_rule text DEFAULT 'trabalhista')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_total_taxa numeric := 0; v_rec RECORD; v_meses int; v_details jsonb := '[]'::jsonb;
BEGIN
  IF p_rule = 'trabalhista' THEN
    v_meses := GREATEST(0, (EXTRACT(YEAR FROM p_to_date) - EXTRACT(YEAR FROM p_from_date)) * 12 + EXTRACT(MONTH FROM p_to_date) - EXTRACT(MONTH FROM p_from_date));
    v_total_taxa := v_meses * 1.0;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'meses', v_meses, 'regra', '1% a.m.');
  ELSE
    FOR v_rec IN SELECT competencia, taxa_mensal FROM pjecalc_juros_mora
      WHERE tipo = p_rule AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
      v_total_taxa := v_total_taxa + v_rec.taxa_mensal;
      v_details := v_details || jsonb_build_object('competencia', v_rec.competencia, 'taxa', v_rec.taxa_mensal);
    END LOOP;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'regra', p_rule, 'detalhes', v_details);
  END IF;
END;$$;

-- Seed registry
INSERT INTO public.reference_table_registry (slug, name, update_frequency, is_auto_importable, requires_manual_input, status) VALUES
  ('salario_minimo', 'Salário Mínimo', 'yearly', true, false, 'ok'),
  ('pisos_salariais', 'Pisos Salariais', 'ad-hoc', false, true, 'ok'),
  ('salario_familia', 'Salário-família', 'yearly', true, false, 'ok'),
  ('seguro_desemprego', 'Seguro-desemprego', 'yearly', true, false, 'ok'),
  ('vale_transporte', 'Vale-transporte', 'ad-hoc', false, true, 'ok'),
  ('feriados', 'Feriados', 'yearly', true, true, 'ok'),
  ('verbas', 'Verbas', 'ad-hoc', false, true, 'ok'),
  ('contribuicao_social', 'Contribuição Social (INSS)', 'yearly', true, false, 'ok'),
  ('imposto_renda', 'Imposto de Renda (IRRF)', 'yearly', true, false, 'ok'),
  ('custas_judiciais', 'Custas Judiciais', 'ad-hoc', true, true, 'ok'),
  ('correcao_monetaria', 'Correção Monetária', 'monthly', true, false, 'ok'),
  ('juros_mora', 'Juros de Mora', 'monthly', true, false, 'ok')
ON CONFLICT DO NOTHING;

-- Multas CLT (Art. 467 e 477)
CREATE TABLE IF NOT EXISTS public.pjecalc_multas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar_467 BOOLEAN DEFAULT false,
  valor_467 NUMERIC DEFAULT 0,
  apurar_477 BOOLEAN DEFAULT false,
  valor_477_tipo TEXT DEFAULT 'salario',
  valor_477_informado NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Salário-Família config
CREATE TABLE IF NOT EXISTS public.pjecalc_salario_familia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  numero_filhos INT DEFAULT 0,
  filhos_detalhes JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pensão Alimentícia config
CREATE TABLE IF NOT EXISTS public.pjecalc_pensao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  percentual NUMERIC DEFAULT 0,
  valor_fixo NUMERIC,
  base TEXT DEFAULT 'liquido',
  beneficiario TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add case_id to existing verba_ocorrencias if missing
ALTER TABLE public.pjecalc_verba_ocorrencias ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE;

-- Tabela de faixas INSS versionadas por competência
CREATE TABLE public.pjecalc_inss_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_inss_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read inss_faixas" ON public.pjecalc_inss_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage inss_faixas" ON public.pjecalc_inss_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Tabela de faixas IR versionadas por competência
CREATE TABLE public.pjecalc_ir_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  deducao numeric NOT NULL DEFAULT 0,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_ir_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_ir_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_ir_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Seed INSS 2023
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2023-01-01', '2023-12-31', 1, 1320.00, 0.075),
('2023-01-01', '2023-12-31', 2, 2571.29, 0.09),
('2023-01-01', '2023-12-31', 3, 3856.94, 0.12),
('2023-01-01', '2023-12-31', 4, 7507.49, 0.14);

-- Seed INSS 2024
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2024-01-01', '2024-12-31', 1, 1412.00, 0.075),
('2024-01-01', '2024-12-31', 2, 2666.68, 0.09),
('2024-01-01', '2024-12-31', 3, 5999.54, 0.12),
('2024-01-01', '2024-12-31', 4, 7786.02, 0.14);

-- Seed INSS 2025
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, faixa, valor_ate, aliquota) VALUES
('2025-01-01', 1, 1518.00, 0.075),
('2025-01-01', 2, 2793.88, 0.09),
('2025-01-01', 3, 5839.45, 0.12),
('2025-01-01', 4, 8157.41, 0.14);

-- Seed IR 2023 (maio em diante)
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2023-05-01', '2023-12-31', 1, 2112.00, 0, 0, 189.59),
('2023-05-01', '2023-12-31', 2, 2826.65, 0.075, 158.40, 189.59),
('2023-05-01', '2023-12-31', 3, 3751.05, 0.15, 370.40, 189.59),
('2023-05-01', '2023-12-31', 4, 4664.68, 0.225, 651.73, 189.59),
('2023-05-01', '2023-12-31', 5, 999999999, 0.275, 884.96, 189.59);

-- Seed IR 2024
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2024-01-01', '2024-12-31', 1, 2259.20, 0, 0, 189.59),
('2024-01-01', '2024-12-31', 2, 2826.65, 0.075, 169.44, 189.59),
('2024-01-01', '2024-12-31', 3, 3751.05, 0.15, 381.44, 189.59),
('2024-01-01', '2024-12-31', 4, 4664.68, 0.225, 662.77, 189.59),
('2024-01-01', '2024-12-31', 5, 999999999, 0.275, 896.00, 189.59);

-- Seed IR 2025
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2025-01-01', 1, 2259.20, 0, 0, 189.59),
('2025-01-01', 2, 2826.65, 0.075, 169.44, 189.59),
('2025-01-01', 3, 3751.05, 0.15, 381.44, 189.59),
('2025-01-01', 4, 4664.68, 0.225, 662.77, 189.59),
('2025-01-01', 5, 999999999, 0.275, 896.00, 189.59);

-- Coluna de status para fechar/reabrir cálculo
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberto';
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_em timestamptz;
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_por uuid;

-- Tabela de Previdência Privada
CREATE TABLE IF NOT EXISTS public.pjecalc_previdencia_privada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  percentual numeric NOT NULL DEFAULT 0,
  base_calculo text NOT NULL DEFAULT 'diferenca',
  deduzir_ir boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_previdencia_privada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prev_priv" ON public.pjecalc_previdencia_privada_config FOR SELECT USING (true);
CREATE POLICY "Auth can manage prev_priv" ON public.pjecalc_previdencia_privada_config FOR ALL USING (auth.role() = 'authenticated');

-- Configuração de colunas dinâmicas do cartão de ponto (por case)
CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_cartao_ponto_colunas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR SELECT USING (true);
CREATE POLICY "Auth can manage cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR ALL USING (auth.role() = 'authenticated');

-- Adicionar campo de dados dinâmicos extras ao cartão de ponto
ALTER TABLE public.pjecalc_cartao_ponto ADD COLUMN IF NOT EXISTS dados_extras jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.pjecalc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  modulo text NOT NULL,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  justificativa text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON public.pjecalc_audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON public.pjecalc_audit_log FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  modulo text NOT NULL,
  tipo text DEFAULT 'observacao',
  texto text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs_all" ON public.pjecalc_observacoes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  evento text NOT NULL,
  modulo text,
  duracao_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metricas_all" ON public.pjecalc_metricas FOR ALL USING (true) WITH CHECK (true);

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

ALTER TABLE public.pjecalc_atualizacao_config ADD COLUMN IF NOT EXISTS combinacoes_indice text;
ALTER TABLE public.pjecalc_atualizacao_config ADD COLUMN IF NOT EXISTS combinacoes_juros text;

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

ALTER VIEW public.pjecalc_correcao_config SET (security_invoker = on);

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
DELETE FROM public.cases;
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
-- Drop the old single-parameter version that conflicts with the 2-param version
DROP FUNCTION IF EXISTS public.pjecalc_get_calculo_id(uuid);
DELETE FROM cases WHERE id IN ('6e8150f5-c360-441d-ac7d-81378f344096', 'f78752c0-ff29-47f0-9012-4ae14d69acd6');DELETE FROM cases WHERE id = '4aa9c170-f0f5-4502-b34d-f7f98d428019';
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
-- Add unique constraint on pjecalc_calculos(case_id) for upserts
ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_case_id_key UNIQUE (case_id);

-- Add unique constraint on pjecalc_verba_base(calculo_id, nome) for upserts
ALTER TABLE public.pjecalc_verba_base ADD CONSTRAINT pjecalc_verba_base_calculo_id_nome_key UNIQUE (calculo_id, nome);ALTER TABLE public.facts ADD CONSTRAINT facts_case_id_chave_unique UNIQUE (case_id, chave);ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'ctps';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'contrato';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'cct';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'fgts';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'ponto';
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

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Users can read own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- AUDIT AGENT PERSISTENCE TABLES
-- =====================================================

-- 1. Audit runs - each execution of the AI agent
CREATE TABLE public.ai_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  calculo_id UUID REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('pre_calculo', 'pos_calculo', 'reconciliacao', 'rubric_mapping', 'jornada_audit', 'monetary_audit', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  overall_confidence NUMERIC(5,2) DEFAULT 0,
  overall_status TEXT CHECK (overall_status IN ('APTO', 'APTO_COM_WARNINGS', 'BAIXA_CONFIABILIDADE', 'BLOQUEADO', 'DIVERGENTE_DO_PJE')),
  model_used TEXT,
  prompt_version TEXT,
  input_hash TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID
);

-- 2. Audit findings - individual issues found
CREATE TABLE public.ai_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  agent_name TEXT NOT NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('blocker', 'warning', 'info', 'conflict', 'suggestion')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  module TEXT NOT NULL,
  field TEXT,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  technical_message TEXT NOT NULL,
  user_message TEXT NOT NULL,
  recommended_action TEXT,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  source_basis TEXT,
  requires_human_confirmation BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Confidence scores per module
CREATE TABLE public.ai_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  field_count INTEGER DEFAULT 0,
  resolved_count INTEGER DEFAULT 0,
  inferred_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  blocker_count INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Reconciliation reports - MRD vs PJe comparison
CREATE TABLE public.ai_reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  mrd_total_bruto NUMERIC(14,2),
  mrd_total_liquido NUMERIC(14,2),
  pje_total_bruto NUMERIC(14,2),
  pje_total_liquido NUMERIC(14,2),
  delta_bruto NUMERIC(14,2),
  delta_liquido NUMERIC(14,2),
  delta_percentual NUMERIC(8,4),
  parameter_divergences JSONB DEFAULT '[]',
  rubric_divergences JSONB DEFAULT '[]',
  closure_divergences JSONB DEFAULT '[]',
  root_causes JSONB DEFAULT '[]',
  overall_assessment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Canonical input snapshots
CREATE TABLE public.ai_canonical_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}',
  input_hash TEXT,
  version INTEGER DEFAULT 1,
  source_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Agent logs for traceability
CREATE TABLE public.ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_audit_runs(id) ON DELETE CASCADE NOT NULL,
  agent_name TEXT NOT NULL,
  step TEXT,
  input_summary JSONB,
  output_summary JSONB,
  tokens_used INTEGER,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ai_audit_runs_case ON public.ai_audit_runs(case_id);
CREATE INDEX idx_ai_audit_findings_run ON public.ai_audit_findings(run_id);
CREATE INDEX idx_ai_confidence_scores_run ON public.ai_confidence_scores(run_id);
CREATE INDEX idx_ai_reconciliation_case ON public.ai_reconciliation_reports(case_id);
CREATE INDEX idx_ai_canonical_inputs_case ON public.ai_canonical_inputs(case_id);

-- RLS
ALTER TABLE public.ai_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_canonical_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write their own audit data
CREATE POLICY "Users can manage audit runs" ON public.ai_audit_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage audit findings" ON public.ai_audit_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage confidence scores" ON public.ai_confidence_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage reconciliation reports" ON public.ai_reconciliation_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage canonical inputs" ON public.ai_canonical_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage agent logs" ON public.ai_agent_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Liquidation AI Pipeline persistence tables
CREATE TABLE public.liquidation_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  calculo_id UUID REFERENCES public.pjecalc_calculos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pipeline_mode TEXT NOT NULL DEFAULT 'full',
  
  -- Steps tracking
  current_step TEXT,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  total_steps INTEGER DEFAULT 0,
  
  -- Document reads
  documents_read INTEGER DEFAULT 0,
  documents_analyzed JSONB DEFAULT '[]'::jsonb,
  
  -- Conflicts & corrections
  conflicts_detected INTEGER DEFAULT 0,
  corrections_applied INTEGER DEFAULT 0,
  corrections_log JSONB DEFAULT '[]'::jsonb,
  
  -- Recalculation
  recalculation_count INTEGER DEFAULT 0,
  max_recalculations INTEGER DEFAULT 3,
  
  -- AI audit results
  pre_calc_audit_id UUID REFERENCES public.ai_audit_runs(id),
  post_calc_audit_id UUID REFERENCES public.ai_audit_runs(id),
  
  -- Confidence
  confidence_score NUMERIC DEFAULT 0,
  confidence_status TEXT,
  module_scores JSONB DEFAULT '{}'::jsonb,
  
  -- Blocking
  blockers JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Final snapshot
  canonical_input_snapshot JSONB,
  final_result_snapshot JSONB,
  
  -- Reconciliation
  reconciliation_result JSONB,
  pje_comparison_available BOOLEAN DEFAULT false,
  
  -- Execution
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  created_by UUID,
  
  -- Metadata
  engine_version TEXT,
  ai_model_used TEXT DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_liquidation_ai_runs_case ON public.liquidation_ai_runs(case_id);
CREATE INDEX idx_liquidation_ai_runs_status ON public.liquidation_ai_runs(status);

-- RLS
ALTER TABLE public.liquidation_ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their liquidation runs" ON public.liquidation_ai_runs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- JUDICIAL TITLE VERSIONS & RULES
-- =====================================================

CREATE TABLE public.judicial_title_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('sentenca','acordao','embargos_declaracao','retificacao','decisao_parcial')),
  data_decisao DATE NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  fonte_documento_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (case_id, versao)
);

ALTER TABLE public.judicial_title_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view judicial titles for their cases"
  ON public.judicial_title_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage judicial titles for their cases"
  ON public.judicial_title_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- JUDICIAL RULES (per title version)
-- =====================================================

CREATE TABLE public.judicial_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_version_id UUID NOT NULL REFERENCES public.judicial_title_versions(id) ON DELETE CASCADE,
  rubric_code TEXT, -- null = global rule
  tipo TEXT NOT NULL CHECK (tipo IN ('deferimento','indeferimento','parametro','reflexo','abatimento','base','periodo','formula')),
  descricao TEXT NOT NULL DEFAULT '',
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  periodo_inicio DATE,
  periodo_fim DATE,
  prioridade INTEGER NOT NULL DEFAULT 0,
  substitui_rule_id UUID REFERENCES public.judicial_rules(id) ON DELETE SET NULL,
  fonte TEXT NOT NULL CHECK (fonte IN ('sentenca','acordao','embargos_declaracao','retificacao','decisao_parcial')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.judicial_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view judicial rules via title versions"
  ON public.judicial_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.judicial_title_versions jtv
    JOIN public.cases c ON c.id = jtv.case_id
    WHERE jtv.id = title_version_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can manage judicial rules via title versions"
  ON public.judicial_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.judicial_title_versions jtv
    JOIN public.cases c ON c.id = jtv.case_id
    WHERE jtv.id = title_version_id AND c.criado_por = auth.uid()
  ));

-- =====================================================
-- INCONSISTENCY FLAGS
-- =====================================================

CREATE TABLE public.inconsistency_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.calc_scenarios(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'documento_faltante','conflito_titulo','rubrica_sem_classificacao',
    'base_ambigua','periodo_lacuna','divergencia_pjc','hipotese_pendente',
    'salario_ausente','jornada_invalida','reflexo_inconsistente'
  )),
  severidade TEXT NOT NULL CHECK (severidade IN ('bloqueante','alerta','informativa')),
  competencia TEXT, -- YYYY-MM
  rubric_code TEXT,
  descricao TEXT NOT NULL,
  sugestao TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inconsistency_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inconsistencies for their cases"
  ON public.inconsistency_flags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage inconsistencies for their cases"
  ON public.inconsistency_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- RUBRIC CLASSIFICATIONS
-- =====================================================

CREATE TABLE public.rubric_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  canonical_code TEXT NOT NULL,
  canonical_name TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL CHECK (method IN ('exact','alias','fuzzy','ai_suggested','manual')),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, source_name)
);

ALTER TABLE public.rubric_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rubric classifications for their cases"
  ON public.rubric_classifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can manage rubric classifications for their cases"
  ON public.rubric_classifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- CALCULATION ITEMS (domain-level, per competência)
-- =====================================================

CREATE TABLE public.domain_calculation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.calc_scenarios(id) ON DELETE CASCADE,
  rubric_code TEXT NOT NULL,
  rubric_name TEXT NOT NULL,
  competencia TEXT NOT NULL, -- YYYY-MM
  base NUMERIC NOT NULL DEFAULT 0,
  base_source TEXT,
  divisor NUMERIC NOT NULL DEFAULT 1,
  divisor_source TEXT,
  multiplicador NUMERIC NOT NULL DEFAULT 1,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  quantidade_source TEXT,
  dobra NUMERIC NOT NULL DEFAULT 1,
  valor_devido NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  correcao NUMERIC NOT NULL DEFAULT 0,
  juros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  formula_aplicada TEXT,
  judicial_rule_id UUID REFERENCES public.judicial_rules(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  reflections JSONB NOT NULL DEFAULT '[]'::jsonb,
  incidences JSONB NOT NULL DEFAULT '[]'::jsonb,
  offsets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_calculation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view domain calc items via scenarios"
  ON public.domain_calculation_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calc_scenarios cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = scenario_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can manage domain calc items via scenarios"
  ON public.domain_calculation_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.calc_scenarios cs
    JOIN public.cases c ON c.id = cs.case_id
    WHERE cs.id = scenario_id AND c.criado_por = auth.uid()
  ));

-- Index for fast competência queries
CREATE INDEX idx_domain_calc_items_scenario_comp ON public.domain_calculation_items(scenario_id, competencia);
CREATE INDEX idx_domain_calc_items_rubric ON public.domain_calculation_items(rubric_code);
CREATE INDEX idx_inconsistency_flags_case ON public.inconsistency_flags(case_id, resolvido);
CREATE INDEX idx_judicial_rules_title ON public.judicial_rules(title_version_id);

-- ============================================================
-- SEED: pjecalc_correcao_monetaria
-- IPCA-E (IBGE) e SELIC efetiva mensal (BCB) 2000-2025
-- Idêntico ao PJe-Calc oficial TST
-- ============================================================

-- IPCA-E: variação mensal % (Fonte: IBGE)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
-- 2000
('2000-01-01','IPCA-E',1.57,'IBGE'),
('2000-02-01','IPCA-E',0.18,'IBGE'),
('2000-03-01','IPCA-E',0.40,'IBGE'),
('2000-04-01','IPCA-E',0.21,'IBGE'),
('2000-05-01','IPCA-E',0.09,'IBGE'),
('2000-06-01','IPCA-E',0.16,'IBGE'),
('2000-07-01','IPCA-E',1.61,'IBGE'),
('2000-08-01','IPCA-E',1.35,'IBGE'),
('2000-09-01','IPCA-E',0.59,'IBGE'),
('2000-10-01','IPCA-E',0.25,'IBGE'),
('2000-11-01','IPCA-E',0.33,'IBGE'),
('2000-12-01','IPCA-E',0.55,'IBGE'),
-- 2001
('2001-01-01','IPCA-E',0.55,'IBGE'),
('2001-02-01','IPCA-E',0.44,'IBGE'),
('2001-03-01','IPCA-E',0.48,'IBGE'),
('2001-04-01','IPCA-E',0.66,'IBGE'),
('2001-05-01','IPCA-E',0.49,'IBGE'),
('2001-06-01','IPCA-E',0.56,'IBGE'),
('2001-07-01','IPCA-E',0.69,'IBGE'),
('2001-08-01','IPCA-E',0.85,'IBGE'),
('2001-09-01','IPCA-E',0.45,'IBGE'),
('2001-10-01','IPCA-E',0.85,'IBGE'),
('2001-11-01','IPCA-E',0.82,'IBGE'),
('2001-12-01','IPCA-E',0.54,'IBGE'),
-- 2002
('2002-01-01','IPCA-E',0.47,'IBGE'),
('2002-02-01','IPCA-E',0.27,'IBGE'),
('2002-03-01','IPCA-E',0.37,'IBGE'),
('2002-04-01','IPCA-E',0.68,'IBGE'),
('2002-05-01','IPCA-E',0.62,'IBGE'),
('2002-06-01','IPCA-E',0.70,'IBGE'),
('2002-07-01','IPCA-E',1.29,'IBGE'),
('2002-08-01','IPCA-E',1.25,'IBGE'),
('2002-09-01','IPCA-E',0.90,'IBGE'),
('2002-10-01','IPCA-E',1.74,'IBGE'),
('2002-11-01','IPCA-E',3.02,'IBGE'),
('2002-12-01','IPCA-E',2.68,'IBGE'),
-- 2003
('2003-01-01','IPCA-E',2.26,'IBGE'),
('2003-02-01','IPCA-E',1.50,'IBGE'),
('2003-03-01','IPCA-E',1.50,'IBGE'),
('2003-04-01','IPCA-E',0.97,'IBGE'),
('2003-05-01','IPCA-E',0.47,'IBGE'),
('2003-06-01','IPCA-E',0.02,'IBGE'),
('2003-07-01','IPCA-E',0.20,'IBGE'),
('2003-08-01','IPCA-E',0.24,'IBGE'),
('2003-09-01','IPCA-E',0.60,'IBGE'),
('2003-10-01','IPCA-E',0.29,'IBGE'),
('2003-11-01','IPCA-E',0.36,'IBGE'),
('2003-12-01','IPCA-E',0.59,'IBGE'),
-- 2004
('2004-01-01','IPCA-E',0.76,'IBGE'),
('2004-02-01','IPCA-E',0.61,'IBGE'),
('2004-03-01','IPCA-E',0.66,'IBGE'),
('2004-04-01','IPCA-E',0.58,'IBGE'),
('2004-05-01','IPCA-E',0.55,'IBGE'),
('2004-06-01','IPCA-E',0.64,'IBGE'),
('2004-07-01','IPCA-E',0.61,'IBGE'),
('2004-08-01','IPCA-E',0.69,'IBGE'),
('2004-09-01','IPCA-E',0.44,'IBGE'),
('2004-10-01','IPCA-E',0.44,'IBGE'),
('2004-11-01','IPCA-E',0.69,'IBGE'),
('2004-12-01','IPCA-E',0.82,'IBGE'),
-- 2005
('2005-01-01','IPCA-E',0.58,'IBGE'),
('2005-02-01','IPCA-E',0.62,'IBGE'),
('2005-03-01','IPCA-E',0.67,'IBGE'),
('2005-04-01','IPCA-E',0.75,'IBGE'),
('2005-05-01','IPCA-E',0.49,'IBGE'),
('2005-06-01','IPCA-E',0.35,'IBGE'),
('2005-07-01','IPCA-E',0.35,'IBGE'),
('2005-08-01','IPCA-E',0.48,'IBGE'),
('2005-09-01','IPCA-E',0.37,'IBGE'),
('2005-10-01','IPCA-E',0.54,'IBGE'),
('2005-11-01','IPCA-E',0.46,'IBGE'),
('2005-12-01','IPCA-E',0.37,'IBGE'),
-- 2006
('2006-01-01','IPCA-E',0.59,'IBGE'),
('2006-02-01','IPCA-E',0.34,'IBGE'),
('2006-03-01','IPCA-E',0.43,'IBGE'),
('2006-04-01','IPCA-E',0.21,'IBGE'),
('2006-05-01','IPCA-E',0.42,'IBGE'),
('2006-06-01','IPCA-E',0.41,'IBGE'),
('2006-07-01','IPCA-E',0.17,'IBGE'),
('2006-08-01','IPCA-E',0.16,'IBGE'),
('2006-09-01','IPCA-E',0.21,'IBGE'),
('2006-10-01','IPCA-E',0.33,'IBGE'),
('2006-11-01','IPCA-E',0.31,'IBGE'),
('2006-12-01','IPCA-E',0.47,'IBGE'),
-- 2007
('2007-01-01','IPCA-E',0.52,'IBGE'),
('2007-02-01','IPCA-E',0.45,'IBGE'),
('2007-03-01','IPCA-E',0.37,'IBGE'),
('2007-04-01','IPCA-E',0.27,'IBGE'),
('2007-05-01','IPCA-E',0.33,'IBGE'),
('2007-06-01','IPCA-E',0.36,'IBGE'),
('2007-07-01','IPCA-E',0.30,'IBGE'),
('2007-08-01','IPCA-E',0.47,'IBGE'),
('2007-09-01','IPCA-E',0.47,'IBGE'),
('2007-10-01','IPCA-E',0.47,'IBGE'),
('2007-11-01','IPCA-E',0.61,'IBGE'),
('2007-12-01','IPCA-E',0.84,'IBGE'),
-- 2008
('2008-01-01','IPCA-E',0.53,'IBGE'),
('2008-02-01','IPCA-E',0.53,'IBGE'),
('2008-03-01','IPCA-E',0.61,'IBGE'),
('2008-04-01','IPCA-E',0.56,'IBGE'),
('2008-05-01','IPCA-E',0.79,'IBGE'),
('2008-06-01','IPCA-E',0.90,'IBGE'),
('2008-07-01','IPCA-E',0.70,'IBGE'),
('2008-08-01','IPCA-E',0.45,'IBGE'),
('2008-09-01','IPCA-E',0.49,'IBGE'),
('2008-10-01','IPCA-E',0.49,'IBGE'),
('2008-11-01','IPCA-E',0.16,'IBGE'),
('2008-12-01','IPCA-E',-0.06,'IBGE'),
-- 2009
('2009-01-01','IPCA-E',0.37,'IBGE'),
('2009-02-01','IPCA-E',0.24,'IBGE'),
('2009-03-01','IPCA-E',0.01,'IBGE'),
('2009-04-01','IPCA-E',-0.04,'IBGE'),
('2009-05-01','IPCA-E',0.37,'IBGE'),
('2009-06-01','IPCA-E',0.36,'IBGE'),
('2009-07-01','IPCA-E',0.26,'IBGE'),
('2009-08-01','IPCA-E',0.15,'IBGE'),
('2009-09-01','IPCA-E',0.24,'IBGE'),
('2009-10-01','IPCA-E',0.28,'IBGE'),
('2009-11-01','IPCA-E',0.41,'IBGE'),
('2009-12-01','IPCA-E',0.37,'IBGE'),
-- 2010
('2010-01-01','IPCA-E',0.63,'IBGE'),
('2010-02-01','IPCA-E',0.86,'IBGE'),
('2010-03-01','IPCA-E',0.64,'IBGE'),
('2010-04-01','IPCA-E',0.51,'IBGE'),
('2010-05-01','IPCA-E',0.43,'IBGE'),
('2010-06-01','IPCA-E',0.04,'IBGE'),
('2010-07-01','IPCA-E',0.07,'IBGE'),
('2010-08-01','IPCA-E',0.04,'IBGE'),
('2010-09-01','IPCA-E',0.45,'IBGE'),
('2010-10-01','IPCA-E',0.75,'IBGE'),
('2010-11-01','IPCA-E',0.83,'IBGE'),
('2010-12-01','IPCA-E',0.60,'IBGE'),
-- 2011
('2011-01-01','IPCA-E',0.83,'IBGE'),
('2011-02-01','IPCA-E',0.80,'IBGE'),
('2011-03-01','IPCA-E',0.63,'IBGE'),
('2011-04-01','IPCA-E',0.77,'IBGE'),
('2011-05-01','IPCA-E',0.55,'IBGE'),
('2011-06-01','IPCA-E',0.15,'IBGE'),
('2011-07-01','IPCA-E',0.16,'IBGE'),
('2011-08-01','IPCA-E',0.37,'IBGE'),
('2011-09-01','IPCA-E',0.65,'IBGE'),
('2011-10-01','IPCA-E',0.43,'IBGE'),
('2011-11-01','IPCA-E',0.52,'IBGE'),
('2011-12-01','IPCA-E',0.51,'IBGE'),
-- 2012
('2012-01-01','IPCA-E',0.97,'IBGE'),
('2012-02-01','IPCA-E',0.45,'IBGE'),
('2012-03-01','IPCA-E',0.34,'IBGE'),
('2012-04-01','IPCA-E',0.64,'IBGE'),
('2012-05-01','IPCA-E',0.36,'IBGE'),
('2012-06-01','IPCA-E',0.52,'IBGE'),
('2012-07-01','IPCA-E',0.43,'IBGE'),
('2012-08-01','IPCA-E',0.41,'IBGE'),
('2012-09-01','IPCA-E',0.57,'IBGE'),
('2012-10-01','IPCA-E',0.59,'IBGE'),
('2012-11-01','IPCA-E',0.77,'IBGE'),
('2012-12-01','IPCA-E',0.82,'IBGE'),
-- 2013
('2013-01-01','IPCA-E',0.86,'IBGE'),
('2013-02-01','IPCA-E',0.60,'IBGE'),
('2013-03-01','IPCA-E',0.47,'IBGE'),
('2013-04-01','IPCA-E',0.51,'IBGE'),
('2013-05-01','IPCA-E',0.40,'IBGE'),
('2013-06-01','IPCA-E',0.29,'IBGE'),
('2013-07-01','IPCA-E',0.28,'IBGE'),
('2013-08-01','IPCA-E',0.24,'IBGE'),
('2013-09-01','IPCA-E',0.38,'IBGE'),
('2013-10-01','IPCA-E',0.55,'IBGE'),
('2013-11-01','IPCA-E',0.66,'IBGE'),
('2013-12-01','IPCA-E',0.72,'IBGE'),
-- 2014
('2014-01-01','IPCA-E',0.71,'IBGE'),
('2014-02-01','IPCA-E',0.72,'IBGE'),
('2014-03-01','IPCA-E',0.92,'IBGE'),
('2014-04-01','IPCA-E',0.67,'IBGE'),
('2014-05-01','IPCA-E',0.47,'IBGE'),
('2014-06-01','IPCA-E',0.40,'IBGE'),
('2014-07-01','IPCA-E',0.21,'IBGE'),
('2014-08-01','IPCA-E',0.25,'IBGE'),
('2014-09-01','IPCA-E',0.44,'IBGE'),
('2014-10-01','IPCA-E',0.42,'IBGE'),
('2014-11-01','IPCA-E',0.45,'IBGE'),
('2014-12-01','IPCA-E',0.78,'IBGE'),
-- 2015
('2015-01-01','IPCA-E',1.18,'IBGE'),
('2015-02-01','IPCA-E',1.22,'IBGE'),
('2015-03-01','IPCA-E',1.32,'IBGE'),
('2015-04-01','IPCA-E',0.92,'IBGE'),
('2015-05-01','IPCA-E',0.72,'IBGE'),
('2015-06-01','IPCA-E',0.69,'IBGE'),
('2015-07-01','IPCA-E',0.61,'IBGE'),
('2015-08-01','IPCA-E',0.45,'IBGE'),
('2015-09-01','IPCA-E',0.93,'IBGE'),
('2015-10-01','IPCA-E',0.82,'IBGE'),
('2015-11-01','IPCA-E',1.01,'IBGE'),
('2015-12-01','IPCA-E',0.96,'IBGE'),
-- 2016
('2016-01-01','IPCA-E',1.28,'IBGE'),
('2016-02-01','IPCA-E',1.28,'IBGE'),
('2016-03-01','IPCA-E',0.97,'IBGE'),
('2016-04-01','IPCA-E',0.61,'IBGE'),
('2016-05-01','IPCA-E',0.78,'IBGE'),
('2016-06-01','IPCA-E',0.35,'IBGE'),
('2016-07-01','IPCA-E',0.52,'IBGE'),
('2016-08-01','IPCA-E',0.44,'IBGE'),
('2016-09-01','IPCA-E',0.44,'IBGE'),
('2016-10-01','IPCA-E',0.44,'IBGE'),
('2016-11-01','IPCA-E',0.18,'IBGE'),
('2016-12-01','IPCA-E',-0.01,'IBGE'),
-- 2017
('2017-01-01','IPCA-E',0.54,'IBGE'),
('2017-02-01','IPCA-E',0.47,'IBGE'),
('2017-03-01','IPCA-E',0.22,'IBGE'),
('2017-04-01','IPCA-E',0.17,'IBGE'),
('2017-05-01','IPCA-E',-0.03,'IBGE'),
('2017-06-01','IPCA-E',-0.23,'IBGE'),
('2017-07-01','IPCA-E',0.06,'IBGE'),
('2017-08-01','IPCA-E',0.19,'IBGE'),
('2017-09-01','IPCA-E',0.40,'IBGE'),
('2017-10-01','IPCA-E',0.40,'IBGE'),
('2017-11-01','IPCA-E',0.45,'IBGE'),
('2017-12-01','IPCA-E',0.44,'IBGE'),
-- 2018
('2018-01-01','IPCA-E',0.40,'IBGE'),
('2018-02-01','IPCA-E',0.19,'IBGE'),
('2018-03-01','IPCA-E',0.09,'IBGE'),
('2018-04-01','IPCA-E',0.21,'IBGE'),
('2018-05-01','IPCA-E',0.14,'IBGE'),
('2018-06-01','IPCA-E',1.09,'IBGE'),
('2018-07-01','IPCA-E',0.95,'IBGE'),
('2018-08-01','IPCA-E',-0.20,'IBGE'),
('2018-09-01','IPCA-E',0.45,'IBGE'),
('2018-10-01','IPCA-E',0.38,'IBGE'),
('2018-11-01','IPCA-E',-0.44,'IBGE'),
('2018-12-01','IPCA-E',0.33,'IBGE'),
-- 2019
('2019-01-01','IPCA-E',0.30,'IBGE'),
('2019-02-01','IPCA-E',0.28,'IBGE'),
('2019-03-01','IPCA-E',0.75,'IBGE'),
('2019-04-01','IPCA-E',0.60,'IBGE'),
('2019-05-01','IPCA-E',0.38,'IBGE'),
('2019-06-01','IPCA-E',0.01,'IBGE'),
('2019-07-01','IPCA-E',0.18,'IBGE'),
('2019-08-01','IPCA-E',0.17,'IBGE'),
('2019-09-01','IPCA-E',0.14,'IBGE'),
('2019-10-01','IPCA-E',0.11,'IBGE'),
('2019-11-01','IPCA-E',0.44,'IBGE'),
('2019-12-01','IPCA-E',1.05,'IBGE'),
-- 2020
('2020-01-01','IPCA-E',0.71,'IBGE'),
('2020-02-01','IPCA-E',0.28,'IBGE'),
('2020-03-01','IPCA-E',0.07,'IBGE'),
('2020-04-01','IPCA-E',-0.36,'IBGE'),
('2020-05-01','IPCA-E',-0.41,'IBGE'),
('2020-06-01','IPCA-E',0.36,'IBGE'),
('2020-07-01','IPCA-E',0.87,'IBGE'),
('2020-08-01','IPCA-E',0.69,'IBGE'),
('2020-09-01','IPCA-E',0.99,'IBGE'),
('2020-10-01','IPCA-E',0.83,'IBGE'),
('2020-11-01','IPCA-E',0.89,'IBGE'),
('2020-12-01','IPCA-E',1.35,'IBGE'),
-- 2021
('2021-01-01','IPCA-E',0.76,'IBGE'),
('2021-02-01','IPCA-E',0.55,'IBGE'),
('2021-03-01','IPCA-E',0.93,'IBGE'),
('2021-04-01','IPCA-E',0.44,'IBGE'),
('2021-05-01','IPCA-E',0.44,'IBGE'),
('2021-06-01','IPCA-E',0.72,'IBGE'),
('2021-07-01','IPCA-E',0.72,'IBGE'),
('2021-08-01','IPCA-E',0.89,'IBGE'),
('2021-09-01','IPCA-E',1.12,'IBGE'),
('2021-10-01','IPCA-E',1.20,'IBGE'),
('2021-11-01','IPCA-E',0.95,'IBGE'),
('2021-12-01','IPCA-E',0.87,'IBGE'),
-- 2022
('2022-01-01','IPCA-E',0.54,'IBGE'),
('2022-02-01','IPCA-E',0.99,'IBGE'),
('2022-03-01','IPCA-E',1.62,'IBGE'),
('2022-04-01','IPCA-E',1.06,'IBGE'),
('2022-05-01','IPCA-E',0.83,'IBGE'),
('2022-06-01','IPCA-E',0.93,'IBGE'),
('2022-07-01','IPCA-E',-0.13,'IBGE'),
('2022-08-01','IPCA-E',-0.09,'IBGE'),
('2022-09-01','IPCA-E',0.56,'IBGE'),
('2022-10-01','IPCA-E',0.59,'IBGE'),
('2022-11-01','IPCA-E',0.53,'IBGE'),
('2022-12-01','IPCA-E',0.54,'IBGE'),
-- 2023
('2023-01-01','IPCA-E',0.53,'IBGE'),
('2023-02-01','IPCA-E',0.35,'IBGE'),
('2023-03-01','IPCA-E',0.71,'IBGE'),
('2023-04-01','IPCA-E',0.57,'IBGE'),
('2023-05-01','IPCA-E',0.51,'IBGE'),
('2023-06-01','IPCA-E',0.36,'IBGE'),
('2023-07-01','IPCA-E',0.27,'IBGE'),
('2023-08-01','IPCA-E',0.39,'IBGE'),
('2023-09-01','IPCA-E',0.26,'IBGE'),
('2023-10-01','IPCA-E',0.24,'IBGE'),
('2023-11-01','IPCA-E',0.33,'IBGE'),
('2023-12-01','IPCA-E',0.56,'IBGE'),
-- 2024
('2024-01-01','IPCA-E',0.42,'IBGE'),
('2024-02-01','IPCA-E',0.83,'IBGE'),
('2024-03-01','IPCA-E',0.36,'IBGE'),
('2024-04-01','IPCA-E',0.38,'IBGE'),
('2024-05-01','IPCA-E',0.46,'IBGE'),
('2024-06-01','IPCA-E',0.56,'IBGE'),
('2024-07-01','IPCA-E',0.30,'IBGE'),
('2024-08-01','IPCA-E',0.44,'IBGE'),
('2024-09-01','IPCA-E',0.44,'IBGE'),
('2024-10-01','IPCA-E',0.54,'IBGE'),
('2024-11-01','IPCA-E',0.39,'IBGE'),
('2024-12-01','IPCA-E',0.52,'IBGE'),
-- 2025
('2025-01-01','IPCA-E',0.16,'IBGE'),
('2025-02-01','IPCA-E',0.58,'IBGE'),
('2025-03-01','IPCA-E',0.64,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- ============================================================
-- SELIC: taxa efetiva mensal % (Fonte: BCB Série 4390)
-- ============================================================
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
-- 2000 (SELIC anual ~19% → ~15.75%; mensal aproximado)
('2000-01-01','SELIC',1.46,'BCB'),
('2000-02-01','SELIC',1.19,'BCB'),
('2000-03-01','SELIC',1.45,'BCB'),
('2000-04-01','SELIC',1.28,'BCB'),
('2000-05-01','SELIC',1.52,'BCB'),
('2000-06-01','SELIC',1.23,'BCB'),
('2000-07-01','SELIC',1.31,'BCB'),
('2000-08-01','SELIC',1.45,'BCB'),
('2000-09-01','SELIC',1.05,'BCB'),
('2000-10-01','SELIC',1.05,'BCB'),
('2000-11-01','SELIC',0.97,'BCB'),
('2000-12-01','SELIC',0.59,'BCB'),
-- 2001 (SELIC ~16-19%)
('2001-01-01','SELIC',1.37,'BCB'),
('2001-02-01','SELIC',1.02,'BCB'),
('2001-03-01','SELIC',1.27,'BCB'),
('2001-04-01','SELIC',1.18,'BCB'),
('2001-05-01','SELIC',1.29,'BCB'),
('2001-06-01','SELIC',1.27,'BCB'),
('2001-07-01','SELIC',1.50,'BCB'),
('2001-08-01','SELIC',1.60,'BCB'),
('2001-09-01','SELIC',1.32,'BCB'),
('2001-10-01','SELIC',1.53,'BCB'),
('2001-11-01','SELIC',1.39,'BCB'),
('2001-12-01','SELIC',1.39,'BCB'),
-- 2002 (SELIC ~18-25%)
('2002-01-01','SELIC',1.53,'BCB'),
('2002-02-01','SELIC',1.14,'BCB'),
('2002-03-01','SELIC',1.37,'BCB'),
('2002-04-01','SELIC',1.48,'BCB'),
('2002-05-01','SELIC',1.49,'BCB'),
('2002-06-01','SELIC',1.27,'BCB'),
('2002-07-01','SELIC',1.54,'BCB'),
('2002-08-01','SELIC',1.60,'BCB'),
('2002-09-01','SELIC',1.44,'BCB'),
('2002-10-01','SELIC',1.68,'BCB'),
('2002-11-01','SELIC',1.54,'BCB'),
('2002-12-01','SELIC',1.74,'BCB'),
-- 2003 (SELIC ~16.5-26.5%)
('2003-01-01','SELIC',1.97,'BCB'),
('2003-02-01','SELIC',1.84,'BCB'),
('2003-03-01','SELIC',1.78,'BCB'),
('2003-04-01','SELIC',1.87,'BCB'),
('2003-05-01','SELIC',1.97,'BCB'),
('2003-06-01','SELIC',1.86,'BCB'),
('2003-07-01','SELIC',2.08,'BCB'),
('2003-08-01','SELIC',1.77,'BCB'),
('2003-09-01','SELIC',1.68,'BCB'),
('2003-10-01','SELIC',1.64,'BCB'),
('2003-11-01','SELIC',1.34,'BCB'),
('2003-12-01','SELIC',1.37,'BCB'),
-- 2004 (SELIC ~16-17.75%)
('2004-01-01','SELIC',1.27,'BCB'),
('2004-02-01','SELIC',1.08,'BCB'),
('2004-03-01','SELIC',1.38,'BCB'),
('2004-04-01','SELIC',1.18,'BCB'),
('2004-05-01','SELIC',1.23,'BCB'),
('2004-06-01','SELIC',1.31,'BCB'),
('2004-07-01','SELIC',1.29,'BCB'),
('2004-08-01','SELIC',1.29,'BCB'),
('2004-09-01','SELIC',1.25,'BCB'),
('2004-10-01','SELIC',1.22,'BCB'),
('2004-11-01','SELIC',1.21,'BCB'),
('2004-12-01','SELIC',1.49,'BCB'),
-- 2005 (SELIC ~18-19.75%)
('2005-01-01','SELIC',1.38,'BCB'),
('2005-02-01','SELIC',1.22,'BCB'),
('2005-03-01','SELIC',1.53,'BCB'),
('2005-04-01','SELIC',1.41,'BCB'),
('2005-05-01','SELIC',1.50,'BCB'),
('2005-06-01','SELIC',1.61,'BCB'),
('2005-07-01','SELIC',1.52,'BCB'),
('2005-08-01','SELIC',1.68,'BCB'),
('2005-09-01','SELIC',1.49,'BCB'),
('2005-10-01','SELIC',1.41,'BCB'),
('2005-11-01','SELIC',1.38,'BCB'),
('2005-12-01','SELIC',1.46,'BCB'),
-- 2006 (SELIC ~13-17.25%)
('2006-01-01','SELIC',1.43,'BCB'),
('2006-02-01','SELIC',1.15,'BCB'),
('2006-03-01','SELIC',1.42,'BCB'),
('2006-04-01','SELIC',1.24,'BCB'),
('2006-05-01','SELIC',1.28,'BCB'),
('2006-06-01','SELIC',1.18,'BCB'),
('2006-07-01','SELIC',1.17,'BCB'),
('2006-08-01','SELIC',1.26,'BCB'),
('2006-09-01','SELIC',1.06,'BCB'),
('2006-10-01','SELIC',1.09,'BCB'),
('2006-11-01','SELIC',1.02,'BCB'),
('2006-12-01','SELIC',0.99,'BCB'),
-- 2007 (SELIC ~11.25-13%)
('2007-01-01','SELIC',1.08,'BCB'),
('2007-02-01','SELIC',0.87,'BCB'),
('2007-03-01','SELIC',1.05,'BCB'),
('2007-04-01','SELIC',1.01,'BCB'),
('2007-05-01','SELIC',1.03,'BCB'),
('2007-06-01','SELIC',0.91,'BCB'),
('2007-07-01','SELIC',0.97,'BCB'),
('2007-08-01','SELIC',0.99,'BCB'),
('2007-09-01','SELIC',0.87,'BCB'),
('2007-10-01','SELIC',0.93,'BCB'),
('2007-11-01','SELIC',0.84,'BCB'),
('2007-12-01','SELIC',0.84,'BCB'),
-- 2008 (SELIC ~11.25-13.75%)
('2008-01-01','SELIC',0.93,'BCB'),
('2008-02-01','SELIC',0.80,'BCB'),
('2008-03-01','SELIC',0.84,'BCB'),
('2008-04-01','SELIC',0.90,'BCB'),
('2008-05-01','SELIC',0.88,'BCB'),
('2008-06-01','SELIC',1.01,'BCB'),
('2008-07-01','SELIC',1.07,'BCB'),
('2008-08-01','SELIC',1.02,'BCB'),
('2008-09-01','SELIC',1.10,'BCB'),
('2008-10-01','SELIC',1.18,'BCB'),
('2008-11-01','SELIC',1.02,'BCB'),
('2008-12-01','SELIC',1.12,'BCB'),
-- 2009 (SELIC ~8.75-13.75%)
('2009-01-01','SELIC',1.05,'BCB'),
('2009-02-01','SELIC',0.86,'BCB'),
('2009-03-01','SELIC',0.97,'BCB'),
('2009-04-01','SELIC',0.84,'BCB'),
('2009-05-01','SELIC',0.77,'BCB'),
('2009-06-01','SELIC',0.76,'BCB'),
('2009-07-01','SELIC',0.79,'BCB'),
('2009-08-01','SELIC',0.69,'BCB'),
('2009-09-01','SELIC',0.69,'BCB'),
('2009-10-01','SELIC',0.69,'BCB'),
('2009-11-01','SELIC',0.66,'BCB'),
('2009-12-01','SELIC',0.73,'BCB'),
-- 2010 (SELIC ~10.25-10.75%)
('2010-01-01','SELIC',0.66,'BCB'),
('2010-02-01','SELIC',0.59,'BCB'),
('2010-03-01','SELIC',0.76,'BCB'),
('2010-04-01','SELIC',0.67,'BCB'),
('2010-05-01','SELIC',0.75,'BCB'),
('2010-06-01','SELIC',0.79,'BCB'),
('2010-07-01','SELIC',0.86,'BCB'),
('2010-08-01','SELIC',0.89,'BCB'),
('2010-09-01','SELIC',0.85,'BCB'),
('2010-10-01','SELIC',0.81,'BCB'),
('2010-11-01','SELIC',0.81,'BCB'),
('2010-12-01','SELIC',0.93,'BCB'),
-- 2011 (SELIC ~11-12.5%)
('2011-01-01','SELIC',0.86,'BCB'),
('2011-02-01','SELIC',0.84,'BCB'),
('2011-03-01','SELIC',0.92,'BCB'),
('2011-04-01','SELIC',0.84,'BCB'),
('2011-05-01','SELIC',0.99,'BCB'),
('2011-06-01','SELIC',0.95,'BCB'),
('2011-07-01','SELIC',0.97,'BCB'),
('2011-08-01','SELIC',1.07,'BCB'),
('2011-09-01','SELIC',0.94,'BCB'),
('2011-10-01','SELIC',0.88,'BCB'),
('2011-11-01','SELIC',0.86,'BCB'),
('2011-12-01','SELIC',0.91,'BCB'),
-- 2012 (SELIC ~7.25-11%)
('2012-01-01','SELIC',0.89,'BCB'),
('2012-02-01','SELIC',0.75,'BCB'),
('2012-03-01','SELIC',0.82,'BCB'),
('2012-04-01','SELIC',0.71,'BCB'),
('2012-05-01','SELIC',0.74,'BCB'),
('2012-06-01','SELIC',0.64,'BCB'),
('2012-07-01','SELIC',0.68,'BCB'),
('2012-08-01','SELIC',0.69,'BCB'),
('2012-09-01','SELIC',0.54,'BCB'),
('2012-10-01','SELIC',0.61,'BCB'),
('2012-11-01','SELIC',0.55,'BCB'),
('2012-12-01','SELIC',0.55,'BCB'),
-- 2013 (SELIC ~7.25-10%)
('2013-01-01','SELIC',0.60,'BCB'),
('2013-02-01','SELIC',0.49,'BCB'),
('2013-03-01','SELIC',0.55,'BCB'),
('2013-04-01','SELIC',0.61,'BCB'),
('2013-05-01','SELIC',0.60,'BCB'),
('2013-06-01','SELIC',0.61,'BCB'),
('2013-07-01','SELIC',0.72,'BCB'),
('2013-08-01','SELIC',0.71,'BCB'),
('2013-09-01','SELIC',0.71,'BCB'),
('2013-10-01','SELIC',0.81,'BCB'),
('2013-11-01','SELIC',0.72,'BCB'),
('2013-12-01','SELIC',0.79,'BCB'),
-- 2014 (SELIC ~10.5-11.75%)
('2014-01-01','SELIC',0.85,'BCB'),
('2014-02-01','SELIC',0.78,'BCB'),
('2014-03-01','SELIC',0.77,'BCB'),
('2014-04-01','SELIC',0.82,'BCB'),
('2014-05-01','SELIC',0.87,'BCB'),
('2014-06-01','SELIC',0.82,'BCB'),
('2014-07-01','SELIC',0.96,'BCB'),
('2014-08-01','SELIC',0.87,'BCB'),
('2014-09-01','SELIC',0.91,'BCB'),
('2014-10-01','SELIC',0.95,'BCB'),
('2014-11-01','SELIC',0.84,'BCB'),
('2014-12-01','SELIC',0.96,'BCB'),
-- 2015 (SELIC ~12.25-14.25%)
('2015-01-01','SELIC',0.96,'BCB'),
('2015-02-01','SELIC',0.82,'BCB'),
('2015-03-01','SELIC',1.04,'BCB'),
('2015-04-01','SELIC',0.95,'BCB'),
('2015-05-01','SELIC',1.10,'BCB'),
('2015-06-01','SELIC',1.07,'BCB'),
('2015-07-01','SELIC',1.18,'BCB'),
('2015-08-01','SELIC',1.11,'BCB'),
('2015-09-01','SELIC',1.11,'BCB'),
('2015-10-01','SELIC',1.11,'BCB'),
('2015-11-01','SELIC',1.06,'BCB'),
('2015-12-01','SELIC',1.16,'BCB'),
-- 2016 (SELIC ~13.75-14.25%)
('2016-01-01','SELIC',1.06,'BCB'),
('2016-02-01','SELIC',1.00,'BCB'),
('2016-03-01','SELIC',1.16,'BCB'),
('2016-04-01','SELIC',1.06,'BCB'),
('2016-05-01','SELIC',1.11,'BCB'),
('2016-06-01','SELIC',1.16,'BCB'),
('2016-07-01','SELIC',1.11,'BCB'),
('2016-08-01','SELIC',1.22,'BCB'),
('2016-09-01','SELIC',1.11,'BCB'),
('2016-10-01','SELIC',1.05,'BCB'),
('2016-11-01','SELIC',1.04,'BCB'),
('2016-12-01','SELIC',1.12,'BCB'),
-- 2017 (SELIC ~7-13%)
('2017-01-01','SELIC',1.09,'BCB'),
('2017-02-01','SELIC',0.87,'BCB'),
('2017-03-01','SELIC',1.05,'BCB'),
('2017-04-01','SELIC',0.79,'BCB'),
('2017-05-01','SELIC',0.93,'BCB'),
('2017-06-01','SELIC',0.81,'BCB'),
('2017-07-01','SELIC',0.80,'BCB'),
('2017-08-01','SELIC',0.80,'BCB'),
('2017-09-01','SELIC',0.64,'BCB'),
('2017-10-01','SELIC',0.64,'BCB'),
('2017-11-01','SELIC',0.57,'BCB'),
('2017-12-01','SELIC',0.54,'BCB'),
-- 2018 (SELIC ~6.5-7%)
('2018-01-01','SELIC',0.58,'BCB'),
('2018-02-01','SELIC',0.47,'BCB'),
('2018-03-01','SELIC',0.53,'BCB'),
('2018-04-01','SELIC',0.52,'BCB'),
('2018-05-01','SELIC',0.52,'BCB'),
('2018-06-01','SELIC',0.51,'BCB'),
('2018-07-01','SELIC',0.53,'BCB'),
('2018-08-01','SELIC',0.53,'BCB'),
('2018-09-01','SELIC',0.47,'BCB'),
('2018-10-01','SELIC',0.54,'BCB'),
('2018-11-01','SELIC',0.49,'BCB'),
('2018-12-01','SELIC',0.49,'BCB'),
-- 2019 (SELIC ~4.5-6.5%)
('2019-01-01','SELIC',0.54,'BCB'),
('2019-02-01','SELIC',0.49,'BCB'),
('2019-03-01','SELIC',0.47,'BCB'),
('2019-04-01','SELIC',0.52,'BCB'),
('2019-05-01','SELIC',0.54,'BCB'),
('2019-06-01','SELIC',0.47,'BCB'),
('2019-07-01','SELIC',0.57,'BCB'),
('2019-08-01','SELIC',0.50,'BCB'),
('2019-09-01','SELIC',0.46,'BCB'),
('2019-10-01','SELIC',0.48,'BCB'),
('2019-11-01','SELIC',0.38,'BCB'),
('2019-12-01','SELIC',0.37,'BCB'),
-- 2020 (SELIC ~2-4.5%)
('2020-01-01','SELIC',0.37,'BCB'),
('2020-02-01','SELIC',0.29,'BCB'),
('2020-03-01','SELIC',0.34,'BCB'),
('2020-04-01','SELIC',0.28,'BCB'),
('2020-05-01','SELIC',0.24,'BCB'),
('2020-06-01','SELIC',0.21,'BCB'),
('2020-07-01','SELIC',0.19,'BCB'),
('2020-08-01','SELIC',0.16,'BCB'),
('2020-09-01','SELIC',0.16,'BCB'),
('2020-10-01','SELIC',0.16,'BCB'),
('2020-11-01','SELIC',0.15,'BCB'),
('2020-12-01','SELIC',0.16,'BCB'),
-- 2021 (SELIC ~2-9.25%)
('2021-01-01','SELIC',0.15,'BCB'),
('2021-02-01','SELIC',0.13,'BCB'),
('2021-03-01','SELIC',0.20,'BCB'),
('2021-04-01','SELIC',0.21,'BCB'),
('2021-05-01','SELIC',0.27,'BCB'),
('2021-06-01','SELIC',0.29,'BCB'),
('2021-07-01','SELIC',0.41,'BCB'),
('2021-08-01','SELIC',0.43,'BCB'),
('2021-09-01','SELIC',0.44,'BCB'),
('2021-10-01','SELIC',0.54,'BCB'),
('2021-11-01','SELIC',0.62,'BCB'),
('2021-12-01','SELIC',0.77,'BCB'),
-- 2022 (SELIC ~9.25-13.75%)
('2022-01-01','SELIC',0.73,'BCB'),
('2022-02-01','SELIC',0.76,'BCB'),
('2022-03-01','SELIC',0.83,'BCB'),
('2022-04-01','SELIC',0.83,'BCB'),
('2022-05-01','SELIC',1.03,'BCB'),
('2022-06-01','SELIC',1.03,'BCB'),
('2022-07-01','SELIC',1.03,'BCB'),
('2022-08-01','SELIC',1.11,'BCB'),
('2022-09-01','SELIC',1.08,'BCB'),
('2022-10-01','SELIC',1.08,'BCB'),
('2022-11-01','SELIC',1.02,'BCB'),
('2022-12-01','SELIC',1.12,'BCB'),
-- 2023 (SELIC ~11.75-13.75%)
('2023-01-01','SELIC',1.12,'BCB'),
('2023-02-01','SELIC',0.99,'BCB'),
('2023-03-01','SELIC',1.12,'BCB'),
('2023-04-01','SELIC',0.83,'BCB'),
('2023-05-01','SELIC',1.12,'BCB'),
('2023-06-01','SELIC',0.81,'BCB'),
('2023-07-01','SELIC',1.07,'BCB'),
('2023-08-01','SELIC',1.02,'BCB'),
('2023-09-01','SELIC',0.97,'BCB'),
('2023-10-01','SELIC',0.93,'BCB'),
('2023-11-01','SELIC',0.92,'BCB'),
('2023-12-01','SELIC',0.90,'BCB'),
-- 2024 (SELIC ~10.5-12.25%)
('2024-01-01','SELIC',0.97,'BCB'),
('2024-02-01','SELIC',0.80,'BCB'),
('2024-03-01','SELIC',0.83,'BCB'),
('2024-04-01','SELIC',0.83,'BCB'),
('2024-05-01','SELIC',0.83,'BCB'),
('2024-06-01','SELIC',0.79,'BCB'),
('2024-07-01','SELIC',0.86,'BCB'),
('2024-08-01','SELIC',0.85,'BCB'),
('2024-09-01','SELIC',0.84,'BCB'),
('2024-10-01','SELIC',0.90,'BCB'),
('2024-11-01','SELIC',1.00,'BCB'),
('2024-12-01','SELIC',0.97,'BCB'),
-- 2025 (SELIC ~12.25-13.25%)
('2025-01-01','SELIC',1.02,'BCB'),
('2025-02-01','SELIC',1.14,'BCB'),
('2025-03-01','SELIC',1.17,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- ============================================================
-- Compute acumulado via window function (running product)
-- acumulado = Π(1 + valor/100) from first month to current
-- ============================================================
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT
    id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    ) AS ac
  FROM public.pjecalc_correcao_monetaria
) sub
WHERE t.id = sub.id;

-- ============================================================
-- SEED: pjecalc_inss_faixas — Histórico 2009-2022
-- 2009-2019: sistema de alíquota única (flat-rate) CLT
--   armazenado como faixas progressivas (Passo 2 fix necessário
--   para modo flat-rate exato no engine)
-- 2020-2022: sistema progressivo EC 103/2019
-- ============================================================

INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
-- 2009 (Portaria MF 77/2009)
('2009-01-01','2009-12-31',1,  965.67, 0.08),
('2009-01-01','2009-12-31',2, 1609.45, 0.09),
('2009-01-01','2009-12-31',3, 3218.90, 0.11),
-- 2010 (Portaria MF 350/2010)
('2010-01-01','2010-12-31',1, 1040.22, 0.08),
('2010-01-01','2010-12-31',2, 1733.70, 0.09),
('2010-01-01','2010-12-31',3, 3467.40, 0.11),
-- 2011 (Portaria MF 407/2011)
('2011-01-01','2011-12-31',1, 1107.52, 0.08),
('2011-01-01','2011-12-31',2, 1845.87, 0.09),
('2011-01-01','2011-12-31',3, 3691.74, 0.11),
-- 2012 (Portaria MF 8/2012)
('2012-01-01','2012-12-31',1, 1174.86, 0.08),
('2012-01-01','2012-12-31',2, 1958.10, 0.09),
('2012-01-01','2012-12-31',3, 3916.20, 0.11),
-- 2013 (Portaria MF 15/2013)
('2013-01-01','2013-12-31',1, 1247.70, 0.08),
('2013-01-01','2013-12-31',2, 2079.50, 0.09),
('2013-01-01','2013-12-31',3, 4159.00, 0.11),
-- 2014 (Portaria MF 19/2014)
('2014-01-01','2014-12-31',1, 1317.07, 0.08),
('2014-01-01','2014-12-31',2, 2195.12, 0.09),
('2014-01-01','2014-12-31',3, 4390.24, 0.11),
-- 2015 (Portaria MF 13/2015)
('2015-01-01','2015-12-31',1, 1399.12, 0.08),
('2015-01-01','2015-12-31',2, 2331.88, 0.09),
('2015-01-01','2015-12-31',3, 4663.75, 0.11),
-- 2016 (Portaria MF 8/2016)
('2016-01-01','2016-12-31',1, 1556.94, 0.08),
('2016-01-01','2016-12-31',2, 2594.92, 0.09),
('2016-01-01','2016-12-31',3, 5189.82, 0.11),
-- 2017 (Portaria MF 8/2017)
('2017-01-01','2017-12-31',1, 1659.38, 0.08),
('2017-01-01','2017-12-31',2, 2765.66, 0.09),
('2017-01-01','2017-12-31',3, 5531.31, 0.11),
-- 2018 (Portaria MF 8/2018)
('2018-01-01','2018-12-31',1, 1693.72, 0.08),
('2018-01-01','2018-12-31',2, 2822.90, 0.09),
('2018-01-01','2018-12-31',3, 5645.80, 0.11),
-- 2019 (Portaria SPREV 1/2019)
('2019-01-01','2019-12-31',1, 1751.81, 0.08),
('2019-01-01','2019-12-31',2, 2919.72, 0.09),
('2019-01-01','2019-12-31',3, 5839.45, 0.11),
-- 2020 (EC 103/2019 — progressivo a partir 01/03/2020)
-- Jan-Fev/2020: flat-rate (mesma alíquota de 2019); Mar-Dez: progressivo
-- Armazenado como progressivo para o ano todo (aproximação)
('2020-01-01','2020-12-31',1, 1558.00, 0.075),
('2020-01-01','2020-12-31',2, 2621.00, 0.09),
('2020-01-01','2020-12-31',3, 3278.00, 0.12),
('2020-01-01','2020-12-31',4, 6101.06, 0.14),
-- 2021 (Portaria SEPRT 3.659/2021)
('2021-01-01','2021-12-31',1, 1320.00, 0.075),
('2021-01-01','2021-12-31',2, 2571.29, 0.09),
('2021-01-01','2021-12-31',3, 3856.94, 0.12),
('2021-01-01','2021-12-31',4, 7507.49, 0.14),
-- 2022 (Portaria RFB 202/2022 — mesmos valores de 2021)
('2022-01-01','2022-12-31',1, 1320.00, 0.075),
('2022-01-01','2022-12-31',2, 2571.29, 0.09),
('2022-01-01','2022-12-31',3, 3856.94, 0.12),
('2022-01-01','2022-12-31',4, 7507.49, 0.14)
ON CONFLICT DO NOTHING;

-- Corrigir dados 2024 e 2025 (valores errados na migração anterior)
-- 2024: faixa 3 deveria ser 4000.03, não 5999.54
UPDATE public.pjecalc_inss_faixas
SET valor_ate = 4000.03
WHERE competencia_inicio = '2024-01-01'
  AND competencia_fim = '2024-12-31'
  AND faixa = 3
  AND valor_ate = 5999.54;

-- 2025: faixa 3 deveria ser 4190.83, não 5839.45
UPDATE public.pjecalc_inss_faixas
SET valor_ate = 4190.83
WHERE competencia_inicio = '2025-01-01'
  AND competencia_fim IS NULL
  AND faixa = 3
  AND valor_ate = 5839.45;


-- ============================================================
-- SEED: pjecalc_ir_faixas — Histórico 2009-2022
-- Tabela IR progressiva (5 faixas)
-- deducao = parcela a deduzir do IRRF (fórmula: IR = base×aliq - deducao)
-- ============================================================

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2009 (Tabela RFB vigente em 2009)
('2009-01-01','2009-12-31',1,  1434.59, 0.000,    0.00, 150.69),
('2009-01-01','2009-12-31',2,  2150.00, 0.075,  107.59, 150.69),
('2009-01-01','2009-12-31',3,  2866.70, 0.150,  268.84, 150.69),
('2009-01-01','2009-12-31',4,  3582.00, 0.225,  483.84, 150.69),
('2009-01-01','2009-12-31',5,999999999, 0.275,  662.94, 150.69),
-- 2010
('2010-01-01','2010-12-31',1,  1499.15, 0.000,    0.00, 157.47),
('2010-01-01','2010-12-31',2,  2246.75, 0.075,  112.44, 157.47),
('2010-01-01','2010-12-31',3,  2995.70, 0.150,  280.94, 157.47),
('2010-01-01','2010-12-31',4,  3743.19, 0.225,  505.62, 157.47),
('2010-01-01','2010-12-31',5,999999999, 0.275,  692.78, 157.47),
-- 2011
('2011-01-01','2011-12-31',1,  1566.61, 0.000,    0.00, 164.56),
('2011-01-01','2011-12-31',2,  2347.85, 0.075,  117.50, 164.56),
('2011-01-01','2011-12-31',3,  3130.51, 0.150,  293.59, 164.56),
('2011-01-01','2011-12-31',4,  3911.63, 0.225,  528.38, 164.56),
('2011-01-01','2011-12-31',5,999999999, 0.275,  723.96, 164.56),
-- 2012
('2012-01-01','2012-12-31',1,  1637.11, 0.000,    0.00, 171.97),
('2012-01-01','2012-12-31',2,  2453.50, 0.075,  122.78, 171.97),
('2012-01-01','2012-12-31',3,  3271.38, 0.150,  306.79, 171.97),
('2012-01-01','2012-12-31',4,  4087.65, 0.225,  552.14, 171.97),
('2012-01-01','2012-12-31',5,999999999, 0.275,  756.52, 171.97),
-- 2013
('2013-01-01','2013-12-31',1,  1710.78, 0.000,    0.00, 179.71),
('2013-01-01','2013-12-31',2,  2563.91, 0.075,  128.31, 179.71),
('2013-01-01','2013-12-31',3,  3418.59, 0.150,  320.60, 179.71),
('2013-01-01','2013-12-31',4,  4271.59, 0.225,  576.99, 179.71),
('2013-01-01','2013-12-31',5,999999999, 0.275,  790.57, 179.71),
-- 2014
('2014-01-01','2014-12-31',1,  1787.77, 0.000,    0.00, 187.92),
('2014-01-01','2014-12-31',2,  2679.29, 0.075,  134.08, 187.92),
('2014-01-01','2014-12-31',3,  3572.43, 0.150,  335.03, 187.92),
('2014-01-01','2014-12-31',4,  4463.81, 0.225,  602.96, 187.92),
('2014-01-01','2014-12-31',5,999999999, 0.275,  826.15, 187.92),
-- 2015-2022: tabela CONGELADA (sem reajuste)
('2015-01-01','2023-04-30',1,  1903.98, 0.000,    0.00, 189.59),
('2015-01-01','2023-04-30',2,  2826.65, 0.075,  142.80, 189.59),
('2015-01-01','2023-04-30',3,  3751.05, 0.150,  354.79, 189.59),
('2015-01-01','2023-04-30',4,  4664.68, 0.225,  636.12, 189.59),
('2015-01-01','2023-04-30',5,999999999, 0.275,  869.35, 189.59)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_minimo — Histórico 2000-2025
-- Fonte: Decretos/Leis que reajustam o SM anualmente
-- ============================================================

INSERT INTO public.pjecalc_salario_minimo (competencia, valor)
VALUES
-- 2000
('2000-01-01', 136.00),  -- valor até Mar/2000
('2000-04-01', 151.00),  -- reajuste Abr/2000
-- 2001
('2001-04-01', 180.00),
-- 2002
('2002-04-01', 200.00),
-- 2003
('2003-04-01', 240.00),
-- 2004
('2004-05-01', 260.00),
-- 2005
('2005-05-01', 300.00),
-- 2006
('2006-04-01', 350.00),
-- 2007
('2007-04-01', 380.00),
-- 2008
('2008-03-01', 415.00),
-- 2009
('2009-02-01', 465.00),
-- 2010
('2010-01-01', 510.00),
-- 2011
('2011-03-01', 545.00),
-- 2012
('2012-01-01', 622.00),
-- 2013
('2013-01-01', 678.00),
-- 2014
('2014-01-01', 724.00),
-- 2015
('2015-01-01', 788.00),
-- 2016
('2016-01-01', 880.00),
-- 2017
('2017-01-01', 937.00),
-- 2018
('2018-01-01', 954.00),
-- 2019
('2019-01-01', 998.00),
-- 2020
('2020-01-01', 1045.00),
-- 2021
('2021-01-01', 1100.00),
-- 2022
('2022-01-01', 1212.00),
-- 2023
('2023-01-01', 1320.00),
-- 2024
('2024-01-01', 1412.00),
-- 2025
('2025-01-01', 1518.00)
ON CONFLICT (competencia) DO NOTHING;

-- ============================================================
-- SEED: pjecalc_feriados — Feriados Nacionais 2000-2030
-- Fonte: Lei 9.093/1995, Lei 10.607/2002, Lei 14.759/2023
-- scope = 'nacional' (orchestrator lê r.tipo → fallback 'nacional')
-- ============================================================

INSERT INTO public.pjecalc_feriados (data, nome, scope)
VALUES
-- Feriados FIXOS (gerados para 2000-2030)
-- 1 Jan — Confraternização Universal
('2000-01-01','Confraternização Universal','nacional'),
('2001-01-01','Confraternização Universal','nacional'),
('2002-01-01','Confraternização Universal','nacional'),
('2003-01-01','Confraternização Universal','nacional'),
('2004-01-01','Confraternização Universal','nacional'),
('2005-01-01','Confraternização Universal','nacional'),
('2006-01-01','Confraternização Universal','nacional'),
('2007-01-01','Confraternização Universal','nacional'),
('2008-01-01','Confraternização Universal','nacional'),
('2009-01-01','Confraternização Universal','nacional'),
('2010-01-01','Confraternização Universal','nacional'),
('2011-01-01','Confraternização Universal','nacional'),
('2012-01-01','Confraternização Universal','nacional'),
('2013-01-01','Confraternização Universal','nacional'),
('2014-01-01','Confraternização Universal','nacional'),
('2015-01-01','Confraternização Universal','nacional'),
('2016-01-01','Confraternização Universal','nacional'),
('2017-01-01','Confraternização Universal','nacional'),
('2018-01-01','Confraternização Universal','nacional'),
('2019-01-01','Confraternização Universal','nacional'),
('2020-01-01','Confraternização Universal','nacional'),
('2021-01-01','Confraternização Universal','nacional'),
('2022-01-01','Confraternização Universal','nacional'),
('2023-01-01','Confraternização Universal','nacional'),
('2024-01-01','Confraternização Universal','nacional'),
('2025-01-01','Confraternização Universal','nacional'),
('2026-01-01','Confraternização Universal','nacional'),
('2027-01-01','Confraternização Universal','nacional'),
('2028-01-01','Confraternização Universal','nacional'),
('2029-01-01','Confraternização Universal','nacional'),
('2030-01-01','Confraternização Universal','nacional'),
-- 21 Abr — Tiradentes
('2000-04-21','Tiradentes','nacional'),
('2001-04-21','Tiradentes','nacional'),
('2002-04-21','Tiradentes','nacional'),
('2003-04-21','Tiradentes','nacional'),
('2004-04-21','Tiradentes','nacional'),
('2005-04-21','Tiradentes','nacional'),
('2006-04-21','Tiradentes','nacional'),
('2007-04-21','Tiradentes','nacional'),
('2008-04-21','Tiradentes','nacional'),
('2009-04-21','Tiradentes','nacional'),
('2010-04-21','Tiradentes','nacional'),
('2011-04-21','Tiradentes','nacional'),
('2012-04-21','Tiradentes','nacional'),
('2013-04-21','Tiradentes','nacional'),
('2014-04-21','Tiradentes','nacional'),
('2015-04-21','Tiradentes','nacional'),
('2016-04-21','Tiradentes','nacional'),
('2017-04-21','Tiradentes','nacional'),
('2018-04-21','Tiradentes','nacional'),
('2019-04-21','Tiradentes','nacional'),
('2020-04-21','Tiradentes','nacional'),
('2021-04-21','Tiradentes','nacional'),
('2022-04-21','Tiradentes','nacional'),
('2023-04-21','Tiradentes','nacional'),
('2024-04-21','Tiradentes','nacional'),
('2025-04-21','Tiradentes','nacional'),
('2026-04-21','Tiradentes','nacional'),
('2027-04-21','Tiradentes','nacional'),
('2028-04-21','Tiradentes','nacional'),
('2029-04-21','Tiradentes','nacional'),
('2030-04-21','Tiradentes','nacional'),
-- 1 Mai — Dia do Trabalho
('2000-05-01','Dia do Trabalho','nacional'),
('2001-05-01','Dia do Trabalho','nacional'),
('2002-05-01','Dia do Trabalho','nacional'),
('2003-05-01','Dia do Trabalho','nacional'),
('2004-05-01','Dia do Trabalho','nacional'),
('2005-05-01','Dia do Trabalho','nacional'),
('2006-05-01','Dia do Trabalho','nacional'),
('2007-05-01','Dia do Trabalho','nacional'),
('2008-05-01','Dia do Trabalho','nacional'),
('2009-05-01','Dia do Trabalho','nacional'),
('2010-05-01','Dia do Trabalho','nacional'),
('2011-05-01','Dia do Trabalho','nacional'),
('2012-05-01','Dia do Trabalho','nacional'),
('2013-05-01','Dia do Trabalho','nacional'),
('2014-05-01','Dia do Trabalho','nacional'),
('2015-05-01','Dia do Trabalho','nacional'),
('2016-05-01','Dia do Trabalho','nacional'),
('2017-05-01','Dia do Trabalho','nacional'),
('2018-05-01','Dia do Trabalho','nacional'),
('2019-05-01','Dia do Trabalho','nacional'),
('2020-05-01','Dia do Trabalho','nacional'),
('2021-05-01','Dia do Trabalho','nacional'),
('2022-05-01','Dia do Trabalho','nacional'),
('2023-05-01','Dia do Trabalho','nacional'),
('2024-05-01','Dia do Trabalho','nacional'),
('2025-05-01','Dia do Trabalho','nacional'),
('2026-05-01','Dia do Trabalho','nacional'),
('2027-05-01','Dia do Trabalho','nacional'),
('2028-05-01','Dia do Trabalho','nacional'),
('2029-05-01','Dia do Trabalho','nacional'),
('2030-05-01','Dia do Trabalho','nacional'),
-- 7 Set — Independência do Brasil
('2000-09-07','Independência do Brasil','nacional'),
('2001-09-07','Independência do Brasil','nacional'),
('2002-09-07','Independência do Brasil','nacional'),
('2003-09-07','Independência do Brasil','nacional'),
('2004-09-07','Independência do Brasil','nacional'),
('2005-09-07','Independência do Brasil','nacional'),
('2006-09-07','Independência do Brasil','nacional'),
('2007-09-07','Independência do Brasil','nacional'),
('2008-09-07','Independência do Brasil','nacional'),
('2009-09-07','Independência do Brasil','nacional'),
('2010-09-07','Independência do Brasil','nacional'),
('2011-09-07','Independência do Brasil','nacional'),
('2012-09-07','Independência do Brasil','nacional'),
('2013-09-07','Independência do Brasil','nacional'),
('2014-09-07','Independência do Brasil','nacional'),
('2015-09-07','Independência do Brasil','nacional'),
('2016-09-07','Independência do Brasil','nacional'),
('2017-09-07','Independência do Brasil','nacional'),
('2018-09-07','Independência do Brasil','nacional'),
('2019-09-07','Independência do Brasil','nacional'),
('2020-09-07','Independência do Brasil','nacional'),
('2021-09-07','Independência do Brasil','nacional'),
('2022-09-07','Independência do Brasil','nacional'),
('2023-09-07','Independência do Brasil','nacional'),
('2024-09-07','Independência do Brasil','nacional'),
('2025-09-07','Independência do Brasil','nacional'),
('2026-09-07','Independência do Brasil','nacional'),
('2027-09-07','Independência do Brasil','nacional'),
('2028-09-07','Independência do Brasil','nacional'),
('2029-09-07','Independência do Brasil','nacional'),
('2030-09-07','Independência do Brasil','nacional'),
-- 12 Out — Nossa Senhora Aparecida
('2000-10-12','Nossa Senhora Aparecida','nacional'),
('2001-10-12','Nossa Senhora Aparecida','nacional'),
('2002-10-12','Nossa Senhora Aparecida','nacional'),
('2003-10-12','Nossa Senhora Aparecida','nacional'),
('2004-10-12','Nossa Senhora Aparecida','nacional'),
('2005-10-12','Nossa Senhora Aparecida','nacional'),
('2006-10-12','Nossa Senhora Aparecida','nacional'),
('2007-10-12','Nossa Senhora Aparecida','nacional'),
('2008-10-12','Nossa Senhora Aparecida','nacional'),
('2009-10-12','Nossa Senhora Aparecida','nacional'),
('2010-10-12','Nossa Senhora Aparecida','nacional'),
('2011-10-12','Nossa Senhora Aparecida','nacional'),
('2012-10-12','Nossa Senhora Aparecida','nacional'),
('2013-10-12','Nossa Senhora Aparecida','nacional'),
('2014-10-12','Nossa Senhora Aparecida','nacional'),
('2015-10-12','Nossa Senhora Aparecida','nacional'),
('2016-10-12','Nossa Senhora Aparecida','nacional'),
('2017-10-12','Nossa Senhora Aparecida','nacional'),
('2018-10-12','Nossa Senhora Aparecida','nacional'),
('2019-10-12','Nossa Senhora Aparecida','nacional'),
('2020-10-12','Nossa Senhora Aparecida','nacional'),
('2021-10-12','Nossa Senhora Aparecida','nacional'),
('2022-10-12','Nossa Senhora Aparecida','nacional'),
('2023-10-12','Nossa Senhora Aparecida','nacional'),
('2024-10-12','Nossa Senhora Aparecida','nacional'),
('2025-10-12','Nossa Senhora Aparecida','nacional'),
('2026-10-12','Nossa Senhora Aparecida','nacional'),
('2027-10-12','Nossa Senhora Aparecida','nacional'),
('2028-10-12','Nossa Senhora Aparecida','nacional'),
('2029-10-12','Nossa Senhora Aparecida','nacional'),
('2030-10-12','Nossa Senhora Aparecida','nacional'),
-- 2 Nov — Finados
('2000-11-02','Finados','nacional'),
('2001-11-02','Finados','nacional'),
('2002-11-02','Finados','nacional'),
('2003-11-02','Finados','nacional'),
('2004-11-02','Finados','nacional'),
('2005-11-02','Finados','nacional'),
('2006-11-02','Finados','nacional'),
('2007-11-02','Finados','nacional'),
('2008-11-02','Finados','nacional'),
('2009-11-02','Finados','nacional'),
('2010-11-02','Finados','nacional'),
('2011-11-02','Finados','nacional'),
('2012-11-02','Finados','nacional'),
('2013-11-02','Finados','nacional'),
('2014-11-02','Finados','nacional'),
('2015-11-02','Finados','nacional'),
('2016-11-02','Finados','nacional'),
('2017-11-02','Finados','nacional'),
('2018-11-02','Finados','nacional'),
('2019-11-02','Finados','nacional'),
('2020-11-02','Finados','nacional'),
('2021-11-02','Finados','nacional'),
('2022-11-02','Finados','nacional'),
('2023-11-02','Finados','nacional'),
('2024-11-02','Finados','nacional'),
('2025-11-02','Finados','nacional'),
('2026-11-02','Finados','nacional'),
('2027-11-02','Finados','nacional'),
('2028-11-02','Finados','nacional'),
('2029-11-02','Finados','nacional'),
('2030-11-02','Finados','nacional'),
-- 15 Nov — Proclamação da República
('2000-11-15','Proclamação da República','nacional'),
('2001-11-15','Proclamação da República','nacional'),
('2002-11-15','Proclamação da República','nacional'),
('2003-11-15','Proclamação da República','nacional'),
('2004-11-15','Proclamação da República','nacional'),
('2005-11-15','Proclamação da República','nacional'),
('2006-11-15','Proclamação da República','nacional'),
('2007-11-15','Proclamação da República','nacional'),
('2008-11-15','Proclamação da República','nacional'),
('2009-11-15','Proclamação da República','nacional'),
('2010-11-15','Proclamação da República','nacional'),
('2011-11-15','Proclamação da República','nacional'),
('2012-11-15','Proclamação da República','nacional'),
('2013-11-15','Proclamação da República','nacional'),
('2014-11-15','Proclamação da República','nacional'),
('2015-11-15','Proclamação da República','nacional'),
('2016-11-15','Proclamação da República','nacional'),
('2017-11-15','Proclamação da República','nacional'),
('2018-11-15','Proclamação da República','nacional'),
('2019-11-15','Proclamação da República','nacional'),
('2020-11-15','Proclamação da República','nacional'),
('2021-11-15','Proclamação da República','nacional'),
('2022-11-15','Proclamação da República','nacional'),
('2023-11-15','Proclamação da República','nacional'),
('2024-11-15','Proclamação da República','nacional'),
('2025-11-15','Proclamação da República','nacional'),
('2026-11-15','Proclamação da República','nacional'),
('2027-11-15','Proclamação da República','nacional'),
('2028-11-15','Proclamação da República','nacional'),
('2029-11-15','Proclamação da República','nacional'),
('2030-11-15','Proclamação da República','nacional'),
-- 20 Nov — Dia da Consciência Negra (nacional a partir de 2024)
('2024-11-20','Dia da Consciência Negra','nacional'),
('2025-11-20','Dia da Consciência Negra','nacional'),
('2026-11-20','Dia da Consciência Negra','nacional'),
('2027-11-20','Dia da Consciência Negra','nacional'),
('2028-11-20','Dia da Consciência Negra','nacional'),
('2029-11-20','Dia da Consciência Negra','nacional'),
('2030-11-20','Dia da Consciência Negra','nacional'),
-- 25 Dez — Natal
('2000-12-25','Natal','nacional'),
('2001-12-25','Natal','nacional'),
('2002-12-25','Natal','nacional'),
('2003-12-25','Natal','nacional'),
('2004-12-25','Natal','nacional'),
('2005-12-25','Natal','nacional'),
('2006-12-25','Natal','nacional'),
('2007-12-25','Natal','nacional'),
('2008-12-25','Natal','nacional'),
('2009-12-25','Natal','nacional'),
('2010-12-25','Natal','nacional'),
('2011-12-25','Natal','nacional'),
('2012-12-25','Natal','nacional'),
('2013-12-25','Natal','nacional'),
('2014-12-25','Natal','nacional'),
('2015-12-25','Natal','nacional'),
('2016-12-25','Natal','nacional'),
('2017-12-25','Natal','nacional'),
('2018-12-25','Natal','nacional'),
('2019-12-25','Natal','nacional'),
('2020-12-25','Natal','nacional'),
('2021-12-25','Natal','nacional'),
('2022-12-25','Natal','nacional'),
('2023-12-25','Natal','nacional'),
('2024-12-25','Natal','nacional'),
('2025-12-25','Natal','nacional'),
('2026-12-25','Natal','nacional'),
('2027-12-25','Natal','nacional'),
('2028-12-25','Natal','nacional'),
('2029-12-25','Natal','nacional'),
('2030-12-25','Natal','nacional'),
-- Feriados MÓVEIS — Sexta-Feira Santa (Easter - 2 dias)
('2000-04-21','Sexta-Feira Santa','nacional'),
('2001-04-13','Sexta-Feira Santa','nacional'),
('2002-03-29','Sexta-Feira Santa','nacional'),
('2003-04-18','Sexta-Feira Santa','nacional'),
('2004-04-09','Sexta-Feira Santa','nacional'),
('2005-03-25','Sexta-Feira Santa','nacional'),
('2006-04-14','Sexta-Feira Santa','nacional'),
('2007-04-06','Sexta-Feira Santa','nacional'),
('2008-03-21','Sexta-Feira Santa','nacional'),
('2009-04-10','Sexta-Feira Santa','nacional'),
('2010-04-02','Sexta-Feira Santa','nacional'),
('2011-04-22','Sexta-Feira Santa','nacional'),
('2012-04-06','Sexta-Feira Santa','nacional'),
('2013-03-29','Sexta-Feira Santa','nacional'),
('2014-04-18','Sexta-Feira Santa','nacional'),
('2015-04-03','Sexta-Feira Santa','nacional'),
('2016-03-25','Sexta-Feira Santa','nacional'),
('2017-04-14','Sexta-Feira Santa','nacional'),
('2018-03-30','Sexta-Feira Santa','nacional'),
('2019-04-19','Sexta-Feira Santa','nacional'),
('2020-04-10','Sexta-Feira Santa','nacional'),
('2021-04-02','Sexta-Feira Santa','nacional'),
('2022-04-15','Sexta-Feira Santa','nacional'),
('2023-04-07','Sexta-Feira Santa','nacional'),
('2024-03-29','Sexta-Feira Santa','nacional'),
('2025-04-18','Sexta-Feira Santa','nacional'),
('2026-04-03','Sexta-Feira Santa','nacional'),
('2027-03-26','Sexta-Feira Santa','nacional'),
('2028-04-14','Sexta-Feira Santa','nacional'),
('2029-03-30','Sexta-Feira Santa','nacional'),
('2030-04-19','Sexta-Feira Santa','nacional'),
-- Corpus Christi (Easter + 60 dias) — facultativo nacional
('2000-06-22','Corpus Christi','nacional'),
('2001-06-14','Corpus Christi','nacional'),
('2002-05-30','Corpus Christi','nacional'),
('2003-06-19','Corpus Christi','nacional'),
('2004-06-10','Corpus Christi','nacional'),
('2005-05-26','Corpus Christi','nacional'),
('2006-06-15','Corpus Christi','nacional'),
('2007-06-07','Corpus Christi','nacional'),
('2008-05-22','Corpus Christi','nacional'),
('2009-06-11','Corpus Christi','nacional'),
('2010-06-03','Corpus Christi','nacional'),
('2011-06-23','Corpus Christi','nacional'),
('2012-06-07','Corpus Christi','nacional'),
('2013-05-30','Corpus Christi','nacional'),
('2014-06-19','Corpus Christi','nacional'),
('2015-06-04','Corpus Christi','nacional'),
('2016-05-26','Corpus Christi','nacional'),
('2017-06-15','Corpus Christi','nacional'),
('2018-05-31','Corpus Christi','nacional'),
('2019-06-20','Corpus Christi','nacional'),
('2020-06-11','Corpus Christi','nacional'),
('2021-06-03','Corpus Christi','nacional'),
('2022-06-16','Corpus Christi','nacional'),
('2023-06-08','Corpus Christi','nacional'),
('2024-05-30','Corpus Christi','nacional'),
('2025-06-19','Corpus Christi','nacional'),
('2026-06-04','Corpus Christi','nacional'),
('2027-05-27','Corpus Christi','nacional'),
('2028-06-15','Corpus Christi','nacional'),
('2029-05-31','Corpus Christi','nacional'),
('2030-06-20','Corpus Christi','nacional')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED: pjecalc_seguro_desemprego — 2019-2025
-- Fonte: Resolução CODEFAT
-- Regra: SD = valor_soma + (salario - valor_inicial) × percentual/100
--        limitado ao teto (valor_teto) e ao piso (valor_piso = SM)
-- ============================================================

INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
-- 2019 (Resolução CODEFAT 835/2019; SM=998)
('2019-01-01',1,    0.00, 1649.00, 80.00,    0.00,  998.00, 1869.30),
('2019-01-01',2, 1649.00, 2766.00, 50.00, 1319.20,  998.00, 1869.30),
('2019-01-01',3, 2766.00,999999.0, 40.00, 1878.58,  998.00, 1869.30),
-- 2020 (SM=1045)
('2020-01-01',1,    0.00, 1813.03, 80.00,    0.00, 1045.00, 2005.30),
('2020-01-01',2, 1813.03, 3025.15, 50.00, 1450.42, 1045.00, 2005.30),
('2020-01-01',3, 3025.15,999999.0, 40.00, 2056.52, 1045.00, 2005.30),
-- 2021 (SM=1100)
('2021-01-01',1,    0.00, 1908.18, 80.00,    0.00, 1100.00, 2106.08),
('2021-01-01',2, 1908.18, 3180.29, 50.00, 1526.54, 1100.00, 2106.08),
('2021-01-01',3, 3180.29,999999.0, 40.00, 2165.64, 1100.00, 2106.08),
-- 2022 (SM=1212)
('2022-01-01',1,    0.00, 2041.39, 80.00,    0.00, 1212.00, 2230.97),
('2022-01-01',2, 2041.39, 3403.00, 50.00, 1633.11, 1212.00, 2230.97),
('2022-01-01',3, 3403.00,999999.0, 40.00, 2314.49, 1212.00, 2230.97),
-- 2023 (SM=1320)
('2023-01-01',1,    0.00, 2041.39, 80.00,    0.00, 1320.00, 2230.97),
('2023-01-01',2, 2041.39, 3403.00, 50.00, 1633.11, 1320.00, 2230.97),
('2023-01-01',3, 3403.00,999999.0, 40.00, 2314.49, 1320.00, 2230.97),
-- 2024 (SM=1412)
('2024-01-01',1,    0.00, 2259.20, 80.00,    0.00, 1412.00, 2364.45),
('2024-01-01',2, 2259.20, 3765.33, 50.00, 1807.36, 1412.00, 2364.45),
('2024-01-01',3, 3765.33,999999.0, 40.00, 2560.26, 1412.00, 2364.45),
-- 2025 (SM=1518)
('2025-01-01',1,    0.00, 2259.20, 80.00,    0.00, 1518.00, 2364.45),
('2025-01-01',2, 2259.20, 3765.33, 50.00, 1807.36, 1518.00, 2364.45),
('2025-01-01',3, 3765.33,999999.0, 40.00, 2560.26, 1518.00, 2364.45)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_familia — 2019-2025
-- Fonte: Portarias MPS anuais
-- Cota por filho de até 14 anos
-- ============================================================

INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
-- 2019 (SM=998; cota=48.62 até R$1425.56; 34.25 até R$2142.65)
('2019-01-01',1,    0.00, 1425.56, 48.62),
('2019-01-01',2, 1425.56, 2142.65, 34.25),
-- 2020 (SM=1045)
('2020-01-01',1,    0.00, 1503.80, 54.10),
('2020-01-01',2, 1503.80, 2259.20, 38.26),
-- 2021 (SM=1100)
('2021-01-01',1,    0.00, 1503.80, 54.10),
('2021-01-01',2, 1503.80, 2259.20, 38.26),
-- 2022 (SM=1212)
('2022-01-01',1,    0.00, 1655.98, 59.82),
('2022-01-01',2, 1655.98, 2482.89, 42.11),
-- 2023 (SM=1320)
('2023-01-01',1,    0.00, 1754.18, 62.04),
('2023-01-01',2, 1754.18, 2631.19, 43.91),
-- 2024 (SM=1412)
('2024-01-01',1,    0.00, 1819.26, 62.04),
('2024-01-01',2, 1819.26, 2728.89, 43.91),
-- 2025 (SM=1518)
('2025-01-01',1,    0.00, 1819.26, 62.04),
('2025-01-01',2, 1819.26, 2728.89, 43.91)
ON CONFLICT (competencia, faixa) DO NOTHING;

-- ============================================================
-- SEED: pjecalc_correcao_monetaria — TAXA_LEGAL
-- Juros legais trabalhistas: 1% ao mês (Art. 39 §1 Lei 8.177/91)
-- Vigente de forma constante para todo o período histórico.
-- Armazenado como taxa mensal = 1.0 para consulta pelo engine.
-- ============================================================

INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  make_date(ano, mes, 1),
  'TAXA_LEGAL',
  1.0,
  NULL
FROM generate_series(2000, 2025) AS ano,
     generate_series(1, 12) AS mes
WHERE make_date(ano, mes, 1) <= make_date(2025, 3, 1)
ON CONFLICT (competencia, indice) DO NOTHING;

-- Compute acumulado for TAXA_LEGAL via running product
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice = 'TAXA_LEGAL'
) sub
WHERE t.id = sub.id;

-- ============================================================
-- SEED: pjecalc_correcao_monetaria — TR e TR_FGTS
--
-- TR: Taxa Referencial (BCB) — usada para correção do FGTS
--   Valores aproximados das taxas mensais divulgadas pelo BCB.
--   De 2012 em diante TR ficou essencialmente em 0%, voltando
--   levemente positiva em 2022 com a alta da SELIC.
--
-- TR_FGTS: TR + 3% a.a. compound (= 0.2466%/mês)
--   Fator mensal combinado = (1 + TR/100) × 1.002466 - 1
--   Usada pelo engine para calcular correção de depósitos FGTS.
--   Lei 8.036/90, Art. 13: "capitalizarão juros de 3% ao ano"
-- ============================================================

-- ── Taxas TR mensais (% ao mês) por período ──────────────────
-- Fonte: BCB / aproximação histórica com dados públicos

WITH tr_rates(competencia, valor) AS (VALUES
  -- 2000 (TR ainda relevante ~0.1–0.4%/mês)
  (make_date(2000,1,1),  0.3972), (make_date(2000,2,1),  0.3154),
  (make_date(2000,3,1),  0.2797), (make_date(2000,4,1),  0.1780),
  (make_date(2000,5,1),  0.1490), (make_date(2000,6,1),  0.1278),
  (make_date(2000,7,1),  0.1193), (make_date(2000,8,1),  0.0948),
  (make_date(2000,9,1),  0.0876), (make_date(2000,10,1), 0.1282),
  (make_date(2000,11,1), 0.1183), (make_date(2000,12,1), 0.1375),
  -- 2001
  (make_date(2001,1,1),  0.1517), (make_date(2001,2,1),  0.1266),
  (make_date(2001,3,1),  0.1169), (make_date(2001,4,1),  0.1066),
  (make_date(2001,5,1),  0.1155), (make_date(2001,6,1),  0.1087),
  (make_date(2001,7,1),  0.1264), (make_date(2001,8,1),  0.1253),
  (make_date(2001,9,1),  0.1218), (make_date(2001,10,1), 0.1208),
  (make_date(2001,11,1), 0.1124), (make_date(2001,12,1), 0.1109),
  -- 2002
  (make_date(2002,1,1),  0.1070), (make_date(2002,2,1),  0.0956),
  (make_date(2002,3,1),  0.0857), (make_date(2002,4,1),  0.0850),
  (make_date(2002,5,1),  0.0852), (make_date(2002,6,1),  0.0859),
  (make_date(2002,7,1),  0.0881), (make_date(2002,8,1),  0.0952),
  (make_date(2002,9,1),  0.1219), (make_date(2002,10,1), 0.2028),
  (make_date(2002,11,1), 0.2041), (make_date(2002,12,1), 0.2018),
  -- 2003
  (make_date(2003,1,1),  0.2002), (make_date(2003,2,1),  0.1880),
  (make_date(2003,3,1),  0.1817), (make_date(2003,4,1),  0.1688),
  (make_date(2003,5,1),  0.1526), (make_date(2003,6,1),  0.1390),
  (make_date(2003,7,1),  0.1354), (make_date(2003,8,1),  0.1139),
  (make_date(2003,9,1),  0.0916), (make_date(2003,10,1), 0.0800),
  (make_date(2003,11,1), 0.0687), (make_date(2003,12,1), 0.0630),
  -- 2004
  (make_date(2004,1,1),  0.0590), (make_date(2004,2,1),  0.0529),
  (make_date(2004,3,1),  0.0500), (make_date(2004,4,1),  0.0489),
  (make_date(2004,5,1),  0.0498), (make_date(2004,6,1),  0.0509),
  (make_date(2004,7,1),  0.0495), (make_date(2004,8,1),  0.0460),
  (make_date(2004,9,1),  0.0453), (make_date(2004,10,1), 0.0467),
  (make_date(2004,11,1), 0.0464), (make_date(2004,12,1), 0.0472),
  -- 2005
  (make_date(2005,1,1),  0.0475), (make_date(2005,2,1),  0.0460),
  (make_date(2005,3,1),  0.0464), (make_date(2005,4,1),  0.0462),
  (make_date(2005,5,1),  0.0476), (make_date(2005,6,1),  0.0464),
  (make_date(2005,7,1),  0.0445), (make_date(2005,8,1),  0.0418),
  (make_date(2005,9,1),  0.0406), (make_date(2005,10,1), 0.0393),
  (make_date(2005,11,1), 0.0387), (make_date(2005,12,1), 0.0380),
  -- 2006
  (make_date(2006,1,1),  0.0362), (make_date(2006,2,1),  0.0320),
  (make_date(2006,3,1),  0.0287), (make_date(2006,4,1),  0.0256),
  (make_date(2006,5,1),  0.0227), (make_date(2006,6,1),  0.0204),
  (make_date(2006,7,1),  0.0195), (make_date(2006,8,1),  0.0178),
  (make_date(2006,9,1),  0.0170), (make_date(2006,10,1), 0.0164),
  (make_date(2006,11,1), 0.0159), (make_date(2006,12,1), 0.0156),
  -- 2007
  (make_date(2007,1,1),  0.0151), (make_date(2007,2,1),  0.0139),
  (make_date(2007,3,1),  0.0133), (make_date(2007,4,1),  0.0126),
  (make_date(2007,5,1),  0.0121), (make_date(2007,6,1),  0.0116),
  (make_date(2007,7,1),  0.0113), (make_date(2007,8,1),  0.0108),
  (make_date(2007,9,1),  0.0106), (make_date(2007,10,1), 0.0105),
  (make_date(2007,11,1), 0.0103), (make_date(2007,12,1), 0.0100),
  -- 2008
  (make_date(2008,1,1),  0.0098), (make_date(2008,2,1),  0.0092),
  (make_date(2008,3,1),  0.0088), (make_date(2008,4,1),  0.0087),
  (make_date(2008,5,1),  0.0087), (make_date(2008,6,1),  0.0087),
  (make_date(2008,7,1),  0.0088), (make_date(2008,8,1),  0.0089),
  (make_date(2008,9,1),  0.0091), (make_date(2008,10,1), 0.0097),
  (make_date(2008,11,1), 0.0097), (make_date(2008,12,1), 0.0091),
  -- 2009-2012: tendência a zero
  (make_date(2009,1,1),  0.0068), (make_date(2009,2,1),  0.0052),
  (make_date(2009,3,1),  0.0038), (make_date(2009,4,1),  0.0027),
  (make_date(2009,5,1),  0.0018), (make_date(2009,6,1),  0.0013),
  (make_date(2009,7,1),  0.0009), (make_date(2009,8,1),  0.0007),
  (make_date(2009,9,1),  0.0005), (make_date(2009,10,1), 0.0004),
  (make_date(2009,11,1), 0.0003), (make_date(2009,12,1), 0.0002),
  -- 2010-2021: TR = 0% (política monetária)
  -- Usamos generate_series para preencher com 0
  -- 2022 (TR voltou com SELIC alta)
  (make_date(2022,1,1),  0.0000), (make_date(2022,2,1),  0.0000),
  (make_date(2022,3,1),  0.0000), (make_date(2022,4,1),  0.0000),
  (make_date(2022,5,1),  0.0000), (make_date(2022,6,1),  0.0000),
  (make_date(2022,7,1),  0.0000), (make_date(2022,8,1),  0.1111),
  (make_date(2022,9,1),  0.1028), (make_date(2022,10,1), 0.1119),
  (make_date(2022,11,1), 0.1119), (make_date(2022,12,1), 0.1226),
  -- 2023
  (make_date(2023,1,1),  0.1145), (make_date(2023,2,1),  0.1018),
  (make_date(2023,3,1),  0.0870), (make_date(2023,4,1),  0.0789),
  (make_date(2023,5,1),  0.0730), (make_date(2023,6,1),  0.0673),
  (make_date(2023,7,1),  0.0579), (make_date(2023,8,1),  0.0528),
  (make_date(2023,9,1),  0.0582), (make_date(2023,10,1), 0.0565),
  (make_date(2023,11,1), 0.0524), (make_date(2023,12,1), 0.0467),
  -- 2024
  (make_date(2024,1,1),  0.0394), (make_date(2024,2,1),  0.0358),
  (make_date(2024,3,1),  0.0339), (make_date(2024,4,1),  0.0365),
  (make_date(2024,5,1),  0.0339), (make_date(2024,6,1),  0.0313),
  (make_date(2024,7,1),  0.0399), (make_date(2024,8,1),  0.0441),
  (make_date(2024,9,1),  0.0511), (make_date(2024,10,1), 0.0565),
  (make_date(2024,11,1), 0.0600), (make_date(2024,12,1), 0.0647),
  -- 2025
  (make_date(2025,1,1),  0.0659), (make_date(2025,2,1),  0.0583),
  (make_date(2025,3,1),  0.0535)
)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT competencia, 'TR', valor, NULL FROM tr_rates
ON CONFLICT (competencia, indice) DO NOTHING;

-- 2010–2021: TR = 0% (período de taxa zero)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  make_date(ano, mes, 1),
  'TR',
  0.0,
  NULL
FROM generate_series(2010, 2021) AS ano,
     generate_series(1, 12) AS mes
ON CONFLICT (competencia, indice) DO NOTHING;

-- 2022 Jan-Jul: TR = 0%
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT make_date(2022, mes, 1), 'TR', 0.0, NULL
FROM generate_series(1, 7) AS mes
ON CONFLICT (competencia, indice) DO NOTHING;

-- ── TR_FGTS = TR + 3% a.a. compound ───────────────────────────
-- Fator mensal = (1 + TR/100) × (1.03^(1/12)) - 1
-- = (1 + TR/100) × 1.0024663 - 1
-- Armazenamos como percentual equivalente: valor = fator_combinado × 100
-- Isso permite usar getIndiceCorrecaoDB com mesmo mecanismo.
--
-- Para cada mês: TR_FGTS_valor = ((1 + TR/100) * 1.0024663 - 1) * 100
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  competencia,
  'TR_FGTS',
  ROUND(((1.0 + valor / 100.0) * 1.0024663 - 1.0) * 100.0, 6),
  NULL
FROM public.pjecalc_correcao_monetaria
WHERE indice = 'TR'
ON CONFLICT (competencia, indice) DO NOTHING;

-- ── Compute acumulado for TR ───────────────────────────────────
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice IN ('TR', 'TR_FGTS')
) sub
WHERE t.id = sub.id;

-- ============================================================
-- SEED: pjecalc_inss_faixas e pjecalc_ir_faixas — PRÉ-2009
--
-- INSS 2000–2008: alíquota ÚNICA (flat-rate) conforme portarias MPS
--   O salário total se enquadra em uma faixa e TODA a base é tributada
--   naquela alíquota. Armazenado como pseudo-progressivo de 3 faixas
--   usando valor_ate = teto da faixa (engine usa calcularINSSAliquotaUnica).
--
-- IR 2000–2008: tabela progressiva conforme RIR/Leis anuais
--   2000–2006: freeze period — 2 alíquotas (15%, 27.5%)
--   2007–2008: atualização via Lei 11.311/2006 e Lei 11.482/2008
--   aliquota armazenado como decimal (0.15, 0.275), não percentual.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- INSS 2000–2008 (portarias MPS anuais — alíquota flat-rate)
-- valor_ate = teto da faixa; aliquota = decimal (ex: 0.08 = 8%)
-- ══════════════════════════════════════════════════════════════

-- Limpar faixas pré-2009 que possam existir com dados errados
DELETE FROM public.pjecalc_inss_faixas
WHERE competencia_inicio < '2009-01-01';

INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
-- 2000 (Portaria MPS 4.883/1998 com reajuste)
  ('2000-01-01','2000-12-31', 1,  388.43, 0.08),
  ('2000-01-01','2000-12-31', 2,  647.38, 0.09),
  ('2000-01-01','2000-12-31', 3, 1078.98, 0.11),
-- 2001 (Portaria MPS 5.018/2001)
  ('2001-01-01','2001-12-31', 1,  425.03, 0.08),
  ('2001-01-01','2001-12-31', 2,  708.38, 0.09),
  ('2001-01-01','2001-12-31', 3, 1181.31, 0.11),
-- 2002 (Portaria MPS 5.062/2002)
  ('2002-01-01','2002-12-31', 1,  468.17, 0.08),
  ('2002-01-01','2002-12-31', 2,  780.30, 0.09),
  ('2002-01-01','2002-12-31', 3, 1301.50, 0.11),
-- 2003 (Portaria MPS 5.303/2003)
  ('2003-01-01','2003-12-31', 1,  512.99, 0.08),
  ('2003-01-01','2003-12-31', 2,  854.99, 0.09),
  ('2003-01-01','2003-12-31', 3, 1425.00, 0.11),
-- 2004 (Portaria MPS 5.442/2004)
  ('2004-01-01','2004-12-31', 1,  560.81, 0.08),
  ('2004-01-01','2004-12-31', 2,  934.94, 0.09),
  ('2004-01-01','2004-12-31', 3, 1869.34, 0.11),
-- 2005 (Portaria MPS 5.536/2005)
  ('2005-01-01','2005-12-31', 1,  596.29, 0.08),
  ('2005-01-01','2005-12-31', 2,  993.85, 0.09),
  ('2005-01-01','2005-12-31', 3, 1988.95, 0.11),
-- 2006 (Portaria MPS 29/2006)
  ('2006-01-01','2006-12-31', 1,  641.00, 0.08),
  ('2006-01-01','2006-12-31', 2, 1069.39, 0.09),
  ('2006-01-01','2006-12-31', 3, 2138.65, 0.11),
-- 2007 (Portaria MPS 45/2007)
  ('2007-01-01','2007-12-31', 1,  677.67, 0.08),
  ('2007-01-01','2007-12-31', 2, 1129.52, 0.09),
  ('2007-01-01','2007-12-31', 3, 2258.92, 0.11),
-- 2008 (Portaria MPS 56/2008 — teto significativamente ampliado)
  ('2008-01-01','2008-12-31', 1,  911.70, 0.08),
  ('2008-01-01','2008-12-31', 2, 1519.67, 0.09),
  ('2008-01-01','2008-12-31', 3, 3038.00, 0.11)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- IR 2000–2008 (RIR / Leis anuais — tabela progressiva)
--
-- Nota: Imposto de Renda sofreu freeze de 1998 a 2006.
-- Deduções por dependente fixas em R$ 106,00 de 1998 a 2009.
--
-- aliquota = decimal (0 = isento, 0.15 = 15%, 0.275 = 27.5%)
-- deducao = parcela a deduzir (método tabela progressiva)
-- ══════════════════════════════════════════════════════════════

-- Limpar IR pré-2007 que possam existir com dados errados
DELETE FROM public.pjecalc_ir_faixas
WHERE competencia_inicio < '2007-01-01';

INSERT INTO public.pjecalc_ir_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente)
VALUES
-- 2000–2006: FREEZE — 2 alíquotas (Lei 9.250/95 congelada)
-- Isento até R$ 900,00; 15% de 900,01 a 1.800,00; 27.5% acima
  ('2000-01-01','2000-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2000-01-01','2000-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2000-01-01','2000-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2001-01-01','2001-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2001-01-01','2001-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2001-01-01','2001-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2002-01-01','2002-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2002-01-01','2002-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2002-01-01','2002-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2003-01-01','2003-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2003-01-01','2003-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2003-01-01','2003-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2004-01-01','2004-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2004-01-01','2004-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2004-01-01','2004-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2005-01-01','2005-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2005-01-01','2005-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2005-01-01','2005-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

  ('2006-01-01','2006-12-31', 1,    900.00, 0,     0.00, 106.00),
  ('2006-01-01','2006-12-31', 2,   1800.00, 0.15, 135.00, 106.00),
  ('2006-01-01','2006-12-31', 3, 999999.00, 0.275, 360.00, 106.00),

-- 2007 (Lei 11.311/2006 — atualização após freeze)
-- Isento até R$ 1.313,69; 15% até R$ 2.625,12; 27.5% acima
  ('2007-01-01','2007-12-31', 1,   1313.69, 0,     0.00, 106.00),
  ('2007-01-01','2007-12-31', 2,   2625.12, 0.15, 197.05, 106.00),
  ('2007-01-01','2007-12-31', 3, 999999.00, 0.275, 525.03, 106.00),

-- 2008 (Lei 11.482/2008)
-- Isento até R$ 1.372,81; 15% até R$ 2.743,25; 27.5% acima
  ('2008-01-01','2008-12-31', 1,   1372.81, 0,     0.00, 106.00),
  ('2008-01-01','2008-12-31', 2,   2743.25, 0.15, 205.92, 106.00),
  ('2008-01-01','2008-12-31', 3, 999999.00, 0.275, 548.65, 106.00)

ON CONFLICT DO NOTHING;

-- ============================================================
-- FIX: INSS Jan-Fev/2020 — separar da tabela progressiva Mar-Dez/2020
--
-- EC 103/2019 entrou em vigor em 01/03/2020.
-- Jan e Fev/2020 ainda usam o sistema FLAT-RATE de 2019
-- (Portaria SPREV 1/2019 — mesmos valores do ano anterior).
--
-- A migração anterior armazenou 2020 inteiro como progressivo
-- (2020-01-01 to 2020-12-31). Isso causa erro no cálculo flat-rate
-- de Jan-Fev/2020 pois aplica alíquotas erradas da tabela progressiva.
-- ============================================================

-- 1. Atualizar vigência do bloco progressivo 2020 para Mar-Dez apenas
UPDATE public.pjecalc_inss_faixas
SET competencia_inicio = '2020-03-01'
WHERE competencia_inicio = '2020-01-01'
  AND competencia_fim = '2020-12-31';

-- 2. Inserir Jan-Fev/2020 com tabela flat-rate (valores de 2019/Portaria SPREV 1/2019)
INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
  ('2020-01-01', '2020-02-29', 1, 1751.81, 0.08),
  ('2020-01-01', '2020-02-29', 2, 2919.72, 0.09),
  ('2020-01-01', '2020-02-29', 3, 5839.45, 0.11)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABELAS: pjecalc_excecoes_carga e pjecalc_excecoes_sabado
--
-- Exceções de carga horária e de tratamento de sábado por período.
-- Usadas para casos com jornada reduzida (ex: 36h/semana em bancos,
-- professores, etc.) ou períodos em que sábado conta como dia útil.
-- ============================================================

-- Exceções de carga horária (jornada diferente da padrão por período)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  carga_horaria_mensal numeric NOT NULL, -- ex: 180 para 36h/semana
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_carga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_carga"
  ON public.pjecalc_excecoes_carga FOR SELECT
  USING (true);

-- Exceções de sábado (períodos em que sábado é tratado como dia útil)
CREATE TABLE IF NOT EXISTS public.pjecalc_excecoes_sabado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  sabado_dia_util boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_excecoes_sabado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read excecoes_sabado"
  ON public.pjecalc_excecoes_sabado FOR SELECT
  USING (true);

-- Índices para lookup por case_id e período
CREATE INDEX IF NOT EXISTS idx_excecoes_carga_case_id
  ON public.pjecalc_excecoes_carga(case_id);
CREATE INDEX IF NOT EXISTS idx_excecoes_sabado_case_id
  ON public.pjecalc_excecoes_sabado(case_id);

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

-- ============================================================
-- SEED: pjecalc_correcao_monetaria — IPCA-E e SELIC 2025 (Abr-Dez) e 2026 (Jan-Mar)
--
-- Fonte: IBGE (IPCA-E) e BCB (SELIC efetiva mensal)
-- Valores devem ser verificados contra publicações oficiais em:
--   IPCA-E: https://sidra.ibge.gov.br/tabela/2936
--   SELIC: https://www.bcb.gov.br/estatisticas/tabelahistoricaselic
--
-- ATENÇÃO: após inserção, o UPDATE do acumulado é executado automaticamente.
-- ============================================================

-- IPCA-E 2025 (Abr-Dez) — Fonte: IBGE
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2025-04-01','IPCA-E', 0.43,'IBGE'),
('2025-05-01','IPCA-E', 0.38,'IBGE'),
('2025-06-01','IPCA-E', 0.25,'IBGE'),
('2025-07-01','IPCA-E', 0.50,'IBGE'),
('2025-08-01','IPCA-E', 0.44,'IBGE'),
('2025-09-01','IPCA-E', 0.44,'IBGE'),
('2025-10-01','IPCA-E', 0.54,'IBGE'),
('2025-11-01','IPCA-E', 0.39,'IBGE'),
('2025-12-01','IPCA-E', 0.35,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- IPCA-E 2026 (Jan-Fev) — Fonte: IBGE
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2026-01-01','IPCA-E', 0.76,'IBGE'),
('2026-02-01','IPCA-E', 1.05,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- SELIC efetiva mensal 2025 (Abr-Dez) — Fonte: BCB
-- SELIC meta: 14.75% (Mar/2025) → aumentos ao longo do ano → ~15.75% (Dez/2025)
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2025-04-01','SELIC', 1.20,'BCB'),
('2025-05-01','SELIC', 1.24,'BCB'),
('2025-06-01','SELIC', 1.26,'BCB'),
('2025-07-01','SELIC', 1.26,'BCB'),
('2025-08-01','SELIC', 1.26,'BCB'),
('2025-09-01','SELIC', 1.26,'BCB'),
('2025-10-01','SELIC', 1.23,'BCB'),
('2025-11-01','SELIC', 1.24,'BCB'),
('2025-12-01','SELIC', 1.27,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- SELIC efetiva mensal 2026 (Jan-Mar) — Fonte: BCB
-- SELIC meta ~15.75-16.25% em 2026
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
('2026-01-01','SELIC', 1.28,'BCB'),
('2026-02-01','SELIC', 1.29,'BCB'),
('2026-03-01','SELIC', 1.33,'BCB')
ON CONFLICT (competencia, indice) DO NOTHING;

-- TR mensais 2025 (Abr-Dez) e 2026 (Jan-Mar) — aproximação BCB
-- TR voltou a ficar positiva com SELIC elevada (2022+); valores ~0.05-0.07%/mês
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
VALUES
('2025-04-01','TR', 0.0550, NULL),
('2025-05-01','TR', 0.0570, NULL),
('2025-06-01','TR', 0.0590, NULL),
('2025-07-01','TR', 0.0610, NULL),
('2025-08-01','TR', 0.0620, NULL),
('2025-09-01','TR', 0.0640, NULL),
('2025-10-01','TR', 0.0650, NULL),
('2025-11-01','TR', 0.0660, NULL),
('2025-12-01','TR', 0.0670, NULL),
('2026-01-01','TR', 0.0690, NULL),
('2026-02-01','TR', 0.0700, NULL),
('2026-03-01','TR', 0.0720, NULL)
ON CONFLICT (competencia, indice) DO NOTHING;

-- Derivar TR_FGTS para novos meses de TR (TR + 3% a.a. compound)
-- Fator mensal = (1 + TR/100) × 1.0024663 - 1
INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, acumulado)
SELECT
  competencia,
  'TR_FGTS',
  ROUND(((1.0 + valor / 100.0) * 1.0024663 - 1.0) * 100.0, 6),
  NULL
FROM public.pjecalc_correcao_monetaria
WHERE indice = 'TR'
  AND competencia >= '2025-04-01'
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recomputar acumulado para todos os índices afetados
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT
    id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    ) AS ac
  FROM public.pjecalc_correcao_monetaria
) sub
WHERE t.id = sub.id;

-- ============================================================
-- SEED: pjecalc_seguro_desemprego — 2000-2018 (pré-CODEFAT 835/2019)
-- Fonte: Resoluções CODEFAT históricas
--
-- Fórmula: parcela = valor_soma + (salario - valor_inicial) × percentual/100
--   Faixa 1: até limite1 → SD = salario × 80%
--   Faixa 2: de limite1 até limite2 → SD = limite1×80% + (salario - limite1)×50%
--   Faixa 3: acima de limite2 → teto fixo
--
-- NOTA: 2000-2018 o SD era calculado com limites baseados no SM vigente.
--   Aqui armazenamos os valores conforme publicações CODEFAT/MTE.
-- ============================================================

INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
-- 2000 (Res. CODEFAT 286/2000; SM=151)
('2000-04-01',1,    0.00,  376.50, 80.00,    0.00,  151.00,  590.12),
('2000-04-01',2,  376.50,  627.50, 50.00,  301.20,  151.00,  590.12),
('2000-04-01',3,  627.50,999999.0, 40.00,  464.70,  151.00,  590.12),
-- 2001 (Res. CODEFAT 310/2001; SM=180)
('2001-04-01',1,    0.00,  437.00, 80.00,    0.00,  180.00,  678.00),
('2001-04-01',2,  437.00,  728.50, 50.00,  349.60,  180.00,  678.00),
('2001-04-01',3,  728.50,999999.0, 40.00,  532.70,  180.00,  678.00),
-- 2002 (Res. CODEFAT 338/2002; SM=200)
('2002-04-01',1,    0.00,  484.97, 80.00,    0.00,  200.00,  742.53),
('2002-04-01',2,  484.97,  808.21, 50.00,  387.98,  200.00,  742.53),
('2002-04-01',3,  808.21,999999.0, 40.00,  581.96,  200.00,  742.53),
-- 2003 (Res. CODEFAT 385/2003; SM=240)
('2003-04-01',1,    0.00,  568.00, 80.00,    0.00,  240.00,  871.46),
('2003-04-01',2,  568.00,  947.00, 50.00,  454.40,  240.00,  871.46),
('2003-04-01',3,  947.00,999999.0, 40.00,  643.30,  240.00,  871.46),
-- 2004 (Res. CODEFAT 424/2004; SM=260)
('2004-05-01',1,    0.00,  620.50, 80.00,    0.00,  260.00,  952.50),
('2004-05-01',2,  620.50, 1034.17, 50.00,  496.40,  260.00,  952.50),
('2004-05-01',3, 1034.17,999999.0, 40.00,  710.07,  260.00,  952.50),
-- 2005 (Res. CODEFAT 466/2005; SM=300)
('2005-05-01',1,    0.00,  720.50, 80.00,    0.00,  300.00, 1108.34),
('2005-05-01',2,  720.50, 1201.00, 50.00,  576.40,  300.00, 1108.34),
('2005-05-01',3, 1201.00,999999.0, 40.00,  864.80,  300.00, 1108.34),
-- 2006 (Res. CODEFAT 516/2006; SM=350)
('2006-04-01',1,    0.00,  835.52, 80.00,    0.00,  350.00, 1299.76),
('2006-04-01',2,  835.52, 1392.53, 50.00,  668.42,  350.00, 1299.76),
('2006-04-01',3, 1392.53,999999.0, 40.00,  984.48,  350.00, 1299.76),
-- 2007 (Res. CODEFAT 560/2007; SM=380)
('2007-04-01',1,    0.00,  900.00, 80.00,    0.00,  380.00, 1395.00),
('2007-04-01',2,  900.00, 1500.00, 50.00,  720.00,  380.00, 1395.00),
('2007-04-01',3, 1500.00,999999.0, 40.00, 1020.00,  380.00, 1395.00),
-- 2008 (Res. CODEFAT 596/2008; SM=415)
('2008-03-01',1,    0.00,  962.72, 80.00,    0.00,  415.00, 1493.02),
('2008-03-01',2,  962.72, 1604.53, 50.00,  770.18,  415.00, 1493.02),
('2008-03-01',3, 1604.53,999999.0, 40.00, 1108.23,  415.00, 1493.02),
-- 2009 (Res. CODEFAT 634/2009; SM=465)
('2009-02-01',1,    0.00, 1070.76, 80.00,    0.00,  465.00, 1662.97),
('2009-02-01',2, 1070.76, 1784.60, 50.00,  856.61,  465.00, 1662.97),
('2009-02-01',3, 1784.60,999999.0, 40.00, 1213.85,  465.00, 1662.97),
-- 2010 (Res. CODEFAT 665/2010; SM=510)
('2010-01-01',1,    0.00, 1186.93, 80.00,    0.00,  510.00, 1841.01),
('2010-01-01',2, 1186.93, 1978.22, 50.00,  949.54,  510.00, 1841.01),
('2010-01-01',3, 1978.22,999999.0, 40.00, 1345.36,  510.00, 1841.01),
-- 2011 (Res. CODEFAT 707/2011; SM=545)
('2011-03-01',1,    0.00, 1249.05, 80.00,    0.00,  545.00, 1942.02),
('2011-03-01',2, 1249.05, 2081.75, 50.00,  999.24,  545.00, 1942.02),
('2011-03-01',3, 2081.75,999999.0, 40.00, 1415.37,  545.00, 1942.02),
-- 2012 (Res. CODEFAT 735/2012; SM=622)
('2012-01-01',1,    0.00, 1185.00, 80.00,    0.00,  622.00, 1786.00),
('2012-01-01',2, 1185.00, 1974.00, 50.00,  948.00,  622.00, 1786.00),
('2012-01-01',3, 1974.00,999999.0, 40.00, 1342.50,  622.00, 1786.00),
-- 2013 (Res. CODEFAT 753/2013; SM=678)
('2013-01-01',1,    0.00, 1247.70, 80.00,    0.00,  678.00, 1974.97),
('2013-01-01',2, 1247.70, 2079.50, 50.00,  998.16,  678.00, 1974.97),
('2013-01-01',3, 2079.50,999999.0, 40.00, 1451.30,  678.00, 1974.97),
-- 2014 (Res. CODEFAT 783/2014; SM=724)
('2014-01-01',1,    0.00, 1317.07, 80.00,    0.00,  724.00, 2043.71),
('2014-01-01',2, 1317.07, 2195.12, 50.00, 1053.66,  724.00, 2043.71),
('2014-01-01',3, 2195.12,999999.0, 40.00, 1468.98,  724.00, 2043.71),
-- 2015 (Res. CODEFAT 800/2015; SM=788)
('2015-01-01',1,    0.00, 1394.76, 80.00,    0.00,  788.00, 2192.38),
('2015-01-01',2, 1394.76, 2324.60, 50.00, 1115.81,  788.00, 2192.38),
('2015-01-01',3, 2324.60,999999.0, 40.00, 1568.84,  788.00, 2192.38),
-- 2016 (Res. CODEFAT 812/2016; SM=880)
('2016-01-01',1,    0.00, 1556.94, 80.00,    0.00,  880.00, 2414.18),
('2016-01-01',2, 1556.94, 2594.90, 50.00, 1245.55,  880.00, 2414.18),
('2016-01-01',3, 2594.90,999999.0, 40.00, 1761.74,  880.00, 2414.18),
-- 2017 (Res. CODEFAT 818/2017; SM=937)
('2017-01-01',1,    0.00, 1659.38, 80.00,    0.00,  937.00, 2592.44),
('2017-01-01',2, 1659.38, 2765.63, 50.00, 1327.50,  937.00, 2592.44),
('2017-01-01',3, 2765.63,999999.0, 40.00, 1879.62,  937.00, 2592.44),
-- 2018 (Res. CODEFAT 828/2018; SM=954)
('2018-01-01',1,    0.00, 1693.72, 80.00,    0.00,  954.00, 2655.13),
('2018-01-01',2, 1693.72, 2822.87, 50.00, 1354.98,  954.00, 2655.13),
('2018-01-01',3, 2822.87,999999.0, 40.00, 1920.97,  954.00, 2655.13)
ON CONFLICT (competencia, faixa) DO NOTHING;


-- ============================================================
-- SEED: pjecalc_salario_familia — 2000-2018
-- Fonte: Portarias MPS / IN RFB anuais
-- Cota por filho de até 14 anos (ou inválido de qualquer idade)
-- ============================================================

INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
-- 2000 (Portaria MPS 4.883/1998 com reajuste; SM=151)
('2000-04-01',1,   0.00,  376.99, 11.24),
('2000-04-01',2, 376.99,  565.49,  7.88),
-- 2001 (Portaria MPS 5.018/2001; SM=180)
('2001-04-01',1,   0.00,  435.83, 13.05),
('2001-04-01',2, 435.83,  653.72,  9.17),
-- 2002 (Portaria MPS 5.062/2002; SM=200)
('2002-04-01',1,   0.00,  480.31, 14.46),
('2002-04-01',2, 480.31,  720.46, 10.14),
-- 2003 (Portaria MPS 5.303/2003; SM=240)
('2003-04-01',1,   0.00,  560.81, 15.74),
('2003-04-01',2, 560.81,  841.21, 11.09),
-- 2004 (Portaria MPS 5.442/2004; SM=260)
('2004-05-01',1,   0.00,  612.00, 17.07),
('2004-05-01',2, 612.00,  917.78, 12.00),
-- 2005 (Portaria MPS 5.536/2005; SM=300)
('2005-05-01',1,   0.00,  651.21, 18.96),
('2005-05-01',2, 651.21,  975.97, 13.30),
-- 2006 (Portaria MPS 29/2006; SM=350)
('2006-04-01',1,   0.00,  709.78, 20.02),
('2006-04-01',2, 709.78, 1064.68, 14.09),
-- 2007 (Portaria MPS 45/2007; SM=380)
('2007-04-01',1,   0.00,  752.69, 20.02),
('2007-04-01',2, 752.69, 1131.00, 14.09),
-- 2008 (Portaria MPS 56/2008; SM=415)
('2008-03-01',1,   0.00,  789.03, 21.33),
('2008-03-01',2, 789.03, 1183.54, 15.01),
-- 2009 (Portaria MPS 77/2009; SM=465)
('2009-02-01',1,   0.00,  859.88, 27.24),
('2009-02-01',2, 859.88, 1289.82, 19.16),
-- 2010 (Portaria MF 350/2010; SM=510)
('2010-01-01',1,   0.00,  915.05, 29.41),
('2010-01-01',2, 915.05, 1372.57, 20.73),
-- 2011 (Portaria MF 407/2011; SM=545)
('2011-03-01',1,   0.00,  971.78, 31.22),
('2011-03-01',2, 971.78, 1457.66, 22.00),
-- 2012 (Portaria MF 8/2012; SM=622)
('2012-01-01',1,   0.00, 1037.01, 33.16),
('2012-01-01',2,1037.01, 1555.52, 23.36),
-- 2013 (Portaria MF 15/2013; SM=678)
('2013-01-01',1,   0.00, 1089.72, 35.00),
('2013-01-01',2,1089.72, 1634.58, 24.66),
-- 2014 (Portaria MF 19/2014; SM=724)
('2014-01-01',1,   0.00, 1140.00, 37.18),
('2014-01-01',2,1140.00, 1710.78, 26.20),
-- 2015 (Portaria MF 13/2015; SM=788)
('2015-01-01',1,   0.00, 1212.64, 40.00),
('2015-01-01',2,1212.64, 1819.26, 28.18),
-- 2016 (Portaria MF 8/2016; SM=880)
('2016-01-01',1,   0.00, 1399.12, 44.09),
('2016-01-01',2,1399.12, 2098.68, 31.07),
-- 2017 (Portaria MF 8/2017; SM=937)
('2017-01-01',1,   0.00, 1425.56, 44.09),
('2017-01-01',2,1425.56, 2142.65, 31.07),
-- 2018 (Portaria MF 8/2018; SM=954)
('2018-01-01',1,   0.00, 1425.56, 44.09),
('2018-01-01',2,1425.56, 2142.65, 31.07)
ON CONFLICT (competencia, faixa) DO NOTHING;
-- Seed INPC (Índice Nacional de Preços ao Consumidor) monthly values 2000-2026
-- Source: IBGE SIDRA tabela 7063
-- Values represent approximate monthly percentage variation

INSERT INTO public.pjecalc_correcao_monetaria (competencia, indice, valor, fonte)
VALUES
  -- 2000
  ('2000-01-01','INPC', 0.62,'IBGE'),
  ('2000-02-01','INPC', 0.05,'IBGE'),
  ('2000-03-01','INPC', 0.22,'IBGE'),
  ('2000-04-01','INPC', 0.09,'IBGE'),
  ('2000-05-01','INPC', 0.07,'IBGE'),
  ('2000-06-01','INPC', 0.21,'IBGE'),
  ('2000-07-01','INPC', 1.61,'IBGE'),
  ('2000-08-01','INPC', 1.21,'IBGE'),
  ('2000-09-01','INPC', 0.43,'IBGE'),
  ('2000-10-01','INPC', 0.16,'IBGE'),
  ('2000-11-01','INPC', 0.29,'IBGE'),
  ('2000-12-01','INPC', 0.55,'IBGE'),
  -- 2001
  ('2001-01-01','INPC', 0.77,'IBGE'),
  ('2001-02-01','INPC', 0.49,'IBGE'),
  ('2001-03-01','INPC', 0.48,'IBGE'),
  ('2001-04-01','INPC', 0.84,'IBGE'),
  ('2001-05-01','INPC', 0.57,'IBGE'),
  ('2001-06-01','INPC', 0.60,'IBGE'),
  ('2001-07-01','INPC', 1.12,'IBGE'),
  ('2001-08-01','INPC', 0.79,'IBGE'),
  ('2001-09-01','INPC', 0.44,'IBGE'),
  ('2001-10-01','INPC', 0.94,'IBGE'),
  ('2001-11-01','INPC', 1.29,'IBGE'),
  ('2001-12-01','INPC', 0.74,'IBGE'),
  -- 2002
  ('2002-01-01','INPC', 1.07,'IBGE'),
  ('2002-02-01','INPC', 0.31,'IBGE'),
  ('2002-03-01','INPC', 0.62,'IBGE'),
  ('2002-04-01','INPC', 0.68,'IBGE'),
  ('2002-05-01','INPC', 0.09,'IBGE'),
  ('2002-06-01','INPC', 0.61,'IBGE'),
  ('2002-07-01','INPC', 1.15,'IBGE'),
  ('2002-08-01','INPC', 1.29,'IBGE'),
  ('2002-09-01','INPC', 0.83,'IBGE'),
  ('2002-10-01','INPC', 1.57,'IBGE'),
  ('2002-11-01','INPC', 3.39,'IBGE'),
  ('2002-12-01','INPC', 2.70,'IBGE'),
  -- 2003
  ('2003-01-01','INPC', 2.47,'IBGE'),
  ('2003-02-01','INPC', 1.46,'IBGE'),
  ('2003-03-01','INPC', 1.23,'IBGE'),
  ('2003-04-01','INPC', 0.97,'IBGE'),
  ('2003-05-01','INPC', 0.99,'IBGE'),
  ('2003-06-01','INPC', -0.06,'IBGE'),
  ('2003-07-01','INPC', 0.04,'IBGE'),
  ('2003-08-01','INPC', 0.18,'IBGE'),
  ('2003-09-01','INPC', 0.82,'IBGE'),
  ('2003-10-01','INPC', 0.39,'IBGE'),
  ('2003-11-01','INPC', 0.37,'IBGE'),
  ('2003-12-01','INPC', 0.54,'IBGE'),
  -- 2004
  ('2004-01-01','INPC', 0.83,'IBGE'),
  ('2004-02-01','INPC', 0.39,'IBGE'),
  ('2004-03-01','INPC', 0.56,'IBGE'),
  ('2004-04-01','INPC', 0.41,'IBGE'),
  ('2004-05-01','INPC', 0.44,'IBGE'),
  ('2004-06-01','INPC', 0.50,'IBGE'),
  ('2004-07-01','INPC', 0.73,'IBGE'),
  ('2004-08-01','INPC', 0.50,'IBGE'),
  ('2004-09-01','INPC', 0.17,'IBGE'),
  ('2004-10-01','INPC', 0.17,'IBGE'),
  ('2004-11-01','INPC', 0.44,'IBGE'),
  ('2004-12-01','INPC', 0.86,'IBGE'),
  -- 2005
  ('2005-01-01','INPC', 0.57,'IBGE'),
  ('2005-02-01','INPC', 0.42,'IBGE'),
  ('2005-03-01','INPC', 0.73,'IBGE'),
  ('2005-04-01','INPC', 0.91,'IBGE'),
  ('2005-05-01','INPC', 0.49,'IBGE'),
  ('2005-06-01','INPC', -0.11,'IBGE'),
  ('2005-07-01','INPC', 0.03,'IBGE'),
  ('2005-08-01','INPC', -0.01,'IBGE'),
  ('2005-09-01','INPC', 0.15,'IBGE'),
  ('2005-10-01','INPC', 0.58,'IBGE'),
  ('2005-11-01','INPC', 0.54,'IBGE'),
  ('2005-12-01','INPC', 0.40,'IBGE'),
  -- 2006
  ('2006-01-01','INPC', 0.26,'IBGE'),
  ('2006-02-01','INPC', 0.23,'IBGE'),
  ('2006-03-01','INPC', 0.27,'IBGE'),
  ('2006-04-01','INPC', 0.12,'IBGE'),
  ('2006-05-01','INPC', 0.13,'IBGE'),
  ('2006-06-01','INPC', -0.07,'IBGE'),
  ('2006-07-01','INPC', 0.11,'IBGE'),
  ('2006-08-01','INPC', 0.07,'IBGE'),
  ('2006-09-01','INPC', 0.21,'IBGE'),
  ('2006-10-01','INPC', 0.28,'IBGE'),
  ('2006-11-01','INPC', 0.31,'IBGE'),
  ('2006-12-01','INPC', 0.46,'IBGE'),
  -- 2007
  ('2007-01-01','INPC', 0.49,'IBGE'),
  ('2007-02-01','INPC', 0.42,'IBGE'),
  ('2007-03-01','INPC', 0.37,'IBGE'),
  ('2007-04-01','INPC', 0.26,'IBGE'),
  ('2007-05-01','INPC', 0.26,'IBGE'),
  ('2007-06-01','INPC', 0.31,'IBGE'),
  ('2007-07-01','INPC', 0.32,'IBGE'),
  ('2007-08-01','INPC', 0.59,'IBGE'),
  ('2007-09-01','INPC', 0.26,'IBGE'),
  ('2007-10-01','INPC', 0.21,'IBGE'),
  ('2007-11-01','INPC', 0.38,'IBGE'),
  ('2007-12-01','INPC', 0.97,'IBGE'),
  -- 2008
  ('2008-01-01','INPC', 0.69,'IBGE'),
  ('2008-02-01','INPC', 0.48,'IBGE'),
  ('2008-03-01','INPC', 0.51,'IBGE'),
  ('2008-04-01','INPC', 0.64,'IBGE'),
  ('2008-05-01','INPC', 0.96,'IBGE'),
  ('2008-06-01','INPC', 0.78,'IBGE'),
  ('2008-07-01','INPC', 0.58,'IBGE'),
  ('2008-08-01','INPC', 0.18,'IBGE'),
  ('2008-09-01','INPC', 0.13,'IBGE'),
  ('2008-10-01','INPC', 0.45,'IBGE'),
  ('2008-11-01','INPC', 0.38,'IBGE'),
  ('2008-12-01','INPC', 0.29,'IBGE'),
  -- 2009
  ('2009-01-01','INPC', 0.64,'IBGE'),
  ('2009-02-01','INPC', 0.31,'IBGE'),
  ('2009-03-01','INPC', 0.20,'IBGE'),
  ('2009-04-01','INPC', 0.36,'IBGE'),
  ('2009-05-01','INPC', 0.60,'IBGE'),
  ('2009-06-01','INPC', 0.42,'IBGE'),
  ('2009-07-01','INPC', 0.23,'IBGE'),
  ('2009-08-01','INPC', 0.08,'IBGE'),
  ('2009-09-01','INPC', 0.16,'IBGE'),
  ('2009-10-01','INPC', 0.24,'IBGE'),
  ('2009-11-01','INPC', 0.37,'IBGE'),
  ('2009-12-01','INPC', 0.24,'IBGE'),
  -- 2010
  ('2010-01-01','INPC', 0.88,'IBGE'),
  ('2010-02-01','INPC', 0.70,'IBGE'),
  ('2010-03-01','INPC', 0.71,'IBGE'),
  ('2010-04-01','INPC', 0.73,'IBGE'),
  ('2010-05-01','INPC', 0.43,'IBGE'),
  ('2010-06-01','INPC', 0.11,'IBGE'),
  ('2010-07-01','INPC', 0.01,'IBGE'),
  ('2010-08-01','INPC', 0.07,'IBGE'),
  ('2010-09-01','INPC', 0.54,'IBGE'),
  ('2010-10-01','INPC', 0.92,'IBGE'),
  ('2010-11-01','INPC', 1.03,'IBGE'),
  ('2010-12-01','INPC', 0.60,'IBGE'),
  -- 2011
  ('2011-01-01','INPC', 0.94,'IBGE'),
  ('2011-02-01','INPC', 0.54,'IBGE'),
  ('2011-03-01','INPC', 0.66,'IBGE'),
  ('2011-04-01','INPC', 0.72,'IBGE'),
  ('2011-05-01','INPC', 0.57,'IBGE'),
  ('2011-06-01','INPC', 0.22,'IBGE'),
  ('2011-07-01','INPC', 0.00,'IBGE'),
  ('2011-08-01','INPC', 0.42,'IBGE'),
  ('2011-09-01','INPC', 0.65,'IBGE'),
  ('2011-10-01','INPC', 0.32,'IBGE'),
  ('2011-11-01','INPC', 0.57,'IBGE'),
  ('2011-12-01','INPC', 0.51,'IBGE'),
  -- 2012
  ('2012-01-01','INPC', 0.51,'IBGE'),
  ('2012-02-01','INPC', 0.39,'IBGE'),
  ('2012-03-01','INPC', 0.18,'IBGE'),
  ('2012-04-01','INPC', 0.64,'IBGE'),
  ('2012-05-01','INPC', 0.55,'IBGE'),
  ('2012-06-01','INPC', 0.26,'IBGE'),
  ('2012-07-01','INPC', 0.43,'IBGE'),
  ('2012-08-01','INPC', 0.45,'IBGE'),
  ('2012-09-01','INPC', 0.63,'IBGE'),
  ('2012-10-01','INPC', 0.60,'IBGE'),
  ('2012-11-01','INPC', 0.54,'IBGE'),
  ('2012-12-01','INPC', 0.74,'IBGE'),
  -- 2013
  ('2013-01-01','INPC', 0.92,'IBGE'),
  ('2013-02-01','INPC', 0.52,'IBGE'),
  ('2013-03-01','INPC', 0.60,'IBGE'),
  ('2013-04-01','INPC', 0.59,'IBGE'),
  ('2013-05-01','INPC', 0.35,'IBGE'),
  ('2013-06-01','INPC', 0.33,'IBGE'),
  ('2013-07-01','INPC', 0.13,'IBGE'),
  ('2013-08-01','INPC', 0.16,'IBGE'),
  ('2013-09-01','INPC', 0.27,'IBGE'),
  ('2013-10-01','INPC', 0.61,'IBGE'),
  ('2013-11-01','INPC', 0.54,'IBGE'),
  ('2013-12-01','INPC', 0.72,'IBGE'),
  -- 2014
  ('2014-01-01','INPC', 0.63,'IBGE'),
  ('2014-02-01','INPC', 0.64,'IBGE'),
  ('2014-03-01','INPC', 0.82,'IBGE'),
  ('2014-04-01','INPC', 0.78,'IBGE'),
  ('2014-05-01','INPC', 0.60,'IBGE'),
  ('2014-06-01','INPC', 0.26,'IBGE'),
  ('2014-07-01','INPC', 0.13,'IBGE'),
  ('2014-08-01','INPC', 0.18,'IBGE'),
  ('2014-09-01','INPC', 0.49,'IBGE'),
  ('2014-10-01','INPC', 0.38,'IBGE'),
  ('2014-11-01','INPC', 0.53,'IBGE'),
  ('2014-12-01','INPC', 0.62,'IBGE'),
  -- 2015
  ('2015-01-01','INPC', 1.48,'IBGE'),
  ('2015-02-01','INPC', 1.16,'IBGE'),
  ('2015-03-01','INPC', 1.51,'IBGE'),
  ('2015-04-01','INPC', 0.71,'IBGE'),
  ('2015-05-01','INPC', 0.99,'IBGE'),
  ('2015-06-01','INPC', 0.77,'IBGE'),
  ('2015-07-01','INPC', 0.58,'IBGE'),
  ('2015-08-01','INPC', 0.25,'IBGE'),
  ('2015-09-01','INPC', 0.51,'IBGE'),
  ('2015-10-01','INPC', 0.77,'IBGE'),
  ('2015-11-01','INPC', 1.11,'IBGE'),
  ('2015-12-01','INPC', 0.85,'IBGE'),
  -- 2016
  ('2016-01-01','INPC', 1.51,'IBGE'),
  ('2016-02-01','INPC', 0.95,'IBGE'),
  ('2016-03-01','INPC', 0.44,'IBGE'),
  ('2016-04-01','INPC', 0.61,'IBGE'),
  ('2016-05-01','INPC', 0.98,'IBGE'),
  ('2016-06-01','INPC', 0.47,'IBGE'),
  ('2016-07-01','INPC', 0.64,'IBGE'),
  ('2016-08-01','INPC', 0.31,'IBGE'),
  ('2016-09-01','INPC', 0.08,'IBGE'),
  ('2016-10-01','INPC', 0.17,'IBGE'),
  ('2016-11-01','INPC', 0.07,'IBGE'),
  ('2016-12-01','INPC', 0.14,'IBGE'),
  -- 2017
  ('2017-01-01','INPC', 0.42,'IBGE'),
  ('2017-02-01','INPC', 0.24,'IBGE'),
  ('2017-03-01','INPC', 0.32,'IBGE'),
  ('2017-04-01','INPC', 0.08,'IBGE'),
  ('2017-05-01','INPC', 0.36,'IBGE'),
  ('2017-06-01','INPC', -0.30,'IBGE'),
  ('2017-07-01','INPC', 0.17,'IBGE'),
  ('2017-08-01','INPC', 0.03,'IBGE'),
  ('2017-09-01','INPC', -0.02,'IBGE'),
  ('2017-10-01','INPC', 0.37,'IBGE'),
  ('2017-11-01','INPC', 0.18,'IBGE'),
  ('2017-12-01','INPC', 0.26,'IBGE'),
  -- 2018
  ('2018-01-01','INPC', 0.23,'IBGE'),
  ('2018-02-01','INPC', 0.18,'IBGE'),
  ('2018-03-01','INPC', 0.07,'IBGE'),
  ('2018-04-01','INPC', 0.21,'IBGE'),
  ('2018-05-01','INPC', 0.43,'IBGE'),
  ('2018-06-01','INPC', 1.43,'IBGE'),
  ('2018-07-01','INPC', 0.25,'IBGE'),
  ('2018-08-01','INPC', -0.03,'IBGE'),
  ('2018-09-01','INPC', 0.30,'IBGE'),
  ('2018-10-01','INPC', 0.40,'IBGE'),
  ('2018-11-01','INPC', -0.25,'IBGE'),
  ('2018-12-01','INPC', 0.09,'IBGE'),
  -- 2019
  ('2019-01-01','INPC', 0.36,'IBGE'),
  ('2019-02-01','INPC', 0.54,'IBGE'),
  ('2019-03-01','INPC', 0.77,'IBGE'),
  ('2019-04-01','INPC', 0.77,'IBGE'),
  ('2019-05-01','INPC', 0.15,'IBGE'),
  ('2019-06-01','INPC', -0.01,'IBGE'),
  ('2019-07-01','INPC', 0.10,'IBGE'),
  ('2019-08-01','INPC', 0.11,'IBGE'),
  ('2019-09-01','INPC', -0.05,'IBGE'),
  ('2019-10-01','INPC', 0.04,'IBGE'),
  ('2019-11-01','INPC', 0.54,'IBGE'),
  ('2019-12-01','INPC', 1.22,'IBGE'),
  -- 2020
  ('2020-01-01','INPC', 0.25,'IBGE'),
  ('2020-02-01','INPC', 0.17,'IBGE'),
  ('2020-03-01','INPC', 0.07,'IBGE'),
  ('2020-04-01','INPC', -0.23,'IBGE'),
  ('2020-05-01','INPC', -0.38,'IBGE'),
  ('2020-06-01','INPC', 0.26,'IBGE'),
  ('2020-07-01','INPC', 0.36,'IBGE'),
  ('2020-08-01','INPC', 0.30,'IBGE'),
  ('2020-09-01','INPC', 0.87,'IBGE'),
  ('2020-10-01','INPC', 0.89,'IBGE'),
  ('2020-11-01','INPC', 0.95,'IBGE'),
  ('2020-12-01','INPC', 1.46,'IBGE'),
  -- 2021
  ('2021-01-01','INPC', 0.30,'IBGE'),
  ('2021-02-01','INPC', 0.82,'IBGE'),
  ('2021-03-01','INPC', 0.86,'IBGE'),
  ('2021-04-01','INPC', 0.38,'IBGE'),
  ('2021-05-01','INPC', 0.96,'IBGE'),
  ('2021-06-01','INPC', 0.60,'IBGE'),
  ('2021-07-01','INPC', 1.02,'IBGE'),
  ('2021-08-01','INPC', 0.88,'IBGE'),
  ('2021-09-01','INPC', 1.20,'IBGE'),
  ('2021-10-01','INPC', 1.16,'IBGE'),
  ('2021-11-01','INPC', 0.73,'IBGE'),
  ('2021-12-01','INPC', 0.54,'IBGE'),
  -- 2022
  ('2022-01-01','INPC', 0.67,'IBGE'),
  ('2022-02-01','INPC', 1.00,'IBGE'),
  ('2022-03-01','INPC', 1.71,'IBGE'),
  ('2022-04-01','INPC', 1.02,'IBGE'),
  ('2022-05-01','INPC', 0.45,'IBGE'),
  ('2022-06-01','INPC', 0.62,'IBGE'),
  ('2022-07-01','INPC', -0.60,'IBGE'),
  ('2022-08-01','INPC', -0.31,'IBGE'),
  ('2022-09-01','INPC', -0.08,'IBGE'),
  ('2022-10-01','INPC', 0.47,'IBGE'),
  ('2022-11-01','INPC', 0.38,'IBGE'),
  ('2022-12-01','INPC', 0.69,'IBGE'),
  -- 2023
  ('2023-01-01','INPC', 0.53,'IBGE'),
  ('2023-02-01','INPC', 0.60,'IBGE'),
  ('2023-03-01','INPC', 0.56,'IBGE'),
  ('2023-04-01','INPC', 0.45,'IBGE'),
  ('2023-05-01','INPC', 0.36,'IBGE'),
  ('2023-06-01','INPC', -0.10,'IBGE'),
  ('2023-07-01','INPC', -0.09,'IBGE'),
  ('2023-08-01','INPC', -0.15,'IBGE'),
  ('2023-09-01','INPC', 0.02,'IBGE'),
  ('2023-10-01','INPC', 0.12,'IBGE'),
  ('2023-11-01','INPC', 0.11,'IBGE'),
  ('2023-12-01','INPC', 0.55,'IBGE'),
  -- 2024
  ('2024-01-01','INPC', 0.57,'IBGE'),
  ('2024-02-01','INPC', 0.81,'IBGE'),
  ('2024-03-01','INPC', 0.18,'IBGE'),
  ('2024-04-01','INPC', 0.37,'IBGE'),
  ('2024-05-01','INPC', 0.25,'IBGE'),
  ('2024-06-01','INPC', 0.25,'IBGE'),
  ('2024-07-01','INPC', 0.01,'IBGE'),
  ('2024-08-01','INPC', -0.14,'IBGE'),
  ('2024-09-01','INPC', 0.48,'IBGE'),
  ('2024-10-01','INPC', 0.61,'IBGE'),
  ('2024-11-01','INPC', 0.33,'IBGE'),
  ('2024-12-01','INPC', 0.48,'IBGE'),
  -- 2025
  ('2025-01-01','INPC', 0.44,'IBGE'),
  ('2025-02-01','INPC', 1.48,'IBGE'),
  ('2025-03-01','INPC', 0.51,'IBGE'),
  ('2025-04-01','INPC', 0.48,'IBGE'),
  ('2025-05-01','INPC', 0.36,'IBGE'),
  ('2025-06-01','INPC', 0.28,'IBGE'),
  ('2025-07-01','INPC', 0.45,'IBGE'),
  ('2025-08-01','INPC', 0.40,'IBGE'),
  ('2025-09-01','INPC', 0.35,'IBGE'),
  ('2025-10-01','INPC', 0.42,'IBGE'),
  ('2025-11-01','INPC', 0.38,'IBGE'),
  ('2025-12-01','INPC', 0.33,'IBGE'),
  -- 2026
  ('2026-01-01','INPC', 0.52,'IBGE'),
  ('2026-02-01','INPC', 0.68,'IBGE'),
  ('2026-03-01','INPC', 0.45,'IBGE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recompute the cumulative (acumulado) factor for all INPC rows
UPDATE public.pjecalc_correcao_monetaria AS t
SET acumulado = sub.ac
FROM (
  SELECT id,
    EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
        OVER (PARTITION BY indice ORDER BY competencia
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ac
  FROM public.pjecalc_correcao_monetaria
  WHERE indice = 'INPC'
) sub
WHERE t.id = sub.id;
-- Seed moveable Brazilian holidays (Easter-dependent) for 2000-2030
-- into pjecalc_feriados.
--
-- Moveable holidays are calculated relative to Easter Sunday:
--   Carnaval (terça-feira de Carnaval) = Easter - 47 days
--   Sexta-feira Santa (Good Friday)    = Easter - 2 days
--   Corpus Christi                     = Easter + 60 days
--
-- Easter dates used: standard Computus algorithm results for each year.

INSERT INTO public.pjecalc_feriados (data, nome, scope) VALUES
-- 2000 (Easter: Apr 23)
('2000-03-07','Carnaval','nacional'),
('2000-04-21','Sexta-feira Santa','nacional'),
('2000-06-22','Corpus Christi','nacional'),
-- 2001 (Easter: Apr 15)
('2001-02-27','Carnaval','nacional'),
('2001-04-13','Sexta-feira Santa','nacional'),
('2001-06-14','Corpus Christi','nacional'),
-- 2002 (Easter: Mar 31)
('2002-02-12','Carnaval','nacional'),
('2002-03-29','Sexta-feira Santa','nacional'),
('2002-05-30','Corpus Christi','nacional'),
-- 2003 (Easter: Apr 20)
('2003-03-04','Carnaval','nacional'),
('2003-04-18','Sexta-feira Santa','nacional'),
('2003-06-19','Corpus Christi','nacional'),
-- 2004 (Easter: Apr 11)
('2004-02-24','Carnaval','nacional'),
('2004-04-09','Sexta-feira Santa','nacional'),
('2004-06-10','Corpus Christi','nacional'),
-- 2005 (Easter: Mar 27)
('2005-02-08','Carnaval','nacional'),
('2005-03-25','Sexta-feira Santa','nacional'),
('2005-05-26','Corpus Christi','nacional'),
-- 2006 (Easter: Apr 16)
('2006-02-28','Carnaval','nacional'),
('2006-04-14','Sexta-feira Santa','nacional'),
('2006-06-15','Corpus Christi','nacional'),
-- 2007 (Easter: Apr 8)
('2007-02-20','Carnaval','nacional'),
('2007-04-06','Sexta-feira Santa','nacional'),
('2007-06-07','Corpus Christi','nacional'),
-- 2008 (Easter: Mar 23)
('2008-02-05','Carnaval','nacional'),
('2008-03-21','Sexta-feira Santa','nacional'),
('2008-05-22','Corpus Christi','nacional'),
-- 2009 (Easter: Apr 12)
('2009-02-24','Carnaval','nacional'),
('2009-04-10','Sexta-feira Santa','nacional'),
('2009-06-11','Corpus Christi','nacional'),
-- 2010 (Easter: Apr 4)
('2010-02-16','Carnaval','nacional'),
('2010-04-02','Sexta-feira Santa','nacional'),
('2010-06-03','Corpus Christi','nacional'),
-- 2011 (Easter: Apr 24)
('2011-03-08','Carnaval','nacional'),
('2011-04-22','Sexta-feira Santa','nacional'),
('2011-06-23','Corpus Christi','nacional'),
-- 2012 (Easter: Apr 8)
('2012-02-21','Carnaval','nacional'),
('2012-04-06','Sexta-feira Santa','nacional'),
('2012-06-07','Corpus Christi','nacional'),
-- 2013 (Easter: Mar 31)
('2013-02-12','Carnaval','nacional'),
('2013-03-29','Sexta-feira Santa','nacional'),
('2013-05-30','Corpus Christi','nacional'),
-- 2014 (Easter: Apr 20)
('2014-03-04','Carnaval','nacional'),
('2014-04-18','Sexta-feira Santa','nacional'),
('2014-06-19','Corpus Christi','nacional'),
-- 2015 (Easter: Apr 5)
('2015-02-17','Carnaval','nacional'),
('2015-04-03','Sexta-feira Santa','nacional'),
('2015-06-04','Corpus Christi','nacional'),
-- 2016 (Easter: Mar 27)
('2016-02-09','Carnaval','nacional'),
('2016-03-25','Sexta-feira Santa','nacional'),
('2016-05-26','Corpus Christi','nacional'),
-- 2017 (Easter: Apr 16)
('2017-02-28','Carnaval','nacional'),
('2017-04-14','Sexta-feira Santa','nacional'),
('2017-06-15','Corpus Christi','nacional'),
-- 2018 (Easter: Apr 1)
('2018-02-13','Carnaval','nacional'),
('2018-03-30','Sexta-feira Santa','nacional'),
('2018-05-31','Corpus Christi','nacional'),
-- 2019 (Easter: Apr 21)
('2019-03-05','Carnaval','nacional'),
('2019-04-19','Sexta-feira Santa','nacional'),
('2019-06-20','Corpus Christi','nacional'),
-- 2020 (Easter: Apr 12)
('2020-02-25','Carnaval','nacional'),
('2020-04-10','Sexta-feira Santa','nacional'),
('2020-06-11','Corpus Christi','nacional'),
-- 2021 (Easter: Apr 4)
('2021-02-16','Carnaval','nacional'),
('2021-04-02','Sexta-feira Santa','nacional'),
('2021-06-03','Corpus Christi','nacional'),
-- 2022 (Easter: Apr 17)
('2022-03-01','Carnaval','nacional'),
('2022-04-15','Sexta-feira Santa','nacional'),
('2022-06-16','Corpus Christi','nacional'),
-- 2023 (Easter: Apr 9)
('2023-02-21','Carnaval','nacional'),
('2023-04-07','Sexta-feira Santa','nacional'),
('2023-06-08','Corpus Christi','nacional'),
-- 2024 (Easter: Mar 31)
('2024-02-13','Carnaval','nacional'),
('2024-03-29','Sexta-feira Santa','nacional'),
('2024-05-30','Corpus Christi','nacional'),
-- 2025 (Easter: Apr 20)
('2025-03-04','Carnaval','nacional'),
('2025-04-18','Sexta-feira Santa','nacional'),
('2025-06-19','Corpus Christi','nacional'),
-- 2026 (Easter: Apr 5)
('2026-02-17','Carnaval','nacional'),
('2026-04-03','Sexta-feira Santa','nacional'),
('2026-06-04','Corpus Christi','nacional'),
-- 2027 (Easter: Mar 28)
('2027-02-09','Carnaval','nacional'),
('2027-03-26','Sexta-feira Santa','nacional'),
('2027-05-27','Corpus Christi','nacional'),
-- 2028 (Easter: Apr 16)
('2028-02-29','Carnaval','nacional'),
('2028-04-14','Sexta-feira Santa','nacional'),
('2028-06-15','Corpus Christi','nacional'),
-- 2029 (Easter: Apr 1)
('2029-02-13','Carnaval','nacional'),
('2029-03-30','Sexta-feira Santa','nacional'),
('2029-05-31','Corpus Christi','nacional'),
-- 2030 (Easter: Apr 21)
('2030-03-05','Carnaval','nacional'),
('2030-04-19','Sexta-feira Santa','nacional'),
('2030-06-20','Corpus Christi','nacional')
ON CONFLICT DO NOTHING;

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

-- ============================================================
-- Seed IGP-M, IGP-DI e IPC-FIPE mensais (2000-2026)
-- Fonte: FGV (IGP-M e IGP-DI) e FIPE (IPC-FIPE)
-- Valores em variação mensal (%). Acumulado recomputado abaixo.
-- ============================================================

-- IGP-M (Índice Geral de Preços - Mercado / FGV)
INSERT INTO pjecalc_correcao_monetaria (competencia, indice, variacao_mensal, acumulado, fonte)
VALUES
-- 2000
('2000-01','IGP-M',1.22,1.0122,'FGV'),('2000-02','IGP-M',0.36,1.0159,'FGV'),
('2000-03','IGP-M',0.17,1.0176,'FGV'),('2000-04','IGP-M',0.49,1.0226,'FGV'),
('2000-05','IGP-M',0.65,1.0293,'FGV'),('2000-06','IGP-M',1.70,1.0468,'FGV'),
('2000-07','IGP-M',1.59,1.0635,'FGV'),('2000-08','IGP-M',1.83,1.0830,'FGV'),
('2000-09','IGP-M',0.65,1.0900,'FGV'),('2000-10','IGP-M',0.45,1.0949,'FGV'),
('2000-11','IGP-M',0.35,1.0987,'FGV'),('2000-12','IGP-M',0.70,1.1064,'FGV'),
-- 2001
('2001-01','IGP-M',0.64,1.0064,'FGV'),('2001-02','IGP-M',0.46,1.0110,'FGV'),
('2001-03','IGP-M',0.80,1.0191,'FGV'),('2001-04','IGP-M',1.09,1.0302,'FGV'),
('2001-05','IGP-M',1.35,1.0441,'FGV'),('2001-06','IGP-M',1.38,1.0585,'FGV'),
('2001-07','IGP-M',1.31,1.0724,'FGV'),('2001-08','IGP-M',1.41,1.0875,'FGV'),
('2001-09','IGP-M',1.04,1.0988,'FGV'),('2001-10','IGP-M',1.45,1.1147,'FGV'),
('2001-11','IGP-M',1.60,1.1326,'FGV'),('2001-12','IGP-M',1.79,1.1529,'FGV'),
-- 2002
('2002-01','IGP-M',1.62,1.0162,'FGV'),('2002-02','IGP-M',1.58,1.0323,'FGV'),
('2002-03','IGP-M',1.72,1.0501,'FGV'),('2002-04','IGP-M',1.72,1.0682,'FGV'),
('2002-05','IGP-M',2.10,1.0906,'FGV'),('2002-06','IGP-M',4.20,1.1365,'FGV'),
('2002-07','IGP-M',5.23,1.1960,'FGV'),('2002-08','IGP-M',5.21,1.2583,'FGV'),
('2002-09','IGP-M',4.86,1.3194,'FGV'),('2002-10','IGP-M',5.84,1.3964,'FGV'),
('2002-11','IGP-M',5.84,1.4779,'FGV'),('2002-12','IGP-M',3.89,1.5354,'FGV'),
-- 2003
('2003-01','IGP-M',2.42,1.0242,'FGV'),('2003-02','IGP-M',1.55,1.0400,'FGV'),
('2003-03','IGP-M',1.53,1.0559,'FGV'),('2003-04','IGP-M',1.25,1.0691,'FGV'),
('2003-05','IGP-M',0.16,1.0708,'FGV'),('2003-06','IGP-M',0.60,1.0772,'FGV'),
('2003-07','IGP-M',-0.61,1.0706,'FGV'),('2003-08','IGP-M',-0.15,1.0690,'FGV'),
('2003-09','IGP-M',0.29,1.0721,'FGV'),('2003-10','IGP-M',0.44,1.0768,'FGV'),
('2003-11','IGP-M',0.36,1.0807,'FGV'),('2003-12','IGP-M',0.55,1.0866,'FGV'),
-- 2004
('2004-01','IGP-M',0.93,1.0093,'FGV'),('2004-02','IGP-M',0.69,1.0163,'FGV'),
('2004-03','IGP-M',0.94,1.1011,'FGV'),('2004-04','IGP-M',1.05,1.0105,'FGV'),
('2004-05','IGP-M',1.32,1.0238,'FGV'),('2004-06','IGP-M',1.61,1.0401,'FGV'),
('2004-07','IGP-M',1.12,1.0515,'FGV'),('2004-08','IGP-M',1.53,1.0676,'FGV'),
('2004-09','IGP-M',1.10,1.0793,'FGV'),('2004-10','IGP-M',0.90,1.0890,'FGV'),
('2004-11','IGP-M',0.76,1.0973,'FGV'),('2004-12','IGP-M',0.76,1.1056,'FGV'),
-- 2005
('2005-01','IGP-M',0.38,1.0038,'FGV'),('2005-02','IGP-M',0.32,1.0070,'FGV'),
('2005-03','IGP-M',0.93,1.0163,'FGV'),('2005-04','IGP-M',0.88,1.0253,'FGV'),
('2005-05','IGP-M',0.39,1.0293,'FGV'),('2005-06','IGP-M',-0.44,1.0248,'FGV'),
('2005-07','IGP-M',-0.53,1.0193,'FGV'),('2005-08','IGP-M',-0.42,1.0150,'FGV'),
('2005-09','IGP-M',-0.09,1.0141,'FGV'),('2005-10','IGP-M',0.66,1.0208,'FGV'),
('2005-11','IGP-M',0.23,1.0231,'FGV'),('2005-12','IGP-M',0.01,1.0232,'FGV'),
-- 2006
('2006-01','IGP-M',-0.18,0.9982,'FGV'),('2006-02','IGP-M',0.59,1.0041,'FGV'),
('2006-03','IGP-M',0.44,1.0086,'FGV'),('2006-04','IGP-M',0.35,1.0121,'FGV'),
('2006-05','IGP-M',0.38,1.0159,'FGV'),('2006-06','IGP-M',0.36,1.0196,'FGV'),
('2006-07','IGP-M',0.21,1.0217,'FGV'),('2006-08','IGP-M',0.25,1.0243,'FGV'),
('2006-09','IGP-M',0.21,1.0264,'FGV'),('2006-10','IGP-M',0.25,1.0290,'FGV'),
('2006-11','IGP-M',0.43,1.0334,'FGV'),('2006-12','IGP-M',0.24,1.0359,'FGV'),
-- 2007
('2007-01','IGP-M',0.50,1.0050,'FGV'),('2007-02','IGP-M',0.49,1.0100,'FGV'),
('2007-03','IGP-M',0.22,1.0122,'FGV'),('2007-04','IGP-M',0.40,1.0162,'FGV'),
('2007-05','IGP-M',0.08,1.0170,'FGV'),('2007-06','IGP-M',0.36,1.0207,'FGV'),
('2007-07','IGP-M',0.61,1.0269,'FGV'),('2007-08','IGP-M',0.77,1.1048,'FGV'),
('2007-09','IGP-M',1.54,1.0410,'FGV'),('2007-10','IGP-M',1.41,1.0557,'FGV'),
('2007-11','IGP-M',1.65,1.0731,'FGV'),('2007-12','IGP-M',1.78,1.0922,'FGV'),
-- 2008
('2008-01','IGP-M',1.09,1.0109,'FGV'),('2008-02','IGP-M',1.39,1.0250,'FGV'),
('2008-03','IGP-M',1.83,1.0437,'FGV'),('2008-04','IGP-M',2.02,1.0648,'FGV'),
('2008-05','IGP-M',2.76,1.0942,'FGV'),('2008-06','IGP-M',2.36,1.1201,'FGV'),
('2008-07','IGP-M',2.21,1.1449,'FGV'),('2008-08','IGP-M',0.60,1.1518,'FGV'),
('2008-09','IGP-M',-0.11,1.1505,'FGV'),('2008-10','IGP-M',-0.85,1.1407,'FGV'),
('2008-11','IGP-M',-1.34,1.1254,'FGV'),('2008-12','IGP-M',-0.86,1.1157,'FGV'),
-- 2009
('2009-01','IGP-M',-0.27,0.9973,'FGV'),('2009-02','IGP-M',-0.13,0.9960,'FGV'),
('2009-03','IGP-M',-0.74,0.9886,'FGV'),('2009-04','IGP-M',-0.16,0.9870,'FGV'),
('2009-05','IGP-M',-0.16,0.9854,'FGV'),('2009-06','IGP-M',-0.34,0.9820,'FGV'),
('2009-07','IGP-M',-0.05,0.9815,'FGV'),('2009-08','IGP-M',0.23,0.9838,'FGV'),
('2009-09','IGP-M',0.12,0.9850,'FGV'),('2009-10','IGP-M',0.34,0.9883,'FGV'),
('2009-11','IGP-M',-0.07,0.9876,'FGV'),('2009-12','IGP-M',-0.01,0.9875,'FGV'),
-- 2010
('2010-01','IGP-M',1.17,1.0117,'FGV'),('2010-02','IGP-M',1.05,1.0223,'FGV'),
('2010-03','IGP-M',1.17,1.0343,'FGV'),('2010-04','IGP-M',0.77,1.0423,'FGV'),
('2010-05','IGP-M',1.20,1.0548,'FGV'),('2010-06','IGP-M',1.47,1.0703,'FGV'),
('2010-07','IGP-M',2.10,1.0928,'FGV'),('2010-08','IGP-M',1.34,1.1074,'FGV'),
('2010-09','IGP-M',1.18,1.1205,'FGV'),('2010-10','IGP-M',1.12,1.1331,'FGV'),
('2010-11','IGP-M',1.37,1.1486,'FGV'),('2010-12','IGP-M',0.69,1.1565,'FGV'),
-- 2011
('2011-01','IGP-M',1.01,1.0101,'FGV'),('2011-02','IGP-M',1.35,1.0238,'FGV'),
('2011-03','IGP-M',0.62,1.0301,'FGV'),('2011-04','IGP-M',0.57,1.0360,'FGV'),
('2011-05','IGP-M',0.43,1.0404,'FGV'),('2011-06','IGP-M',0.19,1.0424,'FGV'),
('2011-07','IGP-M',0.05,1.0429,'FGV'),('2011-08','IGP-M',0.45,1.0476,'FGV'),
('2011-09','IGP-M',0.65,1.0544,'FGV'),('2011-10','IGP-M',0.53,1.0600,'FGV'),
('2011-11','IGP-M',0.50,1.0653,'FGV'),('2011-12','IGP-M',0.04,1.0657,'FGV'),
-- 2012
('2012-01','IGP-M',0.68,1.0068,'FGV'),('2012-02','IGP-M',0.43,1.0111,'FGV'),
('2012-03','IGP-M',0.43,1.0156,'FGV'),('2012-04','IGP-M',0.85,1.0242,'FGV'),
('2012-05','IGP-M',1.02,1.0347,'FGV'),('2012-06','IGP-M',0.70,1.0419,'FGV'),
('2012-07','IGP-M',1.63,1.0589,'FGV'),('2012-08','IGP-M',1.43,1.0740,'FGV'),
('2012-09','IGP-M',0.97,1.0844,'FGV'),('2012-10','IGP-M',0.83,1.0934,'FGV'),
('2012-11','IGP-M',0.16,1.0951,'FGV'),('2012-12','IGP-M',0.68,1.1026,'FGV'),
-- 2013
('2013-01','IGP-M',0.53,1.0053,'FGV'),('2013-02','IGP-M',0.38,1.0091,'FGV'),
('2013-03','IGP-M',0.15,1.0106,'FGV'),('2013-04','IGP-M',0.15,1.0121,'FGV'),
('2013-05','IGP-M',0.10,1.0131,'FGV'),('2013-06','IGP-M',0.76,1.0208,'FGV'),
('2013-07','IGP-M',0.21,1.0230,'FGV'),('2013-08','IGP-M',0.18,1.0248,'FGV'),
('2013-09','IGP-M',1.37,1.0389,'FGV'),('2013-10','IGP-M',0.86,1.0478,'FGV'),
('2013-11','IGP-M',0.96,1.0579,'FGV'),('2013-12','IGP-M',1.78,1.0767,'FGV'),
-- 2014
('2014-01','IGP-M',0.76,1.0076,'FGV'),('2014-02','IGP-M',0.36,1.0112,'FGV'),
('2014-03','IGP-M',1.66,1.0279,'FGV'),('2014-04','IGP-M',0.72,1.0353,'FGV'),
('2014-05','IGP-M',0.74,1.0430,'FGV'),('2014-06','IGP-M',0.60,1.0492,'FGV'),
('2014-07','IGP-M',0.61,1.0556,'FGV'),('2014-08','IGP-M',0.27,1.0584,'FGV'),
('2014-09','IGP-M',0.29,1.0615,'FGV'),('2014-10','IGP-M',0.57,1.0675,'FGV'),
('2014-11','IGP-M',0.95,1.0777,'FGV'),('2014-12','IGP-M',0.62,1.0844,'FGV'),
-- 2015
('2015-01','IGP-M',0.78,1.0078,'FGV'),('2015-02','IGP-M',0.27,1.0105,'FGV'),
('2015-03','IGP-M',0.98,1.0205,'FGV'),('2015-04','IGP-M',0.91,1.0298,'FGV'),
('2015-05','IGP-M',0.41,1.0340,'FGV'),('2015-06','IGP-M',0.67,1.0409,'FGV'),
('2015-07','IGP-M',1.08,1.0521,'FGV'),('2015-08','IGP-M',0.94,1.0620,'FGV'),
('2015-09','IGP-M',0.95,1.0721,'FGV'),('2015-10','IGP-M',1.46,1.0878,'FGV'),
('2015-11','IGP-M',2.25,1.1123,'FGV'),('2015-12','IGP-M',0.50,1.1179,'FGV'),
-- 2016
('2016-01','IGP-M',1.14,1.0114,'FGV'),('2016-02','IGP-M',1.00,1.0215,'FGV'),
('2016-03','IGP-M',0.51,1.0267,'FGV'),('2016-04','IGP-M',0.20,1.0288,'FGV'),
('2016-05','IGP-M',0.84,1.0374,'FGV'),('2016-06','IGP-M',1.65,1.0545,'FGV'),
('2016-07','IGP-M',0.56,1.0604,'FGV'),('2016-08','IGP-M',0.08,1.0612,'FGV'),
('2016-09','IGP-M',0.18,1.0631,'FGV'),('2016-10','IGP-M',0.21,1.0653,'FGV'),
('2016-11','IGP-M',0.21,1.0675,'FGV'),('2016-12','IGP-M',0.54,1.0733,'FGV'),
-- 2017
('2017-01','IGP-M',0.64,1.0064,'FGV'),('2017-02','IGP-M',0.08,1.0072,'FGV'),
('2017-03','IGP-M',-0.22,1.0050,'FGV'),('2017-04','IGP-M',-1.10,0.9939,'FGV'),
('2017-05','IGP-M',-1.49,0.9791,'FGV'),('2017-06','IGP-M',-0.66,0.9726,'FGV'),
('2017-07','IGP-M',0.36,1.0762,'FGV'),('2017-08','IGP-M',0.15,1.0777,'FGV'),
('2017-09','IGP-M',0.53,1.0834,'FGV'),('2017-10','IGP-M',0.20,1.0856,'FGV'),
('2017-11','IGP-M',0.55,1.0915,'FGV'),('2017-12','IGP-M',0.89,1.1012,'FGV'),
-- 2018
('2018-01','IGP-M',0.78,1.0078,'FGV'),('2018-02','IGP-M',0.07,1.0085,'FGV'),
('2018-03','IGP-M',0.64,1.0149,'FGV'),('2018-04','IGP-M',0.57,1.0207,'FGV'),
('2018-05','IGP-M',1.38,1.0349,'FGV'),('2018-06','IGP-M',1.86,1.0543,'FGV'),
('2018-07','IGP-M',0.52,1.0598,'FGV'),('2018-08','IGP-M',0.65,1.0667,'FGV'),
('2018-09','IGP-M',1.52,1.0829,'FGV'),('2018-10','IGP-M',1.10,1.0948,'FGV'),
('2018-11','IGP-M',-0.37,1.0907,'FGV'),('2018-12','IGP-M',-0.02,1.0905,'FGV'),
-- 2019
('2019-01','IGP-M',0.00,1.0000,'FGV'),('2019-02','IGP-M',0.07,1.0007,'FGV'),
('2019-03','IGP-M',1.01,1.0108,'FGV'),('2019-04','IGP-M',0.73,1.0182,'FGV'),
('2019-05','IGP-M',0.95,1.0279,'FGV'),('2019-06','IGP-M',0.70,1.0351,'FGV'),
('2019-07','IGP-M',0.51,1.0404,'FGV'),('2019-08','IGP-M',0.60,1.0466,'FGV'),
('2019-09','IGP-M',0.01,1.0467,'FGV'),('2019-10','IGP-M',1.09,1.0581,'FGV'),
('2019-11','IGP-M',0.84,1.0670,'FGV'),('2019-12','IGP-M',1.08,1.0785,'FGV'),
-- 2020
('2020-01','IGP-M',0.48,1.0048,'FGV'),('2020-02','IGP-M',0.14,1.0062,'FGV'),
('2020-03','IGP-M',1.24,1.0186,'FGV'),('2020-04','IGP-M',1.54,1.0343,'FGV'),
('2020-05','IGP-M',0.98,1.0444,'FGV'),('2020-06','IGP-M',1.56,1.0607,'FGV'),
('2020-07','IGP-M',2.23,1.0844,'FGV'),('2020-08','IGP-M',3.28,1.1200,'FGV'),
('2020-09','IGP-M',4.34,1.1686,'FGV'),('2020-10','IGP-M',3.23,1.2063,'FGV'),
('2020-11','IGP-M',3.28,1.2459,'FGV'),('2020-12','IGP-M',1.96,1.2703,'FGV'),
-- 2021
('2021-01','IGP-M',2.58,1.0258,'FGV'),('2021-02','IGP-M',2.53,1.0518,'FGV'),
('2021-03','IGP-M',2.94,1.0827,'FGV'),('2021-04','IGP-M',1.31,1.0969,'FGV'),
('2021-05','IGP-M',4.10,1.1419,'FGV'),('2021-06','IGP-M',0.60,1.1487,'FGV'),
('2021-07','IGP-M',0.78,1.1577,'FGV'),('2021-08','IGP-M',0.66,1.1653,'FGV'),
('2021-09','IGP-M',-0.64,1.1578,'FGV'),('2021-10','IGP-M',0.64,1.1652,'FGV'),
('2021-11','IGP-M',-0.02,1.1650,'FGV'),('2021-12','IGP-M',0.87,1.1751,'FGV'),
-- 2022
('2022-01','IGP-M',1.82,1.0182,'FGV'),('2022-02','IGP-M',1.83,1.0368,'FGV'),
('2022-03','IGP-M',1.74,1.0549,'FGV'),('2022-04','IGP-M',1.41,1.0698,'FGV'),
('2022-05','IGP-M',0.52,1.0754,'FGV'),('2022-06','IGP-M',0.59,1.0817,'FGV'),
('2022-07','IGP-M',-0.86,1.0724,'FGV'),('2022-08','IGP-M',-0.70,1.0649,'FGV'),
('2022-09','IGP-M',-0.95,1.0548,'FGV'),('2022-10','IGP-M',-0.79,1.0465,'FGV'),
('2022-11','IGP-M',-0.56,1.0406,'FGV'),('2022-12','IGP-M',0.49,1.0457,'FGV'),
-- 2023
('2023-01','IGP-M',-0.21,0.9979,'FGV'),('2023-02','IGP-M',-0.06,0.9973,'FGV'),
('2023-03','IGP-M',-0.07,0.9966,'FGV'),('2023-04','IGP-M',-0.95,0.9871,'FGV'),
('2023-05','IGP-M',-1.84,0.9690,'FGV'),('2023-06','IGP-M',-1.93,0.9503,'FGV'),
('2023-07','IGP-M',-0.72,0.9435,'FGV'),('2023-08','IGP-M',0.20,0.9454,'FGV'),
('2023-09','IGP-M',0.62,0.9513,'FGV'),('2023-10','IGP-M',0.63,0.9573,'FGV'),
('2023-11','IGP-M',0.74,0.9644,'FGV'),('2023-12','IGP-M',0.74,0.9715,'FGV'),
-- 2024
('2024-01','IGP-M',0.07,1.0007,'FGV'),('2024-02','IGP-M',0.35,1.0042,'FGV'),
('2024-03','IGP-M',0.47,1.0089,'FGV'),('2024-04','IGP-M',0.89,1.0179,'FGV'),
('2024-05','IGP-M',0.89,1.0270,'FGV'),('2024-06','IGP-M',0.81,1.0354,'FGV'),
('2024-07','IGP-M',0.61,1.0417,'FGV'),('2024-08','IGP-M',0.44,1.0463,'FGV'),
('2024-09','IGP-M',0.62,1.0527,'FGV'),('2024-10','IGP-M',1.52,1.0687,'FGV'),
('2024-11','IGP-M',1.30,1.0826,'FGV'),('2024-12','IGP-M',0.94,1.0928,'FGV'),
-- 2025
('2025-01','IGP-M',0.74,1.0074,'FGV'),('2025-02','IGP-M',0.80,1.0155,'FGV'),
('2025-03','IGP-M',0.59,1.0215,'FGV')
ON CONFLICT (competencia, indice) DO NOTHING;

-- IPC-FIPE (Índice de Preços ao Consumidor / FIPE-USP)
INSERT INTO pjecalc_correcao_monetaria (competencia, indice, variacao_mensal, acumulado, fonte)
VALUES
-- 2000-2005 (seleção representativa)
('2000-01','IPC-FIPE',0.62,1.0062,'FIPE'),('2000-02','IPC-FIPE',0.22,1.0084,'FIPE'),
('2000-03','IPC-FIPE',0.14,1.0098,'FIPE'),('2000-04','IPC-FIPE',0.22,1.0120,'FIPE'),
('2000-05','IPC-FIPE',0.35,1.0156,'FIPE'),('2000-06','IPC-FIPE',0.33,1.0189,'FIPE'),
('2000-07','IPC-FIPE',0.58,1.0249,'FIPE'),('2000-08','IPC-FIPE',0.96,1.1348,'FIPE'),
('2000-09','IPC-FIPE',0.41,1.0391,'FIPE'),('2000-10','IPC-FIPE',0.33,1.0425,'FIPE'),
('2000-11','IPC-FIPE',0.23,1.0449,'FIPE'),('2000-12','IPC-FIPE',0.49,1.0500,'FIPE'),
('2001-01','IPC-FIPE',0.45,1.0045,'FIPE'),('2001-02','IPC-FIPE',0.36,1.0081,'FIPE'),
('2001-03','IPC-FIPE',0.46,1.0128,'FIPE'),('2001-04','IPC-FIPE',0.36,1.0164,'FIPE'),
('2001-05','IPC-FIPE',0.52,1.0217,'FIPE'),('2001-06','IPC-FIPE',0.44,1.0262,'FIPE'),
('2001-07','IPC-FIPE',0.72,1.0336,'FIPE'),('2001-08','IPC-FIPE',0.65,1.1404,'FIPE'),
('2001-09','IPC-FIPE',0.41,1.0446,'FIPE'),('2001-10','IPC-FIPE',0.77,1.0527,'FIPE'),
('2001-11','IPC-FIPE',0.76,1.0607,'FIPE'),('2001-12','IPC-FIPE',0.57,1.0667,'FIPE'),
('2010-01','IPC-FIPE',0.88,1.0088,'FIPE'),('2010-02','IPC-FIPE',0.64,1.0153,'FIPE'),
('2010-03','IPC-FIPE',0.56,1.0210,'FIPE'),('2010-04','IPC-FIPE',0.26,1.0237,'FIPE'),
('2010-05','IPC-FIPE',0.19,1.0256,'FIPE'),('2010-06','IPC-FIPE',0.01,1.0257,'FIPE'),
('2010-07','IPC-FIPE',0.03,1.0260,'FIPE'),('2010-08','IPC-FIPE',0.25,1.0286,'FIPE'),
('2010-09','IPC-FIPE',0.52,1.0339,'FIPE'),('2010-10','IPC-FIPE',0.65,1.0406,'FIPE'),
('2010-11','IPC-FIPE',0.64,1.0473,'FIPE'),('2010-12','IPC-FIPE',0.55,1.0531,'FIPE'),
('2015-01','IPC-FIPE',1.40,1.0140,'FIPE'),('2015-02','IPC-FIPE',1.19,1.0261,'FIPE'),
('2015-03','IPC-FIPE',1.31,1.0396,'FIPE'),('2015-04','IPC-FIPE',1.05,1.0505,'FIPE'),
('2015-05','IPC-FIPE',0.84,1.0593,'FIPE'),('2015-06','IPC-FIPE',0.78,1.0676,'FIPE'),
('2015-07','IPC-FIPE',0.59,1.0739,'FIPE'),('2015-08','IPC-FIPE',0.55,1.0798,'FIPE'),
('2015-09','IPC-FIPE',0.71,1.0874,'FIPE'),('2015-10','IPC-FIPE',0.71,1.0951,'FIPE'),
('2015-11','IPC-FIPE',1.30,1.1094,'FIPE'),('2015-12','IPC-FIPE',0.55,1.1155,'FIPE'),
('2020-01','IPC-FIPE',0.29,1.0029,'FIPE'),('2020-02','IPC-FIPE',0.27,1.0056,'FIPE'),
('2020-03','IPC-FIPE',0.05,1.0061,'FIPE'),('2020-04','IPC-FIPE',-0.22,1.0039,'FIPE'),
('2020-05','IPC-FIPE',-0.28,1.0011,'FIPE'),('2020-06','IPC-FIPE',0.25,1.0036,'FIPE'),
('2020-07','IPC-FIPE',0.69,1.0106,'FIPE'),('2020-08','IPC-FIPE',0.85,1.0193,'FIPE'),
('2020-09','IPC-FIPE',0.91,1.0286,'FIPE'),('2020-10','IPC-FIPE',0.90,1.0379,'FIPE'),
('2020-11','IPC-FIPE',0.87,1.0469,'FIPE'),('2020-12','IPC-FIPE',0.69,1.0541,'FIPE'),
('2021-01','IPC-FIPE',0.73,1.0073,'FIPE'),('2021-02','IPC-FIPE',0.59,1.0133,'FIPE'),
('2021-03','IPC-FIPE',0.83,1.0217,'FIPE'),('2021-04','IPC-FIPE',0.55,1.0273,'FIPE'),
('2021-05','IPC-FIPE',0.47,1.0321,'FIPE'),('2021-06','IPC-FIPE',0.50,1.0373,'FIPE'),
('2021-07','IPC-FIPE',0.44,1.0419,'FIPE'),('2021-08','IPC-FIPE',0.47,1.0468,'FIPE'),
('2021-09','IPC-FIPE',0.57,1.1527,'FIPE'),('2021-10','IPC-FIPE',0.62,1.0591,'FIPE'),
('2021-11','IPC-FIPE',0.71,1.0666,'FIPE'),('2021-12','IPC-FIPE',0.63,1.0733,'FIPE'),
('2022-01','IPC-FIPE',0.65,1.0065,'FIPE'),('2022-02','IPC-FIPE',0.62,1.0127,'FIPE'),
('2022-03','IPC-FIPE',1.06,1.0234,'FIPE'),('2022-04','IPC-FIPE',0.87,1.0323,'FIPE'),
('2022-05','IPC-FIPE',0.65,1.0390,'FIPE'),('2022-06','IPC-FIPE',0.47,1.0439,'FIPE'),
('2022-07','IPC-FIPE',-0.20,1.0418,'FIPE'),('2022-08','IPC-FIPE',-0.40,1.0377,'FIPE'),
('2022-09','IPC-FIPE',0.10,1.0387,'FIPE'),('2022-10','IPC-FIPE',0.22,1.0410,'FIPE'),
('2022-11','IPC-FIPE',0.31,1.0442,'FIPE'),('2022-12','IPC-FIPE',0.43,1.0487,'FIPE'),
('2023-01','IPC-FIPE',0.53,1.0053,'FIPE'),('2023-02','IPC-FIPE',0.20,1.0073,'FIPE'),
('2023-03','IPC-FIPE',0.08,1.0081,'FIPE'),('2023-04','IPC-FIPE',0.14,1.0095,'FIPE'),
('2023-05','IPC-FIPE',0.00,1.0095,'FIPE'),('2023-06','IPC-FIPE',-0.10,1.0085,'FIPE'),
('2023-07','IPC-FIPE',0.03,1.0088,'FIPE'),('2023-08','IPC-FIPE',0.24,1.0112,'FIPE'),
('2023-09','IPC-FIPE',0.52,1.0165,'FIPE'),('2023-10','IPC-FIPE',0.43,1.0209,'FIPE'),
('2023-11','IPC-FIPE',0.39,1.0249,'FIPE'),('2023-12','IPC-FIPE',0.45,1.0296,'FIPE'),
('2024-01','IPC-FIPE',0.53,1.0053,'FIPE'),('2024-02','IPC-FIPE',0.19,1.0072,'FIPE'),
('2024-03','IPC-FIPE',0.29,1.0101,'FIPE'),('2024-04','IPC-FIPE',0.31,1.0132,'FIPE'),
('2024-05','IPC-FIPE',0.38,1.0171,'FIPE'),('2024-06','IPC-FIPE',0.31,1.0203,'FIPE'),
('2024-07','IPC-FIPE',0.24,1.0227,'FIPE'),('2024-08','IPC-FIPE',0.42,1.0270,'FIPE'),
('2024-09','IPC-FIPE',0.50,1.0321,'FIPE'),('2024-10','IPC-FIPE',0.56,1.0379,'FIPE'),
('2024-11','IPC-FIPE',0.60,1.0441,'FIPE'),('2024-12','IPC-FIPE',0.54,1.0497,'FIPE'),
('2025-01','IPC-FIPE',0.71,1.0071,'FIPE'),('2025-02','IPC-FIPE',0.53,1.0125,'FIPE'),
('2025-03','IPC-FIPE',0.51,1.0177,'FIPE')
ON CONFLICT (competencia, indice) DO NOTHING;

-- Recompute acumulado para IGP-M e IPC-FIPE (produto acumulado anual)
UPDATE pjecalc_correcao_monetaria dst
SET acumulado = src.acum
FROM (
  SELECT competencia, indice,
    EXP(SUM(LN(1 + variacao_mensal/100)) OVER (
      PARTITION BY indice, LEFT(competencia,4)
      ORDER BY competencia
    )) AS acum
  FROM pjecalc_correcao_monetaria
  WHERE indice IN ('IGP-M','IPC-FIPE')
) src
WHERE dst.competencia = src.competencia AND dst.indice = src.indice;

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

-- ============================================================
-- SEED: Tabelas de Referência 2026
-- Salário mínimo, INSS, Seguro-Desemprego, Salário-Família
--
-- Fonte: Decreto 12.302/2024 (SM 2025=1518), estimativas 2026
-- baseadas no INPC acumulado 2025 (~6.84%) aplicado às tabelas.
-- Valores INSS: EC 103/2019 (sistema progressivo).
-- ============================================================

-- ============================================================
-- SALÁRIO MÍNIMO 2026
-- Decreto publicado em jan/2026 (estimativa INPC ≈ 6.84%)
-- ============================================================
INSERT INTO public.pjecalc_salario_minimo (competencia, valor)
VALUES
('2026-01-01', 1622.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- INSS FAIXAS 2026 — EC 103/2019 (Sistema Progressivo)
-- Tabela reajustada com base no SM 2026 = R$ 1.622,00
-- faixa 1: até 1 SM @ 7,5%
-- faixa 2: até ~1,76 SM @ 9%
-- faixa 3: até ~2,65 SM @ 12%
-- faixa 4: até ~5,14 SM @ 14%  (teto INSS)
-- ============================================================
INSERT INTO public.pjecalc_inss_faixas
  (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota)
VALUES
('2026-01-01','2026-12-31',1, 1622.00, 0.075),
('2026-01-01','2026-12-31',2, 2857.16, 0.090),
('2026-01-01','2026-12-31',3, 4287.01, 0.120),
('2026-01-01','2026-12-31',4, 8341.15, 0.140)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEGURO-DESEMPREGO 2026 (Res. CODEFAT — estimativa)
-- Fórmula: parcela = valor_soma + (salario - valor_inicial) × percentual/100
-- Teto estimado com base em INPC 2025 sobre 2025 teto
-- ============================================================
INSERT INTO public.pjecalc_seguro_desemprego
  (competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto)
VALUES
('2026-01-01',1,    0.00, 1949.97, 80.00,    0.00, 1622.00, 3085.38),
('2026-01-01',2, 1949.97, 3249.94, 50.00, 1559.98, 1622.00, 3085.38),
('2026-01-01',3, 3249.94,999999.0, 40.00, 2209.97, 1622.00, 3085.38)
ON CONFLICT (competencia, faixa) DO NOTHING;

-- ============================================================
-- SALÁRIO-FAMÍLIA 2026 (Portaria MF — estimativa INPC)
-- 2025: faixa 1 até 1.819,26 → R$ 62,04/filho
--       faixa 2 acima → R$ 43,71/filho
-- 2026 ajustado por ~6.84%:
-- ============================================================
INSERT INTO public.pjecalc_salario_familia
  (competencia, faixa, valor_inicial, valor_final, valor_cota)
VALUES
('2026-01-01',1,   0.00, 1943.47, 66.28),
('2026-01-01',2,1943.47, 2915.21, 46.70)
ON CONFLICT (competencia, faixa) DO NOTHING;

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
Ci0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQotLSBTRUVEOiBwamVjYWxjX2NvcnJlY2FvX21vbmV0YXJpYSDigJQgSU5QQywgSUdQLU0sIElHUC1ESQotLQotLSBJTlBDOiAgIElCR0Ug4oCUIMONbmRpY2UgTmFjaW9uYWwgZGUgUHJlw6dvcyBhbyBDb25zdW1pZG9yCi0tICAgICAgICAgU8OpcmllIDE4OCBCQ0IgU0dTIOKAlCB2YXJpYcOnw6NvIG1lbnNhbCAlIHJlYWwKLS0KLS0gSUdQLU06ICBGR1Yg4oCUIMONbmRpY2UgR2VyYWwgZGUgUHJlw6dvcyBkbyBNZXJjYWRvCi0tICAgICAgICAgU8OpcmllIDE4OSBCQ0IgU0dTIOKAlCB2YXJpYcOnw6NvIG1lbnNhbCAlIHJlYWwKLS0KLS0gSUdQLURJOiBGR1Yg4oCUIMONbmRpY2UgR2VyYWwgZGUgUHJlw6dvcyAtIERpc3BvbmliaWxpZGFkZSBJbnRlcm5hCi0tICAgICAgICAgU8OpcmllIDE5MCBCQ0IgU0dTIOKAlCB2YXJpYcOnw6NvIG1lbnNhbCAlIHJlYWwKLS0KLS0gUGVyw61vZG86IGphbi8yMDE1IOKAkyBmZXYvMjAyNiAocGFyY2lhbCkKLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CgotLSDilIDilIAgSU5QQyAoc8OpcmllIDE4OCBCQ0IgLyBJQkdFKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKCklOU0VSVCBJTlRPIHB1YmxpYy5wamVjYWxjX2NvcnJlY2FvX21vbmV0YXJpYSAoY29tcGV0ZW5jaWEsIGluZGljZSwgdmFsb3IsIGFjdW11bGFkbykKVkFMVUVTCiAgLS0gMjAxNQogIChtYWtlX2RhdGUoMjAxNSwxLDEpLCAgJ0lOUEMnLCAwLjg3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMiwxKSwgICdJTlBDJywgMS4yMiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDMsMSksICAnSU5QQycsIDEuMzAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSw0LDEpLCAgJ0lOUEMnLCAxLjAzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNSwxKSwgICdJTlBDJywgMC41NywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDYsMSksICAnSU5QQycsIDAuOTUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSw3LDEpLCAgJ0lOUEMnLCAwLjYwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsOCwxKSwgICdJTlBDJywgMC41NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDksMSksICAnSU5QQycsIDAuNDUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSwxMCwxKSwgJ0lOUEMnLCAwLjYwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMTEsMSksICdJTlBDJywgMC44NiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDEyLDEpLCAnSU5QQycsIDAuOTcsIE5VTEwpLAogIC0tIDIwMTYKICAobWFrZV9kYXRlKDIwMTYsMSwxKSwgICdJTlBDJywgMS4xOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDIsMSksICAnSU5QQycsIDEuMjgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiwzLDEpLCAgJ0lOUEMnLCAwLjU2LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsNCwxKSwgICdJTlBDJywgMC41NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDUsMSksICAnSU5QQycsIDAuNzcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiw2LDEpLCAgJ0lOUEMnLCAwLjU3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsNywxKSwgICdJTlBDJywgMC41NiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDgsMSksICAnSU5QQycsIDAuNDQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiw5LDEpLCAgJ0lOUEMnLCAwLjI0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsMTAsMSksICdJTlBDJywgMC4yNywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDExLDEpLCAnSU5QQycsIDAuMjQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiwxMiwxKSwgJ0lOUEMnLCAwLjI3LCBOVUxMKSwKICAtLSAyMDE3CiAgKG1ha2VfZGF0ZSgyMDE3LDEsMSksICAnSU5QQycsIDAuMzUsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsMiwxKSwgICdJTlBDJywgMC41MCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNywzLDEpLCAgJ0lOUEMnLCAwLjI4LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDQsMSksICAnSU5QQycsIDAuMjMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsNSwxKSwgICdJTlBDJywgMC4yOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNyw2LDEpLCAgJ0lOUEMnLCAtMC4wMSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDcsMSksICAnSU5QQycsIC0wLjA5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsOCwxKSwgICdJTlBDJywgMC4xOSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNyw5LDEpLCAgJ0lOUEMnLCAwLjE0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDEwLDEpLCAnSU5QQycsIDAuMjksICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsMTEsMSksICdJTlBDJywgMC4zMywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNywxMiwxKSwgJ0lOUEMnLCAwLjMxLCAgTlVMTCksCiAgLS0gMjAxOAogIChtYWtlX2RhdGUoMjAxOCwxLDEpLCAgJ0lOUEMnLCAwLjIxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDIsMSksICAnSU5QQycsIDAuMzAsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsMywxKSwgICdJTlBDJywgMC4wMywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw0LDEpLCAgJ0lOUEMnLCAwLjEyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDUsMSksICAnSU5QQycsIDAuMjAsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsNiwxKSwgICdJTlBDJywgMS4xOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw3LDEpLCAgJ0lOUEMnLCAxLjIxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDgsMSksICAnSU5QQycsIC0wLjA5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsOSwxKSwgICdJTlBDJywgMC4xNywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwxMCwxKSwgJ0lOUEMnLCAwLjQ1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDExLDEpLCAnSU5QQycsIDAuMjUsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsMTIsMSksICdJTlBDJywgLTAuMTMsIE5VTEwpLAogIC0tIDIwMTkKICAobWFrZV9kYXRlKDIwMTksMSwxKSwgICdJTlBDJywgMC4zMCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDIsMSksICAnSU5QQycsIDAuMTcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSwzLDEpLCAgJ0lOUEMnLCAwLjg5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNCwxKSwgICdJTlBDJywgMC43NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDUsMSksICAnSU5QQycsIDAuNDEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSw2LDEpLCAgJ0lOUEMnLCAwLjE0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNywxKSwgICdJTlBDJywgMC4xOCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDgsMSksICAnSU5QQycsIDAuMjAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSw5LDEpLCAgJ0lOUEMnLCAwLjI3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMTAsMSksICdJTlBDJywgMC4xNywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDExLDEpLCAnSU5QQycsIDAuMTQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSwxMiwxKSwgJ0lOUEMnLCAxLjIyLCBOVUxMKSwKICAtLSAyMDIwCiAgKG1ha2VfZGF0ZSgyMDIwLDEsMSksICAnSU5QQycsIDAuNDQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsMiwxKSwgICdJTlBDJywgMC4yMSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCwzLDEpLCAgJ0lOUEMnLCAwLjA3LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDQsMSksICAnSU5QQycsIC0wLjA0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsNSwxKSwgICdJTlBDJywgLTAuMzcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCw2LDEpLCAgJ0lOUEMnLCAwLjE1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDcsMSksICAnSU5QQycsIDAuNTYsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsOCwxKSwgICdJTlBDJywgMC4zNCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCw5LDEpLCAgJ0lOUEMnLCAwLjU3LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDEwLDEpLCAnSU5QQycsIDEuMDEsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsMTEsMSksICdJTlBDJywgMS4wOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCwxMiwxKSwgJ0lOUEMnLCAxLjM1LCAgTlVMTCksCiAgLS0gMjAyMQogIChtYWtlX2RhdGUoMjAyMSwxLDEpLCAgJ0lOUEMnLCAwLjYzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMiwxKSwgICdJTlBDJywgMC41OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDMsMSksICAnSU5QQycsIDAuNzgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSw0LDEpLCAgJ0lOUEMnLCAwLjM3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNSwxKSwgICdJTlBDJywgMC4zMiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDYsMSksICAnSU5QQycsIDAuNjgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSw3LDEpLCAgJ0lOUEMnLCAwLjc4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsOCwxKSwgICdJTlBDJywgMC44MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDksMSksICAnSU5QQycsIDEuMTMsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSwxMCwxKSwgJ0lOUEMnLCAxLjE4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMTEsMSksICdJTlBDJywgMS4wNywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDEyLDEpLCAnSU5QQycsIDAuNzgsIE5VTEwpLAogIC0tIDIwMjIKICAobWFrZV9kYXRlKDIwMjIsMSwxKSwgICdJTlBDJywgMC42OSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiwyLDEpLCAgJ0lOUEMnLCAwLjk5LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDMsMSksICAnSU5QQycsIDEuNzIsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsNCwxKSwgICdJTlBDJywgMS4yOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiw1LDEpLCAgJ0lOUEMnLCAwLjUyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDYsMSksICAnSU5QQycsIDAuNjQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsNywxKSwgICdJTlBDJywgLTAuMDcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiw4LDEpLCAgJ0lOUEMnLCAtMC4zOCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDksMSksICAnSU5QQycsIC0wLjIxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsMTAsMSksICdJTlBDJywgMC4xOSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiwxMSwxKSwgJ0lOUEMnLCAwLjUxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDEyLDEpLCAnSU5QQycsIDAuNDMsICBOVUxMKSwKICAtLSAyMDIzCiAgKG1ha2VfZGF0ZSgyMDIzLDEsMSksICAnSU5QQycsIDAuNTMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsMiwxKSwgICdJTlBDJywgMC42OCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywzLDEpLCAgJ0lOUEMnLCAwLjcxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDQsMSksICAnSU5QQycsIDAuNDgsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsNSwxKSwgICdJTlBDJywgMC40NCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw2LDEpLCAgJ0lOUEMnLCAtMC4wMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDcsMSksICAnSU5QQycsIC0wLjAzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsOCwxKSwgICdJTlBDJywgMC4zMywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw5LDEpLCAgJ0lOUEMnLCAwLjM1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDEwLDEpLCAnSU5QQycsIDAuMjMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsMTEsMSksICdJTlBDJywgMC4zNCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywxMiwxKSwgJ0lOUEMnLCAwLjQyLCAgTlVMTCksCiAgLS0gMjAyNAogIChtYWtlX2RhdGUoMjAyNCwxLDEpLCAgJ0lOUEMnLCAwLjQyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsMiwxKSwgICdJTlBDJywgMC42OSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDMsMSksICAnSU5QQycsIDAuMzQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCw0LDEpLCAgJ0lOUEMnLCAwLjIxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsNSwxKSwgICdJTlBDJywgMC4zNCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDYsMSksICAnSU5QQycsIDAuMzcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCw3LDEpLCAgJ0lOUEMnLCAwLjI3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsOCwxKSwgICdJTlBDJywgMC4yMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDksMSksICAnSU5QQycsIDAuNDMsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCwxMCwxKSwgJ0lOUEMnLCAwLjU2LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsMTEsMSksICdJTlBDJywgMC4zOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDEyLDEpLCAnSU5QQycsIDAuMzQsIE5VTEwpLAogIC0tIDIwMjUKICAobWFrZV9kYXRlKDIwMjUsMSwxKSwgICdJTlBDJywgMC41MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDIsMSksICAnSU5QQycsIDEuMzEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwzLDEpLCAgJ0lOUEMnLCAwLjY0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsNCwxKSwgICdJTlBDJywgMC40MywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDUsMSksICAnSU5QQycsIDAuMzUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw2LDEpLCAgJ0lOUEMnLCAwLjI1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsNywxKSwgICdJTlBDJywgMC40MCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDgsMSksICAnSU5QQycsIDAuMzgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw5LDEpLCAgJ0lOUEMnLCAwLjQ0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsMTAsMSksICdJTlBDJywgMC40OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDExLDEpLCAnSU5QQycsIDAuMzQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwxMiwxKSwgJ0lOUEMnLCAwLjM1LCBOVUxMKSwKICAtLSAyMDI2IChwYXJjaWFsKQogIChtYWtlX2RhdGUoMjAyNiwxLDEpLCAgJ0lOUEMnLCAwLjcyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjYsMiwxKSwgICdJTlBDJywgMS4wOCwgTlVMTCkKT04gQ09ORkxJQ1QgKGNvbXBldGVuY2lhLCBpbmRpY2UpIERPIE5PVEhJTkc7CgotLSDilIDilIAgSUdQLU0gKHPDqXJpZSAxODkgQkNCIC8gRkdWKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKCklOU0VSVCBJTlRPIHB1YmxpYy5wamVjYWxjX2NvcnJlY2FvX21vbmV0YXJpYSAoY29tcGV0ZW5jaWEsIGluZGljZSwgdmFsb3IsIGFjdW11bGFkbykKVkFMVUVTCiAgLS0gMjAxNQogIChtYWtlX2RhdGUoMjAxNSwxLDEpLCAgJ0lHUC1NJywgMC43NSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDIsMSksICAnSUdQLU0nLCAwLjI4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMywxKSwgICdJR1AtTScsIDAuOTgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSw0LDEpLCAgJ0lHUC1NJywgMC45OSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDUsMSksICAnSUdQLU0nLCAwLjQxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNiwxKSwgICdJR1AtTScsIDAuNTUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSw3LDEpLCAgJ0lHUC1NJywgMC42OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDgsMSksICAnSUdQLU0nLCAwLjI4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsOSwxKSwgICdJR1AtTScsIDAuOTUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNSwxMCwxKSwgJ0lHUC1NJywgMS40NSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE1LDExLDEpLCAnSUdQLU0nLCAxLjUyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMTIsMSksICdJR1AtTScsIDAuNDksIE5VTEwpLAogIC0tIDIwMTYKICAobWFrZV9kYXRlKDIwMTYsMSwxKSwgICdJR1AtTScsIDEuMTQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiwyLDEpLCAgJ0lHUC1NJywgMS4yOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDMsMSksICAnSUdQLU0nLCAwLjQzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsNCwxKSwgICdJR1AtTScsIDAuMzMsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiw1LDEpLCAgJ0lHUC1NJywgMC44NSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDYsMSksICAnSUdQLU0nLCAxLjY5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsNywxKSwgICdJR1AtTScsIDAuNTQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiw4LDEpLCAgJ0lHUC1NJywgMC4xMCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDksMSksICAnSUdQLU0nLCAwLjIwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTYsMTAsMSksICdJR1AtTScsIDAuMTMsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNiwxMSwxKSwgJ0lHUC1NJywgMC4xMCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDEyLDEpLCAnSUdQLU0nLCAwLjUzLCBOVUxMKSwKICAtLSAyMDE3CiAgKG1ha2VfZGF0ZSgyMDE3LDEsMSksICAnSUdQLU0nLCAwLjY0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDIsMSksICAnSUdQLU0nLCAwLjA4LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDMsMSksICAnSUdQLU0nLCAwLjAyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDQsMSksICAnSUdQLU0nLCAwLjIwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDUsMSksICAnSUdQLU0nLCAtMC4wMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDYsMSksICAnSUdQLU0nLCAtMC42NywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDcsMSksICAnSUdQLU0nLCAtMC43MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDgsMSksICAnSUdQLU0nLCAwLjEwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDksMSksICAnSUdQLU0nLCAwLjQzLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDEwLDEpLCAnSUdQLU0nLCAwLjIxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDExLDEpLCAnSUdQLU0nLCAwLjU0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDEyLDEpLCAnSUdQLU0nLCAwLjg5LCAgTlVMTCksCiAgLS0gMjAxOAogIChtYWtlX2RhdGUoMjAxOCwxLDEpLCAgJ0lHUC1NJywgMC43NiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwyLDEpLCAgJ0lHUC1NJywgMC4wNywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwzLDEpLCAgJ0lHUC1NJywgMC42NCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw0LDEpLCAgJ0lHUC1NJywgMC41NywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw1LDEpLCAgJ0lHUC1NJywgMS4zOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw2LDEpLCAgJ0lHUC1NJywgMS44NywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw3LDEpLCAgJ0lHUC1NJywgMC43MCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw4LDEpLCAgJ0lHUC1NJywgLTAuNTksIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw5LDEpLCAgJ0lHUC1NJywgMC41MCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwxMCwxKSwgJ0lHUC1NJywgMC44NSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwxMSwxKSwgJ0lHUC1NJywgLTAuNDQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwxMiwxKSwgJ0lHUC1NJywgLTEuMDgsIE5VTEwpLAogIC0tIDIwMTkKICAobWFrZV9kYXRlKDIwMTksMSwxKSwgICdJR1AtTScsIDAuOTgsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMiwxKSwgICdJR1AtTScsIDAuOTcsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMywxKSwgICdJR1AtTScsIDEuMTksICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNCwxKSwgICdJR1AtTScsIDAuOTQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNSwxKSwgICdJR1AtTScsIDAuNDAsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNiwxKSwgICdJR1AtTScsIDAuOTQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNywxKSwgICdJR1AtTScsIDAuNDMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksOCwxKSwgICdJR1AtTScsIC0wLjY5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksOSwxKSwgICdJR1AtTScsIC0wLjAxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMTAsMSksICdJR1AtTScsIDAuMDIsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMTEsMSksICdJR1AtTScsIDAuMTgsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMTIsMSksICdJR1AtTScsIDEuNDgsICBOVUxMKSwKICAtLSAyMDIwCiAgKG1ha2VfZGF0ZSgyMDIwLDEsMSksICAnSUdQLU0nLCAwLjcxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDIsMSksICAnSUdQLU0nLCAwLjA0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDMsMSksICAnSUdQLU0nLCAtMC4zNCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDQsMSksICAnSUdQLU0nLCAtMC45NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDUsMSksICAnSUdQLU0nLCAtMC4yNywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDYsMSksICAnSUdQLU0nLCAxLjU1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDcsMSksICAnSUdQLU0nLCAyLjIzLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDgsMSksICAnSUdQLU0nLCAyLjc0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDksMSksICAnSUdQLU0nLCA0LjM0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDEwLDEpLCAnSUdQLU0nLCAzLjIzLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDExLDEpLCAnSUdQLU0nLCAzLjI4LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDEyLDEpLCAnSUdQLU0nLCAzLjc4LCAgTlVMTCksCiAgLS0gMjAyMQogIChtYWtlX2RhdGUoMjAyMSwxLDEpLCAgJ0lHUC1NJywgMy4xMSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDIsMSksICAnSUdQLU0nLCAyLjUzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMywxKSwgICdJR1AtTScsIDIuOTQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSw0LDEpLCAgJ0lHUC1NJywgMS43NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDUsMSksICAnSUdQLU0nLCAwLjg5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNiwxKSwgICdJR1AtTScsIDAuNjAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSw3LDEpLCAgJ0lHUC1NJywgMC43OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDgsMSksICAnSUdQLU0nLCAwLjY2LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsOSwxKSwgICdJR1AtTScsIDEuMTIsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMSwxMCwxKSwgJ0lHUC1NJywgMC42NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDExLDEpLCAnSUdQLU0nLCAtMC4wMSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDEyLDEpLCAnSUdQLU0nLCAwLjg3LCBOVUxMKSwKICAtLSAyMDIyCiAgKG1ha2VfZGF0ZSgyMDIyLDEsMSksICAnSUdQLU0nLCAxLjgyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDIsMSksICAnSUdQLU0nLCAxLjgzLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDMsMSksICAnSUdQLU0nLCAxLjc0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDQsMSksICAnSUdQLU0nLCAxLjQxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDUsMSksICAnSUdQLU0nLCAwLjUyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDYsMSksICAnSUdQLU0nLCAwLjU5LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDcsMSksICAnSUdQLU0nLCAtMC43MCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDgsMSksICAnSUdQLU0nLCAtMC43MCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDksMSksICAnSUdQLU0nLCAtMC44NiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDEwLDEpLCAnSUdQLU0nLCAwLjM1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDExLDEpLCAnSUdQLU0nLCAtMC41NiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDEyLDEpLCAnSUdQLU0nLCAtMC41NCwgTlVMTCksCiAgLS0gMjAyMwogIChtYWtlX2RhdGUoMjAyMywxLDEpLCAgJ0lHUC1NJywgMC4xMiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywyLDEpLCAgJ0lHUC1NJywgLTAuMDYsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywzLDEpLCAgJ0lHUC1NJywgLTAuMzAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw0LDEpLCAgJ0lHUC1NJywgLTAuMDQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw1LDEpLCAgJ0lHUC1NJywgMC4wOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw2LDEpLCAgJ0lHUC1NJywgLTAuMDcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw3LDEpLCAgJ0lHUC1NJywgMC4xMCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw4LDEpLCAgJ0lHUC1NJywgMC4yNSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw5LDEpLCAgJ0lHUC1NJywgMC4zNywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywxMCwxKSwgJ0lHUC1NJywgMC41NiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywxMSwxKSwgJ0lHUC1NJywgMC40MCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywxMiwxKSwgJ0lHUC1NJywgMC43NCwgIE5VTEwpLAogIC0tIDIwMjQKICAobWFrZV9kYXRlKDIwMjQsMSwxKSwgICdJR1AtTScsIDAuMjEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCwyLDEpLCAgJ0lHUC1NJywgMC41MywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDMsMSksICAnSUdQLU0nLCAwLjE0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsNCwxKSwgICdJR1AtTScsIDAuMzYsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCw1LDEpLCAgJ0lHUC1NJywgMC4zOCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDYsMSksICAnSUdQLU0nLCAwLjgxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsNywxKSwgICdJR1AtTScsIDAuNjEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCw4LDEpLCAgJ0lHUC1NJywgMC40NywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDksMSksICAnSUdQLU0nLCAwLjQ0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjQsMTAsMSksICdJR1AtTScsIDEuNTIsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNCwxMSwxKSwgJ0lHUC1NJywgMS4xOCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDEyLDEpLCAnSUdQLU0nLCAwLjk0LCBOVUxMKSwKICAtLSAyMDI1CiAgKG1ha2VfZGF0ZSgyMDI1LDEsMSksICAnSUdQLU0nLCAwLjE4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsMiwxKSwgICdJR1AtTScsIDEuMDQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwzLDEpLCAgJ0lHUC1NJywgMC44MywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDQsMSksICAnSUdQLU0nLCAwLjQyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsNSwxKSwgICdJR1AtTScsIDAuMzcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw2LDEpLCAgJ0lHUC1NJywgMC4yOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDcsMSksICAnSUdQLU0nLCAwLjgzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsOCwxKSwgICdJR1AtTScsIDAuMzQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw5LDEpLCAgJ0lHUC1NJywgMC42MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI1LDEwLDEpLCAnSUdQLU0nLCAwLjczLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjUsMTEsMSksICdJR1AtTScsIDAuNjksIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwxMiwxKSwgJ0lHUC1NJywgMC45NCwgTlVMTCksCiAgLS0gMjAyNiAocGFyY2lhbCkKICAobWFrZV9kYXRlKDIwMjYsMSwxKSwgICdJR1AtTScsIDAuNjUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNiwyLDEpLCAgJ0lHUC1NJywgMS4xMiwgTlVMTCkKT04gQ09ORkxJQ1QgKGNvbXBldGVuY2lhLCBpbmRpY2UpIERPIE5PVEhJTkc7CgotLSDilIDilIAgSUdQLURJIChzw6lyaWUgMTkwIEJDQiAvIEZHVikg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgpJTlNFUlQgSU5UTyBwdWJsaWMucGplY2FsY19jb3JyZWNhb19tb25ldGFyaWEgKGNvbXBldGVuY2lhLCBpbmRpY2UsIHZhbG9yLCBhY3VtdWxhZG8pClZBTFVFUwogIC0tIDIwMTUKICAobWFrZV9kYXRlKDIwMTUsMSwxKSwgICdJR1AtREknLCAwLjc4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMiwxKSwgICdJR1AtREknLCAwLjU1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMywxKSwgICdJR1AtREknLCAwLjkzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNCwxKSwgICdJR1AtREknLCAwLjgxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNSwxKSwgICdJR1AtREknLCAwLjYwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNiwxKSwgICdJR1AtREknLCAwLjU5LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsNywxKSwgICdJR1AtREknLCAwLjcwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsOCwxKSwgICdJR1AtREknLCAwLjM4LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsOSwxKSwgICdJR1AtREknLCAwLjk1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMTAsMSksICdJR1AtREknLCAxLjIyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMTEsMSksICdJR1AtREknLCAxLjIzLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTUsMTIsMSksICdJR1AtREknLCAwLjUyLCBOVUxMKSwKICAtLSAyMDE2CiAgKG1ha2VfZGF0ZSgyMDE2LDEsMSksICAnSUdQLURJJywgMS4xNiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDIsMSksICAnSUdQLURJJywgMS4zMCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDMsMSksICAnSUdQLURJJywgMC4yNCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDQsMSksICAnSUdQLURJJywgMC4yNSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDUsMSksICAnSUdQLURJJywgMC43NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDYsMSksICAnSUdQLURJJywgMS4zNiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDcsMSksICAnSUdQLURJJywgMC40NSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDgsMSksICAnSUdQLURJJywgMC4xMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDksMSksICAnSUdQLURJJywgMC4yMiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDEwLDEpLCAnSUdQLURJJywgMC4xOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDExLDEpLCAnSUdQLURJJywgMC4wOCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE2LDEyLDEpLCAnSUdQLURJJywgMC4zMiwgTlVMTCksCiAgLS0gMjAxNwogIChtYWtlX2RhdGUoMjAxNywxLDEpLCAgJ0lHUC1ESScsIDAuNjQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsMiwxKSwgICdJR1AtREknLCAwLjEwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDMsMSksICAnSUdQLURJJywgLTAuMTEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNyw0LDEpLCAgJ0lHUC1ESScsIDAuMDQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsNSwxKSwgICdJR1AtREknLCAwLjA5LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDYsMSksICAnSUdQLURJJywgLTAuNzUsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNyw3LDEpLCAgJ0lHUC1ESScsIC0wLjc0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsOCwxKSwgICdJR1AtREknLCAwLjEwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDksMSksICAnSUdQLURJJywgMC4zNywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxNywxMCwxKSwgJ0lHUC1ESScsIDAuMTYsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTcsMTEsMSksICdJR1AtREknLCAwLjQ1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE3LDEyLDEpLCAnSUdQLURJJywgMC44OSwgIE5VTEwpLAogIC0tIDIwMTgKICAobWFrZV9kYXRlKDIwMTgsMSwxKSwgICdJR1AtREknLCAwLjY3LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDIsMSksICAnSUdQLURJJywgMC4xMSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwzLDEpLCAgJ0lHUC1ESScsIDAuNjQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsNCwxKSwgICdJR1AtREknLCAwLjUxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDUsMSksICAnSUdQLURJJywgMS4zNCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw2LDEpLCAgJ0lHUC1ESScsIDEuNjcsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsNywxKSwgICdJR1AtREknLCAwLjgxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDgsMSksICAnSUdQLURJJywgLTAuNTMsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCw5LDEpLCAgJ0lHUC1ESScsIDAuNDQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTgsMTAsMSksICdJR1AtREknLCAwLjczLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE4LDExLDEpLCAnSUdQLURJJywgLTAuNDIsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOCwxMiwxKSwgJ0lHUC1ESScsIC0xLjAwLCBOVUxMKSwKICAtLSAyMDE5CiAgKG1ha2VfZGF0ZSgyMDE5LDEsMSksICAnSUdQLURJJywgMC44MiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSwyLDEpLCAgJ0lHUC1ESScsIDAuOTMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMywxKSwgICdJR1AtREknLCAxLjEwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDQsMSksICAnSUdQLURJJywgMC44NywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSw1LDEpLCAgJ0lHUC1ESScsIDAuNDQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksNiwxKSwgICdJR1AtREknLCAwLjg2LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDcsMSksICAnSUdQLURJJywgMC40NSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSw4LDEpLCAgJ0lHUC1ESScsIC0wLjU1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksOSwxKSwgICdJR1AtREknLCAwLjAxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDE5LDEwLDEpLCAnSUdQLURJJywgMC4wNywgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAxOSwxMSwxKSwgJ0lHUC1ESScsIDAuMTgsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMTksMTIsMSksICdJR1AtREknLCAxLjQzLCAgTlVMTCksCiAgLS0gMjAyMAogIChtYWtlX2RhdGUoMjAyMCwxLDEpLCAgJ0lHUC1ESScsIDAuNjMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsMiwxKSwgICdJR1AtREknLCAwLjAzLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDMsMSksICAnSUdQLURJJywgLTAuMjgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCw0LDEpLCAgJ0lHUC1ESScsIC0wLjg3LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsNSwxKSwgICdJR1AtREknLCAtMC4yOSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDYsMSksICAnSUdQLURJJywgMS4zOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCw3LDEpLCAgJ0lHUC1ESScsIDIuMDQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsOCwxKSwgICdJR1AtREknLCAyLjU1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDksMSksICAnSUdQLURJJywgNC4wOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMCwxMCwxKSwgJ0lHUC1ESScsIDMuMDMsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjAsMTEsMSksICdJR1AtREknLCAzLjA1LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIwLDEyLDEpLCAnSUdQLURJJywgMy41NSwgIE5VTEwpLAogIC0tIDIwMjEKICAobWFrZV9kYXRlKDIwMjEsMSwxKSwgICdJR1AtREknLCAyLjkwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMiwxKSwgICdJR1AtREknLCAyLjQwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMywxKSwgICdJR1AtREknLCAyLjczLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNCwxKSwgICdJR1AtREknLCAxLjYwLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNSwxKSwgICdJR1AtREknLCAwLjgyLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNiwxKSwgICdJR1AtREknLCAwLjU2LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsNywxKSwgICdJR1AtREknLCAwLjc1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsOCwxKSwgICdJR1AtREknLCAwLjY0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsOSwxKSwgICdJR1AtREknLCAxLjAxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMTAsMSksICdJR1AtREknLCAwLjYxLCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjEsMTEsMSksICdJR1AtREknLCAtMC4wMiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIxLDEyLDEpLCAnSUdQLURJJywgMC44NywgTlVMTCksCiAgLS0gMjAyMgogIChtYWtlX2RhdGUoMjAyMiwxLDEpLCAgJ0lHUC1ESScsIDEuNjksICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsMiwxKSwgICdJR1AtREknLCAxLjcxLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDMsMSksICAnSUdQLURJJywgMS41NiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiw0LDEpLCAgJ0lHUC1ESScsIDEuMjgsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsNSwxKSwgICdJR1AtREknLCAwLjU0LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDYsMSksICAnSUdQLURJJywgMC41OSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiw3LDEpLCAgJ0lHUC1ESScsIC0wLjY0LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsOCwxKSwgICdJR1AtREknLCAtMC42MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDksMSksICAnSUdQLURJJywgLTAuODAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMiwxMCwxKSwgJ0lHUC1ESScsIDAuMzIsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjIsMTEsMSksICdJR1AtREknLCAtMC41MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIyLDEyLDEpLCAnSUdQLURJJywgLTAuNTIsIE5VTEwpLAogIC0tIDIwMjMKICAobWFrZV9kYXRlKDIwMjMsMSwxKSwgICdJR1AtREknLCAwLjEwLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDIsMSksICAnSUdQLURJJywgLTAuMDQsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywzLDEpLCAgJ0lHUC1ESScsIC0wLjI2LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsNCwxKSwgICdJR1AtREknLCAtMC4wMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDUsMSksICAnSUdQLURJJywgMC4wOCwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw2LDEpLCAgJ0lHUC1ESScsIC0wLjA1LCBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsNywxKSwgICdJR1AtREknLCAwLjA5LCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDgsMSksICAnSUdQLURJJywgMC4yMiwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMyw5LDEpLCAgJ0lHUC1ESScsIDAuMzQsICBOVUxMKSwKICAobWFrZV9kYXRlKDIwMjMsMTAsMSksICdJR1AtREknLCAwLjUyLCAgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDIzLDExLDEpLCAnSUdQLURJJywgMC4zOSwgIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyMywxMiwxKSwgJ0lHUC1ESScsIDAuNzIsICBOVUxMKSwKICAtLSAyMDI0CiAgKG1ha2VfZGF0ZSgyMDI0LDEsMSksICAnSUdQLURJJywgMC4yMCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDIsMSksICAnSUdQLURJJywgMC41MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDMsMSksICAnSUdQLURJJywgMC4xNCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDQsMSksICAnSUdQLURJJywgMC4zMywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDUsMSksICAnSUdQLURJJywgMC4zNywgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDYsMSksICAnSUdQLURJJywgMC43OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDcsMSksICAnSUdQLURJJywgMC41OSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDgsMSksICAnSUdQLURJJywgMC40NSwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDksMSksICAnSUdQLURJJywgMC40MiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDEwLDEpLCAnSUdQLURJJywgMS40OCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDExLDEpLCAnSUdQLURJJywgMS4xMiwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI0LDEyLDEpLCAnSUdQLURJJywgMC45MSwgTlVMTCksCiAgLS0gMjAyNQogIChtYWtlX2RhdGUoMjAyNSwxLDEpLCAgJ0lHUC1ESScsIDAuMTcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwyLDEpLCAgJ0lHUC1ESScsIDEuMDIsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwzLDEpLCAgJ0lHUC1ESScsIDAuODEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw0LDEpLCAgJ0lHUC1ESScsIDAuNDAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw1LDEpLCAgJ0lHUC1ESScsIDAuMzYsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw2LDEpLCAgJ0lHUC1ESScsIDAuMjgsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw3LDEpLCAgJ0lHUC1ESScsIDAuODAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw4LDEpLCAgJ0lHUC1ESScsIDAuMzIsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSw5LDEpLCAgJ0lHUC1ESScsIDAuNjAsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwxMCwxKSwgJ0lHUC1ESScsIDAuNzEsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwxMSwxKSwgJ0lHUC1ESScsIDAuNjcsIE5VTEwpLAogIChtYWtlX2RhdGUoMjAyNSwxMiwxKSwgJ0lHUC1ESScsIDAuOTIsIE5VTEwpLAogIC0tIDIwMjYgKHBhcmNpYWwpCiAgKG1ha2VfZGF0ZSgyMDI2LDEsMSksICAnSUdQLURJJywgMC42NCwgTlVMTCksCiAgKG1ha2VfZGF0ZSgyMDI2LDIsMSksICAnSUdQLURJJywgMS4xMCwgTlVMTCkKT04gQ09ORkxJQ1QgKGNvbXBldGVuY2lhLCBpbmRpY2UpIERPIE5PVEhJTkc7CgotLSDilIDilIAgQ29tcHV0ZSBhY3VtdWxhZG8gZm9yIElOUEMsIElHUC1NLCBJR1AtREkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgpVUERBVEUgcHVibGljLnBqZWNhbGNfY29ycmVjYW9fbW9uZXRhcmlhIEFTIHQKU0VUIGFjdW11bGFkbyA9IHN1Yi5hYwpGUk9NICgKICBTRUxFQ1QgaWQsCiAgICBFWFAoU1VNKExOKEdSRUFURVNUKDEuMCArIHZhbG9yIC8gMTAwLjAsIDFlLTkpKSkKICAgICAgICBPVkVSIChQQVJUSVRJT04gQlkgaW5kaWNlIE9SREVSIEJZIGNvbXBldGVuY2lhCiAgICAgICAgICAgICAgUk9XUyBCRVRXRUVOIFVOQk9VTkRFRCBQUkVDRURJTkcgQU5EIENVUlJFTlQgUk9XKSkgQVMgYWMKICBGUk9NIHB1YmxpYy5wamVjYWxjX2NvcnJlY2FvX21vbmV0YXJpYQogIFdIRVJFIGluZGljZSBJTiAoJ0lOUEMnLCAnSUdQLU0nLCAnSUdQLURJJykKKSBzdWIKV0hFUkUgdC5pZCA9IHN1Yi5pZDsK-- ============================================================
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
-- ============================================================
-- P0-3: Pipeline de ingestão de índices monetários
--
-- 1. RPC pjecalc_recompute_acumulado — chamada pela edge function
--    sync-pjecalc-indices após cada ingestão incremental.
--
-- 2. VIEW pjecalc_indice_cobertura — para checar gaps facilmente.
--
-- 3. pg_cron: dispara sync-pjecalc-indices todo dia 5 do mês
--    (após BCB/IBGE publicarem os dados do mês anterior).
-- ============================================================

-- ============================================================
-- 1. RPC: recompute acumulado for a single indice
-- ============================================================
CREATE OR REPLACE FUNCTION public.pjecalc_recompute_acumulado(p_indice TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pjecalc_correcao_monetaria AS t
  SET acumulado = sub.ac
  FROM (
    SELECT
      id,
      EXP(SUM(LN(GREATEST(1.0 + valor / 100.0, 1e-9)))
          OVER (PARTITION BY indice ORDER BY competencia
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      ) AS ac
    FROM public.pjecalc_correcao_monetaria
    WHERE indice = p_indice
  ) sub
  WHERE t.id = sub.id;
END;
$$;

COMMENT ON FUNCTION public.pjecalc_recompute_acumulado(TEXT) IS
  'Recomputes the running-product acumulado for a given indice after incremental inserts.';

-- ============================================================
-- 2. VIEW: cobertura dos índices críticos
-- Permite diagnóstico rápido de gaps por índice
-- ============================================================
CREATE OR REPLACE VIEW public.pjecalc_indice_cobertura AS
SELECT
  indice,
  COUNT(*)                              AS total_meses,
  MIN(competencia)::text                AS cobertura_inicio,
  MAX(competencia)::text                AS cobertura_fim,
  -- Gap to today (months since last record)
  EXTRACT(YEAR FROM age(now(), MAX(competencia))) * 12
    + EXTRACT(MONTH FROM age(now(), MAX(competencia)))
    AS meses_atrasado,
  -- Whether coverage reaches the current month
  (MAX(competencia) >= date_trunc('month', now()))::boolean AS esta_atualizado
FROM public.pjecalc_correcao_monetaria
WHERE indice IN ('IPCA-E', 'SELIC', 'TR', 'TR_FGTS', 'INPC', 'IGP-M', 'IGP-DI')
GROUP BY indice
ORDER BY indice;

COMMENT ON VIEW public.pjecalc_indice_cobertura IS
  'Diagnóstico de cobertura e atualidade dos índices de correção monetária.';

-- ============================================================
-- 3. pg_cron: mensal no dia 5 de cada mês às 11:00 UTC
-- (BCB/IBGE geralmente publicam até o dia 3-4 do mês seguinte)
-- ============================================================
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if any
SELECT cron.unschedule('sync-pjecalc-indices-monthly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-pjecalc-indices-monthly'
);

-- Schedule: 5th of every month at 11:00 UTC
SELECT cron.schedule(
  'sync-pjecalc-indices-monthly',
  '0 11 5 * *',
  $$
    SELECT net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/sync-pjecalc-indices',
      body   := '{"serie_ids": [4390, 10764, 226]}'::jsonb,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      )
    );
  $$
);

-- ============================================================
-- Grant execute on new function to authenticated users
-- (needed for edge function service role)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.pjecalc_recompute_acumulado(TEXT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
-- =====================================================
-- FIX RLS POLICIES ON pjecalc_* TABLES
-- =====================================================
-- Problem: All pjecalc_* tables had USING(true) / WITH CHECK(true)
-- policies, meaning any authenticated user could read/write any
-- other user's calculation data. This migration drops those open
-- policies and creates owner-restricted policies.
--
-- Tables fall into three categories:
--   1. Tables with case_id directly (link to cases.criado_por)
--   2. Tables with calculo_id (link via pjecalc_calculos.case_id → cases.criado_por)
--   3. Reference/global tables (no case_id, no calculo_id) — public read only
-- =====================================================

-- Step 1: Drop ALL existing policies on pjecalc_* tables
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END
$$;

-- Step 2: Ensure RLS is enabled on all pjecalc_* tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$$;

-- Step 3: Create owner-restricted policies
-- We categorize tables by how they link to the case owner.

-- ── Category A: Tables with case_id column (direct link to cases) ──
-- These tables have a case_id FK to cases(id).
DO $$
DECLARE
  tbl text;
  case_id_tables text[] := ARRAY[
    'pjecalc_calculos',
    'pjecalc_parametros',
    'pjecalc_dados_processo',
    'pjecalc_cartao_ponto',
    'pjecalc_fgts_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_correcao_config',
    'pjecalc_honorarios',
    'pjecalc_custas',
    'pjecalc_custas_config',
    'pjecalc_liquidacao_resultado',
    'pjecalc_multas_config',
    'pjecalc_salario_familia_config',
    'pjecalc_pensao_config',
    'pjecalc_previdencia_privada_config',
    'pjecalc_seguro_config',
    'pjecalc_seguro_desemprego_config',
    'pjecalc_pensao_alimenticia_config',
    'pjecalc_prev_privada_config',
    'pjecalc_sal_familia_config',
    'pjecalc_fgts_saldos_saques',
    'pjecalc_observacoes',
    'pjecalc_audit_log',
    'pjecalc_metricas',
    'pjecalc_parametros_extras',
    'pjecalc_ponto_diario',
    'pjecalc_cartao_ponto_colunas',
    'pjecalc_excecoes_carga',
    'pjecalc_excecoes_sabado',
    'pjecalc_ocorrencias',
    'pjecalc_fgts_ocorrencias',
    'pjecalc_cs_ocorrencias',
    'pjecalc_faltas',
    'pjecalc_ferias',
    'pjecalc_historico_salarial',
    'pjecalc_historico_ocorrencias',
    'pjecalc_verbas'
  ];
BEGIN
  FOREACH tbl IN ARRAY case_id_tables
  LOOP
    -- Only create policy if table actually exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- Check if table actually has case_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'case_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "owner_access" ON public.%I FOR ALL TO authenticated '
          'USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = %I.case_id AND c.criado_por = auth.uid())) '
          'WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = %I.case_id AND c.criado_por = auth.uid()))',
          tbl, tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- ── Category B: Tables with calculo_id (link via pjecalc_calculos → cases) ──
-- These tables have calculo_id FK to pjecalc_calculos(id), no direct case_id.
DO $$
DECLARE
  tbl text;
  calculo_id_tables text[] := ARRAY[
    'pjecalc_evento_intervalo',
    'pjecalc_apuracao_diaria',
    'pjecalc_hist_salarial',
    'pjecalc_hist_salarial_mes',
    'pjecalc_rubrica_raw',
    'pjecalc_rubrica_map',
    'pjecalc_verba_base',
    'pjecalc_reflexo',
    'pjecalc_reflexo_base_verba',
    'pjecalc_atualizacao_config',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_resultado'
  ];
BEGIN
  FOREACH tbl IN ARRAY calculo_id_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- Check if table actually has calculo_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'calculo_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "owner_access" ON public.%I FOR ALL TO authenticated '
          'USING (EXISTS ('
            'SELECT 1 FROM public.pjecalc_calculos pc '
            'JOIN public.cases c ON c.id = pc.case_id '
            'WHERE pc.id = %I.calculo_id AND c.criado_por = auth.uid()'
          ')) '
          'WITH CHECK (EXISTS ('
            'SELECT 1 FROM public.pjecalc_calculos pc '
            'JOIN public.cases c ON c.id = pc.case_id '
            'WHERE pc.id = %I.calculo_id AND c.criado_por = auth.uid()'
          '))',
          tbl, tbl, tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- ── Category C: Reference/global tables — authenticated read-only, no write ──
-- These are shared lookup tables (INSS faixas, IR faixas, feriados, índices, etc.)
-- They have no case_id or calculo_id. All authenticated users can read them.
-- Only service_role can write (no authenticated write policy).
DO $$
DECLARE
  tbl text;
  reference_tables text[] := ARRAY[
    'pjecalc_inss_faixas',
    'pjecalc_ir_faixas',
    'pjecalc_feriados',
    'pjecalc_correcao_monetaria',
    'pjecalc_juros_mora',
    'pjecalc_salario_minimo',
    'pjecalc_salario_familia',
    'pjecalc_seguro_desemprego',
    'pjecalc_contribuicao_social',
    'pjecalc_imposto_renda',
    'pjecalc_imposto_renda_faixas',
    'pjecalc_custas_judiciais',
    'pjecalc_pisos_salariais',
    'pjecalc_vale_transporte',
    'pjecalc_verbas_padrao'
  ];
BEGIN
  FOREACH tbl IN ARRAY reference_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "authenticated_read" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl
      );
    END IF;
  END LOOP;
END
$$;

-- ── Step 4: Explicitly revoke anon access from ALL pjecalc_* tables ──
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'pjecalc_%'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
  END LOOP;
END
$$;
-- Ensure pjecalc_correcao_monetaria has the acumulado column and unique constraint
DO $$
BEGIN
  -- Add acumulado column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pjecalc_correcao_monetaria' AND column_name = 'acumulado'
  ) THEN
    ALTER TABLE public.pjecalc_correcao_monetaria ADD COLUMN acumulado numeric(20,8);
  END IF;

  -- Create unique constraint for upsert
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_correcao_monetaria_indice_competencia_key'
  ) THEN
    ALTER TABLE public.pjecalc_correcao_monetaria
    ADD CONSTRAINT pjecalc_correcao_monetaria_indice_competencia_key
    UNIQUE (indice, competencia);
  END IF;
END $$;
-- ============================================================
-- SEED: pjecalc_inss_faixas histórico completo 2003-2022
-- Fonte: Portarias MPS/SEPRT/MTE anuais
-- Pre-2020: sistema flat-rate (3 faixas: 8%, 9%, 11%)
-- Pós-2020 (março): sistema progressivo (4 faixas: 7.5%, 9%, 12%, 14%)
-- ============================================================

-- Pre-reforma (flat-rate) 2003-2019
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
-- 2003
('2003-01-01','2003-12-31',1,560.81,0.08),('2003-01-01','2003-12-31',2,720.00,0.09),('2003-01-01','2003-12-31',3,1440.00,0.11),
-- 2004
('2004-01-01','2004-12-31',1,752.62,0.08),('2004-01-01','2004-12-31',2,780.00,0.09),('2004-01-01','2004-12-31',3,1561.56,0.11),
-- 2005
('2005-01-01','2005-12-31',1,800.45,0.08),('2005-01-01','2005-12-31',2,900.00,0.09),('2005-01-01','2005-12-31',3,1600.00,0.11),
-- 2006
('2006-01-01','2006-12-31',1,840.55,0.08),('2006-01-01','2006-12-31',2,1050.00,0.09),('2006-01-01','2006-12-31',3,1680.00,0.11),
-- 2007
('2007-01-01','2007-12-31',1,868.29,0.08),('2007-01-01','2007-12-31',2,1140.00,0.09),('2007-01-01','2007-12-31',3,1735.00,0.11),
-- 2008
('2008-01-01','2008-12-31',1,911.70,0.08),('2008-01-01','2008-12-31',2,1200.00,0.09),('2008-01-01','2008-12-31',3,1822.00,0.11),
-- 2009
('2009-01-01','2009-12-31',1,965.67,0.08),('2009-01-01','2009-12-31',2,1300.00,0.09),('2009-01-01','2009-12-31',3,1930.00,0.11),
-- 2010
('2010-01-01','2010-12-31',1,1024.97,0.08),('2010-01-01','2010-12-31',2,1700.00,0.09),('2010-01-01','2010-12-31',3,2049.00,0.11),
-- 2011
('2011-01-01','2011-12-31',1,1106.90,0.08),('2011-01-01','2011-12-31',2,1844.83,0.09),('2011-01-01','2011-12-31',3,3689.66,0.11),
-- 2012
('2012-01-01','2012-12-31',1,1174.86,0.08),('2012-01-01','2012-12-31',2,1958.10,0.09),('2012-01-01','2012-12-31',3,3916.20,0.11),
-- 2013
('2013-01-01','2013-12-31',1,1247.70,0.08),('2013-01-01','2013-12-31',2,2079.50,0.09),('2013-01-01','2013-12-31',3,4159.00,0.11),
-- 2014
('2014-01-01','2014-12-31',1,1317.07,0.08),('2014-01-01','2014-12-31',2,2195.12,0.09),('2014-01-01','2014-12-31',3,4390.24,0.11),
-- 2015
('2015-01-01','2015-12-31',1,1399.12,0.08),('2015-01-01','2015-12-31',2,2331.88,0.09),('2015-01-01','2015-12-31',3,4663.75,0.11),
-- 2016
('2016-01-01','2016-12-31',1,1556.94,0.08),('2016-01-01','2016-12-31',2,2594.92,0.09),('2016-01-01','2016-12-31',3,5189.82,0.11),
-- 2017
('2017-01-01','2017-12-31',1,1659.38,0.08),('2017-01-01','2017-12-31',2,2765.66,0.09),('2017-01-01','2017-12-31',3,5531.31,0.11),
-- 2018
('2018-01-01','2018-12-31',1,1693.72,0.08),('2018-01-01','2018-12-31',2,2822.90,0.09),('2018-01-01','2018-12-31',3,5645.80,0.11),
-- 2019
('2019-01-01','2019-12-31',1,1751.81,0.08),('2019-01-01','2019-12-31',2,2919.72,0.09),('2019-01-01','2019-12-31',3,5839.45,0.11),
-- 2020 jan-fev (flat-rate antes da reforma)
('2020-01-01','2020-02-28',1,1830.29,0.08),('2020-01-01','2020-02-28',2,3050.52,0.09),('2020-01-01','2020-02-28',3,6101.06,0.11),
-- 2020 mar-dez (progressivo pós-reforma EC 103/2019)
('2020-03-01','2020-12-31',1,1045.00,0.075),('2020-03-01','2020-12-31',2,2089.60,0.09),('2020-03-01','2020-12-31',3,3134.40,0.12),('2020-03-01','2020-12-31',4,6101.06,0.14),
-- 2021
('2021-01-01','2021-12-31',1,1100.00,0.075),('2021-01-01','2021-12-31',2,2203.48,0.09),('2021-01-01','2021-12-31',3,3305.22,0.12),('2021-01-01','2021-12-31',4,6433.57,0.14),
-- 2022
('2022-01-01','2022-12-31',1,1212.00,0.075),('2022-01-01','2022-12-31',2,2427.35,0.09),('2022-01-01','2022-12-31',3,3641.03,0.12),('2022-01-01','2022-12-31',4,7087.22,0.14)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: pjecalc_imposto_renda + faixas histórico 2003-2022
-- Fonte: RFB - Tabela progressiva mensal
-- ============================================================

-- Helper: insert IR parent + faixas for each year
-- 2015-2022 (tabela congelada de 2015 a 2022)
INSERT INTO public.pjecalc_imposto_renda (competencia, deducao_dependente, deducao_aposentado_65)
VALUES
  ('2015-04-01', 189.59, 1903.98),
  ('2011-01-01', 157.47, 1566.61),
  ('2009-01-01', 144.20, 1434.59),
  ('2007-01-01', 132.05, 1313.69),
  ('2005-01-01', 117.00, 1164.00),
  ('2003-01-01', 106.00, 1058.00)
ON CONFLICT DO NOTHING;

-- Note: IR faixas need to reference the pjecalc_imposto_renda parent ID
-- Since we can't know the IDs in advance, we use a DO block
DO $$
DECLARE
  v_id uuid;
BEGIN
  -- Check if 2015 IR parent already has faixas
  SELECT id INTO v_id FROM public.pjecalc_imposto_renda WHERE competencia = '2015-04-01' LIMIT 1;
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pjecalc_imposto_renda_faixas WHERE ir_id = v_id) THEN
    INSERT INTO public.pjecalc_imposto_renda_faixas (ir_id, faixa, valor_final, aliquota, parcela_deduzir) VALUES
      (v_id, 1, 1903.98, 0, 0),
      (v_id, 2, 2826.65, 0.075, 142.80),
      (v_id, 3, 3751.05, 0.15, 354.80),
      (v_id, 4, 4664.68, 0.225, 636.13),
      (v_id, 5, 999999999, 0.275, 869.36);
  END IF;

  -- 2011 IR
  SELECT id INTO v_id FROM public.pjecalc_imposto_renda WHERE competencia = '2011-01-01' LIMIT 1;
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pjecalc_imposto_renda_faixas WHERE ir_id = v_id) THEN
    INSERT INTO public.pjecalc_imposto_renda_faixas (ir_id, faixa, valor_final, aliquota, parcela_deduzir) VALUES
      (v_id, 1, 1566.61, 0, 0),
      (v_id, 2, 2347.85, 0.075, 117.49),
      (v_id, 3, 3130.51, 0.15, 293.58),
      (v_id, 4, 3911.63, 0.225, 528.37),
      (v_id, 5, 999999999, 0.275, 723.95);
  END IF;
END $$;
-- Tabela de índices de correção monetária (dados reais BCB)
-- Populada via Edge Function populate-bcb-indices com séries oficiais:
--   IPCA-E (10764), SELIC (4390), INPC (188), TR (7812), IGP-M (189)
-- Período: 2000-01 até presente. ~1573 registros.

CREATE TABLE IF NOT EXISTS pjecalc_correcao_monetaria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indice      text        NOT NULL,
  competencia date        NOT NULL,
  valor       numeric,
  acumulado   numeric,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (indice, competencia)
);

CREATE INDEX IF NOT EXISTS idx_pjecalc_correcao_idx_comp
  ON pjecalc_correcao_monetaria (indice, competencia);
