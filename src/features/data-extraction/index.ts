// Barrel exports — Modo Extração de Dados v2.

export type {
  CaseMode,
  TipoExtracao,
  ValidationStatus,
  ExtracaoStatus,
  ClassificacaoOrigem,
  Origem,
  ConfiancaAuto,
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
export { autoDetectTipoExtracao } from './classification/auto-detect-tipo';
export type { AutoDetectResult } from './classification/auto-detect-tipo';

// Parsers determinísticos (zero-LLM)
export { parseCartaoPonto } from './parsers/cartao-ponto';
export type {
  ApuracaoDiaria,
  Marcacao,
  OcorrenciaApuracao,
  ParseCartaoPontoResult,
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
export { lookupMemo, loadCaseMemos, memoKey } from './classification/memo';
export { reclassificarRubrica } from './classification/apply';

// Composer
export { composeHistoricoSalarial } from './composer/historico-salarial';
export { composeFerias } from './composer/ferias';
export { composeFaltas, chaveFalta } from './composer/faltas';
export { composeCartoesPonto } from './composer/cartao-ponto';
export type { ComposicaoCartoesPonto } from './composer/cartao-ponto';

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
  loadCartaoPontoByDocument,
  loadCartoesPontoByCase,
  loadApuracoesByDocument,
  loadApuracoesByCartao,
  loadApuracoesByCase,
  deleteCartaoPontoByDocument,
  ensureCartaoPonto,
  refreshCartaoBounds,
  replaceApuracoes,
} from './api/cartao-ponto';
export type {
  CartaoPontoExtraido,
  ApuracaoExtraidaRow,
} from './api/cartao-ponto';
// Export PJC builder + zip + orquestrador final
export {
  buildPjcXml,
  derivarPeriodosFerias,
  brToEpochMs,
} from './export/pjc/builder';
export type {
  PjcCalculoData,
  PjcMeta,
  PjcHistoricoSalarial,
  PjcOcorrenciaHistorico,
  PjcFerias,
  PjcGozo,
  PjcFalta,
  PjcCartaoPonto,
  PjcApuracaoDiaria,
  PjcMarcacao,
} from './export/pjc/builder';
export {
  buildPjcZip,
  composePjcFilename,
  PJC_INNER_XML_NAME,
} from './export/pjc/zip';
export {
  competenciaToEpochMs,
  isoToEpochMs,
  utf16ToLatin1,
} from './export/pjc/encoding';
export { buildExport } from './export/build-export';
export type { BuildExportInput, BuildExportOutput } from './export/build-export';
export {
  buildPjcCalculoData,
  payloadsToHistoricos,
} from './export/pjc/from-composicao';
export type { BuildPjcInput } from './export/pjc/from-composicao';
export { loadPjcMeta } from './api/pjc-meta';
export type { PjcMetaCheck } from './api/pjc-meta';
export {
  extractDocument,
  setTipoExtracao,
  setCompetenciaReferencia,
  markValidationStatus,
} from './api/extract';
export type { ExtractResult } from './api/extract';
