// =====================================================
// PJe-CALC ENGINE - TIPOS E INTERFACES
// =====================================================

/**
 * Calculation mode:
 * - 'assisted_from_pjc': Uses GT artifacts (gt_closure, calibrators) from an imported .pjc file.
 *   Falls back to ajuizamento+60d estimate when data_citacao is absent (backward-compatible).
 * - 'independent': Pure independent calculation. NO gt_closure, NO INSS/IR overrides,
 *   NO calibration. Requires data_citacao when ADC 58/59 post-citation phase exists;
 *   throws E_CITACAO_OBRIGATORIA if absent.
 */
export type PjeCalcMode = 'assisted_from_pjc' | 'independent';

export interface PjeParametros {
  case_id: string;
  data_admissao: string;
  data_demissao?: string;
  data_ajuizamento: string;
  data_citacao?: string;
  /**
   * Calculation mode. Defaults to 'assisted_from_pjc' when omitted (backward-compatible).
   * Set to 'independent' to enforce strict independent calculation without GT artifacts.
   */
  modo_calculo?: PjeCalcMode;
  data_inicial?: string;
  data_final?: string;
  estado: string;
  municipio: string;
  regime_trabalho: 'tempo_integral' | 'tempo_parcial' | 'intermitente';
  carga_horaria_padrao: number;
  prescricao_quinquenal: boolean;
  prescricao_fgts: boolean;
  data_prescricao_quinquenal?: string;
  maior_remuneracao?: number;
  ultima_remuneracao?: number;
  salario_minimo?: number;
  prazo_aviso_previo: 'nao_apurar' | 'calculado' | 'informado';
  prazo_aviso_dias?: number;
  projetar_aviso_indenizado: boolean;
  limitar_avos_periodo: boolean;
  zerar_valor_negativo: boolean;
  sabado_dia_util: boolean;
  considerar_feriado_estadual: boolean;
  considerar_feriado_municipal: boolean;
  /** Pontos Facultativos a considerar como feriado (Sexta-feira Santa, Carnaval, Corpus Christi) */
  pontos_facultativos?: ('sexta_santa' | 'carnaval' | 'corpus_christi')[];
  /** Art. 64 CLT: 'comercial' usa 30 dias fixos; 'civil' usa dias reais do mês */
  tipo_mes?: 'civil' | 'comercial';
  /** Multi-link: identifier for this employment contract (vínculos múltiplos) */
  vinculo_id?: string;
  /** Multi-link: label for this contract (e.g. "1º Vínculo - 2015/2020") */
  vinculo_label?: string;
}

/**
 * Multi-employment link container.
 * Allows running the engine independently per contract and consolidating results.
 */
export interface PjeMultiVinculo {
  vinculos: PjeVinculoData[];
  /** Consolidation mode: 'independente' runs each separately; 'acumulado' merges salary histories */
  modo_consolidacao: 'independente' | 'acumulado';
}

export interface PjeVinculoData {
  vinculo_id: string;
  label: string;
  params: PjeParametros;
  historicos: PjeHistoricoSalarial[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
  verbas: PjeVerba[];
  cartaoPonto: PjeCartaoPonto[];
}

export interface PjeHistoricoSalarial {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  tipo_valor: 'informado' | 'calculado';
  valor_informado?: number;
  quantidade?: number;
  base_referencia?: string;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  fgts_recolhido: boolean;
  cs_recolhida: boolean;
  ocorrencias: PjeHistoricoOcorrencia[];
}

export interface PjeHistoricoOcorrencia {
  id: string;
  historico_id: string;
  competencia: string;
  valor: number;
  tipo: 'calculado' | 'informado';
}

export interface PjeFalta {
  id: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  justificativa?: string;
}

export interface PjeFeriasGozoPeriodo {
  inicio: string;
  fim: string;
  dias: number;
}

export interface PjeFerias {
  id: string;
  relativas: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  prazo_dias: number;
  situacao: 'gozadas' | 'indenizadas' | 'perdidas' | 'gozadas_parcialmente';
  dobra: boolean;
  abono: boolean;
  /** Fracionamento em até 3 períodos (CLT Art. 134 §1º - Reforma Trabalhista) */
  periodos_gozo?: PjeFeriasGozoPeriodo[];
  /** Abono pecuniário (1/3 dos dias) */
  abono_dias?: number;
}

export interface PjeExcecaoCargaHoraria {
  data_inicial: string;
  data_final: string;
  carga_horaria: number;
  observacao?: string;
}

/** Saturday exception: override sabado_dia_util for a specific date range */
export interface PjeExcecaoSabado {
  data_inicial: string;
  data_final: string;
  sabado_dia_util: boolean;
  observacao?: string;
}

export interface PjeVerba {
  id: string;
  nome: string;
  tipo: 'principal' | 'reflexa';
  valor: 'calculado' | 'informado';
  caracteristica: 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  compor_principal: boolean;

