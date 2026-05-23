-- supabase/migrations/20260524000000_rubrica_aliases_v2.sql
-- Sprint Hotfix V2: ontologia de rubricas com aprendizado contínuo.
--
-- ARQUITETURA:
--   rubrica_aliases             ← canônico, lookup do mapper edge
--   rubrica_aliases_tentativa   ← staging por case, otimista no grid
--   rubrica_aliases_history     ← audit trail (append-only)
--
-- INVARIANTES:
--   1. UNIQUE(normalized_key) em rubrica_aliases  → impede duplicate cross-categoria
--   2. Tentativa só vê o próprio criador via RLS
--   3. Escrita em rubrica_aliases via service_role (edge function), não cliente

-- =========================================================================
-- 1. rubrica_aliases — tabela canônica
-- =========================================================================
CREATE TABLE rubrica_aliases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_original  text NOT NULL,
  normalized_key  text NOT NULL,
  categoria       text NOT NULL,
  tipo_pjecalc    text NOT NULL,
  base_dsr        boolean NOT NULL,
  base_13         boolean NOT NULL,
  base_ferias     boolean NOT NULL,
  incluido        boolean NOT NULL,
  -- Texto livre com decisão do escritório + súmula TST + razão jurídica.
  -- Quando preenchido, UI sinaliza "divergência jurídica" no banner.
  -- Editar exige reaprovação jurídica — handler de promote trata mudança
  -- como conflict_rejected (vide commit refactor V1→V2).
  observacao_juridica text NULL,
  source          text NOT NULL,
  confidence      numeric(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  criado_por      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  reviewed        boolean NOT NULL DEFAULT false,

  -- CRÍTICO: defesa estrutural contra duplicate key cross-categoria.
  -- Tentativa de promover alias com normalized_key já existente dispara
  -- erro 23505 → tratado em holerite-classify-confirm.
  CONSTRAINT uq_rubrica_alias_normalized UNIQUE (normalized_key),

  -- CHECK constraints validam enum sem precisar de tipo Postgres dedicado.
  -- (Tipos custom dificultam migration coexistência V1→V2.)
  CONSTRAINT chk_categoria_valida CHECK (categoria IN (
    'MINIMO_GARANTIDO',
    'SALARIO_SUBSTITUICAO',
    'COMISSOES_PRODUTOS',
    'COMISSOES_SERVICOS',
    'DSR_S_COMISSOES',
    'PREMIOS',
    'DESCONSIDERADAS',
    -- Coexistência V1 (remover em 20260524000001_migrate_categorias_v1_v2):
    'COMISSAO_PRODUTOS',
    'COMISSAO_SERVICOS',
    'PREMIO',
    'DSR_PAGO',
    'DESCONSIDERAR',
    'NAO_CLASSIFICADO'
  )),
  CONSTRAINT chk_tipo_pjecalc_valido CHECK (tipo_pjecalc IN (
    'SALARIO', 'SALARIO_SUBSTITUICAO', 'COMISSAO', 'DSR',
    'PREMIO', 'DESCONSIDERAR', 'INDEFINIDO'
  )),
  CONSTRAINT chk_source_valido CHECK (source IN (
    'seed_v2', 'planilha_v1', 'user_classification'
  )),
  -- Evita string vazia ou whitespace-only no banco. Operador que apagar
  -- observação via grid grava NULL (handler normaliza). Mantém comparação
  -- de igualdade direta sem ?? '' shim.
  CONSTRAINT chk_observacao_nao_vazia CHECK (
    observacao_juridica IS NULL OR length(trim(observacao_juridica)) > 0
  )
);

CREATE INDEX idx_rubrica_aliases_lookup
  ON rubrica_aliases(normalized_key)
  WHERE reviewed = true;

CREATE INDEX idx_rubrica_aliases_categoria
  ON rubrica_aliases(categoria);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION trg_rubrica_aliases_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_rubrica_aliases_updated
  BEFORE UPDATE ON rubrica_aliases
  FOR EACH ROW EXECUTE FUNCTION trg_rubrica_aliases_set_updated_at();

