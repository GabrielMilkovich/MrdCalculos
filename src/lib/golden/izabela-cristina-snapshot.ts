/**
 * GROUND TRUTH SNAPSHOT — Izabela Cristina Rangel do Amaral vs Grupo Casas Bahia S.A.
 * Processo: 0000799-74.2025.5.09.0007
 * PJe-Calc Cidadão v2.13.0 — liquidado em 31/07/2025
 *
 * Fonte: Arquivo .PJC real (PROCESSO_00007997420255090007_CALCULO_IZABELA_CRISTINA_RANGEL_DO_AMARAL.PJC)
 *
 * Rubricas exercitadas neste caso:
 * - DIF. Não Faturadas / Trocas / Cancelamentos (variável, mult 0.3, base HISTORICO_SALARIAL)
 * - Vendas a Prazo (variável, mult 0.72 × qtd 0.8)
 * - Horas Extras (comissionista, base composta = HE + Vendas a Prazo, mult 0.72 × qtd 0.8)
 * - Prêmio Estímulo (base composta, mult 0.4)
 * - Intervalo Intrajornada (base composta, mult 0.4)
 * - RSR Comissionista (reflexo sobre principal)
 * - Reflexos 13º: MEDIA_PELA_QUANTIDADE e MEDIA_PELO_VALOR_CORRIGIDO
 * - Reflexos Férias + 1/3 (MEDIA_PELO_VALOR_CORRIGIDO)
 * - Reflexos Aviso Prévio (MEDIA_PELO_VALOR_CORRIGIDO e MEDIA_PELA_QUANTIDADE)
 * - Multas Art. 477 (todas zeradas)
 *
 * PARTICULARIDADES:
 * 1. Multiplicador HE = 0.72 com Qtd = 0.8 (equivale a 57.6% efetivo)
 * 2. Base composta: Horas Extras dependem de Vendas a Prazo + base salarial
 * 3. Prêmio Estímulo e Intrajornada dependem de HE + Vendas a Prazo
 * 4. Honorários periciais (R$ 5.000) além dos advocatícios
 * 5. Mesmo advogado (Marcos Roberto Dias) que no caso Antônio Harley
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface IzabelaCristinaGoldenSnapshot {
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
    honorarios: { nome: string; cpf: string; valor: number }[];
    custas: number;
  };
}

export const IZABELA_CRISTINA_SNAPSHOT: IzabelaCristinaGoldenSnapshot = {
  meta: {
    processo: '0000799-74.2025.5.09.0007',
    reclamante: 'IZABELA CRISTINA RANGEL DO AMARAL',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '977.528.279-91',
    cnpj: '33041260000164',
    admissao: '2020-11-12',
    demissao: '2022-04-14',
    ajuizamento: '2022-04-25',
    inicio_calculo: '2020-11-12',
    termino_calculo: '2022-04-14',
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
  // RUBRICAS — Ground Truth do PJC
  // Valores "total" = soma nominal (devido - pago) pré-correção
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === CALCULADAS (5 verbas principais) ===
    { codigo: 'DIF_NAO_FATURADAS', descricao: 'DIF. NÃO FATURADAS / TROCAS / CANCELAMENTOS', valor_corrigido: 0, juros: 0, total: 4829.53, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'VENDAS_A_PRAZO', descricao: 'VENDAS A PRAZO', valor_corrigido: 0, juros: 0, total: 9272.67, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 9272.67, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 12080.25, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 12080.25, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === CALCULADA: RSR COMISSIONISTA ===
    // (valor será confirmado na próxima extração detalhada — precisa rolar o log)

    // === REFLEXOS: 13º SALÁRIO (MEDIA_PELO_VALOR_CORRIGIDO) ===
    { codigo: '13_DIF_NAO_FATURADAS', descricao: '13º SALÁRIO SOBRE DIF. NÃO FATURADAS / TROCAS / CANCELAMENTOS', valor_corrigido: 0, juros: 0, total: 4829.53, tipo: 'REFLEXO_13', rubrica_principal: 'DIF_NAO_FATURADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_PREMIO_ESTIMULO', descricao: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 0, juros: 0, total: 1106.20, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO (MEDIA_PELA_QUANTIDADE) ===
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 9272.67, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 12080.25, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 73879.96,
    inss_reclamante: 5550.27,
    inss_reclamado: 14373.85,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios: [
      { nome: 'MARCOS ROBERTO DIAS', cpf: '005.377.166-45', valor: 7784.13 },
      { nome: 'PERITO(A) CONTÁBIL', cpf: '', valor: 5000.00 },
    ],
    custas: 800,
  },
};

/**
 * Detalhes de fórmulas observados neste caso (engenharia reversa):
 *
 * 1. DIF. NÃO FATURADAS / TROCAS / CANCELAMENTOS:
 *    - Base: HISTORICO_SALARIAL (informada por competência)
 *    - Divisor: 1
 *    - Multiplicador: 0.3 (30%)
 *    - Quantidade: 1
 *    - Fórmula: Base × 0.3
 *
 * 2. VENDAS A PRAZO:
 *    - Base: HISTORICO_SALARIAL
 *    - Divisor: 1
 *    - Multiplicador: 0.72
 *    - Quantidade: 0.8
 *    - Fórmula: Base × 0.72 × 0.8 = Base × 0.576
 *
 * 3. HORAS EXTRAS (comissionista):
 *    - Base COMPOSTA: base_verbas[Vendas a Prazo] + HISTORICO_SALARIAL
 *    - Divisor: 1
 *    - Multiplicador: 0.72
 *    - Quantidade: 0.8
 *    - NOTA: Mesmo valor que VENDAS A PRAZO (R$ 9.272,67) — indica
 *      que a base_verbas é redundante ou a composição duplica
 *
 * 4. PRÊMIO ESTÍMULO:
 *    - Base COMPOSTA: base_verbas[ref:32906, ref:32912] + HISTORICO_SALARIAL
 *    - Divisor: 1
 *    - Multiplicador: 0.4
 *    - Quantidade: 1
 *    - Fórmula: (Base composta) × 0.4
 *
 * 5. INTERVALO INTRAJORNADA:
 *    - Base COMPOSTA: múltiplas refs + HISTORICO_SALARIAL
 *    - Divisor: 1
 *    - Multiplicador: 0.4
 *    - Quantidade: 1
 *    - NOTA: Mesmo valor que PRÊMIO ESTÍMULO (R$ 12.080,25)
 *
 * 6. REFLEXOS 13º:
 *    - DIF. Não Faturadas: MEDIA_PELO_VALOR_CORRIGIDO (valor diferente da principal → R$ 4.829,53)
 *    - Prêmio Estímulo: MEDIA_PELO_VALOR_CORRIGIDO (div=12, qtd=AVOS → R$ 1.106,20)
 *    - Horas Extras: MEDIA_PELA_QUANTIDADE (mesmo valor da principal → R$ 9.272,67)
 *    - Intrajornada: MEDIA_PELA_QUANTIDADE (mesmo valor da principal → R$ 12.080,25)
 *
 * 7. PARTICULARIDADE IMPORTANTE:
 *    - 13º sobre DIF_NAO_FATURADAS tem o MESMO valor que a principal (R$ 4.829,53)
 *      apesar de usar MEDIA_PELO_VALOR_CORRIGIDO. Isso acontece quando div=1, mult=0.3, qtd=1
 *      são replicados diretamente no reflexo (fórmula copiada da calculada).
 *
 * 8. RSR COMISSIONISTA:
 *    - Rúbrica de Repouso Semanal Remunerado para comissionistas
 *    - Nova rubrica não presente nos casos anteriores
 *
 * 9. MULTAS 477: Todas configuradas mas com devido=0
 *
 * 10. HONORÁRIOS PERICIAIS: Este é o primeiro caso com honorários periciais (R$ 5.000)
 *     além dos honorários advocatícios
 */
