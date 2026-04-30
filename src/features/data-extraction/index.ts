// Barrel exports — Modo Extração de Dados v2.

export type {
  CaseMode,
  TipoExtracao,
  ValidationStatus,
  ExtracaoStatus,
  ClassificacaoOrigem,
  CategoriaSlug,
  Categoria,
  RubricaExtraida,
  CategoriaIncidenciaConfig,
  GozoPeriodo,
  SituacaoFerias,
  FeriasExtraida,
  FaltaExtraida,
  HintResult,
  DocumentoOrigem,
  LinhaHistoricoSalarial,
  CandidatoConflito,
  ConflitoHistoricoSalarial,
  ResolucaoConflito,
  ComposicaoHistorico,
  ConflitoFerias,
  ResolucaoFerias,
  ComposicaoFerias,
  ConflitoFaltas,
  ResolucaoFaltas,
  ComposicaoFaltas,
  HistoricoCsvPayload,
  ZipExportPayload,
} from './types';

// Classification
export { normalizeNomeRubrica } from './classification/normalize';
export { getDefaultHint } from './classification/hints';
export { lookupMemo, loadCaseMemos, memoKey } from './classification/memo';
export { reclassificarRubrica } from './classification/apply';

// Composer
export { composeHistoricoSalarial } from './composer/historico-salarial';
export { composeFerias } from './composer/ferias';
export { composeFaltas, chaveFalta } from './composer/faltas';

// Export
export { sanitizeText } from './export/sanitize';
export { formatNumeroBR, formatBoolBR, formatDataBR } from './export/format-br';
export { buildHistoricoSalarialCSV } from './export/csv-historico';
export { buildFeriasCSV } from './export/csv-ferias';
export { buildFaltasCSV } from './export/csv-faltas';
export { buildLeiaMe } from './export/leia-me';
export {
  buildZip,
  countCsvsToExport,
  sanitizeFilename,
  buildZipFilename,
} from './export/zip';
export { downloadZip } from './export/download';

// API
export { loadCategorias } from './api/categorias';
export {
  loadRubricasByCase,
  loadRubricasByDocument,
  deleteRubricasByDocument,
  insertManualRubrica,
  updateRubricaValor,
  deleteRubrica,
} from './api/rubricas';
export {
  loadCategoriaConfigs,
  ensureCategoriaConfigs,
  updateCategoriaConfig,
} from './api/config';
export {
  loadFeriasByCase,
  loadFaltasByCase,
  loadFeriasByDocument,
  loadFaltasByDocument,
  deleteFeriasByDocument,
  deleteFaltasByDocument,
  toggleFeriasIncluir,
  toggleFaltasIncluir,
} from './api/ferias-faltas';
export {
  extractDocument,
  setTipoExtracao,
  setCompetenciaReferencia,
  markValidationStatus,
} from './api/extract';
export type { ExtractResult } from './api/extract';
