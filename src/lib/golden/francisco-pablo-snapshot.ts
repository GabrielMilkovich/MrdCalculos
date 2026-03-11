/**
 * GROUND TRUTH SNAPSHOT — Francisco Pablo Ferreira Santos vs Via Varejo S/A
 * PJe-Calc v2.13.2 — Extraído via PJC Analyzer em 10/03/2026
 *
 * Particularidades:
 * - 7 verbas calculadas (Dif Comissão, Dif Prêmio, Vendas Parceladas, HE 8ª/44ª, HE Dom/Fer, Intrajornada, Interjornadas)
 * - IR > 0 (R$ 1.452,13 — único caso com IR entre os 7)
 * - Sem apuração diária (cartão de ponto)
 * - HE Domingos e Feriados: mult=2 (100%)
 */
import type { GoldenRubrica } from './maria-madalena-snapshot';

export const FRANCISCO_PABLO_SNAPSHOT = {
  meta: {
    reclamante: 'FRANCISCO PABLO FERREIRA SANTOS',
    reclamado: 'VIA VAREJO S/A',
    cpf: '375.430.338-44',
    cnpj: '33041260000164',
    admissao: '2019-01-28',
    demissao: '2021-04-16',
    ajuizamento: '2021-07-23',
    inicio_calculo: '2019-01-28',
    termino_calculo: '2021-04-16',
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
  ferias: [{ dias: 30, situacao: 'GOZADAS' }, { dias: 30, situacao: 'GOZADAS' }],
  rubricas: [
    { codigo: 'DIF_COMISSAO', descricao: '01) DIFERENÇA COMISSÃO', valor_corrigido: 0, juros: 0, total: 6796.05, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'DIF_PREMIO', descricao: '02) DIFERENÇA PRÊMIO', valor_corrigido: 0, juros: 0, total: 5436.88, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'VENDAS_PARCELADAS_TST', descricao: 'VENDAS PARCELADAS (TST)', valor_corrigido: 0, juros: 0, total: 15658.19, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HE_8_44', descricao: '03) HORAS EXTRAS 8ª / 44ª', valor_corrigido: 0, juros: 0, total: 36633.73, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'HE_DOM_FER', descricao: '04) HORAS EXTRAS DOMINGOS E FERIADOS', valor_corrigido: 0, juros: 0, total: 12352.54, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTRAJORNADA', descricao: '05) INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 7834.29, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'INTERJORNADAS', descricao: '06) INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 692.41, tipo: 'PRINCIPAL' as const, source: { page: 1, line: 'PJC-devido' } },
    // Reflexos 13º
    { codigo: '13_DIF_COMISSAO', descricao: '13º SOBRE DIF. COMISSÃO', valor_corrigido: 0, juros: 0, total: 558.76, tipo: 'REFLEXO_13' as const, rubrica_principal: 'DIF_COMISSAO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HE_8_44', descricao: '13º SOBRE HE 8ª/44ª', valor_corrigido: 0, juros: 0, total: 2641.36, tipo: 'REFLEXO_13' as const, rubrica_principal: 'HE_8_44', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_HE_DOM_FER', descricao: '13º SOBRE HE DOM/FER', valor_corrigido: 0, juros: 0, total: 957.88, tipo: 'REFLEXO_13' as const, rubrica_principal: 'HE_DOM_FER', source: { page: 1, line: 'PJC-devido' } },
    { codigo: '13_VENDAS_PARCELADAS_TST', descricao: '13º SOBRE VENDAS PARCELADAS (TST)', valor_corrigido: 0, juros: 0, total: 1287.38, tipo: 'REFLEXO_13' as const, rubrica_principal: 'VENDAS_PARCELADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    // Reflexos Férias
    { codigo: 'FERIAS_DIF_COMISSAO', descricao: 'FÉRIAS SOBRE DIF. COMISSÃO', valor_corrigido: 0, juros: 0, total: 746.23, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'DIF_COMISSAO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HE_8_44', descricao: 'FÉRIAS SOBRE HE 8ª/44ª', valor_corrigido: 0, juros: 0, total: 3529.38, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'HE_8_44', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_HE_DOM_FER', descricao: 'FÉRIAS SOBRE HE DOM/FER', valor_corrigido: 0, juros: 0, total: 1261.43, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'HE_DOM_FER', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'FERIAS_VENDAS_PARCELADAS_TST', descricao: 'FÉRIAS SOBRE VENDAS PARCELADAS (TST)', valor_corrigido: 0, juros: 0, total: 1719.29, tipo: 'REFLEXO_FERIAS' as const, rubrica_principal: 'VENDAS_PARCELADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    // RSR
    { codigo: 'RSR_VENDAS_PARCELADAS_TST', descricao: 'RSR SOBRE VENDAS PARCELADAS (TST)', valor_corrigido: 0, juros: 0, total: 3208.54, tipo: 'REFLEXO_RSR' as const, rubrica_principal: 'VENDAS_PARCELADAS_TST', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_DIF_COMISSAO', descricao: 'RSR SOBRE DIF. COMISSÃO', valor_corrigido: 0, juros: 0, total: 1392.60, tipo: 'REFLEXO_RSR' as const, rubrica_principal: 'DIF_COMISSAO', source: { page: 1, line: 'PJC-devido' } },
    { codigo: 'RSR_HE_8_44', descricao: 'RSR SOBRE HE 8ª/44ª', valor_corrigido: 0, juros: 0, total: 7522.59, tipo: 'REFLEXO_RSR' as const, rubrica_principal: 'HE_8_44', source: { page: 1, line: 'PJC-devido' } },
  ] as GoldenRubrica[],
  resumo: {
    liquido_exequente: 166619.02,
    inss_reclamante: 13606.49,
    inss_reclamado: 29204.47,
    imposto_renda: 1452.13,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 17710.43,
    custas: 0,
  },
};
