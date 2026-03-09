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
