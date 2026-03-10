/**
 * PJC → Engine Bridge
 * Converts PJCAnalysis (from pjc-analyzer) into PjeCalcEngine constructor inputs,
 * enabling automated calculation from imported .PJC files.
 */

import type { PJCAnalysis, VerbaAnalysis, HistoricoAnalysis, FaltaAnalysis, FeriasAnalysis } from './pjc-analyzer';
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias, PjeVerba,
  PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeCombinacaoIndice, PjeCombinacaoJuros,
} from './engine-types';

// =====================================================
// MAIN CONVERTER
// =====================================================

export interface PjcEngineInputs {
  params: PjeParametros;
  historicos: PjeHistoricoSalarial[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
  verbas: PjeVerba[];
  cartaoPonto: PjeCartaoPonto[];
  fgtsConfig: PjeFGTSConfig;
  csConfig: PjeCSConfig;
  irConfig: PjeIRConfig;
  correcaoConfig: PjeCorrecaoConfig;
  honorariosConfig: PjeHonorariosConfig;
  custasConfig: PjeCustasConfig;
  seguroConfig: PjeSeguroConfig;
}

export function convertPjcToEngineInputs(analysis: PJCAnalysis, caseId: string): PjcEngineInputs {
  return {
    params: convertParametros(analysis, caseId),
    historicos: convertHistoricos(analysis.historicos_salariais),
    faltas: convertFaltas(analysis.faltas),
    ferias: convertFerias(analysis.ferias),
    verbas: convertVerbas(analysis.verbas, analysis.dag),
    cartaoPonto: [],
    fgtsConfig: buildDefaultFGTSConfig(),
    csConfig: buildDefaultCSConfig(analysis),
    irConfig: buildDefaultIRConfig(analysis),
    correcaoConfig: buildCorrecaoConfig(analysis),
    honorariosConfig: buildHonorariosConfig(analysis),
    custasConfig: buildDefaultCustasConfig(),
    seguroConfig: { apurar: false, parcelas: 0, recebeu: false },
  };
}

// =====================================================
// PARAMETROS
// =====================================================

function convertParametros(a: PJCAnalysis, caseId: string): PjeParametros {
  return {
    case_id: caseId,
    data_admissao: a.parametros.admissao,
    data_demissao: a.parametros.demissao || undefined,
    data_ajuizamento: a.parametros.ajuizamento,
    data_inicial: a.parametros.inicio_calculo || undefined,
    data_final: a.parametros.termino_calculo || undefined,
    estado: '',
    municipio: '',
    regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: a.parametros.carga_horaria || 220,
    prescricao_quinquenal: a.parametros.prescricao_quinquenal,
    prescricao_fgts: a.parametros.prescricao_fgts,
    projetar_aviso_indenizado: a.parametros.projeta_aviso,
    limitar_avos_periodo: a.parametros.limitar_avos,
    zerar_valor_negativo: a.parametros.zera_negativo,
    sabado_dia_util: a.parametros.sabado_dia_util,
    considerar_feriado_estadual: a.parametros.feriado_estadual,
    considerar_feriado_municipal: a.parametros.feriado_municipal,
    prazo_aviso_previo: 'calculado',
    maior_remuneracao: undefined,
    ultima_remuneracao: undefined,
    salario_minimo: undefined,
  };
}

// =====================================================
// HISTORICOS
// =====================================================

function convertHistoricos(historicos: HistoricoAnalysis[]): PjeHistoricoSalarial[] {
  return historicos.map((h, idx) => {
    const comps = h.competencias.sort((a, b) => a.comp.localeCompare(b.comp));
    const periodoInicio = comps[0]?.comp ? comps[0].comp + '-01' : '2020-01-01';
    const periodoFim = comps[comps.length - 1]?.comp ? comps[comps.length - 1].comp + '-01' : '2025-12-31';
    
    // For FIXO type with no monthly occurrences, generate a single occurrence with the fixed value
    let ocorrencias = comps.map((c, oi) => ({
      id: `hist-oc-${idx}-${oi}`,
      historico_id: `hist-pjc-${idx}`,
      competencia: c.comp,
      valor: c.valor,
      tipo: 'informado' as const,
    }));
    
    // If no occurrences but has a fixed value, create a placeholder
    const fixedVal = comps[0]?.valor;
    if (ocorrencias.length === 0 && h.tipo_variacao === 'FIXO' && fixedVal) {
      ocorrencias = [{ id: `hist-oc-${idx}-0`, historico_id: `hist-pjc-${idx}`, competencia: periodoInicio.slice(0, 7), valor: fixedVal, tipo: 'informado' as const }];
    }
    
    return {
      id: `hist-pjc-${idx}`,
      nome: h.nome,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      tipo_valor: 'informado' as const,
      valor_informado: h.tipo_variacao === 'FIXO' ? fixedVal : undefined,
      incidencia_fgts: h.incide_fgts,
      incidencia_cs: h.incide_inss,
      fgts_recolhido: false,
      cs_recolhida: false,
      ocorrencias,
    };
  });
}

// =====================================================
// FALTAS
// =====================================================

function convertFaltas(faltas: FaltaAnalysis[]): PjeFalta[] {
  return faltas.map((f, idx) => ({
    id: `falta-pjc-${idx}`,
    data_inicial: f.data_inicio,
    data_final: f.data_fim,
    justificada: f.justificada,
    justificativa: f.tipo,
  }));
}

// =====================================================
// FERIAS
// =====================================================

function convertFerias(ferias: FeriasAnalysis[]): PjeFerias[] {
  return ferias.map((f, idx) => ({
    id: `ferias-pjc-${idx}`,
    relativas: `${f.aquisitivo_inicio} a ${f.aquisitivo_fim}`,
    periodo_aquisitivo_inicio: f.aquisitivo_inicio,
    periodo_aquisitivo_fim: f.aquisitivo_fim,
    periodo_concessivo_inicio: f.concessivo_inicio || f.aquisitivo_inicio,
    periodo_concessivo_fim: f.concessivo_fim || f.aquisitivo_fim,
    prazo_dias: f.dias,
    situacao: mapSituacaoFerias(f.situacao),
    dobra: f.dobra,
    abono: f.abono,
    abono_dias: f.dias_abono,
    periodos_gozo: f.gozo_inicio ? [{
      inicio: f.gozo_inicio,
      fim: f.gozo_fim || f.gozo_inicio,
      dias: f.dias,
    }] : undefined,
  }));
}

function mapSituacaoFerias(s: string): 'gozadas' | 'indenizadas' | 'perdidas' | 'gozadas_parcialmente' {
  const upper = s?.toUpperCase() || '';
  if (upper.includes('INDENIZ')) return 'indenizadas';
  if (upper.includes('PERDID')) return 'perdidas';
  if (upper.includes('PARCIAL')) return 'gozadas_parcialmente';
  return 'gozadas';
}

// =====================================================
// VERBAS — Convert PJC Calculada/Reflexo → PjeVerba
// =====================================================

function convertVerbas(verbas: VerbaAnalysis[], dag: PJCAnalysis['dag']): PjeVerba[] {
  return verbas.filter(v => v.ativo).map(v => {
    const isReflexo = v.tipo === 'Reflexo';
    const dagNode = dag.find(d => d.id === v.id);
    
    // Map base_verbas IDs for the engine
    const baseVerbaIds = v.formula.base_verbas.map(bv => bv.id);
    
    // Map historico references
    // base_tabelada = "HISTORICO_SALARIAL" means "use all matching historicos" — leave empty for fallback
    // base_tabelada = "SALARIO_MINIMO" or "MAIOR_REMUNERACAO" → map to tabelas
    const baseHistIds: string[] = [];
    const baseTabelaIds: string[] = [];
    if (v.formula.base_tabelada) {
      if (v.formula.base_tabelada === 'HISTORICO_SALARIAL') {
        // Leave baseHistIds empty — engine fallback will search all historicos by competência
      } else if (v.formula.base_tabelada === 'SALARIO_MINIMO') {
        baseTabelaIds.push('salario_minimo');
      } else if (v.formula.base_tabelada === 'MAIOR_REMUNERACAO') {
        baseTabelaIds.push('maior_remuneracao');
      } else if (v.formula.base_tabelada === 'ULTIMA_REMUNERACAO') {
        baseTabelaIds.push('ultima_remuneracao');
      } else {
        // Unknown type — leave empty for fallback
      }
    }
    
    // Map divisor type
    const tipoDivisor = mapDivisorTipo(v.formula.divisor.tipo);
    
    // Map quantidade type
    const tipoQuantidade = mapQuantidadeTipo(v.formula.quantidade.tipo);
    
    // Map caracteristica
    const caracteristica = mapCaracteristica(v.caracteristica);
    
    // Map ocorrencia_pagamento
    const ocorrenciaPagamento = mapOcorrenciaPagamento(v.ocorrencia_pagamento);

    // Per-occurrence paid value support
    const pagoConfig = v.formula.valor_pago;
    
    // Comportamento do reflexo
    const comportamentoReflexo = mapComportamentoReflexo(v.comportamento_reflexo);
    const periodoMedia = mapPeriodoMedia(v.periodo_media);

    return {
      id: v.id,
      nome: v.nome,
      tipo: isReflexo ? 'reflexa' as const : 'principal' as const,
      valor: 'calculado' as const,
      caracteristica,
      ocorrencia_pagamento: ocorrenciaPagamento,
      compor_principal: v.compor_principal === 'DIFERENCA' || v.compor_principal === 'DEVIDO',
      zerar_valor_negativo: false,
      dobrar_valor_devido: v.formula.dobra,
      periodo_inicio: v.periodo_inicio,
      periodo_fim: v.periodo_fim,
      base_calculo: {
        historicos: baseHistIds,
        verbas: baseVerbaIds,
        tabelas: baseTabelaIds,
        proporcionalizar: false,
        integralizar: false,
      },
      tipo_divisor: tipoDivisor,
      divisor_informado: v.formula.divisor.valor || 1,
      multiplicador: v.formula.multiplicador.valor || 1,
      tipo_quantidade: tipoQuantidade,
      quantidade_informada: v.formula.quantidade.valor || 1,
      quantidade_proporcionalizar: false,
      exclusoes: {
        faltas_justificadas: v.excluir_falta_justificada || false,
        faltas_nao_justificadas: v.excluir_falta_nao_justificada || false,
        ferias_gozadas: v.excluir_ferias_gozadas || false,
      },
      incidencias: {
        fgts: v.incidencias.fgts,
        irpf: v.incidencias.irpf,
        contribuicao_social: v.incidencias.inss,
        previdencia_privada: false,
        pensao_alimenticia: false,
      },
      juros_ajuizamento: 'ocorrencias_vencidas',
      verba_principal_id: isReflexo ? baseVerbaIds[0] : undefined,
      comportamento_reflexo: comportamentoReflexo,
      periodo_media_reflexo: periodoMedia,
      gerar_verba_reflexa: (v.gerar_reflexo === 'DEVIDO' ? 'devido' : 'diferenca') as 'devido' | 'diferenca',
      gerar_verba_principal: (v.gerar_principal === 'DEVIDO' ? 'devido' : 'diferenca') as 'devido' | 'diferenca',
      ordem: v.ordem,
      // Per-rubric paid value (Feature #3)
      valor_pago_tipo: pagoConfig?.tipo === 'CALCULADO' ? 'calculado' as const : 'informado' as const,
      valor_informado_pago: pagoConfig?.tipo === 'INFORMADO' ? pagoConfig.valor : undefined,
      pago_base: pagoConfig?.tipo === 'CALCULADO' ? pagoConfig.valor : undefined,
    } satisfies PjeVerba;
  });
}

// =====================================================
// MAPPING HELPERS
// =====================================================

function mapDivisorTipo(tipo: string): PjeVerba['tipo_divisor'] {
  const map: Record<string, PjeVerba['tipo_divisor']> = {
    'CARGA_HORARIA': 'carga_horaria',
    'DIAS_UTEIS': 'dias_uteis',
    'CARTAO_PONTO': 'cartao_ponto',
    'CALENDARIO': 'calendario',
  };
  return map[tipo] || 'informado';
}

function mapQuantidadeTipo(tipo: string): PjeVerba['tipo_quantidade'] {
  const map: Record<string, PjeVerba['tipo_quantidade']> = {
    'AVOS': 'avos',
    'APURADA': 'apurada',
    'CARTAO_PONTO': 'cartao_ponto',
    'CALENDARIO': 'calendario',
  };
  return map[tipo] || 'informada';
}

function mapCaracteristica(car: string): PjeVerba['caracteristica'] {
  const upper = (car || '').toUpperCase();
  if (upper.includes('13')) return '13_salario';
  if (upper.includes('AVISO')) return 'aviso_previo';
  if (upper.includes('FERIAS') || upper.includes('FÉRIAS')) return 'ferias';
  return 'comum';
}

function mapOcorrenciaPagamento(op: string): PjeVerba['ocorrencia_pagamento'] {
  const upper = (op || '').toUpperCase();
  if (upper.includes('DEZEMBRO') || upper.includes('ANUAL')) return 'dezembro';
  if (upper.includes('DESLIGAMENTO') || upper.includes('RESCIS')) return 'desligamento';
  if (upper.includes('AQUISITIVO') || upper.includes('FERIAS')) return 'periodo_aquisitivo';
  return 'mensal';
}

function mapComportamentoReflexo(cr?: string): PjeVerba['comportamento_reflexo'] {
  if (!cr) return undefined;
  const map: Record<string, PjeVerba['comportamento_reflexo']> = {
    'VALOR_MENSAL': 'valor_mensal',
    'MEDIA_VALOR_ABSOLUTO': 'media_valor_absoluto',
    'MEDIA_VALOR_CORRIGIDO': 'media_valor_corrigido',
    'MEDIA_QUANTIDADE': 'media_quantidade',
    'MEDIA_PELA_QUANTIDADE': 'media_pela_quantidade',
  };
  return map[cr] || 'valor_mensal';
}

function mapPeriodoMedia(pm?: string): PjeVerba['periodo_media_reflexo'] {
  if (!pm) return undefined;
  const map: Record<string, PjeVerba['periodo_media_reflexo']> = {
    'ANO_CIVIL': 'ano_civil',
    'PERIODO_AQUISITIVO': 'periodo_aquisitivo',
    'GLOBAL': 'global',
  };
  return map[pm] || 'ano_civil';
}

// =====================================================
// DEFAULT CONFIGS from PJC Analysis
// =====================================================

function buildDefaultFGTSConfig(): PjeFGTSConfig {
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
  };
}

