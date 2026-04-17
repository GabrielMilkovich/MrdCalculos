/**
 * PJC Real Case Analyzer
 * Extracts complete calculation structure from a real PJe-Calc .PJC file
 */

import { DOMParser as NodeDOMParser } from '@xmldom/xmldom';

// Polyfill: usar xmldom no Node.js, DOMParser nativo no browser
const getParser = (): DOMParser => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  return new NodeDOMParser() as unknown as DOMParser;
};


export interface VinculoEmpregaticio {
  id: string;
  data_admissao: string;
  data_demissao: string;
  salario_inicial: number;
  salario_final: number;
  tipo_rescisao?: string;
  cargo?: string;
}

export interface ConvocacaoIntermitente {
  data_inicio: string;
  data_fim: string;
  horas_trabalhadas: number;
  valor_recebido: number;
  competencia: string;
}

export interface PJCAnalysis {
  parametros: {
    beneficiario: string;
    cpf: string;
    reclamado: string;
    cnpj: string;
    admissao: string;
    demissao: string;
    ajuizamento: string;
    inicio_calculo: string;
    termino_calculo: string;
    /** Real liquidation date from <dataDeLiquidacao> or <dataLiquidacao> */
    data_liquidacao: string;
    carga_horaria: number;
    sabado_dia_util: boolean;
    projeta_aviso: boolean;
    feriado_estadual: boolean;
    feriado_municipal: boolean;
    regime: string;
    indices_acumulados: string;
    dia_fechamento: number;
    versao_sistema: string;
    zera_negativo: boolean;
    prescricao_quinquenal: boolean;
    prescricao_fgts: boolean;
    limitar_avos: boolean;
    /** Data de citação extraída do PJC */
    data_citacao?: string;
    valor_da_causa?: number;
  };
  resultado: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    fgts_deposito: number;
    valor_principal?: number;
    /** null quando PJe-Calc nao persistiu juros; 0 significa juros=0 explicito */
    juros_mora_persistido?: number | null;
    honorarios: { nome: string; cpf: string; valor: number }[];
    custas: number;
  };
  cs_config?: {
    apurar_segurado: boolean;
    apurar_empresa: boolean;
    aliquota_segurado: number;
    aliquota_empresa: number;
    aliquota_sat: number;
    aliquota_terceiros: number;
    /** CAUSA-6: PJe-Calc "Com Correção Trabalhista" — INSS sobre base corrigida */
    com_correcao_trabalhista?: boolean;
  };
  /** IR config from PJC XML (ImpostoRendaCalculo / impostoDeRenda). */
  ir_config?: {
    apurar_imposto_renda: boolean;
    incidir_sobre_juros_de_mora: boolean;
    cobrar_do_reclamado: boolean;
    considerar_tributacao_exclusiva: boolean;
    considerar_tributacao_em_separado: boolean;
    regime_de_caixa: boolean;
    deduzir_cs_reclamante: boolean;
    deduzir_previdencia_privada: boolean;
    deduzir_pensao_alimenticia: boolean;
    deduzir_honorarios_reclamante: boolean;
    aposentado_maior_que_65: boolean;
    possui_dependentes: boolean;
    quantidade_dependentes: number;
  };
  verbas: VerbaAnalysis[];
  historicos_salariais: HistoricoAnalysis[];
  /** @deprecated Use apuracao_diaria instead */
  apuracao_diaria_count: number;
  /** Full parsed daily apuracao data from ApuracaoDiariaCartao */
  apuracao_diaria: ApuracaoDiariaAnalysis[];
  faltas: FaltaAnalysis[];
  ferias: FeriasAnalysis[];
  atualizacao: AtualizacaoAnalysis;
  dag: { id: string; nome: string; depende_de: string[]; dependentes: string[] }[];
  /** Ground truth from PJe-Calc's <ApuracaoDeJuros> consolidation section */
  apuracao_juros?: ApuracaoJurosEntry[];
  /** Exceções de carga horária */
  excecoes_carga_horaria?: ExcecaoCargaHorariaAnalysis[];
  /** Exceções de sábado */
  excecoes_sabado?: ExcecaoSabadoAnalysis[];
  /** FGTS config from PJC XML */
  fgts_config?: {
    apurar: boolean;
    multa_percentual: number;
    multa_base: string;
    lc110_10: boolean;
    lc110_05: boolean;
    destino: string;
  };
  /** Pensão alimentícia config */
  pensao_alimenticia?: { apurar: boolean; percentual: number; base?: string };
  /** Previdência privada config */
  previdencia_privada?: { apurar: boolean; percentual: number };
  /** Salário-família config */
  salario_familia?: { apurar: boolean; numero_filhos: number };
  /** Seguro-desemprego config */
  seguro_desemprego?: { apurar: boolean; parcelas: number; recebeu: boolean };
  /**
   * Parser-level warnings about missing or inferred data.
   * W_CITACAO_AUSENTE: data_citacao not found in the PJC XML — must be entered manually
   *   for independent mode with ADC 58/59 (IPCA-E/SELIC) to work correctly.
   */
  avisos?: Array<{ codigo: string; mensagem: string }>;
  /** Vínculos empregatícios detectados (Padrão B: múltiplos períodos) */
  vinculos: VinculoEmpregaticio[];
  tem_multiplos_vinculos: boolean;
  /** Contrato intermitente (Lei 13.467/2017) */
  contrato_intermitente: boolean;
  convocacoes?: ConvocacaoIntermitente[];
  /** Configuração de cálculo lida diretamente do XML */
  calculo_config: PJCCalculoConfig;
}

export interface PJCCalculoConfig {
  /** Súmula 381: como usar os índices de correção */
  indices_acumulados: 'MES_SUBSEQUENTE_AO_VENCIMENTO' | 'MES_DO_VENCIMENTO' | string;
  /** Como calcular a média dos reflexos */
  comportamento_reflexo: string;
  /** Gabarito de dadosEstruturados do PJe-Calc */
  gabarito: {
    imposto_renda: number;
    inss_reclamante: number;
    inss_reclamado: number;
    valor_principal: number;
    fgts_deposito: number;
  };
  /** Número de meses para RRA */
  nm_rra?: number;
}

/** Entry from PJe-Calc's <ApuracaoDeJuros> — consolidated corrected values per competência */
export interface ApuracaoJurosEntry {
  competencia: string;
  valor_corrigido: number;
  cs_base_normal: number;
  cs_base_13: number;
  cs_normal: number;
  cs_13: number;
  ir_base_demais: number;
  ir_base_13: number;
  ir_base_ferias: number;
  taxa_juros: number;
}

export interface VerbaAnalysis {
  id: string;
  tipo: 'Calculada' | 'Reflexo';
  nome: string;
  descricao?: string;
  variacao: string;
  caracteristica: string;
  ocorrencia_pagamento: string;
  periodo_inicio: string;
  periodo_fim: string;
  incidencias: { inss: boolean; irpf: boolean; fgts: boolean };
  formula: {
    base_tabelada?: string;
    base_verbas: { id: string; nome: string; integralizar: string }[];
    divisor: { tipo: string; valor: number };
    multiplicador: { valor: number };
    quantidade: { tipo: string; valor: number };
    dobra: boolean;
    valor_pago?: { tipo: string; valor: number };
  };
  // Reflexo-specific
  comportamento_reflexo?: string;
  periodo_media?: string;
  tratamento_fracao?: string;
  // Flags
  excluir_falta_justificada?: boolean;
  excluir_falta_nao_justificada?: boolean;
  excluir_ferias_gozadas?: boolean;
  juros_do_ajuizamento?: string;
  ordem: number;
  ativo: boolean;
  gerar_principal?: string;
  gerar_reflexo?: string;
  compor_principal?: string;
  ocorrencias_count: number;
  ocorrencias_all: OcorrenciaAnalysis[];
  ocorrencias_sample: OcorrenciaAnalysis[];
  total_devido?: number;
  total_pago?: number;
  total_diferenca?: number;
}

