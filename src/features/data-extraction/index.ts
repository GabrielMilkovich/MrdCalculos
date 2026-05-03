// Barrel exports — Modo Extração de Dados v4 (radical simplification).
//
// API pública mínima após o cleanup:
//   - Tipos básicos
//   - Parsers determinísticos
//   - Hints + auto-detect
//   - Builders CSV/ZIP por documento (export/per-doc/)

export type {
  CaseMode,
  TipoExtracao,
  ValidationStatus,
  ExtracaoStatus,
  CategoriaSlug,
  GozoPeriodo,
  SituacaoFerias,
  HintResult,
  LinhaHistoricoSalarial,
  IncidenciaFlags,
} from './types';

// Classification
export { normalizeNomeRubrica } from './classification/normalize';
export { getDefaultHint } from './classification/hints';
export { autoDetectTipoExtracao } from './classification/auto-detect-tipo';
export type { AutoDetectResult } from './classification/auto-detect-tipo';

// Parsers determinísticos (zero-LLM)
export { parseCartaoPonto, PARSER_VERSION as CARTAO_PONTO_PARSER_VERSION } from './parsers/cartao-ponto';
export type {
  ApuracaoDiaria,
  EventoDiario,
  Marcacao,
  OcorrenciaApuracao,
  ParseCartaoPontoResult,
  TipoEvento,
} from './parsers/cartao-ponto';
export { parseFerias } from './parsers/ferias';
export type { FeriasParseada, ParseFeriasResult } from './parsers/ferias';
export { parseFaltas } from './parsers/faltas';
export type { FaltaParseada, ParseFaltasResult } from './parsers/faltas';
export { parseHolerite } from './parsers/holerite';
export type {
  HoleriteParseResult,
  RubricaParseada,
  LayoutHolerite,
} from './parsers/holerite';

// CSV builders (texto)
export { sanitizeText } from './export/sanitize';
export { formatNumeroBR, formatBoolBR, formatDataBR } from './export/format-br';
export { buildHistoricoSalarialCSV } from './export/csv-historico';
export { buildFeriasCSV } from './export/csv-ferias';
export type { FeriasCsvLinha } from './export/csv-ferias';
export { buildFaltasCSV } from './export/csv-faltas';
export type { FaltaCsvLinha } from './export/csv-faltas';

// Per-doc export (entry-point principal da v4)
export {
  generateExportForDocument,
  triggerBlobDownload,
  classifyHolerite,
  buildHoleriteZip,
  buildCartaoPontoCSV,
  buildFeriasCSVBlob,
  buildFaltasCSVBlob,
} from './export/per-doc';
export type {
  ExportResult,
  ClassificacaoHolerite,
  LinhaClassificada,
} from './export/per-doc';

// Document API mínimo (apenas o dropdown de tipo)
export { setTipoExtracao } from './api/document-tipo';

// Quality scoring (0-100 + reasons)
export {
  scoreCartaoPonto,
  scoreFerias,
  scoreFaltas,
  scoreHolerite,
} from './quality/score';
export type { ConfidenceScore, ConfianceLevel } from './quality/score';
export {
  detectarJanelasPeriodo,
  dataDentroDeAlgumaJanela,
  datasForaDaJanela,
} from './quality/window';
export type { JanelaPeriodo } from './quality/window';
