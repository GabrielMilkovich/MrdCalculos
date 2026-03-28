/**
 * =====================================================
 * TERCEIROS CONTRIBUTIONS (Sistema S)
 * =====================================================
 *
 * Third-party contributions calculation for Brazilian labor law.
 * The FPAS code determines which entities (SESC, SENAC, SESI, SENAI, etc.)
 * the employer must contribute to.
 *
 * Key rates (over total payroll):
 *   - Salario-Educacao: 2.5% (all FPAS)
 *   - INCRA: 0.2% (most FPAS) or 2.5% (rural)
 *   - SEBRAE: 0.6% or 0.3%
 *   - SESC/SENAC (commerce): 1.5% + 1.0%
 *   - SESI/SENAI (industry): 1.5% + 1.0%
 *   - SENAR (rural): 2.5%
 *   - SEST/SENAT (transport): 1.5% + 1.0%
 *   - SESCOOP (cooperatives): 2.5%
 *
 * Reference: Instrucao Normativa RFB 2.110/2022, Anexos
 */

import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// --- Types ---

export interface TerceirosEntidade {
  nome: string;
  sigla: string;
  aliquota: number; // percentage, e.g. 1.5 = 1.5%
  ativa: boolean;
}

export interface TerceirosConfig {
  apurar: boolean;
  fpas: string; // FPAS code
  entidades: TerceirosEntidade[];
}

export interface TerceirosResultItem {
  entidade: string;
  sigla: string;
  aliquota: number;
  valor: number;
}

export interface TerceirosResult {
  items: TerceirosResultItem[];
  total_aliquota: number;
  total_valor: number;
}

// --- FPAS Definitions ---

/**
 * FPAS code to entity mapping.
 * Each FPAS code determines which Sistema S entities apply.
 */
export interface FPASDefinition {
  codigo: string;
  descricao: string;
  atividade: string;
  entidades: Omit<TerceirosEntidade, "ativa">[];
  total_terceiros: number;
}

