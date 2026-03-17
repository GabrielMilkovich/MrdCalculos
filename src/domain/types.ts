/**
 * =====================================================
 * DOMAIN TYPES — ENTIDADES DO CÁLCULO TRABALHISTA
 * =====================================================
 * 
 * Camada de domínio pura: sem dependência de Supabase, UI ou infraestrutura.
 * Todas as entidades representam conceitos jurídicos reais do processo trabalhista.
 */

import Decimal from 'decimal.js';

// =====================================================
// IDENTIFICADORES E ENUMS
// =====================================================

export type UUID = string;
export type Competencia = string; // YYYY-MM
export type DateStr = string; // YYYY-MM-DD

export type RubricNature = 'salarial' | 'indenizatoria' | 'mista';
export type RubricFamily = 'jornada' | 'variavel' | 'contratual' | 'rescisoria' | 'reflexo' | 'tributario' | 'comissao';
export type IncidenceType = 'fgts' | 'inss' | 'irrf' | 'previdencia_privada' | 'pensao_alimenticia';
export type DocumentSourceType = 
  | 'contracheque' | 'cartao_ponto' | 'ctps' | 'trct'
  | 'sentenca' | 'acordao' | 'embargos' | 'retificacao'
  | 'planilha_pjc' | 'mapa_vendas' | 'relatorio_comissoes'
  | 'extrato_fgts' | 'ficha_financeira' | 'manual';

export type JudicialSourceType = 'sentenca' | 'acordao' | 'embargos_declaracao' | 'retificacao' | 'decisao_parcial';
export type ConflictResolution = 'posterior_prevalece' | 'mais_favoravel' | 'cumulativo' | 'manual';

export type ContractEventType = 
  | 'admissao' | 'demissao' | 'ferias' | 'afastamento_doenca'
  | 'afastamento_acidente' | 'licenca_maternidade' | 'suspensao'
  | 'aviso_previo_trabalhado' | 'aviso_previo_indenizado'
  | 'mudanca_funcao' | 'mudanca_salario' | 'mudanca_jornada'
  | 'banco_horas_inicio' | 'banco_horas_fim';

export type CalculationStatus = 'rascunho' | 'em_calculo' | 'calculado' | 'revisado' | 'aprovado' | 'fechado';

// =====================================================
// CASE — O PROCESSO TRABALHISTA
// =====================================================

export interface LaborCase {
  id: UUID;
  numero_processo?: string;
  tribunal?: string;
  vara?: string;
  reclamante: PartyInfo;
  reclamado: PartyInfo;
  contracts: EmploymentContract[];
  scenarios: CalculationScenario[];
  documents: EvidenceSource[];
  created_at: DateStr;
  updated_at: DateStr;
}

export interface PartyInfo {
  nome: string;
  cpf_cnpj?: string;
}

// =====================================================
// CONTRATO DE TRABALHO
// =====================================================

export interface EmploymentContract {
  id: UUID;
  case_id: UUID;
  admissao: DateStr;
  demissao?: DateStr;
  funcao: string;
  regime: 'clt' | 'temporario' | 'intermitente' | 'domestico';
  tipo_salario: 'fixo' | 'variavel' | 'misto';
  carga_horaria_semanal: number;
  jornada_descricao?: string;
  periods: ContractPeriod[];
  salary_histories: SalaryHistory[];
  events: ContractEvent[];
}

export interface ContractPeriod {
  id: UUID;
  contract_id: UUID;
  inicio: DateStr;
  fim: DateStr;
  funcao: string;
  salario_base: number;
  carga_horaria: number;
  cct_aplicavel?: string;
  observacoes?: string;
}

export interface SalaryHistory {
  id: UUID;
  contract_id: UUID;
  rubric_name: string;
  tipo: 'fixo' | 'variavel';
  records: SalaryRecord[];
}

export interface SalaryRecord {
  competencia: Competencia;
  valor: number;
  fonte: DocumentSourceType;
  fonte_id?: UUID;
  confidence: number; // 0-1
}

export interface ContractEvent {
  id: UUID;
  contract_id: UUID;
  tipo: ContractEventType;
  data_inicio: DateStr;
  data_fim?: DateStr;
  detalhes?: Record<string, unknown>;
  fonte?: DocumentSourceType;
  fonte_id?: UUID;
}

// =====================================================
// RUBRICA E CLASSIFICAÇÃO
// =====================================================

