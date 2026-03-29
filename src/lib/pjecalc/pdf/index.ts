/**
 * PDF Report Engine - Public API
 *
 * Usage:
 *   import { buildMemoriaDeCalculo, openAndPrint, downloadHTML, generateFilename } from '@/lib/pjecalc/pdf';
 *
 *   const html = buildMemoriaDeCalculo(result, params, dadosProcesso);
 *   openAndPrint(html);
 *   // or
 *   downloadHTML(html, generateFilename('Memoria', processo));
 */

// Types
export type {
  PDFReportConfig,
  PDFRenderContext,
  PDFSection,
  PDFSectionType,
  DadosProcesso,
} from './types';
export { DEFAULT_CONFIG } from './types';

// Formatter
export { fmt } from './formatter';

// Report Builders
export {
  buildMemoriaDeCalculo,
  buildResumo,
  buildCustomReport,
} from './report-builder';

// Renderer
export {
  renderSections,
  openForPrint,
  printViaIframe,
} from './renderer';

// Download Service
export {
  downloadHTML,
  generateFilename,
  openAndPrint,
} from './download';

// Template
export { buildReportHTML } from './template';

// Individual Sections (for custom composition)
export {
  renderPageHeader,
  renderIdentification,
  renderSummary,
  renderCreditsDebits,
  renderCriteria,
  renderCalculationData,
  renderVerbaDetail,
  renderFaultsVacations,
  renderTimecard,
  renderFGTSDetail,
  renderINSSDetail,
  renderIRDetail,
  renderTotals,
} from './sections';
