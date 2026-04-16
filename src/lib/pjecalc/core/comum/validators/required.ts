/**
 * PJe-Calc v2.15.1 — Required (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.Required
 */
export interface RequiredSpec {
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0003}"
}

export function required(spec: RequiredSpec = {}): Required_ {
  return {
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0003}',
  };
}

export interface Required_ {
  groups: number[];
  condition: string;
  message: string;
}
