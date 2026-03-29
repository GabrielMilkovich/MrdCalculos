/**
 * PDF Report Engine - Report Builder
 *
 * High-level functions that compose sections into complete reports.
 * Each builder returns an HTML string ready for print or download.
 */
import type {
  PjeLiquidacaoResult,
  PjeParametros,
} from '../engine-types';
import type {
  PDFReportConfig,
  PDFRenderContext,
  PDFSection,
  DadosProcesso,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { renderSections } from './renderer';
import {
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
  renderWarnings,
} from './sections';

/**
 * Create a PDFRenderContext from inputs.
 */
function buildContext(
  result: PjeLiquidacaoResult,
  params: PjeParametros,
  dadosProcesso: DadosProcesso,
  config: PDFReportConfig
): PDFRenderContext {
  return { result, params, dadosProcesso, config };
}

/**
 * Default empty params for when caller doesn't have full PjeParametros.
 */
function defaultParams(): PjeParametros {
  return {
    case_id: '',
    data_admissao: '',
    data_ajuizamento: '',
    estado: '',
    municipio: '',
    regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    prazo_aviso_previo: 'nao_apurar',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: false,
    sabado_dia_util: false,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
  };
}

// ── Memoria de Calculo (Full Detailed Report) ──

/**
 * Build the complete Memoria de Calculo report.
 *
 * Includes ALL sections: identification, summary, credits/debits,
 * criteria, calculation data, verba detail, FGTS, INSS, IR, and totals.
 */
export function buildMemoriaDeCalculo(
  result: PjeLiquidacaoResult,
  params: PjeParametros | null | undefined,
  dadosProcesso: DadosProcesso,
  config?: Partial<PDFReportConfig>
): string {
  const fullConfig: PDFReportConfig = { ...DEFAULT_CONFIG, ...config };
  const ctx = buildContext(result, params || defaultParams(), dadosProcesso, fullConfig);

  const sections: PDFSection[] = [
    {
      id: 'header-summary',
      title: 'Resumo',
      type: 'summary',
      visible: true,
      pageBreakBefore: false,
      render: (c) => renderPageHeader(c) + renderSummary(c) + renderCreditsDebits(c) + renderCriteria(c),
    },
    {
      id: 'calculation-data',
      title: 'Dados do Calculo',
      type: 'data',
      visible: true,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderCalculationData(c) + renderFaultsVacations(c),
    },
    {
      id: 'timecard',
      title: 'Cartao de Ponto',
      type: 'timecard',
      visible: (dadosProcesso.cartaoPontoDiario?.length ?? 0) > 0,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderTimecard(c),
    },
    {
      id: 'verbas-detail',
      title: 'Memoria de Calculo',
      type: 'verbas-detail',
      visible: true,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c, 'MEMORIA DE CALCULO') + renderVerbaDetail(c),
    },
    {
      id: 'fgts-detail',
      title: 'FGTS',
      type: 'fgts-detail',
      visible: result.fgts.total_fgts > 0 || result.fgts.depositos.length > 0,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderFGTSDetail(c),
    },
    {
      id: 'inss-detail',
      title: 'Contribuicao Social',
      type: 'inss-detail',
      visible: result.contribuicao_social.total_segurado > 0 || result.contribuicao_social.total_empregador > 0,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderINSSDetail(c),
    },
    {
      id: 'ir-detail',
      title: 'Imposto de Renda',
      type: 'ir-detail',
      visible: result.imposto_renda.imposto_devido > 0,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderIRDetail(c),
    },
    {
      id: 'warnings',
      title: 'Avisos e Ressalvas',
      type: 'custom',
      visible: (result.calculation_warnings?.length ?? 0) > 0,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderWarnings(c),
    },
    {
      id: 'totals',
      title: 'Resumo Consolidado',
      type: 'totals',
      visible: true,
      pageBreakBefore: true,
      render: (c) => renderPageHeader(c) + renderTotals(c),
    },
  ];

  return renderSections(sections, ctx);
}

// ── Resumo Simples (Summary-Only Report) ──

/**
 * Build a summary-only report (no occurrence detail).
 */
export function buildResumo(
  result: PjeLiquidacaoResult,
  params: PjeParametros | null | undefined,
  dadosProcesso: DadosProcesso,
  config?: Partial<PDFReportConfig>
): string {
  const fullConfig: PDFReportConfig = { ...DEFAULT_CONFIG, ...config };
  const ctx = buildContext(result, params || defaultParams(), dadosProcesso, fullConfig);

  const sections: PDFSection[] = [
    {
      id: 'header-summary',
      title: 'Resumo',
      type: 'summary',
      visible: true,
      pageBreakBefore: false,
      render: (c) => renderPageHeader(c) + renderSummary(c) + renderCreditsDebits(c),
    },
    {
      id: 'totals',
      title: 'Totais',
      type: 'totals',
      visible: true,
      pageBreakBefore: false,
      render: (c) => renderTotals(c),
    },
  ];

  return renderSections(sections, ctx);
}

// ── Custom Report Builder ──

/**
 * Build a report with custom section selection.
 * Allows callers to pick exactly which sections to include and in what order.
 */
export function buildCustomReport(
  sections: PDFSection[],
  result: PjeLiquidacaoResult,
  params: PjeParametros | null | undefined,
  dadosProcesso: DadosProcesso,
  config?: Partial<PDFReportConfig>
): string {
  const fullConfig: PDFReportConfig = { ...DEFAULT_CONFIG, ...config };
  const ctx = buildContext(result, params || defaultParams(), dadosProcesso, fullConfig);
  return renderSections(sections, ctx);
}
