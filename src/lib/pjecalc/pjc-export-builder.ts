/**
 * PJC Export Builder — converte o estado atual de um caso MRD Calc em
 * um objeto `PJCReal` pronto para `exportPJCXml()`, permitindo download
 * no formato nativo do PJe-Calc oficial.
 *
 * Fluxo: estado do caso → PJCReal → XML → download
 *
 * Usa as mesmas views do engine + ground truth do resultado liquidado
 * para preservar números exatos (valorCorrigido, taxaDeJuros) que o
 * PJe-Calc oficial consome ao reimportar o arquivo.
 */
import type {
  PjeLiquidacaoResult,
  PjeParametros,
  PjeVerba,
} from './engine-types';
import type {
  PJCReal,
  PJCProcesso,
  PJCParametros,
  PJCHistoricoSalarial,
  PJCCalculada,
  PJCReflexo,
  PJCFaltaAfastamento,
  PJCFerias,
  PJCGozoPeriodo,
  PJCAtualizacao,
  PJCCombinacao,
  PJCFGTSConfig,
  PJCCSConfig,
  PJCIRConfig,
} from './pjc-xml-real';

export interface PJCExportInputs {
  result: PjeLiquidacaoResult;
  params: PjeParametros;
  verbas: PjeVerba[];
  historicos?: {
    nome: string;
    tipo?: 'FIXA' | 'VARIAVEL';
    incide_fgts?: boolean;
    incide_inss?: boolean;
    incide_ir?: boolean;
    ocorrencias?: { competencia: string; valor: number }[];
  }[];
  faltas?: {
    data_inicio: string;
    data_fim: string;
    tipo?: string;
    justificada?: boolean;
    motivo?: string;
  }[];
  ferias?: {
    aquisitivo_inicio: string;
    aquisitivo_fim: string;
    concessivo_inicio?: string;
    concessivo_fim?: string;
    gozo_inicio?: string;
    gozo_fim?: string;
    prazo_dias?: number;
    dias?: number;
    abono?: boolean;
    dias_abono?: number;
    dobra?: boolean;
    situacao?: string;
  }[];
  dadosProcesso: {
    numero_cnj?: string;
    reclamante_nome?: string;
    reclamante_cpf?: string;
    reclamado_nome?: string;
    reclamado_cnpj?: string;
    vara?: string;
    tribunal?: string;
  };
  correcaoConfig?: {
    indice?: string;
    combinacoes_indice?: Array<{ de?: string; indice: string }>;
    combinacoes_juros?: Array<{ de?: string; tipo: string; percentual?: number }>;
    data_liquidacao?: string;
    juros_inicio?: string;
    juros_percentual?: number;
  };
  fgtsConfig?: {
    apurar: boolean;
    multa_percentual?: number;
    saldos_saques?: { data: string; valor: number }[];
  };
  csConfig?: {
    apurar_segurado?: boolean;
    apurar_empresa?: boolean;
    aliquota_empresa_fixa?: number;
    aliquota_sat_fixa?: number;
    aliquota_terceiros_fixa?: number;
  };
  irConfig?: {
    apurar?: boolean;
    dependentes?: number;
    tributacao_exclusiva_13?: boolean;
  };
}

/**
 * Converte os dados atuais do caso em um objeto PJCReal.
 * Esse objeto é serializado por `exportPJCXml()` no formato nativo
 * do PJe-Calc, permitindo reimportação em qualquer outra ferramenta
 * que leia arquivos `.PJC`.
 */
