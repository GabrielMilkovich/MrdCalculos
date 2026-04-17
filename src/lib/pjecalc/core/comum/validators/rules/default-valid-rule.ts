/**
 * PJe-Calc v2.15.1 — DefaultValidRule
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.rules.DefaultValidRule
 */
import { Mensagens } from '../../mensagens';
import type { ValidRule } from '../valid-rule';
import type { ValidValueValidator } from '../valid-value-validator';
import type { ValidatorContext } from '../validator-context';

export class DefaultValidRule implements ValidRule {
  getMessage(): Mensagens { return Mensagens.MSG0004; }
  isValid(_validator: ValidValueValidator, _context: ValidatorContext): boolean {
    return false;
  }
}
