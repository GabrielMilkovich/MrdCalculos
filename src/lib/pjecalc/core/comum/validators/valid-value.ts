/**
 * PJe-Calc v2.15.1 — ValidValue (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue
 */
import type { ValidRule } from './valid-rule';

export interface ValidValueSpec {
  /** Construtor de ValidRule (classe ou factory). */
  validRule: new () => ValidRule;
  parameters?: string[];
  flag?: number;
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0004}"
}

export interface ValidValue_ {
  validRule: new () => ValidRule;
  parameters: string[];
  flag: number;
  groups: number[];
  condition: string;
  message: string;
}

export function validValue(spec: ValidValueSpec): ValidValue_ {
  return {
    validRule: spec.validRule,
    parameters: spec.parameters ?? [],
    flag: spec.flag ?? 0,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0004}',
  };
}
