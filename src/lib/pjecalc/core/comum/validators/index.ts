/**
 * PJe-Calc v2.15.1 — Barrel do pacote `comum/validators`.
 * Fase 15 — Validators (annotation-based validation → TS registry-based).
 */
export { ValidatorContext } from './validator-context';
export { CustomValidator } from './custom-validator';

// Annotation TS-adaptadas + validadores
export { required, type Required_, type RequiredSpec } from './required';
export { RequiredValidator } from './required-validator';
export { min, type Min_, type MinSpec } from './min';
export { MinValidator } from './min-validator';
export { compared, type Compared_, type ComparedSpec } from './compared';
export { ComparedValidator } from './compared-validator';
export { greaterThan, type GreaterThan_, type GreaterThanSpec } from './greater-than';
export { GreaterThanValidator } from './greater-than-validator';
export { greaterOrEqualThan, type GreaterOrEqualThan_, type GreaterOrEqualThanSpec } from './greater-or-equal-than';
export { GreaterOrEqualThanValidator } from './greater-or-equal-than-validator';
export { lessOrEqualThan, type LessOrEqualThan_, type LessOrEqualThanSpec } from './less-or-equal-than';
export { LessOrEqualThanValidator } from './less-or-equal-than-validator';
export { unique, type Unique_, type UniqueSpec } from './unique';
export { UniqueValidator, type UniqueDuplicateChecker } from './unique-validator';
export { limitedTo100Years, type LimitedTo100Years_, type LimitedTo100YearsSpec } from './limited-to-100-years';
export { LimitedTo100YearsValidator } from './limited-to-100-years-validator';

// ValidValue + ValidRule
export { type ValidRule } from './valid-rule';
export { validValue, type ValidValue_, type ValidValueSpec } from './valid-value';
export { ValidValueValidator } from './valid-value-validator';

// Rules concretas
export { DefaultValidRule } from './rules/default-valid-rule';
export { ValorOutroDivisorValidRule } from './rules/valor-outro-divisor-valid-rule';

// Mensagens de cálculo
export { MsgValidador } from './calculo/msg-validador';
export { Erro } from './calculo/erro';
export { Alerta } from './calculo/alerta';
export { Informacao } from './calculo/informacao';
