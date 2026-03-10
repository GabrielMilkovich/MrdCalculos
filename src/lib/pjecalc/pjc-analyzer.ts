/**
 * PJC Real Case Analyzer
 * Extracts complete calculation structure from a real PJe-Calc .PJC file
 */

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
  };
  resultado: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    fgts_deposito: number;
    honorarios: { nome: string; cpf: string; valor: number }[];
    custas: number;
  };
  verbas: VerbaAnalysis[];
  historicos_salariais: HistoricoAnalysis[];
  apuracao_diaria_count: number;
  faltas: FaltaAnalysis[];
  ferias: FeriasAnalysis[];
  atualizacao: AtualizacaoAnalysis;
  dag: { id: string; nome: string; depende_de: string[]; dependentes: string[] }[];
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
  ocorrencias_count: number;
  competencias: { comp: string; valor: number }[];
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
  combinacoes_indice: { a_partir_de: string; indice: string }[];
  combinacoes_juros: { a_partir_de: string; tipo: string; taxa?: number }[];
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
  const parser = new DOMParser();
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
  };

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

  const resultado = {
    liquido_exequente: parseNum(getTextContent(gprec, 'liquidoExequente')),
    inss_reclamante: parseNum(getTextContent(dados, 'inssReclamante')),
    inss_reclamado: parseNum(getTextContent(dados, 'inssReclamado')),
    imposto_renda: parseNum(getTextContent(dados, 'impostoRenda')),
    fgts_deposito: parseNum(getTextContent(dados, 'fgtsDepositoContaVinculada')),
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
    const comps: { comp: string; valor: number }[] = [];
    for (const oc of Array.from(ocEls)) {
      comps.push({
        comp: tsToDate(getTextContent(oc, 'dataInicial')).slice(0, 7),
        valor: parseNum(getTextContent(oc, 'valor')),
      });
    }
    historicos_salariais.push({
      nome,
      tipo_variacao: getTextContent(el, 'tipoVariacaoParcela'),
      incide_inss: getTextContent(el, 'incidenciaINSS') === 'true',
      incide_fgts: getTextContent(el, 'incidenciaFGTS') === 'true',
      ocorrencias_count: comps.length,
      competencias: comps,
    });
  }

  // --- Apuração Diária ---
  const apuracaoEls = root.getElementsByTagName('ApuracaoDiariaCartao');
  const apuracao_diaria_count = apuracaoEls.length;

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
    // Skip nested refs
    if (!getTextContent(el, 'situacao') && !getTextContent(el, 'prazoPeriodoConcessivoEmDias')) continue;
    ferias.push({
      aquisitivo_inicio: tsToDate(getTextContent(el, 'dataInicialPeriodoAquisitivo')),
      aquisitivo_fim: tsToDate(getTextContent(el, 'dataFinalPeriodoAquisitivo')),
      concessivo_inicio: tsToDate(getTextContent(el, 'dataInicialPeriodoConcessivo')),
      concessivo_fim: tsToDate(getTextContent(el, 'dataFinalPeriodoConcessivo')),
      dias: parseInt(getTextContent(el, 'prazoPeriodoConcessivoEmDias')) || 30,
      abono: getTextContent(el, 'abono') === 'true',
      dias_abono: parseInt(getTextContent(el, 'diasAbono')) || 0,
      dobra: getTextContent(el, 'dobra') === 'true',
      situacao: getTextContent(el, 'situacao') || 'GOZADAS',
      gozo_inicio: tsToDate(getTextContent(el, 'dataInicialGozo')),
      gozo_fim: tsToDate(getTextContent(el, 'dataFinalGozo')),
    });
  }

  // --- Atualização ---
  const atualizacao: AtualizacaoAnalysis = {
    combinacoes_indice: [],
    combinacoes_juros: [],
  };
  const combIndEls = root.getElementsByTagName('CombinacaoDeIndice');
  for (const el of Array.from(combIndEls)) {
    atualizacao.combinacoes_indice.push({
      a_partir_de: tsToDate(getTextContent(el, 'dataInicial') || getTextContent(el, 'aPartirDe')),
      indice: getTextContent(el, 'tipoIndice') || getTextContent(el, 'indice') || getTextContent(el, 'tipo'),
    });
  }
  const combJurEls = root.getElementsByTagName('CombinacaoDeJuros');
  for (const el of Array.from(combJurEls)) {
    atualizacao.combinacoes_juros.push({
      a_partir_de: tsToDate(getTextContent(el, 'dataInicial') || getTextContent(el, 'aPartirDe')),
      tipo: getTextContent(el, 'tipoJuros') || getTextContent(el, 'tipo'),
      taxa: parseNum(getTextContent(el, 'taxa') || getTextContent(el, 'taxaMensal')),
    });
  }

  return {
    parametros,
    resultado,
    verbas,
    historicos_salariais,
    apuracao_diaria_count,
    faltas,
    ferias,
    atualizacao,
    dag,
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
    ordem: parseInt(getTextContent(el, 'ordem')) || 0,
    ativo: getTextContent(el, 'ativo') !== 'false',
    gerar_principal: getTextContent(el, 'gerarPrincipal'),
    gerar_reflexo: getTextContent(el, 'gerarReflexo'),
    compor_principal: getTextContent(el, 'comporPrincipal'),
    ocorrencias_count: ocorrencias.length,
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
    ordem: parseInt(getTextContent(el, 'ordem')) || 0,
    ativo: getTextContent(el, 'ativo') !== 'false',
    gerar_principal: getTextContent(el, 'gerarPrincipal'),
    gerar_reflexo: getTextContent(el, 'gerarReflexo'),
    compor_principal: getTextContent(el, 'comporPrincipal'),
    ocorrencias_count: ocorrencias.length,
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

  const ocEls = ocListEl.getElementsByTagName('OcorrenciaDeVerba');
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

    ocorrencias.push({
      competencia: tsToDate(getTextContent(oc, 'dataInicial')),
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
      indice_acumulado: parseNum(getTextContent(oc, 'indiceAcumulado')) || undefined,
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
