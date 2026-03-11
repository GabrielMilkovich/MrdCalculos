/**
 * =====================================================
 * ERROR & WARNING CODES — Structured failure policy
 * =====================================================
 * 
 * BLOCK calculation when:
 * - Essential historical table missing
 * - Parser can't map critical block  
 * - Structural inconsistency
 * - Essential daily journey can't be interpreted
 * - Competência error affecting principal verbas
 * 
 * ALLOW with WARNING when:
 * - Non-essential block missing
 * - Secondary loss without material impact
 * - Informational incompatibility
 */

export const ERROR_CODES = {
  // === BLOCKING ERRORS ===
  
  // Table missing
  INSS_TABLE_MISSING: {
    code: 'E001',
    message: 'Tabela de faixas INSS ausente para competências do cálculo',
    friendly: 'Tabela do INSS não encontrada. O cálculo não pode ser executado sem as faixas de contribuição social.',
    action: 'Carregar tabelas de INSS via seed ou sincronização.',
  },
  IR_TABLE_MISSING: {
    code: 'E002',
    message: 'Tabela de faixas IR ausente para competências do cálculo',
    friendly: 'Tabela do Imposto de Renda não encontrada. O cálculo não pode ser executado sem as faixas de IR.',
    action: 'Carregar tabelas de IR via seed ou sincronização.',
  },
  INDICES_MISSING: {
    code: 'E003',
    message: 'Índices de correção monetária ausentes para competências do cálculo',
    friendly: 'Índices de atualização monetária não encontrados. É necessário carregar os índices oficiais.',
    action: 'Sincronizar índices com o Banco Central.',
  },
  PARAM_ADMISSAO_MISSING: {
    code: 'E004',
    message: 'Data de admissão não informada',
    friendly: 'A data de admissão é obrigatória para o cálculo.',
    action: 'Informar a data de admissão nos parâmetros do cálculo.',
  },
  PARAM_AJUIZAMENTO_MISSING: {
    code: 'E005',
    message: 'Data de ajuizamento não informada',
    friendly: 'A data de ajuizamento é obrigatória (define prescrição e regime de juros ADC 58).',
    action: 'Informar a data de ajuizamento nos parâmetros do cálculo.',
  },
  PARAM_LIQUIDACAO_MISSING: {
    code: 'E006',
    message: 'Data de liquidação não informada — cálculo será não-determinístico',
    friendly: 'A data de liquidação é obrigatória para cálculos determinísticos.',
    action: 'Informar a data de liquidação.',
  },
  PARSER_CRITICAL_BLOCK: {
    code: 'E007',
    message: 'Parser não conseguiu mapear bloco crítico do PJC',
    friendly: 'O arquivo PJC contém dados que não puderam ser interpretados corretamente.',
    action: 'Verificar a versão do arquivo PJC e contatar suporte.',
  },
  STRUCTURAL_INCONSISTENCY: {
    code: 'E008',
    message: 'Inconsistência estrutural no cálculo',
    friendly: 'Foram encontradas inconsistências que impedem o cálculo correto.',
    action: 'Verificar os dados de entrada do cálculo.',
  },
  
  // === WARNINGS (non-blocking) ===
  
  SYNTHETIC_HISTORICO_USED: {
    code: 'W001',
    message: 'Histórico salarial sintético gerado a partir de verbas (fallback)',
    friendly: 'O arquivo PJC não contém histórico salarial real. Foi gerado um histórico aproximado a partir das verbas.',
    action: 'Verificar se os valores salariais estão corretos.',
  },
  CARTAO_PONTO_EMPTY: {
    code: 'W002',
    message: 'Cartão de ponto vazio — usando ocorrências precomputadas',
    friendly: 'Sem dados de jornada diária. O cálculo usará as ocorrências pré-calculadas do PJC.',
    action: 'Verificar se o arquivo PJC contém apuração diária.',
  },
  MODULE_UNSUPPORTED: {
    code: 'W003',
    message: 'Módulo PJe-Calc não suportado nesta versão',
    friendly: 'Alguns módulos do cálculo original não são suportados ainda.',
    action: 'Verificar divergências nos módulos não suportados.',
  },
  FGTS_TABLE_MISSING: {
    code: 'W004',
    message: 'Tabela de FGTS complementar não encontrada',
    friendly: 'Sem tabelas complementares de FGTS. Usando alíquota padrão de 8%.',
    action: 'Nenhuma ação necessária para a maioria dos casos.',
  },
  SEGURO_TABLE_MISSING: {
    code: 'W005',
    message: 'Tabela de seguro-desemprego ausente — usando valores de 2025',
    friendly: 'Tabela de seguro-desemprego não encontrada. Usando valores atuais.',
    action: 'Carregar tabelas históricas de seguro-desemprego se necessário.',
  },
  SALARIO_FAMILIA_TABLE_MISSING: {
    code: 'W006',
    message: 'Tabela de salário-família ausente — usando valores de 2025',
    friendly: 'Tabela de salário-família não encontrada. Usando valores atuais.',
    action: 'Carregar tabelas históricas de salário-família se necessário.',
  },
  PJC_BLOCK_UNMAPPED: {
    code: 'W007',
    message: 'Bloco do PJC não mapeado na bridge',
    friendly: 'Parte do arquivo PJC não foi convertida para o motor de cálculo.',
    action: 'Verificar o relatório de fidelidade para detalhes.',
  },
  PRECISION_DIVERGENCE: {
    code: 'W008',
    message: 'Divergência de precisão detectada entre engine e PJC',
    friendly: 'Pequena diferença de arredondamento entre o cálculo e o valor original.',
    action: 'Diferenças menores que R$ 0,10 são normais por arredondamento.',
  },
  DEFAULT_FALLBACK_USED: {
    code: 'W009',
    message: 'Valor default utilizado na ausência de dado histórico',
    friendly: 'Um valor padrão foi usado porque o dado histórico não estava disponível.',
    action: 'Verificar se o dado histórico deveria estar disponível.',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
