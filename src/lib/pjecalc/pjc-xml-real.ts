/**
 * PJC XML Real Format Parser/Exporter
 * Handles the REAL PJe-Calc .PJC XML format (not the simplified MRDcalc JSON format).
 * Based on analysis of actual .PJC files exported from PJe-Calc CSJT.
 *
 * Structure:
 * - CalculoTrabalhista (root)
 *   - DadosProcesso / Partes / Datas
 *   - ApuracaoDiariaCartao[] (1 per day, ~1800 entries)
 *   - HistoricoSalarial[] (by rubrica, each with OcorrenciaHistorico[])
 *   - Calculada[] (verbas base with incidências)
 *   - Reflexo[] (with FormulaReflexo > BaseVerba > ItemBaseVerba[])
 *   - ParametrosDeAtualizacao (CombinacaoDeIndice[], CombinacaoDeJuros[])
 *   - FaltasAfastamentos[]
 *   - Ferias[]
 */

import { DOMParser as NodeDOMParser } from '@xmldom/xmldom';

// Polyfill: usar xmldom no Node.js, DOMParser nativo no browser
const getParser = (): DOMParser => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  return new NodeDOMParser() as unknown as DOMParser;
};


// =====================================================
// TYPES: Real PJC Structure
// =====================================================

export interface PJCReal {
  processo: PJCProcesso;
  parametros: PJCParametros;
  apuracao_diaria: PJCApuracaoDiaria[];
  historicos_salariais: PJCHistoricoSalarial[];
  calculadas: PJCCalculada[];
  reflexos: PJCReflexo[];
  faltas_afastamentos: PJCFaltaAfastamento[];
  ferias: PJCFerias[];
  atualizacao: PJCAtualizacao;
  fgts?: PJCFGTSConfig;
  contribuicao_social?: PJCCSConfig;
  imposto_renda?: PJCIRConfig;
}

export interface PJCProcesso {
  numero_cnj?: string;
  reclamante_nome?: string;
  reclamante_cpf?: string;
  reclamado_nome?: string;
  reclamado_cnpj?: string;
  vara?: string;
  tribunal?: string;
}

export interface PJCParametros {
  data_admissao: string;
  data_demissao?: string;
  data_ajuizamento?: string;
  data_citacao?: string;
  inicio_calculo?: string;
  fim_calculo?: string;
  data_liquidacao?: string;
  carga_horaria: number;
  sabado_dia_util: boolean;
  prescricao_quinquenal: boolean;
  projetar_aviso: boolean;
  limitar_avos: boolean;
  zerar_negativos: boolean;
}

export interface PJCApuracaoDiaria {
  data: string; // YYYY-MM-DD
  frequencia_diaria: string; // e.g. "08:00-12:00 13:00-17:00"
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
  tipo_dia: 'UTIL' | 'DSR' | 'FERIADO' | 'FALTA' | 'FERIAS' | 'AFASTAMENTO' | 'COMPENSADO';
}

export interface PJCHistoricoSalarial {
  nome: string; // e.g. "COMISSÕES PAGAS", "DSR S/ COMISSÃO"
  tipo_variacao: 'FIXA' | 'VARIAVEL';
  incide_inss: boolean;
  incide_fgts: boolean;
  incide_ir: boolean;
  ocorrencias: PJCHistoricoOcorrencia[];
}

export interface PJCHistoricoOcorrencia {
  competencia: string; // YYYY-MM
  valor: number;
}

export interface PJCCalculada {
  id: string;
  nome: string;
  tipo_variacao: 'FIXA' | 'VARIAVEL';
  caracteristica: 'COMUM' | '13_SALARIO' | 'AVISO_PREVIO' | 'FERIAS';
  ocorrencia_pagamento: 'MENSAL' | 'DEZEMBRO' | 'DESLIGAMENTO' | 'PERIODO_AQUISITIVO';
  incide_inss: boolean;
  incide_ir: boolean;
  incide_fgts: boolean;
  periodo_inicio: string;
  periodo_fim: string;
  multiplicador: number;
  divisor: number;
  tipo_divisor: string;
  tipo_quantidade: string;
  quantidade: number;
  ordem: number;
}

export interface PJCReflexo {
  id: string;
  nome: string;
  descricao?: string;
  comportamento_reflexo: string; // 'VALOR_MENSAL' | 'MEDIA_VALOR_ABSOLUTO' | etc.
  periodo_media_reflexo?: string;
  tratamento_fracao_mes?: string;
  gerar_principal: boolean;
  gerar_reflexo: boolean;
  bases_verba: PJCBaseVerba[];
  incide_inss: boolean;
  incide_ir: boolean;
  incide_fgts: boolean;
  periodo_inicio: string;
  periodo_fim: string;
  multiplicador: number;
  divisor: number;
  ordem: number;
}

export interface PJCBaseVerba {
  calculada_id: string;
  calculada_nome: string;
  integralizar: boolean;
}

export interface PJCFaltaAfastamento {
  data_inicio: string;
  data_fim: string;
  tipo: string; // 'FALTA' | 'ATESTADO_MEDICO' | 'LICENCA_MATERNIDADE' | 'SUSPENSAO' | etc.
  justificada: boolean;
  motivo?: string;
}

export interface PJCFerias {
  aquisitivo_inicio: string;
  aquisitivo_fim: string;
  concessivo_inicio: string;
  concessivo_fim: string;
  prazo_dias: number;
  situacao: string; // 'GOZADAS' | 'INDENIZADAS' | 'PERDIDAS' | etc.
  dobra: boolean;
  abono: boolean;
  dias_abono: number;
  gozos: PJCGozoPeriodo[];
}

export interface PJCGozoPeriodo {
  inicio: string;
  fim: string;
  dias: number;
}

export interface PJCAtualizacao {
  indice_base: string;
  juros_base: string;
  juros_percentual: number;
  combinacoes_indice: PJCCombinacao[];
  combinacoes_juros: PJCCombinacao[];
}

export interface PJCCombinacao {
  a_partir_de: string; // YYYY-MM-DD
  indice_ou_juros: string; // e.g. 'SEM_CORRECAO', 'IPCA', 'SELIC', 'TAXA_LEGAL'
}

