// =====================================================
// MOTOR DE CÁLCULO — REDIRECIONAMENTO
// =====================================================
// O motor canônico é PjeCalcEngine em src/lib/pjecalc/engine.ts
// Este barrel mantém apenas exports de utilidades ainda em uso:
// - tipos compartilhados
// - calendario-trabalhista
// - premissas-juridicas
// - ReportGenerator, SituationAnalyzer, TestScenarios
//
// A classe CalculationEngine (V1) está DEPRECATED.
// Use PjeCalcEngine para todos os cálculos novos.
// =====================================================

// Tipos compartilhados (ainda usados por componentes legados)
export * from './types';

// DEPRECATED: V1 engine class — manter temporariamente para evitar quebra de build
export {
  CalculationEngine,
  registerCalculator,
  getAvailableCalculators,
  createCalculator,
  getIndexValue,
  getTaxTable,
  calcularImposto,
} from './engine';
