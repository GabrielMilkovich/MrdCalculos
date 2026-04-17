/**
 * PJe-Calc v2.15.1 — Min (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.Min
 */
export interface MinSpec {
  value: string; // valor mínimo em string (BigDecimal em Java)
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0004}"
}

export interface Min_ {
  value: string;
  groups: number[];
  condition: string;
  message: string;
}

export function min(spec: MinSpec): Min_ {
  return {
    value: spec.value,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0004}',
  };
}