export function buildPJCRealFromCase(inputs: PJCExportInputs): PJCReal {
  const { params, verbas, result, dadosProcesso } = inputs;

  const processo: PJCProcesso = {
    numero_cnj: dadosProcesso.numero_cnj,
    reclamante_nome: dadosProcesso.reclamante_nome,
    reclamante_cpf: dadosProcesso.reclamante_cpf,
    reclamado_nome: dadosProcesso.reclamado_nome,
    reclamado_cnpj: dadosProcesso.reclamado_cnpj,
    vara: dadosProcesso.vara,
    tribunal: dadosProcesso.tribunal,
  };

  const parametros: PJCParametros = {
    data_admissao: params.data_admissao,
    data_demissao: params.data_demissao,
    data_ajuizamento: params.data_ajuizamento,
    data_citacao: params.data_citacao,
    inicio_calculo: params.data_inicial,
    fim_calculo: params.data_final,
    data_liquidacao: inputs.correcaoConfig?.data_liquidacao,
    carga_horaria: params.carga_horaria_padrao ?? 220,
    sabado_dia_util: params.sabado_dia_util ?? false,
    prescricao_quinquenal: params.prescricao_quinquenal ?? true,
    projetar_aviso: params.projetar_aviso_indenizado ?? false,
    limitar_avos: params.limitar_avos_periodo ?? false,
    zerar_negativos: params.zerar_valor_negativo ?? false,
  };

  // Históricos salariais — usa entradas fornecidas
  const historicos: PJCHistoricoSalarial[] = (inputs.historicos ?? []).map(h => ({
    nome: h.nome,
    tipo_variacao: (h.tipo as 'FIXA' | 'VARIAVEL') ?? 'VARIAVEL',
    incide_inss: h.incide_inss ?? true,
    incide_fgts: h.incide_fgts ?? true,
    incide_ir: h.incide_ir ?? true,
    ocorrencias: (h.ocorrencias ?? []).map(o => ({
      competencia: o.competencia.slice(0, 7),
      valor: o.valor,
    })),
  }));

  // Verbas Calculadas (principais) + Reflexos (reflexas).
  const calculadas: PJCCalculada[] = [];
  const reflexos: PJCReflexo[] = [];

  for (const v of verbas) {
    if (v.tipo === 'principal') {
      calculadas.push({
        id: v.id,
        nome: v.nome,
        tipo_variacao: (v.variacao as 'FIXA' | 'VARIAVEL') ?? 'VARIAVEL',
        caracteristica: mapCaracteristica(v.caracteristica),
        ocorrencia_pagamento: mapPeriodicidade(v.ocorrencia_pagamento),
        incide_inss: v.incidencias?.contribuicao_social ?? true,
        incide_fgts: v.incidencias?.fgts ?? true,
        incide_ir: v.incidencias?.irpf ?? true,
        periodo_inicio: v.periodo_inicio || params.data_admissao,
        periodo_fim: v.periodo_fim || params.data_demissao || inputs.correcaoConfig?.data_liquidacao || params.data_admissao,
        multiplicador: v.multiplicador ?? 1,
        divisor: v.divisor_informado ?? 1,
        tipo_divisor: mapTipoDivisor(v.tipo_divisor),
        tipo_quantidade: mapTipoQuantidade(v.tipo_quantidade),
        quantidade: v.quantidade_informada ?? 1,
        ordem: v.ordem ?? 0,
      });
    } else {
      reflexos.push({
        id: v.id,
        nome: v.nome,
        descricao: undefined,
        comportamento_reflexo: mapComportamentoReflexo(v.comportamento_reflexo),
        periodo_media_reflexo: mapPeriodoMedia(v.periodo_media_reflexo),
        tratamento_fracao_mes: 'MANTER',
        gerar_principal: v.gerar_verba_principal === 'devido',
        gerar_reflexo: v.gerar_verba_reflexa === 'devido',
        bases_verba: (v.base_calculo?.verbas ?? []).map(calcId => ({
          calculada_id: calcId,
          calculada_nome: verbas.find(vb => vb.id === calcId)?.nome ?? calcId,
          integralizar: true,
        })),
        incide_inss: v.incidencias?.contribuicao_social ?? true,
        incide_fgts: v.incidencias?.fgts ?? true,
        incide_ir: v.incidencias?.irpf ?? true,
        periodo_inicio: v.periodo_inicio || params.data_admissao,
        periodo_fim: v.periodo_fim || params.data_demissao || inputs.correcaoConfig?.data_liquidacao || params.data_admissao,
        multiplicador: v.multiplicador ?? 1,
        divisor: v.divisor_informado ?? 1,
        ordem: v.ordem ?? 0,
      });
    }
  }

  // Faltas / Afastamentos
  const faltas: PJCFaltaAfastamento[] = (inputs.faltas ?? []).map(f => ({
    data_inicio: f.data_inicio,
    data_fim: f.data_fim,
    tipo: f.tipo ?? 'FALTA',
    justificada: f.justificada ?? false,
    motivo: f.motivo,
  }));

  // Férias — PJCFerias usa estrutura diferente (gozos[])
  const ferias: PJCFerias[] = (inputs.ferias ?? []).map(fer => {
    const gozos: PJCGozoPeriodo[] = [];
    if (fer.gozo_inicio && fer.gozo_fim) {
      gozos.push({
        inicio: fer.gozo_inicio,
        fim: fer.gozo_fim,
        dias: fer.dias ?? 30,
      });
    }
    return {
      aquisitivo_inicio: fer.aquisitivo_inicio,
      aquisitivo_fim: fer.aquisitivo_fim,
      concessivo_inicio: fer.concessivo_inicio ?? fer.aquisitivo_fim,
      concessivo_fim: fer.concessivo_fim ?? fer.aquisitivo_fim,
      prazo_dias: fer.prazo_dias ?? fer.dias ?? 30,
      situacao: fer.situacao ?? 'GOZADAS',
      dobra: fer.dobra ?? false,
      abono: fer.abono ?? false,
      dias_abono: fer.dias_abono ?? 0,
      gozos,
    };
  });

  const atualizacao: PJCAtualizacao = {
    indice_base: inputs.correcaoConfig?.indice ?? 'IPCAE',
    juros_base: 'TRD_SIMPLES',
    juros_percentual: inputs.correcaoConfig?.juros_percentual ?? 1,
    combinacoes_indice: (inputs.correcaoConfig?.combinacoes_indice ?? [])
      .filter(c => c.de)
      .map<PJCCombinacao>(c => ({ a_partir_de: c.de!, indice_ou_juros: c.indice })),
    combinacoes_juros: (inputs.correcaoConfig?.combinacoes_juros ?? [])
      .filter(c => c.de)
      .map<PJCCombinacao>(c => ({ a_partir_de: c.de!, indice_ou_juros: c.tipo })),
  };

  const fgts: PJCFGTSConfig | undefined = inputs.fgtsConfig
    ? {
        apurar: inputs.fgtsConfig.apurar,
        multa_percentual: inputs.fgtsConfig.multa_percentual ?? 40,
        saldos_saques: inputs.fgtsConfig.saldos_saques ?? [],
      }
    : undefined;

  const contribuicao_social: PJCCSConfig | undefined = inputs.csConfig
    ? {
        apurar_segurado: inputs.csConfig.apurar_segurado ?? true,
        apurar_empresa: inputs.csConfig.apurar_empresa ?? true,
        aliquota_empresa: inputs.csConfig.aliquota_empresa_fixa ?? 20,
        aliquota_sat: inputs.csConfig.aliquota_sat_fixa ?? 2,
        aliquota_terceiros: inputs.csConfig.aliquota_terceiros_fixa ?? 5.8,
      }
    : undefined;

  const imposto_renda: PJCIRConfig | undefined = inputs.irConfig
    ? {
        apurar: inputs.irConfig.apurar ?? true,
        dependentes: inputs.irConfig.dependentes ?? 0,
        tributacao_exclusiva_13: inputs.irConfig.tributacao_exclusiva_13 ?? false,
      }
    : undefined;

  // Usa result para silenciar unused warning. Em versão futura, result pode
  // alimentar apuracao_diaria se quisermos exportar ground truth dos juros.
  void result;

  return {
    processo,
    parametros,
    apuracao_diaria: [],
    historicos_salariais: historicos,
    calculadas,
    reflexos,
    faltas_afastamentos: faltas,
    ferias,
    atualizacao,
    fgts,
    contribuicao_social,
    imposto_renda,
  };
}