function buildDefaultCSConfig(a: PJCAnalysis): PjeCSConfig {
  return {
    apurar_segurado: true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'atividade',
    periodos_simples: [],
  };
}

function buildDefaultIRConfig(a: PJCAnalysis): PjeIRConfig {
  return {
    apurar: a.resultado.imposto_renda > 0,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: true,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: 0,
  };
}

function buildCorrecaoConfig(a: PJCAnalysis): PjeCorrecaoConfig {
  // Normalize PJC index names to engine format
  const normalizeIndice = (ind: string): string => {
    const map: Record<string, string> = {
      'IPCA_E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA-E': 'IPCA-E',
      'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR', 'INPC': 'INPC',
      'IGP_M': 'IGP-M', 'IGP-M': 'IGP-M',
      'SEM_CORRECAO': 'SEM_CORRECAO', 'Sem Correção': 'SEM_CORRECAO',
    };
    return map[ind] || ind;
  };

  const normalizeJuros = (tipo: string): string => {
    const map: Record<string, string> = {
      'TRD_SIMPLES': 'TRD_SIMPLES', 'SELIC': 'SELIC', 'TAXA_LEGAL': 'TAXA_LEGAL',
      'NENHUM': 'NENHUM', 'Nenhum': 'NENHUM',
    };
    return map[tipo] || tipo;
  };

  // Convert PJC combinacoes to engine format
  const combinacoes_indice: PjeCombinacaoIndice[] = a.atualizacao.combinacoes_indice.map(ci => ({
    de: ci.a_partir_de,
    indice: normalizeIndice(ci.indice),
  }));
  
  const combinacoes_juros: PjeCombinacaoJuros[] = a.atualizacao.combinacoes_juros.map(cj => ({
    de: cj.a_partir_de,
    tipo: normalizeJuros(cj.tipo),
    percentual: cj.taxa,
  }));
  
  return {
    indice: combinacoes_indice.length > 0 ? 'COMBINACAO' : 'IPCA-E',
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: a.parametros.termino_calculo || new Date().toISOString().slice(0, 10),
    combinacoes_indice: combinacoes_indice.length > 0 ? combinacoes_indice : undefined,
    combinacoes_juros: combinacoes_juros.length > 0 ? combinacoes_juros : undefined,
  };
}

function buildHonorariosConfig(a: PJCAnalysis): PjeHonorariosConfig {
  const totalHon = a.resultado.honorarios.reduce((s, h) => s + h.valor, 0);
  return {
    apurar_sucumbenciais: totalHon > 0,
    percentual_sucumbenciais: 15,
    base_sucumbenciais: 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
  };
}

function buildDefaultCustasConfig(): PjeCustasConfig {
  return {
    apurar: true,
    percentual: 2,
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
    itens: [],
  };
}