export interface OcorrenciaAnalysis {
  competencia: string;
  base: number;
  base_integral?: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  quantidade_integral?: number;
  dobra: boolean;
  devido: number;
  devido_integral?: number;
  pago: number;
  pago_integral?: number;
  indice_acumulado?: number;
  caracteristica: string;
}

export interface HistoricoAnalysis {
  nome: string;
  tipo_variacao: string;
  incide_inss: boolean;
  incide_fgts: boolean;
  /** @deprecated Use competencias.length */
  ocorrencias_count: number;
  competencias: { comp: string; valor: number }[];
  /** Additional fields extracted from OcorrenciaDoHistoricoSalarial */
  ocorrencias_detalhadas?: {
    data_ocorrencia: string;
    competencia: string;
    valor: number;
    tipo?: string;
  }[];
}

/** Full daily apuracao data extracted from ApuracaoDiariaCartao */
export interface ApuracaoDiariaAnalysis {
  data: string;
  frequencia_diaria: string;
  horas_trabalhadas: number;
  horas_extras_diaria: number;
  horas_extras_semanal: number;
  horas_extras_mensal: number;
  horas_noturnas: number;
  horas_intra_jornada: number;
  horas_inter_jornadas: number;
  horas_art384: number;
  horas_art253: number;
  repousos_trabalhados: number;
  feriados_trabalhados: number;
  tipo_dia: string;
  /** Whether the worker was absent */
  falta: boolean;
  /** Whether compensation was applied */
  compensacao: boolean;
}

export interface ExcecaoCargaHorariaAnalysis {
  data_inicial: string;
  data_final: string;
  carga_horaria: number;
  observacao?: string;
}

export interface ExcecaoSabadoAnalysis {
  data_inicial: string;
  data_final: string;
  sabado_dia_util: boolean;
  observacao?: string;
}

export interface FaltaAnalysis {
  tipo: string;
  data_inicio: string;
  data_fim: string;
  justificada: boolean;
}

export interface FeriasAnalysis {
  aquisitivo_inicio: string;
  aquisitivo_fim: string;
  concessivo_inicio?: string;
  concessivo_fim?: string;
  dias: number;
  abono: boolean;
  dias_abono: number;
  dobra: boolean;
  situacao: string;
  gozo_inicio?: string;
  gozo_fim?: string;
}

export interface AtualizacaoAnalysis {
  indice_base: string; // e.g. 'IPCAE', 'IPCA', 'SELIC'
  combinacoes_indice: { a_partir_de: string; indice: string }[];
  combinacoes_juros: { a_partir_de: string; tipo: string; taxa?: number }[];
  juros_apos_deducao_cs: boolean;
  /** PJC: ignorarTaxaNegativa — when true, negative correction factors are clamped to 1 */
  ignorar_taxa_negativa?: boolean;
  /** PJC: baseDeJurosDasVerbas — which value to use as interest base */
  base_de_juros_das_verbas?: string;
  /** PJC: entePublico — affects interest calculation */
  ente_publico?: boolean;
  /** PJC: aplicarJurosFasePreJudicial */
  aplicar_juros_fase_pre_judicial?: boolean;
  /** PJC: jurosPadrao — default interest type */
  juros_padrao?: string;
  /** PJC: dataInicialDoJurosPadrao */
  data_inicial_juros_padrao?: string;
  /** PJC: dataFinalDoJurosPadrao */
  data_final_juros_padrao?: string;
}

// =====================================================
// HELPERS
// =====================================================

function tsToDate(ts: string): string {
  if (!ts || ts === 'null') return '';
  const n = parseInt(ts);
  if (isNaN(n)) return ts;
  return new Date(n).toISOString().slice(0, 10);
}

function parseNum(s: string): number {
  if (!s || s === 'null') return 0;
  // Handle scientific notation like "0E-25"
  return parseFloat(s) || 0;
}

// =====================================================
// MAIN PARSER
// =====================================================

