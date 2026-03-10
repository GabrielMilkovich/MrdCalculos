/**
 * GROUND TRUTH SNAPSHOT — Carla Pego Ferreira vs Eletrosom Ltda (Recuperação Judicial)
 * PJe-Calc v2.13.2 — Extraído via PJC Analyzer em 10/03/2026
 *
 * Particularidades:
 * - 10 verbas calculadas (inclui 13º prop, AP, Férias prop, Saldo salário, Multa 477)
 * - HE 100% (mult=1, qtd IMPORTADA_DO_CARTAO)
 * - Intrajornada/Interjornada mult=2 (hora + 100%)
 * - Reclamado em recuperação judicial
 */
import type { GoldenRubrica } from './maria-madalena-snapshot';

export const CARLA_PEGO_SNAPSHOT = {
  meta: {
    reclamante: 'CARLA PEGO FERREIRA',
    reclamado: 'ELETROSOM LTDA. - EM RECUPERACAO JUDICIAL',
    cpf: '123.368.106-03',
    cnpj: '22164990000136',
    admissao: '2021-07-05',
    demissao: '2023-04-24',
    ajuizamento: '2023-06-28',
    inicio_calculo: '2021-07-05',
    termino_calculo: '2023-04-24',
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
  faltas: [] as never[],
  ferias: [{ dias: 30, situacao: 'GOZADAS' }],
  rubricas: [
    { codigo: '13_PROPORCIONAL', descricao: '13º SALÁRIO PROPORCIONAL', valor_corrigido: 0, juros: 0, total: 833.33, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'VENDAS_NAO_FATURADAS_TST', descricao: 'VENDAS NÃO FATURADAS (TST)', valor_corrigido: 0, juros: 0, total: 5583.19, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DOMINGO_FERIADO', descricao: 'DOMINGO E FERIADO', valor_corrigido: 0, juros: 0, total: 5583.19, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HORAS_EXTRAS_100', descricao: 'HORAS EXTRAS 100%', valor_corrigido: 0, juros: 0, total: 11930.71, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AVISO_PREVIO', descricao: 'AVISO PRÉVIO', valor_corrigido: 0, juros: 0, total: 2200, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_PROPORCIONAIS', descricao: 'FÉRIAS PROPORCIONAIS + 1/3', valor_corrigido: 0, juros: 0, total: 2444.44, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 181.63, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 3107.47, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'MULTA_477', descricao: 'MULTA DO ARTIGO 477 DA CLT', valor_corrigido: 0, juros: 0, total: 2000, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'SALDO_SALARIO', descricao: 'SALDO DE SALÁRIO', valor_corrigido: 0, juros: 0, total: 1600, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    // Reflexos
    { codigo: '13_DOMINGO_FERIADO', descricao: '13º SOBRE DOMINGO E FERIADO', valor_corrigido: 0, juros: 0, total: 5583.19, tipo: 'REFLEXO_13' as const, rubrica_principal: 'DOMINGO_FERIADO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HORAS_EXTRAS_100', descricao: '13º SOBRE HORAS EXTRAS 100%', valor_corrigido: 0, juros: 0, total: 11930.71, tipo: 'REFLEXO_13' as const, rubrica_principal: 'HORAS_EXTRAS_100', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_VENDAS_NAO_FATURADAS_TST', descricao: '13º SOBRE VENDAS NÃO FATURADAS (TST)', valor_corrigido: 0, juros: 0, total: 484.19, tipo: 'REFLEXO_13' as const, rubrica_principal: 'VENDAS_NAO_FATURADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_DOMINGO_FERIADO', descricao: 'AP SOBRE DOMINGO E FERIADO', valor_corrigido: 0, juros: 0, total: 6.91, tipo: 'REFLEXO_AP' as const, rubrica_principal: 'DOMINGO_FERIADO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_HORAS_EXTRAS_100', descricao: 'AP SOBRE HORAS EXTRAS 100%', valor_corrigido: 0, juros: 0, total: 439.26, tipo: 'REFLEXO_AP' as const, rubrica_principal: 'HORAS_EXTRAS_100', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'AP_VENDAS_NAO_FATURADAS_TST', descricao: 'AP SOBRE VENDAS NÃO FATURADAS (TST)', valor_corrigido: 0, juros: 0, total: 248.06, tipo: 'REFLEXO_AP' as const, rubrica_principal: 'VENDAS_NAO_FATURADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_DOMINGO_FERIADO', descricao: 'FÉRIAS SOBRE DOMINGO E FERIADO', valor_corrigido: 0, juros: 0, total: 19.77, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'DOMINGO_FERIADO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HORAS_EXTRAS_100', descricao: 'FÉRIAS SOBRE HORAS EXTRAS 100%', valor_corrigido: 0, juros: 0, total: 1185.44, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'HORAS_EXTRAS_100', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_NAO_FATURADAS_TST', descricao: 'FÉRIAS SOBRE VENDAS NÃO FATURADAS (TST)', valor_corrigido: 0, juros: 0, total: 763.48, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'VENDAS_NAO_FATURADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_HORAS_EXTRAS_100', descricao: 'RSR SOBRE HORAS EXTRAS 100%', valor_corrigido: 0, juros: 0, total: 2361.54, tipo: 'REFLEXO_RSR' as const, rubrica_principal: 'HORAS_EXTRAS_100', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_VENDAS_NAO_FATURADAS_TST', descricao: 'RSR SOBRE VENDAS NÃO FATURADAS (TST)', valor_corrigido: 0, juros: 0, total: 1179.48, tipo: 'REFLEXO_RSR' as const, rubrica_principal: 'VENDAS_NAO_FATURADAS_TST', source: { page: 1, line: 'PJC-devido' } },
  ] as GoldenRubrica[],
  resumo: {
    liquido_exequente: 45028.19,
    inss_reclamante: 2773.49,
    inss_reclamado: 7819.42,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 4733.74,
    custas: 0,
  },
};
