/**
 * GROUND TRUTH SNAPSHOT — Roque Guerreiro Teixeira vs Grupo Casas Bahia S.A.
 * Processo: 0001138-95.2025.5.09.0245
 * PJe-Calc Cidadão v2.13.0 — liquidado em 23/06/2025
 *
 * Fonte: Arquivo .PJC real
 *
 * PARTICULARIDADES DESTE CASO:
 * 1. Prescrição quinquenal ATIVADA (admissão 2003 → início cálculo 2016)
 * 2. RSR Comissionista com VALOR PAGO ≠ 0 (diferença devido-pago)
 * 3. Valor Pago tipo CALCULADO (PJe-Calc auto-calcula o pago)
 * 4. Comportamento reflexo MEDIA_PELO_VALOR (distinto de MEDIA_PELO_VALOR_CORRIGIDO)
 * 5. Divisor variável no RSR (dias úteis do mês: 9, 26, 27...)
 * 6. Multiplicador Intrajornada = 1.5 (50%) — diferente de 1.6 e 1.7 em outros casos
 * 7. Índices acumulados já visíveis nas ocorrências
 * 8. Aviso Prévio sobre HE com valor ínfimo (R$ 1,92) — edge case
 * 9. 58 competências (caso longo: jun/2016 a mar/2021)
 * 10. Vendas Não Faturadas, Prêmio Estímulo e HE com valores idênticos (R$ 31.793,51)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface RoqueGuerreiroGoldenSnapshot {
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

export const ROQUE_GUERREIRO_SNAPSHOT: RoqueGuerreiroGoldenSnapshot = {
  meta: {
    processo: '0001138-95.2025.5.09.0245',
    reclamante: 'ROQUE GUERREIRO TEIXEIRA',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '359.257.019-68',
    cnpj: '33041260000164',
    admissao: '2003-11-24',
    demissao: '2021-03-09',
    ajuizamento: '2021-06-21',
    inicio_calculo: '2016-06-21',
    termino_calculo: '2021-03-09',
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
    prescricao_quinquenal: true,  // FIRST case with this flag = true
    prescricao_fgts: false,
    limitar_avos: false,
  },

  faltas: [],
  ferias: [],

  rubricas: [
    // === CALCULADAS ===
    { codigo: 'VENDAS_NAO_FATURADAS', descricao: 'VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 31793.51, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 31793.51, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 31793.51, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === RSR COMISSIONISTA (com pago ≠ 0) ===
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 5681.98, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-diferenca' } },

    // === INTERVALO INTRAJORNADA (13º reflexo) ===
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 832.22, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS 13º ===
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 31793.51, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_PREMIO_ESTIMULO', descricao: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 4785.15, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_RSR', descricao: '13º SALÁRIO SOBRE REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 5681.98, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-diferenca' } },
    { codigo: '13_VENDAS_NAO_FATURADAS', descricao: '13º SALÁRIO SOBRE VENDAS NÃO FATURADAS', valor_corrigido: 0, juros: 0, total: 2760.67, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },

    // === AVISO PRÉVIO (edge case: R$ 1,92) ===
    { codigo: 'AP_HORAS_EXTRAS', descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 1.92, tipo: 'REFLEXO_AP', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 231306.58,
    inss_reclamante: 20403.15,
    inss_reclamado: 46916.24,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 24445.72,
    custas: 400,
  },
};

/**
 * Detalhes de fórmulas (engenharia reversa):
 *
 * 1. VENDAS NÃO FATURADAS: Base_Hist × 0.3 (58 competências)
 * 2. PRÊMIO ESTÍMULO: (Vendas NF + Base_Hist) × 0.3 = mesmo total R$ 31.793,51
 * 3. HORAS EXTRAS: (Prêmio + Vendas NF + ref + Base_Hist) × 0.3 = mesmo total
 *    NOTA: Três verbas com o MESMO total indica base composta idêntica
 *
 * 4. RSR COMISSIONISTA:
 *    - Divisor VARIÁVEL por mês (dias úteis: 9, 26, 27...)
 *    - Qtd: IMPORTADA_DO_CALENDARIO (domingos/feriados do mês)
 *    - PAGO ≠ 0 → ValorPago tipo CALCULADO
 *    - Fórmula: Base / Dias_úteis × DSR_dias
 *    - Total = Devido - Pago = R$ 21.796,63 - R$ 16.114,65 = R$ 5.681,98
 *
 * 5. 13º RSR: comportamento MEDIA_PELO_VALOR (não corrigido!)
 *    Diferente de MEDIA_PELO_VALOR_CORRIGIDO e MEDIA_PELA_QUANTIDADE
 *
 * 6. INTRAJORNADA: Div=220, Mult=1.5, Qtd=IMPORTADA_DO_CARTAO
 *    NOTA: Mult 1.5 (50%) — terceira variante observada (1.5, 1.6, 1.7)
 *
 * 7. AP sobre HE: R$ 1,92 — edge case de valor mínimo
 *    Div=30, Qtd=APURADA:30, Média últimos 12 meses
 */
