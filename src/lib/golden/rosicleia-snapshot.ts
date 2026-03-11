/**
 * GROUND TRUTH SNAPSHOT — Rosicléia Pereira Chaves vs Grupo Casas Bahia S.A.
 * Fonte: Relatório PDF oficial do PJe-Calc Cidadão v2.13.2
 * Processo: 0010736-65.2025.5.03.0140 | Cálculo: 577
 * Liquidado em 28/08/2025 às 17:47:24
 *
 * ATUALIZADO com valores corrigidos do relatório PDF real (valor_corrigido + juros + total).
 * Inclui FGTS 8% e Multa 40% como rubricas do bruto devido.
 *
 * Rubricas exclusivas deste caso:
 * - Intervalo Interjornada (Art. 66 CLT)
 * - Intervalo Intrajornada (Art. 71 CLT)
 * - Prêmio Estímulo
 * - Dif. Comissões Canceladas/Parceladas
 * - Feriados Laborados
 * - RSR Comissionista (com pago parcial)
 * - FGTS 8% + Multa 40%
 *
 * Regime monetário:
 * - Correção: IPCA-E até 06/08/2024, Sem Correção até 29/08/2024, IPCA a partir de 30/08/2024
 * - Juros: TRD pré-judicial até 06/08/2024, SELIC até 29/08/2024, Taxa Legal a partir de 30/08/2024
 * - Juros após dedução da CS (Critério 8)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface RosicleiaGoldenSnapshot {
  meta: {
    processo: string;
    reclamante: string;
    reclamado: string;
    cpf: string;
    cnpj: string;
    admissao: string;
    demissao: string;
    ajuizamento: string;
    data_liquidacao: string;
    inicio_calculo: string;
    termino_calculo: string;
    carga_horaria: number;
    sabado_dia_util: boolean;
    projeta_aviso: boolean;
    feriado_estadual: boolean;
    feriado_municipal: boolean;
    regime: string;
    estado: string;
    municipio: string;
    maior_remuneracao: number;
    prescricao_quinquenal: boolean;
    limitar_avos: boolean;
    zera_negativo: boolean;
    pje_calc_version: string;
    /** Percentual de parcelas remuneratórias e tributáveis */
    percentual_remuneratorio: number;
    /** Regime de correção em 3 fases */
    correcao_fases: Array<{ indice: string; ate?: string; a_partir_de?: string }>;
    /** Regime de juros em 3 fases */
    juros_fases: Array<{ tipo: string; ate?: string; a_partir_de?: string }>;
  };

  faltas: Array<{
    inicio: string;
    fim: string;
    justificada: boolean;
    justificativa: string;
  }>;

  ferias: Array<{
    relativa: string;
    dias: number;
    situacao: string;
    gozo_inicio?: string;
    gozo_fim?: string;
  }>;

  rubricas: GoldenRubrica[];

  resumo: {
    /** Bruto total (todas as rubricas incluindo FGTS) */
    bruto_total: number;
    /** Total valor corrigido (sem juros) */
    total_valor_corrigido: number;
    /** Total juros */
    total_juros: number;
    /** Líquido devido ao reclamante */
    liquido_exequente: number;
    /** FGTS total (8% + multa) */
    fgts_total: number;
    /** INSS reclamante (deduzido do bruto) */
    inss_reclamante: number;
    /** INSS reclamado (CS sobre salários devidos) */
    inss_reclamado: number;
    /** CS total (segurado + patronal) */
    cs_total: number;
    /** Imposto de renda */
    imposto_renda: number;
    /** Total descontos */
    total_descontos: number;
    /** Honorários */
    honorarios_nome: string;
    honorarios_cpf: string;
    honorarios_valor: number;
    /** Total devido pelo reclamado */
    total_reclamado: number;
    custas: number;
  };
}

/**
 * Ground truth extraído do relatório PDF oficial do PJe-Calc
 * Todos os valores são CORRIGIDOS (pós-correção monetária + juros)
 */
