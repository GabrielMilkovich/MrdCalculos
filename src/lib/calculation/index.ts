// =====================================================
// MOTOR DE CÁLCULO TRABALHISTA - EXPORTAÇÕES
// =====================================================

// Tipos principais
export * from './types';

// Engine e helpers
export {
  CalculationEngine,
  registerCalculator,
  getAvailableCalculators,
  createCalculator,
  getIndexValue,
  getTaxTable,
  calcularImposto,
} from './engine';

// Calculadoras individuais
export { createHorasExtrasCalculator } from './calculators/horas-extras';
export { createReflexos13Calculator } from './calculators/reflexos-13';
export { createReflexosFeriasCalculator } from './calculators/reflexos-ferias';
export { createFGTSCalculator } from './calculators/fgts';
export { createINSSCalculator } from './calculators/inss';
export { createAtualizacaoMonetariaCalculator } from './calculators/atualizacao-monetaria';
export { createIntrajornadaCalculator } from './calculators/intrajornada';
