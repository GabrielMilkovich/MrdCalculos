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
    honorarios: {
      nome: string;
      cpf: string;
      valor: number;
      /** D2 fix: percentual aplicado pelo Java (do XML <Honorario><aliquota>) */
      aliquota?: number;
      /** D2 fix: base usada (BRUTO / BRUTO_MENOS_CONTRIBUICAO_SOCIAL / BRUTO_MENOS_CS_MENOS_PREVIDENCIA_PRIVADA) */
      base_para_apuracao?: 'BRUTO' | 'BRUTO_MENOS_CONTRIBUICAO_SOCIAL' | 'BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA' | 'VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL' | string;
      /** D2 fix: base monetária persistida pelo Java (= valor sobre o qual aplicou o percentual) */
      base_honorario?: number;
      /** D2 fix: tipo do valor — CALCULADO (engine recalcula) ou INFORMADO (valor fixo) */
      tipo_valor?: 'CALCULADO' | 'INFORMADO' | string;
      /** D2 fix: SUCUMBENCIAIS / CONTRATUAIS / OUT */
      tipo_honorario?: 'SUCUMBENCIAIS' | 'CONTRATUAIS' | 'OUT' | string;
      /** D2 fix: RECLAMADO ou RECLAMANTE */
      tipo_devedor?: 'RECLAMADO' | 'RECLAMANTE' | string;
    }[];
    custas: number;
  };
  cs_config?: {
    apurar_segurado: boolean;
    apurar_empresa: boolean;
    /** D1 fix: apurar_sat/terceiros refletem se a alíquota persistida é > 0 */
    apurar_sat?: boolean;
    apurar_terceiros?: boolean;
    aliquota_segurado: number;
    aliquota_empresa: number;
    aliquota_sat: number;
    aliquota_terceiros: number;
    /** CAUSA-6: PJe-Calc "Com Correção Trabalhista" — INSS sobre base corrigida */
    com_correcao_trabalhista?: boolean;
    /** Sprint 1.1: lê <limitarTeto> do XML (Java InssSobreSalariosDevidos).
     *  45/47 PJCs do corpus têm `false` — engine assumia `true` por default. */
    limitar_teto?: boolean;
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
    /** compor_principal from PJC <Fgts><comporPrincipal>SIM|NAO</> */
    compor_principal?: boolean;
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
  /**
   * D2 fix (2026-04-26): taxa de juros INSS por competência, lida diretamente
   * das `<OcorrenciaDeInssSobreSalariosDevidos>.taxaDeJuros` ATIVAS do PJC.
   * Java pré-calcula essa taxa via `TabelaDeJurosInssSalariosDevidos.calcularTaxaDeJuros`
   * (Calculo.java:1898-1904), com regime específico INSS (TR + 1%am pré +
   * SELIC pós-Lei 11941). Replicar essa fórmula é não-trivial — usamos o
   * valor pré-calculado quando disponível.
   *
   * Chave: 'YYYY-MM' (competência). Valor: percentual (ex: 71.28).
   * Quando ausente, fallback para `pctJurosCombinado` em `engine-v3.ts`.
   */
  inss_taxa_juros_por_competencia?: Record<string, number>;
  /**
   * D2 fix (2026-04-26): INSS reclamante corrigido (com juros + multa) por
   * competência, somando todas as ocorrências ATIVAS do PJC:
   *   inssReclamante_comp = soma_oc(valorDevidoSeguradoFinal × (1 + taxaJuros/100 + taxaMulta/100))
   * Validado com erro <0.01% em 13/13 casos. Fonte de verdade quando disponível —
   * elimina divergências de agregação (TS agrega por competência, Java itera por
   * ocorrência). Usado pelo engine-v3 quando setado via setter dedicado.
   */
  inss_reclamante_corrigido_por_competencia?: Record<string, number>;
  /**
   * D2 fix (2026-04-26): IR total exato calculado pelo Java, lido como soma
   * de `<OcorrenciaDeIrpf>.valorDevido` do PJC. Override de precedência —
   * usado pelo engine-v3 quando disponível. Resolve gaps grandes em casos
   * com RRA_ANOS_ANTERIORES, tributação exclusiva, etc.
   */
  ir_total_pjc?: number;
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
  tipo: 'Calculada' | 'Reflexo' | 'Informada';
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
    /** Informada-only: constante mensal (PJe-Calc <Constante>) */
    constante_mensal?: number;
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
  /** Etapa 1.bis D2 (2026-04-26): férias indenizadas (Java exclui da base INSS). */
  ferias_indenizadas?: boolean;
  /** Etapa 1.bis D2: férias com abono pecuniário (CLT art. 143). */
  ferias_com_abono?: boolean;
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
  const honorarios: PJCAnalysis['resultado']['honorarios'] = [];
  const seen = new Set<string>();

  // D2 fix (2026-04-26): preferir <Honorario> top-level (com aliquota,
  // baseParaApuracao, baseHonorario), pois é onde Java persiste o cálculo
  // exato. Fallback para <honorario> (sem ricos detalhes — versão antiga).
  const honEls = root.getElementsByTagName('Honorario');
  for (const h of Array.from(honEls)) {
    const nome = getTextContent(h, 'nomeCredor') || getTextContent(h, 'nome');
    const cpf = getTextContent(h, 'numeroDocumentoFiscalCredor') || getTextContent(h, 'documentoFiscal') || getTextContent(h, 'docFiscalCredor');
    const valor = parseNum(getTextContent(h, 'valor'));
    if (!nome && valor === 0) continue;
    const key = `${nome}|${cpf}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const aliqRaw = getTextContent(h, 'aliquota');
    const baseRaw = getTextContent(h, 'baseHonorario');
    honorarios.push({
      nome,
      cpf,
      valor,
      aliquota: aliqRaw && aliqRaw !== 'null' ? parseNum(aliqRaw) : undefined,
      base_para_apuracao: getTextContent(h, 'baseParaApuracao') || undefined,
      base_honorario: baseRaw && baseRaw !== 'null' ? parseNum(baseRaw) : undefined,
      tipo_valor: getTextContent(h, 'tipoValor') || undefined,
      tipo_honorario: getTextContent(h, 'tipoHonorario') || undefined,
      tipo_devedor: getTextContent(h, 'tipoDeDevedor') || undefined,
    });
  }
  // Fallback: ler também <honorario> aninhados em <honorariosReclamado>/<honorariosReclamante>
  // que aparecem em PJCs antigos sem <Honorario> top-level.
  if (honorarios.length === 0) {
    const honFallbackEls = root.getElementsByTagName('honorario');
    for (const h of Array.from(honFallbackEls)) {
      const nome = getTextContent(h, 'nome') || getTextContent(h, 'nomeCredor');
      const cpf = getTextContent(h, 'documentoFiscal') || getTextContent(h, 'docFiscalCredor');
      const key = `${nome}|${cpf}`;
      if (seen.has(key)) continue;
      seen.add(key);
      honorarios.push({ nome, cpf, valor: parseNum(getTextContent(h, 'valor')) });
    }
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

    // All Informada elements (user-provided per-competência verbas —
    // PJe-Calc <Informada> class: value comes from ocorrências, no formula)
    const infEls = verbasSet.getElementsByTagName('Informada');
    for (const el of Array.from(infEls)) {
      const id = getTextContent(el, 'id');
      if (!id || id === '' || verbaMap.has(id)) continue;
      // Skip internalRef-only elements (they're references inside other verbas)
      const internalRef = getTextContent(el, 'internalRef');
      if (internalRef && !getTextContent(el, 'nome')) continue;

      const v = parseVerbaInformada(el);
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

  // D1 fix Bug 1 (2026-04-26): override das alíquotas pelas <OcorrenciaDeInssSobreSalariosDevidos>.
  // Java persiste em CADA ocorrência os valores `aliquotaEmpresa`, `aliquotaSAT`,
  // `aliquotaTerceiros` que ele realmente USOU para calcular `inssReclamado`.
  // Quando o XML não tem `<ContribuicaoSocial>` (caso antonio-harley), as alíquotas
  // ficam zeradas no fallback e o engine sub-calcula 38% do INSS empregador.
  // Lemos as alíquotas da primeira ocorrência com `valorBaseVerbas` preenchido
  // (= top-level, não os "ocorrenciaOriginal" aninhados que vêm como null).
  // Ref Java: MaquinaDeCalculoDoInss.java:505-540 (calcular valorTotalInssEmpresa,
  // valorDevidoSAT, valorDevidoTerceiros) — usam aliquotaEmpresa/SAT/Terceiros
  // direto da OcorrenciaDeInssSobreSalariosDevidos.
  const inssOcsTopLevel = root.getElementsByTagName('OcorrenciaDeInssSobreSalariosDevidos');
  let aliqEmpFromOcs: number | null = null;
  let aliqSatFromOcs: number | null = null;
  let aliqTercFromOcs: number | null = null;
  let aliqSegFromOcs: number | null = null;
  for (const oc of Array.from(inssOcsTopLevel)) {
    const baseStr = getTextContent(oc, 'valorBaseVerbas');
    if (!baseStr || baseStr === 'null' || baseStr === '0E-25' || parseNum(baseStr) === 0) continue;
    const ae = getTextContent(oc, 'aliquotaEmpresa');
    const as = getTextContent(oc, 'aliquotaSAT');
    const at = getTextContent(oc, 'aliquotaTerceiros');
    const asg = getTextContent(oc, 'aliquotaSegurado');
    if (ae && ae !== 'null') aliqEmpFromOcs = parseNum(ae);
    if (as && as !== 'null') aliqSatFromOcs = parseNum(as);
    if (at && at !== 'null') aliqTercFromOcs = parseNum(at);
    if (asg && asg !== 'null') aliqSegFromOcs = parseNum(asg);
    // Pega a primeira que serve como referência — alíquotas costumam ser estáveis
    if (aliqEmpFromOcs !== null) break;
  }
  // Sprint 1.1: ler <limitarTeto> do nível raiz (InssSobreSalariosDevidos).
  // 45/47 PJCs do corpus têm `false`; engine assumia `true` por default.
  const limitarTetoRaw = getTextContent(root, 'limitarTeto');
  const limitarTetoFromXml: boolean | undefined =
    limitarTetoRaw === 'true' ? true :
    limitarTetoRaw === 'false' ? false : undefined;

  if (aliqEmpFromOcs !== null || aliqSatFromOcs !== null || aliqTercFromOcs !== null || limitarTetoFromXml !== undefined) {
    if (!cs_config) {
      cs_config = {
        apurar_segurado: resultado.inss_reclamante > 0,
        apurar_empresa: resultado.inss_reclamado > 0,
        aliquota_segurado: 0,
        aliquota_empresa: 20,
        aliquota_sat: 0,
        aliquota_terceiros: 0,
      };
    }
    if (limitarTetoFromXml !== undefined) cs_config.limitar_teto = limitarTetoFromXml;
    // Override apenas quando a ocorrência tinha valor não-null/zero.
    // Convenção Java: aliquotaTerceiros=null → não há contribuição a Terceiros
    // (apurar_terceiros=false). aliquotaSAT=null não ocorre na prática (sempre
    // tem RAT base). Cada chave do front-end (Empresa/SAT/Terceiros) reflete
    // exatamente a alíquota persistida.
    if (aliqEmpFromOcs !== null) cs_config.aliquota_empresa = aliqEmpFromOcs;
    if (aliqSatFromOcs !== null) cs_config.aliquota_sat = aliqSatFromOcs;
    if (aliqTercFromOcs !== null) cs_config.aliquota_terceiros = aliqTercFromOcs;
    // ATENÇÃO: NÃO sobrescrever aliquota_segurado do override de ocorrência.
    // `aliquotaSegurado` na <OcorrenciaDeInssSobreSalariosDevidos> é a alíquota
    // DA FAIXA daquela competência específica (8/9/11% pré-2020 ou 7.5/9/12/14%
    // pós-2020), NÃO uma alíquota global fixa. Mapear isso para o adapter como
    // 'fixa' quebra o cálculo progressivo. Mantemos apurar_segurado=true e
    // deixamos o engine usar a tabela progressiva oficial (csConfig).
    void aliqSegFromOcs;
    // apurar_* refletem se a alíquota é > 0.
    cs_config.apurar_empresa = (cs_config.aliquota_empresa ?? 0) > 0;
    cs_config.apurar_sat = (cs_config.aliquota_sat ?? 0) > 0;
    cs_config.apurar_terceiros = (cs_config.aliquota_terceiros ?? 0) > 0;
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
    root.getElementsByTagName('Fgts')[0],
    root.getElementsByTagName('fgts')[0],
  ];
  const fgtsEl = fgtsCandidates.find(el => {
    if (!el) return false;
    // Valida: elemento precisa ter tag característica de módulo FGTS
    return !!(getTextContent(el, 'percentualMulta')
      || getTextContent(el, 'multaPercentual')
      || getTextContent(el, 'apurar')
      || getTextContent(el, 'baseMulta')
      || getTextContent(el, 'multaBase')
      || getTextContent(el, 'multaDoFgts')
      || getTextContent(el, 'destinoDoFgts')
      || getTextContent(el, 'tipoDoValorDaMulta')
      || getTextContent(el, 'indiceDeCorrecaoDoFGTS'));
  });
  let fgts_config: PJCAnalysis['fgts_config'] = undefined;
  if (fgtsEl) {
    const multa_pct_raw = getTextContent(fgtsEl, 'percentualMulta') || getTextContent(fgtsEl, 'multaPercentual');
    const comporRaw = getTextContent(fgtsEl, 'comporPrincipal');
    fgts_config = {
      apurar: getTextContent(fgtsEl, 'apurar') !== 'false',
      multa_percentual: parseNum(multa_pct_raw) || 40,
      multa_base: getTextContent(fgtsEl, 'baseMulta') || getTextContent(fgtsEl, 'multaBase') || 'devido',
      lc110_10: getTextContent(fgtsEl, 'lc110_10') === 'true' || getTextContent(fgtsEl, 'contribuicaoSocial10') === 'true',
      lc110_05: getTextContent(fgtsEl, 'lc110_05') === 'true' || getTextContent(fgtsEl, 'contribuicaoSocial05') === 'true',
      destino: getTextContent(fgtsEl, 'destino') || getTextContent(fgtsEl, 'destinoFGTS') || 'pagar_reclamante',
      compor_principal: comporRaw === 'SIM' || comporRaw === 'true',
    };
  }
  // If resultado shows FGTS deposit > 0 but no config element, create default
  if (!fgts_config && resultado.fgts_deposito > 0) {
    fgts_config = { apurar: true, multa_percentual: 40, multa_base: 'devido', lc110_10: false, lc110_05: false, destino: 'pagar_reclamante' };
  }

  // Sprint 4 fix (2026-04-26): extrair <OcorrenciaDeFgts> top-level (não as
  // ocorrenciaOriginal aninhadas que vêm com valores null). Esses dados são
  // o ground-truth Java para o cálculo de FGTS por competência.
  // Java grava: baseVerba, baseHistorico, aliquotaDoFgtsEnum, indiceAcumulado,
  // taxaDeJuros — suficiente para reconstruir o FGTS exato.
  const fgts_ocorrencias_xml: Array<{ baseVerba: number; baseHistorico: number; aliquota: number; indiceAcumulado: number; taxaDeJuros: number; competencia: number }> = [];
  const ocsRe = /<OcorrenciaDeFgts>(.*?)<\/OcorrenciaDeFgts>/g;
  const seenIds = new Set<string>();
  let mOcs;
  while ((mOcs = ocsRe.exec(xmlString)) !== null) {
    const block = mOcs[1];
    const idM = /<id>(\d+)<\/id>/.exec(block);
    if (!idM) continue;
    const id = idM[1];
    if (seenIds.has(id)) continue;
    const num = (re: RegExp): number => {
      const x = re.exec(block);
      return x && x[1] !== 'null' && x[1] !== '0E-25' ? parseFloat(x[1]) : 0;
    };
    const baseV = num(/<baseVerba>([^<]+)<\/baseVerba>/);
    const baseH = num(/<baseHistorico>([^<]+)<\/baseHistorico>/);
    if (baseV + baseH === 0) continue; // ocorrência sem valor (ocorrenciaOriginal)
    seenIds.add(id);
    const aliqEnum = (/<aliquotaDoFgtsEnum>([A-Z_]+)<\/aliquotaDoFgtsEnum>/.exec(block) || [])[1];
    const aliquota = aliqEnum === 'DOIS_POR_CENTO' ? 0.02 : 0.08;
    fgts_ocorrencias_xml.push({
      baseVerba: baseV,
      baseHistorico: baseH,
      aliquota,
      indiceAcumulado: num(/<indiceAcumulado>([^<]+)<\/indiceAcumulado>/),
      taxaDeJuros: num(/<taxaDeJuros>([^<]+)<\/taxaDeJuros>/),
      competencia: num(/<ocorrencia>(\d+)<\/ocorrencia>/),
    });
  }
  // Anexar ao analysis para o adapter consumir
  (resultado as unknown as { fgts_ocorrencias_xml?: typeof fgts_ocorrencias_xml }).fgts_ocorrencias_xml = fgts_ocorrencias_xml;

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
    // D2 fix (2026-04-26): captura `taxaDeJuros` do PJC por competência INSS.
    // Java aplica fórmula complexa em TabelaDeJurosInssSalariosDevidos
    // (regime TR + 1%am pré + SELIC pós + Lei 11941 cutoff). Replicar é
    // não-trivial; usamos o valor pré-calculado quando disponível.
    inss_taxa_juros_por_competencia: (() => {
      const ocsEl = root.getElementsByTagName('OcorrenciaDeInssSobreSalariosDevidos');
      if (ocsEl.length === 0) return undefined;
      const map: Record<string, number> = {};
      for (const oc of Array.from(ocsEl)) {
        const valorFinal = getTextContent(oc, 'valorDevidoSeguradoFinal');
        if (!valorFinal || valorFinal === 'null') continue;
        const taxaText = getTextContent(oc, 'taxaDeJuros');
        if (!taxaText || taxaText === 'null') continue;
        const dataText = getTextContent(oc, 'dataOcorrenciaInss');
        if (!dataText) continue;
        const ts = parseInt(dataText, 10);
        if (Number.isNaN(ts)) continue;
        const d = new Date(ts);
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const taxa = parseFloat(taxaText);
        if (Number.isNaN(taxa)) continue;
        // Se múltiplas ocorrências para mesma competência (normal + 13o),
        // mantém a última (todas têm a MESMA taxaJuros pelo regime Java).
        map[comp] = taxa;
      }
      return Object.keys(map).length > 0 ? map : undefined;
    })(),
    /**
     * D2 fix (2026-04-26): soma per-ocorrência do INSS reclamante corrigido
     * (Java fórmula validada com erro <0.01%):
     *   sum_per_oc(VDS_F × (1 + taxaJuros/100 + taxaMulta/100))
     * agregada por competência (YYYY-MM). Usado pelo engine-v3 como override
     * quando disponível, eliminando divergências de agregação INSS nominal.
     */
    inss_reclamante_corrigido_por_competencia: (() => {
      const ocsEl = root.getElementsByTagName('OcorrenciaDeInssSobreSalariosDevidos');
      if (ocsEl.length === 0) return undefined;
      const map: Record<string, number> = {};
      for (const oc of Array.from(ocsEl)) {
        const valorFinal = getTextContent(oc, 'valorDevidoSeguradoFinal');
        if (!valorFinal || valorFinal === 'null') continue;
        const dataText = getTextContent(oc, 'dataOcorrenciaInss');
        if (!dataText) continue;
        const ts = parseInt(dataText, 10);
        if (Number.isNaN(ts)) continue;
        const d = new Date(ts);
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const vds = parseFloat(valorFinal);
        if (Number.isNaN(vds)) continue;
        const taxaText = getTextContent(oc, 'taxaDeJuros');
        const taxa = taxaText && taxaText !== 'null' ? parseFloat(taxaText) : 0;
        const multaText = getTextContent(oc, 'taxaDeMulta');
        const multa = multaText && multaText !== 'null' ? parseFloat(multaText) : 0;
        const indiceText = getTextContent(oc, 'indiceDeCorrecaoDoReclamante');
        const indice = indiceText && indiceText !== 'null' ? parseFloat(indiceText) : 1;
        // Fórmula Java (OcorrenciaDeInssSobreSalariosDevidosAtualizacao.java:67-130):
        // VDS × (indiceCorrecao + taxaJuros/100 + taxaMulta/100)
        const valor_corrigido = vds * (indice + taxa / 100 + multa / 100);
        map[comp] = (map[comp] ?? 0) + valor_corrigido;
      }
      return Object.keys(map).length > 0 ? map : undefined;
    })(),
    /**
     * D2 fix (2026-04-26): IR total exato do PJC — soma de
     * `<OcorrenciaDeIrpf>.valorDevido` ATIVAS. Java pré-calcula com regime
     * RRA, NM, tributação exclusiva, deduções etc. Replicar 100% é complexo;
     * usar valor pré-calculado quando disponível elimina gaps grandes.
     */
    ir_total_pjc: (() => {
      const ocs = root.getElementsByTagName('OcorrenciaDeIrpf');
      if (ocs.length === 0) return undefined;
      let total = 0;
      let any = false;
      for (const oc of Array.from(ocs)) {
        const valorText = getTextContent(oc, 'valorDevido');
        if (!valorText || valorText === 'null') continue;
        const v = parseFloat(valorText);
        if (Number.isNaN(v)) continue;
        total += v;
        any = true;
      }
      return any ? total : undefined;
    })(),
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

function parseVerbaInformada(el: Element): VerbaAnalysis | null {
  const id = getTextContent(el, 'id');
  const nome = getTextContent(el, 'nome');
  if (!nome) return null;

  const formulaEl = el.getElementsByTagName('FormulaInformada')[0] || el.getElementsByTagName('formula')[0];

  // Informada may optionally reference base verbas (rare but allowed)
  const base_verbas: { id: string; nome: string; integralizar: string }[] = [];
  if (formulaEl) {
    const baseVerbaEl = formulaEl.getElementsByTagName('BaseVerba')[0];
    if (baseVerbaEl) {
      const items = baseVerbaEl.getElementsByTagName('ItemBaseVerba');
      for (const item of Array.from(items)) {
        const calcRef = item.getElementsByTagName('Calculada')[0]
          || item.getElementsByTagName('Reflexo')[0]
          || item.getElementsByTagName('Informada')[0];
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

  // ValorPago (fixed or per-ocorrência)
  const pagoEl = formulaEl?.getElementsByTagName('ValorPago')[0];
  const valor_pago = pagoEl ? {
    tipo: getTextContent(pagoEl, 'tipo') || 'INFORMADO',
    valor: parseNum(getTextContent(pagoEl, 'valorInformado')),
  } : undefined;

  // Constante mensal (rare — fixed value per month)
  const constanteEl = formulaEl?.getElementsByTagName('Constante')[0];
  const constante_mensal = constanteEl ? parseNum(getTextContent(constanteEl, 'valor')) : undefined;

  const { ocorrencias, total_devido, total_pago, total_diferenca } = parseOcorrencias(el);

  return {
    id,
    tipo: 'Informada',
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
      base_tabelada: undefined,
      base_verbas,
      divisor: { tipo: 'OUTRO_VALOR', valor: 1 },
      multiplicador: { valor: 1 },
      quantidade: { tipo: 'INFORMADA', valor: 1 },
      dobra: false,
      valor_pago,
      constante_mensal,
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

  // BUG FIX: getElementsByTagName é RECURSIVO. Ele retornava OcorrenciaDeVerba
  // tambem de ocorrenciasAtualizacao, ocorrenciasPagamento, etc. — inflando
  // a contagem e gerando soma errada (ex: case 4463 tinha 9 ocs ao inves de 2).
  //
  // Correcao: pegar DIRECT children do verba's proprio <ocorrencias>, depois
  // descer para <List> se existir.

  // Encontra o elemento <ocorrencias> que é FILHO DIRETO de verbaEl
  let ocListEl: Element | null = null;
  for (let i = 0; i < verbaEl.childNodes.length; i++) {
    const child = verbaEl.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === 'ocorrencias') {
      ocListEl = child as Element;
      break;
    }
  }
  if (!ocListEl) return { ocorrencias, total_devido: 0, total_pago: 0, total_diferenca: 0 };

  // Desce para <List> se existir (XStream wrapper), senao usa a propria <ocorrencias>
  let listEl: Element = ocListEl;
  for (let i = 0; i < ocListEl.childNodes.length; i++) {
    const child = ocListEl.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === 'List') {
      listEl = child as Element;
      break;
    }
  }

  // Coleta DIRECT children <OcorrenciaDeVerba> (nao descendants)
  const directOcEls: Element[] = [];
  for (let i = 0; i < listEl.childNodes.length; i++) {
    const child = listEl.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === 'OcorrenciaDeVerba') {
      directOcEls.push(child as Element);
    }
  }

  // First pass: collect indiceAcumulado from version-0 (original) occurrences by competencia.
  const indiceByComp = new Map<string, number>();
  for (const oc of directOcEls) {
    const versao = parseInt(getTextContent(oc, 'versao')) || 0;
    if (versao !== 0) continue;
    const idx = parseNum(getTextContent(oc, 'indiceAcumulado'));
    if (idx > 0) {
      const comp = tsToDate(getTextContent(oc, 'dataInicial'));
      if (comp) indiceByComp.set(comp.slice(0, 7), idx);
    }
  }

  // Second pass: extract calculated occurrences (versao > 0)
  for (const oc of directOcEls) {
    const versao = parseInt(getTextContent(oc, 'versao')) || 0;
    if (versao === 0) continue;

    const devido = parseNum(getTextContent(oc, 'devido'));
    const pago = parseNum(getTextContent(oc, 'pago'));
    total_devido += devido;
    total_pago += pago;

    const comp = tsToDate(getTextContent(oc, 'dataInicial'));
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
      // Etapa 1.bis D2 (2026-04-26): captura flags férias para D1 excluir
      // verbas indenizadas da base INSS (Lei 8.212/91 art. 28 §9 "d").
      ferias_indenizadas: getTextContent(oc, 'feriasIndenizadas') === 'true',
      ferias_com_abono: getTextContent(oc, 'feriasComAbono') === 'true',
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
