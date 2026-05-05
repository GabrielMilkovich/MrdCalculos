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
export {
  detectarOrigemEmpregador,
  MENSAGEM_BLOQUEIO_MAGALU,
} from './classification/origem-empregador';
export type { OrigemEmpregador } from './classification/origem-empregador';

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
  buildCtpsZip,
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

// Cobertura semântica entre documentos do case (gaps cruzados).
export { analisarCobertura } from './quality/case-coverage';
export type {
  CaseDoc,
  CaseCoverageReport,
  CoverageGap,
  Severidade,
} from './quality/case-coverage';

// Validação cruzada (soma de batidas × evento Horas Trabalhadas + outros).
export {
  hhmmToMin,
  somarBatidasMin,
  checkHorasTrabalhadas,
  diasComDiscrepancia,
  formatDiff,
  checkSomaMensalHT,
  checkHoleriteTotais,
  checkFerias,
  checkFaltas,
} from './quality/cross-validation';
export type {
  CrossCheckResult,
  CheckHoleriteTotaisResult,
  CheckFeriasResult,
  CheckFaltasResult,
} from './quality/cross-validation';

// Pipeline IA da extração foi removido em V7 — substituído pelo
// extrator geométrico v6 + mappers determinísticos. A IA fica apenas
// para sugerir bucket de rubrica no holerite (ver
// `src/features/rubrica-mapping/sugerir-bucket.ts`).
