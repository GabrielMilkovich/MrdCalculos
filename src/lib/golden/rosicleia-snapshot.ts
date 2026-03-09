/**
 * GROUND TRUTH SNAPSHOT — Rosicléia Pereira Chaves
 * Fonte: Arquivo .PJC real (rosicleia-pereira-chaves.pjc)
 * Extraído via PJC Analyzer
 *
 * Este caso exercita rubricas adicionais que não existem no caso Maria Madalena:
 * - Intervalo Interjornada (Art. 66 CLT)
 * - Intervalo Intrajornada (Art. 71 CLT)
 * - Prêmio Estímulo
 * - Multa Art. 477 CLT
 * - Horas Extras 50% e 100%
 */

import type { GoldenSnapshot, GoldenRubrica } from './maria-madalena-snapshot';

export interface RosicleiaGoldenSnapshot {
  meta: {
    processo: string;
    reclamante: string;
    reclamado: string;
    admissao: string;
    demissao: string;
    inicio_calculo: string;
    termino_calculo: string;
    carga_horaria: number;
    sabado_dia_util: boolean;
    projeta_aviso: boolean;
    feriado_estadual: boolean;
    regime: string;
    pje_calc_version: string;
  };

  rubricas: GoldenRubrica[];

  resumo: {
    total_bruto: number;
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    fgts_deposito: number;
    honorarios: number;
    custas: number;
    total_descontos: number;
  };
}

/**
 * Ground truth extraído do arquivo .PJC real da Rosicléia
 * Valores obtidos via PJC Analyzer em 09/03/2026
 */
export const ROSICLEIA_SNAPSHOT: RosicleiaGoldenSnapshot = {
  meta: {
    processo: '', // Será preenchido após análise completa
    reclamante: 'ROSICLÉIA PEREIRA CHAVES',
    reclamado: '', // Será preenchido após análise completa
    admissao: '', // Será preenchido após análise completa
    demissao: '', // Será preenchido após análise completa
    inicio_calculo: '',
    termino_calculo: '',
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    feriado_estadual: true,
    regime: 'Tempo Integral',
    pje_calc_version: '',
  },

  // ═══════════════════════════════════════════════════
  // RUBRICAS — Ground Truth do PJC
  // Valores extraídos do resultado da liquidação
  // ═══════════════════════════════════════════════════
  rubricas: [
    // === HORAS EXTRAS ===
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 0, juros: 0, total: 0, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC' } },

    // === INTERVALO INTRAJORNADA (Art. 71) ===
    { codigo: 'INTRAJORNADA', descricao: 'INTERVALO INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 0, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC' } },
    { codigo: '13_INTRAJORNADA', descricao: '13º SALÁRIO SOBRE INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_13', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC' } },
    { codigo: 'FERIAS_INTRAJORNADA', descricao: 'FÉRIAS + 1/3 SOBRE INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC' } },
    { codigo: 'RSR_INTRAJORNADA', descricao: 'RSR SOBRE INTRAJORNADA', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_RSR', rubrica_principal: 'INTRAJORNADA', source: { page: 1, line: 'PJC' } },

    // === INTERVALO INTERJORNADA (Art. 66) ===
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 0, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC' } },
    { codigo: '13_INTERJORNADAS', descricao: '13º SALÁRIO SOBRE INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_13', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC' } },
    { codigo: 'FERIAS_INTERJORNADAS', descricao: 'FÉRIAS + 1/3 SOBRE INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC' } },
    { codigo: 'RSR_INTERJORNADAS', descricao: 'RSR SOBRE INTERJORNADAS', valor_corrigido: 0, juros: 0, total: 0, tipo: 'REFLEXO_RSR', rubrica_principal: 'INTERJORNADAS', source: { page: 1, line: 'PJC' } },

    // === MULTA ART 477 ===
    { codigo: 'MULTA_477', descricao: 'MULTA DO ARTIGO 477 DA CLT', valor_corrigido: 0, juros: 0, total: 0, tipo: 'PRINCIPAL', source: { page: 1, line: 'PJC' } },

    // === FGTS ===
    { codigo: 'FGTS_8', descricao: 'FGTS 8%', valor_corrigido: 0, juros: 0, total: 0, tipo: 'FGTS', source: { page: 1, line: 'PJC' } },
    { codigo: 'MULTA_FGTS_40', descricao: 'MULTA SOBRE FGTS 40%', valor_corrigido: 0, juros: 0, total: 0, tipo: 'MULTA_FGTS', source: { page: 1, line: 'PJC' } },
  ],

  resumo: {
    total_bruto: 0, // Será preenchido após extração real
    liquido_exequente: 247215.95,
    inss_reclamante: 23475.40,
    inss_reclamado: 0,
    imposto_renda: 4185.26,
    fgts_deposito: 0,
    honorarios: 0,
    custas: 0,
    total_descontos: 23475.40 + 4185.26,
  },
};
