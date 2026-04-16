/**
 * PJe-Calc v2.15.1 — LimitedTo100Years (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years
 */
export interface LimitedTo100YearsSpec {
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0011}"
}

export interface LimitedTo100Years_ {
  groups: number[];
  condition: string;
  message: string;
}

export function limitedTo100Years(spec: LimitedTo100YearsSpec = {}): LimitedTo100Years_ {
  return {
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0011}',
  };
}
