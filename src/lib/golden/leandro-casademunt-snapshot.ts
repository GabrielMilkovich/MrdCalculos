/**
 * GROUND TRUTH SNAPSHOT — Leandro Casademunt Pereira vs Grupo Casas Bahia S.A.
 * Processo: 0011350-60.2025.5.15.0003
 * Cálculo: 4866
 * PJe-Calc Cidadão v2.13.0 — liquidado em 31/07/2025
 *
 * Fonte: Arquivo .PJC oficial exportado do PJe-Calc
 *
 * Caso de alto valor (R$ 510k líquido), contrato longo (~16 anos),
 * verbas com DOMINGOS E FERIADOS LABORADOS (quantidade importada do calendário),
 * reflexos com MEDIA_PELA_QUANTIDADE, IR RRA significativo.
 */

import type { GoldenSnapshot } from './maria-madalena-snapshot';

export const LEANDRO_CASADEMUNT_SNAPSHOT: GoldenSnapshot = {
  meta: {
    processo: '0011350-60.2025.5.15.0003',
    calculo_id: 4866,
    reclamante: 'LEANDRO CASADEMUNT PEREIRA',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    periodo_calculo_inicio: '2017-11-14',
    periodo_calculo_fim: '2021-08-11',
    data_ajuizamento: '2022-11-14',
    data_liquidacao: '2025-07-31',
    admissao: '2004-12-13',
    demissao: '2021-08-11',
    estado: 'SP',
    municipio: '7145', // Código do município PJe-Calc
    regime: 'INTEGRAL',
    prescricao_quinquenal: false,
    prescricao_trintenaria: false,
    limitar_avos_periodo: false,
    prazo_aviso_previo: 'Calculado',
    projetar_aviso_previo: true,
    considerar_feriados: true,
    zerar_valor_negativo: false,
    considerar_feriados_estaduais: true,
    carga_horaria: 220,
    sabado_dia_util: true,
    pje_calc_version: '2.13.0',
    liquidado_em: '2025-07-31',
  },

  pontos_facultativos: [],
  faltas: [],
  ferias: [],

  // Rubricas serão preenchidas via pjc-analyzer parsing
  rubricas: [],

  resumo: {
    percentual_remuneratorias_tributaveis: 0,
    // Valores extraídos do dadosEstruturados do PJC
    total_bruto_corrigido: 0, // será calculado via parser
    total_bruto_juros: 0,
    total_bruto: 0,
    fgts_total: 0,
    bruto_devido_reclamante: 0,
    deducao_contribuicao_social: 0,
    irpf_reclamante: 58920.35,
    total_descontos: 0,
    liquido_reclamante: 510050.92,
    contribuicao_social_salarios: 108810.40, // inssReclamado from dadosEstruturados
    honorarios_liquidos: 60020.06,
    irrf_honorarios: 0,
    total_reclamado: 0, // será derivado
    honorarios_advogado_nome: 'MARCOS ROBERTO DIAS',
  },

  criterios: {
    correcao: {
      descricao: 'Correção monetária conforme ADC 58/59 STF',
      fases: [],
      source: { page: 0 },
    },
    juros: {
      descricao: 'Juros de mora conforme modulação STF',
      fases: [],
      source: { page: 0 },
    },
    contribuicao_social_empresa_aliquota: 20,
    contribuicao_social_regra: 'PROGRESSIVA',
    imposto_renda_metodo: 'RRA',
    juros_apos_deducao_cs: true,
    aviso_previo_regra: 'APURACAO_CALCULADA',
  },
};

/**
 * Ground truth values extraídos diretamente do cabeçalho XML do PJC
 * Estes são os valores definitivos que o PJe-Calc produziu
 */
export const LEANDRO_GROUND_TRUTH = {
  // gprec (resumo para impressão)
  gprec: {
    liquido_exequente: 510050.92,
    inss_beneficiario: 31229.34,
    inss_executado: 123799.95,
    imposto_renda: 58920.35,
    deposito_fgts: 0,
    custas_judiciais: 1000.00,
    honorarios_marcos_roberto: 60020.06,
  },
  // dadosEstruturados (valores detalhados para integração)
  estruturado: {
    valor_principal: 510050.92,
    inss_reclamante: 46218.89,
    inss_reclamado: 108810.40,
    imposto_renda: 58920.35,
    custas_reclamado: 1000.00,
    custas_reclamante: 0,
    fgts_deposito: 0,
    pensao_alimenticia: 0,
    previdencia_privada: 0,
    honorarios_marcos_roberto: 60020.06,
    ir_honorarios: 0,
  },
  // Dados do contrato
  contrato: {
    reclamante: 'LEANDRO CASADEMUNT PEREIRA',
    cpf: '313.088.228-63',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cnpj: '33.041.260/0001-64',
    admissao: '2004-12-13',
    demissao: '2021-08-11',
    ajuizamento: '2022-11-14',
    inicio_calculo: '2017-11-14',
    fim_calculo: '2021-08-11',
    maior_remuneracao: 8121.69,
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    tipo_calculo: 'ADVOGADO',
    regime: 'INTEGRAL',
    versao_sistema: '2.13.0',
  },
  // Advogados
  advogados: {
    reclamante: [
      { nome: 'MARCOS ROBERTO DIAS', cpf: '005.377.166-45', oab: 'MG87946' },
      { nome: 'DANIELLE CRISTINA VIEIRA DE SOUZA DIAS', cpf: '070.662.896-92', oab: 'MG116893' },
    ],
  },
  // Verbas identificadas no XML
  verbas_conhecidas: [
    { nome: 'DOMINGOS E FERIADOS LABORADOS', tipo: 'Calculada', caracteristica: 'COMUM', variacao: 'VARIAVEL', divisor: 30, multiplicador: 2 },
    { nome: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS LABORADOS', tipo: 'Reflexo', comportamento: 'MEDIA_PELA_QUANTIDADE', periodo_media: 'ANO_CIVIL' },
  ],
};