export function analyzePJC(xmlString: string): PJCAnalysis {
  const parser = getParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const root = doc.documentElement; // <Calculo>

  // --- Parâmetros ---
  // Some PJC files have nomeBeneficiario at root (gprec format),
  // others have the name under <Reclamante><nome>
  let beneficiario = getTextContent(root, 'nomeBeneficiario');
  if (!beneficiario) {
    const reclamanteEl = root.getElementsByTagName('Reclamante')[0];
    beneficiario = reclamanteEl ? getTextContent(reclamanteEl, 'nome') : '';
  }
  let cpf = getTextContent(root, 'documentoFiscalBeneficiario');
  if (!cpf) {
    const reclamanteEl = root.getElementsByTagName('Reclamante')[0];
    cpf = reclamanteEl ? getTextContent(reclamanteEl, 'numeroDocumentoFiscal') : '';
  }
  // Extract the real liquidation date (dataDeLiquidacao is the actual date used for correction)
  const dataLiquidacao = tsToDate(
    getTextContent(root, 'dataDeLiquidacao')
    || getTextContent(root, 'dataLiquidacao')
    || getTextContent(root, 'dataCalculo')
  );

  const parametros = {
    beneficiario,
    cpf,
    reclamado: extractReclamado(root),
    cnpj: extractReclamadoCNPJ(root),
    admissao: tsToDate(getTextContent(root, 'dataAdmissao')),
    demissao: tsToDate(getTextContent(root, 'dataDemissao')),
    ajuizamento: tsToDate(getTextContent(root, 'dataAjuizamento')),
    inicio_calculo: tsToDate(getTextContent(root, 'dataInicioCalculo')),
    termino_calculo: tsToDate(getTextContent(root, 'dataTerminoCalculo')),
    data_liquidacao: dataLiquidacao,
    carga_horaria: parseNum(getTextContent(root, 'valorCargaHorariaPadrao')),
    sabado_dia_util: getTextContent(root, 'sabadoDiaUtil') === 'true',
    projeta_aviso: getTextContent(root, 'projetaAvisoIndenizado') === 'true',
    feriado_estadual: getTextContent(root, 'consideraFeriadoEstadual') === 'true',
    feriado_municipal: getTextContent(root, 'consideraFeriadoMunicipal') === 'true',
    regime: getTextContent(root, 'regimeDoContrato'),
    indices_acumulados: getTextContent(root, 'indicesAcumulados'),
    dia_fechamento: parseInt(getTextContent(root, 'diaFechamentoMes')) || 31,
    versao_sistema: getTextContent(root, 'versaoDoSistema'),
    zera_negativo: getTextContent(root, 'zeraValorNegativo') === 'true',
    prescricao_quinquenal: getTextContent(root, 'prescricaoQuinquenal') === 'true',
    prescricao_fgts: getTextContent(root, 'prescricaoFgts') === 'true',
    limitar_avos: getTextContent(root, 'limitarAvosAoPeriodoDoCalculo') === 'true',
    data_citacao: tsToDate(getTextContent(root, 'dataCitacao') || getTextContent(root, 'dataDaCitacao')) || undefined,
    valor_da_causa: parseNum(getTextContent(root, 'valorDaCausa')) || undefined,
  };

  // --- Parser-level warnings ---
  const avisos: Array<{ codigo: string; mensagem: string }> = [];
  if (!parametros.data_citacao) {
    avisos.push({
      codigo: 'W_CITACAO_AUSENTE',
      mensagem: 'data_citacao não encontrada no arquivo PJC — ausente nos campos dataCitacao e dataDaCitacao. ' +
        'Para cálculo independente com ADC 58/59 (IPCA-E/SELIC) é obrigatório informar manualmente em Dados do Processo.',
    });
  }

  // --- Resultado ---
  const gprec = root.getElementsByTagName('gprec')[0];
  const dados = root.getElementsByTagName('dadosEstruturados')[0];
  const honorarios: { nome: string; cpf: string; valor: number }[] = [];
  const honEls = root.getElementsByTagName('honorario');
  const seen = new Set<string>();
  for (const h of Array.from(honEls)) {
    const nome = getTextContent(h, 'nome') || getTextContent(h, 'nomeCredor');
    const cpf = getTextContent(h, 'documentoFiscal') || getTextContent(h, 'docFiscalCredor');
    const key = `${nome}|${cpf}`;
    if (seen.has(key)) continue;
    seen.add(key);
    honorarios.push({
      nome,
      cpf,
      valor: parseNum(getTextContent(h, 'valor')),
    });
  }

  // jurosMora pode ser null/undefined (PJe-Calc nao persistiu) ou numero
  const jurosRaw = getTextContent(dados, 'jurosMora');
  const jurosPersistido = jurosRaw === 'null' || jurosRaw === '' ? null : parseNum(jurosRaw);

  const resultado = {
    liquido_exequente: parseNum(getTextContent(gprec, 'liquidoExequente')),
    inss_reclamante: parseNum(getTextContent(dados, 'inssReclamante')),
    inss_reclamado: parseNum(getTextContent(dados, 'inssReclamado')),
    imposto_renda: parseNum(getTextContent(dados, 'impostoRenda')),
    fgts_deposito: parseNum(getTextContent(dados, 'fgtsDepositoContaVinculada')),
    valor_principal: parseNum(getTextContent(dados, 'valorPrincipal')),
    juros_mora_persistido: jurosPersistido,
    honorarios,
    custas: parseNum(getTextContent(dados, 'custasReclamado')) + parseNum(getTextContent(dados, 'custasReclamante')),
  };

  // --- Verbas (Calculadas + Reflexos) ---
  const verbas: VerbaAnalysis[] = [];
  const verbaMap = new Map<string, VerbaAnalysis>();

  // Parse verbas from <verbas><Set>
  const verbasSet = root.getElementsByTagName('verbas')[0];
  if (verbasSet) {
    // All Calculada elements
    const calcEls = verbasSet.getElementsByTagName('Calculada');
    for (const el of Array.from(calcEls)) {
      const id = getTextContent(el, 'id');
      if (!id || id === '' || verbaMap.has(id)) continue;
      // Skip internalRef-only elements
      const internalRef = getTextContent(el, 'internalRef');
      if (internalRef && !getTextContent(el, 'nome')) continue;

      const v = parseVerbaCalculada(el);
      if (v) {
        verbas.push(v);
        verbaMap.set(v.id, v);
      }
    }

    // All Reflexo elements
    const refEls = verbasSet.getElementsByTagName('Reflexo');
    for (const el of Array.from(refEls)) {
      const id = getTextContent(el, 'id');
      if (!id || id === '' || verbaMap.has(id)) continue;

      const v = parseVerbaReflexo(el, verbaMap);
      if (v) {
        verbas.push(v);
        verbaMap.set(v.id, v);
      }
    }
  }

  // Sort by ordem
  verbas.sort((a, b) => a.ordem - b.ordem);

  // --- Build DAG ---
  const dag = verbas.map(v => ({
    id: v.id,
    nome: v.nome,
    depende_de: v.formula.base_verbas.map(b => b.id),
    dependentes: [] as string[],
  }));
  for (const node of dag) {
    for (const depId of node.depende_de) {
      const parent = dag.find(d => d.id === depId);
      if (parent) parent.dependentes.push(node.id);
    }
  }

  // --- Históricos Salariais ---
  const historicos_salariais: HistoricoAnalysis[] = [];
  const histEls = root.getElementsByTagName('HistoricoSalarial');
  for (const el of Array.from(histEls)) {
    const nome = getTextContent(el, 'nome');
    if (!nome) continue;
    const ocEls = el.getElementsByTagName('OcorrenciaHistorico');
    const ocDetalhadoEls = el.getElementsByTagName('OcorrenciaDoHistoricoSalarial');
    const comps: { comp: string; valor: number }[] = [];
    const ocorrencias_detalhadas: HistoricoAnalysis['ocorrencias_detalhadas'] = [];

    // Try OcorrenciaDoHistoricoSalarial first (more detailed real PJC format)
    if (ocDetalhadoEls.length > 0) {
      for (const oc of Array.from(ocDetalhadoEls)) {
        const dataOc = tsToDate(getTextContent(oc, 'dataOcorrencia') || getTextContent(oc, 'dataInicial'));
        const valor = parseNum(getTextContent(oc, 'valor'));
        const comp = dataOc.slice(0, 7);
        if (comp) {
          comps.push({ comp, valor });
          ocorrencias_detalhadas.push({
            data_ocorrencia: dataOc,
            competencia: comp,
            valor,
            tipo: getTextContent(oc, 'tipo') || undefined,
          });
        }
      }
    }
    // Fallback to OcorrenciaHistorico
    if (comps.length === 0) {
      for (const oc of Array.from(ocEls)) {
        comps.push({
          comp: tsToDate(getTextContent(oc, 'dataInicial')).slice(0, 7),
          valor: parseNum(getTextContent(oc, 'valor')),
        });
      }
    }

    historicos_salariais.push({
      nome,
      tipo_variacao: getTextContent(el, 'tipoVariacaoParcela'),
      incide_inss: getTextContent(el, 'incidenciaINSS') === 'true',
      incide_fgts: getTextContent(el, 'incidenciaFGTS') === 'true',
      ocorrencias_count: comps.length,
      competencias: comps,
      ocorrencias_detalhadas: ocorrencias_detalhadas.length > 0 ? ocorrencias_detalhadas : undefined,
    });
  }

  // --- Apuração Diária (FULL PARSE) ---
  const apuracaoEls = root.getElementsByTagName('ApuracaoDiariaCartao');
  const apuracao_diaria_count = apuracaoEls.length;
  const apuracao_diaria: ApuracaoDiariaAnalysis[] = [];
  for (const el of Array.from(apuracaoEls)) {
    apuracao_diaria.push({
      data: tsToDate(getTextContent(el, 'dataOcorrencia') || getTextContent(el, 'data')),
      frequencia_diaria: getTextContent(el, 'frequenciaDiaria') || getTextContent(el, 'frequencia') || '',
      horas_trabalhadas: parseNum(getTextContent(el, 'horasTrabalhadas')),
      horas_extras_diaria: parseNum(getTextContent(el, 'horasExtrasDiaria') || getTextContent(el, 'horasExtrasDiarias')),
      horas_extras_semanal: parseNum(getTextContent(el, 'horasExtrasSemanal') || getTextContent(el, 'horasExtrasSemanalDSR')),
      horas_extras_mensal: parseNum(getTextContent(el, 'horasExtrasMensal')),
      horas_noturnas: parseNum(getTextContent(el, 'horasNoturnas')),
      horas_intra_jornada: parseNum(getTextContent(el, 'horasIntraJornada') || getTextContent(el, 'supressaoDeIntervaloIntrajornada')),
      horas_inter_jornadas: parseNum(getTextContent(el, 'horasInterJornadas') || getTextContent(el, 'supressaoDeIntervaloInterjornadas')),
      horas_art384: parseNum(getTextContent(el, 'horasArt384') || getTextContent(el, 'art384')),
      horas_art253: parseNum(getTextContent(el, 'horasArt253') || getTextContent(el, 'art253')),
      repousos_trabalhados: parseNum(getTextContent(el, 'repousosTrabalhados')),
      feriados_trabalhados: parseNum(getTextContent(el, 'feriadosTrabalhados')),
      tipo_dia: getTextContent(el, 'tipoDia') || getTextContent(el, 'tipo') || 'UTIL',
      falta: getTextContent(el, 'falta') === 'true' || getTextContent(el, 'tipoDia') === 'FALTA',
      compensacao: getTextContent(el, 'compensacao') === 'true' || getTextContent(el, 'tipoDia') === 'COMPENSADO',
    });
  }

  // --- Faltas ---
  const faltas: FaltaAnalysis[] = [];
  const faltaEls = root.getElementsByTagName('FaltaAfastamento');
  for (const el of Array.from(faltaEls)) {
    faltas.push({
      tipo: getTextContent(el, 'tipoAfastamento') || getTextContent(el, 'tipo') || 'FALTA',
      data_inicio: tsToDate(getTextContent(el, 'dataInicial')),
      data_fim: tsToDate(getTextContent(el, 'dataFinal')),
      justificada: getTextContent(el, 'justificada') === 'true',
    });
  }

  // --- Férias ---
  const ferias: FeriasAnalysis[] = [];
  const ferEls = root.getElementsByTagName('Ferias');
  for (const el of Array.from(ferEls)) {
    // Skip nested refs (some PJC versions use 'prazo', others 'prazoPeriodoConcessivoEmDias')
    const prazoRaw = getTextContent(el, 'prazoPeriodoConcessivoEmDias') || getTextContent(el, 'prazo');
    if (!getTextContent(el, 'situacao') && !prazoRaw) continue;
    ferias.push({
      // PJC schema variants: some use 'dataInicialDoPeriodoAquisitivo' (with 'Do'), others without
      aquisitivo_inicio: tsToDate(getTextContent(el, 'dataInicialDoPeriodoAquisitivo') || getTextContent(el, 'dataInicialPeriodoAquisitivo')),
      aquisitivo_fim: tsToDate(getTextContent(el, 'dataFinalDoPeriodoAquisitivo') || getTextContent(el, 'dataFinalPeriodoAquisitivo')),
      concessivo_inicio: tsToDate(getTextContent(el, 'dataInicialDoPeriodoConcessivo') || getTextContent(el, 'dataInicialPeriodoConcessivo')),
      concessivo_fim: tsToDate(getTextContent(el, 'dataFinalDoPeriodoConcessivo') || getTextContent(el, 'dataFinalPeriodoConcessivo')),
      dias: parseInt(prazoRaw) || 30,
      abono: getTextContent(el, 'abono') === 'true',
      dias_abono: parseInt(getTextContent(el, 'quantidadeDiasAbono') || getTextContent(el, 'diasAbono')) || 0,
      dobra: getTextContent(el, 'dobraGeral') === 'true' || getTextContent(el, 'dobra') === 'true',
      situacao: getTextContent(el, 'situacao') || 'GOZADAS',
      gozo_inicio: tsToDate(getTextContent(el, 'dataInicialGozo')),
      gozo_fim: tsToDate(getTextContent(el, 'dataFinalGozo')),
    });
  }

  // --- Atualização ---
  const indiceBase = getTextContent(root, 'indiceTrabalhista') || 'IPCAE';
  
  // Check if "juros após dedução CS" is enabled (Critério 8 PJe-Calc)
  // juros_apos_deducao_cs: defaults to true (PJe-Calc standard behavior).
  // The '' === '' evaluation activates this for all PJCs where the tag is absent,
  // which is the correct default per PJe-Calc methodology.
  const jurosAposCsRaw = getTextContent(root, 'jurosAposDeducaoCS')
    || getTextContent(root, 'jurosAposDeducaoCsReclamante')
    || getTextContent(root, 'jurosAposDeducaoDaContribuicaoSocial');
  const jurosAposCS = jurosAposCsRaw === 'true' || jurosAposCsRaw === '';

  // Additional PJC fields for correction/interest
  const ignorarTaxaNegativa = getTextContent(root, 'ignorarTaxaNegativa') === 'true'
    || getTextContent(root, 'ignorarTaxasNegativas') === 'true';
  const baseDeJurosDasVerbas = getTextContent(root, 'baseDeJurosDasVerbas')
    || getTextContent(root, 'baseJurosVerbas')
    || '';
  const entePublico = getTextContent(root, 'entePublico') === 'true'
    || getTextContent(root, 'reclamadoEntePublico') === 'true';
  const aplicarJurosFasePreJudicial = getTextContent(root, 'aplicarJurosFasePreJudicial');
  const jurosPadrao = getTextContent(root, 'jurosPadrao') || getTextContent(root, 'juros');
  const dataInicialDoJurosPadrao = tsToDate(getTextContent(root, 'dataInicialDoJurosPadrao') || getTextContent(root, 'dataInicialJuros'));
  const dataFinalDoJurosPadrao = tsToDate(getTextContent(root, 'dataFinalDoJurosPadrao') || getTextContent(root, 'dataFinalJuros'));

  const atualizacao: AtualizacaoAnalysis = {
    indice_base: indiceBase,
    combinacoes_indice: [],
    combinacoes_juros: [],
    juros_apos_deducao_cs: jurosAposCS,
    ignorar_taxa_negativa: ignorarTaxaNegativa,
    base_de_juros_das_verbas: baseDeJurosDasVerbas,
    ente_publico: entePublico,
    aplicar_juros_fase_pre_judicial: aplicarJurosFasePreJudicial !== 'false',
    juros_padrao: jurosPadrao,
    data_inicial_juros_padrao: dataInicialDoJurosPadrao,
    data_final_juros_padrao: dataFinalDoJurosPadrao,
  };
  
  const combIndEls = root.getElementsByTagName('CombinacaoDeIndice');
  for (const el of Array.from(combIndEls)) {
    // PJC uses outroIndiceTrabalhista + apartirDeOutroIndice (timestamp)
    const indice = getTextContent(el, 'outroIndiceTrabalhista')
      || getTextContent(el, 'tipoIndice') || getTextContent(el, 'indice') || getTextContent(el, 'tipo');
    const dateStr = tsToDate(
      getTextContent(el, 'apartirDeOutroIndice')
      || getTextContent(el, 'dataInicial')
      || getTextContent(el, 'aPartirDe')
    );
    if (indice && dateStr) {
      atualizacao.combinacoes_indice.push({ a_partir_de: dateStr, indice });
    }
  }
  const combJurEls = root.getElementsByTagName('CombinacaoDeJuros');
  for (const el of Array.from(combJurEls)) {
    // PJC uses outroJuros + apartirDeOutroJuros (timestamp)
    const tipo = getTextContent(el, 'outroJuros')
      || getTextContent(el, 'tipoJuros') || getTextContent(el, 'tipo');
    const dateStr = tsToDate(
      getTextContent(el, 'apartirDeOutroJuros')
      || getTextContent(el, 'dataInicial')
      || getTextContent(el, 'aPartirDe')
    );
    if (tipo && dateStr) {
      atualizacao.combinacoes_juros.push({
        a_partir_de: dateStr,
        tipo,
        taxa: parseNum(getTextContent(el, 'taxa') || getTextContent(el, 'taxaMensal')),
      });
    }
  }

  // --- CS Config ---
  const csConfigEl = root.getElementsByTagName('ContribuicaoSocial')[0]
    || root.getElementsByTagName('contribuicaoSocial')[0]
    || root.getElementsByTagName('cs')[0];
  let cs_config: PJCAnalysis['cs_config'] = undefined;
  // Flag "com correção trabalhista" — aparece no root como
  // `correcaoTrabalhistaDosSalariosDevidosDoINSS` (dentro de parametrosAtualizacao)
  // ou como `comCorrecaoTrabalhista` em arquivos mais recentes.
  const comCorrecaoTrabalhista = getTextContent(root, 'comCorrecaoTrabalhista') === 'true'
    || getTextContent(root, 'correcaoTrabalhistaDosSalariosDevidosDoINSS') === 'true'
    ? true : undefined;
  if (csConfigEl) {
    cs_config = {
      apurar_segurado: getTextContent(csConfigEl, 'apurarSegurado') !== 'false',
      apurar_empresa: getTextContent(csConfigEl, 'apurarEmpresa') !== 'false',
      aliquota_segurado: parseNum(getTextContent(csConfigEl, 'aliquotaSegurado')) || 0,
      aliquota_empresa: parseNum(getTextContent(csConfigEl, 'aliquotaEmpresa') || getTextContent(csConfigEl, 'aliquotaPatronal')) || 20,
      aliquota_sat: parseNum(getTextContent(csConfigEl, 'aliquotaSAT') || getTextContent(csConfigEl, 'aliquotaRat')) || 0,
      aliquota_terceiros: parseNum(getTextContent(csConfigEl, 'aliquotaTerceiros')) || 0,
      com_correcao_trabalhista: getTextContent(csConfigEl, 'comCorrecaoTrabalhista') === 'true'
        || comCorrecaoTrabalhista
        || undefined,
    };
  } else if (comCorrecaoTrabalhista) {
    // Sem <ContribuicaoSocial>, mas o flag de correção trabalhista está no root.
    // Cria um cs_config mínimo só para propagar o flag — os campos numéricos ficam
    // em zero/default e serão preenchidos pelos fallbacks de buildDefaultCSConfig().
    cs_config = {
      apurar_segurado: true,
      apurar_empresa: true,
      aliquota_segurado: 0,
      aliquota_empresa: 20,
      aliquota_sat: 0,
      aliquota_terceiros: 0,
      com_correcao_trabalhista: true,
    };
  }
  // If PJC resultado shows zero CS, disable it
  if (resultado.inss_reclamante === 0 && resultado.inss_reclamado === 0) {
    cs_config = { apurar_segurado: false, apurar_empresa: false, aliquota_segurado: 0, aliquota_empresa: 0, aliquota_sat: 0, aliquota_terceiros: 0 };
  }

  // --- ApuracaoDeJuros (Ground Truth consolidation) ---
  const apuracao_juros: ApuracaoJurosEntry[] = [];
  const apuracaoJurosEls = root.getElementsByTagName('ApuracaoDeJuros');
  for (const ap of Array.from(apuracaoJurosEls)) {
    apuracao_juros.push({
      competencia: tsToDate(getTextContent(ap, 'competencia')),
      valor_corrigido: parseNum(getTextContent(ap, 'valorCorrigido')),
      cs_base_normal: parseNum(getTextContent(ap, 'valorVerbaParaContribuicaoSocial')),
      cs_base_13: parseNum(getTextContent(ap, 'valorVerbaParaContribuicaoSocialDecimoTerceiro')),
      cs_normal: parseNum(getTextContent(ap, 'contribuicaoSocialNormal')),
      cs_13: parseNum(getTextContent(ap, 'contribuicaoSocialDecimoTerceiro')),
      ir_base_demais: parseNum(getTextContent(ap, 'valorCorrigidoParaIrpfDemaisVerbas')),
      ir_base_13: parseNum(getTextContent(ap, 'valorCorrigidoParaIrpfDecimoTerceiro')),
      ir_base_ferias: parseNum(getTextContent(ap, 'valorCorrigidoParaIrpfFerias')),
      taxa_juros: parseNum(getTextContent(ap, 'taxaDeJuros')),
    });
  }

  // --- Exceções de Carga Horária ---
  const excecoes_carga_horaria: ExcecaoCargaHorariaAnalysis[] = [];
  const excCargaEls = root.getElementsByTagName('ExcecaoCargaHoraria');
  for (const el of Array.from(excCargaEls)) {
    excecoes_carga_horaria.push({
      data_inicial: tsToDate(getTextContent(el, 'dataInicial')),
      data_final: tsToDate(getTextContent(el, 'dataFinal')),
      carga_horaria: parseNum(getTextContent(el, 'cargaHoraria') || getTextContent(el, 'valorCargaHoraria')),
      observacao: getTextContent(el, 'observacao') || undefined,
    });
  }

  // --- Exceções de Sábado ---
  const excecoes_sabado: ExcecaoSabadoAnalysis[] = [];
  const excSabEls = root.getElementsByTagName('ExcecaoSabado');
  for (const el of Array.from(excSabEls)) {
    excecoes_sabado.push({
      data_inicial: tsToDate(getTextContent(el, 'dataInicial')),
      data_final: tsToDate(getTextContent(el, 'dataFinal')),
      sabado_dia_util: getTextContent(el, 'sabadoDiaUtil') === 'true',
      observacao: getTextContent(el, 'observacao') || undefined,
    });
  }

  // --- FGTS Config ---
  // O JSDOM é case-insensitive em HTML mode, então `getElementsByTagName('FGTS')`
  // retorna `<fgts>` lowercase — que é um CAMPO de outros blocos (tipo
  // `<fgtsDepositoContaVinculada>`) e NÃO o módulo FGTS. O módulo real do PJe-Calc
  // aparece como `<ModuloFGTS>` ou tem tag filha `<multaPercentual>`/`<percentualMulta>`.
  // Só considera módulo FGTS se tiver essas tags características.
  const fgtsCandidates = [
    root.getElementsByTagName('ModuloFGTS')[0],
    root.getElementsByTagName('moduloFgts')[0],
    root.getElementsByTagName('FGTS')[0],
  ];
  const fgtsEl = fgtsCandidates.find(el => {
    if (!el) return false;
    // Valida: elemento precisa ter tag característica de módulo FGTS
    return !!(getTextContent(el, 'percentualMulta')
      || getTextContent(el, 'multaPercentual')
      || getTextContent(el, 'apurar')
      || getTextContent(el, 'baseMulta')
      || getTextContent(el, 'multaBase'));
  });
  let fgts_config: PJCAnalysis['fgts_config'] = undefined;
  if (fgtsEl) {
    const multa_pct_raw = getTextContent(fgtsEl, 'percentualMulta') || getTextContent(fgtsEl, 'multaPercentual');
    fgts_config = {
      apurar: getTextContent(fgtsEl, 'apurar') !== 'false',
      multa_percentual: parseNum(multa_pct_raw) || 40,
      multa_base: getTextContent(fgtsEl, 'baseMulta') || getTextContent(fgtsEl, 'multaBase') || 'devido',
      lc110_10: getTextContent(fgtsEl, 'lc110_10') === 'true' || getTextContent(fgtsEl, 'contribuicaoSocial10') === 'true',
      lc110_05: getTextContent(fgtsEl, 'lc110_05') === 'true' || getTextContent(fgtsEl, 'contribuicaoSocial05') === 'true',
      destino: getTextContent(fgtsEl, 'destino') || getTextContent(fgtsEl, 'destinoFGTS') || 'pagar_reclamante',
    };
  }
  // If resultado shows FGTS deposit > 0 but no config element, create default
  if (!fgts_config && resultado.fgts_deposito > 0) {
    fgts_config = { apurar: true, multa_percentual: 40, multa_base: 'devido', lc110_10: false, lc110_05: false, destino: 'pagar_reclamante' };
  }

  // --- IR Config (flags from ImpostoRendaCalculo / impostoDeRenda) ---
  const irConfigEl = root.getElementsByTagName('ImpostoRendaCalculo')[0]
    || root.getElementsByTagName('impostoDeRenda')[0]
    || root.getElementsByTagName('ImpostoRenda')[0]
    || root.getElementsByTagName('impostoRendaCalculo')[0];
  let ir_config: PJCAnalysis['ir_config'] = undefined;
  if (irConfigEl) {
    const getBoolTag = (tag: string, fallback: boolean): boolean => {
      const t = getTextContent(irConfigEl, tag);
      if (t === 'true') return true;
      if (t === 'false') return false;
      return fallback;
    };
    ir_config = {
      apurar_imposto_renda: getBoolTag('apurarImpostoRenda', true),
      incidir_sobre_juros_de_mora: getBoolTag('incidirSobreJurosDeMora', false),
      cobrar_do_reclamado: getBoolTag('cobrarDoReclamado', false),
      considerar_tributacao_exclusiva: getBoolTag('considerarTributacaoExclusiva', false),
      considerar_tributacao_em_separado: getBoolTag('considerarTributacaoEmSeparado', false),
      regime_de_caixa: getBoolTag('regimeDeCaixa', false),
      deduzir_cs_reclamante: getBoolTag('deduzirContribuicaoSocialDevidaPeloReclamante', true),
      deduzir_previdencia_privada: getBoolTag('deduzirPrevidenciaPrivada', true),
      deduzir_pensao_alimenticia: getBoolTag('deduzirPensaoAlimenticia', true),
      deduzir_honorarios_reclamante: getBoolTag('deduzirHonorariosDevidosPeloReclamante', true),
      aposentado_maior_que_65: getBoolTag('aposentadoMaiorQue65Anos', false),
      possui_dependentes: getBoolTag('possuiDependentes', false),
      quantidade_dependentes: parseInt(getTextContent(irConfigEl, 'quantidadeDependentes')) || 0,
    };
  } else {
    // fallback: look at root level
    const getBoolRoot = (tag: string, fallback: boolean): boolean => {
      const t = getTextContent(root, tag);
      if (t === 'true') return true;
      if (t === 'false') return false;
      return fallback;
    };
    const tagApurar = getTextContent(root, 'apurarImpostoRenda');
    if (tagApurar === 'true' || tagApurar === 'false') {
      ir_config = {
        apurar_imposto_renda: getBoolRoot('apurarImpostoRenda', true),
        incidir_sobre_juros_de_mora: getBoolRoot('incidirSobreJurosDeMora', false),
        cobrar_do_reclamado: getBoolRoot('cobrarDoReclamado', false),
        considerar_tributacao_exclusiva: getBoolRoot('considerarTributacaoExclusiva', false),
        considerar_tributacao_em_separado: getBoolRoot('considerarTributacaoEmSeparado', false),
        regime_de_caixa: getBoolRoot('regimeDeCaixa', false),
        deduzir_cs_reclamante: getBoolRoot('deduzirContribuicaoSocialDevidaPeloReclamante', true),
        deduzir_previdencia_privada: getBoolRoot('deduzirPrevidenciaPrivada', true),
        deduzir_pensao_alimenticia: getBoolRoot('deduzirPensaoAlimenticia', true),
        deduzir_honorarios_reclamante: getBoolRoot('deduzirHonorariosDevidosPeloReclamante', true),
        aposentado_maior_que_65: getBoolRoot('aposentadoMaiorQue65Anos', false),
        possui_dependentes: getBoolRoot('possuiDependentes', false),
        quantidade_dependentes: parseInt(getTextContent(root, 'quantidadeDependentes')) || 0,
      };
    }
  }

  // --- Pensão, Previdência, Salário-Família, Seguro-Desemprego ---
  const pensaoEl = root.getElementsByTagName('PensaoAlimenticia')[0] || root.getElementsByTagName('pensaoAlimenticia')[0];
  const prevEl = root.getElementsByTagName('PrevidenciaPrivada')[0] || root.getElementsByTagName('previdenciaPrivada')[0];
  const sfEl = root.getElementsByTagName('SalarioFamilia')[0] || root.getElementsByTagName('salarioFamilia')[0];
  const segEl = root.getElementsByTagName('SeguroDesemprego')[0] || root.getElementsByTagName('seguroDesemprego')[0];

  return {
    parametros,
    resultado,
    cs_config,
    ir_config,
    verbas,
    historicos_salariais,
    apuracao_diaria_count,
    apuracao_diaria,
    faltas,
    ferias,
    atualizacao,
    dag,
    apuracao_juros: apuracao_juros.length > 0 ? apuracao_juros : undefined,
    excecoes_carga_horaria: excecoes_carga_horaria.length > 0 ? excecoes_carga_horaria : undefined,
    excecoes_sabado: excecoes_sabado.length > 0 ? excecoes_sabado : undefined,
    fgts_config,
    pensao_alimenticia: pensaoEl ? {
      apurar: getTextContent(pensaoEl, 'apurar') !== 'false',
      percentual: parseNum(getTextContent(pensaoEl, 'percentual')),
      base: getTextContent(pensaoEl, 'base') || undefined,
    } : undefined,
    previdencia_privada: prevEl ? {
      apurar: getTextContent(prevEl, 'apurar') !== 'false',
      percentual: parseNum(getTextContent(prevEl, 'percentualEmpregado') || getTextContent(prevEl, 'percentual')),
    } : undefined,
    salario_familia: sfEl ? {
      apurar: getTextContent(sfEl, 'apurar') !== 'false',
      numero_filhos: parseInt(getTextContent(sfEl, 'numeroFilhos') || getTextContent(sfEl, 'filhos')) || 0,
    } : undefined,
    seguro_desemprego: segEl ? {
      apurar: getTextContent(segEl, 'apurar') !== 'false',
      parcelas: parseInt(getTextContent(segEl, 'parcelas')) || 0,
      recebeu: getTextContent(segEl, 'recebeu') === 'true',
    } : undefined,
    // Múltiplos vínculos (Padrão B)
    vinculos: (() => {
      const vlist: VinculoEmpregaticio[] = [];
      const vinculoEls = root.getElementsByTagName('Vinculo');
      if (vinculoEls.length > 1) {
        for (let idx = 0; idx < vinculoEls.length; idx++) {
          const el = vinculoEls[idx];
          const adm = tsToDate(getTextContent(el, 'dataAdmissao') || getTextContent(el, 'admissao'));
          const dem = tsToDate(getTextContent(el, 'dataDemissao') || getTextContent(el, 'demissao'));
          if (adm && dem) {
            vlist.push({
              id: `vinculo_${idx + 1}`,
              data_admissao: adm,
              data_demissao: dem,
              salario_inicial: parseNum(getTextContent(el, 'salarioInicial')),
              salario_final: parseNum(getTextContent(el, 'salarioFinal')),
              tipo_rescisao: getTextContent(el, 'tipoRescisao') || undefined,
              cargo: getTextContent(el, 'cargo') || undefined,
            });
          }
        }
      }
      // Fallback: single vínculo from main params
      if (vlist.length === 0) {
        vlist.push({
          id: 'vinculo_1',
          data_admissao: parametros.admissao,
          data_demissao: parametros.demissao,
          salario_inicial: 0,
          salario_final: 0,
        });
      }
      return vlist;
    })(),
    tem_multiplos_vinculos: (() => {
      const vinculoEls = root.getElementsByTagName('Vinculo');
      return vinculoEls.length > 1;
    })(),
    // Contrato intermitente (Lei 13.467/2017)
    contrato_intermitente: (() => {
      const tipo = getTextContent(root, 'tipoContrato') || getTextContent(root, 'modalidadeContrato') || getTextContent(root, 'tipoVinculo') || '';
      return tipo.toUpperCase().includes('INTERMITENTE')
        || root.getElementsByTagName('ContratoIntermitente').length > 0
        || root.getElementsByTagName('contratoIntermitente').length > 0
        || root.getElementsByTagName('Convocacao').length > 0;
    })(),
    convocacoes: (() => {
      const convs: ConvocacaoIntermitente[] = [];
      const convEls = root.getElementsByTagName('Convocacao');
      for (const el of Array.from(convEls)) {
        const inicio = tsToDate(getTextContent(el, 'dataInicio') || getTextContent(el, 'dtInicio'));
        const fim = tsToDate(getTextContent(el, 'dataFim') || getTextContent(el, 'dtFim'));
        if (inicio && fim) {
          convs.push({
            data_inicio: inicio,
            data_fim: fim,
            horas_trabalhadas: parseNum(getTextContent(el, 'horasTrabalhadas') || getTextContent(el, 'horas')),
            valor_recebido: parseNum(getTextContent(el, 'valorRecebido') || getTextContent(el, 'valor')),
            competencia: inicio.slice(0, 7),
          });
        }
      }
      return convs.length > 0 ? convs : undefined;
    })(),
    avisos: avisos.length > 0 ? avisos : undefined,
    calculo_config: {
      indices_acumulados: parametros.indices_acumulados || 'MES_SUBSEQUENTE_AO_VENCIMENTO',
      comportamento_reflexo: (() => {
        // Read from first reflexo verba, or default
        const reflexoEl = root.getElementsByTagName('Reflexo')[0];
        if (reflexoEl) {
          const comp = getTextContent(reflexoEl, 'comportamentoDoReflexo');
          if (comp) return comp;
        }
        return 'MEDIA_PELO_VALOR_CORRIGIDO';
      })(),
      gabarito: {
        imposto_renda: resultado.imposto_renda,
        inss_reclamante: resultado.inss_reclamante,
        inss_reclamado: resultado.inss_reclamado,
        valor_principal: resultado.liquido_exequente,
        fgts_deposito: resultado.fgts_deposito,
      },
      nm_rra: (() => {
        const nmEl = root.getElementsByTagName('ImpostoRenda')[0]
          || root.getElementsByTagName('impostoDeRenda')[0];
        if (nmEl) {
          const nm = parseNum(getTextContent(nmEl, 'numeroMeses')
            || getTextContent(nmEl, 'mesesRRA')
            || getTextContent(nmEl, 'quantidadeDeMeses'));
          if (nm > 0) return nm;
        }
        return undefined;
      })(),
    },
  };
}

