/**
 * MRD Calc — Pure Calculation Engine
 *
 * This module exports the core calculation engine and all supporting types.
 * It has ZERO dependencies on React, Supabase, or any external service.
 */

// Core engines
export { PjeCalcEngine } from './engine';
export { PjeCalcEngineV3 } from './engine-v3';

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
  PjePrevidenciaPrivadaConfig,
} from './engine-types';

// PJC file parsing
export { analyzePJC } from './pjc-analyzer';
export type { PJCAnalysis } from './pjc-analyzer';

// PJC → Engine conversion
export { convertPjcToEngineInputs } from './pjc-to-engine';

// Correction utilities
export { aplicarCorrecaoPorData } from './correction-by-date';

// Reflexo DAG engine
export { gerarReflexosPadrao, gerarReflexosComCascata } from './reflexo-engine';

// Regime temporal ADC 58/59
export { buildRegimeTemporalADC58 } from './regime-temporal';
export type { RegimeTemporal } from './regime-temporal';

// Múltiplos vínculos
export { calcularAvosMultiplosVinculos, calcularFGTSPorVinculo } from './multiplos-vinculos';
export type { SaldoFGTSVinculo } from './multiplos-vinculos';
export type { VinculoEmpregaticio } from './pjc-analyzer';

// Contrato intermitente
export { calcularFGTSIntermitente, calcularFeriasIntermitente, calcularDecimoTerceiroIntermitente } from './contrato-intermitente';
export type { ConvocacaoIntermitente } from './pjc-analyzer';

// Memória de cálculo
export { exportarMemoriaJSON } from './memoria-export';
export type { MemoriaCalculo, LinhaMemoriaCalculo } from './engine-types';

// Constants
export {
  DEFAULT_FAIXAS_INSS, DEFAULT_FAIXAS_IR, DEFAULT_DEDUCAO_DEPENDENTE,
  HISTORICO_FAIXAS_INSS, HISTORICO_FAIXAS_IR, HISTORICO_SALARIO_MINIMO,
} from './engine-constants';