export interface PJCFGTSConfig {
  apurar: boolean;
  multa_percentual: number;
  saldos_saques: { data: string; valor: number }[];
}

export interface PJCCSConfig {
  apurar_segurado: boolean;
  apurar_empresa: boolean;
  aliquota_empresa: number;
  aliquota_sat: number;
  aliquota_terceiros: number;
}

export interface PJCIRConfig {
  apurar: boolean;
  dependentes: number;
  tributacao_exclusiva_13: boolean;
}

// =====================================================
// XML PARSER — Real PJC Format
// =====================================================

function getEl(parent: Element, tag: string): Element | null {
  return parent.getElementsByTagName(tag)[0] || null;
}

function getText(parent: Element, tag: string): string {
  return getEl(parent, tag)?.textContent?.trim() || '';
}

function getNum(parent: Element, tag: string): number {
  return parseFloat(getText(parent, tag)) || 0;
}

function getBool(parent: Element, tag: string): boolean {
  const v = getText(parent, tag).toLowerCase();
  return v === 'true' || v === 'sim' || v === '1';
}

function getAttr(el: Element, attr: string): string {
  return el.getAttribute(attr) || '';
}

export interface PJCParseResult {
  success: boolean;
  data?: PJCReal;
  errors: string[];
  warnings: string[];
  stats: {
    dias_apuracao: number;
    historicos: number;
    calculadas: number;
    reflexos: number;
    faltas: number;
    ferias: number;
  };
}

