/**
 * =====================================================
 * CANONICAL CASE INPUT — TIPOS CANÔNICOS DE INSUMOS
 * =====================================================
 * 
 * Camada formal que representa TODOS os insumos que influenciam
 * o resultado de um cálculo trabalhista. Nenhum cálculo deve
 * prosseguir sem que esta estrutura esteja resolvida e validada.
 * 
 * Princípio: "CASO CALCULÁVEL = INSUMOS COMPLETOS + NORMALIZAÇÃO + VALIDAÇÃO + MOTOR + AUDITORIA"
 */

// =====================================================
// METADADOS DE CAMPO — Rastreabilidade de Origem
// =====================================================

export type InputSource =
  | 'manual'           // Digitado pelo operador
  | 'pjc_import'       // Lido de arquivo .PJC
  | 'document_extract' // Extraído de documento (CTPS, ficha, etc.)
  | 'ai_inferred'      // Inferido por IA
  | 'database'         // Lido do banco (tabelas históricas)
  | 'default_audited'  // Default juridicamente aceitável, com auditoria
  | 'override'         // Override humano sobre valor anterior
  | 'absent';          // Não resolvido

export interface InputFieldMeta<T = unknown> {
  value: T;
  source: InputSource;
  confidence: number;         // 0.0 a 1.0
  isRequired: boolean;
  isResolved: boolean;
  isInferred: boolean;
  blocksCalculation: boolean; // Se true e !isResolved → bloqueia
  warningCode?: string;       // Ex: 'W001', 'E003'
  warningMessage?: string;
  overriddenFrom?: { value: T; source: InputSource };
  resolvedAt?: string;        // ISO timestamp
  resolvedBy?: string;        // user_id ou 'system'
}

/** Helper to create a resolved field */
export function resolved<T>(value: T, source: InputSource, opts?: Partial<InputFieldMeta<T>>): InputFieldMeta<T> {
  return {
    value,
    source,
    confidence: source === 'manual' || source === 'pjc_import' ? 1.0 : source === 'ai_inferred' ? 0.7 : 0.9,
    isRequired: true,
    isResolved: true,
    isInferred: source === 'ai_inferred',
    blocksCalculation: false,
    resolvedAt: new Date().toISOString(),
    ...opts,
  };
}

/** Helper to create an absent (unresolved) field */
export function absent<T>(isRequired: boolean, blocksCalculation: boolean, warningCode?: string): InputFieldMeta<T | null> {
  return {
    value: null,
    source: 'absent',
    confidence: 0,
    isRequired,
    isResolved: false,
    isInferred: false,
    blocksCalculation,
    warningCode,
    warningMessage: warningCode ? `Campo obrigatório não resolvido [${warningCode}]` : undefined,
  };
}

// =====================================================
// 1. IDENTIFICAÇÃO DO CASO
// =====================================================

export interface CaseIdentification {
  case_id: InputFieldMeta<string>;
  processo_cnj: InputFieldMeta<string | null>;
  reclamante_nome: InputFieldMeta<string | null>;
  reclamante_cpf: InputFieldMeta<string | null>;
  reclamado_nome: InputFieldMeta<string | null>;
  reclamado_cnpj: InputFieldMeta<string | null>;
  tipo_liquidacao: InputFieldMeta<'sentenca' | 'acordo' | 'fase_execucao' | 'pericial'>;
  fonte_caso: InputFieldMeta<'manual' | 'pjc' | 'importado' | 'hibrido'>;
  versao_input: InputFieldMeta<number>;
}

// =====================================================
// 2. MARCOS TEMPORAIS
// =====================================================

export interface TemporalMarks {
  data_admissao: InputFieldMeta<string>;
  data_demissao: InputFieldMeta<string | null>;
  data_ajuizamento: InputFieldMeta<string>;
  data_citacao: InputFieldMeta<string | null>;
  data_liquidacao: InputFieldMeta<string>;
  data_inicial_calculo: InputFieldMeta<string | null>;
  data_final_calculo: InputFieldMeta<string | null>;
  data_exigibilidade: InputFieldMeta<string | null>;
  data_prescricao_calculada: InputFieldMeta<string | null>;
}

// =====================================================
// 3. PARÂMETROS JURÍDICOS
// =====================================================

