// =====================================================
// MOTOR DE CÁLCULO — REDIRECIONAMENTO
// =====================================================
// MOTOR ATIVO em produção: PjeCalcEngineV3 (src/lib/pjecalc/engine-v3.ts).
// O core portado 1:1 do PJe-Calc v2.15.1 vive em src/lib/pjecalc/core/.
//
// Este barrel permanece por compatibilidade com importadores externos que
// ainda referenciam @/lib/calculation. Todos os símbolos abaixo vêm agora
// de _legacy/ e estão DEPRECATED. Serão removidos em PR futura (~4 semanas
// após consolidação V3, conforme docs/MOTOR-UNICO-V3.md).
//
// Não importe destes símbolos em código novo. Use PjeCalcEngineV3.
// =====================================================

// Tipos compartilhados (ainda usados por componentes legados)
export * from './types';

// DEPRECATED: V1 engine class — re-export de _legacy/ por compatibilidade
export {
  CalculationEngine,
  registerCalculator,
  getAvailableCalculators,
  createCalculator,
  getIndexValue,
  getTaxTable,
  calcularImposto,
} from './_legacy/engine';
