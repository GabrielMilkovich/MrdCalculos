/**
 * Edge-Case Test Helpers — Specialized fixtures for critical scenario coverage
 *
 * These helpers extend the base test helpers with support for edge case scenarios:
 * - Minimal case construction with sensible defaults
 * - Specific regime/profile handling (rural, doméstico, aprendiz, etc.)
 * - Engine execution wrapper with result summary
 */

import type {
  PjeParametros, PjeHistoricoSalarial, PjeVerba, PjeFGTSConfig,
  PjeCSConfig, PjeIRConfig, PjeCorrecaoConfig, PjeHonorariosConfig,
  PjeCustasConfig, PjeSeguroConfig, PjeIndiceRow, PjeINSSFaixaRow,
  PjeIRFaixaRow, PjeLiquidacaoResult,
} from '../../engine-types';
import { PjeCalcEngineV3 } from '../../engine-v3';

/**
 * Minimal case factory with sensible defaults for edge testing.
 * Supports override of any parameter.
 */
export function makeMinimalCase(opts: {
  // Dates
  data_admissao?: string;
  data_demissao?: string;
  data_ajuizamento?: string;
  data_citacao?: string;

  // Regime (affects rules significantly)
  regime?: 'CLT' | 'INTERMITENTE' | 'RURAL' | 'DOMESTICO' | 'APRENDIZ' | 'ESTAGIARIO';

  // Salary
  salario_mensal?: number;

  // Period (in months for easier setup)
  meses?: number;

  // Special flags for edge cases
  em_curso?: boolean; // contrato ainda não finalizado
  tem_multa_fgts?: boolean;
  tem_ferias_indenizadas?: boolean;
  tem_13?: boolean;
  tem_rra?: boolean;
  rra_meses?: number;
  tem_adc58?: boolean;
  adc58_tipo?: 'TRANSICAO' | 'PRE_ADC58';

  // Additional overrides
  params?: Partial<PjeParametros>;
  historicos?: Partial<PjeHistoricoSalarial>[];
  verbas?: Partial<PjeVerba>[];
  fgtsConfig?: Partial<PjeFGTSConfig>;
  csConfig?: Partial<PjeCSConfig>;
  irConfig?: Partial<PjeIRConfig>;
  correcaoConfig?: Partial<PjeCorrecaoConfig>;
} = {}): {
  params: PjeParametros;
  historicos: PjeHistoricoSalarial[];
  verbas: PjeVerba[];
  fgtsConfig: PjeFGTSConfig;
  csConfig: PjeCSConfig;
  irConfig: PjeIRConfig;
  correcaoConfig: PjeCorrecaoConfig;
  honorariosConfig: PjeHonorariosConfig;
  custasConfig: PjeCustasConfig;
  seguroConfig: PjeSeguroConfig;
} {
  // Default dates
  const data_admissao = opts.data_admissao || '2022-01-01';
  const meses = opts.meses || 12;
  const data_demissao = opts.data_demissao ||
    (opts.em_curso ? undefined : '2023-01-01');
  const data_ajuizamento = opts.data_ajuizamento || '2023-06-01';

  // Default salary
  const salario_mensal = opts.salario_mensal || 3000;

  // Build params based on regime
  const regime = opts.regime || 'CLT';
  let regimeConfig: Partial<PjeParametros> = {
    case_id: 'edge-case-test',
    data_admissao,
    data_demissao,
    data_ajuizamento,
    data_citacao: opts.data_citacao || '2023-08-01',
    modo_calculo: 'independent',
    estado: 'SP',
    municipio: 'Sao Paulo',
    regime_trabalho: regime === 'INTERMITENTE' ? 'intermitente' : 'tempo_integral',
    carga_horaria_padrao: regime === 'DOMESTICO' ? 40 : 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    maior_remuneracao: salario_mensal,
    ultima_remuneracao: salario_mensal,
    prazo_aviso_previo: 'calculado',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: true,
    sabado_dia_util: false,
    ...opts.params,
  };

  const params: PjeParametros = {
    case_id: regimeConfig.case_id || 'edge-case',
    data_admissao: regimeConfig.data_admissao!,
    data_demissao: regimeConfig.data_demissao,
    data_ajuizamento: regimeConfig.data_ajuizamento!,
    data_citacao: regimeConfig.data_citacao,
    modo_calculo: regimeConfig.modo_calculo || 'independent',
    estado: regimeConfig.estado || 'SP',
    municipio: regimeConfig.municipio || 'Sao Paulo',
    regime_trabalho: regimeConfig.regime_trabalho || 'tempo_integral',
    carga_horaria_padrao: regimeConfig.carga_horaria_padrao || 220,
    prescricao_quinquenal: regimeConfig.prescricao_quinquenal || false,
    prescricao_fgts: regimeConfig.prescricao_fgts || false,
    maior_remuneracao: regimeConfig.maior_remuneracao || salario_mensal,
    ultima_remuneracao: regimeConfig.ultima_remuneracao || salario_mensal,
    prazo_aviso_previo: regimeConfig.prazo_aviso_previo || 'calculado',
    projetar_aviso_indenizado: regimeConfig.projetar_aviso_indenizado || false,
    limitar_avos_periodo: regimeConfig.limitar_avos_periodo || false,
    zerar_valor_negativo: regimeConfig.zerar_valor_negativo || true,
    sabado_dia_util: regimeConfig.sabado_dia_util || false,
  };

  // Build historicos
  const historicos: PjeHistoricoSalarial[] = [
    {
      id: 'hist-edge-001',
      nome: 'Salário Base',
      periodo_inicio: data_admissao,
      periodo_fim: data_demissao || '2099-12-31',
      tipo_valor: 'informado',
      valor_informado: salario_mensal,
      incidencia_fgts: true,
      incidencia_cs: true,
      fgts_recolhido: false,
      cs_recolhida: false,
      ocorrencias: [],
      ...(opts.historicos?.[0] || {}),
    },
  ];

  // Build verbas
  const verbas: PjeVerba[] = [
    {
      id: 'verba-edge-salario',
      nome: 'Salário Base',
      tipo: 'principal',
      valor: 'calculado',
      caracteristica: 'comum',
      ocorrencia_pagamento: 'mensal',
      compor_principal: true,
      zerar_valor_negativo: true,
      dobrar_valor_devido: false,
      periodo_inicio: data_admissao,
      periodo_fim: data_demissao || '2099-12-31',
      base_calculo: {
        historicos: ['hist-edge-001'],
        verbas: [],
        tabelas: [],
        proporcionalizar: false,
        integralizar: false,
      },
      tipo_divisor: 'informado',
      divisor_informado: 220,
      multiplicador: 1,
      tipo_quantidade: 'dias_uteis',
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
      ...(opts.verbas?.[0] || {}),
    },
  ];

  // Add 13º if requested
  if (opts.tem_13 !== false) {
    verbas.push({
      id: 'verba-edge-13',
      nome: '13º Salário',
      tipo: 'principal',
      valor: 'calculado',
      caracteristica: 'decimo_terceiro',
      ocorrencia_pagamento: 'anual',
      compor_principal: true,
      zerar_valor_negativo: true,
      dobrar_valor_devido: false,
      periodo_inicio: data_admissao,
      periodo_fim: data_demissao || '2099-12-31',
      base_calculo: {
        historicos: ['hist-edge-001'],
        verbas: [],
        tabelas: [],
        proporcionalizar: true,
        integralizar: false,
      },
      tipo_divisor: 'tabelado',
      multiplicador: 1,
      tipo_quantidade: 'dias_uteis',
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
      ordem: 2,
    });
  }

  // Add férias if requested (default: yes for CLT)
  if (opts.tem_ferias_indenizadas !== false) {
    verbas.push({
      id: 'verba-edge-ferias',
      nome: 'Férias Indenizadas',
      tipo: 'principal',
      valor: 'calculado',
      caracteristica: 'ferias',
      ocorrencia_pagamento: 'uma_unica_vez',
      compor_principal: true,
      zerar_valor_negativo: true,
      dobrar_valor_devido: false,
      periodo_inicio: data_admissao,
      periodo_fim: data_demissao || '2099-12-31',
      base_calculo: {
        historicos: ['hist-edge-001'],
        verbas: [],
        tabelas: [],
        proporcionalizar: true,
        integralizar: false,
      },
      tipo_divisor: 'tabelado',
      multiplicador: 1.33,
      tipo_quantidade: 'dias_uteis',
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
      ordem: 3,
    });
  }

  // Build configs
  const fgtsConfig: PjeFGTSConfig = {
    apurar: opts.tem_multa_fgts !== false,
    destino: 'pagar_reclamante',
    compor_principal: false,
    multa_apurar: opts.tem_multa_fgts !== false,
    multa_tipo: 'calculada',
    multa_percentual: 40,
    multa_base: 'devido',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
    ...(opts.fgtsConfig || {}),
  };

  const csConfig: PjeCSConfig = {
    apurar_segurado: true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'fixa',
    aliquota_empresa_fixa: regime === 'DOMESTICO' ? 8 : 20,
    aliquota_sat_fixa: regime === 'DOMESTICO' ? 0 : 2,
    aliquota_terceiros_fixa: regime === 'DOMESTICO' ? 0 : 5.8,
    periodos_simples: [],
    ...(opts.csConfig || {}),
  };

  const irConfig: PjeIRConfig = {
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
    ...(opts.irConfig || {}),
  };

  const correcaoConfig: PjeCorrecaoConfig = {
    indice: 'IPCA-E',
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: '2025-06-01',
    ...(opts.correcaoConfig || {}),
  };

  const honorariosConfig: PjeHonorariosConfig = {
    apurar_sucumbenciais: false,
    percentual_sucumbenciais: 15,
    base_sucumbenciais: 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
  };

  const custasConfig: PjeCustasConfig = {
    apurar: false,
    percentual: 2,
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
    itens: [],
  };

  const seguroConfig: PjeSeguroConfig = {
    apurar: false,
    parcelas: 0,
    recebeu: false,
  };

  return {
    params,
    historicos,
    verbas,
    fgtsConfig,
    csConfig,
    irConfig,
    correcaoConfig,
    honorariosConfig,
    custasConfig,
    seguroConfig,
  };
}