  /** Assunto CNJ (e.g. "2140 - INTERVALO INTRAJORNADA") */
  assunto_cnj?: string;
  /** Aplicar Súmula nº 439 do TST (juros desde o ajuizamento para danos morais) */
  sumula_439_tst?: boolean;
  zerar_valor_negativo: boolean;
  dobrar_valor_devido: boolean;
  periodo_inicio: string;
  periodo_fim: string;
  
  base_calculo: {
    historicos: string[];
    verbas: string[];
    tabelas: string[];
    proporcionalizar: boolean;
    integralizar: boolean;
  };
  
  tipo_divisor: 'informado' | 'carga_horaria' | 'dias_uteis' | 'cartao_ponto' | 'calendario' | 'jornada' | 'mensal' | 'diario' | 'hora' | 'minuto';
  divisor_informado: number;
  divisor_cartao_colunas?: string[];
  multiplicador: number;
  tipo_quantidade: 'informada' | 'avos' | 'apurada' | 'repousos' | 'calendario' | 'cartao_ponto' | 'cartao_horas' | 'cartao_dias' | 'media_apurada';
  quantidade_informada: number;
  quantidade_cartao_colunas?: string[];
  quantidade_proporcionalizar: boolean;
  proporcionalizar_devido?: boolean;
  proporcionalizar_pago?: boolean;
  
  /** Modo de fração de mês: manter_fracao | integralizar | desprezar | desprezar_menor_15 */
  fracao_mes_modo?: 'manter_fracao' | 'integralizar' | 'desprezar' | 'desprezar_menor_15';

  /** Art. 73 §1° CLT: hora noturna fictícia — cada hora real = 52,5 min → fator 8/7 sobre divisor */
  hora_noturna_ficticia?: boolean;

  /** Súmula 340 TST: comissionista puro — HE = apenas adicional (50%), não hora cheia (150%).
   *  Quando true, o multiplicador de HE é aplicado como (mult - 1), ex: 1.5 → 0.5 */
  sumula_340_comissionista?: boolean;

  /** Tipo do empregado para FGTS: 'normal' (8%) ou 'aprendiz' (2%) — Lei 10.097/2000 */
  tipo_fgts?: 'normal' | 'aprendiz';

  exclusoes: {
    faltas_justificadas: boolean;
    faltas_nao_justificadas: boolean;
    ferias_gozadas: boolean;
  };
  
  valor_informado_devido?: number;
  valor_informado_pago?: number;
  
  /** Constante mensal fixa (PJe-Calc <Constante>) — usado em verbas 'informado' com valor fixo por mês */
  constante_mensal?: number;
  
  // Valor Pago Calculado (Fase 2)
  valor_pago_tipo?: 'informado' | 'calculado';
  pago_base?: number;
  pago_divisor?: number;
  pago_multiplicador?: number;
  pago_quantidade?: number;
  
  incidencias: {
    fgts: boolean;
    irpf: boolean;
    contribuicao_social: boolean;
    previdencia_privada: boolean;
    pensao_alimenticia: boolean;
  };
  
  juros_ajuizamento: 'ocorrencias_vencidas' | 'ocorrencias_vencidas_vincendas';
  
  verba_principal_id?: string;
  comportamento_reflexo?: 'valor_mensal' | 'media_valor_absoluto' | 'media_valor_corrigido' | 'media_quantidade' | 'media_pela_quantidade';
  /** Período de agrupamento para reflexos: ANO_CIVIL (13º), PERIODO_AQUISITIVO (férias) */
  periodo_media_reflexo?: 'ano_civil' | 'periodo_aquisitivo' | 'global';
  gerar_verba_reflexa: 'devido' | 'diferenca';
  gerar_verba_principal: 'devido' | 'diferenca';
  
  ordem: number;
  reflexas?: PjeVerba[];
  