export interface JuridicalParameters {
  prescricao_quinquenal: InputFieldMeta<boolean>;
  prescricao_fgts: InputFieldMeta<boolean>;
  projetar_aviso_indenizado: InputFieldMeta<boolean>;
  prazo_aviso_previo: InputFieldMeta<'nao_apurar' | 'calculado' | 'informado'>;
  prazo_aviso_dias: InputFieldMeta<number | null>;
  limitar_avos_periodo: InputFieldMeta<boolean>;
  zerar_valor_negativo: InputFieldMeta<boolean>;
  sabado_dia_util: InputFieldMeta<boolean>;
  considerar_feriado_estadual: InputFieldMeta<boolean>;
  considerar_feriado_municipal: InputFieldMeta<boolean>;
  tipo_mes: InputFieldMeta<'civil' | 'comercial'>;
  estado: InputFieldMeta<string>;
  municipio: InputFieldMeta<string>;
  carga_horaria_padrao: InputFieldMeta<number>;
  regime_trabalho: InputFieldMeta<'tempo_integral' | 'tempo_parcial'>;
}

// =====================================================
// 4. INSUMOS SALARIAIS
// =====================================================

export interface SalaryHistoryInput {
  id: string;
  nome: InputFieldMeta<string>;
  periodo_inicio: InputFieldMeta<string>;
  periodo_fim: InputFieldMeta<string>;
  tipo_valor: InputFieldMeta<'informado' | 'calculado'>;
  valor_informado: InputFieldMeta<number | null>;
  incidencia_fgts: InputFieldMeta<boolean>;
  incidencia_cs: InputFieldMeta<boolean>;
  fgts_recolhido: InputFieldMeta<boolean>;
  cs_recolhida: InputFieldMeta<boolean>;
  ocorrencias: SalaryOccurrenceInput[];
}

export interface SalaryOccurrenceInput {
  id: string;
  competencia: string;
  valor: InputFieldMeta<number>;
  tipo: InputFieldMeta<'calculado' | 'informado'>;
}

// =====================================================
// 5. INSUMOS DE JORNADA
// =====================================================

export interface TimecardInput {
  competencia: string;
  dias_uteis: InputFieldMeta<number>;
  dias_trabalhados: InputFieldMeta<number>;
  horas_extras_50: InputFieldMeta<number>;
  horas_extras_100: InputFieldMeta<number>;
  horas_noturnas: InputFieldMeta<number>;
  intervalo_suprimido: InputFieldMeta<number>;
  dsr_horas: InputFieldMeta<number>;
  sobreaviso: InputFieldMeta<number>;
  dados_extras?: Record<string, InputFieldMeta<number>>;
}

export interface JornadaInputs {
  cartao_ponto: TimecardInput[];
  has_daily_apuracao: InputFieldMeta<boolean>;
  excecoesCargas: { data_inicial: string; data_final: string; carga_horaria: number; observacao?: string }[];
  excecoesSabado: { data_inicial: string; data_final: string; sabado_dia_util: boolean; observacao?: string }[];
}

// =====================================================
// 6. VERBAS / RUBRICAS
// =====================================================

export interface VerbaInput {
  id: string;
  nome: InputFieldMeta<string>;
  codigo_canonico: InputFieldMeta<string | null>;
  tipo: InputFieldMeta<'principal' | 'reflexa'>;
  caracteristica: InputFieldMeta<string>;
  periodo_inicio: InputFieldMeta<string>;
  periodo_fim: InputFieldMeta<string>;
  multiplicador: InputFieldMeta<number>;
  divisor_informado: InputFieldMeta<number>;
  base_calculo_historicos: InputFieldMeta<string[]>;
  incidencias: {
    fgts: InputFieldMeta<boolean>;
    irpf: InputFieldMeta<boolean>;
    contribuicao_social: InputFieldMeta<boolean>;
  };
  verba_principal_id: InputFieldMeta<string | null>;
  depende_jornada: InputFieldMeta<boolean>;
  depende_historico: InputFieldMeta<boolean>;
}

// =====================================================
// 7. FÉRIAS E FALTAS
// =====================================================

export interface FeriasInput {
  id: string;
  periodo_aquisitivo_inicio: InputFieldMeta<string>;
  periodo_aquisitivo_fim: InputFieldMeta<string>;
  dias: InputFieldMeta<number>;
  situacao: InputFieldMeta<string>;
  dobra: InputFieldMeta<boolean>;
  abono: InputFieldMeta<boolean>;
}

export interface FaltaInput {
  id: string;
  data_inicial: InputFieldMeta<string>;
  data_final: InputFieldMeta<string>;
  justificada: InputFieldMeta<boolean>;
}

// =====================================================
// 8. INSUMOS MONETÁRIOS
// =====================================================

export interface MonetaryInputs {
  indice_principal: InputFieldMeta<string>;
  combinacoes_indice: InputFieldMeta<CombinacaoIndiceInput[]>;
  combinacoes_juros: InputFieldMeta<CombinacaoJurosInput[]>;
  juros_tipo: InputFieldMeta<string>;
  juros_percentual: InputFieldMeta<number>;
  juros_inicio: InputFieldMeta<'ajuizamento' | 'citacao' | 'vencimento'>;
  juros_apos_deducao_cs: InputFieldMeta<boolean>;
  ignorar_taxa_negativa: InputFieldMeta<boolean>;
  base_de_juros_das_verbas: InputFieldMeta<string>;
  multa_523: InputFieldMeta<boolean>;
  multa_523_percentual: InputFieldMeta<number>;
  multa_467: InputFieldMeta<boolean>;
}