export function parsePJCXml(xmlString: string): PJCParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = getParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { success: false, errors: ['XML inválido: ' + parseError.textContent?.slice(0, 300)], warnings, stats: { dias_apuracao: 0, historicos: 0, calculadas: 0, reflexos: 0, faltas: 0, ferias: 0 } };
    }

    const root = doc.documentElement;

    // --- Processo ---
    const processo: PJCProcesso = {};
    const procEl = getEl(root, 'processo') || getEl(root, 'DadosProcesso') || getEl(root, 'dadosProcesso');
    if (procEl) {
      processo.numero_cnj = getText(procEl, 'numero') || getText(procEl, 'numeroCNJ') || getAttr(procEl, 'numero');
      processo.reclamante_nome = getText(procEl, 'reclamante') || getText(procEl, 'nomeReclamante');
      processo.reclamante_cpf = getText(procEl, 'cpfReclamante') || getText(procEl, 'cpf');
      processo.reclamado_nome = getText(procEl, 'reclamada') || getText(procEl, 'nomeReclamada');
      processo.reclamado_cnpj = getText(procEl, 'cnpjReclamada') || getText(procEl, 'cnpj');
      processo.vara = getText(procEl, 'vara');
      processo.tribunal = getText(procEl, 'tribunal');
    }

    // Try alternate root-level attributes
    if (!processo.numero_cnj) {
      processo.numero_cnj = getAttr(root, 'numero') || getText(root, 'numeroProcesso');
    }

    // --- Parâmetros ---
    const paramEl = getEl(root, 'parametros') || getEl(root, 'ParametrosCalculo') || getEl(root, 'parametrosCalculo') || root;
    const parametros: PJCParametros = {
      data_admissao: getText(paramEl, 'dataAdmissao') || getText(paramEl, 'data_admissao') || '',
      data_demissao: getText(paramEl, 'dataDemissao') || getText(paramEl, 'data_demissao') || undefined,
      data_ajuizamento: getText(paramEl, 'dataAjuizamento') || getText(paramEl, 'data_ajuizamento') || undefined,
      data_citacao: getText(paramEl, 'dataCitacao') || getText(paramEl, 'data_citacao') || undefined,
      inicio_calculo: getText(paramEl, 'periodoInicial') || getText(paramEl, 'inicio_calculo') || undefined,
      fim_calculo: getText(paramEl, 'periodoFinal') || getText(paramEl, 'fim_calculo') || undefined,
      data_liquidacao: getText(paramEl, 'dataLiquidacao') || getText(paramEl, 'data_liquidacao') || undefined,
      carga_horaria: getNum(paramEl, 'cargaHoraria') || getNum(paramEl, 'carga_horaria') || 220,
      sabado_dia_util: getBool(paramEl, 'sabadoDiaUtil') || getBool(paramEl, 'sabado_dia_util'),
      prescricao_quinquenal: getBool(paramEl, 'prescricaoQuinquenal') || getBool(paramEl, 'prescricao_quinquenal'),
      projetar_aviso: getBool(paramEl, 'projetarAviso') || getBool(paramEl, 'projetar_aviso'),
      limitar_avos: getBool(paramEl, 'limitarAvos') || getBool(paramEl, 'limitar_avos'),
      zerar_negativos: getBool(paramEl, 'zerarNegativos') || getBool(paramEl, 'zerar_negativos'),
    };

    // --- Apuração Diária ---
    const apuracao_diaria: PJCApuracaoDiaria[] = [];
    const apuracaoEls = root.getElementsByTagName('ApuracaoDiariaCartao');
    if (apuracaoEls.length === 0) {
      // Try alternate names
      const altEls = root.getElementsByTagName('apuracaoDiaria') || root.getElementsByTagName('apuracao_diaria');
      for (const el of Array.from(altEls)) {
        apuracao_diaria.push(parseApuracaoDiaria(el));
      }
    } else {
      for (const el of Array.from(apuracaoEls)) {
        apuracao_diaria.push(parseApuracaoDiaria(el));
      }
    }

    // --- Históricos Salariais ---
    const historicos_salariais: PJCHistoricoSalarial[] = [];
    const histEls = root.getElementsByTagName('HistoricoSalarial');
    const altHistEls = histEls.length === 0 ? root.getElementsByTagName('historicoSalarial') : histEls;
    for (const el of Array.from(altHistEls)) {
      historicos_salariais.push(parseHistoricoSalarial(el));
    }

    // --- Calculadas (Verbas Base) ---
    const calculadas: PJCCalculada[] = [];
    const calcEls = root.getElementsByTagName('Calculada');
    const altCalcEls = calcEls.length === 0 ? root.getElementsByTagName('calculada') : calcEls;
    for (let i = 0; i < altCalcEls.length; i++) {
      calculadas.push(parseCalculada(altCalcEls[i], i));
    }

    // --- Reflexos ---
    const reflexos: PJCReflexo[] = [];
    const refEls = root.getElementsByTagName('Reflexo');
    const altRefEls = refEls.length === 0 ? root.getElementsByTagName('reflexo') : refEls;
    for (let i = 0; i < altRefEls.length; i++) {
      reflexos.push(parseReflexo(altRefEls[i], i));
    }

    // --- Faltas/Afastamentos ---
    const faltas_afastamentos: PJCFaltaAfastamento[] = [];
    const faltaEls = root.getElementsByTagName('FaltaAfastamento');
    const altFaltaEls = faltaEls.length === 0 ? root.getElementsByTagName('faltaAfastamento') : faltaEls;
    for (const el of Array.from(altFaltaEls)) {
      faltas_afastamentos.push({
        data_inicio: getText(el, 'dataInicial') || getText(el, 'data_inicio') || getText(el, 'inicio'),
        data_fim: getText(el, 'dataFinal') || getText(el, 'data_fim') || getText(el, 'fim'),
        tipo: getText(el, 'tipo') || getText(el, 'tipoAfastamento') || 'FALTA',
        justificada: getBool(el, 'justificada'),
        motivo: getText(el, 'motivo') || getText(el, 'descricao'),
      });
    }

    // --- Férias ---
    const ferias: PJCFerias[] = [];
    const ferEls = root.getElementsByTagName('Ferias');
    const altFerEls = ferEls.length === 0 ? root.getElementsByTagName('ferias') : ferEls;
    for (const el of Array.from(altFerEls)) {
      ferias.push(parseFerias(el));
    }

    // --- Atualização ---
    const atualizacao = parseAtualizacao(root);

    // --- FGTS Config ---
    let fgts: PJCFGTSConfig | undefined;
    const fgtsEl = getEl(root, 'ConfigFGTS') || getEl(root, 'configFGTS');
    if (fgtsEl) {
      const saldosSaques: { data: string; valor: number }[] = [];
      const ssEls = fgtsEl.getElementsByTagName('SaldoSaque');
      for (const ss of Array.from(ssEls)) {
        saldosSaques.push({ data: getAttr(ss, 'data'), valor: parseFloat(getAttr(ss, 'valor')) || 0 });
      }
      fgts = {
        apurar: getBool(fgtsEl, 'apurar'),
        multa_percentual: getNum(fgtsEl, 'multaPercentual') || 40,
        saldos_saques: saldosSaques,
      };
    }

    // --- CS Config ---
    let contribuicao_social: PJCCSConfig | undefined;
    const csEl = getEl(root, 'ConfigCS') || getEl(root, 'configCS');
    if (csEl) {
      contribuicao_social = {
        apurar_segurado: getBool(csEl, 'apurarSegurado'),
        apurar_empresa: getBool(csEl, 'apurarEmpresa'),
        aliquota_empresa: getNum(csEl, 'aliquotaEmpresa') || 20,
        aliquota_sat: getNum(csEl, 'aliquotaSAT') || 2,
        aliquota_terceiros: getNum(csEl, 'aliquotaTerceiros') || 5.8,
      };
    }

    // --- IR Config ---
    let imposto_renda: PJCIRConfig | undefined;
    const irEl = getEl(root, 'ConfigIR') || getEl(root, 'configIR');
    if (irEl) {
      imposto_renda = {
        apurar: getBool(irEl, 'apurar'),
        dependentes: getNum(irEl, 'dependentes') || 0,
        tributacao_exclusiva_13: getBool(irEl, 'tributacaoExclusiva13'),
      };
    }

    const data: PJCReal = {
      processo,
      parametros,
      apuracao_diaria,
      historicos_salariais,
      calculadas,
      reflexos,
      faltas_afastamentos,
      ferias,
      atualizacao,
      fgts,
      contribuicao_social,
      imposto_renda,
    };

    if (apuracao_diaria.length === 0) warnings.push('Nenhuma apuração diária encontrada');
    if (calculadas.length === 0) warnings.push('Nenhuma verba Calculada encontrada');
    if (historicos_salariais.length === 0) warnings.push('Nenhum histórico salarial encontrado');

    return {
      success: true,
      data,
      errors,
      warnings,
      stats: {
        dias_apuracao: apuracao_diaria.length,
        historicos: historicos_salariais.length,
        calculadas: calculadas.length,
        reflexos: reflexos.length,
        faltas: faltas_afastamentos.length,
        ferias: ferias.length,
      },
    };
  } catch (e) {
    return {
      success: false,
      errors: ['Erro ao processar PJC: ' + (e as Error).message],
      warnings,
      stats: { dias_apuracao: 0, historicos: 0, calculadas: 0, reflexos: 0, faltas: 0, ferias: 0 },
    };
  }
}

function parseApuracaoDiaria(el: Element): PJCApuracaoDiaria {
  return {
    data: getText(el, 'dataOcorrencia') || getText(el, 'data') || getAttr(el, 'data'),
    frequencia_diaria: getText(el, 'frequenciaDiaria') || getText(el, 'frequencia'),
    horas_trabalhadas: getNum(el, 'horasTrabalhadas') || getNum(el, 'horas_trabalhadas'),
    horas_extras_diaria: getNum(el, 'horasExtrasDiaria') || getNum(el, 'horas_extras_diaria'),
    horas_extras_semanal: getNum(el, 'horasExtrasSemanal') || getNum(el, 'horas_extras_semanal'),
    horas_extras_mensal: getNum(el, 'horasExtrasMensal') || getNum(el, 'horas_extras_mensal'),
    horas_noturnas: getNum(el, 'horasNoturnas') || getNum(el, 'horas_noturnas'),
    horas_intra_jornada: getNum(el, 'horasIntraJornada') || getNum(el, 'horas_intra_jornada'),
    horas_inter_jornadas: getNum(el, 'horasInterJornadas') || getNum(el, 'horas_inter_jornadas'),
    horas_art384: getNum(el, 'horasArt384') || getNum(el, 'horas_art384'),
    horas_art253: getNum(el, 'horasArt253') || getNum(el, 'horas_art253'),
    repousos_trabalhados: getNum(el, 'repousosTrabalhados') || getNum(el, 'repousos_trabalhados'),
    feriados_trabalhados: getNum(el, 'feriadosTrabalhados') || getNum(el, 'feriados_trabalhados'),
    tipo_dia: (getText(el, 'tipoDia') || getText(el, 'tipo') || 'UTIL') as any,
  };
}

