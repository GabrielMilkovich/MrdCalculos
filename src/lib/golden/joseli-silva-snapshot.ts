/**
 * GROUND TRUTH SNAPSHOT — Joseli Silva Wanderley vs Grupo Casas Bahia S.A.
 * Processo: 0012316-92.2025.5.15.0077
 * PJe-Calc Cidadão v2.13.0 — liquidado em 30/07/2025
 *
 * Fonte: Arquivo .PJC real (PROCESSO_00123169220255150077_CALCULO_JOSELI_SILVA_WANDERLEY.PJC)
 *
 * CASO MAIS COMPLEXO DO BENCHMARK — 52 verbas, R$ 510K líquido
 *
 * Rubricas exercitadas neste caso:
 * - DIF. Vendas a Prazo (mult 0.45)
 * - DIF. Vendas Canceladas (mult 0.1)
 * - Prêmio Estímulo (base composta, mult 0.3)
 * - Artigo 384 CLT (intervalo mulher, mult 0.45, vigente até Reforma 2017-11-10)
 * - Horas Extras (Qtd IMPORTADA_DO_CARTAO)
 * - Intervalo Intrajornada (Div 220, Mult 1.6, Qtd IMPORTADA_DO_CARTAO)
 * - Intervalo Interjornada (Div 220, Mult 1.6, Qtd IMPORTADA_DO_CARTAO)
 * - Domingos e Feriados Laborados (IMPORTADA_DO_CARTAO)
 * - Salário Substituição (nova rubrica!)
 * - RSR/Feriado sobre intervalos (comportamento VALOR_MENSAL, Qtd IMPORTADA_DO_CALENDARIO)
 * - Reflexos 13º, Férias+1/3, Aviso Prévio
 * - Multas Art. 477 (todas zeradas)
 *
 * PARTICULARIDADES:
 * 1. Primeiro caso com IR significativo (R$ 50.023,93)
 * 2. Art. 384 CLT (intervalo mulher pré-reforma)
 * 3. Multiplicador de intervalos = 1.6 (não 1.7 como Antônio Harley)
 * 4. Qtd IMPORTADA_DO_CARTAO e IMPORTADA_DO_CALENDARIO
 * 5. Comportamento reflexo VALOR_MENSAL (RSR)
 * 6. Período com prescrição quinquenal (início 2016-08-17 vs admissão 2011-06-02)
 * 7. Salário Substituição como rubrica autônoma
 * 8. 44 competências por verba (caso longo)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface JoseliSilvaGoldenSnapshot {
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

export const JOSELI_SILVA_SNAPSHOT: JoseliSilvaGoldenSnapshot = {
  meta: {
    processo: '0012316-92.2025.5.15.0077',
    reclamante: 'JOSELI SILVA WANDERLEY',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '306.546.958-81',
    cnpj: '33041260000164',
    admissao: '2011-06-02',
    demissao: '2020-03-13',
    ajuizamento: '2021-08-17',
    inicio_calculo: '2016-08-17',
    termino_calculo: '2020-03-13',
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    feriado_estadual: true,
    feriado_municipal: true,
    regime: 'INTEGRAL',
    indices_acumulados: 'MES_SUBSEQUENTE_AO_VENCIMENTO',
    dia_fechamento: 31,
    pje_calc_version: '2.13.0',
    zera_negativo: false,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    limitar_avos: false,
  },

  faltas: [],
  ferias: [],

  // ═══════════════════════════════════════════════════
  // RUBRICAS — Ground Truth do PJC (52 verbas)
  // Valores "total" = soma nominal (devido - pago) pré-correção
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === CALCULADAS (principais) ===
    { codigo: 'DIF_VENDAS_A_PRAZO', descricao: 'DIF. VENDAS A PRAZO', valor_corrigido: 0, juros: 0, total: 40831.71, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DIF_VENDAS_CANCELADAS', descricao: 'DIF. VENDAS CANCELADAS', valor_corrigido: 0, juros: 0, total: 9073.70, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 42192.79, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'ART384_CLT', descricao: 'ARTIGO 384 DA CLT', valor_corrigido: 0, juros: 0, total: 40831.71, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === VERBAS COM QTD IMPORTADA DO CARTÃO (valores precisam extração completa do log) ===
    // Horas Extras, Intrajornada, Interjornada, Domingos/Feriados
    // Intervalo Interjornada reflexo 13º: R$ 11.184,25
    // Intervalo Intrajornada reflexo 13º: R$ 26.580,73

    // === REFLEXOS: 13º SALÁRIO ===
    { codigo: '13_INTERJORNADAS', descricao: '13º SALÁRIO SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 11184.25, tipo: 'REFLEXO_13', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 26580.73, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_ART384', descricao: '13º SALÁRIO SOBRE ARTIGO 384 DA CLT', valor_corrigido: 0, juros: 0, total: 40831.71, tipo: 'REFLEXO_13', rubrica_principal: 'ART384_CLT', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 510459.85,
    inss_reclamante: 42357.67,
    inss_reclamado: 107981.05,
    imposto_renda: 50023.93,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 88162.37,
    custas: 2000,
  },
};

/**
 * Detalhes de fórmulas observados neste caso (engenharia reversa):
 *
 * 1. DIF. VENDAS A PRAZO:
 *    - Base: HISTORICO_SALARIAL
 *    - Divisor: 1 | Multiplicador: 0.45 | Quantidade: 1
 *    - Fórmula: Base × 0.45
 *
 * 2. DIF. VENDAS CANCELADAS:
 *    - Base: HISTORICO_SALARIAL
 *    - Divisor: 1 | Multiplicador: 0.1 | Quantidade: 1
 *    - Fórmula: Base × 0.1
 *
 * 3. PRÊMIO ESTÍMULO:
 *    - Base COMPOSTA: refs + HISTORICO_SALARIAL
 *    - Divisor: 1 | Multiplicador: 0.3 | Quantidade: 1
 *    - Fórmula: Base composta × 0.3
 *
 * 4. ARTIGO 384 DA CLT (Intervalo Mulher):
 *    - Base COMPOSTA: Vendas Prazo + Vendas Canceladas + Prêmio + refs + HISTORICO_SALARIAL
 *    - Divisor: 1 | Multiplicador: 0.45 | Quantidade: 1
 *    - Período: até 2017-11-10 (Reforma Trabalhista)
 *    - NOTA: Mesmo valor que DIF_VENDAS_A_PRAZO (R$ 40.831,71) por coincidência aritmética
 *
 * 5. INTERVALO INTRAJORNADA:
 *    - Base COMPOSTA: refs + Vendas + Prêmio
 *    - Divisor: 220 | Multiplicador: 1.6 | Qtd: IMPORTADA_DO_CARTAO
 *    - NOTA: Mult=1.6 (60% adicional), diferente de 1.7 (70%) do caso Antônio Harley
 *
 * 6. INTERVALO INTERJORNADA:
 *    - Mesma fórmula que Intrajornada
 *    - Divisor: 220 | Multiplicador: 1.6 | Qtd: IMPORTADA_DO_CARTAO
 *
 * 7. RSR/FERIADO sobre intervalos:
 *    - Comportamento: VALOR_MENSAL (novo! diferente de MEDIA_PELA_QUANTIDADE)
 *    - Qtd: IMPORTADA_DO_CALENDARIO (dias úteis vs domingos/feriados)
 *    - Fórmula: Soma(intervalos_mês) / Dias_úteis × DSR_dias
 *
 * 8. SALÁRIO SUBSTITUIÇÃO:
 *    - Período reduzido: 2019-02-01 a 2020-03-13
 *    - Rubrica autônoma (não é reflexo)
 *
 * 9. REFLEXOS AVISO PRÉVIO:
 *    - Divisor: 30 | Qtd: APURADA:30
 *    - Média dos últimos 12 meses do contrato
 *
 * 10. FÉRIAS + 1/3:
 *     - Divisor: 12 | Multiplicador: 1.33333333 (4/3)
 *     - Qtd: AVOS | Período: PERIODO_AQUISITIVO
 *
 * 11. IMPOSTO DE RENDA:
 *     - R$ 50.023,93 — primeiro caso com IR significativo
 *     - Regime RRA (Rendimentos Recebidos Acumuladamente)
 *     - Número de meses: 44 competências
 *
 * PADRÕES NOVOS vs CASOS ANTERIORES:
 * - Art. 384 CLT (intervalo mulher) — rubrica inédita
 * - Mult 1.6 para intervalos (vs 1.7 do caso Antônio Harley)
 * - VALOR_MENSAL como comportamento de reflexo (vs MEDIA_PELA_QUANTIDADE)
 * - IMPORTADA_DO_CARTAO e IMPORTADA_DO_CALENDARIO para quantidades
 * - Salário Substituição como rubrica autônoma
 * - IR com cálculo RRA significativo
 */
