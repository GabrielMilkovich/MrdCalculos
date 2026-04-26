// =====================================================
// PJe-CALC ENGINE - CONSTANTES E TABELAS PADRÃO
// =====================================================

import type { PjeCNAEAliquotas } from './engine-types';

// INSS Progressivo 2025 (Portaria MPS/MF nº 6/2025)
export const DEFAULT_FAIXAS_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 5839.45, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// IRRF — Tabela mensal vigente a partir de mai/2025
// Lei 14.973/2024 + MP 1.294/2025 (DOU 14/04/2025): nova faixa de isenção
// elevada para R$ 2.428,80 (com desconto simplificado de 25% chega a 2 SM).
// Ground-truth confirmado pelo PJC: dedução faixa 15% = R$ 394,16
// (calculado por valorDeducao/NM = 12.218,96/31 em RRA do caso francisco-pablo).
export const DEFAULT_FAIXAS_IR = [
  { ate: 2428.80, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
];

export const DEFAULT_DEDUCAO_DEPENDENTE = 189.59;

// =====================================================
// TABELAS HISTÓRICAS INSS/IR — fallback quando banco sem seed
// Usadas por getFaixasINSSParaCompetencia / getFaixasIRParaCompetencia
// como fallback por ano da competência antes de cair no DEFAULT (2025).
// Fonte: Portarias MPS/MF e Instruções Normativas RFB anuais.
// =====================================================

// Faixas históricas INSS por ano
// Pré-EC 103/2019 (até fev/2020): alíquota única por faixa (3 faixas)
// A partir de mar/2020: progressivo com 4 faixas
export const HISTORICO_FAIXAS_INSS: Record<string, { ate: number; aliquota: number }[]> = {
  '2010': [
    { ate: 1040.22, aliquota: 0.08 },
    { ate: 1733.70, aliquota: 0.09 },
    { ate: 3467.40, aliquota: 0.11 },
  ],
  '2011': [
    { ate: 1106.52, aliquota: 0.08 },
    { ate: 1844.19, aliquota: 0.09 },
    { ate: 3689.66, aliquota: 0.11 },
  ],
  '2012': [
    { ate: 1174.86, aliquota: 0.08 },
    { ate: 1958.10, aliquota: 0.09 },
    { ate: 3916.20, aliquota: 0.11 },
  ],
  '2013': [
    { ate: 1247.70, aliquota: 0.08 },
    { ate: 2079.50, aliquota: 0.09 },
    { ate: 4159.00, aliquota: 0.11 },
  ],
  '2014': [
    { ate: 1317.07, aliquota: 0.08 },
    { ate: 2195.12, aliquota: 0.09 },
    { ate: 4390.24, aliquota: 0.11 },
  ],
  '2015': [
    { ate: 1399.12, aliquota: 0.08 },
    { ate: 2331.88, aliquota: 0.09 },
    { ate: 4663.75, aliquota: 0.11 },
  ],
  '2016': [
    { ate: 1556.94, aliquota: 0.08 },
    { ate: 2594.92, aliquota: 0.09 },
    { ate: 5189.82, aliquota: 0.11 },
  ],
  '2017': [
    { ate: 1659.38, aliquota: 0.08 },
    { ate: 2765.66, aliquota: 0.09 },
    { ate: 5531.31, aliquota: 0.11 },
  ],
  '2018': [
    { ate: 1693.72, aliquota: 0.08 },
    { ate: 2822.90, aliquota: 0.09 },
    { ate: 5645.80, aliquota: 0.11 },
  ],
  '2019': [
    { ate: 1751.81, aliquota: 0.08 },
    { ate: 2919.72, aliquota: 0.09 },
    { ate: 5839.45, aliquota: 0.11 },
  ],
  // EC 103/2019 só entra em vigor em 01/03/2020 (art. 28 EC 103).
  // Jan-Fev 2020: sistema antigo continuado (Portaria 3.659/2020 Anexo I).
  '2020-01': [
    { ate: 1830.29, aliquota: 0.08 },
    { ate: 3050.52, aliquota: 0.09 },
    { ate: 6101.06, aliquota: 0.11 },
  ],
  // Mar/2020 em diante: EC 103/2019 progressivo (Portaria 3.659/2020 Anexo II)
  '2020-03': [
    { ate: 1045.00, aliquota: 0.075 },
    { ate: 2089.60, aliquota: 0.09 },
    { ate: 3134.40, aliquota: 0.12 },
    { ate: 6101.06, aliquota: 0.14 },
  ],
  // 2021: Portaria SEPRT 477/2021
  '2021': [
    { ate: 1100.00, aliquota: 0.075 },
    { ate: 2203.48, aliquota: 0.09 },
    { ate: 3305.22, aliquota: 0.12 },
    { ate: 6433.57, aliquota: 0.14 },
  ],
  // 2022: Portaria MTP 12/2022 (reajuste INPC)
  '2022': [
    { ate: 1212.00, aliquota: 0.075 },
    { ate: 2427.35, aliquota: 0.09 },
    { ate: 3641.03, aliquota: 0.12 },
    { ate: 7087.22, aliquota: 0.14 },
  ],
  // 2023: Portaria MPS 26/2023 (jan) + Decreto 11.491/2023 (mai — novo SM)
  '2023': [
    { ate: 1320.00, aliquota: 0.075 },
    { ate: 2571.29, aliquota: 0.09 },
    { ate: 3856.94, aliquota: 0.12 },
    { ate: 7507.49, aliquota: 0.14 },
  ],
  // 2024: Portaria MPS 12/2024
  '2024': [
    { ate: 1412.00, aliquota: 0.075 },
    { ate: 2666.68, aliquota: 0.09 },
    { ate: 4000.03, aliquota: 0.12 },
    { ate: 7786.02, aliquota: 0.14 },
  ],
};

// Faixas históricas IRRF por ano — tabela mensal
// Fonte: Instruções Normativas RFB
export const HISTORICO_FAIXAS_IR: Record<
  string,
  { faixas: { ate: number; aliquota: number; deducao: number }[]; deducao_dependente: number }
> = {
  '2010': {
    faixas: [
      { ate: 1499.15, aliquota: 0, deducao: 0 },
      { ate: 2246.75, aliquota: 0.075, deducao: 112.43 },
      { ate: 2995.70, aliquota: 0.15, deducao: 280.94 },
      { ate: 3743.19, aliquota: 0.225, deducao: 505.62 },
      { ate: Infinity, aliquota: 0.275, deducao: 692.78 },
    ],
    deducao_dependente: 150.69,
  },
  '2011': {
    faixas: [
      { ate: 1566.61, aliquota: 0, deducao: 0 },
      { ate: 2347.85, aliquota: 0.075, deducao: 117.49 },
      { ate: 3130.51, aliquota: 0.15, deducao: 293.58 },
      { ate: 3911.63, aliquota: 0.225, deducao: 528.37 },
      { ate: Infinity, aliquota: 0.275, deducao: 723.95 },
    ],
    deducao_dependente: 157.47,
  },
  '2012': {
    faixas: [
      { ate: 1637.11, aliquota: 0, deducao: 0 },
      { ate: 2453.50, aliquota: 0.075, deducao: 122.78 },
      { ate: 3271.38, aliquota: 0.15, deducao: 306.80 },
      { ate: 4087.65, aliquota: 0.225, deducao: 552.15 },
      { ate: Infinity, aliquota: 0.275, deducao: 756.53 },
    ],
    deducao_dependente: 164.56,
  },
  '2013': {
    faixas: [
      { ate: 1710.78, aliquota: 0, deducao: 0 },
      { ate: 2563.91, aliquota: 0.075, deducao: 128.31 },
      { ate: 3418.59, aliquota: 0.15, deducao: 320.60 },
      { ate: 4271.59, aliquota: 0.225, deducao: 577.00 },
      { ate: Infinity, aliquota: 0.275, deducao: 790.58 },
    ],
    deducao_dependente: 171.97,
  },
  '2014': {
    faixas: [
      { ate: 1787.77, aliquota: 0, deducao: 0 },
      { ate: 2679.29, aliquota: 0.075, deducao: 134.08 },
      { ate: 3572.43, aliquota: 0.15, deducao: 335.03 },
      { ate: 4463.81, aliquota: 0.225, deducao: 602.96 },
      { ate: Infinity, aliquota: 0.275, deducao: 826.15 },
    ],
    deducao_dependente: 179.71,
  },
  '2015': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2016': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2017': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2018': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2019': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2020': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2021': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  '2022': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  // 2023 jan–abr: tabela inalterada desde 2015 (IN RFB vigente)
  '2023-01': {
    faixas: [
      { ate: 1903.98, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 142.80 },
      { ate: 3751.05, aliquota: 0.15, deducao: 354.80 },
      { ate: 4664.68, aliquota: 0.225, deducao: 636.13 },
      { ate: Infinity, aliquota: 0.275, deducao: 869.36 },
    ],
    deducao_dependente: 189.59,
  },
  // 2023 mai–dez: Lei 14.663/2023 (nova faixa de isenção R$ 2.112)
  '2023-05': {
    faixas: [
      { ate: 2112.00, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 158.40 },
      { ate: 3751.05, aliquota: 0.15, deducao: 370.40 },
      { ate: 4664.68, aliquota: 0.225, deducao: 651.73 },
      { ate: Infinity, aliquota: 0.275, deducao: 884.96 },
    ],
    deducao_dependente: 189.59,
  },
  '2024': {
    // Lei 14.848/2024 — tabela vigente a partir de fev/2024
    faixas: [
      { ate: 2259.20, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
      { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
      { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
      { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
    ],
    deducao_dependente: 189.59,
  },
  // 2025 jan–abr: tabela inalterada desde fev/2024 (Lei 14.848/2024)
  '2025-01': {
    faixas: [
      { ate: 2259.20, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
      { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
      { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
      { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
    ],
    deducao_dependente: 189.59,
  },
  // 2025 mai–dez: Lei 14.973/2024 + MP 1.294/2025 — nova isenção R$ 2.428,80
  '2025-05': {
    faixas: [
      { ate: 2428.80, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
      { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
      { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
      { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
    ],
    deducao_dependente: 189.59,
  },
};

// Seguro-Desemprego 2025 (Resolução CODEFAT)
export const SEGURO_DESEMP_2025 = {
  faixa1_ate: 2041.39,
  faixa1_mult: 0.8,
  faixa2_ate: 3402.65,
  faixa2_base: 1633.12,
  faixa2_mult: 0.5,
  teto: 2313.74,
};

// Tabela Salário-Família 2025 (Portaria MPS/MF nº 6/2025)
export const SALARIO_FAMILIA_2025 = {
  limite_remuneracao: 1819.26,
  valor_cota: 62.04,
};

// CNAE Alíquotas Comuns
export const CNAE_ALIQUOTAS_COMUNS: PjeCNAEAliquotas[] = [
  { cnae: '4711-3', descricao: 'Comércio varejista', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4120-4', descricao: 'Construção de edifícios', sat_rat: 3, terceiros: 5.8 },
  { cnae: '1011-2', descricao: 'Abate de bovinos', sat_rat: 3, terceiros: 5.8 },
  { cnae: '4921-3', descricao: 'Transporte rodoviário coletivo', sat_rat: 3, terceiros: 5.8 },
  { cnae: '8610-1', descricao: 'Atividades hospitalares', sat_rat: 3, terceiros: 5.8 },
  { cnae: '6201-5', descricao: 'Desenvolvimento de software', sat_rat: 1, terceiros: 5.8 },
  { cnae: '5611-2', descricao: 'Restaurantes e lanchonetes', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4930-2', descricao: 'Transporte rodoviário de carga', sat_rat: 3, terceiros: 5.8 },
  { cnae: '8411-6', descricao: 'Administração pública', sat_rat: 2, terceiros: 5.8 },
  { cnae: '8531-7', descricao: 'Ensino fundamental', sat_rat: 1, terceiros: 5.8 },
  { cnae: '6422-1', descricao: 'Bancos comerciais', sat_rat: 1, terceiros: 5.8 },
  { cnae: '4110-7', descricao: 'Incorporação de empreendimentos', sat_rat: 3, terceiros: 5.8 },
  { cnae: '4511-1', descricao: 'Comércio de veículos', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4781-4', descricao: 'Comércio de artigos do vestuário', sat_rat: 1, terceiros: 5.8 },
  { cnae: '4761-0', descricao: 'Papelarias e livrarias', sat_rat: 1, terceiros: 5.8 },
];

// =====================================================
// SALÁRIO MÍNIMO HISTÓRICO — fallback quando banco sem seed
// Fonte: Portarias MTE/MPS anuais (Decretos presidenciais)
// =====================================================

export const HISTORICO_SALARIO_MINIMO: { vigencia: string; valor: number }[] = [
  { vigencia: '2009-02', valor: 465.00 },
  { vigencia: '2010-01', valor: 510.00 },
  { vigencia: '2011-01', valor: 545.00 },
  { vigencia: '2012-01', valor: 622.00 },
  { vigencia: '2013-01', valor: 678.00 },
  { vigencia: '2014-01', valor: 724.00 },
  { vigencia: '2015-01', valor: 788.00 },
  { vigencia: '2016-01', valor: 880.00 },
  { vigencia: '2017-01', valor: 937.00 },
  { vigencia: '2018-01', valor: 954.00 },
  { vigencia: '2019-01', valor: 998.00 },
  { vigencia: '2020-02', valor: 1045.00 },
  { vigencia: '2021-01', valor: 1100.00 },
  { vigencia: '2022-01', valor: 1212.00 },
  { vigencia: '2023-01', valor: 1320.00 },
  { vigencia: '2024-01', valor: 1412.00 },
  { vigencia: '2025-01', valor: 1518.00 },
];

// =====================================================
// FERIADOS NACIONAIS — fallback quando banco sem seed
// =====================================================

/** Algoritmo de Meeus/Jones/Butcher para data da Páscoa */
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Retorna os feriados nacionais fixos + móveis do ano (formato YYYY-MM-DD) */
export function getFeriadosNacionaisDoAno(ano: number): string[] {
  const pascoa = calcularPascoa(ano);
  const add = (d: Date, n: number): Date => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const feriados = [
    `${ano}-01-01`,        // Confraternização Universal
    fmt(add(pascoa, -48)), // Segunda de Carnaval
    fmt(add(pascoa, -47)), // Terça de Carnaval
    fmt(add(pascoa, -2)),  // Sexta-Feira da Paixão
    `${ano}-04-21`,        // Tiradentes
    `${ano}-05-01`,        // Dia do Trabalho
    fmt(add(pascoa, 60)),  // Corpus Christi
    `${ano}-09-07`,        // Independência
    `${ano}-10-12`,        // N.S. Aparecida
    `${ano}-11-02`,        // Finados
    `${ano}-11-15`,        // Proclamação da República
    `${ano}-12-25`,        // Natal
  ];
  // Consciência Negra: nacional a partir de 2024 (Lei 14.759/2023)
  if (ano >= 2024) feriados.push(`${ano}-11-20`);
  return feriados.sort();
}
