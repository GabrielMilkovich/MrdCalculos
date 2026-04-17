/**
 * PJe-Calc v2.15.1 — LessOrEqualThan (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.LessOrEqualThan
 */
export interface LessOrEqualThanSpec {
  value: string;
  groups?: number[];
  condition?: string;
  message?: string;
}

export interface LessOrEqualThan_ {
  value: string;
  groups: number[];
  condition: string;
  message: string;
}

export function lessOrEqualThan(spec: LessOrEqualThanSpec): LessOrEqualThan_ {
  return {
    value: spec.value,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0009}',
  };
}
