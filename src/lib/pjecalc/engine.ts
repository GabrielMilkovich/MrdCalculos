// =====================================================
// PJe-CALC ENGINE - MOTOR DE CÁLCULO OFICIAL
// Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
// Diferença = Devido - Pago
// =====================================================

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// TIPOS
// =====================================================

export interface PjeParametros {
  case_id: string;
  data_admissao: string;
  data_demissao?: string;
  data_ajuizamento: string;
  data_citacao?: string;
  data_inicial?: string;
  data_final?: string;
  estado: string;
  municipio: string;
  regime_trabalho: 'tempo_integral' | 'tempo_parcial';
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
  /** Art. 64 CLT: 'comercial' usa 30 dias fixos; 'civil' usa dias reais do mês */
  tipo_mes?: 'civil' | 'comercial';
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

export interface PjeVerba {
  id: string;
  nome: string;
  tipo: 'principal' | 'reflexa';
  valor: 'calculado' | 'informado';
  caracteristica: 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  compor_principal: boolean;
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
  
  tipo_divisor: 'informado' | 'carga_horaria' | 'dias_uteis' | 'cartao_ponto' | 'calendario';
  divisor_informado: number;
  divisor_cartao_colunas?: string[];
  multiplicador: number;
  tipo_quantidade: 'informada' | 'avos' | 'apurada' | 'calendario' | 'cartao_ponto';
  quantidade_informada: number;
  quantidade_cartao_colunas?: string[];
  quantidade_proporcionalizar: boolean;
  proporcionalizar_devido?: boolean;
  proporcionalizar_pago?: boolean;
  
  /** Modo de fração de mês: manter_fracao | integralizar | desprezar | desprezar_menor_15 */
  fracao_mes_modo?: 'manter_fracao' | 'integralizar' | 'desprezar' | 'desprezar_menor_15';
  
  exclusoes: {
    faltas_justificadas: boolean;
    faltas_nao_justificadas: boolean;
    ferias_gozadas: boolean;
  };
  
  valor_informado_devido?: number;
  valor_informado_pago?: number;
  
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

// Tabela Salário-Família 2025 (Portaria MPS/MF nº 6/2025)
const SALARIO_FAMILIA_2025 = {
  limite_remuneracao: 1819.26,
  valor_cota: 62.04,
};

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

export const CNAE_ALIQUOTAS_COMUNS: PjeCNAEAliquotas[] = [
  { cnae: '4711-3', descricao: 'Comércio varejista', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4120-4', descricao: 'Construção de edifícios', sat_rat: 3, terceiros: 5.8 },
  { cnae: '1011-2', descricao: 'Abate de bovinos', sat_rat: 3, terceiros: 5.8 },
  { cnae: '4921-3', descricao: 'Transporte rodoviário coletivo', sat_rat: 3, terceiros: 5.8 },
  { cnae: '8610-1', descricao: 'Atividades hospitalares', sat_rat: 3, terceiros: 5.8 },
  { cnae: '6201-5', descricao: 'Desenvolvimento de software', sat_rat: 1, terceiros: 5.8 },
  { cnae: '5611-2', descricao: 'Restaurantes e lanchonetes', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4930-2', descricao: 'Transporte rodoviário de carga', sat_rat: 3, terceiros: 5.8 },
  { cnae: '8411-6', descricao: 'Administração pública', sat_rat: 2, terceiros: 5.8 },
  { cnae: '8531-7', descricao: 'Ensino fundamental', sat_rat: 1, terceiros: 5.8 },
  { cnae: '6422-1', descricao: 'Bancos comerciais', sat_rat: 1, terceiros: 5.8 },
  { cnae: '4110-7', descricao: 'Incorporação de empreendimentos', sat_rat: 3, terceiros: 5.8 },
  { cnae: '4511-1', descricao: 'Comércio de veículos', sat_rat: 2, terceiros: 5.8 },
  { cnae: '4781-4', descricao: 'Comércio de artigos do vestuário', sat_rat: 1, terceiros: 5.8 },
  { cnae: '4761-0', descricao: 'Papelarias e livrarias', sat_rat: 1, terceiros: 5.8 },
];

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
  liquido_reclamante: number;
  total_reclamada: number;
  /** Metadata for transparency */
  meta?: {
    /** Arredondamento: por competência (item a item) conforme metodologia judiciária */
    arredondamento: string;
    /** Tipo de mês utilizado: civil (dias reais) ou comercial (30 dias fixos, Art. 64 CLT) */
    tipo_mes: string;
    /** Último índice SELIC utilizado e sua data de referência */
    selic_referencia?: { data: string; acumulado: number };
    /** OJ 415 aplicada em alguma verba */
    oj415_aplicada: boolean;
  };
}

// =====================================================
// TIPOS PARA DADOS DO BANCO (séries históricas e tabelas versionadas)
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
// TABELAS PADRÃO (fallback quando não há dados do banco)
// =====================================================

// INSS Progressivo 2025 (Portaria MPS/MF nº 6/2025)
const DEFAULT_FAIXAS_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 5839.45, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// IRRF 2025 - Tabela mensal
const DEFAULT_FAIXAS_IR = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEFAULT_DEDUCAO_DEPENDENTE = 189.59;

// Seguro-Desemprego 2025 (Resolução CODEFAT)
const SEGURO_DESEMP_2025 = {
  faixa1_ate: 2041.39,
  faixa1_mult: 0.8,
  faixa2_ate: 3402.65,
  faixa2_base: 1633.12,
  faixa2_mult: 0.5,
  teto: 2313.74,
};

// =====================================================
// MOTOR DE CÁLCULO
// =====================================================

export class PjeCalcEngine {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private faltas: PjeFalta[];
  private ferias: PjeFerias[];
  private verbas: PjeVerba[];
  private cartaoPonto: PjeCartaoPonto[];
  private fgtsConfig: PjeFGTSConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private correcaoConfig: PjeCorrecaoConfig;
  private honorariosConfig: PjeHonorariosConfig;
  private custasConfig: PjeCustasConfig;
  private seguroConfig: PjeSeguroConfig;
  private indicesDB: PjeIndiceRow[];
  private faixasINSSDB: PjeINSSFaixaRow[];
  private faixasIRDB: PjeIRFaixaRow[];
  private excecoesCargas: PjeExcecaoCargaHoraria[];
  private feriadosDB: PjeFeriadoDB[];
  private prevPrivadaConfig: PjePrevidenciaPrivadaConfig;
  private pensaoConfig: PjePensaoConfig;
  private salarioFamiliaConfig: PjeSalarioFamiliaConfig;
  // Map of verba results by verba_id for reflexa resolution
  private verbaResultsMap: Map<string, PjeVerbaResult> = new Map();

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    faltas: PjeFalta[],
    ferias: PjeFerias[],
    verbas: PjeVerba[],
    cartaoPonto: PjeCartaoPonto[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
    honorariosConfig: PjeHonorariosConfig,
    custasConfig: PjeCustasConfig,
    seguroConfig: PjeSeguroConfig,
    indicesDB: PjeIndiceRow[] = [],
    faixasINSSDB: PjeINSSFaixaRow[] = [],
    faixasIRDB: PjeIRFaixaRow[] = [],
    excecoesCargas: PjeExcecaoCargaHoraria[] = [],
    feriadosDB: PjeFeriadoDB[] = [],
    prevPrivadaConfig: PjePrevidenciaPrivadaConfig = { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false },
    pensaoConfig: PjePensaoConfig = { apurar: false, percentual: 0, base: 'liquido' },
    salarioFamiliaConfig: PjeSalarioFamiliaConfig = { apurar: false, numero_filhos: 0 },
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas.map(v => ({
      ...v,
      base_calculo: {
        historicos: v.base_calculo?.historicos || [],
        verbas: v.base_calculo?.verbas || [],
        tabelas: v.base_calculo?.tabelas || [],
        proporcionalizar: v.base_calculo?.proporcionalizar ?? false,
        integralizar: v.base_calculo?.integralizar ?? false,
      },
      exclusoes: v.exclusoes || { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false },
      incidencias: v.incidencias || { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    }));
    this.cartaoPonto = cartaoPonto;
    this.fgtsConfig = fgtsConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.correcaoConfig = correcaoConfig;
    this.honorariosConfig = honorariosConfig;
    this.custasConfig = custasConfig;
    this.seguroConfig = seguroConfig;
    this.indicesDB = indicesDB;
    this.faixasINSSDB = faixasINSSDB;
    this.faixasIRDB = faixasIRDB;
    this.excecoesCargas = excecoesCargas;
    this.feriadosDB = feriadosDB;
    this.prevPrivadaConfig = prevPrivadaConfig;
    this.pensaoConfig = pensaoConfig;
    this.salarioFamiliaConfig = salarioFamiliaConfig;
  }

  // =====================================================
  // PERÍODO DE CÁLCULO
  // =====================================================
  
  getPeriodoCalculo(): { inicio: string; fim: string } {
    const datas = [this.params.data_admissao];
    if (this.params.prescricao_quinquenal && this.params.data_prescricao_quinquenal) {
      datas.push(this.params.data_prescricao_quinquenal);
    }
    if (this.params.data_inicial) datas.push(this.params.data_inicial);
    const inicio = datas.sort().pop()!;
    
    const fimCandidatos: string[] = [];
    if (this.params.data_demissao) fimCandidatos.push(this.params.data_demissao);
    if (this.params.data_final) fimCandidatos.push(this.params.data_final);
    const fim = fimCandidatos.sort()[0] || new Date().toISOString().slice(0, 10);

    return { inicio, fim };
  }

  // =====================================================
  // GERAÇÃO DE COMPETÊNCIAS
  // =====================================================

  getCompetencias(inicio: string, fim: string): string[] {
    const comps: string[] = [];
    const start = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      comps.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return comps;
  }

  // =====================================================
  // CÁLCULO DE AVOS (13º e Férias) — com Limitar Avos
  // =====================================================
  
  calcularAvos(competencia: string, caracteristica: string): number {
    const admDate = new Date(this.params.data_admissao);
    const demDate = this.params.data_demissao 
      ? new Date(this.params.data_demissao)
      : new Date();
    const [ano, mes] = competencia.split('-').map(Number);
    
    if (caracteristica === '13_salario') {
      const inicioAno = new Date(ano, 0, 1);
      const fimAno = new Date(ano, 11, 31);
      let efetInicio = admDate > inicioAno ? admDate : inicioAno;
      let efetFim = demDate < fimAno ? demDate : fimAno;
      
      // Limitar avos ao período do cálculo quando ativado
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        if (periodoInicio > efetInicio) efetInicio = periodoInicio;
        if (periodoFim < efetFim) efetFim = periodoFim;
      }
      
      if (efetInicio > efetFim) return 0;
      let avos = 0;
      for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
        const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
        const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(ano, m + 1, 0).getDate();
        if (diaFim - diaInicio + 1 >= 15) avos++;
      }
      return avos;
    }
    if (caracteristica === 'ferias') {
      // Limitar avos de férias ao período do cálculo
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        let efetInicio = admDate > periodoInicio ? admDate : periodoInicio;
        let efetFim = demDate < periodoFim ? demDate : periodoFim;
        if (efetInicio > efetFim) return 0;
        let avos = 0;
        for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
          const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
          const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(efetFim.getFullYear(), m + 1, 0).getDate();
          if (diaFim - diaInicio + 1 >= 15) avos++;
        }
        return Math.min(avos, 12);
      }
      return 12;
    }
    return 1;
  }

  // =====================================================
  // CARGA HORÁRIA POR COMPETÊNCIA (com exceções)
  // =====================================================

  getCargaHorariaParaCompetencia(competencia: string): number {
    if (this.excecoesCargas.length === 0) return this.params.carga_horaria_padrao || 220;
    const compDate = new Date(competencia + '-01');
    for (const exc of this.excecoesCargas) {
      const inicio = new Date(exc.data_inicial);
      const fim = new Date(exc.data_final);
      if (compDate >= inicio && compDate <= fim) return Number(exc.carga_horaria);
    }
    return this.params.carga_horaria_padrao || 220;
  }

  // =====================================================
  // QUANTIDADE CALENDÁRIO (Dias Úteis / Repousos / Feriados)
  // =====================================================

