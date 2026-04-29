-- =====================================================
-- AUTHORITY CALIBRATION — coleta de eventos para ajuste empirico da matriz
-- =====================================================
-- A matriz hardcoded em document-authority.ts atribui pesos [campo × tipo].
-- Em producao, com dataset real, esses pesos podem precisar de ajuste.
-- Esta tabela registra cada decisao do usuario (aprovou/rejeitou proposta)
-- para que possamos agregar metricas e propor ajustes (sem aplicar nada
-- automaticamente — o ajuste continua humano-mediado).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.authority_calibration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.auto_fill_proposals(id) ON DELETE SET NULL,
  campo TEXT NOT NULL,                              -- ex: 'data_admissao'
  doc_tipo_vencedor TEXT NOT NULL,                  -- ex: 'CTPS'
  valor_vencedor JSONB,                             -- valor que ganhou
  doc_tipo_perdedores TEXT[] NOT NULL DEFAULT '{}'::TEXT[],  -- tipos perdedores
  authority_score NUMERIC(5,2),                     -- score atual da matriz no momento do evento
  confianca NUMERIC(4,3),                           -- confianca da extracao
  usuario_aceitou BOOLEAN NOT NULL,                 -- TRUE = aprovou; FALSE = rejeitou
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authority_calibration_campo_tipo
  ON public.authority_calibration_events(campo, doc_tipo_vencedor);

CREATE INDEX IF NOT EXISTS idx_authority_calibration_periodo
  ON public.authority_calibration_events(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_authority_calibration_proposta
  ON public.authority_calibration_events(proposta_id);

ALTER TABLE public.authority_calibration_events ENABLE ROW LEVEL SECURITY;

-- Insert: apenas authenticated/service_role (registrado pelo proposal-engine
-- quando usuario aprova/rejeita).
CREATE POLICY "calibration_insert" ON public.authority_calibration_events
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'service_role')
  );

-- Select: somente admins (relatorio de calibracao).
CREATE POLICY "calibration_select_admin" ON public.authority_calibration_events
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Trigger: opcional, mas garante que se a proposta mudar de status
-- (aprovada/rejeitada) sem o caller ter chamado registrarEvento(),
-- a infraestrutura ainda capture o evento.
CREATE OR REPLACE FUNCTION public.fn_registrar_calibration_event()
RETURNS TRIGGER AS $$
DECLARE
  v_aceitou BOOLEAN;
  v_perdedores TEXT[];
BEGIN
  -- Dispara apenas em transicao para 'aplicada' ou 'rejeitada'.
  IF NEW.status NOT IN ('aplicada', 'rejeitada') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_aceitou := NEW.status = 'aplicada';

  -- Extrai doc_tipo dos perdedores do JSONB conflitantes.
  SELECT COALESCE(
    array_agg(elem->>'doc_tipo') FILTER (WHERE elem->>'doc_tipo' IS NOT NULL),
    '{}'::TEXT[]
  ) INTO v_perdedores
  FROM jsonb_array_elements(COALESCE(NEW.conflitantes, '[]'::jsonb)) AS elem;

  -- Evita duplicar se ja existe evento para esta proposta.
  IF EXISTS (SELECT 1 FROM public.authority_calibration_events WHERE proposta_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.authority_calibration_events (
    case_id, proposta_id, campo, doc_tipo_vencedor, valor_vencedor,
    doc_tipo_perdedores, authority_score, confianca, usuario_aceitou
  ) VALUES (
    NEW.case_id, NEW.id, NEW.campo, NEW.doc_tipo, NEW.valor_proposto,
    v_perdedores, NEW.authority_score, NEW.confianca, v_aceitou
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nao bloquear UPDATE da proposta caso registro de calibracao falhe.
  RAISE WARNING 'fn_registrar_calibration_event falhou: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_proposta_calibration_event ON public.auto_fill_proposals;
CREATE TRIGGER trg_proposta_calibration_event
  AFTER UPDATE OF status ON public.auto_fill_proposals
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_calibration_event();

COMMENT ON TABLE public.authority_calibration_events IS
  'Eventos de calibracao da matriz authority. Cada aprovacao/rejeicao de proposta gera um evento. Agregacao em sugerirAjustes() (src/lib/pjecalc/auto-fill/calibration.ts) propoe ajustes empiricos, sem aplicar automaticamente.';
