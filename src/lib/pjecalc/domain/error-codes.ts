/**
 * =====================================================
 * STRUCTURED ERROR & WARNING CATALOG
 * =====================================================
 * 
 * Production-grade failure policy for legal-financial calculations.
 * 
 * NAMING:
 * - E### = Blocking errors (calculation halted or result unreliable)
 * - W### = Non-blocking warnings (result usable but degraded)
 * - I### = Informational (no impact on result)
 * 
 * MODULES:
 * parser | bridge | params | correcao | juros | cs | ir | fgts | 
 * historico | cartao_ponto | ferias | faltas | verbas | reflexos |
 * seguro | custas | honorarios | pensao | previdencia | auditoria
 */

export interface StructuredError {
  code: string;
  severity: 'error' | 'warning' | 'info';
  module: string;
  message: string;
  friendly: string;
  blocking: boolean;
  action: string;
  condition?: string;
}

export const ERROR_CATALOG: Record<string, StructuredError> = {
  // =====================================================
  // BLOCKING ERRORS (E001 - E050)
  // =====================================================

  // --- Parser ---
  E001: { code: 'E001', severity: 'error', module: 'parser', blocking: true,
    message: 'XML inválido ou corrompido',
    friendly: 'O arquivo PJC não pôde ser lido. Verifique se o arquivo está íntegro.',
    action: 'Obter novo arquivo PJC ou verificar a integridade do download.',
    condition: 'DOMParser retorna erro de parsing' },
  E002: { code: 'E002', severity: 'error', module: 'parser', blocking: true,
    message: 'XML válido mas incompatível com o parser esperado (sem root <Calculo>)',
    friendly: 'O arquivo não é um PJC válido do PJe-Calc.',
    action: 'Verificar se o arquivo é realmente exportado do PJe-Calc.',
    condition: 'Root element não é <Calculo>' },
  E003: { code: 'E003', severity: 'error', module: 'correcao', blocking: true,
    message: 'Índices de correção monetária ausentes para competências do cálculo',
    friendly: 'Índices de atualização monetária não encontrados. O cálculo não pode ser executado.',
    action: 'Sincronizar índices oficiais (IPCA-E, SELIC, TR, etc).',
    condition: 'indicesDB vazio ou sem entradas para o índice configurado' },
  E004: { code: 'E004', severity: 'error', module: 'params', blocking: true,
    message: 'Data de admissão não informada',
    friendly: 'A data de admissão é obrigatória para o cálculo.',
    action: 'Informar a data de admissão nos parâmetros.',
    condition: 'params.data_admissao vazio ou undefined' },
  E005: { code: 'E005', severity: 'error', module: 'params', blocking: true,
    message: 'Data de ajuizamento não informada — necessária para prescrição e regime ADC 58',
    friendly: 'A data de ajuizamento é obrigatória (define prescrição e regime de juros).',
    action: 'Informar a data de ajuizamento nos parâmetros.',
    condition: 'params.data_ajuizamento vazio' },
  E006: { code: 'E006', severity: 'error', module: 'params', blocking: true,
    message: 'Data de liquidação não informada — cálculo será não-determinístico',
    friendly: 'A data de liquidação é obrigatória para cálculos determinísticos.',
    action: 'Informar a data de liquidação.',
    condition: 'correcaoConfig.data_liquidacao vazio' },
  E007: { code: 'E007', severity: 'error', module: 'parser', blocking: true,
    message: 'Bloco crítico ausente no PJC (verbas, parâmetros ou resultado)',
    friendly: 'O arquivo PJC não contém dados essenciais.',
    action: 'Verificar se o arquivo PJC está completo.',
    condition: 'verbas.length === 0 ou parametros.admissao vazio' },
  E008: { code: 'E008', severity: 'error', module: 'params', blocking: true,
    message: 'Inconsistência estrutural: admissão posterior à demissão',
    friendly: 'A data de admissão é posterior à data de demissão.',
    action: 'Corrigir as datas do contrato.' },

  // --- Tables ---
  E010: { code: 'E010', severity: 'error', module: 'cs', blocking: true,
    message: 'Tabela INSS ausente para competências do cálculo',
    friendly: 'Faixas de INSS não encontradas. O cálculo depende destas faixas.',
    action: 'Carregar tabelas de INSS via seed ou sincronização.' },
  E011: { code: 'E011', severity: 'error', module: 'ir', blocking: true,
    message: 'Tabela IR ausente para competências do cálculo',
    friendly: 'Faixas de IR não encontradas.',
    action: 'Carregar tabelas de IR via seed ou sincronização.' },
  E012: { code: 'E012', severity: 'error', module: 'juros', blocking: true,
    message: 'TAXA_LEGAL: série histórica ausente',
    friendly: 'A série da Taxa Legal não está disponível. Juros não podem ser calculados.',
    action: 'Carregar série histórica da Taxa Legal.' },
  E013: { code: 'E013', severity: 'error', module: 'correcao', blocking: true,
    message: 'Transição de índice quebrada: fator=null em segmento crítico',
    friendly: 'Transição entre regimes de correção falhou por falta de dados.',
    action: 'Verificar se todos os índices necessários estão carregados.' },
  E014: { code: 'E014', severity: 'error', module: 'correcao', blocking: true,
    message: 'Transição de juros quebrada: série ausente em segmento',
    friendly: 'Transição entre regimes de juros falhou.',
    action: 'Verificar séries de juros.' },

  // --- Data integrity ---
  E020: { code: 'E020', severity: 'error', module: 'historico', blocking: true,
    message: 'Histórico salarial vazio por falha de parse (0 ocorrências extraídas)',
    friendly: 'Nenhum valor salarial foi encontrado no arquivo.',
    action: 'Verificar se o PJC contém histórico salarial.' },
  E021: { code: 'E021', severity: 'error', module: 'cartao_ponto', blocking: true,
    message: 'Apuração diária presente no XML mas ausente no engine',
    friendly: 'Dados de jornada diária existem no arquivo mas não chegaram ao motor de cálculo.',
    action: 'Bug interno — reportar.' },
  E022: { code: 'E022', severity: 'error', module: 'verbas', blocking: true,
    message: 'Verba dependente de cartão de ponto sem cartão disponível',
    friendly: 'Uma verba requer dados de jornada que não estão disponíveis.',
    action: 'Importar cartão de ponto ou ajustar tipo de quantidade.' },
  E023: { code: 'E023', severity: 'error', module: 'reflexos', blocking: true,
    message: 'Reflexo com base não resolvida (verba principal ausente)',
    friendly: 'Um reflexo depende de uma verba que não existe no cálculo.',
    action: 'Verificar DAG de dependências.' },
  E024: { code: 'E024', severity: 'error', module: 'reflexos', blocking: true,
    message: 'DAG de dependência inconsistente (ciclo detectado)',
    friendly: 'Dependência circular entre verbas.',
    action: 'Verificar configuração de verbas e reflexos.' },

  // --- Correction ---
  E025: { code: 'E025', severity: 'error', module: 'correcao', blocking: true,
    message: 'Cumulação indevida de SELIC com outro índice de correção no mesmo segmento',
    friendly: 'SELIC já inclui correção + juros. Não pode ser combinada com outro índice.',
    action: 'Revisar configuração de correção monetária.' },
  E026: { code: 'E026', severity: 'error', module: 'juros', blocking: true,
    message: 'Cumulação indevida de SELIC (como correção) com juros autônomos',
    friendly: 'Quando SELIC é o índice de correção, juros separados são bis in idem.',
    action: 'Revisar configuração de juros.' },
  E027: { code: 'E027', severity: 'error', module: 'params', blocking: true,
    message: 'Data de liquidação inválida ou no futuro distante',
    friendly: 'A data de liquidação parece incorreta.',
    action: 'Verificar a data de liquidação.' },
  E028: { code: 'E028', severity: 'error', module: 'correcao', blocking: true,
    message: 'Mês aberto usado como índice final sem regra explícita',
    friendly: 'O índice do mês corrente ainda não foi publicado.',
    action: 'Aguardar publicação ou usar último mês fechado.' },

  // =====================================================
  // WARNINGS (W001 - W050) — Non-blocking
  // =====================================================

  W001: { code: 'W001', severity: 'warning', module: 'historico', blocking: false,
    message: 'Histórico salarial sintético gerado a partir de verbas (fallback)',
    friendly: 'O PJC não contém histórico salarial real. Histórico aproximado gerado.',
    action: 'Verificar valores salariais.' },
  W002: { code: 'W002', severity: 'warning', module: 'cartao_ponto', blocking: false,
    message: 'Cartão de ponto vazio — usando ocorrências precomputadas do PJC',
    friendly: 'Sem jornada diária. Usando valores pré-calculados.',
    action: 'Verificar se o PJC contém apuração diária.' },
  W003: { code: 'W003', severity: 'warning', module: 'modulo', blocking: false,
    message: 'Módulo PJe-Calc não suportado nesta versão',
    friendly: 'Alguns módulos do cálculo original não são suportados.',
    action: 'Verificar divergências nos módulos não suportados.' },
  W004: { code: 'W004', severity: 'warning', module: 'fgts', blocking: false,
    message: 'Tabela de FGTS complementar ausente — usando alíquota padrão 8%',
    friendly: 'Usando alíquota FGTS padrão.',
    action: 'Nenhuma ação necessária na maioria dos casos.' },
  W005: { code: 'W005', severity: 'warning', module: 'seguro', blocking: false,
    message: 'Tabela de seguro-desemprego ausente — usando valores de 2025',
    friendly: 'Usando tabela atual de seguro-desemprego.',
    action: 'Carregar tabelas históricas se necessário.' },
  W006: { code: 'W006', severity: 'warning', module: 'salario_familia', blocking: false,
    message: 'Tabela de salário-família ausente — usando valores de 2025',
    friendly: 'Usando tabela atual de salário-família.',
    action: 'Carregar tabelas históricas se necessário.' },
  W007: { code: 'W007', severity: 'warning', module: 'bridge', blocking: false,
    message: 'Bloco do PJC não mapeado na bridge',
    friendly: 'Parte do PJC não foi convertida para o motor.',
    action: 'Verificar relatório de fidelidade.' },
  W008: { code: 'W008', severity: 'warning', module: 'paridade', blocking: false,
    message: 'Divergência de precisão entre engine e PJC (arredondamento)',
    friendly: 'Pequena diferença de arredondamento com o PJe-Calc.',
    action: 'Diferenças < R$ 0,10 são normais.' },
  W009: { code: 'W009', severity: 'warning', module: 'fallback', blocking: false,
    message: 'Valor default utilizado na ausência de dado histórico',
    friendly: 'Um valor padrão foi usado.',
    action: 'Verificar se o dado histórico deveria existir.' },

  // --- Correction/interest warnings ---
  W030: { code: 'W030', severity: 'warning', module: 'correcao', blocking: false,
    message: 'Índice não encontrado para competência específica — usando último disponível',
    friendly: 'Índice interpolado para uma competência.',
    action: 'Verificar se o índice está atualizado.' },
  W031: { code: 'W031', severity: 'warning', module: 'correcao', blocking: false,
    message: 'Taxa negativa ignorada (ignorarTaxaNegativa=true)',
    friendly: 'Uma taxa de correção negativa foi substituída por zero.',
    action: 'Comportamento configurado no PJC.' },
  W032: { code: 'W032', severity: 'warning', module: 'cs', blocking: false,
    message: 'INSS: usando tabela padrão 2025 — sem faixas versionadas',
    friendly: 'Usando faixas de INSS atuais.',
    action: 'Carregar faixas históricas para precisão.' },
  W033: { code: 'W033', severity: 'warning', module: 'ir', blocking: false,
    message: 'IR: usando tabela padrão 2025 — sem faixas versionadas',
    friendly: 'Usando faixas de IR atuais.',
    action: 'Carregar faixas históricas para precisão.' },
  W034: { code: 'W034', severity: 'warning', module: 'paridade', blocking: false,
    message: 'Divergência material entre resultado calculado e ground truth PJC',
    friendly: 'Resultado diverge significativamente do PJe-Calc.',
    action: 'Investigar causa da divergência.' },
  W035: { code: 'W035', severity: 'warning', module: 'correcao', blocking: false,
    message: 'Juros pré-judiciais desabilitados (aplicarJurosFasePreJudicial=false)',
    friendly: 'Juros anteriores ao ajuizamento não serão aplicados.',
    action: 'Comportamento configurado no PJC.' },
  W036: { code: 'W036', severity: 'warning', module: 'bridge', blocking: false,
    message: 'Exceções de sábado encontradas mas não aplicadas no engine',
    friendly: 'Exceções de sábado não suportadas.',
    action: 'Verificar impacto manualmente.' },
  W037: { code: 'W037', severity: 'warning', module: 'historico', blocking: false,
    message: 'Histórico salarial tipo FIXO sem ocorrências — usando valor único',
    friendly: 'Histórico salarial fixo sem detalhamento mensal.',
    action: 'Verificar se valor fixo é correto.' },
  W038: { code: 'W038', severity: 'warning', module: 'verbas', blocking: false,
    message: 'Verba dependente de histórico salarial sem histórico disponível',
    friendly: 'Uma verba não tem histórico salarial vinculado.',
    action: 'Verificar configuração da verba.' },
  W039: { code: 'W039', severity: 'warning', module: 'correcao', blocking: false,
    message: 'Marco incorreto para contagem de juros (data citação ausente)',
    friendly: 'Data de citação não informada — usando ajuizamento como marco.',
    action: 'Informar data de citação se aplicável.' },
  W040: { code: 'W040', severity: 'warning', module: 'paridade', blocking: false,
    message: 'Custo/honorário/multa gerado pelo engine mas ausente no PJe-Calc',
    friendly: 'O engine calculou um módulo que o PJe-Calc não gerou.',
    action: 'Verificar configuração de honorários/custas.' },

  // =====================================================
  // INFORMATIONAL (I001 - I020)
  // =====================================================
  
  I001: { code: 'I001', severity: 'info', module: 'bridge', blocking: false,
    message: 'CartaoPonto gerado com sucesso a partir de apuração diária',
    friendly: 'Dados de jornada importados com sucesso.',
    action: 'Nenhuma ação necessária.' },
  I002: { code: 'I002', severity: 'info', module: 'correcao', blocking: false,
    message: 'Regime SELIC ativo — juros separados suprimidos (anti-cumulação)',
    friendly: 'SELIC já inclui juros — juros separados não aplicados.',
    action: 'Comportamento correto conforme ADC 58/59.' },
  I003: { code: 'I003', severity: 'info', module: 'paridade', blocking: false,
    message: 'Ground truth do PJe-Calc utilizado para calibração',
    friendly: 'Valores do PJe-Calc usados como referência.',
    action: 'Resultado calibrado para máxima paridade.' },
};

export type ErrorCode = keyof typeof ERROR_CATALOG;

/**
 * Get error definition by code string (e.g. 'E001', 'W034')
 */
export function getError(code: string): StructuredError | undefined {
  return ERROR_CATALOG[code];
}

/**
 * Check if any warnings are blocking
 */
export function hasBlockingErrors(warnings: { code: string; blocking?: boolean }[]): boolean {
  return warnings.some(w => {
    if (w.blocking !== undefined) return w.blocking;
    const def = ERROR_CATALOG[w.code];
    return def?.blocking ?? false;
  });
}