  /** Pre-computed occurrences from PJC ground truth. When present, engine uses these 
   *  directly instead of computing from historicos/cartão. Enables PJC round-trip parity. */
  ocorrencias_precomputadas?: {
    competencia: string;
    base: number;
    divisor: number;
    multiplicador: number;
    quantidade: number;
    dobra: boolean;
    devido: number;
    pago: number;
    /** PJC ground truth correction factor (indiceAcumulado from XML) */
    indice_acumulado?: number;
  }[];
}

export interface PjeOcorrencia {
  id: string;
  verba_id: string;
  competencia: string;
  data_inicial: string;
  data_final: string;
  ativa: boolean;
  valor_base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
}

export interface PjeCartaoPonto {
  competencia: string;
  dias_uteis: number;
  dias_trabalhados: number;
  horas_extras_50: number;
  horas_extras_100: number;
  horas_noturnas: number;
  intervalo_suprimido: number;
  dsr_horas: number;
  sobreaviso: number;
  dados_extras?: Record<string, number>;
  [key: string]: any;
}

export interface PjeFeriadoDB {
  data: string;
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'facultativo';
  uf?: string;
  municipio?: string;
}

export interface PjePrevidenciaPrivadaConfig {
  apurar: boolean;
  percentual: number;
  base_calculo: 'diferenca' | 'devido' | 'corrigido';
  deduzir_ir: boolean;
}

export interface PjeSalarioFamiliaConfig {
  apurar: boolean;
  numero_filhos: number;
  filhos_detalhes?: { nome: string; nascimento: string; ate_14: boolean }[];
}

export interface PjeSalarioFamiliaResult {
  apurado: boolean;
  cotas: { competencia: string; filhos_elegíveis: number; valor_cota: number; total: number }[];
  total: number;
}

export interface PjeSeguroDesempregoDB {
  competencia: string;
  faixa: number;
  valor_inicial: number;
  valor_final: number;
  percentual: number;
  valor_soma: number;
  valor_piso: number;
  valor_teto: number;
}

export interface PjeSalarioFamiliaDB {
  competencia: string;
  faixa: number;
  valor_inicial: number;
  valor_final: number;
  valor_cota: number;
}

export interface PjeFGTSConfig {
  apurar: boolean;
  destino: 'pagar_reclamante' | 'recolher_conta';
  compor_principal: boolean;
  multa_apurar: boolean;
  multa_tipo: 'calculada' | 'informada';
  multa_percentual: number;
  multa_base: 'devido' | 'diferenca' | 'saldo_saque' | 'devido_menos_saldo' | 'devido_mais_saldo';
  multa_valor_informado?: number;
  saldos_saques: { data: string; valor: number }[];
  deduzir_saldo: boolean;
  lc110_10: boolean;
  lc110_05: boolean;
}

export interface PjeCNAEAliquotas {
  cnae: string;
  descricao: string;
  sat_rat: number;
  terceiros: number;
  fap?: number;
}

/**
 * Ground truth entry from PJe-Calc's <ApuracaoDeJuros> section.
 * Contains consolidated corrected values, CS/IR bases, and interest rates per competência.
 */
export interface PjeApuracaoJurosGT {
  competencia: string; // YYYY-MM-DD
  valor_corrigido: number;
  cs_base_normal: number;
  cs_base_13: number;
  cs_normal: number;
  cs_13: number;
  ir_base_demais: number;
  ir_base_13: number;
  ir_base_ferias: number;
  taxa_juros: number;
}

export interface PjeCSConfig {
  apurar_segurado: boolean;
  cobrar_reclamante: boolean;
  cs_sobre_salarios_pagos: boolean;
  aliquota_segurado_tipo: 'empregado' | 'domestico' | 'fixa';
  aliquota_segurado_fixa?: number;
  limitar_teto: boolean;
  apurar_empresa: boolean;
  apurar_sat: boolean;
  apurar_terceiros: boolean;
  aliquota_empregador_tipo: 'atividade' | 'periodo' | 'fixa';
  aliquota_empresa_fixa?: number;
  aliquota_sat_fixa?: number;
  aliquota_terceiros_fixa?: number;
  periodos_simples: { inicio: string; fim: string }[];
  /** CNAE da atividade econômica para lookup automático SAT/RAT */
  cnae?: string;
  /** Diferenciação CS: 'bruto' aplica sobre valor bruto (devido), 'liquido' sobre diferença (devido-pago) */
  base_cs_segurado?: 'bruto' | 'liquido';
  /** Separar CS do reclamante (inssReclamante) vs beneficiário (inssBeneficiario) */
  separar_reclamante_beneficiario?: boolean;
  /** Ground truth from PJe-Calc's ApuracaoDeJuros — when present, use these exact CS bases */
  apuracao_juros_gt?: PjeApuracaoJurosGT[];
  /** Contribuição Sindical (art. 578 CLT) — 1 dia de salário, descontado em março.
   *  Pré-reforma (< nov/2017): obrigatória. Pós-reforma: facultativa. */
  contribuicao_sindical?: boolean;
  /** Lei 13.467/2017: contribuição sindical pós-nov/2017 é facultativa.
   *  Quando true, aplica também para anos 2018+. */
  contribuicao_sindical_pos2017?: boolean;
  /** Código FPAS para cálculo de terceiros */
  fpas_code?: string;
}

export interface PjeIRConfig {
  apurar: boolean;
  incidir_sobre_juros: boolean;
  cobrar_reclamado: boolean;
  tributacao_exclusiva_13: boolean;
  tributacao_separada_ferias: boolean;
  deduzir_cs: boolean;
  deduzir_prev_privada: boolean;
  deduzir_pensao: boolean;
  deduzir_honorarios: boolean;
  aposentado_65: boolean;
  dependentes: number;
  /** Ground truth from PJe-Calc's ApuracaoDeJuros — when present, use these exact IR bases */
  apuracao_juros_gt?: PjeApuracaoJurosGT[];
}

export interface PjeCombinacaoIndice {
  de?: string;   // YYYY-MM-DD
  ate?: string;  // YYYY-MM-DD
  indice: string; // IPCAE | IPCA | SELIC | SEM_CORRECAO | TR
}

export interface PjeCombinacaoJuros {
  de?: string;
  ate?: string;
  tipo: string; // TRD_SIMPLES | SELIC | TAXA_LEGAL | NENHUM
  percentual?: number;
}

export interface PjeCorrecaoConfig {
  indice: string;
  epoca: 'mensal' | 'fixo';
  data_fixa?: string;
  juros_tipo: 'simples_mensal' | 'selic' | 'nenhum' | 'composto';
  juros_percentual: number;
  juros_inicio: 'ajuizamento' | 'citacao' | 'vencimento';
  multa_523: boolean;
  multa_523_percentual: number;
  multa_467?: boolean;
  multa_467_percentual?: number;
  data_liquidacao: string;
  /** Combination-by-date regime (3-phase correction like ADC 58/59) */
  combinacoes_indice?: PjeCombinacaoIndice[];
  /** Combination-by-date interest regime */
  combinacoes_juros?: PjeCombinacaoJuros[];
  /** Apply interest after deducting CS from reclamante */
  juros_apos_deducao_cs?: boolean;
  /** Ground truth from PJe-Calc's ApuracaoDeJuros — when present, calibrate corrected values */
  apuracao_juros_gt?: PjeApuracaoJurosGT[];
  /** Ground truth closure targets from PJC resultado — used to compute exact total juros */
  gt_closure?: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
  };
  /** PJC: ignorarTaxaNegativa — when true, negative correction factors are clamped to 1 */
  ignorar_taxa_negativa?: boolean;
  /** PJC: baseDeJurosDasVerbas — 'DIFERENCA' | 'DEVIDO' | 'CORRIGIDO' */
  base_de_juros_das_verbas?: string;
  /** PJC: entePublico — affects interest calculation rules */
  ente_publico?: boolean;
  /** PJC: aplicarJurosFasePreJudicial */
  aplicar_juros_fase_pre_judicial?: boolean;
  /** PJe-Calc: Acumular Índices de Correção — 'mensal' | 'anual' | 'periodo' */
  acumular_indices_correcao?: 'mensal' | 'anual' | 'periodo';
  /** OJ 394 SDI-1 TST: juros calculados sobre base após dedução de IR.
   *  When true, interest should be recalculated on the post-IR base. */
  oj_394_juros_pos_ir?: boolean;
}

