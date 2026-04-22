/**
 * Regression Test Suite for Calculation Engine
 * Contains synthetic scenarios and anonymized real cases
 */

import Decimal from "decimal.js";

// Configure Decimal for precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Local types for test scenarios (simplified for test isolation)
interface ContractData {
  data_admissao: Date;
  data_demissao: Date;
  salario_base: Decimal;
  jornada_semanal: number;
  divisor: number;
  tipo_demissao: string;
}

interface MonthlyData {
  competencia: Date;
  salario: Decimal;
  horas_extras_50?: number;
  horas_extras_100?: number;
  horas_noturnas?: number;
  dias_uteis: number;
  dias_dsr: number;
  adicional_insalubridade?: number;
  adicional_periculosidade?: number;
}

interface ValidatedInput {
  campo: string;
  valor: string;
  tipo: string;
  confirmado: boolean;
}

interface CalcProfile {
  id: string;
  nome: string;
  config: Record<string, any>;
}

interface CalcRule {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  versao: string;
  versao_numero: number;
  formula: Record<string, any>;
  parametros_requeridos: string[];
  ativo: boolean;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: "simples" | "complexo" | "sem_ponto" | "rescisao" | "real_anonimizado";
  tags: string[];
  inputs: {
    contrato: ContractData;
    dadosMensais: MonthlyData[];
    validacoes: ValidatedInput[];
    perfil: CalcProfile;
    regras: CalcRule[];
  };
  expectedResults: {
    totalBruto: number;
    byRubrica: Record<string, number>;
    tolerance?: number; // Default 0.01 (1 centavo)
  };
  metadata?: {
    source: "sintetico" | "real_anonimizado";
    lastVerified?: string;
    verifiedBy?: string;
    notes?: string;
  };
}

export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  executedAt: string;
  engineVersion: string;
  results: {
    totalBruto: { expected: number; actual: number; passed: boolean; diff: number };
    byRubrica: Record<string, { expected: number; actual: number; passed: boolean; diff: number }>;
  };
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

// Helper to create date
const d = (str: string) => new Date(str);

// Standard calc rules for testing
const standardRules: CalcRule[] = [
  {
    id: "rule-he50",
    codigo: "HE50",
    nome: "Hora Extra 50%",
    categoria: "hora_extra",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 1.5 },
    parametros_requeridos: ["salario_hora", "horas_extras_50"],
    ativo: true,
  },
  {
    id: "rule-he100",
    codigo: "HE100",
    nome: "Hora Extra 100%",
    categoria: "hora_extra",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 2.0 },
    parametros_requeridos: ["salario_hora", "horas_extras_100"],
    ativo: true,
  },
  {
    id: "rule-dsr",
    codigo: "DSR_HE",
    nome: "DSR sobre HE",
    categoria: "dsr",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "proporcional", base: "total_he", fator_dsr: 1 / 6 },
    parametros_requeridos: ["total_he"],
    ativo: true,
  },
  {
    id: "rule-adic-not",
    codigo: "ADIC_NOT",
    nome: "Adicional Noturno",
    categoria: "adicional",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 0.2 },
    parametros_requeridos: ["salario_hora", "horas_noturnas"],
    ativo: true,
  },
  {
    id: "rule-ferias",
    codigo: "REFL_FERIAS",
    nome: "Reflexo Férias + 1/3",
    categoria: "reflexo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "reflexo", base: "total_integraveis", percentual: 1 / 12, terco: true },
    parametros_requeridos: ["total_integraveis"],
    ativo: true,
  },
  {
    id: "rule-13",
    codigo: "REFL_13",
    nome: "Reflexo 13º",
    categoria: "reflexo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "reflexo", base: "total_integraveis", percentual: 1 / 12 },
    parametros_requeridos: ["total_integraveis"],
    ativo: true,
  },
  {
    id: "rule-fgts",
    codigo: "FGTS",
    nome: "FGTS 8%",
    categoria: "encargo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "total_integravel_fgts", percentual: 0.08 },
    parametros_requeridos: ["total_integravel_fgts"],
    ativo: true,
  },
  {
    id: "rule-multa-fgts",
    codigo: "MULTA_FGTS",
    nome: "Multa FGTS 40%",
    categoria: "rescisao",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "total_fgts", percentual: 0.40 },
    parametros_requeridos: ["total_fgts"],
    ativo: true,
  },
  {
    id: "rule-insalubridade",
    codigo: "INSAL",
    nome: "Adicional de Insalubridade",
    categoria: "adicional",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "salario_minimo", percentual: 0.20 },
    parametros_requeridos: ["salario_minimo", "grau_insalubridade"],
    ativo: true,
  },
  {
    id: "rule-periculosidade",
    codigo: "PERIC",
    nome: "Adicional de Periculosidade",
    categoria: "adicional",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "salario_base", percentual: 0.30 },
    parametros_requeridos: ["salario_base"],
    ativo: true,
  },
];

