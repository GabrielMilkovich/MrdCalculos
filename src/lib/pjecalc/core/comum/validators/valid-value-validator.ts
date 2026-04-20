/**
 * PJe-Calc v2.15.1 — ValidValueValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator
 */
import { CustomValidator } from './custom-validator';
import type { ValidRule } from './valid-rule';
import type { ValidValue_ } from './valid-value';
import type { ValidatorContext } from './validator-context';
import { logger } from '@/lib/logger';

export class ValidValueValidator extends CustomValidator<ValidValue_> {
  private validRule: ValidRule | null = null;
  private parametersMap: Map<string, unknown> = new Map();

  getMessage(): string {
    if (this.validRule != null) {
      const msg = this.validRule.getMessage();
      return msg != null ? String(msg) : this.spec.message;
    }
    return this.spec.message;
  }

  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }
  getFlag(): number { return this.spec.flag; }

  getAnnotationParameters(): string[] { return this.spec.parameters; }
  getParameters(): Map<string, unknown> { return this.parametersMap; }

  getParameter(key: string): unknown {
    const annotationParams = this.getAnnotationParameters();
    if (annotationParams.length > 0) {
      for (let i = 0; i < annotationParams.length; i++) {
        if (String(i) === key.trim()) return annotationParams[i];
      }
      return null;
    }
    return this.parametersMap.get(key);
  }

  isValid(context: ValidatorContext): boolean {
    try {
      this.validRule = new this.spec.validRule();
      return this.validRule.isValid(this, context);
    } catch (e) {
      // eslint-disable-next-line no-console
      logger.error(e)
      return false;
    }
  }
}
