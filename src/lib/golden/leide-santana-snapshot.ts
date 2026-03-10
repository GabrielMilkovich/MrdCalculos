/**
 * GROUND TRUTH SNAPSHOT — Leide Santana de Oliveira vs Grupo Casas Bahia S.A.
 * Fonte: Arquivo .PJC real (leide-santana.pjc)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 10/03/2026
 *
 * Rubricas exercitadas:
 * - Comissões Estornadas (variável, mult 1)
 * - RSR Comissionista (DIAS_UTEIS, pago CALCULADO)
 * - Vendas Parceladas (variável, div=1, mult=0.72, qtd=0.8)
 * - Reflexos: 13º, Férias, RSR
 * - Honorários periciais (R$ 1.000)
 * - Contrato longo (~11 anos)
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface LeideSantanaGoldenSnapshot {
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
  ferias: Array<{ dias: number; situacao: string }>;
  rubricas: GoldenRubrica[];
  resumo: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    fgts_deposito: number;
    honorarios: Array<{ nome: string; cpf: string; valor: number }>;
    custas: number;
  };
}

export const LEIDE_SANTANA_SNAPSHOT: LeideSantanaGoldenSnapshot = {
  meta: {
    processo: '',
    reclamante: 'LEIDE SANTANA DE OLIVEIRA',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cpf: '053.187.675-67',
    cnpj: '33041260000164',
    admissao: '2011-07-15',
    demissao: '2022-10-31',
    ajuizamento: '2022-11-17',
    inicio_calculo: '2017-11-17',
    termino_calculo: '2022-10-31',
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
  ferias: [], // TODO: extract férias data if available

  rubricas: [
    // === CALCULADAS (3) ===
    { codigo: 'COMISSOES_ESTORNADAS', descricao: 'COMISSÕES ESTORNADAS', valor_corrigido: 0, juros: 0, total: 858.07, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 5193.01, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-dif(devido-pago)' } },
    { codigo: 'VENDAS_PARCELADAS', descricao: 'VENDAS PARCELADAS', valor_corrigido: 0, juros: 0, total: 76636.67, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: 13º SALÁRIO ===
    { codigo: '13_COMISSOES_ESTORNADAS', descricao: '13º SALÁRIO SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 0, juros: 0, total: 858.07, tipo: 'REFLEXO_13', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_RSR_COMISSIONISTA', descricao: '13º SALÁRIO SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 5193.01, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-dif' } },
    { codigo: '13_VENDAS_PARCELADAS', descricao: '13º SALÁRIO SOBRE VENDAS PARCELADAS', valor_corrigido: 0, juros: 0, total: 76636.67, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: FÉRIAS + 1/3 ===
    { codigo: 'FERIAS_COMISSOES_ESTORNADAS', descricao: 'FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 0, juros: 0, total: 147.91, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_RSR_COMISSIONISTA', descricao: 'FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)', valor_corrigido: 0, juros: 0, total: 898.47, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_PARCELADAS', descricao: 'FÉRIAS + 1/3 SOBRE VENDAS PARCELADAS', valor_corrigido: 0, juros: 0, total: 11019.05, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'VENDAS_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },

    // === REFLEXOS: RSR ===
    { codigo: 'RSR_COMISSOES_ESTORNADAS', descricao: 'RSR SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 0, juros: 0, total: 188.28, tipo: 'REFLEXO_RSR', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_VENDAS_PARCELADAS', descricao: 'RSR SOBRE VENDAS PARCELADAS', valor_corrigido: 0, juros: 0, total: 16843.14, tipo: 'REFLEXO_RSR', rubrica_principal: 'VENDAS_PARCELADAS', source: { page: 1, line: 'PJC-devido' } },
  ],

  resumo: {
    liquido_exequente: 190652.72,
    inss_reclamante: 15865.78,
    inss_reclamado: 38395.77,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios: [
      { nome: 'PERITO', cpf: '', valor: 1000 },
      { nome: 'MARCOS ROBERTO DIAS', cpf: '005.377.166-45', valor: 20127.87 },
    ],
    custas: 5320.84,
  },
};

/**
 * Particularidades (engenharia reversa):
 *
 * 1. VENDAS PARCELADAS:
 *    - Mult: 0.72, Qtd: 0.8 — fórmula composta não padrão
 *    - 60 ocorrências (5 anos de período prescricional)
 *
 * 2. COMISSÕES ESTORNADAS:
 *    - Mult: 1 (100%), Qtd: 1
 *    - Valor muito baixo (858.07 em 5 anos)
 *
 * 3. RSR COMISSIONISTA:
 *    - Pago CALCULADO (não informado)
 *    - Diferença significativa (devido 27.704 - pago 22.511 = 5.193)
 *
 * 4. Contrato longo com prescrição: admissão jul/2011 mas cálculo inicia nov/2017
 * 5. Honorários periciais de R$ 1.000 (raro nestes casos)
 * 6. 1826 dias de apuração diária
 * 7. 7 períodos de férias registrados nos reflexos
 */