function parseHistoricoSalarial(el: Element): PJCHistoricoSalarial {
  const ocorrencias: PJCHistoricoOcorrencia[] = [];
  const ocEls = el.getElementsByTagName('OcorrenciaHistorico');
  const altOcEls = ocEls.length === 0 ? el.getElementsByTagName('ocorrencia') : ocEls;
  for (const oc of Array.from(altOcEls)) {
    ocorrencias.push({
      competencia: (getText(oc, 'competencia') || getText(oc, 'data') || getAttr(oc, 'competencia')).slice(0, 7),
      valor: getNum(oc, 'valor') || parseFloat(getAttr(oc, 'valor')) || 0,
    });
  }

  return {
    nome: getText(el, 'nome') || getText(el, 'descricao') || getAttr(el, 'nome'),
    tipo_variacao: (getText(el, 'tipoVariacao') || getText(el, 'tipo_variacao') || 'VARIAVEL').toUpperCase() as any,
    incide_inss: getBool(el, 'incidenciaINSS') || getBool(el, 'incide_inss'),
    incide_fgts: getBool(el, 'incidenciaFGTS') || getBool(el, 'incide_fgts'),
    incide_ir: getBool(el, 'incidenciaIRPF') || getBool(el, 'incide_ir'),
    ocorrencias,
  };
}

function parseCalculada(el: Element, index: number): PJCCalculada {
  return {
    id: getText(el, 'id') || getAttr(el, 'id') || `calc_${index}`,
    nome: getText(el, 'nome') || getText(el, 'descricao') || getAttr(el, 'nome') || `Verba ${index + 1}`,
    tipo_variacao: (getText(el, 'tipoVariacaoParcela') || getText(el, 'tipo_variacao') || 'VARIAVEL').toUpperCase() as any,
    caracteristica: (getText(el, 'caracteristica') || 'COMUM').toUpperCase() as any,
    ocorrencia_pagamento: (getText(el, 'ocorrenciaDePagamento') || getText(el, 'ocorrencia_pagamento') || 'MENSAL').toUpperCase() as any,
    incide_inss: getBool(el, 'incidenciaINSS') || getBool(el, 'incide_inss'),
    incide_ir: getBool(el, 'incidenciaIRPF') || getBool(el, 'incide_ir'),
    incide_fgts: getBool(el, 'incidenciaFGTS') || getBool(el, 'incide_fgts'),
    periodo_inicio: getText(el, 'periodoInicial') || getText(el, 'periodo_inicio'),
    periodo_fim: getText(el, 'periodoFinal') || getText(el, 'periodo_fim'),
    multiplicador: getNum(el, 'multiplicador') || 1,
    divisor: getNum(el, 'divisor') || 30,
    tipo_divisor: getText(el, 'tipoDivisor') || getText(el, 'tipo_divisor') || 'INFORMADO',
    tipo_quantidade: getText(el, 'tipoQuantidade') || getText(el, 'tipo_quantidade') || 'INFORMADA',
    quantidade: getNum(el, 'quantidade') || 1,
    ordem: index,
  };
}

function parseReflexo(el: Element, index: number): PJCReflexo {
  const bases_verba: PJCBaseVerba[] = [];
  const formulaEl = getEl(el, 'formula') || getEl(el, 'FormulaReflexo');
  if (formulaEl) {
    const baseVerbaEl = getEl(formulaEl, 'baseVerba') || getEl(formulaEl, 'BaseVerba');
    if (baseVerbaEl) {
      const items = baseVerbaEl.getElementsByTagName('ItemBaseVerba');
      const altItems = items.length === 0 ? baseVerbaEl.getElementsByTagName('item') : items;
      for (const item of Array.from(altItems)) {
        bases_verba.push({
          calculada_id: getText(item, 'id') || getText(item, 'calculadaId') || getAttr(item, 'id'),
          calculada_nome: getText(item, 'nome') || getText(item, 'calculadaNome') || getAttr(item, 'nome'),
          integralizar: getBool(item, 'integralizar'),
        });
      }
    }
    // If no items found, try the baseVerba itself as a reference
    if (bases_verba.length === 0 && baseVerbaEl) {
      const refId = getText(baseVerbaEl, 'id') || getAttr(baseVerbaEl, 'ref');
      const refNome = getText(baseVerbaEl, 'nome') || getAttr(baseVerbaEl, 'nome');
      if (refId || refNome) {
        bases_verba.push({ calculada_id: refId, calculada_nome: refNome, integralizar: false });
      }
    }
  }

  return {
    id: getText(el, 'id') || getAttr(el, 'id') || `refl_${index}`,
    nome: getText(el, 'nome') || getText(el, 'descricao') || getAttr(el, 'nome') || `Reflexo ${index + 1}`,
    descricao: getText(el, 'descricao'),
    comportamento_reflexo: getText(el, 'comportamentoReflexo') || getText(el, 'comportamento_reflexo') || 'VALOR_MENSAL',
    periodo_media_reflexo: getText(el, 'periodoMediaReflexo') || getText(el, 'periodo_media_reflexo') || undefined,
    tratamento_fracao_mes: getText(el, 'tratamentoFracaoMesReflexo') || getText(el, 'tratamento_fracao_mes') || undefined,
    gerar_principal: getBool(el, 'gerarVerbasNaPrincipal') || getBool(el, 'gerar_principal'),
    gerar_reflexo: getBool(el, 'gerarVerbasNaReflexa') || getBool(el, 'gerar_reflexo'),
    bases_verba,
    incide_inss: getBool(el, 'incidenciaINSS') || getBool(el, 'incide_inss'),
    incide_ir: getBool(el, 'incidenciaIRPF') || getBool(el, 'incide_ir'),
    incide_fgts: getBool(el, 'incidenciaFGTS') || getBool(el, 'incide_fgts'),
    periodo_inicio: getText(el, 'periodoInicial') || getText(el, 'periodo_inicio'),
    periodo_fim: getText(el, 'periodoFinal') || getText(el, 'periodo_fim'),
    multiplicador: getNum(el, 'multiplicador') || 1,
    divisor: getNum(el, 'divisor') || 12,
    ordem: index,
  };
}

