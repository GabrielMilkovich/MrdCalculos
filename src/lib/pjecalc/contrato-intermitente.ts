/**
 * =====================================================
 * CONTRATO INTERMITENTE — Lei 13.467/2017
 * Vigência: a partir de 11/11/2017
 * =====================================================
 * Regras específicas:
 * - FGTS incide só sobre valor efetivamente recebido por convocação
 * - Férias e 13º são proporcionais ao período de cada convocação
 * - INSS incide apenas nas competências com convocação
 */

import Decimal from 'decimal.js';
import type { ConvocacaoIntermitente } from './pjc-analyzer';

/**
 * FGTS para contrato intermitente.
 * Depósito: 8% sobre valor de cada convocação.
 * Multa: 40% (sem justa causa) ou 20% (culpa recíproca) sobre total depositado.
 */
export function calcularFGTSIntermitente(
  convocacoes: ConvocacaoIntermitente[],
  tipoRescisao: string = 'SEM_JUSTA_CAUSA',
): { depositos: number; multa: number; total: number } {
  const totalConvocacoes = convocacoes.reduce((sum, c) => sum + c.valor_recebido, 0);

  const depositos = new Decimal(totalConvocacoes)
    .times(0.08)
    .toDP(2, Decimal.ROUND_DOWN)
    .toNumber();

  const percentualMulta = tipoRescisao === 'CULPA_RECIPROCA' ? 0.20 : 0.40;
  const multa = new Decimal(depositos)
    .times(percentualMulta)
    .toDP(2, Decimal.ROUND_DOWN)
    .toNumber();

  return {
    depositos,
    multa,
    total: new Decimal(depositos).plus(multa).toDP(2).toNumber(),
  };
}

/**
 * Férias proporcionais para uma convocação intermitente.
 * Art. 452-A §6º CLT: pago ao final de cada convocação.
 * Fórmula: (dias / 365) × valor_recebido × (4/3) [inclui 1/3 constitucional]
 */
export function calcularFeriasIntermitente(
  convocacao: ConvocacaoIntermitente,
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const inicio = new Date(convocacao.data_inicio + 'T00:00:00');
  const fim = new Date(convocacao.data_fim + 'T00:00:00');
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / msPerDay) + 1);

  const feriasBase = new Decimal(convocacao.valor_recebido).times(dias).div(365);
  const terco = feriasBase.div(3);
  return feriasBase.plus(terco).toDP(2, Decimal.ROUND_DOWN).toNumber();
}

/**
 * 13º salário proporcional para uma convocação intermitente.
 * Art. 452-A §6º CLT: pago ao final de cada convocação.
 * Fórmula: (dias / 365) × valor_recebido
 */
export function calcularDecimoTerceiroIntermitente(
  convocacao: ConvocacaoIntermitente,
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const inicio = new Date(convocacao.data_inicio + 'T00:00:00');
  const fim = new Date(convocacao.data_fim + 'T00:00:00');
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / msPerDay) + 1);

  return new Decimal(convocacao.valor_recebido)
    .times(dias)
    .div(365)
    .toDP(2, Decimal.ROUND_DOWN)
    .toNumber();
}