-- =========================================================================
-- 2. rubrica_aliases_tentativa — staging por case
-- =========================================================================
CREATE TABLE rubrica_aliases_tentativa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  alias_original  text NOT NULL,
  normalized_key  text NOT NULL,
  categoria       text NOT NULL,
  tipo_pjecalc    text NOT NULL,
  base_dsr        boolean,
  base_13         boolean,
  base_ferias     boolean,
  incluido        boolean,
  -- Operador pode anexar observação ao classificar; promote para canônico
  -- valida se difere do existente (vide handler holerite-classify-confirm).
  observacao_juridica text NULL,
  criado_por      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Uma tentativa por (case, key). UPSERT no grid sobrescreve.
  CONSTRAINT uq_tentativa_case_key UNIQUE (case_id, normalized_key),
  CONSTRAINT chk_tentativa_categoria CHECK (categoria IN (
    'MINIMO_GARANTIDO','SALARIO_SUBSTITUICAO','COMISSOES_PRODUTOS',
    'COMISSOES_SERVICOS','DSR_S_COMISSOES','PREMIOS','DESCONSIDERADAS',
    'NAO_CLASSIFICADO'
  )),
  CONSTRAINT chk_tentativa_observacao_nao_vazia CHECK (
    observacao_juridica IS NULL OR length(trim(observacao_juridica)) > 0
  )
);

CREATE INDEX idx_tentativa_case ON rubrica_aliases_tentativa(case_id);

CREATE TRIGGER tg_tentativa_updated
  BEFORE UPDATE ON rubrica_aliases_tentativa
  FOR EACH ROW EXECUTE FUNCTION trg_rubrica_aliases_set_updated_at();

-- =========================================================================
-- 3. rubrica_aliases_history — audit append-only
-- =========================================================================
CREATE TABLE rubrica_aliases_history (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_alias_id   uuid REFERENCES rubrica_aliases(id) ON DELETE SET NULL,
  action             text NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted',
    'promoted_from_tentativa', 'conflict_rejected'
  )),
  payload            jsonb NOT NULL,
  actor              uuid REFERENCES auth.users(id),
  case_id            uuid REFERENCES cases(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_alias  ON rubrica_aliases_history(rubrica_alias_id);
CREATE INDEX idx_history_case   ON rubrica_aliases_history(case_id);
CREATE INDEX idx_history_action ON rubrica_aliases_history(action);

-- =========================================================================
-- 4. View consumida pela UI (somente reviewed)
-- =========================================================================
CREATE VIEW rubrica_aliases_ativos
WITH (security_invoker = true) AS
SELECT
  id, alias_original, normalized_key, categoria, tipo_pjecalc,
  base_dsr, base_13, base_ferias, incluido, observacao_juridica,
  source, confidence, created_at, updated_at
FROM rubrica_aliases
WHERE reviewed = true;

-- =========================================================================
-- 5. RLS
-- =========================================================================
ALTER TABLE rubrica_aliases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrica_aliases_tentativa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrica_aliases_history     ENABLE ROW LEVEL SECURITY;

-- Tentativa: acesso via ownership do case. Alinha com padrão do projeto
-- (rubricas_extraidas, classificacoes_rubrica_memo, case_categoria_config
-- usam o mesmo JOIN). Single-tenant single-owner: 1 case → 1 criado_por.
-- ON DELETE CASCADE em case_id garante cleanup quando case é apagado.
CREATE POLICY tentativa_case_owner_select ON rubrica_aliases_tentativa
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases c
            WHERE c.id = rubrica_aliases_tentativa.case_id
              AND c.criado_por = auth.uid())
  );

CREATE POLICY tentativa_case_owner_insert ON rubrica_aliases_tentativa
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases c
            WHERE c.id = rubrica_aliases_tentativa.case_id
              AND c.criado_por = auth.uid())
  );

CREATE POLICY tentativa_case_owner_update ON rubrica_aliases_tentativa
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cases c
            WHERE c.id = rubrica_aliases_tentativa.case_id
              AND c.criado_por = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM cases c
            WHERE c.id = rubrica_aliases_tentativa.case_id
              AND c.criado_por = auth.uid())
  );

CREATE POLICY tentativa_case_owner_delete ON rubrica_aliases_tentativa
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM cases c
            WHERE c.id = rubrica_aliases_tentativa.case_id
              AND c.criado_por = auth.uid())
  );

-- Aliases canônicos: leitura global pra authenticated, escrita via service_role
CREATE POLICY aliases_read_authenticated ON rubrica_aliases
  FOR SELECT USING (auth.role() = 'authenticated');

-- (sem policy de INSERT/UPDATE/DELETE → bloqueia client; service_role bypassa RLS)

-- History: leitura authenticated, escrita só service_role
CREATE POLICY history_read_authenticated ON rubrica_aliases_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- =========================================================================
-- 6. GC de tentativas órfãs (cases sem atividade > 30 dias)
-- =========================================================================
-- Função invocada por cron (pg_cron ou Edge Scheduler).
CREATE OR REPLACE FUNCTION gc_rubrica_aliases_tentativa()
RETURNS TABLE (deleted_count int) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM rubrica_aliases_tentativa
   WHERE updated_at < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION gc_rubrica_aliases_tentativa IS
'GC tentativas com mais de 30 dias sem atividade. Agendar via cron diário.';
