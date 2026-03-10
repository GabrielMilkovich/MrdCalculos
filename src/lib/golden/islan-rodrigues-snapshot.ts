/**
 * GROUND TRUTH SNAPSHOT — Islan Rodrigues Pereira vs Grupo Casas Bahia S.A.
 * Fonte: Arquivo .PJC real (islan-rodrigues.pjc)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 10/03/2026
 *
 * Rubricas exercitadas:
 * - Vendas Não Faturadas (variável, mult 0.3)
 * - Domingo (variável, base composta com Vendas NF, mult 0.3)
 * - Horas Extras (comissionista, divisor CARGA_HORARIA, mult 0.6)
 * - RSR Comissionista (divisor DIAS_UTEIS, pago CALCULADO)
 * - Intervalo Interjornadas (Art. 66, mult 1.5)
 * - Intervalo Intrajornada (Art. 71, mult 1.5)
 * - Reflexos: 13º (MEDIA_PELA_QUANTIDADE e MEDIA_PELO_VALOR_CORRIGIDO)
 * - Reflexos: Férias (MEDIA_PELA_QUANTIDADE e MEDIA_PELO_VALOR_CORRIGIDO)
 * - Reflexos: RSR sobre Vendas e HE (VALOR_MENSAL)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface IslanRodriguesGoldenSnapshot {
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
  faltas: never[];
  ferias: never[];
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

export const ISLAN_RODRIGUES_SNAPSHOT: IslanRodriguesGoldenSnapshot = {
  meta: {
    processo: '0000064-XX.2023.5.05.0531',
    reclamante: 'ISLAN RODRIGUES PEREIRA',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '030.997.935-82',
    cnpj: '33041260000164',
    admissao: '2021-05-21',
    demissao: '2022-01-03',
    ajuizamento: '2023-02-01',
    inicio_calculo: '2021-05-21',
    termino_calculo: '2022-01-03',
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
  ferias: [],

  rubricas: [
    // === CALCULADAS (6) ===
    { codigo: 'VENDAS_NAO_FATURADAS', descricao: 'VENDAS NÃO FATURAS', valor_corrigido: 0, juros: 0, total: 2447.23, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DOMINGO', descricao: 'DOMINGO', valor_corrigido: 0, juros: 0, total: 2447.23, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 789.45, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 991.35, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-dif(devido-pago)' } },
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 9.48, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 934.74, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO ===
    { codigo: '13_DOMINGO', descricao: '13º SALÁRIO SOBRE DOMINGO', valor_corrigido: 0, juros: 0, total: 2447.23, tipo: 'REFLEXO_13', rubrica_principal: 'DOMINGO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 789.45, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_RSR_COMISSIONISTA', descricao: '13º SALÁRIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 991.35, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-dif' } },
    { codigo: '13_VENDAS_NAO_FATURADAS', descricao: '13º SALÁRIO SOBRE VENDAS NÃO FATURAS', valor_corrigido: 0, juros: 0, total: 183.91, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: FÉRIAS + 1/3 ===
    { codigo: 'FERIAS_DOMINGO', descricao: 'FÉRIAS + 1/3 SOBRE DOMINGO', valor_corrigido: 0, juros: 0, total: 7.87, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DOMINGO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HORAS_EXTRAS', descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 72.81, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_RSR_COMISSIONISTA', descricao: 'FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 102.04, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_NAO_FATURADAS', descricao: 'FÉRIAS + 1/3 SOBRE VENDAS NÃO FATURAS', valor_corrigido: 0, juros: 0, total: 275.72, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: RSR ===
    { codigo: 'RSR_VENDAS_NAO_FATURADAS', descricao: 'RSR SOBRE VENDAS NÃO FATURAS', valor_corrigido: 0, juros: 0, total: 571.81, tipo: 'REFLEXO_RSR', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_HORAS_EXTRAS', descricao: 'RSR SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 163.38, tipo: 'REFLEXO_RSR', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 9974.39,
    inss_reclamante: 697.18,
    inss_reclamado: 2023.78,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 1045.49,
    custas: 500,
  },
};

/**
 * Particularidades deste caso (engenharia reversa):
 *
 * 1. VENDAS NÃO FATURADAS:
 *    - Base: HISTORICO_SALARIAL (tabela salarial)
 *    - Divisor: 1 (sem divisão)
 *    - Multiplicador: 0.3 (30%)
 *    - Quantidade: 1 (informada)
 *    - Pago: 0 (informado)
 *
 * 2. DOMINGO:
 *    - Base: HISTORICO_SALARIAL + VENDAS NÃO FATURADAS (composta)
 *    - Mesma fórmula (div=1, mult=0.3, qtd=1)
 *
 * 3. HORAS EXTRAS (comissionista):
 *    - Divisor: CARGA_HORARIA (220)
 *    - Multiplicador: 0.6 (60% — adicional específico)
 *    - Quantidade: IMPORTADA_DO_CARTAO
 *
 * 4. RSR COMISSIONISTA:
 *    - Divisor: DIAS_UTEIS
 *    - Multiplicador: 1
 *    - Quantidade: IMPORTADA_DO_CALENDARIO
 *    - Valor Pago: CALCULADO (não informado)
 *
 * 5. INTERJORNADAS / INTRAJORNADA:
 *    - Divisor: CARGA_HORARIA
 *    - Multiplicador: 1.5 (hora + 50%)
 *    - Quantidade: IMPORTADA_DO_CARTAO
 *
 * 6. Contrato curto: ~7 meses (mai/2021 - jan/2022)
 * 7. Sem faltas nem férias registradas
 * 8. 228 dias de apuração diária (cartão de ponto)
 */