function parseFerias(el: Element): PJCFerias {
  const gozos: PJCGozoPeriodo[] = [];
  const gozoEls = el.getElementsByTagName('PeriodoGozo');
  const altGozoEls = gozoEls.length === 0 ? el.getElementsByTagName('gozo') : gozoEls;
  for (const g of Array.from(altGozoEls)) {
    gozos.push({
      inicio: getText(g, 'inicio') || getText(g, 'dataInicio') || getAttr(g, 'inicio'),
      fim: getText(g, 'fim') || getText(g, 'dataFim') || getAttr(g, 'fim'),
      dias: getNum(g, 'dias') || 30,
    });
  }

  // Fallback: try gozo_inicio/gozo_fim from flat structure
  if (gozos.length === 0) {
    const gozoInicio = getText(el, 'gozoInicio') || getText(el, 'gozo_inicio');
    const gozoFim = getText(el, 'gozoFim') || getText(el, 'gozo_fim');
    if (gozoInicio && gozoFim) {
      gozos.push({ inicio: gozoInicio, fim: gozoFim, dias: getNum(el, 'prazo') || 30 });
    }
  }

  return {
    aquisitivo_inicio: getText(el, 'periodoAquisitivoInicio') || getText(el, 'aquisitivo_inicio'),
    aquisitivo_fim: getText(el, 'periodoAquisitivoFim') || getText(el, 'aquisitivo_fim'),
    concessivo_inicio: getText(el, 'periodoConcessivoInicio') || getText(el, 'concessivo_inicio'),
    concessivo_fim: getText(el, 'periodoConcessivoFim') || getText(el, 'concessivo_fim'),
    prazo_dias: getNum(el, 'prazo') || getNum(el, 'prazo_dias') || 30,
    situacao: (getText(el, 'situacao') || 'GOZADAS').toUpperCase(),
    dobra: getBool(el, 'dobra'),
    abono: getBool(el, 'abono'),
    dias_abono: getNum(el, 'diasAbono') || getNum(el, 'dias_abono') || 0,
    gozos,
  };
}

function parseAtualizacao(root: Element): PJCAtualizacao {
  const atEl = getEl(root, 'ParametrosDeAtualizacao') || getEl(root, 'parametrosAtualizacao') || getEl(root, 'atualizacao');

  const combinacoes_indice: PJCCombinacao[] = [];
  const combinacoes_juros: PJCCombinacao[] = [];

  if (atEl) {
    // Combinações de Índice
    const combIndEls = atEl.getElementsByTagName('CombinacaoDeIndice');
    const altCombIndEls = combIndEls.length === 0 ? atEl.getElementsByTagName('combinacao_indice') : combIndEls;
    for (const c of Array.from(altCombIndEls)) {
      combinacoes_indice.push({
        a_partir_de: getText(c, 'aPartirDe') || getText(c, 'a_partir_de') || getAttr(c, 'data'),
        indice_ou_juros: getText(c, 'indice') || getText(c, 'nome') || getAttr(c, 'indice'),
      });
    }

    // Combinações de Juros
    const combJurEls = atEl.getElementsByTagName('CombinacaoDeJuros');
    const altCombJurEls = combJurEls.length === 0 ? atEl.getElementsByTagName('combinacao_juros') : combJurEls;
    for (const c of Array.from(altCombJurEls)) {
      combinacoes_juros.push({
        a_partir_de: getText(c, 'aPartirDe') || getText(c, 'a_partir_de') || getAttr(c, 'data'),
        indice_ou_juros: getText(c, 'juros') || getText(c, 'nome') || getAttr(c, 'juros'),
      });
    }
  }

  return {
    indice_base: atEl ? (getText(atEl, 'indice') || getText(atEl, 'indiceBase') || 'IPCA-E') : 'IPCA-E',
    juros_base: atEl ? (getText(atEl, 'juros') || getText(atEl, 'jurosBase') || 'TRD_SIMPLES') : 'TRD_SIMPLES',
    juros_percentual: atEl ? (getNum(atEl, 'jurosPercentual') || getNum(atEl, 'juros_percentual') || 1) : 1,
    combinacoes_indice,
    combinacoes_juros,
  };
}

// =====================================================
// XML EXPORTER — Real PJC Format
// =====================================================

function escXml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtN(v: number, dec = 4): string {
  return (v || 0).toFixed(dec);
}