// =====================================================
// VERBA PARSERS
// =====================================================

function parseVerbaCalculada(el: Element): VerbaAnalysis | null {
  const id = getTextContent(el, 'id');
  const nome = getTextContent(el, 'nome');
  if (!nome) return null;

  const formulaEl = el.getElementsByTagName('FormulaCalculada')[0] || el.getElementsByTagName('formula')[0];

  const base_verbas: { id: string; nome: string; integralizar: string }[] = [];
  if (formulaEl) {
    const baseVerbaEl = formulaEl.getElementsByTagName('BaseVerba')[0];
    if (baseVerbaEl) {
      const items = baseVerbaEl.getElementsByTagName('ItemBaseVerba');
      for (const item of Array.from(items)) {
        const calcRef = item.getElementsByTagName('Calculada')[0] || item.getElementsByTagName('Reflexo')[0];
        if (calcRef) {
          const refId = getTextContent(calcRef, 'id') || getTextContent(calcRef, 'internalRef');
          const refNome = getTextContent(calcRef, 'nome');
          if (refId) {
            base_verbas.push({
              id: refId,
              nome: refNome || `ref:${refId}`,
              integralizar: getTextContent(item, 'integralizar') || 'NAO',
            });
          }
        }
      }
    }
  }

  // Divisor
  const divEl = formulaEl?.getElementsByTagName('Divisor')[0];
  const divisor = {
    tipo: divEl ? (getTextContent(divEl, 'tipo') || 'OUTRO_VALOR') : 'OUTRO_VALOR',
    valor: divEl ? parseNum(getTextContent(divEl, 'outroValor') || getTextContent(divEl, 'valor')) : 1,
  };

  // Multiplicador
  const multEl = formulaEl?.getElementsByTagName('Multiplicador')[0];
  const multiplicador = {
    valor: multEl ? parseNum(getTextContent(multEl, 'outroValor') || getTextContent(multEl, 'valor')) : 1,
  };

  // Quantidade
  const qtdEl = formulaEl?.getElementsByTagName('Quantidade')[0];
  const quantidade = {
    tipo: qtdEl ? (getTextContent(qtdEl, 'tipo') || 'INFORMADA') : 'INFORMADA',
    valor: qtdEl ? parseNum(getTextContent(qtdEl, 'valorInformado')) : 1,
  };

  // Valor Pago
  const pagoEl = formulaEl?.getElementsByTagName('ValorPago')[0];
  const valor_pago = pagoEl ? {
    tipo: getTextContent(pagoEl, 'tipo') || 'INFORMADO',
    valor: parseNum(getTextContent(pagoEl, 'valorInformado')),
  } : undefined;

  // Base tabelada
  const baseTabeladaEl = formulaEl?.getElementsByTagName('BaseTabelada')[0];
  const base_tabelada = baseTabeladaEl ? getTextContent(baseTabeladaEl, 'tipo') : undefined;

  // Ocorrências
  const { ocorrencias, total_devido, total_pago, total_diferenca } = parseOcorrencias(el);

  return {
    id,
    tipo: 'Calculada',
    nome,
    descricao: getTextContent(el, 'descricao'),
    variacao: getTextContent(el, 'tipoVariacaoParcela'),
    caracteristica: getTextContent(el, 'caracteristica'),
    ocorrencia_pagamento: getTextContent(el, 'ocorrenciaDePagamento'),
    periodo_inicio: tsToDate(getTextContent(el, 'periodoInicial')),
    periodo_fim: tsToDate(getTextContent(el, 'periodoFinal')),
    incidencias: {
      inss: getTextContent(el, 'incidenciaINSS') === 'true',
      irpf: getTextContent(el, 'incidenciaIRPF') === 'true',
      fgts: getTextContent(el, 'incidenciaFGTS') === 'true',
    },
    formula: {
      base_tabelada,
      base_verbas,
      divisor,
      multiplicador,
      quantidade,
      dobra: formulaEl ? getTextContent(formulaEl, 'dobra') === 'true' : false,
      valor_pago,
    },
    excluir_falta_justificada: getTextContent(el, 'excluirFaltaJustificada') === 'true',
    excluir_falta_nao_justificada: getTextContent(el, 'excluirFaltaNaoJustificada') === 'true',
    excluir_ferias_gozadas: getTextContent(el, 'excluirFeriasGozadas') === 'true',
    juros_do_ajuizamento: getTextContent(el, 'jurosDoAjuizamento') || 'OCORRENCIAS_VENCIDAS',
    ordem: parseInt(getTextContent(el, 'ordem')) || 0,
    ativo: getTextContent(el, 'ativo') !== 'false',
    gerar_principal: getTextContent(el, 'gerarPrincipal'),
    gerar_reflexo: getTextContent(el, 'gerarReflexo'),
    compor_principal: getTextContent(el, 'comporPrincipal'),
    ocorrencias_count: ocorrencias.length,
    ocorrencias_all: ocorrencias,
    ocorrencias_sample: ocorrencias.slice(0, 5),
    total_devido,
    total_pago,
    total_diferenca,
  };
}

