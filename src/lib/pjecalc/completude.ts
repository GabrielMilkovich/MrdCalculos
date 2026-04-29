/**
 * Phase 4, Item 1: Indicadores de completude por módulo
 * Phase 4, Item 5: Rastreabilidade jurídica — fundamentação por verba
 */

export type ModuleStatus = 'nao_iniciado' | 'incompleto' | 'preenchido' | 'alerta' | 'validado';

interface CompletionInput {
  params: any;
  faltas: any[];
  ferias: any[];
  historicos: any[];
  verbas: any[];
  cartaoPonto?: any[];
  resultado: any;
  fgtsConfig?: any;
  csConfig?: any;
  irConfig?: any;
  correcaoConfig?: any;
  pensaoConfig?: any;
}

export function calcularCompletude(input: CompletionInput): Record<string, ModuleStatus> {
  const { params, faltas, ferias, historicos, verbas, resultado } = input;
  const status: Record<string, ModuleStatus> = {};

  // Dados do Processo
  status.dados_processo = 'nao_iniciado'; // placeholder

  // Parâmetros
  if (!params) {
    status.parametros = 'nao_iniciado';
  } else if (!params.data_admissao || !params.data_ajuizamento) {
    status.parametros = 'incompleto';
  } else if (!params.municipio || (!params.ultima_remuneracao && !params.maior_remuneracao && historicos.length === 0)) {
    status.parametros = 'alerta';
  } else {
    status.parametros = 'validado';
  }

  // Faltas
  status.faltas = faltas.length > 0 ? 'preenchido' : 'nao_iniciado';

  // Férias
  if (ferias.length === 0) {
    status.ferias = 'nao_iniciado';
  } else {
    const hasInvalid = ferias.some((f: any) => !f.periodo_aquisitivo_inicio || !f.periodo_aquisitivo_fim);
    status.ferias = hasInvalid ? 'alerta' : 'validado';
  }

  // Histórico
  if (historicos.length === 0) {
    status.historico = params?.ultima_remuneracao || params?.maior_remuneracao ? 'alerta' : 'nao_iniciado';
  } else {
    const hasNoValue = historicos.some((h: any) => !h.valor_informado && h.tipo_valor === 'informado');
    status.historico = hasNoValue ? 'incompleto' : 'validado';
  }

  // Cartão de Ponto
  const verbasCartao = (input.verbas || []).filter((v: any) => v.tipo_quantidade === 'cartao_ponto' || v.tipo_divisor === 'cartao_ponto');
  if (verbasCartao.length > 0 && (!input.cartaoPonto || input.cartaoPonto.length === 0)) {
    status.cartao_ponto = 'alerta';
  } else if (input.cartaoPonto && input.cartaoPonto.length > 0) {
    status.cartao_ponto = 'preenchido';
  } else {
    status.cartao_ponto = 'nao_iniciado';
  }

  // Verbas
  if (verbas.length === 0) {
    status.verbas = 'nao_iniciado';
  } else {
    const hasNoPeriod = verbas.some((v: any) => !v.periodo_inicio || !v.periodo_fim);
    status.verbas = hasNoPeriod ? 'incompleto' : 'preenchido';
  }

  // Config modules — read real config when available
  status.fgts = (input.fgtsConfig as Record<string, unknown>)?.apurar || input.fgtsConfig?.habilitado ? 'preenchido' : 'nao_iniciado';
  status.cs = (input.csConfig as Record<string, unknown>)?.apurar_segurado || (input.csConfig as Record<string, unknown>)?.apurar_empresa || input.csConfig?.habilitado ? 'preenchido' : 'nao_iniciado';
  status.ir = (input.irConfig as Record<string, unknown>)?.apurar || input.irConfig?.habilitado ? 'preenchido' : 'nao_iniciado';
  status.correcao = (input.correcaoConfig as Record<string, unknown>)?.data_liquidacao || input.correcaoConfig?.indice ? 'preenchido' : 'nao_iniciado';
  status.seguro = 'nao_iniciado';
  status.salario_familia = 'nao_iniciado';
  status.multas = 'nao_iniciado';
  status.pensao = input.pensaoConfig?.apurar ? 'preenchido' : 'nao_iniciado';
  status.prev_privada = 'nao_iniciado';
  status.honorarios = 'nao_iniciado';
  status.custas = 'nao_iniciado';

  // Resumo
  status.resumo = resultado ? 'validado' : 'nao_iniciado';

  return status;
}

/**
 * Phase 4, Item 5: Rastreabilidade jurídica por componente
 */
export interface RastreabilidadeJuridica {
  componente: string;
  fundamento: string;
  artigo: string;
  tipo: 'legal' | 'parametrizado' | 'sistema';
  vigencia?: string;
  fonte?: string;
}

export function getRastreabilidadeGeral(): RastreabilidadeJuridica[] {
  return [
    { componente: 'FGTS 8%', fundamento: 'Lei 8.036/1990, Art. 15', artigo: 'Art. 15', tipo: 'legal', fonte: 'planalto.gov.br' },
    { componente: 'Multa FGTS 40%', fundamento: 'CF/88, Art. 7º, I + Lei 8.036/1990, Art. 18', artigo: 'Art. 18', tipo: 'legal' },
    { componente: 'INSS Progressivo', fundamento: 'EC 103/2019 — Alíquotas progressivas', artigo: 'EC 103', tipo: 'legal', vigencia: '13/11/2019' },
    { componente: 'IR RRA', fundamento: 'Lei 7.713/1988, Art. 12-A', artigo: 'Art. 12-A', tipo: 'legal' },
    { componente: 'Correção IPCA-E→SELIC', fundamento: 'ADC 58/59 STF', artigo: 'ADC 58', tipo: 'legal', vigencia: '18/12/2020' },
    { componente: 'Juros de Mora 1% a.m.', fundamento: 'Lei 8.177/1991, Art. 39', artigo: 'Art. 39', tipo: 'legal' },
    { componente: 'Prescrição FGTS', fundamento: 'ARE 709.212/DF STF — Quinquenal', artigo: 'ARE 709.212', tipo: 'legal', vigencia: '13/11/2014' },
    { componente: 'Férias CLT Art. 130', fundamento: 'CLT, Art. 130 — Redução por faltas', artigo: 'Art. 130', tipo: 'legal' },
    { componente: 'Aviso Prévio Proporcional', fundamento: 'Lei 12.506/2011', artigo: 'Lei 12.506', tipo: 'legal' },
    { componente: 'Custas Processuais', fundamento: 'CLT, Art. 789', artigo: 'Art. 789', tipo: 'legal' },
    { componente: 'Multa Art. 523 CPC', fundamento: 'CPC, Art. 523, §1º', artigo: 'Art. 523', tipo: 'legal' },
    { componente: 'Honorários Sucumbenciais', fundamento: 'CLT, Art. 791-A (Reforma Trabalhista)', artigo: 'Art. 791-A', tipo: 'legal', vigencia: '11/11/2017' },
    { componente: 'Seguro-Desemprego', fundamento: 'Lei 7.998/1990 + Resolução CODEFAT', artigo: 'Lei 7.998', tipo: 'legal' },
  ];
}