export interface CombinacaoIndiceInput {
  de?: string;
  ate?: string;
  indice: string;
}

export interface CombinacaoJurosInput {
  de?: string;
  ate?: string;
  tipo: string;
  percentual?: number;
}

// =====================================================
// 9. INSUMOS TRIBUTÁRIOS
// =====================================================

export interface TaxInputs {
  fgts: {
    apurar: InputFieldMeta<boolean>;
    multa_percentual: InputFieldMeta<number>;
    multa_apurar: InputFieldMeta<boolean>;
  };
  cs: {
    apurar_segurado: InputFieldMeta<boolean>;
    apurar_empresa: InputFieldMeta<boolean>;
    aliquota_empresa: InputFieldMeta<number>;
    aliquota_sat: InputFieldMeta<number>;
    aliquota_terceiros: InputFieldMeta<number>;
    cobrar_reclamante: InputFieldMeta<boolean>;
  };
  ir: {
    apurar: InputFieldMeta<boolean>;
    dependentes: InputFieldMeta<number>;
    tributacao_exclusiva_13: InputFieldMeta<boolean>;
    tributacao_separada_ferias: InputFieldMeta<boolean>;
    deduzir_cs: InputFieldMeta<boolean>;
  };
  honorarios: {
    apurar: InputFieldMeta<boolean>;
    percentual: InputFieldMeta<number>;
    base: InputFieldMeta<'condenacao' | 'causa' | 'proveito'>;
  };
  custas: {
    apurar: InputFieldMeta<boolean>;
    percentual: InputFieldMeta<number>;
    isento: InputFieldMeta<boolean>;
  };
}

// =====================================================
// 10. TABELAS DE REFERÊNCIA
// =====================================================

export interface ReferenceTables {
  indices_correcao: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
  faixas_inss: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
  faixas_ir: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
  feriados: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
  seguro_desemprego: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
  salario_familia: InputFieldMeta<{ loaded: boolean; count: number; source: string }>;
}

// =====================================================
// CANONICAL CASE INPUT — TIPO PRINCIPAL
// =====================================================

export interface CanonicalCaseInput {
  identification: CaseIdentification;
  temporal: TemporalMarks;
  juridical: JuridicalParameters;
  salary: SalaryHistoryInput[];
  jornada: JornadaInputs;
  verbas: VerbaInput[];
  ferias: FeriasInput[];
  faltas: FaltaInput[];
  monetary: MonetaryInputs;
  taxes: TaxInputs;
  referenceTables: ReferenceTables;
  /** Input version for future migrations */
  _version: number;
  /** Timestamp when canonical input was assembled */
  _assembledAt: string;
  /** Hash of all inputs for change detection */
  _inputHash: string;
}

// =====================================================
// VALIDATION RESULT
// =====================================================

export type ValidationSeverity = 'blocker' | 'warning' | 'info';

export interface ValidationFinding {
  code: string;
  severity: ValidationSeverity;
  module: string;
  field?: string;
  message: string;
  message_friendly: string;
  suggestion?: string;
}

export interface InputValidationResult {
  canProceed: boolean;
  blockers: ValidationFinding[];
  warnings: ValidationFinding[];
  infos: ValidationFinding[];
  completenessScore: number;      // 0-100
  moduleScores: Record<string, ModuleScore>;
  resolvedFields: number;
  totalFields: number;
  unresolvedCritical: string[];
}

export interface ModuleScore {
  module: string;
  label: string;
  score: number;               // 0-100
  status: 'complete' | 'partial' | 'missing' | 'blocked';
  findings: ValidationFinding[];
}

// =====================================================
// CONFIDENCE REPORT
// =====================================================

export interface ConfidenceReport {
  overall: number;              // 0-100
  status: 'apto' | 'apto_com_warnings' | 'bloqueado' | 'divergente_pje';
  modules: ConfidenceModule[];
  inputSources: InputSourceSummary;
  missingCritical: string[];
  inferredFields: string[];
  defaultedFields: string[];
  timestamp: string;
}

export interface ConfidenceModule {
  name: string;
  label: string;
  score: number;
  fieldCount: number;
  resolvedCount: number;
  inferredCount: number;
  absentCount: number;
  blockerCount: number;
}

export interface InputSourceSummary {
  manual: number;
  pjc_import: number;
  document_extract: number;
  ai_inferred: number;
  database: number;
  default_audited: number;
  override: number;
  absent: number;
}
