-- ═══════════════════════════════════════════════════════
-- MIGRATION PART 2 (files 11 to 20 of 99)
-- Execute in SQL Editor of Supabase Dashboard
-- ═══════════════════════════════════════════════════════


-- ── Migration: 20260121181404_a5de480c-5c91-4d72-8693-059dadb23e10.sql ──

-- Habilitar extensões necessárias para RAG
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Migration: 20260121181510_8d1af577-af02-45ab-beaf-7c9a7ea2423c.sql ──

-- Adicionar colunas extras à tabela documents existente
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
$$;

-- ── Migration: 20260121181634_a9c82df6-a1af-42cd-bb2f-c0c41dbce915.sql ──

-- Substituir função match_document_chunks com nova assinatura
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
$$;

-- ── Migration: 20260121181924_25099018-c80f-4c69-9c91-e06216c8e5b2.sql ──

-- Criar bucket privado para documentos jurídicos
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
);

-- ── Migration: 20260121184601_c623c311-9f07-4ef7-96c0-7bbde1da853b.sql ──

-- =====================================================
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
GRANT SELECT ON public.case_processing_stats TO authenticated;

-- ── Migration: 20260121184611_fac3625f-a2a9-4975-a34e-a2890fac80d8.sql ──

-- Fix Security Definer View - recreate without SECURITY DEFINER
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
GRANT SELECT ON public.case_processing_stats TO authenticated;

-- ── Migration: 20260121185050_0653b583-c18f-475f-a0f2-1539f2765abc.sql ──

-- =====================================================
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
ON CONFLICT (id) DO NOTHING;

-- ── Migration: 20260121185059_b60bbde5-4e13-489f-ae95-692aa0d48930.sql ──

-- Fix RLS for petition_templates table
ALTER TABLE public.petition_templates ENABLE ROW LEVEL SECURITY;

-- Templates são públicos para leitura (todos os usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view petition templates"
ON public.petition_templates
FOR SELECT
TO authenticated
USING (true);

-- ── Migration: 20260121190048_638795e7-75e9-445e-b499-33b9669c055f.sql ──

-- Add markdown template support to petition_templates
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
  variaveis = EXCLUDED.variaveis;

-- ── Migration: 20260121195237_715be5d1-05c0-4470-ae12-71816f3a727f.sql ──

-- Add missing metadata column used across document pipeline
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Helpful index for querying by processing progress fields in metadata (optional)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin
ON public.documents
USING GIN (metadata);

