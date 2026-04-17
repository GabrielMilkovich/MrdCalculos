/**
 * Tabelas históricas INSS / IR / Salário Mínimo (1996–atual).
 * Fontes: Portarias MPS, Lei 8.212/91, Lei 9.876/99, Lei 10.887/2004,
 * Lei 11.944/2009, EC 103/2019; Lei 9.250/95, Lei 11.119/2005, 11.311/2006,
 * 11.482/2007, 12.469/2011, 13.149/2015, 14.663/2023, 14.848/2024.
 * Cobertura: marcos normativos principais. Valores como `number` (tabela
 * de referência, convertida em Decimal no engine).
 */

export interface FaixaINSS {
  readonly ate: number;
  readonly aliquota: number;
}

export interface FaixaIR {
  readonly ate: number;
  readonly aliquota: number;
  readonly deducao: number;
}

export interface RegistroINSS {
  readonly competencia_inicio: string; // YYYY-MM-DD
  readonly competencia_fim: string | null;
  readonly teto: number;
  readonly faixas: readonly FaixaINSS[];
}

export interface RegistroIR {
  readonly competencia_inicio: string;
  readonly competencia_fim: string | null;
  readonly faixas: readonly FaixaIR[];
  readonly deducao_dependente: number;
}

// INSS — 1996-2025. Pré-EC 103 (até 02/2020): alíquota única por faixa.
// Pós-EC 103 (03/2020+): progressivo real (4 faixas).

export const INSS_FAIXAS_HISTORICO: readonly RegistroINSS[] = [
  // 1996 — MP 1.523/1996 + Portaria MPS 3.242/1996 (pré-reforma, alíquotas 8/9/11%)
  {
    competencia_inicio: '1996-01-01',
    competencia_fim: '1996-12-31',
    teto: 957.56,
    faixas: [
      { ate: 249.80, aliquota: 0.08 },
      { ate: 416.33, aliquota: 0.09 },
      { ate: 957.56, aliquota: 0.11 },
    ],
  },
  // 2000 — Lei 9.876/99 (consolidação faixas 8/9/11%)
  {
    competencia_inicio: '2000-01-01',
    competencia_fim: '2000-12-31',
    teto: 1078.98,
    faixas: [
      { ate: 388.43, aliquota: 0.08 },
      { ate: 647.38, aliquota: 0.09 },
      { ate: 1078.98, aliquota: 0.11 },
    ],
  },
  // 2003 — Portaria MPS 727/2003
  {
    competencia_inicio: '2003-01-01',
    competencia_fim: '2003-12-31',
    teto: 1869.34,
    faixas: [
      { ate: 560.81, aliquota: 0.08 },
      { ate: 934.67, aliquota: 0.09 },
      { ate: 1869.34, aliquota: 0.11 },
    ],
  },
  // 2004 — Lei 10.887/2004 + Portaria MPS 12/2004
  {
    competencia_inicio: '2004-01-01',
    competencia_fim: '2004-12-31',
    teto: 2400.00,
    faixas: [
      { ate: 720.00, aliquota: 0.0765 },
      { ate: 1200.00, aliquota: 0.0865 },
      { ate: 2400.00, aliquota: 0.11 },
    ],
  },
  // 2008 — Portaria MPS 77/2008 (reajuste significativo)
  {
    competencia_inicio: '2008-01-01',
    competencia_fim: '2008-12-31',
    teto: 3038.99,
    faixas: [
      { ate: 911.70, aliquota: 0.08 },
      { ate: 1519.50, aliquota: 0.09 },
      { ate: 3038.99, aliquota: 0.11 },
    ],
  },
  // 2010 — Lei 11.944/2009 + Portaria MPS 333/2010
  {
    competencia_inicio: '2010-01-01',
    competencia_fim: '2010-12-31',
    teto: 3467.40,
    faixas: [
      { ate: 1040.22, aliquota: 0.08 },
      { ate: 1733.70, aliquota: 0.09 },
      { ate: 3467.40, aliquota: 0.11 },
    ],
  },
  // 2015 — Portaria MPS 13/2015
  {
    competencia_inicio: '2015-01-01',
    competencia_fim: '2015-12-31',
    teto: 4663.75,
    faixas: [
      { ate: 1399.12, aliquota: 0.08 },
      { ate: 2331.88, aliquota: 0.09 },
      { ate: 4663.75, aliquota: 0.11 },
    ],
  },
  // 2019 — Portaria SEPRT 9/2019 (último ano pré-EC 103)
  {
    competencia_inicio: '2019-01-01',
    competencia_fim: '2020-02-29',
    teto: 6101.06,
    faixas: [
      { ate: 1751.81, aliquota: 0.08 },
      { ate: 2919.72, aliquota: 0.09 },
      { ate: 5839.45, aliquota: 0.11 },
    ],
  },
  // 03/2020 — EC 103/2019 entra em vigor (progressivo 7.5/9/12/14%)
  {
    competencia_inicio: '2020-03-01',
    competencia_fim: '2020-12-31',
    teto: 6101.06,
    faixas: [
      { ate: 1045.00, aliquota: 0.075 },
      { ate: 2089.60, aliquota: 0.09 },
      { ate: 3134.40, aliquota: 0.12 },
      { ate: 6101.06, aliquota: 0.14 },
    ],
  },
  // 2022 — Portaria MTP 12/2022
  {
    competencia_inicio: '2022-01-01',
    competencia_fim: '2022-12-31',
    teto: 7087.22,
    faixas: [
      { ate: 1212.00, aliquota: 0.075 },
      { ate: 2427.35, aliquota: 0.09 },
      { ate: 3641.03, aliquota: 0.12 },
      { ate: 7087.22, aliquota: 0.14 },
    ],
  },
  // 2024 — Portaria MPS 12/2024
  {
    competencia_inicio: '2024-01-01',
    competencia_fim: '2024-12-31',
    teto: 7786.02,
    faixas: [
      { ate: 1412.00, aliquota: 0.075 },
      { ate: 2666.68, aliquota: 0.09 },
      { ate: 4000.03, aliquota: 0.12 },
      { ate: 7786.02, aliquota: 0.14 },
    ],
  },
  // 2025 — Portaria MPS/MF 6/2025
  {
    competencia_inicio: '2025-01-01',
    competencia_fim: null,
    teto: 8157.41,
    faixas: [
      { ate: 1518.00, aliquota: 0.075 },
      { ate: 2793.88, aliquota: 0.09 },
      { ate: 5839.45, aliquota: 0.12 },
      { ate: 8157.41, aliquota: 0.14 },
    ],
  },
];