export interface PjeHonorariosConfig {
  apurar_sucumbenciais: boolean;
  percentual_sucumbenciais: number;
  base_sucumbenciais: 'condenacao' | 'causa' | 'proveito';
  apurar_contratuais: boolean;
  percentual_contratuais: number;
  valor_fixo?: number;
}

export interface PjeCustaItem {
  tipo: 'judiciais' | 'periciais' | 'emolumentos' | 'postais' | 'outras';
  descricao: string;
  apurar: boolean;
  percentual: number;
  valor_fixo?: number;
  valor_minimo: number;
  valor_maximo?: number;
  isento: boolean;
}

export interface PjeCustasConfig {
  apurar: boolean;
  percentual: number;
  valor_minimo: number;
  valor_maximo?: number;
  isento: boolean;
  assistencia_judiciaria: boolean;
  itens: PjeCustaItem[];
}

export interface PjeSeguroConfig {
  apurar: boolean;
  parcelas: number;
  valor_parcela?: number;
  recebeu: boolean;
}

// =====================================================
// RESULTADO DA LIQUIDAÇÃO
// =====================================================

export interface PjePrevidenciaPrivadaResult {
  apurado: boolean;
  base: number;
  percentual: number;
  valor: number;
}

export interface PjeAuditTrailEntry {
  step: number;
  module: string;
  description: string;
  competencia?: string;
  resultado?: number;
  rubrica?: string;
}