export const FPAS_DEFINITIONS: FPASDefinition[] = [
  {
    codigo: "515",
    descricao: "Comercio em geral",
    atividade: "Comercio",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAC", sigla: "SENAC", aliquota: 1.0 },
      { nome: "SESC", sigla: "SESC", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "507",
    descricao: "Industria em geral",
    atividade: "Industria",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAI", sigla: "SENAI", aliquota: 1.0 },
      { nome: "SESI", sigla: "SESI", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "531",
    descricao: "Transporte rodoviario",
    atividade: "Transporte",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAT", sigla: "SENAT", aliquota: 1.0 },
      { nome: "SEST", sigla: "SEST", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "566",
    descricao: "Servicos de comunicacao e telecomunicacoes",
    atividade: "Comunicacao/Telecom",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAC", sigla: "SENAC", aliquota: 1.0 },
      { nome: "SESC", sigla: "SESC", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "574",
    descricao: "Servicos de saude",
    atividade: "Saude",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAC", sigla: "SENAC", aliquota: 1.0 },
      { nome: "SESC", sigla: "SESC", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "582",
    descricao: "Ensino",
    atividade: "Educacao",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAC", sigla: "SENAC", aliquota: 1.0 },
      { nome: "SESC", sigla: "SESC", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "604",
    descricao: "Atividades financeiras e bancarias",
    atividade: "Financeiro/Bancario",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAC", sigla: "SENAC", aliquota: 1.0 },
      { nome: "SESC", sigla: "SESC", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "787",
    descricao: "Cooperativas em geral",
    atividade: "Cooperativas",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SESCOOP", sigla: "SESCOOP", aliquota: 2.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.3 },
    ],
    total_terceiros: 5.5,
  },
  {
    codigo: "825",
    descricao: "Atividades rurais - Agricultura",
    atividade: "Rural",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 2.5 },
      { nome: "SENAR", sigla: "SENAR", aliquota: 2.5 },
    ],
    total_terceiros: 7.5,
  },
  {
    codigo: "833",
    descricao: "Atividade rural - Agroindústria",
    atividade: "Agroindustria",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAR", sigla: "SENAR", aliquota: 2.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "680",
    descricao: "Construcao civil",
    atividade: "Construcao",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
      { nome: "SENAI", sigla: "SENAI", aliquota: 1.0 },
      { nome: "SESI", sigla: "SESI", aliquota: 1.5 },
      { nome: "SEBRAE", sigla: "SEBRAE", aliquota: 0.6 },
    ],
    total_terceiros: 5.8,
  },
  {
    codigo: "736",
    descricao: "Administracao publica direta e autarquica",
    atividade: "Administracao Publica",
    entidades: [
      { nome: "Salario-Educacao", sigla: "SAL-EDUC", aliquota: 2.5 },
      { nome: "INCRA", sigla: "INCRA", aliquota: 0.2 },
    ],
    total_terceiros: 2.7,
  },
];

// --- Calculation ---

/**
 * Get FPAS definition by code
 */
export function getFPASByCodigo(codigo: string): FPASDefinition | undefined {
  return FPAS_DEFINITIONS.find((f) => f.codigo === codigo);
}

/**
 * Build a default TerceirosConfig from a FPAS code
 */
export function buildTerceirosConfigFromFPAS(fpas: string): TerceirosConfig {
  const def = getFPASByCodigo(fpas);
  if (!def) {
    return {
      apurar: false,
      fpas,
      entidades: [],
    };
  }

  return {
    apurar: true,
    fpas,
    entidades: def.entidades.map((e) => ({
      ...e,
      ativa: true,
    })),
  };
}

/**
 * Calculate third-party contributions for a given payroll base.
 * The base is the same INSS contribution base (gross salary/remuneration).
 *
 * @param baseCalculo - INSS-equivalent contribution base for the competencia
 * @param config - Active configuration with entities and rates
 * @returns Itemized breakdown and totals
 */
export function calcularTerceiros(
  baseCalculo: number,
  config: TerceirosConfig
): TerceirosResult {
  if (!config.apurar || config.entidades.length === 0) {
    return { items: [], total_aliquota: 0, total_valor: 0 };
  }

  const base = new Decimal(baseCalculo);
  const items: TerceirosResultItem[] = [];
  let totalAliq = new Decimal(0);
  let totalValor = new Decimal(0);

  for (const ent of config.entidades) {
    if (!ent.ativa) continue;

    const aliq = new Decimal(ent.aliquota).div(100);
    const valor = base.mul(aliq).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    items.push({
      entidade: ent.nome,
      sigla: ent.sigla,
      aliquota: ent.aliquota,
      valor: valor.toNumber(),
    });

    totalAliq = totalAliq.add(ent.aliquota);
    totalValor = totalValor.add(valor);
  }

  return {
    items,
    total_aliquota: totalAliq.toNumber(),
    total_valor: totalValor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
  };
}

/**
 * Calculate third-party contributions for multiple competencias.
 * Used when computing the full monthly breakdown.
 *
 * @param basesCalculo - Map of competencia (YYYY-MM) to INSS base
 * @param config - Active configuration
 * @returns Map of competencia to result
 */
export function calcularTerceirosMensal(
  basesCalculo: Map<string, number>,
  config: TerceirosConfig
): Map<string, TerceirosResult> {
  const results = new Map<string, TerceirosResult>();

  for (const [comp, base] of basesCalculo) {
    results.set(comp, calcularTerceiros(base, config));
  }

  return results;
}

/**
 * Consolidate monthly terceiros results into totals per entity.
 */
export function consolidarTerceiros(
  mensal: Map<string, TerceirosResult>
): TerceirosResult {
  const totais = new Map<string, { entidade: string; sigla: string; aliquota: number; valor: Decimal }>();
  let grandTotal = new Decimal(0);

  for (const result of mensal.values()) {
    for (const item of result.items) {
      const existing = totais.get(item.sigla);
      if (existing) {
        existing.valor = existing.valor.add(item.valor);
      } else {
        totais.set(item.sigla, {
          entidade: item.entidade,
          sigla: item.sigla,
          aliquota: item.aliquota,
          valor: new Decimal(item.valor),
        });
      }
      grandTotal = grandTotal.add(item.valor);
    }
  }

  const items: TerceirosResultItem[] = [];
  let totalAliq = 0;
  for (const [, t] of totais) {
    items.push({
      entidade: t.entidade,
      sigla: t.sigla,
      aliquota: t.aliquota,
      valor: t.valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    });
    totalAliq += t.aliquota;
  }

  return {
    items,
    total_aliquota: totalAliq,
    total_valor: grandTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
  };
}
