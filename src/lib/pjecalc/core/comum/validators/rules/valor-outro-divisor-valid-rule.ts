/**
 * PJe-Calc v2.15.1 — ValorOutroDivisorValidRule
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.rules.ValorOutroDivisorValidRule
 *
 * Valida que, quando o divisor da verba é `OUTRO_VALOR`, o campo
 * `outroDivisor` deve ser > 0.
 */
import Decimal from 'decimal.js';
import { DivisorDeVerbaEnum } from '../../../constantes/enums';
import type { Mensagens } from '../../mensagens';
import type { ValidRule } from '../valid-rule';
import type { ValidValueValidator } from '../valid-value-validator';
import type { ValidatorContext } from '../validator-context';

/** Duck-typed reference para Verba (pacote dominio/verba, porte incremental). */
interface VerbaRef {
  getDivisor(): DivisorDeVerbaEnum;
  getOutroDivisor(): Decimal;
}

export class ValorOutroDivisorValidRule implements ValidRule {
  getMessage(): Mensagens | null { return null; }

  isValid(_validator: ValidValueValidator, context: ValidatorContext): boolean {
    const bean = context.getBean() as VerbaRef;
    return (
      bean.getDivisor() !== DivisorDeVerbaEnum.OUTRO_VALOR ||
      bean.getOutroDivisor().greaterThan(0)
    );
  }
}
