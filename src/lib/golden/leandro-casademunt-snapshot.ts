/**
 * GROUND TRUTH SNAPSHOT — Leandro Casademunt Pereira vs Grupo Casas Bahia S.A.
 * Processo: 0011350-60.2025.5.15.0003
 * Cálculo: 4866
 * PJe-Calc Cidadão v2.13.0 — liquidado em 25/07/2025 às 10:23:20
 *
 * Fonte: PDF relatório oficial (86 páginas) + arquivo .PJC
 *
 * Perfil: Contrato longo (~16 anos), alto valor (R$ 510k líquido),
 * HE parte fixa + variável, RSR, intrajornada, interjornada,
 * domingos/feriados, reflexos 13º/AP/Férias com MEDIA_PELA_QUANTIDADE,
 * IR RRA significativo (R$ 58.920,35).
 */

import type { GoldenSnapshot, GoldenRubrica, GoldenFalta, GoldenFerias } from './maria-madalena-snapshot';

// =====================================================
// RUBRICAS EXTRAÍDAS DO RESUMO — PÁGINA 1 DO PDF
// =====================================================
const RUBRICAS: GoldenRubrica[] = [
  // ---- PRINCIPALS ----
  {
    codigo: 'DOMINGOS_FERIADOS',
    descricao: 'DOMINGOS E FERIADOS LABORADOS',
    valor_corrigido: 30257.25,
    juros: 8668.29,
    total: 38925.54,
    tipo: 'PRINCIPAL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'HE_PARTE_FIXA',
    descricao: 'HORAS EXTRAS - PARTE FIXA',
    valor_corrigido: 217026.39,
    juros: 61703.28,
    total: 278729.67,
    tipo: 'PRINCIPAL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'HE_PARTE_VARIAVEL',
    descricao: 'HORAS EXTRAS - PARTE VARIÁVEL',
    valor_corrigido: 17793.29,
    juros: 5079.06,
    total: 22872.35,
    tipo: 'PRINCIPAL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'INTERJORNADAS',
    descricao: 'INTERVALO INTERJORNADAS',
    valor_corrigido: 19471.37,
    juros: 5611.34,
    total: 25082.71,
    tipo: 'PRINCIPAL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'INTRAJORNADA',
    descricao: 'INTERVALO INTRAJORNADA',
    valor_corrigido: 32889.08,
    juros: 9352.46,
    total: 42241.54,
    tipo: 'PRINCIPAL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  // ---- REFLEXOS 13º ----
  {
    codigo: '13_DOM_FER',
    descricao: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS LABORADOS',
    valor_corrigido: 2518.39,
    juros: 707.24,
    total: 3225.63,
    tipo: 'REFLEXO_13',
    rubrica_principal: 'DOMINGOS_FERIADOS',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: '13_HE_FIXA',
    descricao: '13º SALÁRIO SOBRE HORAS EXTRAS - PARTE FIXA',
    valor_corrigido: 18344.78,
    juros: 5149.17,
    total: 23493.95,
    tipo: 'REFLEXO_13',
    rubrica_principal: 'HE_PARTE_FIXA',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: '13_HE_VAR',
    descricao: '13º SALÁRIO SOBRE HORAS EXTRAS - PARTE VARIÁVEL',
    valor_corrigido: 1473.29,
    juros: 414.10,
    total: 1887.39,
    tipo: 'REFLEXO_13',
    rubrica_principal: 'HE_PARTE_VARIAVEL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  // ---- REFLEXOS AVISO PRÉVIO ----
  {
    codigo: 'AP_DOM_FER',
    descricao: 'AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS LABORADOS',
    valor_corrigido: 1523.25,
    juros: 468.82,
    total: 1992.07,
    tipo: 'REFLEXO_AP',
    rubrica_principal: 'DOMINGOS_FERIADOS',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'AP_HE_FIXA',
    descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS - PARTE FIXA',
    valor_corrigido: 10789.98,
    juros: 3320.91,
    total: 14110.89,
    tipo: 'REFLEXO_AP',
    rubrica_principal: 'HE_PARTE_FIXA',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'AP_HE_VAR',
    descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS - PARTE VARIÁVEL',
    valor_corrigido: 727.44,
    juros: 223.89,
    total: 951.33,
    tipo: 'REFLEXO_AP',
    rubrica_principal: 'HE_PARTE_VARIAVEL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  // ---- REFLEXOS FÉRIAS ----
  {
    codigo: 'FER_DOM_FER',
    descricao: 'FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS LABORADOS',
    valor_corrigido: 3268.02,
    juros: 938.98,
    total: 4207.00,
    tipo: 'REFLEXO_FERIAS',
    rubrica_principal: 'DOMINGOS_FERIADOS',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'FER_HE_FIXA',
    descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS - PARTE FIXA',
    valor_corrigido: 23884.52,
    juros: 6868.43,
    total: 30752.95,
    tipo: 'REFLEXO_FERIAS',
    rubrica_principal: 'HE_PARTE_FIXA',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'FER_HE_VAR',
    descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS - PARTE VARIÁVEL',
    valor_corrigido: 1832.60,
    juros: 526.27,
    total: 2358.87,
    tipo: 'REFLEXO_FERIAS',
    rubrica_principal: 'HE_PARTE_VARIAVEL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  // ---- REFLEXOS RSR ----
  {
    codigo: 'RSR_HE_FIXA',
    descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE HORAS EXTRAS - PARTE FIXA',
    valor_corrigido: 45251.50,
    juros: 12874.63,
    total: 58126.13,
    tipo: 'REFLEXO_RSR',
    rubrica_principal: 'HE_PARTE_FIXA',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'RSR_HE_VAR',
    descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE HORAS EXTRAS - PARTE VARIÁVEL',
    valor_corrigido: 3692.60,
    juros: 1054.63,
    total: 4747.23,
    tipo: 'REFLEXO_RSR',
    rubrica_principal: 'HE_PARTE_VARIAVEL',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  // ---- FGTS ----
  {
    codigo: 'FGTS_8',
    descricao: 'FGTS 8%',
    valor_corrigido: 25394.96,
    juros: 7816.01,
    total: 33210.97,
    tipo: 'FGTS',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
  {
    codigo: 'MULTA_FGTS_40',
    descricao: 'MULTA SOBRE FGTS 40%',
    valor_corrigido: 10157.99,
    juros: 3126.40,
    total: 13284.39,
    tipo: 'MULTA_FGTS',
    source: { page: 1, line: 'Resumo do Cálculo' },
  },
];

// =====================================================
// FALTAS — PÁGINA 3 DO PDF
// =====================================================
const FALTAS: GoldenFalta[] = [
  {
    inicio: '2020-10-28',
    fim: '2020-11-10',
    justificada: false,
    justificativa: 'ATESTADO MÉDICO',
    source: { page: 3 },
  },
];

// =====================================================
// FÉRIAS — PÁGINAS 3-4 DO PDF (16 períodos)
// =====================================================
const FERIAS: GoldenFerias[] = [
  { relativa: '2004/2005', periodo_aquisitivo_inicio: '2004-12-13', periodo_aquisitivo_fim: '2005-12-12', periodo_concessivo_inicio: '2005-12-13', periodo_concessivo_fim: '2006-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2006-11-13', gozo1_fim: '2006-12-12', source: { page: 3 } },
  { relativa: '2005/2006', periodo_aquisitivo_inicio: '2005-12-13', periodo_aquisitivo_fim: '2006-12-12', periodo_concessivo_inicio: '2006-12-13', periodo_concessivo_fim: '2007-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2007-11-13', gozo1_fim: '2007-12-12', source: { page: 3 } },
  { relativa: '2006/2007', periodo_aquisitivo_inicio: '2006-12-13', periodo_aquisitivo_fim: '2007-12-12', periodo_concessivo_inicio: '2007-12-13', periodo_concessivo_fim: '2008-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2008-11-13', gozo1_fim: '2008-12-12', source: { page: 3 } },
  { relativa: '2007/2008', periodo_aquisitivo_inicio: '2007-12-13', periodo_aquisitivo_fim: '2008-12-12', periodo_concessivo_inicio: '2008-12-13', periodo_concessivo_fim: '2009-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2009-11-13', gozo1_fim: '2009-12-12', source: { page: 3 } },
  { relativa: '2008/2009', periodo_aquisitivo_inicio: '2008-12-13', periodo_aquisitivo_fim: '2009-12-12', periodo_concessivo_inicio: '2009-12-13', periodo_concessivo_fim: '2010-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2010-11-13', gozo1_fim: '2010-12-12', source: { page: 3 } },
  { relativa: '2009/2010', periodo_aquisitivo_inicio: '2009-12-13', periodo_aquisitivo_fim: '2010-12-12', periodo_concessivo_inicio: '2010-12-13', periodo_concessivo_fim: '2011-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2011-11-13', gozo1_fim: '2011-12-12', source: { page: 3 } },
  { relativa: '2010/2011', periodo_aquisitivo_inicio: '2010-12-13', periodo_aquisitivo_fim: '2011-12-12', periodo_concessivo_inicio: '2011-12-13', periodo_concessivo_fim: '2012-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2012-08-01', gozo1_fim: '2012-08-30', source: { page: 3 } },
  { relativa: '2011/2012', periodo_aquisitivo_inicio: '2011-12-13', periodo_aquisitivo_fim: '2012-12-12', periodo_concessivo_inicio: '2012-12-13', periodo_concessivo_fim: '2013-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2013-07-01', gozo1_fim: '2013-07-30', source: { page: 3 } },
  { relativa: '2012/2013', periodo_aquisitivo_inicio: '2012-12-13', periodo_aquisitivo_fim: '2013-12-12', periodo_concessivo_inicio: '2013-12-13', periodo_concessivo_fim: '2014-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2014-02-03', gozo1_fim: '2014-03-04', source: { page: 3 } },
  { relativa: '2013/2014', periodo_aquisitivo_inicio: '2013-12-13', periodo_aquisitivo_fim: '2014-12-12', periodo_concessivo_inicio: '2014-12-13', periodo_concessivo_fim: '2015-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2015-02-02', gozo1_fim: '2015-03-03', source: { page: 3 } },
  { relativa: '2014/2015', periodo_aquisitivo_inicio: '2014-12-13', periodo_aquisitivo_fim: '2015-12-12', periodo_concessivo_inicio: '2015-12-13', periodo_concessivo_fim: '2016-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2016-07-01', gozo1_fim: '2016-07-30', source: { page: 4 } },
  { relativa: '2015/2016', periodo_aquisitivo_inicio: '2015-12-13', periodo_aquisitivo_fim: '2016-12-12', periodo_concessivo_inicio: '2016-12-13', periodo_concessivo_fim: '2017-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2017-04-03', gozo1_fim: '2017-05-02', source: { page: 4 } },
  { relativa: '2016/2017', periodo_aquisitivo_inicio: '2016-12-13', periodo_aquisitivo_fim: '2017-12-12', periodo_concessivo_inicio: '2017-12-13', periodo_concessivo_fim: '2018-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2018-02-05', gozo1_fim: '2018-03-06', source: { page: 4 } },
  { relativa: '2017/2018', periodo_aquisitivo_inicio: '2017-12-13', periodo_aquisitivo_fim: '2018-12-12', periodo_concessivo_inicio: '2018-12-13', periodo_concessivo_fim: '2019-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2019-02-04', gozo1_fim: '2019-03-05', source: { page: 4 } },
  { relativa: '2018/2019', periodo_aquisitivo_inicio: '2018-12-13', periodo_aquisitivo_fim: '2019-12-12', periodo_concessivo_inicio: '2019-12-13', periodo_concessivo_fim: '2020-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2020-02-03', gozo1_fim: '2020-03-03', source: { page: 4 } },
  { relativa: '2019/2020', periodo_aquisitivo_inicio: '2019-12-13', periodo_aquisitivo_fim: '2020-12-12', periodo_concessivo_inicio: '2020-12-13', periodo_concessivo_fim: '2021-12-12', prazo: 30, situacao: 'Gozadas', abono: false, gozo1_inicio: '2021-06-01', gozo1_fim: '2021-06-30', source: { page: 4 } },
];

// =====================================================
// SNAPSHOT COMPLETO
// =====================================================
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
    municipio: 'SOROCABA',
    regime: 'Tempo Integral',
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
    liquidado_em: '2025-07-25T10:23:20',
  },

  pontos_facultativos: [
    { nome: 'CORPUS CHRISTI', abrangencia: 'Nacional' },
    { nome: 'CARNAVAL', abrangencia: 'Nacional' },
    { nome: 'SEXTA-FEIRA SANTA', abrangencia: 'Nacional' },
  ],

  faltas: FALTAS,
  ferias: FERIAS,
  rubricas: RUBRICAS,

  resumo: {
    percentual_remuneratorias_tributaveis: 88.28,
    total_bruto_corrigido: 466296.70,
    total_bruto_juros: 133903.91,
    total_bruto: 600200.61,
    fgts_total: 46495.36,
    bruto_devido_reclamante: 600200.61,
    deducao_contribuicao_social: 0, // CS is deducted, see total_descontos
    irpf_reclamante: 58920.35,
    total_descontos: 90149.69,
    liquido_reclamante: 510050.92,
    contribuicao_social_salarios: 155029.29,
    honorarios_liquidos: 60020.06,
    irrf_honorarios: 0,
    total_reclamado: 785020.62,
    honorarios_advogado_nome: 'MARCOS ROBERTO DIAS',
  },

  criterios: {
    correcao: {
      descricao: "Valores corrigidos pelo índice 'IPCA-E' até 13/11/2022 e pelo índice 'Sem Correção' a partir de 14/11/2022, acumulados a partir do mês subsequente ao vencimento, conforme súmula nº 381 do TST.",
      fases: [
        { indice: 'IPCA-E', ate: '2022-11-13' },
        { indice: 'SEM_CORRECAO', a_partir: '2022-11-14' },
      ],
      source: { page: 2 },
    },
    juros: {
      descricao: "Juros apurados desde o vencimento das verbas vencidas, em fase pré-judicial, conforme decisão do STF na ADC 58; juros simples TRD até 13/11/2022; e juros SELIC a partir de 14/11/2022.",
      fases: [
        { tipo: 'TRD', ate: '2022-11-13' },
        { tipo: 'SELIC', a_partir: '2022-11-14' },
      ],
      source: { page: 2 },
    },
    contribuicao_social_empresa_aliquota: 20,
    contribuicao_social_regra: 'SUMULA_368_TST',
    imposto_renda_metodo: 'RRA',
    juros_apos_deducao_cs: true,
    aviso_previo_regra: 'LEI_12506_2011',
  },
};

/**
 * Ground truth values extraídos diretamente do cabeçalho XML do PJC
 */
export const LEANDRO_GROUND_TRUTH = {
  gprec: {
    liquido_exequente: 510050.92,
    inss_beneficiario: 31229.34,
    inss_executado: 123799.95,
    imposto_renda: 58920.35,
    deposito_fgts: 0,
    custas_judiciais: 1000.00,
    honorarios_marcos_roberto: 60020.06,
  },
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
  advogados: {
    reclamante: [
      { nome: 'MARCOS ROBERTO DIAS', cpf: '005.377.166-45', oab: 'MG87946' },
      { nome: 'DANIELLE CRISTINA VIEIRA DE SOUZA DIAS', cpf: '070.662.896-92', oab: 'MG116893' },
    ],
  },
};
