/**
 * =====================================================
 * PJe-CALC TYPES — TIPAGEM FORTE PARA VIEWS E TABELAS
 * =====================================================
 * 
 * Estas interfaces representam as views PostgreSQL do sistema pjecalc_*.
 * Como as views não são incluídas na geração automática de tipos do Supabase,
 * mantemos tipagem manual aqui para eliminar `as any` do núcleo.
 * 
 * REGRA: Nenhum arquivo do domínio pjecalc pode usar `as any` para acessar
 * estas views. Toda interação deve passar por estas interfaces.
 */

// =====================================================
// VIEW: pjecalc_parametros (sobre pjecalc_calculos)
// =====================================================

export interface PjecalcParametrosRow {
  id: string;
  case_id: string;
  estado: string | null;
  municipio: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  data_ajuizamento: string | null;
  data_inicial: string | null;
  data_final: string | null;
  prescricao_quinquenal: boolean;
  prescricao_fgts: boolean;
  regime_trabalho: string | null;
  carga_horaria_padrao: number;
  maior_remuneracao: number | null;
  ultima_remuneracao: number | null;
  prazo_aviso_previo: string | null;
  prazo_aviso_dias: number | null;
  projetar_aviso_indenizado: boolean;
  limitar_avos_periodo: boolean;
  zerar_valor_negativo: boolean;
  sabado_dia_util: boolean;
  considerar_feriado_estadual: boolean;
  considerar_feriado_municipal: boolean;
  tipo_mes: 'civil' | 'comercial' | null;
  jornada_semanal: number | null;
  comentarios: string | null;
  created_at: string;
  updated_at: string;
}

export interface PjecalcParametrosInsert {
  case_id: string;
  estado?: string;
  municipio?: string;
  data_admissao?: string;
  data_demissao?: string | null;
  data_ajuizamento?: string;
  data_inicial?: string | null;
  data_final?: string | null;
  prescricao_quinquenal?: boolean;
  prescricao_fgts?: boolean;
  regime_trabalho?: string;
  carga_horaria_padrao?: number;
  maior_remuneracao?: number | null;
  ultima_remuneracao?: number | null;
  prazo_aviso_previo?: string;
  prazo_aviso_dias?: number | null;
  projetar_aviso_indenizado?: boolean;
  limitar_avos_periodo?: boolean;
  zerar_valor_negativo?: boolean;
  sabado_dia_util?: boolean;
  considerar_feriado_estadual?: boolean;
  considerar_feriado_municipal?: boolean;
  comentarios?: string;
}

// =====================================================
// VIEW: pjecalc_dados_processo (sobre pjecalc_calculos)
// =====================================================

