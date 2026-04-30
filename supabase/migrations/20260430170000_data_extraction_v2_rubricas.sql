-- =========================================================================
-- Modo "Extração de Dados" v2: rubricas, classificação, multi-CSV
-- =========================================================================
-- Drop v1 (document_extracted_data) e cria 6 tabelas + colunas em documents.
-- =========================================================================

-- 0) Drop v1 (apenas teste, 0 rows reais)
DROP TABLE IF EXISTS public.document_extracted_data CASCADE;

-- 1) Colunas novas em documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tipo_extracao TEXT NOT NULL DEFAULT 'nao_extrair'
  CHECK (tipo_extracao IN ('nao_extrair', 'holerite', 'recibo_ferias', 'registro_faltas'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS competencia_referencia TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracao_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (extracao_status IN ('pending', 'running', 'done', 'failed'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracao_error TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (validation_status IN ('pending', 'validated', 'rejected'));

-- 2) categorias_rubrica
CREATE TABLE IF NOT EXISTS public.categorias_rubrica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome_exibicao TEXT NOT NULL,
  nome_pjecalc TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  default_incide_fgts BOOLEAN NOT NULL DEFAULT true,
  default_fgts_recolhido BOOLEAN NOT NULL DEFAULT true,
  default_incide_inss BOOLEAN NOT NULL DEFAULT true,
  default_inss_recolhido BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.categorias_rubrica (slug, nome_exibicao, nome_pjecalc, ordem) VALUES
  ('salario_fixo', 'Salário Fixo', 'Salário Fixo', 1),
  ('comissao',     'Comissões',    'Comissões',    2),
  ('dsr',          'DSR',          'DSR',          3),
  ('premiacao',    'Premiações',   'Premiações',   4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.categorias_rubrica ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_read_authenticated" ON public.categorias_rubrica;
CREATE POLICY "categorias_read_authenticated" ON public.categorias_rubrica
  FOR SELECT TO authenticated USING (true);

-- 3) rubricas_extraidas
CREATE TABLE IF NOT EXISTS public.rubricas_extraidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  quantidade NUMERIC(15,4),
  desconto NUMERIC(15,2),
  categoria_id UUID REFERENCES public.categorias_rubrica(id),
  classificacao_origem TEXT NOT NULL DEFAULT 'none'
    CHECK (classificacao_origem IN ('none', 'memo', 'hint', 'manual')),
  origem TEXT NOT NULL DEFAULT 'ocr_ai' CHECK (origem IN ('ocr_ai', 'manual')),
  ordem_no_documento INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubricas_doc ON public.rubricas_extraidas(document_id);
CREATE INDEX IF NOT EXISTS idx_rubricas_case ON public.rubricas_extraidas(case_id);
CREATE INDEX IF NOT EXISTS idx_rubricas_categoria ON public.rubricas_extraidas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_rubricas_lookup ON public.rubricas_extraidas(case_id, codigo, nome_normalizado);

ALTER TABLE public.rubricas_extraidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rubricas_owner" ON public.rubricas_extraidas;
CREATE POLICY "rubricas_owner" ON public.rubricas_extraidas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = rubricas_extraidas.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = rubricas_extraidas.case_id AND c.criado_por = auth.uid())
  );

-- 4) classificacoes_rubrica_memo
CREATE TABLE IF NOT EXISTS public.classificacoes_rubrica_memo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  codigo TEXT,
  nome_normalizado TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.categorias_rubrica(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (case_id, codigo, nome_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_memo_lookup ON public.classificacoes_rubrica_memo(case_id, codigo, nome_normalizado);

ALTER TABLE public.classificacoes_rubrica_memo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memo_owner" ON public.classificacoes_rubrica_memo;
CREATE POLICY "memo_owner" ON public.classificacoes_rubrica_memo
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = classificacoes_rubrica_memo.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = classificacoes_rubrica_memo.case_id AND c.criado_por = auth.uid())
  );

-- 5) case_categoria_config
CREATE TABLE IF NOT EXISTS public.case_categoria_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias_rubrica(id),
  incide_fgts BOOLEAN NOT NULL,
  fgts_recolhido BOOLEAN NOT NULL,
  incide_inss BOOLEAN NOT NULL,
  inss_recolhido BOOLEAN NOT NULL,
  natureza_indenizatoria BOOLEAN NOT NULL DEFAULT false,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, categoria_id)
);

ALTER TABLE public.case_categoria_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "config_owner" ON public.case_categoria_config;
CREATE POLICY "config_owner" ON public.case_categoria_config
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_categoria_config.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_categoria_config.case_id AND c.criado_por = auth.uid())
  );

-- 6) ferias_extraidas
CREATE TABLE IF NOT EXISTS public.ferias_extraidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  relativa TEXT NOT NULL,
  prazo INTEGER NOT NULL,
  situacao TEXT NOT NULL CHECK (situacao IN ('G','GP','NG','I','P')),
  dobra_geral BOOLEAN NOT NULL DEFAULT false,
  abono BOOLEAN NOT NULL DEFAULT false,
  dias_abono INTEGER NOT NULL DEFAULT 0,
  gozo1 JSONB,
  gozo2 JSONB,
  gozo3 JSONB,
  incluir BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ferias_case ON public.ferias_extraidas(case_id);
CREATE INDEX IF NOT EXISTS idx_ferias_doc ON public.ferias_extraidas(document_id);

ALTER TABLE public.ferias_extraidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ferias_owner" ON public.ferias_extraidas;
CREATE POLICY "ferias_owner" ON public.ferias_extraidas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = ferias_extraidas.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = ferias_extraidas.case_id AND c.criado_por = auth.uid())
  );

-- 7) faltas_extraidas
CREATE TABLE IF NOT EXISTS public.faltas_extraidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  justificada BOOLEAN NOT NULL,
  reiniciar_periodo_aquisitivo BOOLEAN NOT NULL DEFAULT false,
  justificativa TEXT,
  incluir BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faltas_case ON public.faltas_extraidas(case_id);
CREATE INDEX IF NOT EXISTS idx_faltas_doc ON public.faltas_extraidas(document_id);

ALTER TABLE public.faltas_extraidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faltas_owner" ON public.faltas_extraidas;
CREATE POLICY "faltas_owner" ON public.faltas_extraidas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = faltas_extraidas.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = faltas_extraidas.case_id AND c.criado_por = auth.uid())
  );

-- 8) Triggers de updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_v2()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memo_touch ON public.classificacoes_rubrica_memo;
CREATE TRIGGER trg_memo_touch
  BEFORE UPDATE ON public.classificacoes_rubrica_memo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_v2();

DROP TRIGGER IF EXISTS trg_config_touch ON public.case_categoria_config;
CREATE TRIGGER trg_config_touch
  BEFORE UPDATE ON public.case_categoria_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_v2();
