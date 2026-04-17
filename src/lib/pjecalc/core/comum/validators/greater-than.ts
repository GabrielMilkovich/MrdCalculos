/**
 * PJe-Calc v2.15.1 — GreaterThan (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.GreaterThan
 */
export interface GreaterThanSpec {
  value: string; // path do atributo com que se compara
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0007}"
}

export interface GreaterThan_ {
  value: string;
  groups: number[];
  condition: string;
  message: string;
}

export function greaterThan(spec: GreaterThanSpec): GreaterThan_ {
  return {
    value: spec.value,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0007}',
  };
}
