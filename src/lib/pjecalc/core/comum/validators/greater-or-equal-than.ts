/**
 * PJe-Calc v2.15.1 — GreaterOrEqualThan (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan
 */
export interface GreaterOrEqualThanSpec {
  value: string;
  groups?: number[];
  condition?: string;
  message?: string;
}

export interface GreaterOrEqualThan_ {
  value: string;
  groups: number[];
  condition: string;
  message: string;
}

export function greaterOrEqualThan(spec: GreaterOrEqualThanSpec): GreaterOrEqualThan_ {
  return {
    value: spec.value,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0008}',
  };
}
