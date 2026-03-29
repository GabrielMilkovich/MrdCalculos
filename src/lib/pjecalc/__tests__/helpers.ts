/**
 * Shared test helpers and factory functions for PjeCalcEngine tests.
 */
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias,
  PjeVerba, PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
} from '../engine-types';
import { PjeCalcEngine } from '../engine';

// ── Default Params ──
export function makeParams(overrides: Partial<PjeParametros> = {}): PjeParametros {
  return {
    case_id: 'test-case-001',
    data_admissao: '2020-01-01',
    data_demissao: '2023-12-31',
    data_ajuizamento: '2024-06-01',
    data_citacao: '2024-08-01',
    modo_calculo: 'independent' as const,
    estado: 'SP',
    municipio: 'Sao Paulo',
    regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    maior_remuneracao: 3000,
    ultima_remuneracao: 3000,
    prazo_aviso_previo: 'calculado',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: true,
    sabado_dia_util: false,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    ...overrides,
  };
}

// ── Default Historico Salarial ──
export function makeHistorico(overrides: Partial<PjeHistoricoSalarial> = {}): PjeHistoricoSalarial {
  return {
    id: 'hist-001',
    nome: 'Salario Base',
    periodo_inicio: '2020-01-01',
    periodo_fim: '2023-12-31',
    tipo_valor: 'informado',
    valor_informado: 3000,
    incidencia_fgts: true,
    incidencia_cs: true,
    fgts_recolhido: false,
    cs_recolhida: false,
    ocorrencias: [],
    ...overrides,
  };
}

export function makeHistoricoWithOcorrencias(
  valor: number,
  competencias: string[],
  overrides: Partial<PjeHistoricoSalarial> = {},
): PjeHistoricoSalarial {
  return makeHistorico({
    ...overrides,
    ocorrencias: competencias.map((c, i) => ({
      id: `oc-hist-${i}`,
      historico_id: overrides.id || 'hist-001',
      competencia: c,
      valor,
      tipo: 'informado' as const,
    })),
  });
}

// ── Default Verba ──
export function makeVerba(overrides: Partial<PjeVerba> = {}): PjeVerba {
  return {
    id: 'verba-001',
    nome: 'Horas Extras 50%',
    tipo: 'principal',
    valor: 'calculado',
    caracteristica: 'comum',
    ocorrencia_pagamento: 'mensal',
    compor_principal: true,
    zerar_valor_negativo: true,
    dobrar_valor_devido: false,
    periodo_inicio: '2023-01-01',
    periodo_fim: '2023-12-31',
    base_calculo: {
      historicos: ['hist-001'],
      verbas: [],
      tabelas: [],
      proporcionalizar: false,
      integralizar: false,
    },
    tipo_divisor: 'informado',
    divisor_informado: 220,
    multiplicador: 1.5,
    tipo_quantidade: 'informada',
    quantidade_informada: 10,
    quantidade_proporcionalizar: false,
    exclusoes: {
      faltas_justificadas: false,
      faltas_nao_justificadas: false,
      ferias_gozadas: false,
    },
    incidencias: {
      fgts: true,
      irpf: true,
      contribuicao_social: true,
      previdencia_privada: false,
      pensao_alimenticia: false,
    },
    juros_ajuizamento: 'ocorrencias_vencidas',
    gerar_verba_reflexa: 'diferenca',
    gerar_verba_principal: 'diferenca',
    ordem: 1,
    ...overrides,
  };
}

// ── Default Configs ──
export function makeFgtsConfig(overrides: Partial<PjeFGTSConfig> = {}): PjeFGTSConfig {
  return {
    apurar: true,
    destino: 'pagar_reclamante',
    compor_principal: false,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: 40,
    multa_base: 'devido',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
    ...overrides,
  };
}

export function makeCsConfig(overrides: Partial<PjeCSConfig> = {}): PjeCSConfig {
  return {
    apurar_segurado: true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'fixa',
    aliquota_empresa_fixa: 20,
    aliquota_sat_fixa: 2,
    aliquota_terceiros_fixa: 5.8,
    periodos_simples: [],
    ...overrides,
  };
}