function parseVerbaReflexo(el: Element, verbaMap: Map<string, VerbaAnalysis>): VerbaAnalysis | null {
  const id = getTextContent(el, 'id');
  const nome = getTextContent(el, 'nome');
  if (!nome) return null;

  const formulaEl = el.getElementsByTagName('FormulaReflexo')[0];

  const base_verbas: { id: string; nome: string; integralizar: string }[] = [];
  if (formulaEl) {
    const baseVerbaEl = formulaEl.getElementsByTagName('BaseVerba')[0];
    if (baseVerbaEl) {
      const items = baseVerbaEl.getElementsByTagName('ItemBaseVerba');
      for (const item of Array.from(items)) {
        const calcRef = item.getElementsByTagName('Calculada')[0] || item.getElementsByTagName('Reflexo')[0];
        if (calcRef) {
          const refId = getTextContent(calcRef, 'id') || getTextContent(calcRef, 'internalRef');
          const refNome = getTextContent(calcRef, 'nome') || verbaMap.get(refId)?.nome || `ref:${refId}`;
          base_verbas.push({
            id: refId,
            nome: refNome,
            integralizar: getTextContent(item, 'integralizar') || 'NAO',
          });
        }
      }
    }
  }

  // Divisor & Multiplicador from FormulaReflexo
  const divEl = formulaEl?.getElementsByTagName('Divisor')[0];
  const multEl = formulaEl?.getElementsByTagName('Multiplicador')[0];
  const qtdEl = formulaEl?.getElementsByTagName('Quantidade')[0];
  const pagoEl = formulaEl?.getElementsByTagName('ValorPago')[0];

  const { ocorrencias, total_devido, total_pago, total_diferenca } = parseOcorrencias(el);

  return {
    id,
    tipo: 'Reflexo',
    nome,
    descricao: getTextContent(el, 'descricao'),
    variacao: getTextContent(el, 'tipoVariacaoParcela'),
    caracteristica: getTextContent(el, 'caracteristica'),
    ocorrencia_pagamento: getTextContent(el, 'ocorrenciaDePagamento'),
    periodo_inicio: tsToDate(getTextContent(el, 'periodoInicial')),
    periodo_fim: tsToDate(getTextContent(el, 'periodoFinal')),
    incidencias: {
      inss: getTextContent(el, 'incidenciaINSS') === 'true',
      irpf: getTextContent(el, 'incidenciaIRPF') === 'true',
      fgts: getTextContent(el, 'incidenciaFGTS') === 'true',
    },
    formula: {
      base_verbas,
      divisor: {
        tipo: divEl ? getTextContent(divEl, 'tipo') : 'OUTRO_VALOR',
        valor: divEl ? parseNum(getTextContent(divEl, 'outroValor')) : 1,
      },
      multiplicador: {
        valor: multEl ? parseNum(getTextContent(multEl, 'outroValor')) : 1,
      },
      quantidade: {
        tipo: qtdEl ? getTextContent(qtdEl, 'tipo') : 'INFORMADA',
        valor: qtdEl ? parseNum(getTextContent(qtdEl, 'valorInformado')) : 1,
      },
      dobra: formulaEl ? getTextContent(formulaEl, 'dobra') === 'true' : false,
      valor_pago: pagoEl ? {
        tipo: getTextContent(pagoEl, 'tipo'),
        valor: parseNum(getTextContent(pagoEl, 'valorInformado')),
      } : undefined,
    },
    comportamento_reflexo: getTextContent(el, 'comportamentoDoReflexo'),
    periodo_media: getTextContent(el, 'periodoMediaReflexo'),
    tratamento_fracao: getTextContent(el, 'tratamentoDaFracaoDeMesDoReflexo'),
    excluir_falta_justificada: getTextContent(el, 'excluirFaltaJustificada') === 'true',
    excluir_falta_nao_justificada: getTextContent(el, 'excluirFaltaNaoJustificada') === 'true',
    excluir_ferias_gozadas: getTextContent(el, 'excluirFeriasGozadas') === 'true',
    juros_do_ajuizamento: getTextContent(el, 'jurosDoAjuizamento') || 'OCORRENCIAS_VENCIDAS',
    ordem: parseInt(getTextContent(el, 'ordem')) || 0,
    ativo: getTextContent(el, 'ativo') !== 'false',
    gerar_principal: getTextContent(el, 'gerarPrincipal'),
    gerar_reflexo: getTextContent(el, 'gerarReflexo'),
    compor_principal: getTextContent(el, 'comporPrincipal'),
    ocorrencias_count: ocorrencias.length,
    ocorrencias_all: ocorrencias,
    ocorrencias_sample: ocorrencias.slice(0, 5),
    total_devido,
    total_pago,
    total_diferenca,
  };
}

