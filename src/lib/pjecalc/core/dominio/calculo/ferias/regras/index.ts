/**
 * Barrel das regras de validação de Férias.
 *
 * 4 regras portadas 1:1 do Java:
 *   - PrazoDeFeriasValidRule: prazo >= 0
 *   - AbonoDeFeriasValidRule: só permite abono se GOZADAS ou GOZADAS_PARCIALMENTE
 *   - DiasDeAbonoValidRule: dias de abono ≤ prazo/3 (Art. 143 CLT)
 *   - PeriodoDeGozoValidRule: consistência dos períodos de gozo
 */
export { PrazoDeFeriasValidRule } from './prazo-de-ferias-valid-rule';
export { AbonoDeFeriasValidRule } from './abono-de-ferias-valid-rule';
export { DiasDeAbonoValidRule } from './dias-de-abono-valid-rule';
export { PeriodoDeGozoValidRule, FLAGS as PeriodoDeGozoFlags } from './periodo-de-gozo-valid-rule';
export type { PeriodoDeGozoValidResult } from './periodo-de-gozo-valid-rule';
