/**
 * MRD Calc — Pure Calculation Engine
 *
 * This module exports the core calculation engine and all supporting types.
 * It has ZERO dependencies on React, Supabase, or any external service.
 * All data (indices, faixas, feriados) is passed as parameters.
 *
 * Usage:
 *   import { PjeCalcEngine, analyzePJC, convertPjcToEngineInputs } from '@/lib/pjecalc/core';
 *   const analysis = analyzePJC(xmlString);
 *   const inputs = convertPjcToEngineInputs(analysis, caseId);
 *   const engine = new PjeCalcEngine(inputs.params, ...);
 *   const result = engine.liquidar();
 */

// Core engine
export { PjeCalcEngine } from './engine';

// Types
export type {
  PjeParametros,
  PjeCalcMode,
  PjeVerba,
  PjeHistoricoSalarial,
  PjeFalta,
  PjeFerias,
  PjeCartaoPonto,
  PjeFGTSConfig,
  PjeCSConfig,
  PjeIRConfig,
  PjeCorrecaoConfig,
  PjeHonorariosConfig,
  PjeCustasConfig,
  PjeSeguroConfig,
  PjePrevPrivadaConfig,
  PjePensaoConfig,
  PjeSalarioFamiliaConfig,
  PjeLiquidacaoResult,
  PjeVerbaResult,
  PjeOcorrenciaResult,
  PjeCSResult,
  PjeIRResult,
  PjeIndiceRow,
  PjeINSSFaixaRow,
  PjeApuracaoJurosGT,
} from './engine-types';

// PJC file parsing
export { analyzePJC } from './pjc-analyzer';
export type { PJCAnalysis } from './pjc-analyzer';

// PJC → Engine conversion
export { convertPjcToEngineInputs } from './pjc-to-engine';

// Correction utilities
export { calcularCorrecaoPorData } from './correction-by-date';

// Reflexo DAG engine
export { gerarReflexosPadrao, gerarReflexosComCascata } from './reflexo-engine';

// Offset engine — removed (offset-engine deleted)

// Regime temporal ADC 58/59
export { buildRegimeTemporalADC58 } from './regime-temporal';
export type { RegimeTemporal } from './regime-temporal';

// Múltiplos vínculos (Padrão B)
export { calcularAvosMultiplosVinculos, calcularFGTSPorVinculo } from './multiplos-vinculos';
export type { SaldoFGTSVinculo } from './multiplos-vinculos';
export type { VinculoEmpregaticio } from './pjc-analyzer';

// Contrato intermitente (Lei 13.467/2017)
export { calcularFGTSIntermitente, calcularFeriasIntermitente, calcularDecimoTerceiroIntermitente } from './contrato-intermitente';
export type { ConvocacaoIntermitente } from './pjc-analyzer';

// Constants
export { INSS_TETO_2025, SALARIO_MINIMO_2025 } from './engine-constants';