function parseOcorrencias(verbaEl: Element): {
  ocorrencias: OcorrenciaAnalysis[];
  total_devido: number;
  total_pago: number;
  total_diferenca: number;
} {
  const ocorrencias: OcorrenciaAnalysis[] = [];
  let total_devido = 0;
  let total_pago = 0;

  // Get direct child <ocorrencias> first
  const ocListEl = verbaEl.getElementsByTagName('ocorrencias')[0];
  if (!ocListEl) return { ocorrencias, total_devido: 0, total_pago: 0, total_diferenca: 0 };

  // First pass: collect indiceAcumulado from version-0 (original) occurrences by competencia.
  // PJe-Calc stores indiceAcumulado on originals, not on calculated (versao>0) occurrences.
  const indiceByComp = new Map<string, number>();
  const ocEls = ocListEl.getElementsByTagName('OcorrenciaDeVerba');
  for (const oc of Array.from(ocEls)) {
    const versao = parseInt(getTextContent(oc, 'versao')) || 0;
    if (versao !== 0) continue;
    const idx = parseNum(getTextContent(oc, 'indiceAcumulado'));
    if (idx > 0) {
      const comp = tsToDate(getTextContent(oc, 'dataInicial'));
      if (comp) indiceByComp.set(comp.slice(0, 7), idx);
    }
  }

  // Second pass: extract calculated occurrences (versao > 0)
  for (const oc of Array.from(ocEls)) {
    // Skip "original" sub-occurrences
    if (oc.parentElement?.tagName === 'ocorrenciaOriginal') continue;
    // Only top-level (versao > 0 usually means calculated)
    const versao = parseInt(getTextContent(oc, 'versao')) || 0;
    if (versao === 0) continue; // originals

    const devido = parseNum(getTextContent(oc, 'devido'));
    const pago = parseNum(getTextContent(oc, 'pago'));
    total_devido += devido;
    total_pago += pago;

    const comp = tsToDate(getTextContent(oc, 'dataInicial'));
    // Use indiceAcumulado from calculated occurrence if present, otherwise
    // fall back to the original occurrence for the same competencia
    const indiceCalc = parseNum(getTextContent(oc, 'indiceAcumulado'));
    const indiceFallback = indiceByComp.get(comp?.slice(0, 7) || '');
    const indiceAcumulado = indiceCalc > 0 ? indiceCalc : (indiceFallback || undefined);

    ocorrencias.push({
      competencia: comp,
      base: parseNum(getTextContent(oc, 'base')),
      base_integral: parseNum(getTextContent(oc, 'baseIntegral')) || undefined,
      divisor: parseNum(getTextContent(oc, 'divisor')),
      multiplicador: parseNum(getTextContent(oc, 'multiplicador')),
      quantidade: parseNum(getTextContent(oc, 'quantidade')),
      quantidade_integral: parseNum(getTextContent(oc, 'quantidadeIntegral')) || undefined,
      dobra: getTextContent(oc, 'dobra') === 'true',
      devido,
      devido_integral: parseNum(getTextContent(oc, 'devidoIntegral')) || undefined,
      pago,
      pago_integral: parseNum(getTextContent(oc, 'pagoIntegral')) || undefined,
      indice_acumulado: indiceAcumulado,
      caracteristica: getTextContent(oc, 'caracteristica'),
    });
  }

  return {
    ocorrencias,
    total_devido,
    total_pago,
    total_diferenca: total_devido - total_pago,
  };
}

// =====================================================
// XML HELPERS (direct child text only)
// =====================================================

function getTextContent(parent: Element | undefined | null, tagName: string): string {
  if (!parent) return '';
  // Get first matching element
  const els = parent.getElementsByTagName(tagName);
  if (els.length === 0) return '';
  return els[0].textContent?.trim() || '';
}

function extractReclamado(root: Element): string {
  const recEl = root.getElementsByTagName('Reclamado')[0];
  return recEl ? getTextContent(recEl, 'nome') : '';
}

function extractReclamadoCNPJ(root: Element): string {
  const recEl = root.getElementsByTagName('Reclamado')[0];
  return recEl ? getTextContent(recEl, 'numeroDocumentoFiscal') : '';
}