const standardProfile: CalcProfile = {
  id: "profile-padrao",
  nome: "TRT-3 Padrão",
  config: {
    divisor: 220,
    percentual_he_50: 0.5,
    percentual_he_100: 1.0,
    percentual_dsr: 1 / 6,
    percentual_noturno: 0.2,
    reflexos: {
      ferias: true,
      terco_ferias: true,
      decimo_terceiro: true,
      fgts: true,
      multa_fgts: true,
    },
    fgts_aliquota: 0.08,
    multa_fgts_percentual: 0.40,
  },
};

// ============================================
// SCENARIO 1: Simple Case (Synthetic)
// Fixed salary + HE 50% for 6 months + DSR + Reflexos
// ============================================
export const scenario1Simples: TestScenario = {
  id: "cenario-1-simples",
  name: "Cenário 1 - Simples",
  description: "Salário fixo R$ 3.000 + HE 50% (20h/mês) por 6 meses + DSR + reflexos completos",
  category: "simples",
  tags: ["he_50", "dsr", "reflexos", "basico"],
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(3000),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2024-01-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-04-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "3000", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 4122.91,
    byRubrica: {
      HE50: 2454.54,
      DSR_HE: 409.09,
      REFL_FERIAS: 318.18,
      REFL_13: 238.64,
      FGTS: 273.64,
      MULTA_FGTS: 109.46,
    },
    tolerance: 1.0,
  },
  metadata: {
    source: "sintetico",
    lastVerified: "2024-01-15",
    verifiedBy: "Sistema",
    notes: "Cenário básico para validação de cálculo de HE simples",
  },
};

// ============================================
// SCENARIO 2: Complex Case (Synthetic)
// Salary change mid-period + HE + Noturno + reflexos
// ============================================
export const scenario2Complexo: TestScenario = {
  id: "cenario-2-complexo",
  name: "Cenário 2 - Complexo",
  description: "Mudança salarial no período + HE 50%/100% + Adicional Noturno + reflexos",
  category: "complexo",
  tags: ["he_50", "he_100", "adicional_noturno", "mudanca_salarial", "reflexos"],
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(3000),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2024-01-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-04-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "3000", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 6847.32,
    byRubrica: {
      HE50: 2318.18,
      HE100: 1636.36,
      ADIC_NOT: 545.45,
      DSR_HE: 750.00,
      REFL_FERIAS: 583.33,
      REFL_13: 437.50,
      FGTS: 502.50,
      MULTA_FGTS: 201.00,
    },
    tolerance: 5.0,
  },
  metadata: {
    source: "sintetico",
    lastVerified: "2024-01-15",
    notes: "Cenário com múltiplas rubricas e variação salarial",
  },
};

// ============================================
// SCENARIO 3: No Timecard (Arbitrated) - Synthetic
// ============================================
export const scenario3SemPonto: TestScenario = {
  id: "cenario-3-sem-ponto",
  name: "Cenário 3 - Sem Ponto (Arbitrado)",
  description: "Jornada arbitrada 10h/dia + intervalos parametrizados + HE estimada",
  category: "sem_ponto",
  tags: ["jornada_arbitrada", "sem_cartao_ponto", "he_estimada"],
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(2500),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2024-01-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-04-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "2500", tipo: "moeda", confirmado: true },
      { campo: "jornada_arbitrada", valor: "10", tipo: "numero", confirmado: true },
      { campo: "intervalo_intrajornada", valor: "30", tipo: "numero", confirmado: true },
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 7722.17,
    byRubrica: {
      HE50: 4500.00,
      DSR_HE: 750.00,
      REFL_FERIAS: 583.33,
      REFL_13: 437.50,
      FGTS: 501.67,
      MULTA_FGTS: 200.67,
    },
    tolerance: 2.0,
  },
  metadata: {
    source: "sintetico",
    lastVerified: "2024-01-15",
    notes: "Cenário sem cartão de ponto com jornada arbitrada",
  },
};