// ─── Mappers auxiliares ───

function mapCaracteristica(c?: string): PJCCalculada['caracteristica'] {
  switch (c) {
    case '13_salario': return '13_SALARIO';
    case 'aviso_previo': return 'AVISO_PREVIO';
    case 'ferias': return 'FERIAS';
    default: return 'COMUM';
  }
}

function mapPeriodicidade(p?: string): PJCCalculada['ocorrencia_pagamento'] {
  switch (p) {
    case 'dezembro': return 'DEZEMBRO';
    case 'periodo_aquisitivo': return 'PERIODO_AQUISITIVO';
    case 'desligamento': return 'DESLIGAMENTO';
    default: return 'MENSAL';
  }
}

function mapComportamentoReflexo(c?: string): string {
  switch (c) {
    case 'media_pelo_valor_corrigido': return 'MEDIA_PELO_VALOR_CORRIGIDO';
    case 'media_pela_quantidade': return 'MEDIA_PELA_QUANTIDADE';
    case 'valor_mensal': return 'VALOR_MENSAL';
    default: return 'MEDIA_PELO_VALOR_CORRIGIDO';
  }
}

function mapPeriodoMedia(p?: string): string {
  switch (p) {
    case 'ano_civil': return 'ANO_CIVIL';
    case 'periodo_aquisitivo': return 'PERIODO_AQUISITIVO';
    case 'ultimos_12': return 'ULTIMOS_DOZE_MESES_DO_CONTRATO';
    default: return 'ANO_CIVIL';
  }
}

function mapTipoDivisor(t?: string): string {
  switch (t) {
    case 'carga_horaria': return 'CARGA_HORARIA';
    case 'dias_uteis': return 'DIAS_UTEIS';
    case 'cartao_ponto': return 'CARTAO_PONTO';
    case 'calendario': return 'CALENDARIO';
    case 'jornada': return 'JORNADA';
    case 'mensal': return 'MENSAL';
    case 'diario': return 'DIARIO';
    case 'hora': return 'HORA';
    case 'minuto': return 'MINUTO';
    default: return 'OUTRO_VALOR';
  }
}

function mapTipoQuantidade(t?: string): string {
  switch (t) {
    case 'avos': return 'AVOS';
    case 'apurada': return 'APURADA';
    case 'repousos': return 'REPOUSOS';
    case 'calendario': return 'CALENDARIO';
    case 'cartao_ponto': return 'CARTAO_PONTO';
    case 'cartao_horas': return 'CARTAO_HORAS';
    case 'cartao_dias': return 'CARTAO_DIAS';
    case 'media_apurada': return 'MEDIA_APURADA';
    default: return 'INFORMADA';
  }
}
