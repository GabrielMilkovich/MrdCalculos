/**
 * PJe-Calc v2.15.1 — Compared (annotation TS-adaptada)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.Compared
 */
export interface ComparedSpec {
  with: string;
  result: number; // -1, 0, 1 (compareTo result)
  not?: boolean;
  groups?: number[];
  condition?: string;
  message?: string;
}

export interface Compared_ {
  with: string;
  result: number;
  not: boolean;
  groups: number[];
  condition: string;
  message: string;
}

export function compared(spec: ComparedSpec): Compared_ {
  return {
    with: spec.with,
    result: spec.result,
    not: spec.not ?? false,
    groups: spec.groups ?? [],
    condition: spec.condition ?? '',
    message: spec.message ?? '{MSG0004}',
  };
}