// IR mensal — 1996-2025. 1996-2008: 2 faixas (Lei 9.250/95 e sucessoras).
// 2009+: 5 faixas (Lei 11.945). 2015-2023 abr: congelada (Lei 13.149/2015).
// 2023 mai: novo isento R$2.112 (Lei 14.663). 2024+: Lei 14.848/2024.

export const IR_FAIXAS_HISTORICO: readonly RegistroIR[] = [
  // 1996 — Lei 9.250/95 (tabela original em reais)
  {
    competencia_inicio: '1996-01-01',
    competencia_fim: '2001-12-31',
    faixas: [
      { ate: 900.00, aliquota: 0, deducao: 0 },
      { ate: 1800.00, aliquota: 0.15, deducao: 135.00 },
      { ate: Infinity, aliquota: 0.275, deducao: 360.00 },
    ],
    deducao_dependente: 90.00,
  },
  // 2002 — Lei 10.451/2002 (reajuste 17.5%)
  {
    competencia_inicio: '2002-01-01',
    competencia_fim: '2006-12-31',
    faixas: [
      { ate: 1058.00, aliquota: 0, deducao: 0 },
      { ate: 2115.00, aliquota: 0.15, deducao: 158.70 },
      { ate: Infinity, aliquota: 0.275, deducao: 423.08 },
    ],
    deducao_dependente: 106.00,
  },
  // 2007 — Lei 11.311/2006
  {
    competencia_inicio: '2007-01-01',
    competencia_fim: '2007-12-31',
    faixas: [
      { ate: 1313.69, aliquota: 0, deducao: 0 },
      { ate: 2625.12, aliquota: 0.15, deducao: 197.05 },
      { ate: Infinity, aliquota: 0.275, deducao: 525.19 },
    ],
    deducao_dependente: 132.05,
  },
  // 2009 — Lei 11.945/2009 (introdução das 5 faixas)
  {
    competencia_inicio: '2009-01-01',
    competencia_fim: '2009-12-31',
    faixas: [
      { ate: 1434.59, aliquota: 0, deducao: 0 },
      { ate: 2150.00, aliquota: 0.075, deducao: 107.59 },
      { ate: 2866.70, aliquota: 0.15, deducao: 268.84 },
      { ate: 3582.00, aliquota: 0.225, deducao: 483.84 },
      { ate: Infinity, aliquota: 0.275, deducao: 662.94 },
    ],
    deducao_dependente: 144.20,
  },
  // 2011 — Lei 12.469/2011
  {
    competencia_inicio: '2011-01-01',
    competencia_fim: '2011-12-31',
    faixas: [
      { ate: 1566.61, aliquota: 0, deducao: 0 },
      { ate: 2347.85, aliquota: 0.075, deducao: 117.49 },
      { ate: 3130.51, aliquota: 0.15, deducao: 293.58 },
      { ate: 3911.63, aliquota: 0.225, deducao: 528.37 },
      { ate: Infinity, aliquota: 0.275, deducao: 723.95 },
    ],
    deducao_dependente: 157.47,
  },
  // 2015 — Lei 13.149/2015 (tabela que ficou congelada 2015-2023 abr)
  {
    competencia_inicio: '2015-04-01',
    competencia_fim: '2023-04-30',
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  // 05/2023 — Lei 14.663/2023 (novo isento R$ 2.112)
  {
    competencia_inicio: '2023-05-01',
    competencia_fim: '2024-01-31',
    faixas: [
      { ate: 2112.00, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 158.40 },
      { ate: 3751.05, aliquota: 0.15, deducao: 370.40 },
      { ate: 4664.68, aliquota: 0.225, deducao: 651.73 },
      { ate: Infinity, aliquota: 0.275, deducao: 884.96 },
    ],
    deducao_dependente: 189.59,
  },
  // 02/2024 — Lei 14.848/2024
  {
    competencia_inicio: '2024-02-01',
    competencia_fim: null,
    faixas: [
      { ate: 2259.20, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
      { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
      { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
      { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
    ],
    deducao_dependente: 189.59,
  },
];

// Salário mínimo 1988-atual. Pré-Real: valor=0 em BRL; nominal em moeda_original.

export const SALARIO_MINIMO_HISTORICO: readonly {
  readonly vigencia: string;
  readonly valor: number;
  readonly moeda_original: string;
}[] = [
  // Pré-Plano Real (1988-1994): valor=0 em BRL; moeda_original registra o nominal.
  { vigencia: '1988-01-01', valor: 0, moeda_original: 'Cz$ 8.712,00' },
  { vigencia: '1989-01-01', valor: 0, moeda_original: 'NCz$ 63,90' },
  { vigencia: '1989-06-01', valor: 0, moeda_original: 'NCz$ 120,00' },
  { vigencia: '1990-04-01', valor: 0, moeda_original: 'Cr$ 3.674,06' },
  { vigencia: '1991-02-01', valor: 0, moeda_original: 'Cr$ 17.000,00' },
  { vigencia: '1992-01-01', valor: 0, moeda_original: 'Cr$ 96.037,33' },
  { vigencia: '1993-08-01', valor: 0, moeda_original: 'CR$ 5.534,00' },
  { vigencia: '1994-07-01', valor: 64.79, moeda_original: 'R$ 64,79' },
  { vigencia: '1994-09-01', valor: 70.00, moeda_original: 'R$ 70,00' },
  { vigencia: '1995-05-01', valor: 100.00, moeda_original: 'R$ 100,00' },
  { vigencia: '1996-05-01', valor: 112.00, moeda_original: 'R$ 112,00' },
  { vigencia: '1997-05-01', valor: 120.00, moeda_original: 'R$ 120,00' },
  { vigencia: '1998-05-01', valor: 130.00, moeda_original: 'R$ 130,00' },
  { vigencia: '1999-05-01', valor: 136.00, moeda_original: 'R$ 136,00' },
  { vigencia: '2000-04-01', valor: 151.00, moeda_original: 'R$ 151,00' },
  { vigencia: '2001-04-01', valor: 180.00, moeda_original: 'R$ 180,00' },
  { vigencia: '2002-04-01', valor: 200.00, moeda_original: 'R$ 200,00' },
  { vigencia: '2003-04-01', valor: 240.00, moeda_original: 'R$ 240,00' },
  { vigencia: '2004-05-01', valor: 260.00, moeda_original: 'R$ 260,00' },
  { vigencia: '2005-05-01', valor: 300.00, moeda_original: 'R$ 300,00' },
  { vigencia: '2006-04-01', valor: 350.00, moeda_original: 'R$ 350,00' },
  { vigencia: '2007-04-01', valor: 380.00, moeda_original: 'R$ 380,00' },
  { vigencia: '2008-03-01', valor: 415.00, moeda_original: 'R$ 415,00' },
  { vigencia: '2009-02-01', valor: 465.00, moeda_original: 'R$ 465,00' },
  { vigencia: '2010-01-01', valor: 510.00, moeda_original: 'R$ 510,00' },
  { vigencia: '2011-03-01', valor: 545.00, moeda_original: 'R$ 545,00' },
  { vigencia: '2012-01-01', valor: 622.00, moeda_original: 'R$ 622,00' },
  { vigencia: '2013-01-01', valor: 678.00, moeda_original: 'R$ 678,00' },
  { vigencia: '2014-01-01', valor: 724.00, moeda_original: 'R$ 724,00' },
  { vigencia: '2015-01-01', valor: 788.00, moeda_original: 'R$ 788,00' },
  { vigencia: '2016-01-01', valor: 880.00, moeda_original: 'R$ 880,00' },
  { vigencia: '2017-01-01', valor: 937.00, moeda_original: 'R$ 937,00' },
  { vigencia: '2018-01-01', valor: 954.00, moeda_original: 'R$ 954,00' },
  { vigencia: '2019-01-01', valor: 998.00, moeda_original: 'R$ 998,00' },
  { vigencia: '2020-02-01', valor: 1045.00, moeda_original: 'R$ 1.045,00' },
  { vigencia: '2021-01-01', valor: 1100.00, moeda_original: 'R$ 1.100,00' },
  { vigencia: '2022-01-01', valor: 1212.00, moeda_original: 'R$ 1.212,00' },
  { vigencia: '2023-01-01', valor: 1302.00, moeda_original: 'R$ 1.302,00' },
  { vigencia: '2023-05-01', valor: 1320.00, moeda_original: 'R$ 1.320,00' },
  { vigencia: '2024-01-01', valor: 1412.00, moeda_original: 'R$ 1.412,00' },
  { vigencia: '2025-01-01', valor: 1518.00, moeda_original: 'R$ 1.518,00' },
];

// Helpers — pesquisa por competência

/** Normaliza competência para YYYY-MM-DD (aceita 'YYYY-MM' ou 'YYYY-MM-DD'). */
function normalizarCompetencia(competencia: string): string {
  return competencia.length === 7 ? `${competencia}-01` : competencia;
}

/**
 * Retorna o registro INSS aplicável para uma competência.
 * Null se não houver cobertura (antes de 1996-01).
 */
export function faixaINSSNaCompetencia(competencia: string): RegistroINSS | null {
  const alvo = normalizarCompetencia(competencia);
  // Ordena desc por competencia_inicio e pega o primeiro que começa <= alvo
  const ordenados = [...INSS_FAIXAS_HISTORICO].sort((a, b) =>
    b.competencia_inicio.localeCompare(a.competencia_inicio),
  );
  for (const reg of ordenados) {
    if (reg.competencia_inicio <= alvo) {
      if (reg.competencia_fim === null || reg.competencia_fim >= alvo) {
        return reg;
      }
    }
  }
  return null;
}

/** Retorna o registro IR aplicável para uma competência. */
export function faixaIRNaCompetencia(competencia: string): RegistroIR | null {
  const alvo = normalizarCompetencia(competencia);
  const ordenados = [...IR_FAIXAS_HISTORICO].sort((a, b) =>
    b.competencia_inicio.localeCompare(a.competencia_inicio),
  );
  for (const reg of ordenados) {
    if (reg.competencia_inicio <= alvo) {
      if (reg.competencia_fim === null || reg.competencia_fim >= alvo) {
        return reg;
      }
    }
  }
  return null;
}

/** Retorna o salário mínimo vigente na competência (0 se for pré-R$ 1994). */
export function salarioMinimoNaCompetencia(competencia: string): number {
  const alvo = normalizarCompetencia(competencia);
  const ordenados = [...SALARIO_MINIMO_HISTORICO].sort((a, b) =>
    b.vigencia.localeCompare(a.vigencia),
  );
  for (const reg of ordenados) {
    if (reg.vigencia <= alvo) return reg.valor;
  }
  return 0;
}