  calcularQuantidadeCalendario(competencia: string, tipo: 'dias_uteis' | 'repousos' | 'feriados'): number {
    const [ano, mes] = competencia.split('-').map(Number);
    // Art. 64 CLT: mês comercial = 30 dias fixos
    const diasNoMes = this.params.tipo_mes === 'comercial' ? 30 : new Date(ano, mes, 0).getDate();
    
    // Contar feriados no mês para o estado/município do cálculo
    const feriadosNoMes = this.feriadosDB.filter(f => {
      const fd = new Date(f.data);
      if (fd.getFullYear() !== ano || fd.getMonth() + 1 !== mes) return false;
      if (f.tipo === 'nacional') return true;
      if (f.tipo === 'estadual' && this.params.considerar_feriado_estadual && f.uf === this.params.estado) return true;
      if (f.tipo === 'municipal' && this.params.considerar_feriado_municipal && f.municipio === this.params.municipio) return true;
      return false;
    });

    let diasUteis = 0;
    let repousos = 0;
    
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes - 1, d);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      const isSunday = dow === 0;
      const isSaturday = dow === 6;
      const isFeriado = feriadosNoMes.some(f => new Date(f.data).getDate() === d);
      
      if (isSunday || isFeriado) {
        repousos++;
      } else if (isSaturday && !this.params.sabado_dia_util) {
        repousos++;
      } else {
        diasUteis++;
      }
    }

    switch (tipo) {
      case 'dias_uteis': return diasUteis;
      case 'repousos': return repousos;
      case 'feriados': return feriadosNoMes.length;
    }
  }

  // Divisor com feriados integrados
  getDivisorComFeriados(competencia: string): number {
    return this.calcularQuantidadeCalendario(competencia, 'dias_uteis');
  }

  // =====================================================
  // PRAZO DO AVISO PRÉVIO (Lei 12.506/2011)
  // =====================================================

  calcularPrazoAviso(): number {
    if (this.params.prazo_aviso_previo === 'nao_apurar') return 30;
    if (this.params.prazo_aviso_previo === 'informado') return this.params.prazo_aviso_dias || 30;
    const adm = new Date(this.params.data_admissao);
    const dem = this.params.data_demissao ? new Date(this.params.data_demissao) : new Date();
    const anosServico = Math.floor((dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return Math.min(90, 30 + (anosServico * 3));
  }

  // =====================================================
  // CARTÃO DE PONTO - RESOLUÇÃO DE QUANTIDADE
  // =====================================================

  getCartaoPontoQuantidade(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 0;
    if (!colunas || colunas.length === 0) {
      return (reg.horas_extras_50 || 0) + (reg.horas_extras_100 || 0);
    }
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total;
  }

  getCartaoPontoDivisor(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 30;
    if (!colunas || colunas.length === 0) return reg.dias_uteis || 22;
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total || 30;
  }

  // =====================================================
  // QUANTIDADE MÉDIA APURADA (from cartão de ponto)
  // =====================================================

  calcularQuantidadeMediaApurada(verba: PjeVerba): number {
    if (this.cartaoPonto.length === 0) return verba.quantidade_informada || 0;
    const colunas = verba.quantidade_cartao_colunas;
    let soma = 0;
    let count = 0;
    for (const reg of this.cartaoPonto) {
      const val = this.getCartaoPontoQuantidade(reg.competencia, colunas);
      if (val > 0) { soma += val; count++; }
    }
    return count > 0 ? soma / count : verba.quantidade_informada || 0;
  }

  // =====================================================
  // FÓRMULA OFICIAL DE CÁLCULO DE VERBA
  // Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
  // =====================================================

  calcularOcorrencia(
    verba: PjeVerba,
    competencia: string,
    valorBase: number,
  ): PjeOcorrenciaResult {
    const base = new Decimal(valorBase);
    const mult = new Decimal(verba.multiplicador);
    
    // Divisor resolution (uses carga horária por competência with exceções + feriados)
    let div: Decimal;
    if (verba.tipo_divisor === 'cartao_ponto') {
      div = new Decimal(this.getCartaoPontoDivisor(competencia, verba.divisor_cartao_colunas) || 30);
    } else if (verba.tipo_divisor === 'carga_horaria') {
      div = new Decimal(this.getCargaHorariaParaCompetencia(competencia));
    } else if (verba.tipo_divisor === 'dias_uteis') {
      div = new Decimal(this.getDivisorComFeriados(competencia));
    } else if (verba.tipo_divisor === 'calendario') {
      div = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis') || 22);
    } else {
      div = new Decimal(verba.divisor_informado || 30);
    }

    // Quantidade resolution (with calendario + apurada support)
    let qtd: Decimal;
    if (verba.tipo_quantidade === 'cartao_ponto') {
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    } else if (verba.tipo_quantidade === 'calendario') {
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis'));
    } else if (verba.tipo_quantidade === 'apurada') {
      // Média apurada: usa a média da quantidade de todas as competências do cartão de ponto
      qtd = new Decimal(this.calcularQuantidadeMediaApurada(verba));
    } else {
      qtd = new Decimal(verba.quantidade_informada || 1);
    }

    const dobra = new Decimal(verba.dobrar_valor_devido ? 2 : 1);

    // Aviso prévio quantity
    if (verba.caracteristica === 'aviso_previo') {
      qtd = new Decimal(this.calcularPrazoAviso());
    }

    // Proporcionalizar QUANTIDADE em meses incompletos com modo de fração
    if (verba.quantidade_proporcionalizar) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        const fracaoModo = verba.fracao_mes_modo || 'manter_fracao';
        switch (fracaoModo) {
          case 'integralizar':
            // Integraliza: mês incompleto conta como mês completo (qtd não muda)
            break;
          case 'desprezar':
            // Desprezar: mês incompleto = 0
            qtd = new Decimal(0);
            break;
          case 'desprezar_menor_15':
            // Desprezar se < 15 dias, integralizar se >= 15
            if (diasTrabalhados < 15) {
              qtd = new Decimal(0);
            }
            // else: keep full qtd (integraliza)
            break;
          case 'manter_fracao':
          default:
            // Manter fração proporcional
            qtd = qtd.times(diasTrabalhados).div(diasNoMes);
            break;
        }
      }
    }

    // Fórmula oficial PJe-Calc (com truncamento por etapa — Método PJe-Calc)
    // Cada operação intermediária é truncada a 2 casas antes da próxima.
    // Isso garante paridade de centavos com o PJe-Calc oficial.
    let devido: Decimal;
    if (verba.valor === 'informado') {
      devido = new Decimal(verba.valor_informado_devido || 0);
    } else {
      // Etapa 1: valor_hora = Base / Divisor (truncado)
      const valorHora = base.div(div).toDP(2);
      // Etapa 2: valor_hora_com_mult = valor_hora × Multiplicador (truncado)
      const valorHoraComMult = valorHora.times(mult).toDP(2);
      // Etapa 3: subtotal = valor_hora_com_mult × Quantidade (truncado)
      const subtotal = valorHoraComMult.times(qtd).toDP(2);
      // Etapa 4: devido = subtotal × Dobra (truncado)
      devido = subtotal.times(dobra).toDP(2);
    }

    // Proporcionalizar DEVIDO separadamente (Fase 6 - PJe-Calc)
    if (verba.proporcionalizar_devido) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        devido = devido.times(diasTrabalhados).div(diasNoMes);
      }
    }

    if (verba.zerar_valor_negativo && devido.isNegative()) {
      devido = new Decimal(0);
    }

    // Valor Pago: informado ou calculado (Fase 2)
    // FIX #3: Truncamento por etapa no cálculo do Pago (paridade PJe-Calc)
    let pago: Decimal;
    if (verba.valor_pago_tipo === 'calculado' && verba.pago_base !== undefined) {
      const pagoBase = new Decimal(verba.pago_base || 0);
      const pagoDiv = new Decimal(verba.pago_divisor || 30);
      const pagoMult = new Decimal(verba.pago_multiplicador || 1);
      const pagoQtd = new Decimal(verba.pago_quantidade || 1);
      // Etapa 1: Base / Divisor (truncado)
      const pagoValorHora = pagoBase.div(pagoDiv).toDP(2);
      // Etapa 2: × Multiplicador (truncado)
      const pagoComMult = pagoValorHora.times(pagoMult).toDP(2);
      // Etapa 3: × Quantidade (truncado)
      pago = pagoComMult.times(pagoQtd).toDP(2);
    } else {
      pago = new Decimal(verba.valor_informado_pago || 0);
    }

    // Proporcionalizar PAGO separadamente (Fase 6 - PJe-Calc)
    if (verba.proporcionalizar_pago && pago.greaterThan(0)) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        pago = pago.times(diasTrabalhados).div(diasNoMes);
      }
    }

    const diferenca = devido.minus(pago);

    // Build formula string with rounding trace
    let formula: string;
    let arredondamento_trace: { etapa: string; valor_cheio: string; valor_truncado: string }[] | undefined;
    if (verba.valor === 'calculado') {
      const valorHoraTrace = base.div(div);
      const valorHoraComMultTrace = base.div(div).toDP(2).times(mult);
      const subtotalTrace = base.div(div).toDP(2).times(mult).toDP(2).times(qtd);
      arredondamento_trace = [
        { etapa: 'Base / Divisor', valor_cheio: valorHoraTrace.toFixed(6), valor_truncado: valorHoraTrace.toDP(2).toFixed(2) },
        { etapa: '× Multiplicador', valor_cheio: valorHoraComMultTrace.toFixed(6), valor_truncado: valorHoraComMultTrace.toDP(2).toFixed(2) },
        { etapa: '× Quantidade', valor_cheio: subtotalTrace.toFixed(6), valor_truncado: subtotalTrace.toDP(2).toFixed(2) },
        { etapa: '× Dobra', valor_cheio: subtotalTrace.toDP(2).times(dobra).toFixed(6), valor_truncado: devido.toFixed(2) },
      ];
      formula = `(${base.toFixed(2)} ÷ ${div.toFixed(2)} = ${valorHoraTrace.toDP(2).toFixed(2)}) × ${mult.toFixed(4)} = ${valorHoraComMultTrace.toDP(2).toFixed(2)} × ${qtd.toFixed(4)} × ${dobra.toFixed(0)} = ${devido.toFixed(2)}`;
    } else {
      formula = `Valor Informado: ${devido.toFixed(2)}`;
    }

    // Compute integral values (full-month) for integralization in reflexos
    let baseIntegral: number | undefined;
    let qtdIntegral: number | undefined;
    let devidoIntegral: number | undefined;
    if (verba.quantidade_proporcionalizar) {
      const [anoI, mesI] = competencia.split('-').map(Number);
      const diasNoMesI = new Date(anoI, mesI, 0).getDate();
      const admDateI = new Date(this.params.data_admissao);
      const demDateI = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicioI = 1, diaFimI = diasNoMesI;
      if (admDateI.getFullYear() === anoI && admDateI.getMonth() + 1 === mesI) diaInicioI = admDateI.getDate();
      if (demDateI && demDateI.getFullYear() === anoI && demDateI.getMonth() + 1 === mesI) diaFimI = demDateI.getDate();
      const diasTrabI = diaFimI - diaInicioI + 1;
      if (diasTrabI < diasNoMesI) {
        // This is a fractional month — compute integral (full-month) values
        const frac = new Decimal(diasTrabI).div(diasNoMesI);
        if (frac.greaterThan(0)) {
          baseIntegral = base.toDP(2).toNumber();
          qtdIntegral = qtd.div(frac).toDP(4).toNumber();
          devidoIntegral = devido.div(frac).toDP(2).toNumber();
        }
      }
    }

    return {
      competencia,
      base: base.toDP(2).toNumber(),
      divisor: div.toDP(2).toNumber(),
      multiplicador: mult.toDP(8).toNumber(),
      quantidade: qtd.toDP(4).toNumber(),
      dobra: dobra.toNumber(),
      devido: devido.toDP(2).toNumber(),
      pago: pago.toDP(2).toNumber(),
      diferenca: diferenca.toDP(2).toNumber(),
      indice_correcao: 1,
      valor_corrigido: diferenca.toDP(2).toNumber(),
      juros: 0,
      valor_final: diferenca.toDP(2).toNumber(),
      formula,
      arredondamento_trace,
      base_integral: baseIntegral,
      quantidade_integral: qtdIntegral,
      devido_integral: devidoIntegral,
    };
  }

  // =====================================================
  // OBTER BASE PARA UMA COMPETÊNCIA
  // =====================================================

  getBaseParaCompetencia(verba: PjeVerba, competencia: string): number {
    let base = 0;

    // Bases do histórico salarial
    if (verba.base_calculo.historicos.length > 0) {
      for (const histId of verba.base_calculo.historicos) {
        const hist = this.historicos.find(h => h.id === histId);
        if (!hist) continue;
        const oc = hist.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.valor;
      }
    }

    // Se não tem histórico específico, buscar qualquer histórico que cubra a competência
    if (base === 0 && verba.base_calculo.historicos.length === 0) {
      for (const hist of this.historicos) {
        const compDate = new Date(competencia + '-01');
        const hInicio = new Date(hist.periodo_inicio);
        const hFim = new Date(hist.periodo_fim);
        if (compDate >= hInicio && compDate <= hFim) {
          const oc = hist.ocorrencias.find(o => o.competencia === competencia);
          if (oc) {
            base += oc.valor;
          } else if (hist.valor_informado) {
            base += hist.valor_informado;
          }
        }
      }
    }

    // Fallback: usar maior/última remuneração
    if (base === 0) {
      if (verba.base_calculo.tabelas.includes('maior_remuneracao') && this.params.maior_remuneracao) {
        base = this.params.maior_remuneracao;
      } else if (verba.base_calculo.tabelas.includes('ultima_remuneracao') && this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      } else if (this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      }
    }

    // Somar bases de verbas principais já calculadas (para reflexas)
    for (const verbaBaseId of verba.base_calculo.verbas) {
      const vbResult = this.verbaResultsMap.get(verbaBaseId);
      if (vbResult) {
        const oc = vbResult.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.diferenca;
      }
    }

    return base;
  }

  // =====================================================
  // EXCLUSÃO DE FALTAS E FÉRIAS (Fase 1 - CLT Art. 130)
  // =====================================================

  private getDiasExcluidosCompetencia(competencia: string, exclusoes: PjeVerba['exclusoes']): number {
    const [ano, mes] = competencia.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);
    let diasExcluidos = 0;

    // Faltas
    for (const falta of this.faltas) {
      if (falta.justificada && !exclusoes.faltas_justificadas) continue;
      if (!falta.justificada && !exclusoes.faltas_nao_justificadas) continue;
      
      const inicioFalta = new Date(falta.data_inicial);
      const fimFalta = new Date(falta.data_final);
      const overlapInicio = inicioFalta > inicioMes ? inicioFalta : inicioMes;
      const overlapFim = fimFalta < fimMes ? fimFalta : fimMes;
      if (overlapInicio <= overlapFim) {
        diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
      }
    }

    // Férias gozadas
    if (exclusoes.ferias_gozadas) {
      for (const fer of this.ferias) {
        if (fer.situacao !== 'gozadas' && fer.situacao !== 'gozadas_parcialmente') continue;
        const periodos = fer.periodos_gozo?.length 
          ? fer.periodos_gozo 
          : [{ inicio: fer.periodo_concessivo_inicio, fim: fer.periodo_concessivo_fim }];
        for (const p of periodos) {
          const inicioGozo = new Date(p.inicio);
          const fimGozo = new Date(p.fim);
          const overlapInicio = inicioGozo > inicioMes ? inicioGozo : inicioMes;
          const overlapFim = fimGozo < fimMes ? fimGozo : fimMes;
          if (overlapInicio <= overlapFim) {
            diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
          }
        }
      }
    }

    return diasExcluidos;
  }

  // =====================================================
  // HELPERS: TABELAS VERSIONADAS POR COMPETÊNCIA
  // =====================================================

  private getFaixasINSSParaCompetencia(competencia: string): { ate: number; aliquota: number }[] {
    if (this.faixasINSSDB.length === 0) return DEFAULT_FAIXAS_INSS;

    const compDate = new Date(competencia + '-01');
    // Buscar faixas cuja vigência cobre a competência
    const faixas = this.faixasINSSDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota) }));

    return faixas.length > 0 ? faixas : DEFAULT_FAIXAS_INSS;
  }

  private getFaixasIRParaCompetencia(competencia: string): { faixas: { ate: number; aliquota: number; deducao: number }[]; deducao_dependente: number } {
    if (this.faixasIRDB.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    const compDate = new Date(competencia + '-01');
    const faixas = this.faixasIRDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota), deducao: Number(f.deducao) }));

    if (faixas.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    // Usar deducao_dependente da primeira faixa encontrada
    const matchedRow = this.faixasIRDB.find(f => {
      const inicio = new Date(f.competencia_inicio);
      const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
      return compDate >= inicio && compDate <= fim;
    });
    const deducao_dependente = matchedRow ? Number(matchedRow.deducao_dependente) : DEFAULT_DEDUCAO_DEPENDENTE;

    return { faixas, deducao_dependente };
  }

  // =====================================================
  // HELPER: ÍNDICE DE CORREÇÃO DO BANCO
  // Retorna fator acumulado entre competência e liquidação
  // =====================================================

  private getIndiceCorrecaoDB(nomeIndice: string, compOrigem: string, compDestino: string): number | null {
    if (this.indicesDB.length === 0) return null;

    // Filtrar por índice
    const indices = this.indicesDB
      .filter(i => i.indice === nomeIndice)
      .sort((a, b) => (a.competencia || '').localeCompare(b.competencia || ''));

    if (indices.length === 0) return null;

    // Súmula 381 TST: correção acumula a partir do mês SUBSEQUENTE ao vencimento
    // So if compOrigem is "2016-05", we lookup from "2016-06"
    const origemSubsequente = this.mesSubsequente(compOrigem);

    // Buscar acumulado na competência de origem (subsequente) 
    const idxOrigem = indices.find(i => i.competencia.slice(0, 7) >= origemSubsequente) 
      || indices[0];
    const idxDestinoArr = indices.filter(i => i.competencia.slice(0, 7) <= compDestino);
    const idxDestino = idxDestinoArr.length > 0 ? idxDestinoArr[idxDestinoArr.length - 1] : indices[indices.length - 1];

    if (!idxOrigem || !idxDestino || !idxOrigem.acumulado || !idxDestino.acumulado) return null;
    if (Number(idxOrigem.acumulado) === 0) return null;

    return Number(idxDestino.acumulado) / Number(idxOrigem.acumulado);
  }

  /** Returns YYYY-MM for the month after the given competência */
  private mesSubsequente(comp: string): string {
    const [ano, mes] = comp.split('-').map(Number);
    if (mes === 12) return `${ano + 1}-01`;
    return `${ano}-${String(mes + 1).padStart(2, '0')}`;
  }

  // =====================================================
  // CALCULAR VERBA COMPLETA (com exclusões de faltas/férias)
  // =====================================================

  calcularVerba(verba: PjeVerba): PjeVerbaResult {
    const periodo = { inicio: verba.periodo_inicio, fim: verba.periodo_fim };
    let competencias: string[];

    switch (verba.ocorrencia_pagamento) {
      case 'mensal':
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
        break;
      case 'dezembro': {
        const todas = this.getCompetencias(periodo.inicio, periodo.fim);
        competencias = todas.filter(c => c.endsWith('-12'));
        const lastComp = todas[todas.length - 1];
        if (lastComp && !lastComp.endsWith('-12') && !competencias.includes(lastComp)) {
          competencias.push(lastComp);
        }
        break;
      }
      case 'desligamento':
        competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        break;
      case 'periodo_aquisitivo':
        competencias = this.ferias.map(f => f.periodo_aquisitivo_fim.slice(0, 7));
        if (competencias.length === 0) {
          competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        }
        break;
      default:
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
    }

    const ocorrencias: PjeOcorrenciaResult[] = [];
    // FIX #4: Acumular totais com Decimal.js para evitar drift de ponto flutuante
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    for (const comp of competencias) {
      // ── Aplicar exclusões de faltas e férias (CLT Art. 130) ──
      const [anoC, mesC] = comp.split('-').map(Number);
      const diasNoMes = new Date(anoC, mesC, 0).getDate();
      const diasExcluidos = this.getDiasExcluidosCompetencia(comp, verba.exclusoes);
      
      if (diasExcluidos >= diasNoMes) continue; // Mês totalmente excluído
      
      let base = this.getBaseParaCompetencia(verba, comp);
      
      // Reduzir base proporcionalmente aos dias excluídos
      if (diasExcluidos > 0 && base > 0) {
        const fator = (diasNoMes - diasExcluidos) / diasNoMes;
        base = Number(new Decimal(base).times(fator).toDP(2));
      }

      const oc = this.calcularOcorrencia(verba, comp, base);
      ocorrencias.push(oc);
      totalDevido = totalDevido.plus(oc.devido);
      totalPago = totalPago.plus(oc.pago);
      totalDiferenca = totalDiferenca.plus(oc.diferenca);
    }

    return {
      verba_id: verba.id,
      nome: verba.nome,
      tipo: verba.tipo,
      caracteristica: verba.caracteristica,
      ocorrencias,
      total_devido: totalDevido.toDP(2).toNumber(),
      total_pago: totalPago.toDP(2).toNumber(),
      total_diferenca: totalDiferenca.toDP(2).toNumber(),
      total_corrigido: totalDiferenca.toDP(2).toNumber(),
      total_juros: 0,
      total_final: totalDiferenca.toDP(2).toNumber(),
    };
  }

  // =====================================================
  // CORREÇÃO MONETÁRIA + JUROS DE MORA
  // ADC 58/59 STF: IPCA-E pré-judicial + SELIC pós-citação
  // Com séries históricas reais do banco
  // =====================================================

  aplicarCorrecaoJuros(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.juros_tipo === 'nenhum' && this.correcaoConfig.indice === 'nenhum') return;

    // ═══ COMBINATION-BY-DATE MODE (3-phase correction like PJe-Calc) ═══
    if (this.correcaoConfig.combinacoes_indice?.length) {
      this.aplicarCorrecaoCombinacao(verbaResults);
      return;
    }

    // ═══ LEGACY MODE (single index + simple interest) ═══
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const dataAjuiz = this.params.data_ajuizamento ? new Date(this.params.data_ajuizamento) : null;
    const dataCitacao = this.params.data_citacao 
      ? new Date(this.params.data_citacao) 
      : dataAjuiz ? new Date(dataAjuiz.getTime() + 60 * 24 * 60 * 60 * 1000) : null;

    const usarADC5859 = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        const [ano, mes] = oc.competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 1);
        
        let indiceCorrecao = 1;
        let juros = 0;

        if (usarADC5859 && dataCitacao) {
          if (dataComp >= dataCitacao) {
            const fatorDB = this.getIndiceCorrecaoDB('SELIC', oc.competencia, compLiq);
            if (fatorDB !== null) {
              indiceCorrecao = fatorDB;
            } else {
              // FIX #1: Sem fallback — bloquear cálculo se índices ausentes
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice SELIC ausente para ${oc.competencia}→${compLiq}. Usando fator=1 (sem correção).`);
              indiceCorrecao = 1;
            }
          } else {
            const compCitacao = dataCitacao.toISOString().slice(0, 7);
            const fatorIPCA = this.getIndiceCorrecaoDB('IPCA-E', oc.competencia, compCitacao);
            let fator1: number;
            if (fatorIPCA !== null) { fator1 = fatorIPCA; } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice IPCA-E ausente para ${oc.competencia}→${compCitacao}. Usando fator=1.`);
              fator1 = 1;
            }
            const fatorSELIC = this.getIndiceCorrecaoDB('SELIC', compCitacao, compLiq);
            let fator2: number;
            if (fatorSELIC !== null) { fator2 = fatorSELIC; } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice SELIC ausente para ${compCitacao}→${compLiq}. Usando fator=1.`);
              fator2 = 1;
            }
            indiceCorrecao = fator1 * fator2;

            if (this.correcaoConfig.indice !== 'SELIC' && dataAjuiz && dataCitacao > dataAjuiz) {
              const mesesJurosPreCitacao = this.mesesEntre(dataAjuiz, dataCitacao);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              const valorCorrigidoParc = Number(new Decimal(oc.diferenca).times(fator1).toDP(2));
              juros = Number(new Decimal(valorCorrigidoParc).times(taxaMensal).times(mesesJurosPreCitacao).toDP(2));
            }
          }
        } else {
          const mesesCorrecao = this.mesesEntre(dataComp, dataLiq);
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            // FIX #1: Sem fallback — bloquear cálculo se índices ausentes
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq}. Usando fator=1.`);
            indiceCorrecao = 1;
          }

          if (this.correcaoConfig.indice !== 'SELIC') {
            const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
            if (this.correcaoConfig.juros_tipo === 'simples_mensal') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              juros = Number(new Decimal(valorCorrigido).times(taxaMensal).times(mesesJuros).toDP(2));
            } else if ((this.correcaoConfig.juros_tipo as string) === 'composto') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              const fatorComposto = Math.pow(1 + taxaMensal, mesesJuros);
              juros = Number(new Decimal(valorCorrigido).times(fatorComposto - 1).toDP(2));
            } else if (this.correcaoConfig.juros_tipo === 'selic') {
              // FIX #2: SELIC como índice de correção já inclui juros — não aplicar juros separados
              // Juros SELIC separados só se aplica quando o índice de correção NÃO é SELIC
              juros = 0;
            }
          }
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
        oc.indice_correcao = Number(new Decimal(indiceCorrecao).toDP(6));
        oc.valor_corrigido = valorCorrigido;
        oc.juros = juros;
        oc.valor_final = Number(new Decimal(valorCorrigido + juros).toDP(2));
        totalCorrigido = totalCorrigido.plus(valorCorrigido);
        totalJuros = totalJuros.plus(juros);
        totalFinal = totalFinal.plus(valorCorrigido + juros);
      }

      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = totalJuros.toDP(2).toNumber();
      vr.total_final = totalFinal.toDP(2).toNumber();
    }
  }

  // =====================================================
  // CORREÇÃO POR COMBINAÇÃO DE DATAS (3-phase PJe-Calc)
  // Uses correction-by-date engine for precise multi-regime
  // =====================================================

  private aplicarCorrecaoCombinacao(verbaResults: PjeVerbaResult[]): void {
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice!;
    const combinacoes_juros = this.correcaoConfig.combinacoes_juros || [];
    const dataLiq = this.correcaoConfig.data_liquidacao;

    // Map IPCA-E → IPCAE for index lookup compatibility
    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR', 'INPC': 'INPC', 'IGP-M': 'IGP-M' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        // Súmula 381: correction starts from mês subsequente ao vencimento
        // Interest starts from vencimento (competência original)
        const compDateJuros = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
        const compDateCorrecao = this.mesSubsequente(oc.competencia) + '-01';
        
        // Build breakpoints using correction start date
        const breakpoints = new Set<string>();
        breakpoints.add(compDateCorrecao);
        breakpoints.add(dataLiq);
        for (const ci of combinacoes_indice) {
          if (ci.de && ci.de > compDateCorrecao && ci.de <= dataLiq) breakpoints.add(ci.de);
        }
        for (const cj of combinacoes_juros) {
          if (cj.de && cj.de > compDateCorrecao && cj.de <= dataLiq) breakpoints.add(cj.de);
        }
        const datas = Array.from(breakpoints).sort();

        // Calculate correction factor segment-by-segment
        let fatorTotal = new Decimal(1);
        const regimesUsados: string[] = [];

        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(combinacoes_indice, segInicio);
          const indice = normalizeIndice(regime?.indice || 'SEM_CORRECAO');

          if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') {
            regimesUsados.push(`${indice}(${segInicio}→${segFim})`);
            continue;
          }

          const fatorDB = this.getIndiceCorrecaoDB(indice, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            // FIX #1: Sem fallback — bloquear correção se índices ausentes
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indice} ausente para ${segInicio}→${segFim}. Usando fator=1.`);
            // Fator permanece inalterado (1)
          }
          regimesUsados.push(`${indice}(${segInicio}→${segFim})`);
        }

        const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);

        // Calculate interest segment-by-segment
        let jurosTotal = new Decimal(0);

        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regimeIndice = this.getRegimeParaData(combinacoes_indice, segInicio);
          const indiceNorm = normalizeIndice(regimeIndice?.indice || 'SEM_CORRECAO');
          const regimeJuros = this.getRegimeParaData(combinacoes_juros, segInicio);

          // SELIC as correction index already includes interest
          if (indiceNorm === 'SELIC') continue;
          if (!regimeJuros || regimeJuros.tipo === 'NENHUM') continue;

          if (regimeJuros.tipo === 'SELIC') {
            const fatorSelic = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
            if (fatorSelic !== null) {
              jurosTotal = jurosTotal.plus(valorCorrigido.times(fatorSelic - 1));
            } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: SELIC (juros) ausente para ${segInicio}→${segFim}.`);
            }
          } else if (regimeJuros.tipo === 'TAXA_LEGAL') {
            const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
            if (fatorTL !== null) {
              jurosTotal = jurosTotal.plus(valorCorrigido.times(fatorTL - 1));
            } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: TAXA_LEGAL (juros) ausente para ${segInicio}→${segFim}.`);
            }
          } else {
            // TRD_SIMPLES or other simple monthly interest
            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            const taxa = (regimeJuros.percentual || 1) / 100;
            jurosTotal = jurosTotal.plus(valorCorrigido.times(taxa).times(meses));
          }
        }

        const valorFinal = valorCorrigido.plus(jurosTotal);

        oc.indice_correcao = fatorTotal.toDP(6).toNumber();
        oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
        oc.juros = jurosTotal.toDP(2).toNumber();
        oc.valor_final = valorFinal.toDP(2).toNumber();

        // FIX #4: Acumular com Decimal.js
        totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
        totalJuros = totalJuros.plus(oc.juros);
        totalFinal = totalFinal.plus(oc.valor_final);
      }

      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = totalJuros.toDP(2).toNumber();
      vr.total_final = totalFinal.toDP(2).toNumber();
    }
  }

  private getRegimeParaData<T extends { de?: string; ate?: string }>(combinacoes: T[], data: string): T | null {
    const sorted = [...combinacoes].sort((a, b) => {
      const aDate = a.de || '0000-01-01';
      const bDate = b.de || '0000-01-01';
      return bDate.localeCompare(aDate);
    });
    for (const c of sorted) {
      const cDe = c.de || '0000-01-01';
      const cAte = c.ate || '9999-12-31';
      if (data >= cDe && data <= cAte) return c;
    }
    for (const c of sorted) {
      if ((c.de || '0000-01-01') <= data) return c;
    }
    return combinacoes[0] || null;
  }

  private mesesEntre(d1: Date, d2: Date): number {
    return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  }

  // =====================================================
  // CALCULAR FGTS
  // =====================================================

  calcularFGTS(verbaResults: PjeVerbaResult[]): PjeFGTSResult {
    if (!this.fgtsConfig.apurar) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }

    const depositos: PjeFGTSResult['depositos'] = [];
    
    // Prescrição FGTS diferenciada
    let dataPrescricaoFGTS: Date | null = null;
    if (this.params.prescricao_fgts && this.params.data_ajuizamento) {
      const ajuiz = new Date(this.params.data_ajuizamento);
      dataPrescricaoFGTS = new Date(ajuiz.getFullYear() - 5, ajuiz.getMonth(), ajuiz.getDate());
    }
    
    const basesPorComp: Record<string, number> = {};
    const bases13PorComp: Record<string, number> = {};
    
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.fgts) continue;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        const target = verba.caracteristica === '13_salario' ? bases13PorComp : basesPorComp;
        target[oc.competencia] = (target[oc.competencia] || 0) + oc.diferenca;
      }
    }

    for (const hist of this.historicos) {
      if (!hist.incidencia_fgts || hist.fgts_recolhido) continue;
      for (const oc of hist.ocorrencias) {
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.valor;
      }
    }

    for (const [comp, base] of Object.entries(basesPorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp, base, aliquota: 0.08, valor });
    }
    for (const [comp, base] of Object.entries(bases13PorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp + '-13', base, aliquota: 0.08, valor });
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // ── Apply correction + interest to FGTS deposits (PJe-Calc corrects FGTS) ──
    let totalDepositosCorrigido = 0;
    let totalDepositosJuros = 0;
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    
    for (const dep of depositos) {
      const compClean = dep.competencia.replace('-13', '');
      let fatorCorrecao = 1;
      let jurosValor = 0;
      
      // Use combination-by-date if available
      if (this.correcaoConfig.combinacoes_indice?.length) {
        // Súmula 381: FGTS correction also starts from mês subsequente
        const compDateFgts = this.mesSubsequente(compClean) + '-01';
        const breakpoints = new Set<string>();
        breakpoints.add(compDateFgts);
        breakpoints.add(this.correcaoConfig.data_liquidacao);
        for (const ci of this.correcaoConfig.combinacoes_indice) {
          if (ci.de && ci.de > compDateFgts && ci.de <= this.correcaoConfig.data_liquidacao) breakpoints.add(ci.de);
        }
        const datas = Array.from(breakpoints).sort();
        let fatorTotal = new Decimal(1);
        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(this.correcaoConfig.combinacoes_indice, segInicio);
          const indice = regime?.indice || 'SEM_CORRECAO';
          if (indice === 'SEM_CORRECAO' || indice === 'Sem Correção' || indice === 'NENHUM') continue;
          const normalMap: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
          const indiceNorm = normalMap[indice] || indice;
          const fatorDB = this.getIndiceCorrecaoDB(indiceNorm, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indiceNorm} ausente para FGTS ${segInicio}→${segFim}. Usando fator=1.`);
          }
        }
        fatorCorrecao = fatorTotal.toDP(6).toNumber();
        
        // Interest for FGTS
        if (this.correcaoConfig.combinacoes_juros?.length) {
          const valorCorrigido = new Decimal(dep.valor).times(fatorCorrecao);
          let jurosAcc = new Decimal(0);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regimeJ = this.getRegimeParaData(this.correcaoConfig.combinacoes_juros, segInicio);
            if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;
            const regimeI = this.getRegimeParaData(this.correcaoConfig.combinacoes_indice!, segInicio);
            const indiceI = regimeI?.indice || '';
            if (indiceI === 'SELIC') continue; // SELIC already includes interest
            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              const fatorS = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorS !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorS - 1));
              else { console.warn(`[PjeCalcEngine] BLOQUEIO: SELIC (juros FGTS) ausente para ${segInicio}→${segFim}.`); }
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorTL - 1));
              else { console.warn(`[PjeCalcEngine] BLOQUEIO: TAXA_LEGAL (juros FGTS) ausente para ${segInicio}→${segFim}.`); }
            } else {
              const taxa = ((regimeJ as any).percentual || 1) / 100;
              jurosAcc = jurosAcc.plus(valorCorrigido.times(taxa).times(meses));
            }
          }
          jurosValor = jurosAcc.toDP(2).toNumber();
        }
      } else {
        // Legacy single-index correction for FGTS
        const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, compClean, compLiq);
        if (fatorDB !== null) fatorCorrecao = fatorDB;
        else {
          console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para FGTS ${compClean}→${compLiq}. Usando fator=1.`);
          fatorCorrecao = 1;
        }
      }
      
      const depCorrigido = Number(new Decimal(dep.valor).times(fatorCorrecao).toDP(2));
      totalDepositosCorrigido += depCorrigido;
      totalDepositosJuros += jurosValor;
    }

    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado || 0;
      } else {
        let baseMulita = totalDepositosCorrigido; // Use corrected value as base for fine
        multaValor = Number(new Decimal(baseMulita).times(this.fgtsConfig.multa_percentual / 100).toDP(2));
      }
    }

    const lc110_10 = this.fgtsConfig.lc110_10 ? Number(new Decimal(totalDepositos).times(0.10).toDP(2)) : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? Number(new Decimal(totalDepositos).times(0.005).toDP(2)) : 0;

    const saldoDeduzido = this.fgtsConfig.deduzir_saldo 
      ? this.fgtsConfig.saldos_saques.reduce((s, v) => s + v.valor, 0) : 0;

    // Total FGTS = corrected deposits + interest + fine - deductions
    const totalFgts = totalDepositosCorrigido + totalDepositosJuros + multaValor + lc110_10 + lc110_05 - saldoDeduzido;

    return {
      depositos,
      total_depositos: Number(new Decimal(totalDepositosCorrigido + totalDepositosJuros).toDP(2)),
      multa_valor: multaValor,
      lc110_10,
      lc110_05,
      saldo_deduzido: Number(new Decimal(saldoDeduzido).toDP(2)),
      total_fgts: Number(new Decimal(totalFgts).toDP(2)),
    };
  }

  // =====================================================
  // CALCULAR CONTRIBUIÇÃO SOCIAL (Tabelas Versionadas por Competência)
  // =====================================================

  calcularCS(verbaResults: PjeVerbaResult[], useCorrigido: boolean = false): PjeCSResult {
    const segurado_devidos: PjeCSResult['segurado_devidos'] = [];
    const segurado_pagos: PjeCSResult['segurado_pagos'] = [];
    const empregador: PjeCSResult['empregador'] = [];

    if (!this.csConfig.apurar_segurado && !this.csConfig.apurar_empresa) {
      return { segurado_devidos: [], segurado_pagos: [], empregador, total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 };
    }

    // ═══ Track 1: CS sobre salários DEVIDOS ═══
    // When useCorrigido=true (juros_apos_deducao_cs flow), CS is on corrected values
    const basesDevidos: Record<string, number> = {};
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.contribuicao_social) continue;
      if (verba.caracteristica === 'ferias') continue;
      for (const oc of vr.ocorrencias) {
        const val = useCorrigido ? oc.valor_corrigido : oc.diferenca;
        if (val <= 0) continue;
        basesDevidos[oc.competencia] = (basesDevidos[oc.competencia] || 0) + val;
      }
    }

    // ═══ Track 2: CS sobre salários PAGOS (histórico não recolhido) ═══
    const basesPagos: Record<string, number> = {};
    if (this.csConfig.cs_sobre_salarios_pagos) {
      for (const hist of this.historicos) {
        if (!hist.incidencia_cs || hist.cs_recolhida) continue;
        for (const oc of hist.ocorrencias) {
          basesPagos[oc.competencia] = (basesPagos[oc.competencia] || 0) + oc.valor;
        }
      }
    }

    // Apurar segurado sobre DEVIDOS
    if (this.csConfig.apurar_segurado) {
      for (const [comp, base] of Object.entries(basesDevidos)) {
        const imposto = this.calcularINSSProgressivo(comp, base);
        segurado_devidos.push({
          competencia: comp, base,
          aliquota: base > 0 ? imposto / base : 0,
          valor: Number(new Decimal(imposto).toDP(2)),
          recolhido: 0,
          diferenca: Number(new Decimal(imposto).toDP(2)),
        });
      }

      // Apurar segurado sobre PAGOS (track separado)
      for (const [comp, base] of Object.entries(basesPagos)) {
        const imposto = this.calcularINSSProgressivo(comp, base);
        segurado_pagos.push({
          competencia: comp, base,
          aliquota: base > 0 ? imposto / base : 0,
          valor: Number(new Decimal(imposto).toDP(2)),
          recolhido: 0,
          diferenca: Number(new Decimal(imposto).toDP(2)),
        });
      }
    }

    // Empregador (sobre devidos + pagos combinados)
    const basesEmpregador: Record<string, number> = { ...basesDevidos };
    for (const [comp, val] of Object.entries(basesPagos)) {
      basesEmpregador[comp] = (basesEmpregador[comp] || 0) + val;
    }

    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesEmpregador)) {
        if (base <= 0) continue;
        const compDate = new Date(comp + '-01');
        const isSimples = this.csConfig.periodos_simples?.some(p => {
          const pInicio = new Date(p.inicio);
          const pFim = new Date(p.fim);
          return compDate >= pInicio && compDate <= pFim;
        }) || false;
        
        if (isSimples) {
          empregador.push({ competencia: comp, empresa: 0, sat: 0, terceiros: 0 });
        } else {
          const aliqEmp = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
          const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
          const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
          empregador.push({
            competencia: comp,
            empresa: this.csConfig.apurar_empresa ? Number(new Decimal(base).times(aliqEmp).toDP(2)) : 0,
            sat: this.csConfig.apurar_sat ? Number(new Decimal(base).times(aliqSat).toDP(2)) : 0,
            terceiros: this.csConfig.apurar_terceiros ? Number(new Decimal(base).times(aliqTerc).toDP(2)) : 0,
          });
        }
      }
    }

    const totalDevidos = segurado_devidos.reduce((s, x) => s + x.diferenca, 0);
    const totalPagos = segurado_pagos.reduce((s, x) => s + x.diferenca, 0);

    return {
      segurado_devidos, segurado_pagos, empregador,
      total_segurado_devidos: totalDevidos,
      total_segurado_pagos: totalPagos,
      total_segurado: totalDevidos + totalPagos,
      total_empregador: empregador.reduce((s, x) => s + x.empresa + x.sat + x.terceiros, 0),
    };
  }

  // Helper: calcular INSS progressivo para uma competência
  private calcularINSSProgressivo(comp: string, base: number): number {
    if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
      return base * (this.csConfig.aliquota_segurado_fixa / 100);
    }
    const faixas = this.getFaixasINSSParaCompetencia(comp);
    const teto = faixas[faixas.length - 1].ate;
    let baseRestante = this.csConfig.limitar_teto ? Math.min(base, teto) : base;
    let imposto = 0;
    let faixaAnterior = 0;
    for (const faixa of faixas) {
      const limiteNaFaixa = faixa.ate - faixaAnterior;
      const baseNaFaixa = Math.min(baseRestante, limiteNaFaixa);
      if (baseNaFaixa > 0) {
        imposto += baseNaFaixa * faixa.aliquota;
        baseRestante -= baseNaFaixa;
      }
      if (baseRestante <= 0) break;
      faixaAnterior = faixa.ate;
    }
    return imposto;
  }

  // =====================================================
  // CALCULAR IR (Tabelas Versionadas + Art. 12-A RRA)
  // =====================================================

  calcularIR(verbaResults: PjeVerbaResult[], csResult: PjeCSResult): PjeIRResult {
    if (!this.irConfig.apurar) {
      return { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal',
        ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 };
    }

    let baseBruta = 0;
    let base13 = 0;
    let baseFerias = 0;
    
    // Art. 12-A: Separar rendimentos por ano para tributação correta
    const anoLiq = parseInt(this.correcaoConfig.data_liquidacao.slice(0, 4));
    let baseAnosAnteriores = 0;
    let baseAnoLiquidacao = 0;
    let mesesAnosAnteriores = 0;
    let mesesAnoLiquidacao = 0;
    const competenciasAnosAnteriores = new Set<string>();
    const competenciasAnoLiquidacao = new Set<string>();

    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      if (verba.caracteristica === 'ferias') {
        if (this.irConfig.tributacao_separada_ferias) {
          baseFerias += vr.total_diferenca;
        }
        continue;
      }
      if (verba.caracteristica === '13_salario' && this.irConfig.tributacao_exclusiva_13) {
        base13 += vr.total_diferenca;
      } else {
        baseBruta += vr.total_diferenca;
        // Classificar por ano para Art. 12-A
        for (const oc of vr.ocorrencias) {
          if (oc.diferenca <= 0) continue;
          const anoComp = parseInt(oc.competencia.slice(0, 4));
          if (anoComp < anoLiq) {
            baseAnosAnteriores += oc.diferenca;
            competenciasAnosAnteriores.add(oc.competencia);
          } else {
            baseAnoLiquidacao += oc.diferenca;
            competenciasAnoLiquidacao.add(oc.competencia);
          }
        }
      }
    }

    mesesAnosAnteriores = competenciasAnosAnteriores.size;
    mesesAnoLiquidacao = competenciasAnoLiquidacao.size;

    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    const periodo = this.getPeriodoCalculo();
    const meses = Math.max(1, this.getCompetencias(periodo.inicio, periodo.fim).length);
    
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const tabelaIR = this.getFaixasIRParaCompetencia(compLiq);
    
    let irAnosAnteriores = 0;
    let irAnoLiquidacao = 0;
    let ir13Exclusivo = 0;
    let irFeriasSeparado = 0;

    // ═══ Art. 12-A: Tabela acumulada para anos anteriores (RRA) ═══
    if (mesesAnosAnteriores > 0 && baseAnosAnteriores > 0) {
      const propDeducoes = deducoes * (baseAnosAnteriores / Math.max(baseBruta, 1));
      const deducaoDep = this.irConfig.dependentes * tabelaIR.deducao_dependente * mesesAnosAnteriores;
      const baseTrib = Math.max(0, baseAnosAnteriores - propDeducoes - deducaoDep);
      for (const faixa of tabelaIR.faixas) {
        if (baseTrib <= faixa.ate * mesesAnosAnteriores) {
          irAnosAnteriores = baseTrib * faixa.aliquota - faixa.deducao * mesesAnosAnteriores;
          break;
        }
      }
      if (irAnosAnteriores < 0) irAnosAnteriores = 0;
    }

    // ═══ Ano de liquidação: tabela mensal simples ═══
    if (mesesAnoLiquidacao > 0 && baseAnoLiquidacao > 0) {
      const propDeducoes = deducoes * (baseAnoLiquidacao / Math.max(baseBruta, 1));
      const deducaoDep = this.irConfig.dependentes * tabelaIR.deducao_dependente * mesesAnoLiquidacao;
      const baseTrib = Math.max(0, baseAnoLiquidacao - propDeducoes - deducaoDep);
      for (const faixa of tabelaIR.faixas) {
        if (baseTrib <= faixa.ate * mesesAnoLiquidacao) {
          irAnoLiquidacao = baseTrib * faixa.aliquota - faixa.deducao * mesesAnoLiquidacao;
          break;
        }
      }
      if (irAnoLiquidacao < 0) irAnoLiquidacao = 0;
    }

    // Fallback: se não há separação por ano, aplicar tabela acumulada total
    if (mesesAnosAnteriores === 0 && mesesAnoLiquidacao === 0 && baseBruta > 0) {
      const deducaoDependentes = this.irConfig.dependentes * tabelaIR.deducao_dependente * meses;
      const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);
      for (const faixa of tabelaIR.faixas) {
        if (baseTributavel <= faixa.ate * meses) {
          irAnoLiquidacao = baseTributavel * faixa.aliquota - faixa.deducao * meses;
          break;
        }
      }
      if (irAnoLiquidacao < 0) irAnoLiquidacao = 0;
      mesesAnoLiquidacao = meses;
    }

    // 13º tributação exclusiva (tabela mensal simples - sem acumular)
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      for (const faixa of tabelaIR.faixas) {
        if (base13 <= faixa.ate) {
          ir13Exclusivo = base13 * faixa.aliquota - faixa.deducao;
          break;
        }
      }
      if (ir13Exclusivo < 0) ir13Exclusivo = 0;
    }

    // Tributação separada de férias
    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      for (const faixa of tabelaIR.faixas) {
        if (baseFerias <= faixa.ate * meses) {
          irFeriasSeparado = baseFerias * faixa.aliquota - faixa.deducao * meses;
          break;
        }
      }
      if (irFeriasSeparado < 0) irFeriasSeparado = 0;
    }

    const imposto = irAnosAnteriores + irAnoLiquidacao + ir13Exclusivo + irFeriasSeparado;
    const deducaoDependentes = this.irConfig.dependentes * tabelaIR.deducao_dependente * meses;
    const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);

    return {
      base_calculo: Number(new Decimal(baseBruta + base13 + baseFerias).toDP(2)),
      deducoes: Number(new Decimal(deducoes + deducaoDependentes).toDP(2)),
      base_tributavel: Number(new Decimal(baseTributavel + base13 + baseFerias).toDP(2)),
      imposto_devido: Number(new Decimal(imposto).toDP(2)),
      meses_rra: meses,
      metodo: meses > 1 ? 'art_12a_rra' : 'tabela_mensal',
      ir_anos_anteriores: Number(new Decimal(irAnosAnteriores).toDP(2)),
      ir_ano_liquidacao: Number(new Decimal(irAnoLiquidacao).toDP(2)),
      ir_13_exclusivo: Number(new Decimal(ir13Exclusivo).toDP(2)),
      ir_ferias_separado: Number(new Decimal(irFeriasSeparado).toDP(2)),
      meses_anos_anteriores: mesesAnosAnteriores,
      meses_ano_liquidacao: mesesAnoLiquidacao || meses,
    };
  }

  // =====================================================
  // CALCULAR SEGURO-DESEMPREGO
  // =====================================================

  calcularSeguroDesemprego(): PjeSeguroResult {
    if (!this.seguroConfig.apurar) {
      return { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 };
    }

    let valorParcela = this.seguroConfig.valor_parcela || 0;
    
    if (!valorParcela && this.params.ultima_remuneracao) {
      const salMedio = this.params.ultima_remuneracao;
      if (salMedio <= SEGURO_DESEMP_2025.faixa1_ate) {
        valorParcela = salMedio * SEGURO_DESEMP_2025.faixa1_mult;
      } else if (salMedio <= SEGURO_DESEMP_2025.faixa2_ate) {
        valorParcela = SEGURO_DESEMP_2025.faixa2_base + (salMedio - SEGURO_DESEMP_2025.faixa1_ate) * SEGURO_DESEMP_2025.faixa2_mult;
      } else {
        valorParcela = SEGURO_DESEMP_2025.teto;
      }
    }

    valorParcela = Math.min(valorParcela, SEGURO_DESEMP_2025.teto);
    const total = valorParcela * this.seguroConfig.parcelas;

    return {
      apurado: true,
      parcelas: this.seguroConfig.parcelas,
      valor_parcela: Number(new Decimal(valorParcela).toDP(2)),
      total: Number(new Decimal(total).toDP(2)),
    };
  }

  // =====================================================
  // CALCULAR HONORÁRIOS
  // =====================================================

  calcularHonorarios(principalCorrigido: number, juros: number, fgts: number): { sucumbenciais: number; contratuais: number } {
    let sucumbenciais = 0;
    let contratuais = 0;

    if (this.honorariosConfig.apurar_sucumbenciais) {
      const baseHon = principalCorrigido + juros + fgts;
      sucumbenciais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_sucumbenciais / 100).toDP(2));
    }

    if (this.honorariosConfig.apurar_contratuais) {
      if (this.honorariosConfig.valor_fixo) {
        contratuais = this.honorariosConfig.valor_fixo;
      } else {
        const baseHon = principalCorrigido + juros + fgts;
        contratuais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_contratuais / 100).toDP(2));
      }
    }

    return { sucumbenciais, contratuais };
  }

  // =====================================================
  // CALCULAR CUSTAS (Art. 789 CLT)
  // =====================================================

  calcularCustas(valorCondenacao: number): { total: number; detalhadas: PjeCustaResult[] } {
    if (!this.custasConfig.apurar || this.custasConfig.isento) return { total: 0, detalhadas: [] };
    
    const detalhadas: PjeCustaResult[] = [];
    
    // Custas judiciais padrão (Art. 789 CLT)
    let custasJudiciais = Number(new Decimal(valorCondenacao).times(this.custasConfig.percentual / 100).toDP(2));
    custasJudiciais = Math.max(custasJudiciais, this.custasConfig.valor_minimo);
    if (this.custasConfig.valor_maximo) {
      custasJudiciais = Math.min(custasJudiciais, this.custasConfig.valor_maximo);
    }
    detalhadas.push({ tipo: 'judiciais', descricao: `Custas Judiciais (${this.custasConfig.percentual}% Art. 789 CLT)`, valor: custasJudiciais });
    
    // Itens adicionais (Periciais, Emolumentos, Postais, Outras)
    if (this.custasConfig.itens) {
      for (const item of this.custasConfig.itens) {
        if (!item.apurar || item.isento) continue;
        let valor = 0;
        if (item.valor_fixo && item.valor_fixo > 0) {
          valor = item.valor_fixo;
        } else {
          valor = Number(new Decimal(valorCondenacao).times(item.percentual / 100).toDP(2));
          valor = Math.max(valor, item.valor_minimo || 0);
          if (item.valor_maximo) valor = Math.min(valor, item.valor_maximo);
        }
        detalhadas.push({ tipo: item.tipo, descricao: item.descricao, valor: Number(new Decimal(valor).toDP(2)) });
      }
    }
    
    const total = detalhadas.reduce((s, d) => s + d.valor, 0);
    return { total: Number(new Decimal(total).toDP(2)), detalhadas };
  }

  // =====================================================
  // MULTA ART. 523, §1º CPC
  // =====================================================

  calcularMulta523(valorCondenacao: number): number {
    if (!this.correcaoConfig.multa_523) return 0;
    return Number(new Decimal(valorCondenacao).times(this.correcaoConfig.multa_523_percentual / 100).toDP(2));
  }

  calcularMulta467(principalBruto: number): number {
    if (!this.correcaoConfig.multa_467) return 0;
    const pct = (this.correcaoConfig.multa_467_percentual || 50) / 100;
    return Number(new Decimal(principalBruto).times(pct).toDP(2));
  }

  // =====================================================
  // VALIDAÇÃO PRÉ-LIQUIDAÇÃO
  // Checklist automático de consistência
  // =====================================================

  validarPreLiquidacao(): PjeValidationResult {
    const itens: PjeValidationItem[] = [];

    // ── Parâmetros obrigatórios ──
    if (!this.params.data_admissao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de admissão não informada' });
    }
    if (!this.params.data_ajuizamento) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento não informada — campo obrigatório para aplicação da ADC 58' });
    }
    if (!this.params.data_citacao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de citação não informada — campo obrigatório para cálculo de juros (ADC 58/STF)', detalhe: 'Preencha em Dados do Processo → Datas Processuais → Citação' });
    }
    if (!this.params.estado || !this.params.municipio) {
      itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Estado ou município não informado' });
    }

    // ── Datas incoerentes ──
    if (this.params.data_admissao && this.params.data_demissao) {
      if (new Date(this.params.data_demissao) <= new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de demissão anterior ou igual à admissão' });
      }
    }
    if (this.params.data_ajuizamento && this.params.data_admissao) {
      if (new Date(this.params.data_ajuizamento) < new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento anterior à admissão' });
      }
    }

    // ── Verbas ──
    if (this.verbas.length === 0) {
      itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: 'Nenhuma verba cadastrada para liquidação' });
    }
    for (const v of this.verbas) {
      if (!v.periodo_inicio || !v.periodo_fim) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem período definido` });
      }
      if (v.periodo_inicio && v.periodo_fim && new Date(v.periodo_fim) < new Date(v.periodo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com período inválido (fim < início)` });
      }
      if (v.tipo === 'reflexa' && !v.verba_principal_id && v.base_calculo.verbas.length === 0) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba reflexa "${v.nome}" sem verba principal vinculada` });
      }
      if (v.valor === 'calculado' && v.base_calculo.historicos.length === 0 && v.base_calculo.verbas.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem base de cálculo identificável` });
      }
      // Verificar divisor zero
      if (v.valor === 'calculado' && v.tipo_divisor === 'informado' && (v.divisor_informado === 0 || !v.divisor_informado)) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com divisor zero — causaria divisão por zero` });
      }
      // Verificar multiplicador zero em verbas calculadas
      if (v.valor === 'calculado' && v.multiplicador === 0) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com multiplicador = 0 — resultado será zero` });
      }
      // Verificar incidências conflitantes
      if (v.caracteristica === 'ferias' && v.incidencias.contribuicao_social) {
        itens.push({ tipo: 'observacao', modulo: 'Verbas', mensagem: `Férias "${v.nome}" com incidência CS ativa — férias indenizadas são isentas de CS` });
      }
    }

    // ── Histórico salarial ──
    if (this.historicos.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
      itens.push({ tipo: 'alerta', modulo: 'Histórico', mensagem: 'Sem histórico salarial e sem remuneração informada nos parâmetros', detalhe: 'As verbas podem resultar em valor zero' });
    }

    // ── Férias ──
    for (const f of this.ferias) {
      if (new Date(f.periodo_aquisitivo_fim) < new Date(f.periodo_aquisitivo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com período aquisitivo inválido` });
      }
      if (f.prazo_dias <= 0 || f.prazo_dias > 30) {
        itens.push({ tipo: 'alerta', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com prazo de ${f.prazo_dias} dias (esperado 1-30)` });
      }
    }

    // ── Correção monetária ──
    if (!this.correcaoConfig.data_liquidacao) {
      itens.push({ tipo: 'erro', modulo: 'Correção', mensagem: 'Data de liquidação não informada' });
    }
    if (this.indicesDB.length === 0) {
      itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Sem séries históricas de índices no banco — usando taxas aproximadas', detalhe: 'Popule a tabela de índices para resultados precisos' });
    }

    // ── Tabelas INSS/IR ──
    if (this.faixasINSSDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Contrib. Social', mensagem: 'Usando tabela INSS padrão 2025 — sem dados versionados por competência' });
    }
    if (this.faixasIRDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Imposto de Renda', mensagem: 'Usando tabela IR padrão 2025 — sem dados versionados por competência' });
    }

    // ── Competências sem cobertura ──
    if (this.params.data_admissao && this.correcaoConfig.data_liquidacao) {
      const periodo = this.getPeriodoCalculo();
      const comps = this.getCompetencias(periodo.inicio, periodo.fim);
      if (comps.length > 120) {
        itens.push({ tipo: 'alerta', modulo: 'Geral', mensagem: `Período de cálculo muito extenso: ${comps.length} competências`, detalhe: 'Verifique se as datas estão corretas' });
      }
    }

    // ── Configurações de FGTS ──
    if (this.fgtsConfig.apurar && this.fgtsConfig.multa_apurar && this.fgtsConfig.multa_tipo === 'informada' && !this.fgtsConfig.multa_valor_informado) {
      itens.push({ tipo: 'alerta', modulo: 'FGTS', mensagem: 'Multa FGTS definida como informada mas sem valor' });
    }

    // ── Cartão de Ponto vs Verbas ──
    const verbasCartao = this.verbas.filter(v => v.tipo_quantidade === 'cartao_ponto' || v.tipo_divisor === 'cartao_ponto');
    if (verbasCartao.length > 0 && this.cartaoPonto.length === 0) {
      itens.push({ tipo: 'erro', modulo: 'Cartão de Ponto', mensagem: `${verbasCartao.length} verba(s) usam cartão de ponto como fonte, mas nenhum registro foi informado`, detalhe: verbasCartao.map(v => v.nome).join(', ') });
    }

    // ── Histórico gaps ──
    if (this.historicos.length > 1) {
      const sorted = [...this.historicos].sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || ''));
      for (let i = 1; i < sorted.length; i++) {
        const prevFim = new Date(sorted[i - 1].periodo_fim);
        const curInicio = new Date(sorted[i].periodo_inicio);
        const diffDays = (curInicio.getTime() - prevFim.getTime()) / 86400000;
        if (diffDays > 32) {
          itens.push({ tipo: 'alerta', modulo: 'Histórico', mensagem: `Gap de ${Math.round(diffDays)} dias entre "${sorted[i - 1].nome}" e "${sorted[i].nome}"`, detalhe: `${sorted[i - 1].periodo_fim} → ${sorted[i].periodo_inicio}` });
        }
      }
    }

    // ── IRRF sem CS dedutível ──
    if (this.irConfig.apurar && this.irConfig.deduzir_cs && !this.csConfig.apurar_segurado) {
      itens.push({ tipo: 'alerta', modulo: 'Imposto de Renda', mensagem: 'IR configurado para deduzir CS, mas CS do segurado não está ativada' });
    }

    // ── Correção sem data de citação para ADC 58/59 ──
    if ((this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC') && !this.params.data_citacao) {
      itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Usando índice ADC 58/59 sem data de citação — será estimada a partir do ajuizamento + 60 dias' });
    }

    const erros = itens.filter(i => i.tipo === 'erro').length;
    const alertas = itens.filter(i => i.tipo === 'alerta').length;
    const observacoes = itens.filter(i => i.tipo === 'observacao').length;

    return {
      valido: erros === 0,
      itens,
      erros,
      alertas,
      observacoes,
    };
  }

  // =====================================================
  // CORREÇÃO SOMENTE (sem juros) — para juros_apos_deducao_cs
  // =====================================================

  aplicarCorrecaoSomente(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.combinacoes_indice?.length) {
      // Use combination-by-date but skip interest
      this.aplicarCorrecaoCombinacaoSomente(verbaResults);
      return;
    }

    // Legacy single-index correction only
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
        let indiceCorrecao = 1;
        if (fatorDB !== null) {
          indiceCorrecao = fatorDB;
        } else {
          console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq}. Usando fator=1.`);
          indiceCorrecao = 1;
        }
        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
        oc.indice_correcao = Number(new Decimal(indiceCorrecao).toDP(6));
        oc.valor_corrigido = valorCorrigido;
        oc.juros = 0;
        oc.valor_final = valorCorrigido;
        totalCorrigido = totalCorrigido.plus(valorCorrigido);
      }
      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = 0;
      vr.total_final = totalCorrigido.toDP(2).toNumber();
    }
  }

  private aplicarCorrecaoCombinacaoSomente(verbaResults: PjeVerbaResult[]): void {
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice!;
    const dataLiq = this.correcaoConfig.data_liquidacao;

    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        // Súmula 381: correction starts from mês subsequente ao vencimento
        const compDate = this.mesSubsequente(oc.competencia) + '-01';
        const breakpoints = new Set<string>();
        breakpoints.add(compDate);
        breakpoints.add(dataLiq);
        for (const ci of combinacoes_indice) {
          if (ci.de && ci.de > compDate && ci.de <= dataLiq) breakpoints.add(ci.de);
        }
        const datas = Array.from(breakpoints).sort();
        let fatorTotal = new Decimal(1);
        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(combinacoes_indice, segInicio);
          const indice = normalizeIndice(regime?.indice || 'SEM_CORRECAO');
          if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') continue;
          // For SELIC as correction index, still apply the correction factor (SELIC includes interest but in correction-only mode we apply the full factor)
          const fatorDB = this.getIndiceCorrecaoDB(indice, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indice} ausente para ${segInicio}→${segFim}. Usando fator=1.`);
          }
        }
        const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);
        oc.indice_correcao = fatorTotal.toDP(6).toNumber();
        oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
        oc.juros = 0;
        oc.valor_final = valorCorrigido.toDP(2).toNumber();
        totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
      }
      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = 0;
      vr.total_final = totalCorrigido.toDP(2).toNumber();
    }
  }

  // =====================================================
  // JUROS APÓS DEDUÇÃO CS — PJe-Calc Criterion 8
  // Interest is applied on (corrected_value - CS_share_pro_rata)
  // =====================================================

  aplicarJurosAposCS(verbaResults: PjeVerbaResult[], totalCSDescontado: number): void {
    // Total corrected across all verbas (for pro-rata CS distribution)
    const totalCorrigido = verbaResults.reduce((s, v) => s + v.total_corrigido, 0);
    if (totalCorrigido <= 0) return;

    const combinacoes_juros = this.correcaoConfig.combinacoes_juros || [];
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice || [];
    const dataLiq = this.correcaoConfig.data_liquidacao;

    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalJuros = 0;
      let totalFinal = 0;

      for (const oc of vr.ocorrencias) {
        if (oc.valor_corrigido === 0) { totalFinal += oc.valor_final; continue; }

        // Pro-rata CS share for this occurrence
        const csShare = totalCorrigido > 0
          ? Number(new Decimal(totalCSDescontado).times(oc.valor_corrigido).div(totalCorrigido).toDP(2))
          : 0;
        
        // Base for interest = corrected - CS share
        const baseJuros = new Decimal(oc.valor_corrigido).minus(csShare);

        if (combinacoes_juros.length > 0 && combinacoes_indice.length > 0) {
          const compDate = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const breakpoints = new Set<string>();
          breakpoints.add(compDate);
          breakpoints.add(dataLiq);
          for (const cj of combinacoes_juros) {
            if (cj.de && cj.de > compDate && cj.de <= dataLiq) breakpoints.add(cj.de);
          }
          for (const ci of combinacoes_indice) {
            if (ci.de && ci.de > compDate && ci.de <= dataLiq) breakpoints.add(ci.de);
          }
          const datas = Array.from(breakpoints).sort();

          let jurosAcc = new Decimal(0);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regimeI = this.getRegimeParaData(combinacoes_indice, segInicio);
            const indiceNorm = normalizeIndice(regimeI?.indice || 'SEM_CORRECAO');
            // SELIC as correction already includes interest
            if (indiceNorm === 'SELIC') continue;
            
            const regimeJ = this.getRegimeParaData(combinacoes_juros, segInicio);
            if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;

            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              const fatorS = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorS !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorS - 1));
              else jurosAcc = jurosAcc.plus(baseJuros.times(0.01).times(meses));
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorTL - 1));
              else jurosAcc = jurosAcc.plus(baseJuros.times(0.008).times(meses));
            } else {
              const taxa = ((regimeJ as any).percentual || 1) / 100;
              jurosAcc = jurosAcc.plus(baseJuros.times(taxa).times(meses));
            }
          }
          oc.juros = jurosAcc.toDP(2).toNumber();
        } else {
          // Legacy single interest
          const [ano, mes] = oc.competencia.split('-').map(Number);
          const dataComp = new Date(ano, mes - 1, 1);
          const dataLiqD = new Date(dataLiq);
          const meses = this.mesesEntre(dataComp, dataLiqD);
          const taxa = (this.correcaoConfig.juros_percentual || 1) / 100;
          oc.juros = Number(baseJuros.times(taxa).times(meses).toDP(2));
        }

        oc.valor_final = Number(new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2));
        totalJuros += oc.juros;
        totalFinal += oc.valor_final;
      }
      vr.total_juros = Number(new Decimal(totalJuros).toDP(2));
      vr.total_final = Number(new Decimal(totalFinal).toDP(2));
    }
  }

  // =====================================================
  // LIQUIDAR - FLUXO PRINCIPAL
  // =====================================================

  liquidar(): PjeLiquidacaoResult {
    // ── 0. Validação pré-liquidação ──
    const validacao = this.validarPreLiquidacao();

    // ── 1. Topological sort: principals first, then reflexas in dependency order ──
    // This supports reflex-on-reflex (e.g., HE → DSR → 13º s/ DSR)
    const verbaResults: PjeVerbaResult[] = [];
    const processed = new Set<string>();
    
    const processVerba = (verba: PjeVerba) => {
      if (processed.has(verba.id)) return;
      
      // Process dependencies first (reflex-on-reflex)
      if (verba.verba_principal_id && !processed.has(verba.verba_principal_id)) {
        const dep = this.verbas.find(v => v.id === verba.verba_principal_id);
        if (dep) processVerba(dep);
      }
      for (const depId of (verba.base_calculo?.verbas || [])) {
        if (!processed.has(depId)) {
          const dep = this.verbas.find(v => v.id === depId);
          if (dep) processVerba(dep);
        }
      }
      
      processed.add(verba.id);
      
      // Calculate
      if (verba.tipo === 'reflexa' && verba.verba_principal_id) {
        const principalResult = this.verbaResultsMap.get(verba.verba_principal_id);
        if (principalResult) {
          const refResult = this.calcularVerbaReflexa(verba, principalResult);
          verbaResults.push(refResult);
          this.verbaResultsMap.set(verba.id, refResult);
          return;
        }
      }
      const result = this.calcularVerba(verba);
      verbaResults.push(result);
      this.verbaResultsMap.set(verba.id, result);
    };

    // Process all verbas in dependency order
    const sorted = [...this.verbas].sort((a, b) => {
      if (a.tipo === 'principal' && b.tipo === 'reflexa') return -1;
      if (a.tipo === 'reflexa' && b.tipo === 'principal') return 1;
      return a.ordem - b.ordem;
    });
    for (const verba of sorted) {
      processVerba(verba);
    }

    // ── 3b. Abatimento Global (OJ 415 SDI-1 TST) ──
    // Permite deduzir valores pagos sob o mesmo título globalmente,
    // mesmo que o pagamento tenha ocorrido em competência diferente.
    // O excedente pago em uma competência abate o devido em outra.
    this.aplicarAbatimentoGlobalOJ415(verbaResults);

    // ── 4. Correção Monetária + Juros ──
    // PJe-Calc Criterion 8: "Juros de mora sobre verbas apurados após a dedução 
    // da contribuição social devida pelo reclamante"
    // When juros_apos_deducao_cs=true:
    //   Step A: Apply correction ONLY (no interest)
    //   Step B: Calculate CS on corrected nominal values
    //   Step C: Deduct CS share per occurrence
    //   Step D: Apply interest on (corrected - CS_share)
    if (this.correcaoConfig.juros_apos_deducao_cs) {
      // Step A: Correction only
      this.aplicarCorrecaoSomente(verbaResults);
      
      // Step B: CS on corrected values (uses valor_corrigido which is now set)
      const csPreJuros = this.calcularCS(verbaResults, true);
      const csDescontadoPreJuros = this.csConfig.cobrar_reclamante ? csPreJuros.total_segurado : 0;
      
      // Step C+D: Apply interest on (corrected - CS_share_pro_rata)
      this.aplicarJurosAposCS(verbaResults, csDescontadoPreJuros);
    } else {
      this.aplicarCorrecaoJuros(verbaResults);
    }

    // ── 5. FGTS ──
    const fgts = this.calcularFGTS(verbaResults);

    // ── 6. Contribuição Social (recalculate if juros_apos_deducao_cs — CS was already computed above but we need the full result) ──
    const cs = this.calcularCS(verbaResults);

    // ── 7. IR ──
    const ir = this.calcularIR(verbaResults, cs);

    // ── 8. Seguro-Desemprego ──
    const seguro = this.calcularSeguroDesemprego();

    // ── 8b. Previdência Privada ──
    let prevPrivada: PjePrevidenciaPrivadaResult = { apurado: false, base: 0, percentual: 0, valor: 0 };
    if (this.prevPrivadaConfig.apurar && this.prevPrivadaConfig.percentual > 0) {
      let basePP = 0;
      for (const vr of verbaResults) {
        const verba = this.verbas.find(vb => vb.id === vr.verba_id);
        if (!verba?.incidencias.previdencia_privada) continue;
        if (this.prevPrivadaConfig.base_calculo === 'devido') basePP += vr.total_devido;
        else if (this.prevPrivadaConfig.base_calculo === 'corrigido') basePP += vr.total_corrigido;
        else basePP += vr.total_diferenca;
      }
      const valorPP = Number(new Decimal(basePP).times(this.prevPrivadaConfig.percentual / 100).toDP(2));
      prevPrivada = { apurado: true, base: basePP, percentual: this.prevPrivadaConfig.percentual, valor: valorPP };
    }

    // ── 8c. Salário-Família (Art. 65, Lei 8.213/91) ──
    const salarioFamilia = this.calcularSalarioFamilia(verbaResults);

    // ── 9. Composição do Resumo ──
    const principalBruto = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_diferenca), new Decimal(0)).toDP(2));
    const principalCorrigido = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_corrigido), new Decimal(0)).toDP(2));
    const jurosMora = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_juros), new Decimal(0)).toDP(2));

    const honorarios = this.calcularHonorarios(principalCorrigido, jurosMora, fgts.total_fgts);
    const valorCondenacao = principalCorrigido + jurosMora + fgts.total_fgts;
    const multa523 = this.calcularMulta523(valorCondenacao);
    const multa467 = this.calcularMulta467(principalBruto);
    const custasResult = this.calcularCustas(valorCondenacao);
    const csDescontado = this.csConfig.cobrar_reclamante ? cs.total_segurado : 0;

    // Pensão Alimentícia (config + sobre FGTS)
    let pensaoSobreFgts = 0;
    let pensaoTotal = 0;
    if (this.pensaoConfig.apurar && this.pensaoConfig.percentual > 0) {
      const pct = this.pensaoConfig.percentual / 100;
      let basePensaoVerbas = 0;
      for (const vr of verbaResults) {
        const verba = this.verbas.find(v => v.id === vr.verba_id);
        if (!verba?.incidencias.pensao_alimenticia) continue;
        basePensaoVerbas += vr.total_final;
      }
      const pensaoVerbas = Number(new Decimal(basePensaoVerbas).times(pct).toDP(2));
      if (fgts.total_fgts > 0) {
        pensaoSobreFgts = Number(new Decimal(fgts.total_fgts).times(pct).toDP(2));
      }
      if (this.pensaoConfig.valor_fixo && this.pensaoConfig.valor_fixo > 0) {
        pensaoTotal = this.pensaoConfig.valor_fixo;
        pensaoSobreFgts = 0;
      } else {
        pensaoTotal = pensaoVerbas + pensaoSobreFgts;
      }
    }

    // PJe-Calc: Bruto = verbas corrigidas + juros (FGTS is separate in PJe-Calc's "bruto devido ao reclamante")
    const brutoTotal = Number(new Decimal(principalCorrigido).plus(jurosMora).toDP(2));
    
    // Líquido = Bruto - CS segurado - IR - prev privada - pensão
    // NOTE: seguro, multas and salário família are NOT added here — they are separate items
    // This prevents the impossible "líquido > bruto" bug
    const liquido = Number(new Decimal(brutoTotal)
      .minus(csDescontado)
      .minus(ir.imposto_devido)
      .minus(prevPrivada.valor)
      .minus(pensaoTotal)
      .toDP(2));

    // Total Reclamada = líquido + CS segurado (recolher) + CS empregador + honorários + custas + IR + FGTS
    const totalReclamada = Number(new Decimal(liquido)
      .plus(csDescontado)
      .plus(cs.total_empregador)
      .plus(honorarios.sucumbenciais)
      .plus(honorarios.contratuais)
      .plus(custasResult.total)
      .plus(ir.imposto_devido)
      .plus(fgts.total_fgts)
      .toDP(2));

    const resumo: PjeResumo = {
      principal_bruto: Number(new Decimal(principalBruto).toDP(2)),
      principal_corrigido: Number(new Decimal(principalCorrigido).toDP(2)),
      juros_mora: Number(new Decimal(jurosMora).toDP(2)),
      fgts_total: fgts.total_fgts, cs_segurado: csDescontado, cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido, seguro_desemprego: seguro.total, previdencia_privada: prevPrivada.valor,
      salario_familia: salarioFamilia.total,
      multa_523: multa523, multa_467: multa467, honorarios_sucumbenciais: honorarios.sucumbenciais,
      honorarios_contratuais: honorarios.contratuais, custas: custasResult.total,
      custas_detalhadas: custasResult.detalhadas, pensao_sobre_fgts: pensaoSobreFgts, pensao_total: pensaoTotal,
      liquido_reclamante: liquido, total_reclamada: totalReclamada,
      meta: {
        arredondamento: 'Arredondamento por competência (item a item, 2 casas decimais) conforme metodologia judiciária. Pequenas diferenças de centavos são esperadas.',
        tipo_mes: this.params.tipo_mes === 'comercial' ? 'Mês Comercial (30 dias fixos — Art. 64 CLT)' : 'Calendário Civil (dias reais do mês)',
        selic_referencia: (() => {
          const selicRows = this.indicesDB.filter(i => i.indice === 'SELIC').sort((a, b) => b.competencia.localeCompare(a.competencia));
          return selicRows.length > 0 ? { data: selicRows[0].competencia, acumulado: selicRows[0].acumulado } : undefined;
        })(),
        oj415_aplicada: verbaResults.some(vr => {
          const hasOverpay = vr.ocorrencias.some(oc => oc.pago > oc.devido);
          return hasOverpay;
        }),
      },
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults, fgts, contribuicao_social: cs, imposto_renda: ir,
      seguro_desemprego: seguro, previdencia_privada: prevPrivada, salario_familia: salarioFamilia, resumo, validacao,
    };
  }

  // =====================================================
  // ABATIMENTO GLOBAL - OJ 415 SDI-1 TST
  // "A dedução das parcelas pagas deve ser realizada pelo
  // valor total, e não mês a mês." Permite compensar
  // excedentes pagos em uma competência com devidos em outra.
  // =====================================================

  private aplicarAbatimentoGlobalOJ415(verbaResults: PjeVerbaResult[]): void {
    for (const vr of verbaResults) {
      // Sort occurrences chronologically for sequential credit accumulation
      const ocsSorted = [...vr.ocorrencias].sort((a, b) =>
        a.competencia.localeCompare(b.competencia)
      );

      let creditoAcumulado = new Decimal(0);

      for (const oc of ocsSorted) {
        const saldoMes = new Decimal(oc.devido).minus(oc.pago);

        if (saldoMes.isNegative()) {
          // Empresa pagou a mais neste mês: acumula crédito para meses seguintes
          creditoAcumulado = creditoAcumulado.plus(saldoMes.abs());
          oc.diferenca = 0;
        } else if (saldoMes.isZero()) {
          oc.diferenca = 0;
        } else {
          // Empresa deve neste mês: tenta abater do crédito acumulado primeiro
          if (creditoAcumulado.greaterThanOrEqualTo(saldoMes)) {
            creditoAcumulado = creditoAcumulado.minus(saldoMes);
            oc.diferenca = 0;
          } else if (creditoAcumulado.greaterThan(0)) {
            const restante = saldoMes.minus(creditoAcumulado);
            creditoAcumulado = new Decimal(0);
            oc.diferenca = Number(restante.toDP(2));
          } else {
            oc.diferenca = Number(saldoMes.toDP(2));
          }
        }
      }

      // Recalculate total difference
      vr.total_diferenca = Number(
        vr.ocorrencias.reduce((s, oc) => s.plus(oc.diferenca), new Decimal(0)).toDP(2)
      );
    }
  }

  // =====================================================
  // SALÁRIO-FAMÍLIA (Art. 65, Lei 8.213/91)
  // Cota por filho ≤14 anos para empregados de baixa renda
  // =====================================================

  calcularSalarioFamilia(verbaResults: PjeVerbaResult[]): PjeSalarioFamiliaResult {
    if (!this.salarioFamiliaConfig.apurar || this.salarioFamiliaConfig.numero_filhos <= 0) {
      return { apurado: false, cotas: [], total: 0 };
    }

    const filhos = this.salarioFamiliaConfig.filhos_detalhes || [];
    const periodo = this.getPeriodoCalculo();
    const competencias = this.getCompetencias(periodo.inicio, periodo.fim);
    const cotas: PjeSalarioFamiliaResult['cotas'] = [];
    let totalSF = 0;

    for (const comp of competencias) {
      // Determinar remuneração da competência (usar histórico ou última remuneração)
      let remuneracao = 0;
      for (const hist of this.historicos) {
        const oc = hist.ocorrencias.find(o => o.competencia === comp);
        if (oc) remuneracao += oc.valor;
      }
      if (remuneracao === 0) remuneracao = this.params.ultima_remuneracao || 0;

      // Verificar se remuneração está dentro do limite
      if (remuneracao > SALARIO_FAMILIA_2025.limite_remuneracao) continue;

      // Contar filhos elegíveis na competência
      const [anoComp, mesComp] = comp.split('-').map(Number);
      const dataComp = new Date(anoComp, mesComp - 1, 1);
      let filhosElegiveis = 0;

      if (filhos.length > 0) {
        for (const f of filhos) {
          if (!f.nascimento) { filhosElegiveis++; continue; }
          const nasc = new Date(f.nascimento);
          const idadeAnos = (dataComp.getTime() - nasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (idadeAnos <= 14 || f.ate_14) filhosElegiveis++;
        }
      } else {
        filhosElegiveis = this.salarioFamiliaConfig.numero_filhos;
      }

      if (filhosElegiveis <= 0) continue;

      const valorCota = SALARIO_FAMILIA_2025.valor_cota;
      const totalComp = Number(new Decimal(valorCota).times(filhosElegiveis).toDP(2));
      cotas.push({ competencia: comp, filhos_elegíveis: filhosElegiveis, valor_cota: valorCota, total: totalComp });
      totalSF += totalComp;
    }

    return { apurado: true, cotas, total: Number(new Decimal(totalSF).toDP(2)) };
  }

  // =====================================================
  // AGRUPAMENTO POR PERÍODO (ANO_CIVIL / PERIODO_AQUISITIVO)
  // =====================================================

  private agruparPorPeriodo(
    ocorrencias: PjeOcorrenciaResult[],
    modo: 'ano_civil' | 'periodo_aquisitivo' | 'global',
  ): Map<string, PjeOcorrenciaResult[]> {
    const grupos = new Map<string, PjeOcorrenciaResult[]>();

    if (modo === 'global') {
      grupos.set('global', [...ocorrencias]);
      return grupos;
    }

    if (modo === 'ano_civil') {
      for (const oc of ocorrencias) {
        const ano = oc.competencia.slice(0, 4);
        if (!grupos.has(ano)) grupos.set(ano, []);
        grupos.get(ano)!.push(oc);
      }
      return grupos;
    }

    if (modo === 'periodo_aquisitivo') {
      // Group by the vacation acquisition period the competencia falls into
      for (const oc of ocorrencias) {
        const compDate = new Date(oc.competencia + '-01');
        let grupKey = 'default';
        for (const fer of this.ferias) {
          const paInicio = new Date(fer.periodo_aquisitivo_inicio);
          const paFim = new Date(fer.periodo_aquisitivo_fim);
          if (compDate >= paInicio && compDate <= paFim) {
            grupKey = `${fer.periodo_aquisitivo_inicio}_${fer.periodo_aquisitivo_fim}`;
            break;
          }
        }
        if (!grupos.has(grupKey)) grupos.set(grupKey, []);
        grupos.get(grupKey)!.push(oc);
      }
      return grupos;
    }

    grupos.set('global', [...ocorrencias]);
    return grupos;
  }

  private calcularVerbaReflexa(reflexa: PjeVerba, principalResult: PjeVerbaResult): PjeVerbaResult {
    const comportamento = reflexa.comportamento_reflexo || 'valor_mensal';
    const ocorrencias: PjeOcorrenciaResult[] = [];
    // FIX #4: Acumular totais com Decimal.js
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    // Base Integralization (Fase 6): converter meses fracionários em meses completos
    // para reflexos em férias e 13º (PJe-Calc integraliza a base antes de aplicar a fórmula)
    const shouldIntegralizar = reflexa.base_calculo.integralizar && 
      (reflexa.caracteristica === 'ferias' || reflexa.caracteristica === '13_salario');

    switch (comportamento) {
      case 'valor_mensal': {
        for (const oc of principalResult.ocorrencias) {
          let baseValor = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
          // Integralization: se o mês principal teve fração, integralizar para mês completo
          if (shouldIntegralizar && oc.quantidade > 0 && oc.quantidade < 1) {
            baseValor = Number(new Decimal(baseValor).div(oc.quantidade).toDP(2));
          }
          const result = this.calcularOcorrencia(reflexa, oc.competencia, baseValor);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      case 'media_valor_absoluto': {
        // Determine grouping mode
        const periodoMedia = reflexa.periodo_media_reflexo || 'global';
        const grupos = this.agruparPorPeriodo(principalResult.ocorrencias, periodoMedia);

        for (const [grupoKey, grupoOcs] of grupos) {
          const valores = grupoOcs
            .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
            .map(o => {
              let val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
              // Use integral values when integralizing
              if (shouldIntegralizar && o.devido_integral !== undefined) {
                val = reflexa.gerar_verba_reflexa === 'devido' 
                  ? o.devido_integral 
                  : (o.devido_integral - (o.pago || 0));
              }
              return val;
            });
          const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
          
          // Determine competencia for this group
          let comp: string;
          if (periodoMedia === 'ano_civil') {
            comp = `${grupoKey}-12`; // December of the year
          } else if (periodoMedia === 'periodo_aquisitivo') {
            // Use end of acquisition period
            const parts = grupoKey.split('_');
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7));
          } else {
            comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
          }

          const result = this.calcularOcorrencia(reflexa, comp, media);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      case 'media_valor_corrigido': {
        // Média dos valores corrigidos monetariamente (Fase 6)
        const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
        const valoresCorrigidos = principalResult.ocorrencias
          .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
          .map(o => {
            const val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
            const fator = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, o.competencia, compLiq);
            return fator !== null ? val * fator : val;
          });
        const mediaCorr = valoresCorrigidos.length > 0 
          ? valoresCorrigidos.reduce((s, v) => s + v, 0) / valoresCorrigidos.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, mediaCorr);
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
        break;
      }
      case 'media_quantidade': {
        const qtds = principalResult.ocorrencias.filter(o => o.quantidade > 0).map(o => o.quantidade);
        const mediaQtd = qtds.length > 0 ? qtds.reduce((s, v) => s + v, 0) / qtds.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const baseUnitaria = this.getBaseParaCompetencia(reflexa, comp);
        const result = this.calcularOcorrencia(
          { ...reflexa, quantidade_informada: mediaQtd, tipo_quantidade: 'informada' },
          comp, baseUnitaria
        );
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
        break;
      }
      // =====================================================
      // MEDIA_PELA_QUANTIDADE — PJe-Calc Ground Truth
      // soma(diferenças_integralizadas) / soma(quantidades) = média ponderada
      // Agrupado por ANO_CIVIL (13º) ou PERIODO_AQUISITIVO (férias)
      // =====================================================
      case 'media_pela_quantidade': {
        const periodoMedia = reflexa.periodo_media_reflexo || 
          (reflexa.caracteristica === '13_salario' ? 'ano_civil' : 
           reflexa.caracteristica === 'ferias' ? 'periodo_aquisitivo' : 'global');
        
        const grupos = this.agruparPorPeriodo(principalResult.ocorrencias, periodoMedia);

        for (const [grupoKey, grupoOcs] of grupos) {
          // Filter to positive-value occurrences
          const ocsAtivas = grupoOcs.filter(o => {
            const val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
            return val > 0 || o.quantidade > 0;
          });

          if (ocsAtivas.length === 0) continue;

          // Sum of differences (integralized when configured)
          let somaDiferencas = new Decimal(0);
          let somaQuantidades = new Decimal(0);

          for (const oc of ocsAtivas) {
            let val: number;
            if (shouldIntegralizar && oc.devido_integral !== undefined) {
              // Use integral value (full month)
              val = reflexa.gerar_verba_reflexa === 'devido'
                ? oc.devido_integral
                : (oc.devido_integral - (oc.pago || 0));
            } else {
              val = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
            }
            somaDiferencas = somaDiferencas.plus(val);

            // Use integral quantity when available and integralizing
            const qtd = (shouldIntegralizar && oc.quantidade_integral !== undefined)
              ? oc.quantidade_integral
              : oc.quantidade;
            somaQuantidades = somaQuantidades.plus(qtd > 0 ? qtd : 1);
          }

          // Weighted average: soma_diferencas / soma_quantidades
          const mediaPonderada = somaQuantidades.greaterThan(0)
            ? somaDiferencas.div(somaQuantidades).toDP(2).toNumber()
            : 0;

          // Determine competencia for this group
          let comp: string;
          if (periodoMedia === 'ano_civil') {
            comp = `${grupoKey}-12`; // December of the year for 13º
          } else if (periodoMedia === 'periodo_aquisitivo') {
            const parts = grupoKey.split('_');
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7));
          } else {
            comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
          }

          // Calculate occurrence using the weighted average as base
          const result = this.calcularOcorrencia(reflexa, comp, mediaPonderada);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      default: {
        const valores = principalResult.ocorrencias.filter(o => o.diferenca > 0).map(o => o.diferenca);
        const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, media);
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
      }
    }

    return {
      verba_id: reflexa.id,
      nome: reflexa.nome,
      tipo: 'reflexa',
      caracteristica: reflexa.caracteristica,
      ocorrencias,
      total_devido: totalDevido.toDP(2).toNumber(),
      total_pago: totalPago.toDP(2).toNumber(),
      total_diferenca: totalDiferenca.toDP(2).toNumber(),
      total_corrigido: totalDiferenca.toDP(2).toNumber(),
      total_juros: 0,
      total_final: totalDiferenca.toDP(2).toNumber(),
    };
  }
}
