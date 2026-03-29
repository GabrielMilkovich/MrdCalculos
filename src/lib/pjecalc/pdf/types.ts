/**
 * PDF Report Engine - Types & Interfaces
 *
 * Defines the configuration, section, block, and context types
 * used by the modular PDF report generation system.
 */
import type {
  PjeLiquidacaoResult,
  PjeParametros,
} from '../engine-types';

// ── Report Configuration ──

export interface PDFReportConfig {
  title: string;
  subtitle?: string;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  headerHeight: number;
  footerHeight: number;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
    table: number;
  };
  locale: 'pt-BR';
  /** Font family for the report body (serif for legal documents) */
  fontFamily: string;
  /** Font family for numeric/monospaced values */
  fontFamilyMono: string;
  /** Show page numbers in footer */
  showPageNumbers: boolean;
  /** Engine version string for footer */
  engineVersion: string;
}

export const DEFAULT_CONFIG: PDFReportConfig = {
  title: 'PLANILHA DE CALCULO',
  pageSize: 'A4',
  orientation: 'landscape',
  margins: { top: 10, right: 12, bottom: 10, left: 12 },
  headerHeight: 60,
  footerHeight: 20,
  fontSize: {
    title: 11,
    subtitle: 8,
    body: 8,
    small: 7,
    table: 7.5,
  },
  locale: 'pt-BR',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontFamilyMono: "'Courier New', Consolas, monospace",
  showPageNumbers: true,
  engineVersion: '2.1.0',
};

// ── Process / Case metadata (passed from UI) ──

export interface DadosProcesso {
  processo?: string;
  cliente?: string;
  reclamado?: string;
  vara?: string;
  perito?: string;
  funcao?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  dataAjuizamento?: string;
  dataInicioCalculo?: string;
  dataFimCalculo?: string;
  dataLiquidacao?: string;
  uf?: string;
  municipio?: string;
  cargaHoraria?: number;
  sabadoDiaUtil?: boolean;
  prescricaoQuinquenal?: boolean;
  prescricaoTrintenaria?: boolean;
  regimeTrabalho?: string;
  projetarAvisoPrevio?: boolean;
  considerarFeriados?: boolean;
  considerarFeriadosEstaduais?: boolean;
  zerarNegativo?: boolean;
  maiorRemuneracao?: number;
  ultimaRemuneracao?: number;
  limitarAvos?: boolean;
  prazoAvisoPrevio?: string;
  honorariosNome?: string;
  calculoId?: string | number;
  indiceCorrecao?: string;
  jurosTipo?: string;
  jurosPercentual?: number;
  jurosInicio?: string;
  /** Salary history for the calculation data section */
  historicoSalarial?: Array<{
    nome: string;
    periodo_inicio: string;
    periodo_fim: string;
    tipo_valor: string;
    valor_informado?: number;
    incidencia_fgts?: boolean;
    incidencia_cs?: boolean;
  }>;
  /** Absences */
  faltas?: Array<{
    inicio: string;
    fim: string;
    justificada: boolean;
    justificativa?: string;
  }>;
  /** Vacations */
  ferias?: Array<{
    relativa?: string;
    periodo_aquisitivo_inicio?: string;
    periodo_aquisitivo_fim?: string;
    periodo_concessivo_inicio?: string;
    periodo_concessivo_fim?: string;
    prazo?: number;
    situacao?: string;
    abono?: boolean;
    gozo1_inicio?: string;
    gozo1_fim?: string;
    gozo2_inicio?: string;
    gozo2_fim?: string;
    gozo3_inicio?: string;
    gozo3_fim?: string;
  }>;
  /** Daily timecard data */
  cartaoPontoDiario?: Array<{
    data: string;
    dia: string;
    frequencia: string;
    hs_trabalhadas: number;
    hs_ext_diarias: number;
    hs_ext_semanais: number;
    hs_ext_repousos: number;
    hs_ext_feriados: number;
    hs_interjornadas: number;
    hs_art384: number;
  }>;
  /** Legal criteria text */
  criterios?: string[];
  /** Verba linkage for hierarchy display */
  verbasLinkage?: Record<string, string>;
  /** Correction combinations by date */
  correcaoCombinacoes?: Array<{ indice: string; ate?: string; de?: string }>;
  /** Interest combinations by date */
  jurosCombinacoes?: Array<{ tipo: string; ate?: string; de?: string }>;
}

// ── Render Context (passed to each section renderer) ──

export interface PDFRenderContext {
  result: PjeLiquidacaoResult;
  params: PjeParametros;
  dadosProcesso: DadosProcesso;
  config: PDFReportConfig;
}

// ── Section Definition ──

export type PDFSectionType =
  | 'identification'
  | 'summary'
  | 'table'
  | 'credits-debits'
  | 'criteria'
  | 'data'
  | 'faults-vacations'
  | 'timecard'
  | 'totals'
  | 'fgts-detail'
  | 'inss-detail'
  | 'ir-detail'
  | 'verbas-detail'
  | 'custom';

export interface PDFSection {
  id: string;
  title: string;
  type: PDFSectionType;
  visible: boolean;
  pageBreakBefore?: boolean;
  render: (ctx: PDFRenderContext) => string;
}
