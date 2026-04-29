/**
 * =====================================================
 * TRIBUNAIS — Lista canônica para identificação CNJ formal
 * =====================================================
 *
 * Mantém a lista de "Justiça" (Trabalho/Federal/Estadual) e
 * Tribunais (TRTs 01-24) usada nos campos de Identificação do
 * Processo do módulo Parâmetros Gerais (paridade com PJe-Calc).
 *
 * Fonte: https://www.cnj.jus.br/programas-e-acoes/justica-em-numeros/
 */

export type JusticaTipo = 'TRABALHO' | 'FEDERAL' | 'ESTADUAL';

export interface JusticaOption {
  value: JusticaTipo;
  label: string;
}

export const JUSTICAS: JusticaOption[] = [
  { value: 'TRABALHO', label: 'Justiça do Trabalho' },
  { value: 'FEDERAL', label: 'Justiça Federal' },
  { value: 'ESTADUAL', label: 'Justiça Estadual' },
];

/**
 * Tribunais Regionais do Trabalho (TRT01..TRT24).
 * Hardcoded conforme requisito de paridade com PJe-Calc oficial.
 */
export const TRIBUNAIS_TRT: ReadonlyArray<string> = Object.freeze(
  Array.from({ length: 24 }, (_, i) => `TRT${String(i + 1).padStart(2, '0')}`),
);

export interface TribunalOption {
  value: string;
  label: string;
  /** Referência (UFs principais) — meramente informativa para tooltips. */
  uf?: string;
}

const TRT_UF_MAP: Record<string, string> = {
  TRT01: 'RJ',
  TRT02: 'SP (Capital e Grande SP)',
  TRT03: 'MG',
  TRT04: 'RS',
  TRT05: 'BA',
  TRT06: 'PE',
  TRT07: 'CE',
  TRT08: 'PA, AP',
  TRT09: 'PR',
  TRT10: 'DF, TO',
  TRT11: 'AM, RR',
  TRT12: 'SC',
  TRT13: 'PB',
  TRT14: 'RO, AC',
  TRT15: 'SP (Interior)',
  TRT16: 'MA',
  TRT17: 'ES',
  TRT18: 'GO',
  TRT19: 'AL',
  TRT20: 'SE',
  TRT21: 'RN',
  TRT22: 'PI',
  TRT23: 'MT',
  TRT24: 'MS',
};

export const TRIBUNAIS_OPTIONS: ReadonlyArray<TribunalOption> = Object.freeze(
  TRIBUNAIS_TRT.map((sigla) => ({
    value: sigla,
    label: `${sigla} — ${TRT_UF_MAP[sigla] ?? ''}`.trim(),
    uf: TRT_UF_MAP[sigla],
  })),
);

export function isTribunalValido(value: string | null | undefined): boolean {
  if (!value) return false;
  return TRIBUNAIS_TRT.includes(value);
}
