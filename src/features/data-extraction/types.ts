/**
 * Tipos do modo "Extração de Dados" — convertem texto OCR em linhas
 * tipadas para os 3 CSVs do PJe-Calc Cidadão (Histórico Salarial,
 * Férias, Faltas).
 *
 * Refs:
 *  - Spec do parser oficial: AbstractServicoDeParsing.java (TRT-8 v2.5.4+)
 *  - Briefing interno: docs/PLANO-DATA-EXTRACTION.md
 */

export type CaseMode = 'calculation' | 'data_extraction';
export type ExtractionCategory = 'historico_salarial' | 'ferias' | 'faltas';
export type ValidationStatus = 'pending' | 'validated' | 'rejected';
export type ExtractionStatus = 'pending' | 'running' | 'success' | 'failed';

/** Origem rastreável da linha (qual documento, opcionalmente página). */
export interface SourceRef {
  documentId: string;
  documentName: string;
  page?: number;
}

// =====================================================
// HISTÓRICO SALARIAL
// =====================================================

/**
 * Uma competência mensal com valor de salário base + flags de incidência
 * de FGTS e INSS. Ordem de colunas no CSV: ver export-csv.ts.
 */
export interface HistoricoSalarialRow {
  /** Competência no formato MM/yyyy (ex: "03/2024"). */
  competencia: string;
  /** Salário bruto da competência em decimal JS (ponto). Convertido para BR no CSV. */
  valor: number;
  /** Defaults: true. Marcar false APENAS com evidência explícita. */
  incideFgts: boolean;
  fgtsRecolhido: boolean;
  incideInss: boolean;
  inssRecolhido: boolean;
  _source?: SourceRef;
}

// =====================================================
// FÉRIAS
// =====================================================

/**
 * G  = Gozadas
 * GP = Gozadas Parcialmente
 * NG = Não Gozadas
 * I  = Indenizadas
 * P  = Perdidas
 */
export type SituacaoFerias = 'G' | 'GP' | 'NG' | 'I' | 'P';

/** Período de gozo dentro de uma "relativa" (até 3 períodos por linha). */
export interface GozoPeriodo {
  inicio: string; // dd/MM/yyyy
  fim: string;    // dd/MM/yyyy
  dobra: boolean;
}

export interface FeriasRow {
  /**
   * Período aquisitivo no formato "aaaa/aaaa" (ex: "2023/2024").
   * DEVE existir previamente no PJe-Calc — o parser apenas atualiza,
   * não cria.
   */
  relativa: string;
  /** Dias do período aquisitivo (geralmente 30). */
  prazo: number;
  situacao: SituacaoFerias;
  dobraGeral: boolean;
  abono: boolean;
  diasAbono: number;
  gozo1?: GozoPeriodo;
  gozo2?: GozoPeriodo;
  gozo3?: GozoPeriodo;
  _source?: SourceRef;
}

// =====================================================
// FALTAS
// =====================================================

export interface FaltasRow {
  /** Início do período de falta. dd/MM/yyyy (1 dia: dataInicio == dataFim). */
  dataInicio: string;
  dataFim: string;
  justificada: boolean;
  /** TRUE apenas com evidência explícita. */
  reiniciarPeriodoAquisitivo: boolean;
  /**
   * Texto livre, máximo 200 chars no servidor PJe-Calc.
   * Sanitizado client-side: remove ; \n \r " e trunca em 200.
   */
  justificativa?: string;
  _source?: SourceRef;
}

// =====================================================
// PERSISTÊNCIA
// =====================================================

/** Linha da tabela `document_extracted_data`. */
export interface DocumentExtractedData {
  id: string;
  document_id: string;
  category: ExtractionCategory;
  rows: HistoricoSalarialRow[] | FeriasRow[] | FaltasRow[];
  validation_status: ValidationStatus;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// MERGE
// =====================================================

export interface Conflict<T> {
  /** Chave única (competência, relativa, intervalo de datas). */
  key: string;
  /** 2+ candidatos com mesma key e dados divergentes. */
  candidates: T[];
}

export interface MergeResult<T> {
  /** Linhas sem conflito (auto-resolvidas: idênticas deduplicadas). */
  merged: T[];
  /** Conflitos pendentes — UI deve resolver. */
  conflicts: Conflict<T>[];
}

/** Resolução de conflito do usuário: para cada `conflict.key`, o índice escolhido. */
export type ConflictResolution = Map<string, number>;