export interface PjeLiquidacaoResult {
  data_liquidacao: string;
  verbas: PjeVerbaResult[];
  fgts: PjeFGTSResult;
  contribuicao_social: PjeCSResult;
  imposto_renda: PjeIRResult;
  seguro_desemprego: PjeSeguroResult;
  previdencia_privada: PjePrevidenciaPrivadaResult;
  salario_familia: PjeSalarioFamiliaResult;
  resumo: PjeResumo;
  validacao?: PjeValidationResult;
  audit_trail?: PjeAuditTrailEntry[];
  /** Structured warnings collected during calculation (fallbacks, missing tables, etc.) */
  calculation_warnings?: { code: string; module: string; message: string; competencia?: string }[];
  /** Memória de cálculo completa (auditoria linha a linha) */
  memoria_calculo?: MemoriaCalculo;
}

export interface PjeVerbaResult {
  verba_id: string;
  nome: string;
  tipo: string;
  caracteristica: string;
  ocorrencias: PjeOcorrenciaResult[];
  total_devido: number;
  total_pago: number;
  total_diferenca: number;
  total_corrigido: number;
  total_juros: number;
  total_final: number;
}

export interface PjeOcorrenciaResult {
  competencia: string;
  base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
  indice_correcao: number;
  valor_corrigido: number;
  juros: number;
  valor_final: number;
  formula: string;
  /** Valores integrais (mês cheio) para integralização em reflexos */
  base_integral?: number;
  quantidade_integral?: number;
  devido_integral?: number;
  /** Rastreabilidade de arredondamento por etapa (Método PJe-Calc) */
  arredondamento_trace?: { etapa: string; valor_cheio: string; valor_truncado: string }[];
  /** PJC ground truth correction factor — when present, engine uses this instead of recalculating */
  pjc_indice_acumulado?: number;
  /** Flag: true when pjc_indice_acumulado was applied as the correction factor */
  pjc_ground_truth_applied?: boolean;
  /** The correction regime active for this occurrence (e.g. 'SELIC', 'IPCA-E', 'SEM_CORRECAO').
   *  When 'SELIC', the ground truth factor already includes interest → skip separate interest.
   *  When 'IPCA-E' or other, the factor is correction-only → interest must be calculated separately. */
  pjc_ground_truth_regime?: string;
  /** Per-occurrence paid value breakdown (Feature #3: rubric-specific paid values) */
  pago_breakdown?: {
    base: number;
    divisor: number;
    multiplicador: number;
    quantidade: number;
    formula: string;
  };
}

export interface PjeFGTSResult {
  depositos: { competencia: string; base: number; aliquota: number; valor: number }[];
  total_depositos: number;
  multa_valor: number;
  lc110_10: number;
  lc110_05: number;
  saldo_deduzido: number;
  total_fgts: number;
}

export interface PjeCSResult {
  segurado_devidos: { competencia: string; base: number; aliquota: number; valor: number; recolhido: number; diferenca: number }[];
  segurado_pagos: { competencia: string; base: number; aliquota: number; valor: number; recolhido: number; diferenca: number }[];
  empregador: { competencia: string; empresa: number; sat: number; terceiros: number }[];
  total_segurado_devidos: number;
  total_segurado_pagos: number;
  total_segurado: number;
  total_empregador: number;
  /** CS segregada: parte do reclamante (deduzida do líquido) */
  cs_reclamante?: number;
  /** CS segregada: parte do beneficiário (recolhimento patronal-segurado) */
  cs_beneficiario?: number;
}