export function makeIrConfig(overrides: Partial<PjeIRConfig> = {}): PjeIRConfig {
  return {
    apurar: true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: false,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: 0,
    ...overrides,
  };
}

export function makeCorrecaoConfig(overrides: Partial<PjeCorrecaoConfig> = {}): PjeCorrecaoConfig {
  return {
    indice: 'IPCA-E',
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: '2025-06-01',
    ...overrides,
  };
}

export function makeHonorariosConfig(overrides: Partial<PjeHonorariosConfig> = {}): PjeHonorariosConfig {
  return {
    apurar_sucumbenciais: false,
    percentual_sucumbenciais: 15,
    base_sucumbenciais: 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
    ...overrides,
  };
}

export function makeCustasConfig(overrides: Partial<PjeCustasConfig> = {}): PjeCustasConfig {
  return {
    apurar: false,
    percentual: 2,
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
    itens: [],
    ...overrides,
  };
}

export function makeSeguroConfig(overrides: Partial<PjeSeguroConfig> = {}): PjeSeguroConfig {
  return {
    apurar: false,
    parcelas: 0,
    recebeu: false,
    ...overrides,
  };
}

// ── Index DB helper ──
export function makeIndices(entries: { indice: string; competencia: string; valor: number; acumulado: number }[]): PjeIndiceRow[] {
  return entries.map(e => ({
    indice: e.indice,
    competencia: e.competencia,
    valor: e.valor,
    acumulado: e.acumulado,
  }));
}

// ── INSS Faixas helper ──
export function makeINSSFaixas(faixas: { ate: number; aliquota: number }[]): PjeINSSFaixaRow[] {
  return faixas.map((f, i) => ({
    competencia_inicio: '2025-01-01',
    competencia_fim: null,
    faixa: i + 1,
    valor_ate: f.ate,
    aliquota: f.aliquota,
  }));
}

// ── IR Faixas helper ──
export function makeIRFaixas(faixas: { ate: number; aliquota: number; deducao: number }[]): PjeIRFaixaRow[] {
  return faixas.map((f, i) => ({
    competencia_inicio: '2025-01-01',
    competencia_fim: null,
    faixa: i + 1,
    valor_ate: f.ate,
    aliquota: f.aliquota,
    deducao: f.deducao,
    deducao_dependente: 189.59,
  }));
}

// ── Full Engine Factory ──
export function createEngine(opts: {
  params?: Partial<PjeParametros>;
  historicos?: PjeHistoricoSalarial[];
  faltas?: PjeFalta[];
  ferias?: PjeFerias[];
  verbas?: PjeVerba[];
  cartaoPonto?: PjeCartaoPonto[];
  fgtsConfig?: Partial<PjeFGTSConfig>;
  csConfig?: Partial<PjeCSConfig>;
  irConfig?: Partial<PjeIRConfig>;
  correcaoConfig?: Partial<PjeCorrecaoConfig>;
  honorariosConfig?: Partial<PjeHonorariosConfig>;
  custasConfig?: Partial<PjeCustasConfig>;
  seguroConfig?: Partial<PjeSeguroConfig>;
  indicesDB?: PjeIndiceRow[];
  faixasINSSDB?: PjeINSSFaixaRow[];
  faixasIRDB?: PjeIRFaixaRow[];
} = {}): PjeCalcEngine {
  return new PjeCalcEngine(
    makeParams(opts.params),
    opts.historicos || [makeHistorico()],
    opts.faltas || [],
    opts.ferias || [],
    opts.verbas || [makeVerba()],
    opts.cartaoPonto || [],
    makeFgtsConfig(opts.fgtsConfig),
    makeCsConfig(opts.csConfig),
    makeIrConfig(opts.irConfig),
    makeCorrecaoConfig(opts.correcaoConfig),
    makeHonorariosConfig(opts.honorariosConfig),
    makeCustasConfig(opts.custasConfig),
    makeSeguroConfig(opts.seguroConfig),
    opts.indicesDB || [],
    opts.faixasINSSDB || [],
    opts.faixasIRDB || [],
  );
}