export function exportPJCXml(data: PJCReal): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<CalculoTrabalhista formato="MRDcalc-PJC" versao="2.0.0" gerado_em="' + new Date().toISOString() + '">');

  // Processo
  lines.push('  <DadosProcesso>');
  lines.push(`    <numeroCNJ>${escXml(data.processo.numero_cnj || '')}</numeroCNJ>`);
  lines.push(`    <nomeReclamante>${escXml(data.processo.reclamante_nome || '')}</nomeReclamante>`);
  lines.push(`    <cpfReclamante>${escXml(data.processo.reclamante_cpf || '')}</cpfReclamante>`);
  lines.push(`    <nomeReclamada>${escXml(data.processo.reclamado_nome || '')}</nomeReclamada>`);
  lines.push(`    <cnpjReclamada>${escXml(data.processo.reclamado_cnpj || '')}</cnpjReclamada>`);
  lines.push('  </DadosProcesso>');

  // Parâmetros
  const p = data.parametros;
  lines.push('  <ParametrosCalculo>');
  lines.push(`    <dataAdmissao>${p.data_admissao}</dataAdmissao>`);
  if (p.data_demissao) lines.push(`    <dataDemissao>${p.data_demissao}</dataDemissao>`);
  if (p.data_ajuizamento) lines.push(`    <dataAjuizamento>${p.data_ajuizamento}</dataAjuizamento>`);
  if (p.data_citacao) lines.push(`    <dataCitacao>${p.data_citacao}</dataCitacao>`);
  if (p.inicio_calculo) lines.push(`    <periodoInicial>${p.inicio_calculo}</periodoInicial>`);
  if (p.fim_calculo) lines.push(`    <periodoFinal>${p.fim_calculo}</periodoFinal>`);
  if (p.data_liquidacao) lines.push(`    <dataLiquidacao>${p.data_liquidacao}</dataLiquidacao>`);
  lines.push(`    <cargaHoraria>${p.carga_horaria}</cargaHoraria>`);
  lines.push(`    <sabadoDiaUtil>${p.sabado_dia_util}</sabadoDiaUtil>`);
  lines.push(`    <prescricaoQuinquenal>${p.prescricao_quinquenal}</prescricaoQuinquenal>`);
  lines.push(`    <projetarAviso>${p.projetar_aviso}</projetarAviso>`);
  lines.push(`    <limitarAvos>${p.limitar_avos}</limitarAvos>`);
  lines.push(`    <zerarNegativos>${p.zerar_negativos}</zerarNegativos>`);
  lines.push('  </ParametrosCalculo>');

  // Apuração Diária
  if (data.apuracao_diaria.length > 0) {
    lines.push('  <ApuracoesDiarias>');
    for (const ad of data.apuracao_diaria) {
      lines.push('    <ApuracaoDiariaCartao>');
      lines.push(`      <dataOcorrencia>${ad.data}</dataOcorrencia>`);
      lines.push(`      <frequenciaDiaria>${escXml(ad.frequencia_diaria)}</frequenciaDiaria>`);
      lines.push(`      <horasTrabalhadas>${fmtN(ad.horas_trabalhadas)}</horasTrabalhadas>`);
      lines.push(`      <horasExtrasDiaria>${fmtN(ad.horas_extras_diaria)}</horasExtrasDiaria>`);
      lines.push(`      <horasExtrasSemanal>${fmtN(ad.horas_extras_semanal)}</horasExtrasSemanal>`);
      lines.push(`      <horasExtrasMensal>${fmtN(ad.horas_extras_mensal)}</horasExtrasMensal>`);
      lines.push(`      <horasNoturnas>${fmtN(ad.horas_noturnas)}</horasNoturnas>`);
      lines.push(`      <horasIntraJornada>${fmtN(ad.horas_intra_jornada)}</horasIntraJornada>`);
      lines.push(`      <horasInterJornadas>${fmtN(ad.horas_inter_jornadas)}</horasInterJornadas>`);
      lines.push(`      <horasArt384>${fmtN(ad.horas_art384)}</horasArt384>`);
      lines.push(`      <tipoDia>${ad.tipo_dia}</tipoDia>`);
      lines.push('    </ApuracaoDiariaCartao>');
    }
    lines.push('  </ApuracoesDiarias>');
  }

  // Históricos Salariais
  if (data.historicos_salariais.length > 0) {
    lines.push('  <HistoricosSalariais>');
    for (const h of data.historicos_salariais) {
      lines.push('    <HistoricoSalarial>');
      lines.push(`      <nome>${escXml(h.nome)}</nome>`);
      lines.push(`      <tipoVariacao>${h.tipo_variacao}</tipoVariacao>`);
      lines.push(`      <incidenciaINSS>${h.incide_inss}</incidenciaINSS>`);
      lines.push(`      <incidenciaFGTS>${h.incide_fgts}</incidenciaFGTS>`);
      lines.push(`      <incidenciaIRPF>${h.incide_ir}</incidenciaIRPF>`);
      for (const oc of h.ocorrencias) {
        lines.push(`      <OcorrenciaHistorico competencia="${oc.competencia}" valor="${fmtN(oc.valor, 2)}" />`);
      }
      lines.push('    </HistoricoSalarial>');
    }
    lines.push('  </HistoricosSalariais>');
  }

  // Calculadas
  if (data.calculadas.length > 0) {
    lines.push('  <VerbasPrincipais>');
    for (const c of data.calculadas) {
      lines.push(`    <Calculada id="${escXml(c.id)}">`);
      lines.push(`      <nome>${escXml(c.nome)}</nome>`);
      lines.push(`      <caracteristica>${c.caracteristica}</caracteristica>`);
      lines.push(`      <ocorrenciaDePagamento>${c.ocorrencia_pagamento}</ocorrenciaDePagamento>`);
      lines.push(`      <tipoVariacaoParcela>${c.tipo_variacao}</tipoVariacaoParcela>`);
      lines.push(`      <incidenciaINSS>${c.incide_inss}</incidenciaINSS>`);
      lines.push(`      <incidenciaIRPF>${c.incide_ir}</incidenciaIRPF>`);
      lines.push(`      <incidenciaFGTS>${c.incide_fgts}</incidenciaFGTS>`);
      lines.push(`      <periodoInicial>${c.periodo_inicio}</periodoInicial>`);
      lines.push(`      <periodoFinal>${c.periodo_fim}</periodoFinal>`);
      lines.push(`      <multiplicador>${fmtN(c.multiplicador)}</multiplicador>`);
      lines.push(`      <divisor>${fmtN(c.divisor, 2)}</divisor>`);
      lines.push(`      <tipoDivisor>${escXml(c.tipo_divisor)}</tipoDivisor>`);
      lines.push(`      <tipoQuantidade>${escXml(c.tipo_quantidade)}</tipoQuantidade>`);
      lines.push(`      <quantidade>${fmtN(c.quantidade, 2)}</quantidade>`);
      lines.push('    </Calculada>');
    }
    lines.push('  </VerbasPrincipais>');
  }

  // Reflexos
  if (data.reflexos.length > 0) {
    lines.push('  <Reflexos>');
    for (const r of data.reflexos) {
      lines.push(`    <Reflexo id="${escXml(r.id)}">`);
      lines.push(`      <nome>${escXml(r.nome)}</nome>`);
      lines.push(`      <comportamentoReflexo>${r.comportamento_reflexo}</comportamentoReflexo>`);
      if (r.periodo_media_reflexo) lines.push(`      <periodoMediaReflexo>${r.periodo_media_reflexo}</periodoMediaReflexo>`);
      if (r.tratamento_fracao_mes) lines.push(`      <tratamentoFracaoMesReflexo>${r.tratamento_fracao_mes}</tratamentoFracaoMesReflexo>`);
      lines.push(`      <incidenciaINSS>${r.incide_inss}</incidenciaINSS>`);
      lines.push(`      <incidenciaIRPF>${r.incide_ir}</incidenciaIRPF>`);
      lines.push(`      <incidenciaFGTS>${r.incide_fgts}</incidenciaFGTS>`);
      lines.push(`      <gerarVerbasNaPrincipal>${r.gerar_principal}</gerarVerbasNaPrincipal>`);
      lines.push(`      <gerarVerbasNaReflexa>${r.gerar_reflexo}</gerarVerbasNaReflexa>`);
      lines.push(`      <periodoInicial>${r.periodo_inicio}</periodoInicial>`);
      lines.push(`      <periodoFinal>${r.periodo_fim}</periodoFinal>`);
      lines.push(`      <multiplicador>${fmtN(r.multiplicador)}</multiplicador>`);
      lines.push(`      <divisor>${fmtN(r.divisor, 2)}</divisor>`);
      if (r.bases_verba.length > 0) {
        lines.push('      <formula><FormulaReflexo><baseVerba>');
        for (const bv of r.bases_verba) {
          lines.push(`        <ItemBaseVerba id="${escXml(bv.calculada_id)}" nome="${escXml(bv.calculada_nome)}" integralizar="${bv.integralizar}" />`);
        }
        lines.push('      </baseVerba></FormulaReflexo></formula>');
      }
      lines.push('    </Reflexo>');
    }
    lines.push('  </Reflexos>');
  }

  // Faltas/Afastamentos
  if (data.faltas_afastamentos.length > 0) {
    lines.push('  <FaltasAfastamentos>');
    for (const f of data.faltas_afastamentos) {
      lines.push(`    <FaltaAfastamento>`);
      lines.push(`      <dataInicial>${f.data_inicio}</dataInicial>`);
      lines.push(`      <dataFinal>${f.data_fim}</dataFinal>`);
      lines.push(`      <tipo>${escXml(f.tipo)}</tipo>`);
      lines.push(`      <justificada>${f.justificada}</justificada>`);
      if (f.motivo) lines.push(`      <motivo>${escXml(f.motivo)}</motivo>`);
      lines.push(`    </FaltaAfastamento>`);
    }
    lines.push('  </FaltasAfastamentos>');
  }

  // Férias
  if (data.ferias.length > 0) {
    lines.push('  <FeriasPeriodos>');
    for (const f of data.ferias) {
      lines.push('    <Ferias>');
      lines.push(`      <periodoAquisitivoInicio>${f.aquisitivo_inicio}</periodoAquisitivoInicio>`);
      lines.push(`      <periodoAquisitivoFim>${f.aquisitivo_fim}</periodoAquisitivoFim>`);
      lines.push(`      <periodoConcessivoInicio>${f.concessivo_inicio}</periodoConcessivoInicio>`);
      lines.push(`      <periodoConcessivoFim>${f.concessivo_fim}</periodoConcessivoFim>`);
      lines.push(`      <prazo>${f.prazo_dias}</prazo>`);
      lines.push(`      <situacao>${f.situacao}</situacao>`);
      lines.push(`      <dobra>${f.dobra}</dobra>`);
      lines.push(`      <abono>${f.abono}</abono>`);
      if (f.dias_abono > 0) lines.push(`      <diasAbono>${f.dias_abono}</diasAbono>`);
      for (const g of f.gozos) {
        lines.push(`      <PeriodoGozo inicio="${g.inicio}" fim="${g.fim}" dias="${g.dias}" />`);
      }
      lines.push('    </Ferias>');
    }
    lines.push('  </FeriasPeriodos>');
  }

  // Atualização
  const at = data.atualizacao;
  lines.push('  <ParametrosDeAtualizacao>');
  lines.push(`    <indice>${at.indice_base}</indice>`);
  lines.push(`    <juros>${at.juros_base}</juros>`);
  lines.push(`    <jurosPercentual>${at.juros_percentual}</jurosPercentual>`);
  for (const ci of at.combinacoes_indice) {
    lines.push(`    <CombinacaoDeIndice><aPartirDe>${ci.a_partir_de}</aPartirDe><indice>${ci.indice_ou_juros}</indice></CombinacaoDeIndice>`);
  }
  for (const cj of at.combinacoes_juros) {
    lines.push(`    <CombinacaoDeJuros><aPartirDe>${cj.a_partir_de}</aPartirDe><juros>${cj.indice_ou_juros}</juros></CombinacaoDeJuros>`);
  }
  lines.push('  </ParametrosDeAtualizacao>');

  // FGTS Config
  if (data.fgts) {
    lines.push('  <ConfigFGTS>');
    lines.push(`    <apurar>${data.fgts.apurar}</apurar>`);
    lines.push(`    <multaPercentual>${data.fgts.multa_percentual}</multaPercentual>`);
    if (data.fgts.saldos_saques.length > 0) {
      for (const ss of data.fgts.saldos_saques) {
        lines.push(`    <SaldoSaque data="${ss.data}" valor="${fmtN(ss.valor, 2)}" />`);
      }
    }
    lines.push('  </ConfigFGTS>');
  }

  // CS Config
  if (data.contribuicao_social) {
    lines.push('  <ConfigCS>');
    lines.push(`    <apurarSegurado>${data.contribuicao_social.apurar_segurado}</apurarSegurado>`);
    lines.push(`    <apurarEmpresa>${data.contribuicao_social.apurar_empresa}</apurarEmpresa>`);
    lines.push(`    <aliquotaEmpresa>${data.contribuicao_social.aliquota_empresa}</aliquotaEmpresa>`);
    lines.push(`    <aliquotaSAT>${data.contribuicao_social.aliquota_sat}</aliquotaSAT>`);
    lines.push(`    <aliquotaTerceiros>${data.contribuicao_social.aliquota_terceiros}</aliquotaTerceiros>`);
    lines.push('  </ConfigCS>');
  }

  // IR Config
  if (data.imposto_renda) {
    lines.push('  <ConfigIR>');
    lines.push(`    <apurar>${data.imposto_renda.apurar}</apurar>`);
    lines.push(`    <dependentes>${data.imposto_renda.dependentes}</dependentes>`);
    lines.push(`    <tributacaoExclusiva13>${data.imposto_renda.tributacao_exclusiva_13}</tributacaoExclusiva13>`);
    lines.push('  </ConfigIR>');
  }

  lines.push('</CalculoTrabalhista>');
  return lines.join('\n');
}

