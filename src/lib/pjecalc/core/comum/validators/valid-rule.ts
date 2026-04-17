/**
 * PJe-Calc v2.15.1 — ValidRule (interface)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule
 */
import type { Mensagens } from '../mensagens';
import type { ValidValueValidator } from './valid-value-validator';
import type { ValidatorContext } from './validator-context';

export interface ValidRule {
  getMessage(): Mensagens | null;
  isValid(validator: ValidValueValidator, context: ValidatorContext): boolean;
}