export interface Rubric {
  id: UUID;
  codigo: string;
  nome: string;
  familia: RubricFamily;
  natureza: RubricNature;
  aliases: string[];
  incidences: RubricIncidenceConfig;
  gera_reflexos: boolean;
  reflexos_config?: ReflectionRuleConfig[];
  base_composta?: string[]; // IDs de outras rubricas que compõem a base
  observacoes?: string;
}

export interface RubricIncidenceConfig {
  fgts: boolean;
  inss: boolean;
  irrf: boolean;
  previdencia_privada: boolean;
  pensao_alimenticia: boolean;
}

export interface RubricClassification {
  id: UUID;
  source_name: string;         // nome original do contracheque/TRCT
  canonical_rubric_id: UUID;   // rubrica canônica mapeada
  confidence: number;          // 0-1
  method: 'exact' | 'alias' | 'fuzzy' | 'ai_suggested' | 'manual';
  confirmed_by?: UUID;
  confirmed_at?: DateStr;
}

// =====================================================
// TÍTULO EXECUTIVO JUDICIAL
// =====================================================

export interface JudicialTitleVersion {
  id: UUID;
  case_id: UUID;
  versao: number;
  tipo: JudicialSourceType;
  data_decisao: DateStr;
  descricao: string;
  rules: JudicialRule[];
  fonte_documento_id?: UUID;
  created_at: DateStr;
}

export interface JudicialRule {
  id: UUID;
  title_version_id: UUID;
  rubric_code?: string;        // rubrica afetada (null = regra global)
  tipo: 'deferimento' | 'indeferimento' | 'parametro' | 'reflexo' | 'abatimento' | 'base' | 'periodo' | 'formula';
  descricao: string;
  parametros: Record<string, unknown>;
  /** Período de vigência da regra (null = todo o contrato) */
  periodo_inicio?: DateStr;
  periodo_fim?: DateStr;
  /** Prioridade: decisões mais recentes têm prioridade maior */
  prioridade: number;
  /** Regra que esta substitui */
  substitui_rule_id?: UUID;
  fonte: JudicialSourceType;
  observacoes?: string;
}

// =====================================================
// CENÁRIO DE CÁLCULO
// =====================================================

export interface CalculationScenario {
  id: UUID;
  case_id: UUID;
  nome: string;
  descricao?: string;
  tipo: 'principal' | 'alternativo' | 'condicional';
  ativo: boolean;
  params: GlobalCalculationParams;
  status: CalculationStatus;
  created_at: DateStr;
  updated_at: DateStr;
}

export interface GlobalCalculationParams {
  data_liquidacao: DateStr;
  data_ajuizamento: DateStr;
  data_citacao?: DateStr;
  prescricao_quinquenal: boolean;
  data_prescricao?: DateStr;
  sabado_dia_util: boolean;
  considerar_feriado_estadual: boolean;
  considerar_feriado_municipal: boolean;
  projetar_aviso_indenizado: boolean;
  zerar_valor_negativo: boolean;
  tipo_mes: 'civil' | 'comercial';
  carga_horaria_padrao: number;
  estado: string;
  municipio: string;
  indice_correcao: string;
  taxa_juros: number;
  juros_inicio: 'ajuizamento' | 'citacao' | 'competencia';
}

// =====================================================
// COMPETÊNCIA — UNIDADE DE CÁLCULO
// =====================================================

export interface CalculationCompetency {
  competencia: Competencia;
  vinculo_ativo: boolean;
  funcao: string;
  salario_base: number;
  rubricas_variaveis: { rubric_id: string; valor: number }[];
  eventos: ContractEvent[];
  calendario: CalendarInfo;
  cct_vigente?: string;
  normativa_vigente?: NormativeRule;
  fontes: EvidenceSourceRef[];
}

export interface CalendarInfo {
  dias_no_mes: number;
  dias_uteis: number;
  domingos: number;
  sabados: number;
  feriados: number;
  feriados_lista: { data: DateStr; nome: string; tipo: 'nacional' | 'estadual' | 'municipal' }[];
}

// =====================================================
// ITEM DE CÁLCULO — RESULTADO POR VERBA/COMPETÊNCIA
// =====================================================

export interface CalculationItem {
  id: UUID;
  scenario_id: UUID;
  rubric_code: string;
  rubric_name: string;
  competencia: Competencia;
  
  // Inputs resolvidos
  base: Decimal;
  base_source: string;
  divisor: Decimal;
  divisor_source: string;
  multiplicador: Decimal;
  quantidade: Decimal;
  quantidade_source: string;
  dobra: Decimal;
  