// =====================================================
// DOWNLOAD
// =====================================================

export function downloadPJCXml(data: PJCReal, nomeArquivo?: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('downloadPJCXml: ambiente sem suporte a File API.');
  }

  const xml = exportPJCXml(data);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const proc = data.processo?.numero_cnj?.replace(/\D/g, '') || 'CALCULO';
  const recl = data.processo?.reclamante_nome?.replace(/\s+/g, '_') || 'RECLAMANTE';
  const fallback = `${proc}_${recl}.PJC`;
  const safeName = (nomeArquivo || fallback)
    .replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_')
    .trim()
    .slice(0, 200) || fallback;

  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
  } finally {
    try {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    } catch {
      /* ignore */
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

// =====================================================
// ROUND-TRIP COMPARISON
// =====================================================

export interface PJCDivergencia {
  tipo: 'calculada' | 'reflexo' | 'historico' | 'apuracao' | 'ferias' | 'faltas' | 'parametro';
  campo: string;
  esperado: string;
  encontrado: string;
  competencia?: string;
  severidade: 'critico' | 'alerta' | 'info';
}

export function compararPJC(original: PJCReal, reimportado: PJCReal): PJCDivergencia[] {
  const divs: PJCDivergencia[] = [];

  // Compare params
  const paramFields: (keyof PJCParametros)[] = ['data_admissao', 'data_demissao', 'data_ajuizamento', 'carga_horaria'];
  for (const f of paramFields) {
    const o = String(original.parametros[f] || '');
    const r = String(reimportado.parametros[f] || '');
    if (o !== r) {
      divs.push({ tipo: 'parametro', campo: f, esperado: o, encontrado: r, severidade: 'critico' });
    }
  }

  // Compare calculadas count
  if (original.calculadas.length !== reimportado.calculadas.length) {
    divs.push({ tipo: 'calculada', campo: 'count', esperado: String(original.calculadas.length), encontrado: String(reimportado.calculadas.length), severidade: 'critico' });
  }

  // Compare each calculada by name
  for (const oc of original.calculadas) {
    const rc = reimportado.calculadas.find(c => c.nome === oc.nome);
    if (!rc) {
      divs.push({ tipo: 'calculada', campo: oc.nome, esperado: 'presente', encontrado: 'ausente', severidade: 'critico' });
    }
  }

  // Compare reflexos count
  if (original.reflexos.length !== reimportado.reflexos.length) {
    divs.push({ tipo: 'reflexo', campo: 'count', esperado: String(original.reflexos.length), encontrado: String(reimportado.reflexos.length), severidade: 'alerta' });
  }

  // Compare historicos
  for (const oh of original.historicos_salariais) {
    const rh = reimportado.historicos_salariais.find(h => h.nome === oh.nome);
    if (!rh) {
      divs.push({ tipo: 'historico', campo: oh.nome, esperado: 'presente', encontrado: 'ausente', severidade: 'critico' });
      continue;
    }
    // Compare occurrence count
    if (oh.ocorrencias.length !== rh.ocorrencias.length) {
      divs.push({ tipo: 'historico', campo: `${oh.nome} ocorrências`, esperado: String(oh.ocorrencias.length), encontrado: String(rh.ocorrencias.length), severidade: 'alerta' });
    }
    // Compare each value
    for (const oo of oh.ocorrencias) {
      const ro = rh.ocorrencias.find(o => o.competencia === oo.competencia);
      if (!ro) {
        divs.push({ tipo: 'historico', campo: oh.nome, esperado: String(oo.valor), encontrado: 'ausente', competencia: oo.competencia, severidade: 'critico' });
      } else if (Math.abs(oo.valor - ro.valor) > 0.01) {
        divs.push({ tipo: 'historico', campo: oh.nome, esperado: oo.valor.toFixed(2), encontrado: ro.valor.toFixed(2), competencia: oo.competencia, severidade: 'critico' });
      }
    }
  }

  // Compare apuracao diaria count
  if (original.apuracao_diaria.length !== reimportado.apuracao_diaria.length) {
    divs.push({ tipo: 'apuracao', campo: 'dias', esperado: String(original.apuracao_diaria.length), encontrado: String(reimportado.apuracao_diaria.length), severidade: 'alerta' });
  }

  return divs;
}
/**
 * PJC XML Real Format Parser/Exporter
 * Handles the REAL PJe-Calc .PJC XML format (not the simplified MRDcalc JSON format).
 * Based on analysis of actual .PJC files exported from PJe-Calc CSJT.
 *
 * Structure:
 * - CalculoTrabalhista (root)
 *   - DadosProcesso / Partes / Datas
 *   - ApuracaoDiariaCartao[] (1 per day, ~1800 entries)
 *   - HistoricoSalarial[] (by rubrica, each with OcorrenciaHistorico[])
 *   - Calculada[] (verbas base with incidências)
 *   - Reflexo[] (with FormulaReflexo > BaseVerba > ItemBaseVerba[])
 *   - ParametrosDeAtualizacao (CombinacaoDeIndice[], CombinacaoDeJuros[])
 *   - FaltasAfastamentos[]
 *   - Ferias[]
 */

// =====================================================
// TYPES: Real PJC Structure
// =====================================================

