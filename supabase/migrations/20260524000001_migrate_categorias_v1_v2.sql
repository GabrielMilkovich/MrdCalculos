-- supabase/migrations/20260524000001_migrate_categorias_v1_v2.sql
--
-- PRÉ-REQUISITO: rodar APENAS depois de 1 sprint completo com shim V1→V2 ativo
-- no edge mapper. Antes disso, esta migration vai falhar com VIOLATES CHECK
-- caso `rubrica_aliases` ainda use nomes V1, e/ou vai apagar nomes V1 em
-- JSONB sem fallback no código.
--
-- CHECKLIST PRÉ-RUN:
--   [ ] Edge function holerite-mapper-v2 deployed com shim ativo há ≥ 7 dias
--   [ ] Frontend não lê nem grava nomes V1 em parsed.rubricas_classificadas
--   [ ] Backup do snapshot do Supabase (export documents.parsed)
--   [ ] Confirmação de que nenhum case ativo em produção depende de nome V1
--
-- O que faz:
--   1. Atualiza JSONB persistido em documents.parsed.rubricas_classificadas
--   2. Atualiza rubrica_aliases.categoria nas linhas que ainda estiverem em V1
--   3. Apaga aliases V1 do CHECK constraint
--   4. Valida zero remanescentes

BEGIN;

-- =========================================================================
-- 1. Atualizar JSONB persistido em documents
-- =========================================================================
UPDATE documents
SET parsed = jsonb_set(
  parsed,
  '{rubricas_classificadas}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN r->>'categoria' = 'COMISSAO_PRODUTOS'
          THEN jsonb_set(r, '{categoria}', '"COMISSOES_PRODUTOS"')
        WHEN r->>'categoria' = 'COMISSAO_SERVICOS'
          THEN jsonb_set(r, '{categoria}', '"COMISSOES_SERVICOS"')
        WHEN r->>'categoria' = 'PREMIO'
          THEN jsonb_set(r, '{categoria}', '"PREMIOS"')
        WHEN r->>'categoria' = 'DSR_PAGO'
          THEN jsonb_set(r, '{categoria}', '"DSR_S_COMISSOES"')
        WHEN r->>'categoria' = 'DESCONSIDERAR'
          THEN jsonb_set(r, '{categoria}', '"DESCONSIDERADAS"')
        ELSE r
      END
    )
    FROM jsonb_array_elements(parsed->'rubricas_classificadas') r
  )
)
WHERE parsed ? 'rubricas_classificadas'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(parsed->'rubricas_classificadas') r
    WHERE r->>'categoria' IN (
      'COMISSAO_PRODUTOS','COMISSAO_SERVICOS','PREMIO','DSR_PAGO','DESCONSIDERAR'
    )
  );

-- =========================================================================
-- 2. Atualizar rubrica_aliases (se algum aluno conseguiu inserir V1)
-- =========================================================================
UPDATE rubrica_aliases
SET categoria = CASE categoria
  WHEN 'COMISSAO_PRODUTOS'  THEN 'COMISSOES_PRODUTOS'
  WHEN 'COMISSAO_SERVICOS'  THEN 'COMISSOES_SERVICOS'
  WHEN 'PREMIO'             THEN 'PREMIOS'
  WHEN 'DSR_PAGO'           THEN 'DSR_S_COMISSOES'
  WHEN 'DESCONSIDERAR'      THEN 'DESCONSIDERADAS'
  ELSE categoria
END
WHERE categoria IN ('COMISSAO_PRODUTOS','COMISSAO_SERVICOS','PREMIO','DSR_PAGO','DESCONSIDERAR');

-- =========================================================================
-- 3. Endurecer CHECK constraint (drop nomes V1)
-- =========================================================================
ALTER TABLE rubrica_aliases DROP CONSTRAINT chk_categoria_valida;
ALTER TABLE rubrica_aliases ADD CONSTRAINT chk_categoria_valida CHECK (categoria IN (
  'MINIMO_GARANTIDO',
  'SALARIO_SUBSTITUICAO',
  'COMISSOES_PRODUTOS',
  'COMISSOES_SERVICOS',
  'DSR_S_COMISSOES',
  'PREMIOS',
  'DESCONSIDERADAS',
  'NAO_CLASSIFICADO'
));

-- =========================================================================
-- 4. Validação fail-fast
-- =========================================================================
DO $$
DECLARE
  v_documents_remanescentes int;
  v_aliases_remanescentes int;
BEGIN
  SELECT count(*)
    INTO v_documents_remanescentes
    FROM documents, jsonb_array_elements(parsed->'rubricas_classificadas') r
   WHERE r->>'categoria' IN ('COMISSAO_PRODUTOS','COMISSAO_SERVICOS','PREMIO','DSR_PAGO','DESCONSIDERAR');

  SELECT count(*)
    INTO v_aliases_remanescentes
    FROM rubrica_aliases
   WHERE categoria IN ('COMISSAO_PRODUTOS','COMISSAO_SERVICOS','PREMIO','DSR_PAGO','DESCONSIDERAR');

  IF v_documents_remanescentes > 0 OR v_aliases_remanescentes > 0 THEN
    RAISE EXCEPTION 'Migration incompleta: % linhas documents, % linhas rubrica_aliases ainda com V1',
      v_documents_remanescentes, v_aliases_remanescentes;
  END IF;

  RAISE NOTICE 'Migration V1→V2 OK. Documents atualizados, aliases atualizados, CHECK endurecido.';
END $$;

COMMIT;
