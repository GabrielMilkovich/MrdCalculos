/**
 * GROUND TRUTH SNAPSHOT — Francisco Pablo Ferreira Santos
 * Fonte: Arquivo .PJC real (francisco-pablo.pjc)
 * PJe-Calc Cidadão v2.13.2
 * Extraído via PJC Analyzer em 10/03/2026
 */

import type { GoldenRubrica } from './maria-madalena-snapshot';

export interface FranciscoPabloGoldenSnapshot {
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

// Placeholder
export const FRANCISCO_PABLO_SNAPSHOT: FranciscoPabloGoldenSnapshot = {
  meta: {
    reclamante: 'FRANCISCO PABLO FERREIRA SANTOS',
    reclamado: '',
    cpf: '',
    cnpj: '',
    admissao: '',
    demissao: '',
    ajuizamento: '',
    inicio_calculo: '',
    termino_calculo: '',
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
  rubricas: [],
  resumo: {
    liquido_exequente: 0,
    inss_reclamante: 0,
    inss_reclamado: 0,
    imposto_renda: 0,
    fgts_deposito: 0,
    honorarios_nome: '',
    honorarios_cpf: '',
    honorarios_valor: 0,
    custas: 0,
  },
};