/**
 * Engine execution wrapper that returns a summarized result.
 * Useful for edge case testing where we care about specific values.
 */
export function runMinimalEngine(caseData: ReturnType<typeof makeMinimalCase>): PjeLiquidacaoResult {
  const engine = new PjeCalcEngineV3(
    caseData.params,
    caseData.historicos,
    [],
    [],
    caseData.verbas,
    [],
    caseData.fgtsConfig,
    caseData.csConfig,
    caseData.irConfig,
    caseData.correcaoConfig,
    caseData.honorariosConfig,
    caseData.custasConfig,
    caseData.seguroConfig,
    [],
    [],
    [],
  );

  return engine.liquidar();
}

/**
 * Extract a summary of key calculation results for easy assertion.
 */
export interface CalcSummary {
  principal: number;
  inss_reclamante: number;
  inss_reclamado: number;
  fgts_depositos: number;
  fgts_multa: number;
  ir: number;
  cs_empresa: number;
  cs_reclamante: number;
  aviso_previo: number;
  total_devido: number;
}

export function summarizeResult(result: PjeLiquidacaoResult): CalcSummary {
  return {
    principal: result.resumo?.valor_principal ?? 0,
    inss_reclamante: result.resumo?.inss_reclamante ?? 0,
    inss_reclamado: result.resumo?.inss_reclamado ?? 0,
    fgts_depositos: result.resumo?.fgts?.depositos ?? 0,
    fgts_multa: result.resumo?.fgts?.multa ?? 0,
    ir: result.resumo?.ir?.imposto_devido ?? 0,
    cs_empresa: result.resumo?.cs?.empresa ?? 0,
    cs_reclamante: result.resumo?.cs?.segurado ?? 0,
    aviso_previo: result.resumo?.aviso_previo ?? 0,
    total_devido: result.resumo?.total_devido ?? 0,
  };
}
