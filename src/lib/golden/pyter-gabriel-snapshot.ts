/**
 * GROUND TRUTH SNAPSHOT — Pyter Gabriel Pereira Soeiro vs Etna Comércio
 * Fonte: Arquivo .PJC real (pyter-gabriel.pjc)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 10/03/2026
 *
 * NOTA: Este PJC não possui seção <gprec> nem <dadosEstruturados>,
 * logo os totais do resultado são 0. Os valores devem ser calculados
 * pelo motor de cálculo usando as ocorrências das verbas.
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface PyterGabrielGoldenSnapshot {
  meta: {
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
    sem_resultado_pre_computado: boolean;
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

export const PYTER_GABRIEL_SNAPSHOT: PyterGabrielGoldenSnapshot = {
  meta: {
    reclamante: 'PYTER GABRIEL PEREIRA SOEIRO',
    reclamado: 'ETNA COMERCIO DE MOVEIS E ARTIGOS PARA DECORACAO S.A.',
    cpf: '',
    cnpj: '13477066000119',
    admissao: '2018-07-05',
    demissao: '2022-03-28',
    ajuizamento: '2023-02-28',
    inicio_calculo: '2018-07-05',
    termino_calculo: '2022-03-28',
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
    sem_resultado_pre_computado: true,
  },
  faltas: [],
  ferias: [],
  rubricas: [], // Verbas devem ser extraídas do teste de extração
  resumo: {
    liquido_exequente: 0, // Sem gprec — resultado não pré-computado
    inss_reclamante: 0,
    inss_reclamado: 0,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    honorarios_cpf: '005.377.166-45',
    honorarios_valor: 0,
    custas: 0,
  },
};
