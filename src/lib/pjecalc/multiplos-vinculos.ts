/**
 * =====================================================
 * MÚLTIPLOS VÍNCULOS — Padrão B
 * Uma ação, dois ou mais períodos descontínuos
 * =====================================================
 */

import Decimal from 'decimal.js';
import type { VinculoEmpregaticio } from './pjc-analyzer';

/**
 * Calcula avos considerando múltiplos vínculos descontínuos.
 * Cada vínculo tem contagem de avos independente.
 * Períodos de intervalo (entre vínculos) são ignorados.
 */
export function calcularAvosMultiplosVinculos(
  vinculos: VinculoEmpregaticio[],
  competencias: string[], // YYYY-MM
): number {
  let totalAvos = 0;

  for (const vinculo of vinculos) {
    const admYM = vinculo.data_admissao.slice(0, 7);
    const demYM = vinculo.data_demissao.slice(0, 7);

    // Filter competências within this vínculo
    const comps = competencias.filter(c => c >= admYM && c <= demYM);
    if (comps.length === 0) continue;

    // Count avos with 15-day rule for first/last month
    const diaAdm = parseInt(vinculo.data_admissao.slice(8, 10)) || 1;
    const diaDem = parseInt(vinculo.data_demissao.slice(8, 10)) || 28;

    for (const comp of comps) {
      // First month of vínculo: count if admissão ≤ dia 15 (worked ≥ 15 days)
      if (comp === admYM) {
        if (diaAdm <= 15) totalAvos++;
        continue;
      }
      // Last month of vínculo: count if demissão ≥ dia 15
      if (comp === demYM) {
        if (diaDem >= 15) totalAvos++;
        continue;
      }
      // Middle months: always count
      totalAvos++;
    }
  }

  return totalAvos;
}

/**
 * FGTS per vínculo — each bond has independent deposits and rescisória multa.
 */
export interface SaldoFGTSVinculo {
  vinculo_id: string;
  depositos: number;
  multa_rescisoria: number;
  total: number;
}

export function calcularFGTSPorVinculo(
  vinculos: VinculoEmpregaticio[],
  ocorrenciasFGTS: { competencia: string; diferenca: number }[],
  percentualMulta: number = 0.40, // 40% default (sem justa causa)
): SaldoFGTSVinculo[] {
  return vinculos.map(vinculo => {
    const admYM = vinculo.data_admissao.slice(0, 7);
    const demYM = vinculo.data_demissao.slice(0, 7);

    const depositos = ocorrenciasFGTS
      .filter(oc => {
        const ym = oc.competencia.slice(0, 7);
        return ym >= admYM && ym <= demYM;
      })
      .reduce((sum, oc) => sum + oc.diferenca, 0);

    const multa = new Decimal(depositos).times(percentualMulta).toDP(2).toNumber();

    return {
      vinculo_id: vinculo.id,
      depositos: new Decimal(depositos).toDP(2).toNumber(),
      multa_rescisoria: multa,
      total: new Decimal(depositos).plus(multa).toDP(2).toNumber(),
    };
  });
}
