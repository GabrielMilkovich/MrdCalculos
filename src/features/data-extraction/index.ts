/**
 * Barrel exports — feature data-extraction.
 */
export type {
  CaseMode,
  Conflict,
  ConflictResolution,
  DocumentExtractedData,
  ExtractionCategory,
  ExtractionStatus,
  FaltasRow,
  FeriasRow,
  GozoPeriodo,
  HistoricoSalarialRow,
  MergeResult,
  SituacaoFerias,
  SourceRef,
  ValidationStatus,
} from './types';

export {
  CATEGORY_CSV_FILENAME,
  CATEGORY_LABEL,
  CSV_HEADERS,
  EXTRACTION_MODEL,
  MAX_JUSTIFICATIVA_LEN,
  MAX_RELATIVA_LEN,
  SITUACAO_FERIAS_LABEL,
} from './constants';

export {
  formatBool,
  formatDecimalBR,
  sanitizeText,
  validateCompetencia,
  validateData,
  validateRelativa,
} from './sanitize';

export {
  buildFaltasCSV,
  buildFeriasCSV,
  buildHistoricoSalarialCSV,
  countValidLines,
} from './export-csv';

export {
  applyResolutions,
  countPendingConflicts,
  mergeFaltas,
  mergeFerias,
  mergeHistoricoSalarial,
  mergeRows,
} from './merge';

export {
  buildExportZip,
  downloadExportZip,
  type ExportPayload,
} from './export-zip';

export {
  extractDocument,
  loadExtractedRows,
  markValidated,
  saveExtractedRows,
  type ExtractResult,
} from './extract';
