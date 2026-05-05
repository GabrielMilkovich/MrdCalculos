-- =====================================================
-- Rubrica Mapping (PR 3 v5)
-- =====================================================
-- Tabela canônica de classificação de rubricas de holerite em buckets do
-- PJe-Calc. Resolve o problema de classificar rubrica por rubrica via
-- regras enumeradas (prioridade 100, match exato) + regras soft (prioridade
-- 50, contains/startswith) com exceções.
-- =====================================================

BEGIN;

CREATE TYPE bucket_pje_calc AS ENUM (
  'minimo_garantido',
  'salario_substituicao',
  'comissoes_produtos',
  'dsr_comissoes',
  'comissoes_servicos',
  'premios',
  'desconsiderar'
);

CREATE TYPE rubrica_layout AS ENUM ('via_varejo', 'magazine_luiza', 'generico');

CREATE TYPE rubrica_tipo_regra AS ENUM (
  'enumerado_explicito',
  'regra_soft_contains',
  'regra_soft_startswith'
);

CREATE TABLE rubrica_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_normalizada text NOT NULL,
  rubrica_original text,
  bucket bucket_pje_calc NOT NULL,
  layout_aplicavel rubrica_layout NOT NULL DEFAULT 'via_varejo',
  tipo_regra rubrica_tipo_regra NOT NULL DEFAULT 'enumerado_explicito',
  prioridade int NOT NULL DEFAULT 100,
  excecoes text[] DEFAULT ARRAY[]::text[],
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rubrica_normalizada, layout_aplicavel, tipo_regra)
);

CREATE INDEX idx_rubrica_mapping_lookup
  ON rubrica_mapping (layout_aplicavel, prioridade DESC, rubrica_normalizada);

COMMENT ON TABLE rubrica_mapping IS
  'Tabela canônica de classificação de rubricas. Global (sem RLS) — não tem dado sensível, é configuração.';
COMMENT ON COLUMN rubrica_mapping.prioridade IS
  'Maior vence. enumerado_explicito=100, regra_soft=50.';
COMMENT ON COLUMN rubrica_mapping.excecoes IS
  'Strings normalizadas que NÃO devem casar com a regra (apenas para regras soft).';

COMMIT;
