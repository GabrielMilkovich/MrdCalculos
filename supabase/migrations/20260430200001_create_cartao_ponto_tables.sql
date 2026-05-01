CREATE TABLE IF NOT EXISTS public.cartoes_ponto_extraidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  data_inicial DATE,
  data_final DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_cartoes_ponto_doc ON public.cartoes_ponto_extraidos(document_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_ponto_case ON public.cartoes_ponto_extraidos(case_id);

ALTER TABLE public.cartoes_ponto_extraidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cartoes_ponto_owner" ON public.cartoes_ponto_extraidos;
CREATE POLICY "cartoes_ponto_owner" ON public.cartoes_ponto_extraidos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = cartoes_ponto_extraidos.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = cartoes_ponto_extraidos.case_id AND c.criado_por = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.apuracoes_diarias_extraidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_ponto_id UUID NOT NULL REFERENCES public.cartoes_ponto_extraidos(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ocorrencia TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (ocorrencia IN ('NORMAL', 'FALTA', 'FERIADO', 'FOLGA', 'FERIAS', 'ATESTADO', 'LICENCA_MEDICA')),
  marcacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cartao_ponto_id, data)
);

CREATE INDEX IF NOT EXISTS idx_apuracoes_cartao ON public.apuracoes_diarias_extraidas(cartao_ponto_id);
CREATE INDEX IF NOT EXISTS idx_apuracoes_data ON public.apuracoes_diarias_extraidas(data);

ALTER TABLE public.apuracoes_diarias_extraidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apuracoes_owner" ON public.apuracoes_diarias_extraidas;
CREATE POLICY "apuracoes_owner" ON public.apuracoes_diarias_extraidas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = apuracoes_diarias_extraidas.case_id AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = apuracoes_diarias_extraidas.case_id AND c.criado_por = auth.uid())
  );
