// =====================================================
// PJe-CALC ENGINE - CONSTANTES E TABELAS PADRÃO
// =====================================================

import type { PjeCNAEAliquotas } from './engine-types';

// INSS Progressivo 2025 (Portaria MPS/MF nº 6/2025)
export const DEFAULT_FAIXAS_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// Tabelas históricas INSS 2015-2025 para fallback estruturado
// Pré-EC 103/2019 (até fev/2020): alíquota única (flat)
// Pós-EC 103/2019 (mar/2020+): alíquota progressiva
export const HISTORICAL_FAIXAS_INSS: {
  inicio: string; fim: string;
  faixas: { ate: number; aliquota: number }[];
}[] = [
  // 2015 - Portaria MPS/MF nº 13/2015
  { inicio: '2015-01', fim: '2015-12', faixas: [{ ate: 1399.12, aliquota: 0.08 }, { ate: 2331.88, aliquota: 0.09 }, { ate: 4663.75, aliquota: 0.11 }] },
  // 2016 - Portaria MPS/MF nº 1/2016
  { inicio: '2016-01', fim: '2016-12', faixas: [{ ate: 1556.94, aliquota: 0.08 }, { ate: 2594.92, aliquota: 0.09 }, { ate: 5189.82, aliquota: 0.11 }] },
  // 2017 - Portaria MF nº 8/2017
  { inicio: '2017-01', fim: '2017-12', faixas: [{ ate: 1659.38, aliquota: 0.08 }, { ate: 2765.66, aliquota: 0.09 }, { ate: 5531.31, aliquota: 0.11 }] },
  // 2018 - Portaria MF nº 15/2018
  { inicio: '2018-01', fim: '2018-12', faixas: [{ ate: 1693.72, aliquota: 0.08 }, { ate: 2822.90, aliquota: 0.09 }, { ate: 5645.80, aliquota: 0.11 }] },
  // 2019 - Portaria SEPRT nº 9/2019
  { inicio: '2019-01', fim: '2019-12', faixas: [{ ate: 1751.81, aliquota: 0.08 }, { ate: 2919.72, aliquota: 0.09 }, { ate: 5839.45, aliquota: 0.11 }] },
  // 2020 jan-fev (flat, pré-EC 103) - Portaria SEPRT nº 914/2020
  { inicio: '2020-01', fim: '2020-02', faixas: [{ ate: 1830.29, aliquota: 0.08 }, { ate: 3050.52, aliquota: 0.09 }, { ate: 6101.06, aliquota: 0.11 }] },
  // 2020 mar-dez (progressivo, EC 103/2019) - Portaria SEPRT nº 914/2020
  { inicio: '2020-03', fim: '2020-12', faixas: [{ ate: 1045.00, aliquota: 0.075 }, { ate: 2089.60, aliquota: 0.09 }, { ate: 3134.40, aliquota: 0.12 }, { ate: 6101.06, aliquota: 0.14 }] },
  // 2021 - Portaria SEPRT nº 477/2021
  { inicio: '2021-01', fim: '2021-12', faixas: [{ ate: 1100.00, aliquota: 0.075 }, { ate: 2203.48, aliquota: 0.09 }, { ate: 3305.22, aliquota: 0.12 }, { ate: 6433.57, aliquota: 0.14 }] },
  // 2022 - Portaria MTP nº 12/2022
  { inicio: '2022-01', fim: '2022-12', faixas: [{ ate: 1212.00, aliquota: 0.075 }, { ate: 2427.35, aliquota: 0.09 }, { ate: 3641.03, aliquota: 0.12 }, { ate: 7087.22, aliquota: 0.14 }] },
  // 2023 - Portaria MPS nº 26/2023
  { inicio: '2023-01', fim: '2023-12', faixas: [{ ate: 1320.00, aliquota: 0.075 }, { ate: 2571.29, aliquota: 0.09 }, { ate: 3856.94, aliquota: 0.12 }, { ate: 7507.49, aliquota: 0.14 }] },
  // 2024 - Portaria MPS nº 2/2024
  { inicio: '2024-01', fim: '2024-12', faixas: [{ ate: 1412.00, aliquota: 0.075 }, { ate: 2666.68, aliquota: 0.09 }, { ate: 4000.03, aliquota: 0.12 }, { ate: 7786.02, aliquota: 0.14 }] },
  // 2025+ - Portaria MPS/MF nº 6/2025
  { inicio: '2025-01', fim: '2099-12', faixas: [{ ate: 1518.00, aliquota: 0.075 }, { ate: 2793.88, aliquota: 0.09 }, { ate: 4190.83, aliquota: 0.12 }, { ate: 8157.41, aliquota: 0.14 }] },
];

// IRRF 2025 - Tabela mensal
export const DEFAULT_FAIXAS_IR = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

export const DEFAULT_DEDUCAO_DEPENDENTE = 189.59;

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