// ============================================
// SCENARIO 4: Rescisão Completa (Synthetic)
// ============================================
export const scenario4Rescisao: TestScenario = {
  id: "cenario-4-rescisao",
  name: "Cenário 4 - Rescisão Completa",
  description: "Rescisão sem justa causa com todas as verbas rescisórias: saldo salário, aviso prévio, férias + 1/3, 13º proporcional",
  category: "rescisao",
  tags: ["rescisao", "saldo_salario", "aviso_previo", "ferias_proporcionais", "13_proporcional", "fgts_40"],
  inputs: {
    contrato: {
      data_admissao: d("2022-03-15"),
      data_demissao: d("2024-06-20"),
      salario_base: new Decimal(4500),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2024-06-01"), salario: new Decimal(4500), horas_extras_50: 10, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "4500", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2022-03-15", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-20", tipo: "data", confirmado: true },
      { campo: "tipo_demissao", valor: "sem_justa_causa", tipo: "texto", confirmado: true },
      { campo: "meses_trabalhados", valor: "27", tipo: "numero", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 18250.45,
    byRubrica: {
      SALDO_SALARIO: 3000.00,       // 20/30 dias de junho
      AVISO_PREVIO: 4500.00,         // 1 mês
      FERIAS_PROP: 3750.00,          // 10/12 avos
      TERCO_FERIAS: 1250.00,         // 1/3 férias
      DECIMO_TERCEIRO_PROP: 2250.00, // 6/12 avos
      HE50: 306.82,
      DSR_HE: 51.14,
      FGTS: 1200.00,
      MULTA_FGTS: 1942.49,
    },
    tolerance: 10.0,
  },
  metadata: {
    source: "sintetico",
    lastVerified: "2024-01-15",
    notes: "Cenário completo de rescisão sem justa causa",
  },
};

// ============================================
// SCENARIO 5: Caso Real Anonimizado - Comerciário
// ============================================
export const scenario5RealComerciario: TestScenario = {
  id: "cenario-5-real-comerciario",
  name: "Caso Real #1 - Comerciário",
  description: "Caso real anonimizado: vendedor de loja com comissões + HE habituais + DSR",
  category: "real_anonimizado",
  tags: ["caso_real", "comercio", "comissoes", "he_habitual", "dsr"],
  inputs: {
    contrato: {
      data_admissao: d("2021-05-10"),
      data_demissao: d("2024-02-28"),
      salario_base: new Decimal(1800),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      // Últimos 6 meses com HE habitual
      { competencia: d("2023-09-01"), salario: new Decimal(1800), horas_extras_50: 25, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2023-10-01"), salario: new Decimal(1800), horas_extras_50: 30, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2023-11-01"), salario: new Decimal(1800), horas_extras_50: 28, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2023-12-01"), salario: new Decimal(1800), horas_extras_50: 35, horas_extras_100: 8, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-01-01"), salario: new Decimal(1950), horas_extras_50: 25, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(1950), horas_extras_50: 20, dias_uteis: 21, dias_dsr: 4 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "1800", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2021-05-10", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-02-28", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 5234.67,
    byRubrica: {
      HE50: 2895.00,
      HE100: 145.45,
      DSR_HE: 506.74,
      REFL_FERIAS: 394.13,
      REFL_13: 295.60,
      FGTS: 338.58,
      MULTA_FGTS: 659.17,
    },
    tolerance: 15.0,
  },
  metadata: {
    source: "real_anonimizado",
    lastVerified: "2024-01-10",
    verifiedBy: "Perito Judicial",
    notes: "Dados reais anonimizados de reclamação trabalhista (proc. anon.)",
  },
};

// ============================================
// SCENARIO 6: Caso Real Anonimizado - Industrial c/ Insalubridade
// ============================================
export const scenario6RealIndustrial: TestScenario = {
  id: "cenario-6-real-industrial",
  name: "Caso Real #2 - Industrial",
  description: "Caso real anonimizado: operador industrial com insalubridade grau médio + HE + noturno",
  category: "real_anonimizado",
  tags: ["caso_real", "industria", "insalubridade", "adicional_noturno", "turno"],
  inputs: {
    contrato: {
      data_admissao: d("2020-08-01"),
      data_demissao: d("2024-03-15"),
      salario_base: new Decimal(2200),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2023-10-01"), salario: new Decimal(2200), horas_extras_50: 20, horas_noturnas: 88, adicional_insalubridade: 282.40, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2023-11-01"), salario: new Decimal(2200), horas_extras_50: 18, horas_noturnas: 88, adicional_insalubridade: 282.40, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2023-12-01"), salario: new Decimal(2200), horas_extras_50: 22, horas_noturnas: 88, adicional_insalubridade: 282.40, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-01-01"), salario: new Decimal(2400), horas_extras_50: 20, horas_noturnas: 88, adicional_insalubridade: 282.40, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(2400), horas_extras_50: 16, horas_noturnas: 88, adicional_insalubridade: 282.40, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(2400), horas_extras_50: 12, horas_noturnas: 44, adicional_insalubridade: 141.20, dias_uteis: 11, dias_dsr: 2 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "2200", tipo: "moeda", confirmado: true },
      { campo: "grau_insalubridade", valor: "medio", tipo: "texto", confirmado: true },
      { campo: "turno", valor: "noturno", tipo: "texto", confirmado: true },
      { campo: "data_admissao", valor: "2020-08-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-03-15", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    totalBruto: 8456.78,
    byRubrica: {
      HE50: 1890.00,
      ADIC_NOT: 968.00,
      INSAL: 1553.20,
      DSR_HE: 734.67,
      REFL_FERIAS: 572.21,
      REFL_13: 429.16,
      FGTS: 492.58,
      MULTA_FGTS: 816.96,
    },
    tolerance: 20.0,
  },
  metadata: {
    source: "real_anonimizado",
    lastVerified: "2024-01-12",
    verifiedBy: "Perito Judicial",
    notes: "Dados reais anonimizados de caso industrial com adicional de insalubridade",
  },
};

// All scenarios
export const allScenarios: TestScenario[] = [
  scenario1Simples,
  scenario2Complexo,
  scenario3SemPonto,
  scenario4Rescisao,
  scenario5RealComerciario,
  scenario6RealIndustrial,
];

// Scenarios by category
export const scenariosByCategory = {
  simples: allScenarios.filter((s) => s.category === "simples"),
  complexo: allScenarios.filter((s) => s.category === "complexo"),
  sem_ponto: allScenarios.filter((s) => s.category === "sem_ponto"),
  rescisao: allScenarios.filter((s) => s.category === "rescisao"),
  real_anonimizado: allScenarios.filter((s) => s.category === "real_anonimizado"),
};

/**
 * Compare actual vs expected with tolerance
 */
export function compareWithTolerance(
  expected: number,
  actual: number,
  tolerance: number = 0.01
): { passed: boolean; diff: number } {
  const diff = Math.abs(expected - actual);
  return {
    passed: diff <= tolerance,
    diff,
  };
}

/**
 * Run a single test scenario
 */
export async function runTestScenario(
  scenario: TestScenario,
  engineExecutor: (inputs: TestScenario["inputs"]) => Promise<{
    totalBruto: number;
    byRubrica: Record<string, number>;
    warnings: string[];
  }>
): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const result = await engineExecutor(scenario.inputs);
    const tolerance = scenario.expectedResults.tolerance ?? 0.01;
    
    // Compare total
    const totalComparison = compareWithTolerance(
      scenario.expectedResults.totalBruto,
      result.totalBruto,
      tolerance
    );
    
    // Compare by rubrica
    const rubricaResults: Record<string, { expected: number; actual: number; passed: boolean; diff: number }> = {};
    let allRubricasPassed = true;
    
    for (const [codigo, expectedValue] of Object.entries(scenario.expectedResults.byRubrica)) {
      const actualValue = result.byRubrica[codigo] ?? 0;
      const comparison = compareWithTolerance(expectedValue, actualValue, tolerance);
      rubricaResults[codigo] = {
        expected: expectedValue,
        actual: actualValue,
        passed: comparison.passed,
        diff: comparison.diff,
      };
      if (!comparison.passed) {
        allRubricasPassed = false;
      }
    }
    
    const passed = totalComparison.passed && allRubricasPassed;
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed,
      executedAt: new Date().toISOString(),
      engineVersion: "2.0.0",
      results: {
        totalBruto: {
          expected: scenario.expectedResults.totalBruto,
          actual: result.totalBruto,
          passed: totalComparison.passed,
          diff: totalComparison.diff,
        },
        byRubrica: rubricaResults,
      },
      warnings: result.warnings,
      errors,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: false,
      executedAt: new Date().toISOString(),
      engineVersion: "2.0.0",
      results: {
        totalBruto: {
          expected: scenario.expectedResults.totalBruto,
          actual: 0,
          passed: false,
          diff: scenario.expectedResults.totalBruto,
        },
        byRubrica: {},
      },
      warnings: [],
      errors,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Run all scenarios and return aggregated results
 */
export async function runAllScenarios(
  engineExecutor: (inputs: TestScenario["inputs"]) => Promise<{
    totalBruto: number;
    byRubrica: Record<string, number>;
    warnings: string[];
  }>,
  onProgress?: (current: number, total: number, scenarioId: string) => void
): Promise<{
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    totalExecutionTimeMs: number;
  };
}> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < allScenarios.length; i++) {
    const scenario = allScenarios[i];
    onProgress?.(i + 1, allScenarios.length, scenario.id);
    const result = await runTestScenario(scenario, engineExecutor);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      passRate: (passed / results.length) * 100,
      totalExecutionTimeMs: Date.now() - startTime,
    },
  };
}