export interface PjecalcDadosProcessoRow {
  id: string;
  case_id: string;
  numero_processo: string | null;
  reclamante_nome: string | null;
  reclamante_cpf: string | null;
  reclamada_nome: string | null;
  reclamada_cnpj: string | null;
  vara: string | null;
  reclamado: string | null;
  perito: string | null;
  funcao: string | null;
  data_citacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface PjecalcDadosProcessoInsert {
  case_id: string;
  numero_processo?: string;
  reclamante_nome?: string;
  reclamante_cpf?: string;
  reclamada_nome?: string;
  reclamada_cnpj?: string;
  vara?: string;
}

// =====================================================
// VIEW: pjecalc_faltas (sobre pjecalc_evento_intervalo)
// =====================================================

export interface PjecalcFaltaRow {
  id: string;
  case_id: string;
  tipo_falta: string;
  data_inicial: string | null;
  data_final: string | null;
  justificada: boolean;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface PjecalcFaltaInsert {
  case_id: string;
  tipo_falta?: string;
  data_inicial: string;
  data_final: string;
  justificada?: boolean;
  motivo?: string;
  observacoes?: string;
}

// =====================================================
// VIEW: pjecalc_ferias (sobre pjecalc_evento_intervalo)
// =====================================================

export interface PjecalcFeriasRow {
  id: string;
  case_id: string;
  periodo_aquisitivo_inicio: string | null;
  periodo_aquisitivo_fim: string | null;
  periodo_concessivo_inicio: string | null;
  periodo_concessivo_fim: string | null;
  gozo_inicio: string | null;
  gozo_fim: string | null;
  dias: number;
  abono: boolean;
  dias_abono: number;
  dobra: boolean;
  situacao: string;
  gozo2_inicio: string | null;
  gozo2_fim: string | null;
  gozo3_inicio: string | null;
  gozo3_fim: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface PjecalcFeriasInsert {
  case_id: string;
  periodo_aquisitivo_inicio?: string;
  periodo_aquisitivo_fim?: string;
  periodo_concessivo_inicio?: string;
  periodo_concessivo_fim?: string;
  gozo_inicio?: string;
  gozo_fim?: string;
  dias?: number;
  abono?: boolean;
  dias_abono?: number;
  dobra?: boolean;
  situacao?: string;
  gozo2_inicio?: string | null;
  gozo2_fim?: string | null;
  gozo3_inicio?: string | null;
  gozo3_fim?: string | null;
  observacoes?: string;
}

// =====================================================
// VIEW: pjecalc_historico_salarial (sobre pjecalc_hist_salarial)
// =====================================================

export interface PjecalcHistoricoSalarialRow {
  id: string;
  case_id: string;
  nome: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  tipo_valor: string;
  valor_informado: number | null;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  observacoes: string | null;
  created_at: string;
}

export interface PjecalcHistoricoSalarialInsert {
  case_id: string;
  nome: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  tipo_valor?: string;
  valor_informado?: number;
  incidencia_fgts?: boolean;
  incidencia_cs?: boolean;
  observacoes?: string;
}

// =====================================================
// VIEW: pjecalc_historico_ocorrencias (sobre pjecalc_hist_salarial_mes)
// =====================================================

export interface PjecalcHistoricoOcorrenciaRow {
  id: string;
  case_id: string;
  historico_id: string;
  competencia: string;
  valor: number;
  tipo: string;
}

export interface PjecalcHistoricoOcorrenciaInsert {
  historico_id: string;
  competencia: string;
  valor?: number;
  tipo?: string;
}

// =====================================================
// VIEW: pjecalc_verbas (sobre pjecalc_verba_base)
// =====================================================

export interface PjecalcVerbaRow {
  id: string;
  case_id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
  caracteristica: string;
  ocorrencia_pagamento: string;
  multiplicador: number;
  divisor_informado: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  ordem: number;
  ativa: boolean;
  observacoes: string | null;
  hist_salarial_nome: string | null;
  verba_principal_id: string | null;
  valor: string;
  valor_informado_devido: number | null;
  valor_informado_pago: number | null;
  base_calculo: Record<string, unknown> | null;
  incide_fgts?: boolean;
  incide_inss?: boolean;
  incide_ir?: boolean;
  // Engine-critical fields (exposed via view after migration 20260327000010)
  divisor_tipo?: string | null;
  quantidade_tipo?: string | null;
  quantidade_valor?: number | null;
  fracao_mes_modo?: string | null;
  compor_principal?: boolean | null;
  gerar_principal?: string | null;
  gerar_reflexo?: string | null;
  excluir_falta_justificada?: boolean | null;
  excluir_falta_nao_justificada?: boolean | null;
  excluir_ferias_gozadas?: boolean | null;
  comportamento_reflexo?: string | null;
  periodo_media_reflexo?: string | null;
  quantidade_proporcionalizar?: boolean | null;
  hora_noturna_ficticia?: boolean | null;
  constante_mensal?: number | null;
  // P0 FIX: dobrar_valor_devido exposed via view after migration 000014
  dobrar_valor_devido?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PjecalcVerbaInsert {
  case_id: string;
  nome: string;
  codigo?: string;
  tipo?: string;
  caracteristica?: string;
  ocorrencia_pagamento?: string;
  multiplicador?: number;
  divisor_informado?: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  ordem?: number;
  ativa?: boolean;
  observacoes?: string;
  hist_salarial_nome?: string;
  verba_principal_id?: string | null;
  valor?: string;
  valor_informado_devido?: number | null;
  valor_informado_pago?: number | null;
  incidencias?: Record<string, boolean>;
  base_calculo?: Record<string, unknown>;
}

// =====================================================
// VIEW: pjecalc_ocorrencias (sobre pjecalc_ocorrencia_calculo)
// =====================================================

export interface PjecalcOcorrenciaRow {
  id: string;
  case_id: string;
  verba_id: string;
  verba_nome: string | null;
  competencia: string;
  base_valor: number;
  multiplicador_valor: number;
  divisor_valor: number;
  quantidade_valor: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
  correcao: number;
  juros: number;
  total: number;
  origem: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface PjecalcOcorrenciaInsert {
  case_id: string;
  verba_id: string;
  verba_nome?: string;
  competencia: string;
  base_valor?: number;
  multiplicador_valor?: number;
  divisor_valor?: number;
  quantidade_valor?: number;
  dobra?: number;
  devido?: number;
  pago?: number;
  diferenca?: number;
  correcao?: number;
  juros?: number;
  total?: number;
  origem?: string;
  ativa?: boolean;
}

// =====================================================
// VIEW: pjecalc_liquidacao_resultado (sobre pjecalc_resultado)
// =====================================================

export interface PjecalcLiquidacaoResultadoRow {
  id: string;
  case_id: string;
  total_bruto: number;
  total_liquido: number;
  inss_segurado: number;
  irrf: number;
  inss_patronal: number;
  honorarios: number;
  custas: number;
  fgts_depositar: number;
  fgts_multa_40: number;
  total_reclamante: number;
  total_reclamado: number;
  resultado: Record<string, unknown> | null;
  engine_version: string | null;
  status: string | null;
  data_liquidacao: string | null;
  created_at: string;
}

export interface PjecalcLiquidacaoResultadoInsert {
  case_id: string;
  total_bruto?: number;
  total_liquido?: number;
  inss_segurado?: number;
  irrf?: number;
  inss_patronal?: number;
  honorarios?: number;
  custas?: number;
  fgts_depositar?: number;
  fgts_multa_40?: number;
  total_reclamante?: number;
  total_reclamado?: number;
  resultado?: Record<string, unknown>;
  engine_version?: string;
}

// =====================================================
// VIEW: pjecalc_cartao_ponto (agregação de pjecalc_apuracao_diaria)
// =====================================================

export interface PjecalcCartaoPontoRow {
  id: string;
  case_id: string;
  competencia: string;
  dias_uteis: number;
  dias_trabalhados: number;
  horas_extras_50: number;
  horas_extras_100: number;
  horas_noturnas: number;
  intervalo_suprimido: number;
  dsr_horas: number;
  sobreaviso: number;
  created_at: string;
}

// =====================================================
// CONFIG VIEWS
// =====================================================

export interface PjecalcFgtsConfigRow {
  id: string;
  case_id: string;
  // Compat aliases (older column names)
  habilitado?: boolean;
  percentual_deposito?: number;
  percentual_multa?: number;
  // Full schema (pjecalc_fgts_config actual columns)
  apurar?: boolean;
  destino?: string;
  compor_principal?: boolean;
  multa_apurar?: boolean;
  multa_tipo?: string;
  multa_percentual?: number;
  multa_base?: string;
  multa_valor_informado?: number | null;
  deduzir_saldo?: boolean;
  lc110_10?: boolean;
  lc110_05?: boolean;
  saldos_saques?: { competencia: string; valor: number }[];
  created_at: string;
}

export interface PjecalcFgtsConfigInsert {
  case_id: string;
  apurar?: boolean;
  destino?: string;
  compor_principal?: boolean;
  multa_apurar?: boolean;
  multa_tipo?: string;
  multa_percentual?: number;
  multa_base?: string;
  multa_valor_informado?: number | null;
  deduzir_saldo?: boolean;
  lc110_10?: boolean;
  lc110_05?: boolean;
  saldos_saques?: { competencia: string; valor: number }[];
}

export interface PjecalcCsConfigRow {
  id: string;
  case_id: string;
  // Full schema (pjecalc_cs_config actual columns)
  habilitado?: boolean;
  regime?: string;
  apurar_segurado?: boolean;
  cobrar_reclamante?: boolean;
  cs_sobre_salarios_pagos?: boolean;
  aliquota_segurado_tipo?: string;
  aliquota_segurado_fixa?: number | null;
  limitar_teto?: boolean;
  apurar_empresa?: boolean;
  apurar_sat?: boolean;
  apurar_terceiros?: boolean;
  aliquota_empresa?: number;
  aliquota_empresa_fixa?: number;
  aliquota_sat?: number;
  aliquota_sat_fixa?: number;
  aliquota_terceiros?: number;
  aliquota_terceiros_fixa?: number;
  periodos_simples?: unknown[];
  contribuicao_sindical?: boolean;
  contribuicao_sindical_pos2017?: boolean;
  created_at: string;
}

export interface PjecalcCsConfigInsert {
  case_id: string;
  apurar_segurado?: boolean;
  cobrar_reclamante?: boolean;
  cs_sobre_salarios_pagos?: boolean;
  aliquota_segurado_tipo?: string;
  aliquota_segurado_fixa?: number | null;
  limitar_teto?: boolean;
  apurar_empresa?: boolean;
  apurar_sat?: boolean;
  apurar_terceiros?: boolean;
  aliquota_empresa_fixa?: number;
  aliquota_sat_fixa?: number;
  aliquota_terceiros_fixa?: number;
}

export interface PjecalcIrConfigRow {
  id: string;
  case_id: string;
  // Full schema (pjecalc_ir_config actual columns)
  habilitado?: boolean;
  apurar?: boolean;
  metodo?: string;
  dependentes: number;
  incidir_sobre_juros?: boolean;
  cobrar_reclamado?: boolean;
  tributacao_exclusiva_13?: boolean;
  tributacao_separada_ferias?: boolean;
  deduzir_cs?: boolean;
  deduzir_prev_privada?: boolean;
  deduzir_pensao?: boolean;
  deduzir_honorarios?: boolean;
  aposentado_65?: boolean;
  created_at: string;
}

export interface PjecalcIrConfigInsert {
  case_id: string;
  apurar?: boolean;
  dependentes?: number;
  incidir_sobre_juros?: boolean;
  cobrar_reclamado?: boolean;
  tributacao_exclusiva_13?: boolean;
  tributacao_separada_ferias?: boolean;
  deduzir_cs?: boolean;
  deduzir_prev_privada?: boolean;
  deduzir_pensao?: boolean;
  deduzir_honorarios?: boolean;
  aposentado_65?: boolean;
}

export interface PjecalcCorrecaoConfigRow {
  id: string;
  case_id: string;
  indice: string | null;
  epoca: string | null;
  juros_tipo: string | null;
  juros_percentual: number | null;
  juros_inicio: string | null;
  multa_523: boolean;
  multa_523_percentual: number;
  data_liquidacao: string | null;
  indice_correcao: string | null;
  created_at: string;
}

export interface PjecalcCorrecaoConfigInsert {
  case_id: string;
  indice?: string;
  epoca?: string;
  juros_tipo?: string;
  juros_percentual?: number;
  juros_inicio?: string;
  multa_523?: boolean;
  multa_523_percentual?: number;
  data_liquidacao?: string;
}

export interface PjecalcHonorariosRow {
  id: string;
  case_id: string;
  percentual: number;
  sobre: string;
  created_at: string;
}

export interface PjecalcHonorariosInsert {
  case_id: string;
  percentual?: number;
  sobre?: string;
}

export interface PjecalcCustasConfigRow {
  id: string;
  case_id: string;
  percentual: number;
  limite: number;
  created_at: string;
}

export interface PjecalcCustasConfigInsert {
  case_id: string;
  percentual?: number;
  limite?: number;
}

export interface PjecalcMultasConfigRow {
  id: string;
  case_id: string;
  multa_477: boolean;
  multa_467: boolean;
  created_at: string;
}

// =====================================================
// TABLE: pjecalc_calculos (tabela base principal)
// =====================================================

export interface PjecalcCalculoRow {
  id: string;
  case_id: string;
  user_id: string | null;
  status: string;
  // Process data
  processo_cnj: string | null;
  reclamante_nome: string | null;
  reclamante_cpf: string | null;
  reclamado_nome: string | null;
  reclamado_cnpj: string | null;
  vara: string | null;
  tribunal: string | null;
  // Contract/parameter data
  data_admissao: string | null;
  data_demissao: string | null;
  data_ajuizamento: string | null;
  data_inicio_calculo: string | null;
  data_fim_calculo: string | null;
  divisor_horas: number;
  observacoes: string | null;
  // Config fields
  honorarios_percentual: number | null;
  honorarios_sobre: string | null;
  custas_percentual: number | null;
  custas_limite: number | null;
  multa_477_habilitada: boolean;
  multa_467_habilitada: boolean;
  // PJC import metadata
  sabado_dia_util: boolean;
  projeta_aviso: boolean;
  duplicado_de: string | null;
  pjc_import_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ENGINE SNAPSHOT — Fingerprint de execução
// =====================================================

export interface EngineExecutionFingerprint {
  engine_version: string;
  ruleset_version: string;
  tax_table_versions: Record<string, string>;
  index_series_version: string;
  input_hash: string;
  facts_hash: string;
  calculation_profile_version: string;
  pjc_mapping_version?: string;
  execution_timestamp: string;
  execution_user: string;
  execution_mode: 'manual' | 'auto' | 'seed';
}

// =====================================================
// UTILITY: Supabase table name type for typed queries
// =====================================================

/**
 * Union type of all pjecalc view/table names for typed supabase calls.
 * Usage: supabase.from(tableName as PjecalcTableName)
 */
export type PjecalcViewName =
  | 'pjecalc_parametros'
  | 'pjecalc_dados_processo'
  | 'pjecalc_faltas'
  | 'pjecalc_ferias'
  | 'pjecalc_historico_salarial'
  | 'pjecalc_historico_ocorrencias'
  | 'pjecalc_verbas'
  | 'pjecalc_ocorrencias'
  | 'pjecalc_liquidacao_resultado'
  | 'pjecalc_cartao_ponto'
  | 'pjecalc_fgts_config'
  | 'pjecalc_cs_config'
  | 'pjecalc_ir_config'
  | 'pjecalc_correcao_config'
  | 'pjecalc_honorarios'
  | 'pjecalc_custas_config'
  | 'pjecalc_multas_config';

export type PjecalcTableName =
  | 'pjecalc_calculos'
  | 'pjecalc_evento_intervalo'
  | 'pjecalc_hist_salarial'
  | 'pjecalc_hist_salarial_mes'
  | 'pjecalc_verba_base'
  | 'pjecalc_ocorrencia_calculo'
  | 'pjecalc_resultado'
  | 'pjecalc_apuracao_diaria'
  | 'pjecalc_atualizacao_config'
  | 'pjecalc_audit_log'
  | 'pjecalc_reflexo'
  | 'pjecalc_reflexo_base_verba';

// =====================================================
// COMPLETUDE — Tipagem forte (substitui any em completude.ts)
// =====================================================

export interface CompletionInput {
  params: PjecalcParametrosRow | null;
  faltas: PjecalcFaltaRow[];
  ferias: PjecalcFeriasRow[];
  historicos: PjecalcHistoricoSalarialRow[];
  verbas: PjecalcVerbaRow[];
  cartaoPonto?: PjecalcCartaoPontoRow[];
  resultado: PjecalcLiquidacaoResultadoRow | null;
  fgtsConfig?: PjecalcFgtsConfigRow | null;
  csConfig?: PjecalcCsConfigRow | null;
  irConfig?: PjecalcIrConfigRow | null;
  correcaoConfig?: PjecalcCorrecaoConfigRow | null;
  pensaoConfig?: { apurar: boolean } | null;
}