  // Resultados
  valor_devido: Decimal;
  valor_pago: Decimal;
  diferenca: Decimal;
  
  // Correção monetária e juros
  correcao: Decimal;
  juros: Decimal;
  total: Decimal;
  
  // Metadados
  formula_aplicada: string;
  judicial_rule_id?: UUID;
  ativo: boolean;
  
  // Referências
  reflections: CalculationItemReflection[];
  incidences: CalculationItemIncidence[];
  offsets: CalculationItemOffset[];
  audit_trail: AuditTrailEntry[];
}

export interface CalculationItemReflection {
  id: UUID;
  item_id: UUID;
  target_rubric: string;
  tipo: 'mensal' | 'anual' | 'rescisorio';
  base_multiplicador: number;
  divisor: number;
  valor: Decimal;
  competencia_destino: Competencia;
}

export interface CalculationItemIncidence {
  id: UUID;
  item_id: UUID;
  tipo: IncidenceType;
  base: Decimal;
  aliquota: Decimal;
  valor: Decimal;
  tabela_referencia: string;
  competencia_referencia: Competencia;
}

export interface CalculationItemOffset {
  id: UUID;
  item_id: UUID;
  paid_item_id: string;
  rubrica_paga: string;
  valor_abatido: Decimal;
  modo: 'identico_titulo' | 'competencia' | 'global';
  match_score: number;
  fonte: DocumentSourceType;
}

// =====================================================
// TRILHA DE AUDITORIA
// =====================================================

export interface AuditTrailEntry {
  campo: string;
  valor: string | number;
  fonte: string;
  regra?: string;
  observacao?: string;
  timestamp?: DateStr;
  confidence?: number;
  is_inference?: boolean;
}

// =====================================================
// REGRAS NORMATIVAS E CONVENCIONAIS
// =====================================================

export interface NormativeRule {
  id: UUID;
  case_id: UUID;
  tipo: 'cct' | 'act' | 'lei' | 'sumula' | 'oj';
  identificador: string;     // ex: "CCT 2019/2020 SINDCOMÉRCIO"
  vigencia_inicio: DateStr;
  vigencia_fim: DateStr;
  regras: Record<string, unknown>;
  observacoes?: string;
}

// =====================================================
// EVIDÊNCIA / FONTES DOCUMENTAIS
// =====================================================

export interface EvidenceSource {
  id: UUID;
  case_id: UUID;
  tipo: DocumentSourceType;
  nome: string;
  periodo_referencia_inicio?: DateStr;
  periodo_referencia_fim?: DateStr;
  status: 'uploaded' | 'processing' | 'extracted' | 'validated' | 'failed';
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceSourceRef {
  source_id: UUID;
  tipo: DocumentSourceType;
  campo: string;
  confidence: number;
}

// =====================================================
// REGRA DE CALENDÁRIO
// =====================================================

export interface CalendarRule {
  ano: number;
  estado: string;
  municipio?: string;
  feriados: { data: DateStr; nome: string; tipo: 'nacional' | 'estadual' | 'municipal' }[];
  sabado_dia_util: boolean;
}

// =====================================================
// REGRAS DE REFLEXO (Configuração)
// =====================================================

export interface ReflectionRuleConfig {
  target_rubric: string;
  tipo: 'mensal' | 'anual' | 'rescisorio';
  base_multiplier: number;
  divisor: number;
  periodo_media?: 'ano_civil' | 'periodo_aquisitivo' | '12_meses';
  usa_avos: boolean;
  fracao_mes: 'manter' | 'integralizar' | 'desprezar' | 'desprezar_menor_15';
  vedado_por_titulo?: boolean;
}

// =====================================================
// INCONSISTÊNCIAS
// =====================================================

export type InconsistencySeverity = 'bloqueante' | 'alerta' | 'informativa';
export type InconsistencyCategory = 
  | 'documento_faltante' | 'conflito_titulo' | 'rubrica_sem_classificacao'
  | 'base_ambigua' | 'periodo_lacuna' | 'divergencia_pjc' | 'hipotese_pendente'
  | 'salario_ausente' | 'jornada_invalida' | 'reflexo_inconsistente';

export interface InconsistencyFlag {
  id: UUID;
  case_id: UUID;
  scenario_id?: UUID;
  categoria: InconsistencyCategory;
  severidade: InconsistencySeverity;
  competencia?: Competencia;
  rubric_code?: string;
  descricao: string;
  sugestao?: string;
  resolvido: boolean;
  resolvido_por?: UUID;
  resolvido_em?: DateStr;
  created_at: DateStr;
}