export const ROSICLEIA_SNAPSHOT: RosicleiaGoldenSnapshot = {
  meta: {
    processo: '0010736-65.2025.5.03.0140',
    reclamante: 'ROSICLEIA PEREIRA CHAVES',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '100.233.396-24',
    cnpj: '33041260065290',
    admissao: '2018-06-06',
    demissao: '2024-07-04',
    ajuizamento: '2024-08-07',
    data_liquidacao: '2025-08-31',
    inicio_calculo: '2019-08-07',
    termino_calculo: '2024-07-04',
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    feriado_estadual: true,
    feriado_municipal: false,
    regime: 'INTEGRAL',
    estado: 'MG',
    municipio: 'BELO HORIZONTE',
    maior_remuneracao: 3000,
    prescricao_quinquenal: false,
    limitar_avos: false,
    zera_negativo: false,
    pje_calc_version: '2.13.2',
    percentual_remuneratorio: 88.39,
    correcao_fases: [
      { indice: 'IPCA-E', ate: '2024-08-06' },
      { indice: 'Sem Correção', ate: '2024-08-29' },
      { indice: 'IPCA', a_partir_de: '2024-08-30' },
    ],
    juros_fases: [
      { tipo: 'TRD', ate: '2024-08-06' },
      { tipo: 'SELIC', ate: '2024-08-29' },
      { tipo: 'Taxa Legal', a_partir_de: '2024-08-30' },
    ],
  },

  faltas: [
    { inicio: '2023-01-16', fim: '2023-07-14', justificada: true, justificativa: 'LICENÇA MATERNIDADE' },
  ],

  ferias: [
    { relativa: '2018/2019', dias: 30, situacao: 'GOZADAS', gozo_inicio: '2019-12-02', gozo_fim: '2019-12-31' },
    { relativa: '2019/2020', dias: 30, situacao: 'GOZADAS', gozo_inicio: '2020-09-10', gozo_fim: '2020-10-09' },
    { relativa: '2020/2021', dias: 30, situacao: 'GOZADAS', gozo_inicio: '2021-06-07', gozo_fim: '2021-07-06' },
    { relativa: '2021/2022', dias: 30, situacao: 'GOZADAS', gozo_inicio: '2022-06-06', gozo_fim: '2022-07-05' },
    { relativa: '2022/2023', dias: 30, situacao: 'GOZADAS', gozo_inicio: '2023-07-17', gozo_fim: '2023-08-15' },
    { relativa: '2023/2024', dias: 30, situacao: 'INDENIZADAS' },
  ],

  // ═══════════════════════════════════════════════════
  // RUBRICAS — Ground Truth do relatório PDF oficial
  // Valores = valor_corrigido + juros = total (pós-correção)
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === CALCULADAS (8 verbas principais) ===
    { codigo: 'DIF_COMISSOES_CANCELADAS', descricao: 'DIF. COMISSÕES - CANCELADAS', valor_corrigido: 8729.46, juros: 757.61, total: 9487.07, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'DIF_COMISSOES_PARCELADAS', descricao: 'DIF. COMISSÕES - PARCELADAS', valor_corrigido: 43996.80, juros: 3818.36, total: 47815.16, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 56008.60, juros: 4860.85, total: 60869.45, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIADOS_LABORADOS', descricao: 'FERIADOS LABORADOS', valor_corrigido: 5340.73, juros: 453.33, total: 5794.06, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 29724.94, juros: 2609.46, total: 32334.40, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 10020.90, juros: 830.89, total: 10851.79, tipo: 'PRINCIPAL', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 522.44, juros: 47.78, total: 570.22, tipo: 'PRINCIPAL', source: { page: 2, line: 'PDF-resumo' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 8469.93, juros: 750.10, total: 9220.03, tipo: 'PRINCIPAL', source: { page: 2, line: 'PDF-resumo' } },

    // === REFLEXOS: 13º SALÁRIO ===
    { codigo: '13_DIF_COMISSOES_CANCELADAS', descricao: '13º SALÁRIO SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 740.47, juros: 63.15, total: 803.62, tipo: 'REFLEXO_13', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: '13_DIF_COMISSOES_PARCELADAS', descricao: '13º SALÁRIO SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 3732.05, juros: 318.34, total: 4050.39, tipo: 'REFLEXO_13', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: '13_PREMIO_ESTIMULO', descricao: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 4750.93, juros: 405.25, total: 5156.18, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: '13_FERIADOS_LABORADOS', descricao: '13º SALÁRIO SOBRE FERIADOS LABORADOS', valor_corrigido: 312.89, juros: 28.50, total: 341.39, tipo: 'REFLEXO_13', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 2214.34, juros: 195.77, total: 2410.11, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: '13_RSR_COMISSIONISTA', descricao: '13º SALÁRIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 840.78, juros: 67.79, total: 908.57, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PDF-resumo' } },

    // === REFLEXOS: AVISO PRÉVIO ===
    { codigo: 'AP_DIF_COMISSOES_CANCELADAS', descricao: 'AVISO PRÉVIO SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 310.68, juros: 20.95, total: 331.63, tipo: 'REFLEXO_AP', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'AP_DIF_COMISSOES_PARCELADAS', descricao: 'AVISO PRÉVIO SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 1565.79, juros: 105.60, total: 1671.39, tipo: 'REFLEXO_AP', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'AP_PREMIO_ESTIMULO', descricao: 'AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 1993.28, juros: 134.43, total: 2127.71, tipo: 'REFLEXO_AP', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'AP_FERIADOS_LABORADOS', descricao: 'AVISO PRÉVIO SOBRE FERIADOS LABORADOS', valor_corrigido: 169.90, juros: 11.46, total: 181.36, tipo: 'REFLEXO_AP', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'AP_HORAS_EXTRAS', descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', valor_corrigido: 821.13, juros: 55.38, total: 876.51, tipo: 'REFLEXO_AP', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'AP_RSR_COMISSIONISTA', descricao: 'AVISO PRÉVIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 437.79, juros: 29.53, total: 467.32, tipo: 'REFLEXO_AP', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PDF-resumo' } },

    // === REFLEXOS: FÉRIAS + 1/3 ===
    { codigo: 'FERIAS_DIF_COMISSOES_CANCELADAS', descricao: 'FÉRIAS + 1/3 SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 1126.89, juros: 95.66, total: 1222.55, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIAS_DIF_COMISSOES_PARCELADAS', descricao: 'FÉRIAS + 1/3 SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 5679.47, juros: 482.12, total: 6161.59, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIAS_PREMIO_ESTIMULO', descricao: 'FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 7230.06, juros: 613.75, total: 7843.81, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIAS_FERIADOS_LABORADOS', descricao: 'FÉRIAS + 1/3 SOBRE FERIADOS LABORADOS', valor_corrigido: 425.89, juros: 36.34, total: 462.23, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIAS_HORAS_EXTRAS', descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', valor_corrigido: 2823.41, juros: 243.16, total: 3066.57, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'FERIAS_RSR_COMISSIONISTA', descricao: 'FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)', valor_corrigido: 1090.82, juros: 87.43, total: 1178.25, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 2, line: 'PDF-resumo' } },

    // === REFLEXOS: RSR (REPOUSO SEMANAL REMUNERADO E FERIADO) ===
    { codigo: 'RSR_DIF_COMISSOES_CANCELADAS', descricao: 'RSR SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 1896.76, juros: 164.18, total: 2060.94, tipo: 'REFLEXO_RSR', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'RSR_DIF_COMISSOES_PARCELADAS', descricao: 'RSR SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 9559.39, juros: 827.31, total: 10386.70, tipo: 'REFLEXO_RSR', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'RSR_PREMIO_ESTIMULO', descricao: 'RSR SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 12169.21, juros: 1053.21, total: 13222.42, tipo: 'REFLEXO_RSR', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PDF-resumo' } },
    { codigo: 'RSR_HORAS_EXTRAS', descricao: 'RSR SOBRE HORAS EXTRAS', valor_corrigido: 6573.72, juros: 574.39, total: 7148.11, tipo: 'REFLEXO_RSR', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PDF-resumo' } },

    // === FGTS (como rubricas do bruto) ===
    { codigo: 'FGTS_8', descricao: 'FGTS 8%', valor_corrigido: 13060.11, juros: 1229.44, total: 14289.55, tipo: 'FGTS', source: { page: 2, line: 'PDF-resumo' } },
    { codigo: 'MULTA_FGTS_40', descricao: 'MULTA SOBRE FGTS 40%', valor_corrigido: 5210.03, juros: 348.20, total: 5558.23, tipo: 'FGTS', source: { page: 2, line: 'PDF-resumo' } },
  ],

  resumo: {
    bruto_total: 268869.31,
    total_valor_corrigido: 247549.59,
    total_juros: 21319.72,
    liquido_exequente: 247215.95,
    fgts_total: 19847.78,
    inss_reclamante: 0, // Deduzido dentro dos descontos totais
    inss_reclamado: 0,
    cs_total: 76699.95,
    imposto_renda: 4185.26,
    total_descontos: 21653.36,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 26886.93,
    total_reclamado: 354988.09,
    custas: 0,
  },
};
