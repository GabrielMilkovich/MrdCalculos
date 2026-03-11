/**
 * GROUND TRUTH SNAPSHOT — Rosicléia Pereira Chaves vs Grupo Casas Bahia S.A.
 * Fonte: Arquivo .PJC real (rosicleia-pereira-chaves.pjc)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 09/03/2026
 *
 * Este caso exercita rubricas adicionais que não existem no caso Maria Madalena:
 * - Intervalo Interjornada (Art. 66 CLT)
 * - Intervalo Intrajornada (Art. 71 CLT)
 * - Prêmio Estímulo
 * - Multa Art. 477 CLT (como reflexo sobre cada verba principal)
 * - Dif. Comissões Canceladas/Parceladas
 * - Feriados Laborados
 * - RSR Comissionista (com pago parcial)
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
    pje_calc_version: string;
    zera_negativo: boolean;
    prescricao_quinquenal: boolean;
    prescricao_fgts: boolean;
    limitar_avos: boolean;
  };

  faltas: never[]; // Sem faltas neste caso

  ferias: Array<{
    dias: number;
    situacao: string;
  }>;

  rubricas: GoldenRubrica[];

  resumo: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    fgts_deposito: number;
    honorarios_nome: string;
    honorarios_cpf: string;
    honorarios_valor: number;
    custas: number;
  };
}

/**
 * Ground truth extraído do arquivo .PJC real da Rosicléia
 * Todos os valores "devido" são nominais (antes de correção/juros)
 * extraídos da soma das ocorrências de cada verba
 */
export const ROSICLEIA_SNAPSHOT: RosicleiaGoldenSnapshot = {
  meta: {
    processo: '', // Não consta no PJC
    reclamante: 'ROSICLEIA PEREIRA CHAVES',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '100.233.396-24',
    cnpj: '33041260065290',
    admissao: '2018-06-06',
    demissao: '2024-07-04',
    ajuizamento: '2024-08-07',
    inicio_calculo: '2019-08-07',
    termino_calculo: '2024-07-04',
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    feriado_estadual: true,
    feriado_municipal: true,
    regime: 'INTEGRAL',
    indices_acumulados: 'MES_SUBSEQUENTE_AO_VENCIMENTO',
    dia_fechamento: 31,
    pje_calc_version: '2.13.2',
    zera_negativo: false,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    limitar_avos: false,
  },

  faltas: [],

  ferias: [
    { dias: 30, situacao: 'GOZADAS' },
    { dias: 30, situacao: 'GOZADAS' },
    { dias: 30, situacao: 'GOZADAS' },
    { dias: 30, situacao: 'GOZADAS' },
    { dias: 30, situacao: 'GOZADAS' },
    { dias: 30, situacao: 'INDENIZADAS' },
  ],

  // ═══════════════════════════════════════════════════
  // RUBRICAS — Ground Truth do PJC
  // Valores "devido" = soma nominal de ocorrências (pré-correção)
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === CALCULADAS (8 verbas principais) ===
    { codigo: 'DIF_COMISSOES_CANCELADAS', descricao: 'DIF. COMISSÕES - CANCELADAS', valor_corrigido: 0, juros: 0, total: 7191.89, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DIF_COMISSOES_PARCELADAS', descricao: 'DIF. COMISSÕES - PARCELADAS', valor_corrigido: 0, juros: 0, total: 36247.16, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 46143.22, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIADOS_LABORADOS', descricao: 'FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 46143.22, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 24247.17, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 8090.68, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-dif(devido-pago)' } },
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 392.05, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 6881.91, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO ===
    { codigo: '13_DIF_COMISSOES_CANCELADAS', descricao: '13º SALÁRIO SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 0, juros: 0, total: 7191.89, tipo: 'REFLEXO_13', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_DIF_COMISSOES_PARCELADAS', descricao: '13º SALÁRIO SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 0, juros: 0, total: 36247.16, tipo: 'REFLEXO_13', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_PREMIO_ESTIMULO', descricao: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 4010.04, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_FERIADOS_LABORADOS', descricao: '13º SALÁRIO SOBRE FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 46143.22, tipo: 'REFLEXO_13', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 24247.17, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_RSR_COMISSIONISTA', descricao: '13º SALÁRIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 8090.68, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-dif' } },
    { codigo: '13_INTERJORNADAS', descricao: '13º SALÁRIO SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 392.05, tipo: 'REFLEXO_13', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 6881.91, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: AVISO PRÉVIO ===
    { codigo: 'AP_DIF_COMISSOES_CANCELADAS', descricao: 'AVISO PRÉVIO SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 0, juros: 0, total: 296.56, tipo: 'REFLEXO_AP', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_DIF_COMISSOES_PARCELADAS', descricao: 'AVISO PRÉVIO SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 0, juros: 0, total: 1494.64, tipo: 'REFLEXO_AP', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_PREMIO_ESTIMULO', descricao: 'AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 1902.70, tipo: 'REFLEXO_AP', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_FERIADOS_LABORADOS', descricao: 'AVISO PRÉVIO SOBRE FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 162.18, tipo: 'REFLEXO_AP', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_HORAS_EXTRAS', descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 783.82, tipo: 'REFLEXO_AP', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_RSR_COMISSIONISTA', descricao: 'AVISO PRÉVIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 417.90, tipo: 'REFLEXO_AP', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: FÉRIAS + 1/3 ===
    { codigo: 'FERIAS_DIF_COMISSOES_CANCELADAS', descricao: 'FÉRIAS + 1/3 SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 0, juros: 0, total: 952.76, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_DIF_COMISSOES_PARCELADAS', descricao: 'FÉRIAS + 1/3 SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 0, juros: 0, total: 4801.83, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_PREMIO_ESTIMULO', descricao: 'FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 6112.81, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_FERIADOS_LABORADOS', descricao: 'FÉRIAS + 1/3 SOBRE FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 356.90, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HORAS_EXTRAS', descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 2385.15, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_RSR_COMISSIONISTA', descricao: 'FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 957.60, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: RSR ===
    { codigo: 'RSR_DIF_COMISSOES_CANCELADAS', descricao: 'RSR SOBRE DIF. COMISSÕES - CANCELADAS', valor_corrigido: 0, juros: 0, total: 1563.32, tipo: 'REFLEXO_RSR', rubrica_principal: 'DIF_COMISSOES_CANCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_DIF_COMISSOES_PARCELADAS', descricao: 'RSR SOBRE DIF. COMISSÕES - PARCELADAS', valor_corrigido: 0, juros: 0, total: 7878.87, tipo: 'REFLEXO_RSR', rubrica_principal: 'DIF_COMISSOES_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_PREMIO_ESTIMULO', descricao: 'RSR SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 10029.91, tipo: 'REFLEXO_RSR', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_HORAS_EXTRAS', descricao: 'RSR SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 5370.97, tipo: 'REFLEXO_RSR', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },

    // === MULTA ART 477 (reflexos zerados no PJC — todos devido=0) ===
    // As multas 477 estão configuradas mas sem valor neste caso
  ],

  resumo: {
    liquido_exequente: 247215.95,
    inss_reclamante: 23475.40,
    inss_reclamado: 53224.55,
    imposto_renda: 4185.26,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 26886.93,
    custas: 0,
  },
};
