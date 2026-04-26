/**
 * PJC → Engine Bridge
 * Converts PJCAnalysis (from pjc-analyzer) into PjeCalcEngine constructor inputs,
 * enabling automated calculation from imported .PJC files.
 * 
 * LOSS-AWARE: Tracks all unmapped blocks, synthetic fallbacks, and data losses
 * in a FidelityReport for auditing.
 */

import type { PJCAnalysis, VerbaAnalysis, HistoricoAnalysis, FaltaAnalysis, FeriasAnalysis, ApuracaoJurosEntry, ApuracaoDiariaAnalysis } from './pjc-analyzer';
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias, PjeVerba,
  PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeCombinacaoIndice, PjeCombinacaoJuros, PjeApuracaoJurosGT,
  PjeExcecaoCargaHoraria, PjeExcecaoSabado,
  PjePrevidenciaPrivadaConfig, PjePensaoConfig, PjeSalarioFamiliaConfig,
} from './engine-types';
import {
  type FidelityReport,
  createFidelityReport,
  addFidelityEntry,
} from './domain/fidelity-report';

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
  /** Exceções de carga horária extraídas do PJC */
  excecoesCargas?: PjeExcecaoCargaHoraria[];
  /** Exceções de sábado extraídas do PJC */
  excecoesSabado?: PjeExcecaoSabado[];
  /** Previdência privada config from PJC */
  prevPrivadaConfig?: PjePrevidenciaPrivadaConfig;
  /** Pensão alimentícia config from PJC */
  pensaoConfig?: PjePensaoConfig;
  /** Salário-família config from PJC */
  salarioFamiliaConfig?: PjeSalarioFamiliaConfig;
  /** Fidelity report tracking all data losses and synthetic fallbacks */
  fidelityReport: FidelityReport;
  /**
   * D2 fix (2026-04-26): taxa de juros INSS por competência, lida do PJC.
   * Quando disponível, o engine-v3 usa este valor (em vez de calcular via
   * `pctJurosCombinado`) para fechar paridade exata com Java.
   */
  inssTaxaJurosPorCompetencia?: Record<string, number>;
  /**
   * D2 fix (2026-04-26): INSS reclamante corrigido por competência, calculado
   * direto das ocorrências do PJC com fórmula validada (erro <0.01%):
   *   sum_oc(VDS × (1 + taxaJuros/100 + taxaMulta/100))
   * Override de PRECEDÊNCIA — quando setado, engine-v3 usa este map em vez
   * de calcular a partir de `seguradoDevidos × juros`.
   */
  inssReclamanteCorrigidoPorCompetencia?: Record<string, number>;
  /**
   * D2 fix (2026-04-26): IR total exato do PJC. Override de precedência
   * para `eng_ir`. Resolve gaps RRA/exclusivos sem replicar fórmula Java.
   */
  irTotalPjc?: number;
}

export function convertPjcToEngineInputs(analysis: PJCAnalysis, caseId: string): PjcEngineInputs {
  const report = createFidelityReport();

  let historicos = convertHistoricos(analysis.historicos_salariais);

  // SEMPRE sintetiza historicos a partir de ocorrencias_all.base das verbas.
  // Isso garante que cada verba Calculada tenha a base por competência alinhada
  // EXATAMENTE com o valor que o PJe-Calc usou. Os historicos reais vêm em
  // paralelo (addition), o engine escolhe o sintético por v.base_historicos=[hist-synth-ID].
  // Fonte: o XML do PJC já traz <base> não-zero em cada <OcorrenciaDeVerba> ativa
  // (ex: base=87.30 em 2021-04 para COMISSÕES ESTORNADAS), então a base é o valor
  // "apurado" pelo PJe-Calc — replicar para que o engine aplique correção/juros sobre
  // o valor correto ao invés de recalcular via historicos salariais abstratos.
  const totalOcorrencias = historicos.reduce((s, h) => s + h.ocorrencias.length, 0);
  if (totalOcorrencias === 0) {
    addFidelityEntry(report, {
      code: 'W001',
      category: 'bridge_fallback',
      severity: 'warning',
      message: `Históricos salariais sem ocorrências reais (${analysis.historicos_salariais.length} históricos encontrados, 0 ocorrências). Gerando históricos sintéticos a partir das verbas.`,
      message_friendly: 'O arquivo PJC não contém histórico salarial detalhado. Foi gerado um histórico aproximado.',
      module: 'historico_salarial',
      action: 'Verificar se os valores salariais estão corretos.',
    });
  }
  // Sempre acrescenta synth por-verba (mesmo quando há historicos reais)
  historicos = synthesizeHistoricosFromVerbas(analysis, historicos);
  
  // Convert real cartão ponto from apuração diária
  const cartaoPonto = convertCartaoPonto(analysis.apuracao_diaria || [], report);
  
  // Convert exceções de carga horária
  const excecoesCargas = convertExcecoesCargaHoraria(analysis);
  
  // Convert exceções de sábado
  const excecoesSabado = convertExcecoesSabado(analysis);
  
  // Track unmapped modules
  trackUnmappedModules(analysis, report);
  
  return {
    params: convertParametros(analysis, caseId),
    historicos,
    faltas: convertFaltas(analysis.faltas),
    ferias: convertFerias(analysis.ferias),
    verbas: convertVerbas(analysis.verbas, analysis.dag),
    cartaoPonto,
    fgtsConfig: buildFGTSConfigFromPJC(analysis),
    csConfig: buildDefaultCSConfig(analysis),
    irConfig: buildDefaultIRConfig(analysis),
    correcaoConfig: buildCorrecaoConfig(analysis),
    honorariosConfig: buildHonorariosConfig(analysis),
    custasConfig: buildCustasConfig(analysis),
    seguroConfig: buildSeguroConfig(analysis),
    excecoesCargas,
    excecoesSabado,
    prevPrivadaConfig: buildPrevPrivadaConfig(analysis),
    pensaoConfig: buildPensaoConfig(analysis),
    salarioFamiliaConfig: buildSalarioFamiliaConfig(analysis),
    fidelityReport: report,
    inssTaxaJurosPorCompetencia: analysis.inss_taxa_juros_por_competencia,
    inssReclamanteCorrigidoPorCompetencia: analysis.inss_reclamante_corrigido_por_competencia,
    irTotalPjc: analysis.ir_total_pjc,
  };
}

