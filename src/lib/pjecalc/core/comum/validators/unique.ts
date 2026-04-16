/**
 * PJe-Calc v2.15.1 — Unique (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.Unique
 */
export interface UniqueSpec {
  fields: string[];
  groups?: number[];
  condition?: string;
  message?: string; // default "{MSG0006}"
}

export interface Unique_ {
  fields: string[];
  groups: number[];
  condition: string;
  message: string;
}

export function unique(spec: UniqueSpec): Unique_ {
  return {
    fields: spec.fields,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0006}',
  };
}
