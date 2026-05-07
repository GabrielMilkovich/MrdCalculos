-- =====================================================
-- F1.3 — Unificar recibo_ferias / registro_faltas em CTPS
-- =====================================================
-- Antes: documento de férias OU faltas tinha tipo_extracao próprio.
-- Causava confusão (CTPS já cobre ambos, dropdown com 6 opções, etc.).
--
-- Agora: tipo_extracao = ctps cobre os 3 casos (recibo de férias avulso,
-- registro de faltas avulso, CTPS com ambos). Mappers V6/V5 já rodam os
-- 2 parsers (ferias + faltas) sobre o mesmo OCR — quando um for vazio,
-- CSV correspondente fica header-only no ZIP (já implementado em A.6).
--
-- Migração de dados: docs existentes com tipo_extracao em
-- ('recibo_ferias','registro_faltas') passam pra 'ctps'.
-- =====================================================

BEGIN;

-- 1. Migra dados antes de mudar a constraint.
UPDATE documents
   SET tipo_extracao = 'ctps'
 WHERE tipo_extracao IN ('recibo_ferias', 'registro_faltas');

-- 2. Atualiza a CHECK constraint pra rejeitar os tipos legados.
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_tipo_extracao_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_tipo_extracao_check
  CHECK (tipo_extracao IN (
    'nao_extrair',
    'holerite',
    'cartao_ponto',
    'ctps'
  ));

COMMENT ON CONSTRAINT documents_tipo_extracao_check ON documents IS
  'F1.3: tipos de extração suportados. recibo_ferias e registro_faltas '
  'foram unificados em ctps (que dispara férias+faltas no mesmo doc).';

COMMIT;