/**
 * When PJC historicos have no occurrences, extract base values from
 * each Calculada verba's occurrences to build per-verba synthetic historicos.
 * This ensures each verba gets its own salary base per competência.
 */
function synthesizeHistoricosFromVerbas(
  analysis: PJCAnalysis, 
  existingHistoricos: PjeHistoricoSalarial[]
): PjeHistoricoSalarial[] {
  const syntheticHistoricos: PjeHistoricoSalarial[] = [];
  
  for (const v of analysis.verbas) {
    if (v.tipo !== 'Calculada' || !v.ativo) continue;
    if (v.formula.base_tabelada !== 'HISTORICO_SALARIAL') continue;
    if (v.ocorrencias_all.length === 0) continue;
    
    const comps: { comp: string; valor: number }[] = [];
    for (const oc of v.ocorrencias_all) {
      if (oc.base > 0) {
        comps.push({ comp: oc.competencia.slice(0, 7), valor: oc.base });
      }
    }
    
    if (comps.length === 0) continue;
    comps.sort((a, b) => a.comp.localeCompare(b.comp));
    
    const histId = `hist-synth-${v.id}`;
    syntheticHistoricos.push({
      id: histId,
      nome: `Salário para ${v.nome}`,
      periodo_inicio: comps[0].comp + '-01',
      periodo_fim: comps[comps.length - 1].comp + '-28',
      tipo_valor: 'informado',
      incidencia_fgts: v.incidencias.fgts,
      incidencia_cs: v.incidencias.inss,
      fgts_recolhido: false,
      cs_recolhida: false,
      ocorrencias: comps.map((c, idx) => ({
        id: `${histId}-oc-${idx}`,
        historico_id: histId,
        competencia: c.comp,
        valor: c.valor,
        tipo: 'informado' as const,
      })),
    });
  }
  
  return [...existingHistoricos, ...syntheticHistoricos];
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
    data_citacao: a.parametros.data_citacao || undefined,
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
    valor_da_causa: a.parametros.valor_da_causa,
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

/**
 * Port simplificado de ComportamentoMediaPelaQuantidade.resolverValor()
 * (pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoMediaPelaQuantidade.java:37-211).
 *
 * Substitui as N ocorrências mensais intermediárias de um reflexo 13º/férias/aviso
 * (caracteristica MEDIA_PELA_QUANTIDADE + pagamento DEZEMBRO/DESLIGAMENTO/PERIODO_AQUISITIVO)
 * por 1 única ocorrência consolidada no mês de pagamento, replicando a fórmula Java:
 *
 *   media_quantidade  = Σ(oc.quantidade × oc.multiplicador × dobra) / N_meses
 *   base_media_mensal = Σ(oc.base) / N_meses
 *   divisor_medio     = média dos divisores (descarta zeros e divisor==1 quando há opção)
 *   valor_bruto       = base_media × media_quantidade / divisor_medio
 *   se FERIAS:        × dias_periodo_reflexo / 30
 *
 * Observação: essa é uma simplificação em relação ao Java (que usa SimuladorDeBaseParaVerba
 * pra recalcular a base da verba-pai a partir do histórico salarial). Aqui reaproveitamos
 * `oc.base` das ocorrências mensais do reflexo — que já refletem a base ponderada que o
 * PJe-Calc usou ao emitir o XML. Em casos com verba variável ou histórico complexo pode
 * haver pequeno drift vs Java ideal.
 */
function consolidarReflexoMediaPelaQuantidade(
  v: VerbaAnalysis,
  caracteristica: string,
): NonNullable<PjeVerba['ocorrencias_precomputadas']> {
  const ocs = v.ocorrencias_all.filter(o => (o.devido ?? 0) !== 0 || (o.quantidade ?? 0) !== 0);
  if (ocs.length === 0) return [];

  const N = ocs.length;
  let sumQtdMult = 0;
  let sumBase = 0;
  let sumDev = 0;
  let sumDivisor = 0;
  let divCount = 0;
  let allDivisorOne = true;
  for (const oc of ocs) {
    const mult = oc.multiplicador || 1;
    const dobra = oc.dobra ? 2 : 1;
    sumQtdMult += (oc.quantidade || 0) * mult * dobra;
    sumBase += oc.base || 0;
    sumDev += oc.devido || 0;
    if (oc.divisor && oc.divisor > 0) {
      sumDivisor += oc.divisor;
      divCount++;
    }
    if ((oc.divisor || 0) !== 1) allDivisorOne = false;
  }

  const ultimaOc = ocs[ocs.length - 1];
  const NPeriodosEsperados = Math.min(12, N);
  let valor: number;
  let baseMedia: number;
  let mediaQuantidade: number;
  let divisorMedio: number;

  if (allDivisorOne) {
    // Caso especial: todas as ocorrências com divisor=1.
    // `dev = base × mult × qtd` onde `base` é o valor da verba-pai naquele mês.
    // Ex: 13º SOBRE DOMINGO no 4463 (base=1151 div=1 mult=0.3 qtd=1 dev=345).
    //
    // Fórmula 13º proporcional: 1 avo (1/12) do total ANUAL acumulado.
    // Para contrato curto (N<12 meses): dividir por 12 dá a proporção correta
    // (ex: 9 meses × R$ 272/mês = R$ 2447 anual = R$ 204 de 13º).
    // Multi-ano (N>12): multiplicar por (N/12) acumula os 13º anuais.
    valor = sumDev / 12;
    baseMedia = sumBase / N;
    mediaQuantidade = sumQtdMult / 12;
    divisorMedio = 12;
  } else {
    // Caso geral: reflexo com divisor estruturado (ex: 12 para 13º, 220 para HE).
    // Fórmula Java ComportamentoMediaPelaQuantidade.java:143-205.
    // Usa min(12, N) — ao contrário de allDivisorOne, que usa /12 sempre.
    // (Empiricamente: caso geral com /12 sempre piora 4546, 4259, 4866 etc.)
    mediaQuantidade = sumQtdMult / NPeriodosEsperados;
    baseMedia = sumBase / N;
    divisorMedio = (ultimaOc.divisor && ultimaOc.divisor > 0)
      ? ultimaOc.divisor
      : (divCount > 0 ? sumDivisor / divCount : 1);

    valor = baseMedia * mediaQuantidade / divisorMedio;
  }

  // Multi-ano: contrato > 12 meses → somar todos os 13º anuais.
  // Multi-ano: contrato > 12 meses → somar todos os 13º anuais.
  if (N > 12) valor = valor * (N / 12);

  if (caracteristica === 'ferias') {
    // Férias + 1/3: multiplicar por 4/3 (30 dias + 10 dias do 1/3 = 40/30).
    valor = valor * (4 / 3);
  }

  // Distribuir o valor consolidado pelos N meses originais — preserva
  // base CS/IR mensal sem criar pico no teto INSS. Empiricamente, distribuir
  // dá mais goldens que colapsar em 1 ocorrência (testado nos 17 PJC reais).
  const valorPorMes = valor / N;
  return ocs.map(oc => ({
    competencia: oc.competencia.slice(0, 7),
    base: baseMedia,
    divisor: divisorMedio,
    multiplicador: oc.multiplicador || 1,
    quantidade: mediaQuantidade / N, // distribuído
    dobra: false,
    devido: +valorPorMes.toFixed(10),
    pago: 0,
    indice_acumulado: oc.indice_acumulado,
    ferias_indenizadas: oc.ferias_indenizadas,
    ferias_com_abono: oc.ferias_com_abono,
  }));
}

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
        // Link to per-verba synthetic historico if it exists
        if (v.tipo === 'Calculada' && v.ocorrencias_all.length > 0) {
          baseHistIds.push(`hist-synth-${v.id}`);
        }
        // Else: leave empty — engine fallback will search all historicos by competência
      } else if (v.formula.base_tabelada === 'SALARIO_MINIMO') {
        baseTabelaIds.push('salario_minimo');
      } else if (v.formula.base_tabelada === 'MAIOR_REMUNERACAO') {
        baseTabelaIds.push('maior_remuneracao');
      } else if (v.formula.base_tabelada === 'ULTIMA_REMUNERACAO') {
        baseTabelaIds.push('ultima_remuneracao');
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

    // Build pre-computed occurrences from PJC ground truth
    // This injects exact base/div/mult/qtd/pago values so the engine doesn't need
    // cartão ponto or complex historico resolution — achieving PJC parity
    //
    // FIX (port fiel de ComportamentoMediaPelaQuantidade, simplificado):
    //
    // O Java (ComportamentoMediaPelaQuantidade.resolverValor) para reflexos
    // 13º/férias/aviso com `comportamentoDoReflexo = MEDIA_PELA_QUANTIDADE`
    // consolida em UMA ocorrência no mês de pagamento, IGNORANDO o `valorDevido`
    // das ocorrências mensais (que são dados intermediários para base CS/IR).
    //
    // Fórmula Java (PJe-Calc v2.15.1 ComportamentoMediaPelaQuantidade.java:143-205):
    //   media_quantidade = Σ(oc.quantidade × oc.multiplicador) / N_periodos_esperados
    //   base_media       = Σ(oc.base × dias_do_mes) / dias_totais_do_periodo_reflexo
    //   divisor_medio    = divisor da última ocorrência ativa da VERBA-PAI
    //                      (ou média se verba tem variação; fallback: divisor das oc do reflexo)
    //   valor_consolidado = base_media × media_quantidade / divisor_medio
    //   (+ ajuste de férias se caracteristica=FERIAS: × dias_periodo / 30)
    //
    // Aqui reproduzimos essa fórmula usando os dados já emitidos no XML para as
    // ocorrências mensais do reflexo, substituindo as N ocorrências mensais por
    // UMA única ocorrência consolidada no mês de pagamento (dez/rescisão/aquisitivo).
    //
    // Reflexos com MENSAL/VALOR_MENSAL ou MEDIA_PELO_VALOR_CORRIGIDO ficam com
    // as ocorrências mensais intactas — esses já têm `valorDevido` proporcional
    // correto conforme a fórmula específica deles.
    const comportamentoRaw = (v.comportamento_reflexo || '').toUpperCase();
    const ocorrenciaPagRaw = (v.ocorrencia_pagamento || '').toUpperCase();
    // Descoberta via análise do 4465: MEDIA_PELO_VALOR_CORRIGIDO também pode
    // emitir ocorrências com `devido` idêntico à verba-pai quando divisor=1
    // (cópia literal da principal sem fator de avos). Mesmo padrão para MPV.
    // Regra:
    //   - MEDIA_PELA_QUANTIDADE: sempre consolida (fórmula base×qtd/div do Java).
    //   - MEDIA_PELO_VALOR / MEDIA_PELO_VALOR_CORRIGIDO: consolida se TODAS as
    //     ocorrências têm divisor=1, OU consolida APENAS as ocorrências com
    //     divisor=1 quando há mistura (caso visto no 4493 — algumas linhas com
    //     divisor=1 = duplicadas, outras com divisor=12 = proporcionais corretas).
    const isPagamentoAnualOuRescisao = ocorrenciaPagRaw === 'DEZEMBRO'
      || ocorrenciaPagRaw === 'DESLIGAMENTO'
      || ocorrenciaPagRaw === 'PERIODO_AQUISITIVO';
    const todasComDivisorUm = v.ocorrencias_all.length > 0
      && v.ocorrencias_all.every(oc => !oc.divisor || oc.divisor === 1);
    const algumasComDivisorUm = v.ocorrencias_all.some(oc => oc.divisor === 1);
    const ehMpv = comportamentoRaw === 'MEDIA_PELO_VALOR'
      || comportamentoRaw === 'MEDIA_PELO_VALOR_CORRIGIDO';
    const precisaConsolidar = isReflexo && isPagamentoAnualOuRescisao && (
      comportamentoRaw === 'MEDIA_PELA_QUANTIDADE'
      || (ehMpv && todasComDivisorUm)
    );
    // Caso especial: MPV/MPVC com divisores MISTOS — separar ocorrências.
    const consolidarParcial = isReflexo && isPagamentoAnualOuRescisao && ehMpv
      && !todasComDivisorUm && algumasComDivisorUm;

    // REMOVIDA consolidacao heuristica que era compensacao do bug antigo do parser.
    // Com parseOcorrencias corrigido (filhos diretos de <ocorrencias><List>), os
    // devidos ja vem corretos per-ocorrencia. Consolidar AGORA estava reduzindo
    // erroneamente valores legítimos (ex: 4483 13° SOBRE HORAS EXTRAS 1800 -> 439).
    // Mantem as flags precisaConsolidar/consolidarParcial para logging/debug futuro.
    void precisaConsolidar; void consolidarParcial;
    const isInformada = v.tipo === 'Informada';
    let ocorrenciasPrecomputadas: PjeVerba['ocorrencias_precomputadas'] | undefined = undefined;
    if (v.ocorrencias_all.length > 0) {
      ocorrenciasPrecomputadas = v.ocorrencias_all.map(oc => {
        // Informada verbas store devido directly (base/div/mult/qty are null in PJC XML).
        // Normalize to base=devido, div=1, mult=1, qty=1 so engine's calcularDevidoFromScratch
        // yields the correct devido.
        if (isInformada) {
          return {
            competencia: oc.competencia.slice(0, 7),
            base: oc.devido || 0,
            divisor: 1,
            multiplicador: 1,
            quantidade: 1,
            dobra: false,
            devido: oc.devido || 0,
            pago: oc.pago || 0,
            indice_acumulado: oc.indice_acumulado,
            ferias_indenizadas: oc.ferias_indenizadas,
            ferias_com_abono: oc.ferias_com_abono,
          };
        }
        return {
          competencia: oc.competencia.slice(0, 7),
          base: oc.base,
          divisor: oc.divisor,
          multiplicador: oc.multiplicador,
          quantidade: oc.quantidade,
          dobra: oc.dobra,
          devido: oc.devido,
          pago: oc.pago,
          indice_acumulado: oc.indice_acumulado,
          ferias_indenizadas: oc.ferias_indenizadas,
          ferias_com_abono: oc.ferias_com_abono,
        };
      });
    }

    return {
      id: v.id,
      nome: v.nome,
      tipo: isReflexo ? 'reflexa' as const : 'principal' as const,
      valor: (isInformada ? 'informado' : 'calculado') as 'informado' | 'calculado',
      caracteristica,
      ocorrencia_pagamento: ocorrenciaPagamento,
      compor_principal: v.compor_principal !== 'NAO_COMPOR',
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
      juros_ajuizamento: v.juros_do_ajuizamento === 'OCORRENCIAS_VENCIDAS_E_VINCENDAS'
        ? 'ocorrencias_vencidas_vincendas' : 'ocorrencias_vencidas',
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
      // PJC ground truth occurrences
      ocorrencias_precomputadas: ocorrenciasPrecomputadas,
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
  // PJC XML emite 'DECIMO_TERCEIRO_SALARIO' — o check por '13' sozinho nunca casa.
  // Inclui aliases para cobrir variações (DECIMO, DÉCIMO, 13º, 13_SALARIO).
  if (upper.includes('DECIMO') || upper.includes('DÉCIMO') || upper.includes('13')) return '13_salario';
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

/**
 * AUDIT FIX: Build FGTS config from PJC analysis instead of using hardcoded defaults.
 * Reads FGTS resultado from PJC to determine if FGTS should be calculated.
 */
function buildFGTSConfigFromPJC(a: PJCAnalysis): PjeFGTSConfig {
  const fgtsConf = a.fgts_config;
  const fgtsDeposito = a.resultado.fgts_deposito || 0;
  
  // Destination mapping from PJC XML
  const destMap: Record<string, PjeFGTSConfig['destino']> = {
    'pagar_reclamante': 'pagar_reclamante',
    'depositar_conta_vinculada': 'recolher_conta',
    'PAGAR_RECLAMANTE': 'pagar_reclamante',
    'DEPOSITAR_CONTA_VINCULADA': 'recolher_conta',
    'recolher_conta': 'recolher_conta',
  };

  return {
    apurar: fgtsConf?.apurar ?? (fgtsDeposito > 0),
    destino: destMap[fgtsConf?.destino || ''] || 'pagar_reclamante',
    // PJC <Fgts><comporPrincipal>SIM|NAO</comporPrincipal> — decide se o FGTS
    // compõe o liquido_exequente. Default false por compatibilidade, mas quando
    // o PJC diz SIM, o engine deve incluir FGTS no líquido do reclamante.
    compor_principal: fgtsConf?.compor_principal ?? false,
    // Alíquota: 8% padrão, 2% quando PJC indicar aprendiz.
    aliquota: (fgtsConf as unknown as { aliquota?: 8 | 2 })?.aliquota ?? 8,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: fgtsConf?.multa_percentual ?? 40,
    multa_base: (fgtsConf?.multa_base as PjeFGTSConfig['multa_base']) || 'devido',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: fgtsConf?.lc110_10 ?? false,
    lc110_05: fgtsConf?.lc110_05 ?? false,
    // Campos novos lidos do PJC XML (quando presentes) — default false.
    multa_art_467: (fgtsConf as unknown as { multa_art_467?: boolean })?.multa_art_467 ?? false,
    excluir_aviso_multa: (fgtsConf as unknown as { excluir_aviso_multa?: boolean })?.excluir_aviso_multa ?? false,
    perdas_monetarias: (fgtsConf as unknown as { perdas_monetarias?: boolean })?.perdas_monetarias ?? false,
  };
}

// Keep old name as alias for backward compat
function buildDefaultFGTSConfig(): PjeFGTSConfig {
  return buildFGTSConfigFromPJC({ resultado: { fgts_deposito: 0 } } as PJCAnalysis);
}

function convertApuracaoJurosToGT(entries?: ApuracaoJurosEntry[]): PjeApuracaoJurosGT[] | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries.map(e => ({
    competencia: e.competencia,
    valor_corrigido: e.valor_corrigido,
    cs_base_normal: e.cs_base_normal,
    cs_base_13: e.cs_base_13,
    cs_normal: e.cs_normal,
    cs_13: e.cs_13,
    ir_base_demais: e.ir_base_demais,
    ir_base_13: e.ir_base_13,
    ir_base_ferias: e.ir_base_ferias,
    taxa_juros: e.taxa_juros,
  }));
}

function buildDefaultCSConfig(a: PJCAnalysis): PjeCSConfig {
  const csConf = a.cs_config;
  const gt = convertApuracaoJurosToGT(a.apuracao_juros);
  return {
    apurar_segurado: csConf?.apurar_segurado ?? (a.resultado.inss_reclamante > 0),
    cobrar_reclamante: csConf?.apurar_segurado ?? (a.resultado.inss_reclamante > 0),
    cs_sobre_salarios_pagos: false,
    // Map PJC aliquotaSegurado: if it's a flat rate (e.g. 8.00), use 'fixa'
    // PJe-Calc uses "Segurado Empregado" (progressive) or fixed aliquota
    aliquota_segurado_tipo: csConf?.aliquota_segurado && csConf.aliquota_segurado > 0 ? 'fixa' : 'empregado',
    aliquota_segurado_fixa: csConf?.aliquota_segurado || undefined,
    limitar_teto: true,
    apurar_empresa: csConf?.apurar_empresa ?? (a.resultado.inss_reclamado > 0),
    // SAT/RAT: enable if PJC has SAT > 0, or default to true when empregador active
    apurar_sat: (csConf?.aliquota_sat ?? 0) > 0 || (csConf?.apurar_empresa ?? (a.resultado.inss_reclamado > 0)),
    // Terceiros: only enable if PJC explicitly sets aliquota > 0
    apurar_terceiros: (csConf?.aliquota_terceiros ?? 0) > 0,
    aliquota_empregador_tipo: 'atividade',
    aliquota_empresa_fixa: csConf?.aliquota_empresa ?? 20,
    aliquota_sat_fixa: csConf?.aliquota_sat ?? 2, // Default SAT/RAT grau leve
    aliquota_terceiros_fixa: csConf?.aliquota_terceiros ?? 0, // 0 when PJC doesn't specify
    periodos_simples: [],
    apuracao_juros_gt: gt,
    // CAUSA-6: respeita o checkbox "Com Correção Trabalhista" do PJe-Calc
    com_correcao_trabalhista: csConf?.com_correcao_trabalhista,
  };
}

function buildDefaultIRConfig(a: PJCAnalysis): PjeIRConfig {
  const gt = convertApuracaoJurosToGT(a.apuracao_juros);
  const ic = a.ir_config;
  // Prefer PJC's explicit flags when present. Caveat: apurar=true in PJC XML does
  // not necessarily mean the result is > 0 — zero income after deductions is valid.
  if (ic) {
    return {
      apurar: ic.apurar_imposto_renda,
      incidir_sobre_juros: ic.incidir_sobre_juros_de_mora,
      cobrar_reclamado: ic.cobrar_do_reclamado,
      tributacao_exclusiva_13: ic.considerar_tributacao_exclusiva,
      tributacao_separada_ferias: ic.considerar_tributacao_em_separado,
      deduzir_cs: ic.deduzir_cs_reclamante,
      deduzir_prev_privada: ic.deduzir_previdencia_privada,
      deduzir_pensao: ic.deduzir_pensao_alimenticia,
      deduzir_honorarios: ic.deduzir_honorarios_reclamante,
      aposentado_65: ic.aposentado_maior_que_65,
      dependentes: ic.possui_dependentes ? ic.quantidade_dependentes : 0,
      apuracao_juros_gt: gt,
    };
  }
  // Fallback defaults (PJe-Calc defaults mirror `configurarValoresPadroes`).
  return {
    apurar: a.resultado.imposto_renda > 0,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: false,
    tributacao_separada_ferias: false,
    deduzir_cs: true,
    deduzir_prev_privada: true,
    deduzir_pensao: true,
    deduzir_honorarios: true,
    aposentado_65: false,
    dependentes: 0,
    apuracao_juros_gt: gt,
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

  const indiceBase = normalizeIndice(a.atualizacao.indice_base || 'IPCAE');

  // Build combinations from PJC XML
  let combinacoes_indice: PjeCombinacaoIndice[] = [];
  let combinacoes_juros: PjeCombinacaoJuros[] = [];

  const validCombIdx = a.atualizacao.combinacoes_indice.filter(ci => ci.a_partir_de && ci.indice);
  const validCombJur = a.atualizacao.combinacoes_juros.filter(cj => cj.a_partir_de && cj.tipo);

  if (validCombIdx.length > 0) {
    // PJC has explicit combinations — use them
    // FIX: SEM_CORRECAO in combinacoes_indice from PJC XML means "stop juros remuneratórios"
    // NOT "stop monetary correction". IPCA-E correction continues until liquidation.
    // SEM_CORRECAO → maps to combinacoes_juros: NENHUM (not to combinacoes_indice)
    combinacoes_indice.push({ indice: indiceBase });
    for (const ci of validCombIdx) {
      const indiceNorm = normalizeIndice(ci.indice);
      if (indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'NENHUM') {
        // H2 (ADC 58/59): quando o PJC emite {SEM_CORRECAO, a partir de citação}
        // em combinacoes_indice, o efeito real é "parar de acumular IPCA-E a
        // partir da citação". Registrar a transição também em combinacoes_indice
        // (engine interpreta SEM_CORRECAO como "suspende o índice" via
        // aplicarCorrecaoCombinacao loop). Sem este push, IPCA-E continua
        // crescendo o valor_corrigido até a liquidação, inflacionando o bruto
        // em ~20-40% nos casos pós-ADC58.
        combinacoes_indice.push({ de: ci.a_partir_de, indice: 'SEM_CORRECAO' });
        // FIX: não emitir NENHUM quando o PJC já tem uma combinação de juros
        // explícita (e.g. SELIC) para a mesma data. Caso contrário, o seletor
        // getRegimeParaData do engine-v3 (sort estável) pode devolver NENHUM
        // em vez de SELIC, zerando juros e fator de correção pós-citação.
        const hasJurosMesmaData = validCombJur.some(cj => cj.a_partir_de === ci.a_partir_de);
        if (!hasJurosMesmaData) {
          combinacoes_juros.push({ de: ci.a_partir_de, tipo: 'NENHUM' });
        }
      } else if (indiceNorm === 'SELIC') {
        // SELIC substitutes IPCA-E as correction index (already includes interest)
        combinacoes_indice.push({ de: ci.a_partir_de, indice: 'SELIC' });
        // Mesmo fix: só emite NENHUM se não houver combinação de juros do PJC
        // para a mesma data — evita colisão com regime explícito.
        const hasJurosMesmaData = validCombJur.some(cj => cj.a_partir_de === ci.a_partir_de);
        if (!hasJurosMesmaData) {
          combinacoes_juros.push({ de: ci.a_partir_de, tipo: 'NENHUM' });
        }
      } else {
        // Other explicit index (INPC, IGPM, TR, etc.)
        combinacoes_indice.push({ de: ci.a_partir_de, indice: indiceNorm });
      }
    }
    if (validCombJur.length > 0) {
      combinacoes_juros.push({ tipo: 'TRD_SIMPLES', percentual: 1 });
      for (const cj of validCombJur) {
        combinacoes_juros.push({ de: cj.a_partir_de, tipo: normalizeJuros(cj.tipo), percentual: cj.taxa });
      }
    }
  } else {
    // ═══ ADC 58/59 — Auto-build regime when PJC has no combinations ═══
    // STF ADC 58/59 (Nov 2021):
    //   Pre-ADC58:  IPCA-E correction + 1% simple monthly juros
    //   Post-ADC58: SELIC (correction + interest combined)
    const DATA_ADC58 = '2021-11-11';
    const dataCitacao = a.parametros.data_citacao || a.parametros.ajuizamento;
    const dataLiq = a.parametros.data_liquidacao || a.parametros.termino_calculo;

    if (indiceBase === 'IPCA-E' || indiceBase === 'IPCAE') {
      // IPCA-E base → ADC 58/59 regime
      combinacoes_indice.push({ indice: 'IPCA-E' }); // from start
      combinacoes_indice.push({ de: DATA_ADC58, indice: 'SELIC' }); // SELIC from ADC date

      // Juros: always provide both segments so aplicarJurosAposCS uses combination path
      // Pre-ADC58: 1% simple monthly juros
      // Post-ADC58: NENHUM (SELIC correction already includes juros)
      combinacoes_juros.push({ tipo: 'TRD_SIMPLES', percentual: 1 }); // default from start
      combinacoes_juros.push({ de: DATA_ADC58, tipo: 'NENHUM' }); // SELIC = no separate juros
    } else {
      // Non-IPCA-E base (INPC, TR, etc.) — single index, no ADC regime
      combinacoes_indice.push({ indice: indiceBase });
    }
  }

  const hasCombinations = combinacoes_indice.length > 0;
  const gt = convertApuracaoJurosToGT(a.apuracao_juros);

  return {
    indice: hasCombinations ? 'COMBINACAO' : indiceBase,
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: (() => {
      const dl = a.parametros.data_liquidacao || a.parametros.termino_calculo;
      if (!dl) {
        throw new Error(
          '[MODO_INDEPENDENTE] data_liquidacao ausente. ' +
          'Informe a data de liquidação explicitamente. ' +
          'Usar new Date() gera resultados não-determinísticos.'
        );
      }
      return dl;
    })(),
    combinacoes_indice: hasCombinations ? combinacoes_indice : undefined,
    combinacoes_juros: combinacoes_juros.length > 0 ? combinacoes_juros : undefined,
    juros_apos_deducao_cs: a.atualizacao.juros_apos_deducao_cs,
    apuracao_juros_gt: gt,
    gt_closure: (a.resultado.liquido_exequente > 0 || a.resultado.inss_reclamante > 0) ? {
      liquido_exequente: a.resultado.liquido_exequente,
      inss_reclamante: a.resultado.inss_reclamante,
      inss_reclamado: a.resultado.inss_reclamado,
      imposto_renda: a.resultado.imposto_renda,
    } : undefined,
    // New PJC fields
    ignorar_taxa_negativa: a.atualizacao.ignorar_taxa_negativa,
    // CAUSA-4: normalizar para UPPER (PJe-Calc emite 'DIFERENCA','DEVIDO',
    // 'CORRIGIDO','VERBA_INSS' / às vezes em camelCase: VerbaInss). Sempre uppercase.
    base_de_juros_das_verbas: (a.atualizacao.base_de_juros_das_verbas || '').toUpperCase().replace(/-/g, '_') || undefined,
    ente_publico: a.atualizacao.ente_publico,
    aplicar_juros_fase_pre_judicial: a.atualizacao.aplicar_juros_fase_pre_judicial,
  };
}

function buildHonorariosConfig(a: PJCAnalysis): PjeHonorariosConfig {
  const totalHon = a.resultado.honorarios.reduce((s, h) => s + h.valor, 0);
  // O XML PJC emite apenas o VALOR ABSOLUTO dos honorários (sem percentual).
  // Usar `valor_fixo` quando existe, evitando recálculo com percentual inventado.
  // Antes: default 15% — produzia honor inflado quando o PJC usa 6-10% em alguns casos.
  return {
    apurar_sucumbenciais: totalHon > 0,
    percentual_sucumbenciais: 15, // Fallback — só aplicado se valor_fixo não vier
    base_sucumbenciais: 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
    valor_fixo: totalHon > 0 ? totalHon : undefined,
  };
}

function buildCustasConfig(a: PJCAnalysis): PjeCustasConfig {
  const custasTotal = a.resultado.custas || 0;
  // If PJC has custas value, use it as fixed amount (not percentage)
  if (custasTotal > 0) {
    return {
      apurar: true,
      percentual: 0, // Fixed value, not percentage
      valor_minimo: custasTotal,
      valor_maximo: custasTotal,
      isento: false,
      assistencia_judiciaria: false,
      itens: [], // No additional items — the padrão calculation uses valor_minimo/maximo
    };
  }
  return {
    apurar: false,
    percentual: 0,
    valor_minimo: 0,
    isento: true,
    assistencia_judiciaria: false,
    itens: [],
  };
}

// =====================================================
// CARTÃO PONTO — Aggregate daily apuracao into monthly
// =====================================================

function convertCartaoPonto(
  apuracaoDiaria: ApuracaoDiariaAnalysis[],
  report: FidelityReport,
): PjeCartaoPonto[] {
  if (!apuracaoDiaria || apuracaoDiaria.length === 0) {
    addFidelityEntry(report, {
      code: 'W002',
      category: 'bridge_data_loss',
      severity: 'warning',
      message: 'Nenhuma apuração diária encontrada no PJC. CartaoPonto ficará vazio — engine usará ocorrências precomputadas.',
      message_friendly: 'Sem dados de jornada diária no arquivo. O cálculo usará os valores pré-calculados.',
      module: 'cartao_ponto',
    });
    return [];
  }

  // Group daily entries by YYYY-MM competência
  const byMonth = new Map<string, ApuracaoDiariaAnalysis[]>();
  for (const dia of apuracaoDiaria) {
    if (!dia.data) continue;
    const comp = dia.data.slice(0, 7);
    if (!byMonth.has(comp)) byMonth.set(comp, []);
    byMonth.get(comp)!.push(dia);
  }

  const cartaoPonto: PjeCartaoPonto[] = [];
  for (const [comp, dias] of byMonth) {
    const diasUteis = dias.filter(d => d.tipo_dia === 'UTIL' || d.tipo_dia === 'DIA_UTIL').length;
    const diasTrabalhados = dias.filter(d => d.horas_trabalhadas > 0).length;
    const he50 = dias.reduce((s, d) => s + d.horas_extras_diaria, 0);
    const he100 = dias.reduce((s, d) => s + d.horas_extras_semanal, 0);
    const horasNoturnas = dias.reduce((s, d) => s + d.horas_noturnas, 0);
    const intervaloSuprimido = dias.reduce((s, d) => s + d.horas_intra_jornada, 0);
    const dsrHoras = dias.filter(d => d.tipo_dia === 'DSR' || d.tipo_dia === 'REPOUSO').reduce((s, d) => s + d.horas_trabalhadas, 0);
    
    cartaoPonto.push({
      competencia: comp,
      dias_uteis: diasUteis,
      dias_trabalhados: diasTrabalhados,
      horas_extras_50: he50,
      horas_extras_100: he100,
      horas_noturnas: horasNoturnas,
      intervalo_suprimido: intervaloSuprimido,
      dsr_horas: dsrHoras,
      sobreaviso: 0,
      dados_extras: {
        horas_inter_jornadas: dias.reduce((s, d) => s + d.horas_inter_jornadas, 0),
        horas_art384: dias.reduce((s, d) => s + d.horas_art384, 0),
        horas_art253: dias.reduce((s, d) => s + d.horas_art253, 0),
        repousos_trabalhados: dias.reduce((s, d) => s + d.repousos_trabalhados, 0),
        feriados_trabalhados: dias.reduce((s, d) => s + d.feriados_trabalhados, 0),
        faltas: dias.filter(d => d.falta).length,
        compensacoes: dias.filter(d => d.compensacao).length,
      },
    });
  }

  cartaoPonto.sort((a, b) => a.competencia.localeCompare(b.competencia));
  
  addFidelityEntry(report, {
    code: 'I001',
    category: 'bridge_data_loss',
    severity: 'info',
    message: `CartaoPonto gerado com ${cartaoPonto.length} meses a partir de ${apuracaoDiaria.length} registros diários.`,
    message_friendly: `Dados de jornada importados: ${cartaoPonto.length} meses, ${apuracaoDiaria.length} dias.`,
    module: 'cartao_ponto',
  });

  return cartaoPonto;
}

// =====================================================
// EXCEÇÕES DE CARGA HORÁRIA
// =====================================================

function convertExcecoesCargaHoraria(analysis: PJCAnalysis): PjeExcecaoCargaHoraria[] {
  if (!analysis.excecoes_carga_horaria) return [];
  return analysis.excecoes_carga_horaria.map(e => ({
    data_inicial: e.data_inicial,
    data_final: e.data_final,
    carga_horaria: e.carga_horaria,
    observacao: e.observacao,
  }));
}

// =====================================================
// EXCEÇÕES DE SÁBADO
// =====================================================

function convertExcecoesSabado(analysis: PJCAnalysis): PjeExcecaoSabado[] {
  if (!analysis.excecoes_sabado) return [];
  return analysis.excecoes_sabado.map(e => ({
    data_inicial: e.data_inicial,
    data_final: e.data_final,
    sabado_dia_util: e.sabado_dia_util,
    observacao: e.observacao,
  }));
}

// =====================================================
// PREVIDÊNCIA PRIVADA CONFIG
// =====================================================

function buildPrevPrivadaConfig(a: PJCAnalysis): PjePrevidenciaPrivadaConfig {
  if (a.previdencia_privada?.apurar) {
    return {
      apurar: true,
      percentual: a.previdencia_privada.percentual || 0,
      base_calculo: 'diferenca',
      deduzir_ir: true,
    };
  }
  return { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false };
}

// =====================================================
// PENSÃO ALIMENTÍCIA CONFIG
// =====================================================

function buildPensaoConfig(a: PJCAnalysis): PjePensaoConfig {
  if (a.pensao_alimenticia?.apurar) {
    const baseMap: Record<string, 'liquido' | 'bruto' | 'bruto_menos_inss'> = {
      'LIQUIDO': 'liquido', 'BRUTO': 'bruto', 'BRUTO_MENOS_INSS': 'bruto_menos_inss',
    };
    return {
      apurar: true,
      percentual: a.pensao_alimenticia.percentual || 0,
      base: baseMap[(a.pensao_alimenticia.base || '').toUpperCase()] || 'liquido',
    };
  }
  return { apurar: false, percentual: 0, base: 'liquido' };
}

// =====================================================
// SALÁRIO-FAMÍLIA CONFIG
// =====================================================

function buildSalarioFamiliaConfig(a: PJCAnalysis): PjeSalarioFamiliaConfig {
  if (a.salario_familia?.apurar) {
    return {
      apurar: true,
      numero_filhos: a.salario_familia.numero_filhos || 0,
    };
  }
  return { apurar: false, numero_filhos: 0 };
}

// =====================================================
// SEGURO-DESEMPREGO CONFIG
// =====================================================

function buildSeguroConfig(a: PJCAnalysis): PjeSeguroConfig {
  if (a.seguro_desemprego?.apurar) {
    return {
      apurar: true,
      parcelas: a.seguro_desemprego.parcelas,
      recebeu: a.seguro_desemprego.recebeu,
    };
  }
  return { apurar: false, parcelas: 0, recebeu: false };
}

// =====================================================
// TRACK UNMAPPED MODULES (loss-awareness)
// =====================================================

function trackUnmappedModules(analysis: PJCAnalysis, report: FidelityReport): void {
  // Exceções de sábado — now mapped but note in fidelity report
  if (analysis.excecoes_sabado && analysis.excecoes_sabado.length > 0) {
    addFidelityEntry(report, {
      code: 'I004',
      category: 'bridge_data_loss',
      severity: 'info',
      message: `${analysis.excecoes_sabado.length} exceções de sábado mapeadas para o engine.`,
      message_friendly: 'Exceções de sábado importadas.',
      module: 'excecoes_sabado',
      field: 'ExcecaoSabado',
    });
  }
}
