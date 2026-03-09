/**
 * GROUND TRUTH SNAPSHOT — Antônio Harley Marques Gomes vs Magazine Luiza S/A
 * Fonte: Arquivo .PJC real (PROCESSO_00012406120245070002_RETIFICACAO_ANTONIO_HARLEY_MARQUES_GOMES.PJC)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 09/03/2026
 *
 * Rubricas exercitadas neste caso:
 * - Vendas Não Faturadas (variável, base informada)
 * - Vendas c/ Redução de Margem (variável, base vinculada)
 * - Prêmio Meta (variável, base composta)
 * - Domingos e Feriados Laborados (variável, base composta)
 * - Horas Extras (comissionista, divisor variável por competência)
 * - Intervalo Interjornada (Art. 66 CLT, mult 1.7)
 * - Intervalo Intrajornada (Art. 71 CLT, mult 1.7)
 * - Reflexos: 13º (MEDIA_PELA_QUANTIDADE e MEDIA_PELO_VALOR_CORRIGIDO)
 * - Multas Art. 477 (todas zeradas neste caso)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface AntonioHarleyGoldenSnapshot {
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

export const ANTONIO_HARLEY_SNAPSHOT: AntonioHarleyGoldenSnapshot = {
  meta: {
    processo: '0001240-61.2024.5.07.0002',
    reclamante: 'ANTONIO HARLEY MARQUES GOMES',
    reclamado: 'MAGAZINE LUIZA S/A',
    cpf: '030.864.683-51',
    cnpj: '47960950080990',
    admissao: '2019-11-21',
    demissao: '2020-11-13',
    ajuizamento: '2022-09-20',
    inicio_calculo: '2019-11-21',
    termino_calculo: '2020-11-13',
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

  // ═══════════════════════════════════════════════════
  // RUBRICAS — Ground Truth do PJC
  // Valores "total" = soma nominal (devido - pago) pré-correção
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === CALCULADAS (7 verbas principais) ===
    { codigo: 'VENDAS_NAO_FATURADAS', descricao: 'VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'VENDAS_REDUCAO_MARGEM', descricao: 'VENDAS C/ REDUÇÃO DE MARGEM', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'PREMIO_META', descricao: 'PRÊMIO META', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DOMINGOS_FERIADOS_LABORADOS', descricao: 'DOMINGOS E FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 5613.67, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 65.43, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 3312.54, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO (MEDIA_PELA_QUANTIDADE — mesmos valores da principal) ===
    { codigo: '13_INTERJORNADAS', descricao: '13º SALÁRIO SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 65.43, tipo: 'REFLEXO_13', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 3312.54, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_DOMINGOS_FERIADOS', descricao: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'REFLEXO_13', rubrica_principal: 'DOMINGOS_FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 5613.67, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO (MEDIA_PELO_VALOR_CORRIGIDO) ===
    { codigo: '13_PREMIO_META', descricao: '13º SALÁRIO SOBRE PRÊMIO META', valor_corrigido: 0, juros: 0, total: 295.40, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_META', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_VENDAS_REDUCAO_MARGEM', descricao: '13º SALÁRIO SOBRE VENDAS C/ REDUÇÃO DE MARGEM', valor_corrigido: 0, juros: 0, total: 310.60, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_REDUCAO_MARGEM', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_VENDAS_NAO_FATURADAS', descricao: '13º SALÁRIO SOBRE VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 86.08, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: FÉRIAS + 1/3 ===
    { codigo: 'FERIAS_DOMINGOS_FERIADOS', descricao: 'FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 1008.60, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DOMINGOS_FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HORAS_EXTRAS', descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 5613.67, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_PREMIO_META', descricao: 'FÉRIAS + 1/3 SOBRE PRÊMIO META', valor_corrigido: 0, juros: 0, total: 326.32, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'PREMIO_META', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_REDUCAO_MARGEM', descricao: 'FÉRIAS + 1/3 SOBRE VENDAS C/ REDUÇÃO DE MARGEM', valor_corrigido: 0, juros: 0, total: 331.32, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'VENDAS_REDUCAO_MARGEM', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_NAO_FATURADAS', descricao: 'FÉRIAS + 1/3 SOBRE VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 91.76, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: AVISO PRÉVIO ===
    { codigo: 'AP_HORAS_EXTRAS', descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 497.81, tipo: 'REFLEXO_AP', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_DOMINGOS_FERIADOS', descricao: 'AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS LABORADOS', valor_corrigido: 0, juros: 0, total: 128.01, tipo: 'REFLEXO_AP', rubrica_principal: 'DOMINGOS_FERIADOS_LABORADOS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_PREMIO_META', descricao: 'AVISO PRÉVIO SOBRE PRÊMIO META', valor_corrigido: 0, juros: 0, total: 84.05, tipo: 'REFLEXO_AP', rubrica_principal: 'PREMIO_META', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_VENDAS_REDUCAO_MARGEM', descricao: 'AVISO PRÉVIO SOBRE VENDAS C/ REDUÇÃO DE MARGEM', valor_corrigido: 0, juros: 0, total: 84.05, tipo: 'REFLEXO_AP', rubrica_principal: 'VENDAS_REDUCAO_MARGEM', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_VENDAS_NAO_FATURADAS', descricao: 'AVISO PRÉVIO SOBRE VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 84.05, tipo: 'REFLEXO_AP', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 39929.92,
    inss_reclamante: 2405.58,
    inss_reclamado: 6336.11,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 6235.38,
    custas: 400,
  },
};

/**
 * Detalhes de fórmulas observados neste caso (engenharia reversa):
 *
 * 1. HORAS EXTRAS (comissionista):
 *    - Divisor VARIÁVEL por competência (104, 260.5, 271, 237, 259...)
 *    - Multiplicador: 0.7 (70% — não 50% nem 100%)
 *    - Quantidade: varia por mês (horas apuradas do cartão de ponto)
 *    - Fórmula: Base / Divisor × Mult × Qtd → truncar 2 casas
 *
 * 2. INTERVALO INTRAJORNADA:
 *    - Divisor: 220 (fixo, carga horária mensal)
 *    - Multiplicador: 1.7 (hora + 70%)
 *    - Quantidade: minutos/60 suprimidos por mês
 *    - Fórmula: Base / 220 × 1.7 × Qtd
 *
 * 3. INTERVALO INTERJORNADA:
 *    - Mesma fórmula da Intrajornada
 *    - Divisor: 220, Mult: 1.7
 *    - Qtd muito menor (poucos eventos)
 *
 * 4. REFLEXOS 13º (MEDIA_PELA_QUANTIDADE):
 *    - Interjornada, Intrajornada, Dom/Feriados, HE
 *    - Valores idênticos à principal (1:1)
 *
 * 5. REFLEXOS 13º (MEDIA_PELO_VALOR_CORRIGIDO):
 *    - Prêmio Meta, Vendas Redução, Vendas Não Faturadas
 *    - Cálculo: Soma corrigida / 12 × avos
 *
 * 6. MULTAS 477: Todas configuradas mas com devido=0 neste caso
 *
 * 7. PARTICULARIDADE: Multiplicador de HE = 0.7 (70%)
 *    Isso indica que o adicional é de 70% sobre a hora normal,
 *    não o padrão de 50%. Pode ser CCT/ACT ou sentença específica.
 */