export interface PjeIRResult {
  base_calculo: number;
  deducoes: number;
  base_tributavel: number;
  imposto_devido: number;
  meses_rra: number;
  metodo: 'tabela_mensal' | 'art_12a_rra';
  // Art. 12-A detalhamento
  ir_anos_anteriores: number;
  ir_ano_liquidacao: number;
  ir_13_exclusivo: number;
  ir_ferias_separado: number;
  meses_anos_anteriores: number;
  meses_ano_liquidacao: number;
}

export interface PjeSeguroResult {
  apurado: boolean;
  parcelas: number;
  valor_parcela: number;
  total: number;
}

export interface PjeCustaResult {
  tipo: string;
  descricao: string;
  valor: number;
}

export interface PjePensaoConfig {
  apurar: boolean;
  percentual: number;
  valor_fixo?: number;
  base: 'liquido' | 'bruto' | 'bruto_menos_inss';
}

export interface PjeResumo {
  principal_bruto: number;
  principal_corrigido: number;
  juros_mora: number;
  fgts_total: number;
  cs_segurado: number;
  cs_empregador: number;
  ir_retido: number;
  seguro_desemprego: number;
  previdencia_privada: number;
  salario_familia: number;
  multa_523: number;
  multa_467: number;
  honorarios_sucumbenciais: number;
  honorarios_contratuais: number;
  custas: number;
  custas_detalhadas: PjeCustaResult[];
  pensao_sobre_fgts: number;
  pensao_total: number;
  contribuicao_sindical: number;
  /** Abono pecuniário férias (Art. 143 CLT) — sujeito a IR, não ao INSS */
  abono_pecuniario: number;
  liquido_reclamante: number;
  total_reclamada: number;
  /** Metadata for transparency */
  meta?: {
    arredondamento: string;
    tipo_mes: string;
    selic_referencia?: { data: string; acumulado: number };
    oj415_aplicada: boolean;
  };
}

// =====================================================
// TIPOS PARA DADOS DO BANCO
// =====================================================

export interface PjeIndiceRow {
  indice: string;
  competencia: string; // YYYY-MM-DD
  valor: number;
  acumulado: number;
}

export interface PjeINSSFaixaRow {
  competencia_inicio: string;
  competencia_fim?: string | null;
  faixa: number;
  valor_ate: number;
  aliquota: number;
}

export interface PjeIRFaixaRow {
  competencia_inicio: string;
  competencia_fim?: string | null;
  faixa: number;
  valor_ate: number;
  aliquota: number;
  deducao: number;
  deducao_dependente: number;
}

export interface PjeSalarioMinimoRow {
  competencia: string; // YYYY-MM-DD
  valor: number;
}

export interface PjeValidationItem {
  tipo: 'erro' | 'alerta' | 'observacao';
  modulo: string;
  mensagem: string;
  detalhe?: string;
}

export interface PjeValidationResult {
  valido: boolean;
  itens: PjeValidationItem[];
  erros: number;
  alertas: number;
  observacoes: number;
}

// =====================================================
// MEMÓRIA DE CÁLCULO — Auditoria linha a linha
// Compatível com formato PJe-Calc para comparação direta
// =====================================================

export interface LinhaMemoriaCalculo {
  verba_id: string;
  verba_nome: string;
  competencia: string;
  base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
  indice_correcao: string;
  fator_correcao: number;
  valor_corrigido: number;
  data_inicio_juros: string;
  dias_juros: number;
  taxa_juros: number;
  valor_juros: number;
  valor_final: number;
  inss_segurado: number;
  ir_retido: number;
  regime_correcao: string;
  era_temporal: string;
}

export interface MemoriaCalculo {
  processo: string;
  data_liquidacao: string;
  data_geracao: string;
  reclamante: string;
  reclamado: string;
  data_admissao: string;
  data_demissao: string;
  linhas: LinhaMemoriaCalculo[];
  totais: {
    valor_principal: number;
    correcao_monetaria: number;
    juros_moratorios: number;
    total_bruto: number;
    inss_segurado: number;
    inss_empregador: number;
    ir_retido: number;
    fgts_devido: number;
    multa_fgts: number;
    custas: number;
    honorarios: number;
    liquido_exequente: number;
  };
  indices_status: {
    ultimo_mes_disponivel: string;
    meses_de_atraso: number;
    desatualizado: boolean;
  };
  warnings: string[];
}
