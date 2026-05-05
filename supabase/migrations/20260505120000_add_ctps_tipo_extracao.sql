-- =====================================================
-- Adiciona 'ctps' como tipo_extracao válido
-- =====================================================
-- CTPS (Carteira de Trabalho) tipicamente vem como UM documento físico
-- contendo TANTO o Recibo de Férias QUANTO o Registro de Faltas. Antes,
-- o operador precisava classificar como um OU outro e perdia a metade
-- não escolhida. Agora o tipo 'ctps' aciona AMBOS os parsers no mesmo
-- documento e gera um ZIP com 2 CSVs.
-- =====================================================

BEGIN;

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_tipo_extracao_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_tipo_extracao_check
  CHECK (tipo_extracao IN (
    'nao_extrair',
    'holerite',
    'recibo_ferias',
    'registro_faltas',
    'cartao_ponto',
    'ctps'
  ));

COMMENT ON CONSTRAINT documents_tipo_extracao_check ON documents IS
  'Tipos de extração suportados. ctps = Carteira de Trabalho (férias + faltas no mesmo documento).';

COMMIT;
