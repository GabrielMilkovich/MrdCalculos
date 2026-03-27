/**
 * =====================================================
 * PJeCalc ORCHESTRATOR — EXECUÇÃO CANÔNICA DO MOTOR
 * =====================================================
 * 
 * Este é o ÚNICO ponto de entrada para executar cálculos.
 * Nenhuma página, componente ou hook deve instanciar PjeCalcEngine diretamente.
 * 
 * Responsabilidades:
 * 1. Carregar todos os dados do caso via PjeCalcService
 * 2. Converter dados das views para formato do engine
 * 3. Executar o PjeCalcEngine
 * 4. Gerar fingerprint de execução (EngineExecutionFingerprint)
 * 5. Persistir resultado + ocorrências via service
 * 6. Retornar resultado tipado
 */

import { supabase } from "@/integrations/supabase/client";
import {
  resolveCanonicalInput,
  validateCanonicalInput,
  generateConfidenceReport,
  type CanonicalCaseInput,
  type InputValidationResult,
  type ConfidenceReport,
} from './canonical';
import {
  PjeCalcEngine,
  type PjeParametros,
  type PjeHistoricoSalarial,
  type PjeFalta,
  type PjeFerias,
  type PjeVerba,
  type PjeCartaoPonto,
  type PjeFGTSConfig,
  type PjeCSConfig,
  type PjeIRConfig,
  type PjeCorrecaoConfig,
  type PjeHonorariosConfig,
  type PjeCustasConfig,
  type PjeSeguroConfig,
  type PjeLiquidacaoResult,
  type PjeIndiceRow,
  type PjeINSSFaixaRow,
  type PjeIRFaixaRow,
  type PjeFeriadoDB,
  type PjeExcecaoCargaHoraria,
  type PjePrevidenciaPrivadaConfig,
  type PjePensaoConfig,
  type PjeSalarioFamiliaConfig,
} from './engine';
import * as svc from './service';
import type {
  EngineExecutionFingerprint,
  PjecalcParametrosRow,
  PjecalcVerbaRow,
  PjecalcHistoricoSalarialRow,
  PjecalcFaltaRow,
  PjecalcFeriasRow,
  PjecalcCartaoPontoRow,
  PjecalcFgtsConfigRow,
  PjecalcCsConfigRow,
  PjecalcIrConfigRow,
  PjecalcCorrecaoConfigRow,
  PjecalcHonorariosRow,
  PjecalcCustasConfigRow,
} from './types';
import { gerarReflexosPadrao, type VerbaBase, type ReflexoGerado } from './reflexo-engine';

// =====================================================
// VERSION CONSTANTS
// =====================================================

const ENGINE_VERSION = '3.1.0';
const RULESET_VERSION = '2025.03.05';

// =====================================================
// HASH UTILITY
// =====================================================

function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// =====================================================
// DATA CONVERTERS: View → Engine
// =====================================================

function toEngineParams(p: PjecalcParametrosRow): PjeParametros {
  return {
    case_id: p.case_id,
    data_admissao: p.data_admissao || '',
    data_demissao: p.data_demissao || undefined,
    data_ajuizamento: p.data_ajuizamento || '',
    data_inicial: p.data_inicial || undefined,
    data_final: p.data_final || undefined,
    estado: p.estado || 'SP',
    municipio: p.municipio || '',
    regime_trabalho: (p.regime_trabalho as 'tempo_integral' | 'tempo_parcial') || 'tempo_integral',
    carga_horaria_padrao: p.carga_horaria_padrao || 220,
    prescricao_quinquenal: p.prescricao_quinquenal ?? false,
    prescricao_fgts: p.prescricao_fgts ?? false,
    maior_remuneracao: p.maior_remuneracao ?? undefined,
    ultima_remuneracao: p.ultima_remuneracao ?? undefined,
    prazo_aviso_previo: (p.prazo_aviso_previo as 'nao_apurar' | 'calculado' | 'informado') || 'nao_apurar',
    prazo_aviso_dias: p.prazo_aviso_dias ?? undefined,
    projetar_aviso_indenizado: p.projetar_aviso_indenizado ?? false,
    limitar_avos_periodo: p.limitar_avos_periodo ?? false,
    zerar_valor_negativo: p.zerar_valor_negativo ?? false,
    sabado_dia_util: p.sabado_dia_util ?? true,
    considerar_feriado_estadual: p.considerar_feriado_estadual ?? false,
    considerar_feriado_municipal: p.considerar_feriado_municipal ?? false,
  };
}

function toEngineFaltas(faltas: PjecalcFaltaRow[]): PjeFalta[] {
  return faltas.map(f => ({
    id: f.id,
    data_inicial: f.data_inicial || '',
    data_final: f.data_final || '',
    justificada: f.justificada ?? false,
    justificativa: f.motivo || undefined,
  }));
}

function toEngineFerias(ferias: PjecalcFeriasRow[]): PjeFerias[] {
  return ferias.map(f => ({
    id: f.id,
    relativas: '',
    periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio || '',
    periodo_aquisitivo_fim: f.periodo_aquisitivo_fim || '',
    periodo_concessivo_inicio: f.periodo_concessivo_inicio || '',
    periodo_concessivo_fim: f.periodo_concessivo_fim || '',
    prazo_dias: f.dias || 30,
    situacao: (f.situacao as 'gozadas' | 'indenizadas' | 'perdidas' | 'gozadas_parcialmente') || 'gozadas',
    dobra: f.dobra ?? false,
    abono: f.abono ?? false,
    abono_dias: f.dias_abono || 0,
    periodos_gozo: f.gozo_inicio ? [{ inicio: f.gozo_inicio, fim: f.gozo_fim || f.gozo_inicio, dias: f.dias || 30 }] : [],
  }));
}

function toEngineVerbas(verbas: PjecalcVerbaRow[]): PjeVerba[] {
  return verbas.map(v => {
    let bcHistoricos: string[] = [];
    let bcVerbas: string[] = [];
    let bcTabelas: string[] = [];
    let bcProporcionalizar = false;
    let bcIntegralizar = false;

    if (v.base_calculo && typeof v.base_calculo === 'object') {
      const bc = v.base_calculo as Record<string, unknown>;
      if (Array.isArray(bc.historicos)) bcHistoricos = bc.historicos.map(String);
      if (Array.isArray(bc.verbas)) bcVerbas = bc.verbas.map(String);
      if (Array.isArray(bc.tabelas)) bcTabelas = bc.tabelas.map(String);
      if (bc.proporcionalizar) bcProporcionalizar = true;
      if (bc.integralizar) bcIntegralizar = true;
    }

    if (bcHistoricos.length === 0 && v.hist_salarial_nome) {
      bcHistoricos = [v.hist_salarial_nome];
    }

    const caracteristicaMap: Record<string, string> = {
      'COMUM': 'comum', '13_SALARIO': '13_salario', 'AVISO_PREVIO': 'aviso_previo', 'FERIAS': 'ferias',
    };
    const rawCaract = (v.caracteristica || 'COMUM').toUpperCase();
    const caracteristica = (caracteristicaMap[rawCaract] || rawCaract.toLowerCase()) as PjeVerba['caracteristica'];

    const ocorrenciaMap: Record<string, string> = {
      'MENSAL': 'mensal', 'DEZEMBRO': 'dezembro', 'PERIODO_AQUISITIVO': 'periodo_aquisitivo', 'DESLIGAMENTO': 'desligamento',
    };
    const rawOcorr = (v.ocorrencia_pagamento || 'MENSAL').toUpperCase();
    const ocorrenciaPagamento = (ocorrenciaMap[rawOcorr] || rawOcorr.toLowerCase()) as PjeVerba['ocorrencia_pagamento'];

    const incidencias = {
      fgts: v.incide_fgts !== false,
      irpf: v.incide_ir !== false,
      contribuicao_social: v.incide_inss !== false,
      previdencia_privada: false,
      pensao_alimenticia: false,
    };

    return {
      id: v.id,
      nome: v.nome,
      tipo: (v.tipo === 'reflexa' ? 'reflexa' : 'principal') as 'principal' | 'reflexa',
      valor: (v.valor as 'calculado' | 'informado') || 'calculado',
      caracteristica,
      ocorrencia_pagamento: ocorrenciaPagamento,
      compor_principal: true,
      zerar_valor_negativo: false,
      dobrar_valor_devido: false,
      periodo_inicio: v.periodo_inicio || '',
      periodo_fim: v.periodo_fim || '',
      base_calculo: {
        historicos: bcHistoricos,
        verbas: bcVerbas,
        tabelas: bcTabelas,
        proporcionalizar: bcProporcionalizar,
        integralizar: bcIntegralizar,
      },
      tipo_divisor: 'informado' as const,
      divisor_informado: v.divisor_informado || 1,
      multiplicador: v.multiplicador || 1,
      tipo_quantidade: caracteristica === '13_salario' || caracteristica === 'ferias' ? 'avos' as const : 'informada' as const,
      quantidade_informada: 1,
      quantidade_proporcionalizar: false,
      exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
      valor_informado_devido: v.valor_informado_devido ?? undefined,
      valor_informado_pago: v.valor_informado_pago ?? undefined,
      incidencias,
      juros_ajuizamento: 'ocorrencias_vencidas' as const,
      verba_principal_id: v.verba_principal_id ?? undefined,
      gerar_verba_reflexa: 'diferenca' as const,
      gerar_verba_principal: 'diferenca' as const,
      ordem: v.ordem || 0,
    };
  });
}

function toEngineCartaoPonto(cp: PjecalcCartaoPontoRow[]): PjeCartaoPonto[] {
  return cp.map(c => ({
    competencia: c.competencia,
    dias_uteis: c.dias_uteis || 0,
    dias_trabalhados: c.dias_trabalhados || 0,
    horas_extras_50: c.horas_extras_50 || 0,
    horas_extras_100: c.horas_extras_100 || 0,
    horas_noturnas: c.horas_noturnas || 0,
    intervalo_suprimido: c.intervalo_suprimido || 0,
    dsr_horas: c.dsr_horas || 0,
    sobreaviso: c.sobreaviso || 0,
  }));
}

function toEngineFgtsConfig(cfg: PjecalcFgtsConfigRow | null): PjeFGTSConfig {
  return {
    apurar: cfg?.habilitado ?? true,
    destino: 'pagar_reclamante',
    compor_principal: false,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: cfg?.percentual_multa ?? 40,
    multa_base: 'diferenca',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
  };
}

function toEngineCsConfig(cfg: PjecalcCsConfigRow | null): PjeCSConfig {
  return {
    apurar_segurado: cfg?.habilitado ?? true,
    cobrar_reclamante: cfg?.cobrar_reclamante ?? true,
    cs_sobre_salarios_pagos: cfg?.cs_sobre_salarios_pagos ?? false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'fixa',
    aliquota_empresa_fixa: cfg?.aliquota_empresa ?? 20,
    aliquota_sat_fixa: cfg?.aliquota_sat ?? 2,
    aliquota_terceiros_fixa: cfg?.aliquota_terceiros ?? 5.8,
    periodos_simples: [],
  };
}

function toEngineIrConfig(cfg: PjecalcIrConfigRow | null): PjeIRConfig {
  return {
    apurar: cfg?.habilitado ?? true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: true,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: cfg?.dependentes ?? 0,
  };
}

function toEngineCorrecaoConfig(
  cfg: PjecalcCorrecaoConfigRow | null,
  atualizacaoConfig: svc.PjecalcAtualizacaoConfigRow[] = [],
): PjeCorrecaoConfig {
  let combinacoes_indice: PjeCorrecaoConfig['combinacoes_indice'];
  let combinacoes_juros: PjeCorrecaoConfig['combinacoes_juros'];

  const correcaoRow = atualizacaoConfig.find(a => a.tipo === 'correcao');
  if (correcaoRow?.combinacoes_indice) {
    try {
      const parsed = typeof correcaoRow.combinacoes_indice === 'string'
        ? JSON.parse(correcaoRow.combinacoes_indice)
        : correcaoRow.combinacoes_indice;
      combinacoes_indice = parsed;
    } catch (e) { console.warn('[ORCHESTRATOR] Falha ao parsear combinacoes_indice JSON:', e); }
  }
  if (correcaoRow?.combinacoes_juros) {
    try {
      const parsed = typeof correcaoRow.combinacoes_juros === 'string'
        ? JSON.parse(correcaoRow.combinacoes_juros)
        : correcaoRow.combinacoes_juros;
      combinacoes_juros = parsed;
    } catch (e) { console.warn('[ORCHESTRATOR] Falha ao parsear combinacoes_juros JSON:', e); }
  }

  const jurosRow = atualizacaoConfig.find(a => a.tipo === 'juros');
  if (!combinacoes_juros && jurosRow?.regimes) {
    const regimes = jurosRow.regimes as Record<string, unknown>;
    if (Array.isArray(regimes.combinacoes)) {
      combinacoes_juros = regimes.combinacoes;
    }
  }

  // CRITICAL: data_liquidacao MUST be deterministic — NEVER use new Date()
  const dataLiq = cfg?.data_liquidacao;
  if (!dataLiq) {
    console.error('[ORCHESTRATOR] CRITICAL: data_liquidacao not set in correcaoConfig — calculation will NOT be deterministic');
  }

  // FIX AUDIT-001: Read juros_apos_deducao_cs from atualizacaoConfig instead of hardcoding true.
  let jurosAposCS = true; // default PJe-Calc behavior (Critério 8)
  const correcaoRowForJuros = atualizacaoConfig.find(a => a.tipo === 'correcao');
  if (correcaoRowForJuros?.regimes && typeof correcaoRowForJuros.regimes === 'object') {
    const regimes = correcaoRowForJuros.regimes as Record<string, unknown>;
    if (regimes.juros_apos_deducao_cs !== undefined) {
      jurosAposCS = !!regimes.juros_apos_deducao_cs;
    }
  }

  return {
    indice: cfg?.indice || 'IPCA-E',
    epoca: (cfg?.epoca as 'mensal' | 'fixo') || 'mensal',
    juros_tipo: (cfg?.juros_tipo as 'simples_mensal' | 'selic' | 'nenhum' | 'composto') || 'simples_mensal',
    juros_percentual: cfg?.juros_percentual ?? 1,
    juros_inicio: (cfg?.juros_inicio as 'ajuizamento' | 'citacao' | 'vencimento') || 'ajuizamento',
    multa_523: cfg?.multa_523 ?? false,
    multa_523_percentual: cfg?.multa_523_percentual ?? 10,
    data_liquidacao: dataLiq || new Date().toISOString().slice(0, 10),
    combinacoes_indice,
    combinacoes_juros,
    juros_apos_deducao_cs: jurosAposCS,
  };
}

function toEngineHonorariosConfig(cfg: PjecalcHonorariosRow | null): PjeHonorariosConfig {
  return {
    apurar_sucumbenciais: !!cfg,
    percentual_sucumbenciais: cfg?.percentual ?? 15,
    base_sucumbenciais: (cfg?.sobre as 'condenacao' | 'causa' | 'proveito') || 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
  };
}

function toEngineCustasConfig(cfg: PjecalcCustasConfigRow | null): PjeCustasConfig {
  return {
    apurar: !!cfg,
    percentual: cfg?.percentual ?? 2,
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
    itens: [],
  };
}

// =====================================================
// EXECUTION RESULT
// =====================================================

export interface OrchestratorResult {
  result: PjeLiquidacaoResult;
  fingerprint: EngineExecutionFingerprint;
  persistedAt: string;
  /** Canonical input validation result — shows completeness and blockers */
  inputValidation?: InputValidationResult;
  /** Confidence report — per-module scoring */
  confidenceReport?: ConfidenceReport;
  /** Resolved canonical input (for audit/comparison) */
  canonicalInput?: CanonicalCaseInput;
}

// =====================================================
// DB LOADERS: INSS faixas, IR faixas, feriados
// =====================================================

async function loadINSSFaixas(): Promise<PjeINSSFaixaRow[]> {
  try {
    const rows = await svc.getInssFaixas();
    if (rows.length === 0) {
      console.warn('[ORCHESTRATOR] No INSS faixas in DB — using default 2025 tables');
      return [];
    }
    console.log(`[ORCHESTRATOR] Loaded ${rows.length} INSS faixas from DB`);
    return rows.map(r => ({
      competencia_inicio: String(r.competencia_inicio || ''),
      competencia_fim: r.competencia_fim ? String(r.competencia_fim) : null,
      faixa: Number(r.faixa || 0),
      valor_ate: Number(r.valor_ate || 0),
      aliquota: Number(r.aliquota || 0),
    }));
  } catch (e) {
    console.warn('[ORCHESTRATOR] Failed to load INSS faixas:', e);
    return [];
  }
}

async function loadIRFaixas(): Promise<PjeIRFaixaRow[]> {
  try {
    const rows = await svc.getIrFaixas();
    if (rows.length === 0) {
      console.warn('[ORCHESTRATOR] No IR faixas in DB — using default 2025 tables');
      return [];
    }
    console.log(`[ORCHESTRATOR] Loaded ${rows.length} IR faixas from DB`);
    return rows.map(r => ({
      competencia_inicio: String(r.competencia_inicio || ''),
      competencia_fim: r.competencia_fim ? String(r.competencia_fim) : null,
      faixa: Number(r.faixa || 0),
      valor_ate: Number(r.valor_ate || 0),
      aliquota: Number(r.aliquota || 0),
      deducao: Number(r.deducao || 0),
      deducao_dependente: Number(r.deducao_dependente || 0),
    }));
  } catch (e) {
    console.warn('[ORCHESTRATOR] Failed to load IR faixas:', e);
    return [];
  }
}

async function loadFeriados(): Promise<PjeFeriadoDB[]> {
  try {
    const rows = await svc.getFeriados();
    if (rows.length === 0) return [];
    console.log(`[ORCHESTRATOR] Loaded ${rows.length} feriados from DB`);
    return rows.map(r => ({
      data: String(r.data || ''),
      nome: String(r.nome || ''),
      tipo: (r.tipo as 'nacional' | 'estadual' | 'municipal' | 'facultativo') || 'nacional',
      uf: r.uf ? String(r.uf) : undefined,
      municipio: r.municipio ? String(r.municipio) : undefined,
    }));
  } catch (e) {
    console.warn('[ORCHESTRATOR] Failed to load feriados:', e);
    return [];
  }
}

async function loadPensaoConfig(caseId: string): Promise<PjePensaoConfig> {
  try {
    const cfg = await svc.getPensaoConfig(caseId);
    if (!cfg) return { apurar: false, percentual: 0, base: 'liquido' };
    return {
      apurar: !!cfg.apurar,
      percentual: Number(cfg.percentual || 0),
      valor_fixo: cfg.valor_fixo ? Number(cfg.valor_fixo) : undefined,
      base: (cfg.base_incidencia as 'liquido' | 'bruto' | 'bruto_menos_inss') || 'liquido',
    };
  } catch { return { apurar: false, percentual: 0, base: 'liquido' }; }
}

async function loadPrevPrivadaConfig(caseId: string): Promise<PjePrevidenciaPrivadaConfig> {
  try {
    const cfg = await svc.getPrevPrivConfig(caseId);
    if (!cfg) return { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false };
    return {
      apurar: !!cfg.apurar,
      percentual: Number(cfg.percentual_empregado || 0),
      base_calculo: (cfg.base_calculo as 'diferenca' | 'devido' | 'corrigido') || 'diferenca',
      deduzir_ir: !!cfg.deduzir_ir,
    };
  } catch { return { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false }; }
}

async function loadSalarioFamiliaConfig(caseId: string): Promise<PjeSalarioFamiliaConfig> {
  try {
    const cfg = await svc.getSalarioFamiliaConfig(caseId);
    if (!cfg) return { apurar: false, numero_filhos: 0 };
    return {
      apurar: !!cfg.apurar,
      numero_filhos: Number(cfg.numero_filhos || 0),
    };
  } catch { return { apurar: false, numero_filhos: 0 }; }
}

async function loadIndicesDB(): Promise<PjeIndiceRow[]> {
  try {
    const { data: indicesData } = await supabase
      .from('pjecalc_correcao_monetaria' as any)
      .select('indice, competencia, valor, acumulado')
      .order('indice')
      .order('competencia');
    if (indicesData && indicesData.length > 0) {
      const result = (indicesData as any[]).map(r => ({
        indice: r.indice,
        competencia: r.competencia,
        valor: Number(r.valor),
        acumulado: Number(r.acumulado),
      }));
      console.log(`[ORCHESTRATOR] Loaded ${result.length} correction indices from DB`);
      return result;
    }
    console.warn('[ORCHESTRATOR] No correction indices found in DB — fallback rates will be used');
    return [];
  } catch (e) {
    console.warn('[ORCHESTRATOR] Failed to load correction indices:', e);
    return [];
  }
}

async function loadSeguroDesempregoDB(): Promise<import('./engine-types').PjeSeguroDesempregoDB[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_seguro_desemprego' as any)
      .select('competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto')
      .order('competencia', { ascending: false })
      .order('faixa');
    if (data && data.length > 0) {
      console.log(`[ORCHESTRATOR] Loaded ${data.length} seguro-desemprego faixas from DB`);
      return (data as any[]).map(r => ({
        competencia: r.competencia, faixa: Number(r.faixa),
        valor_inicial: Number(r.valor_inicial), valor_final: Number(r.valor_final),
        percentual: Number(r.percentual), valor_soma: Number(r.valor_soma),
        valor_piso: Number(r.valor_piso), valor_teto: Number(r.valor_teto),
      }));
    }
    return [];
  } catch { return []; }
}

async function loadSalarioFamiliaDBRows(): Promise<import('./engine-types').PjeSalarioFamiliaDB[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_salario_familia' as any)
      .select('competencia, faixa, valor_inicial, valor_final, valor_cota')
      .order('competencia', { ascending: false })
      .order('faixa');
    if (data && data.length > 0) {
      console.log(`[ORCHESTRATOR] Loaded ${data.length} salário-família faixas from DB`);
      return (data as any[]).map(r => ({
        competencia: r.competencia, faixa: Number(r.faixa),
        valor_inicial: Number(r.valor_inicial), valor_final: Number(r.valor_final),
        valor_cota: Number(r.valor_cota),
      }));
    }
    return [];
  } catch { return []; }
}


export async function executarLiquidacao(
  caseId: string,
  mode: 'manual' | 'auto' | 'seed' = 'manual'
): Promise<OrchestratorResult> {
  // 0. Import table validator
  const { validarTabelasHistoricas } = await import('./domain/table-validator');

  // 1. Load all case data in parallel
  const caseData = await svc.loadCaseData(caseId);

  if (!caseData.params) {
    throw new Error('Parâmetros do cálculo não encontrados. Preencha primeiro.');
  }

  // 2. Load historico ocorrencias + reference tables IN PARALLEL
  const [
    histOcorrencias,
    indicesDB,
    faixasINSSDB,
    faixasIRDB,
    feriadosDB,
    pensaoConfig,
    prevPrivadaConfig,
    salarioFamiliaConfig,
    seguroDesempregoDB,
    salarioFamiliaDB,
  ] = await Promise.all([
    svc.getHistoricoOcorrencias(caseId),
    loadIndicesDB(),
    loadINSSFaixas(),
    loadIRFaixas(),
    loadFeriados(),
    loadPensaoConfig(caseId),
    loadPrevPrivadaConfig(caseId),
    loadSalarioFamiliaConfig(caseId),
    loadSeguroDesempregoDB(),
    loadSalarioFamiliaDBRows(),
  ]);

  // 2.5. CANONICAL INPUT LAYER — Resolve, Validate, Score
  const canonicalInput = resolveCanonicalInput({
    params: caseData.params,
    dadosProcesso: (caseData as any).dadosProcesso || null,
    historicos: caseData.historicos,
    histOcorrencias,
    verbas: caseData.verbas,
    faltas: caseData.faltas,
    ferias: caseData.ferias,
    cartaoPonto: caseData.cartaoPonto,
    fgtsConfig: caseData.fgtsConfig,
    csConfig: caseData.csConfig,
    irConfig: caseData.irConfig,
    correcaoConfig: caseData.correcaoConfig,
    atualizacaoConfig: caseData.atualizacaoConfig || [],
    honorarios: caseData.honorarios,
    custasConfig: caseData.custasConfig,
    indicesDB,
    faixasINSSDB,
    faixasIRDB,
    feriadosDB,
    seguroDesempregoDB,
    salarioFamiliaDB,
    isPjcImport: false,
  });

  const inputValidation = validateCanonicalInput(canonicalInput);
  const confidenceReport = generateConfidenceReport(canonicalInput);

  console.log(`[ORCHESTRATOR] Canonical Input: completeness=${inputValidation.completenessScore}%, canProceed=${inputValidation.canProceed}, blockers=${inputValidation.blockers.length}, warnings=${inputValidation.warnings.length}`);
  console.log(`[ORCHESTRATOR] Confidence: overall=${confidenceReport.overall}%, status=${confidenceReport.status}`);
  
  for (const b of inputValidation.blockers) {
    console.error(`[ORCHESTRATOR] BLOCKER [${b.code}]: ${b.message}`);
  }
  for (const w of inputValidation.warnings) {
    console.warn(`[ORCHESTRATOR] WARNING [${w.code}]: ${w.message}`);
  }

  if (!inputValidation.canProceed && mode !== 'seed') {
    const blockReasons = inputValidation.blockers
      .map(b => `[${b.code}] ${b.message_friendly}`)
      .join('; ');
    throw new Error(`Cálculo bloqueado por insumos incompletos: ${blockReasons}`);
  }

  // 3. Convert to engine types
  const engineParams = toEngineParams(caseData.params);
  const engineFaltas = toEngineFaltas(caseData.faltas);
  const engineFerias = toEngineFerias(caseData.ferias);
  const engineCartao = toEngineCartaoPonto(caseData.cartaoPonto);

  // Build historicos with ocorrencias
  const engineHistoricos: PjeHistoricoSalarial[] = caseData.historicos.map(h => ({
    id: h.id,
    nome: h.nome,
    periodo_inicio: h.periodo_inicio || '',
    periodo_fim: h.periodo_fim || '',
    tipo_valor: (h.tipo_valor as 'informado' | 'calculado') || 'informado',
    valor_informado: h.valor_informado ?? undefined,
    incidencia_fgts: h.incidencia_fgts ?? true,
    incidencia_cs: h.incidencia_cs ?? true,
    fgts_recolhido: false,
    cs_recolhida: false,
    ocorrencias: histOcorrencias
      .filter(o => o.historico_id === h.id)
      .map(o => ({
        id: o.id,
        historico_id: o.historico_id,
        competencia: o.competencia,
        valor: o.valor,
        tipo: (o.tipo as 'calculado' | 'informado') || 'informado',
      })),
  }));

  let engineVerbas = toEngineVerbas(caseData.verbas);

  console.log(`[ORCHESTRATOR] Loaded ${engineVerbas.length} verbas from DB (principals: ${engineVerbas.filter(v => v.tipo === 'principal').length}, reflexas: ${engineVerbas.filter(v => v.tipo === 'reflexa').length})`);

  // ── Auto-generate reflexes if not already present ──
  const principalVerbas = engineVerbas.filter(v => v.tipo === 'principal');
  const existingReflexas = engineVerbas.filter(v => v.tipo === 'reflexa');
  
  const principalsWithReflexas = new Set(existingReflexas.map(r => r.verba_principal_id).filter(Boolean));
  const principalsSemReflexo = principalVerbas.filter(v => !principalsWithReflexas.has(v.id));

  if (principalsSemReflexo.length > 0) {
    console.log(`[ORCHESTRATOR] Auto-generating reflexes for ${principalsSemReflexo.length} principals without reflexes`);
    const verbasBase: VerbaBase[] = principalsSemReflexo.map(v => ({
      id: v.id,
      nome: v.nome,
      ordem: v.ordem,
      incidencias: {
        fgts: v.incidencias.fgts,
        irpf: v.incidencias.irpf,
        cs: v.incidencias.contribuicao_social,
      },
    }));

    const reflexosGerados = gerarReflexosPadrao(verbasBase);

    for (const rg of reflexosGerados) {
      const principalVerba = engineVerbas.find(v => v.id === rg.verba_principal_id);
      if (!principalVerba) continue;

      const reflexaVerba: PjeVerba = {
        id: `auto_${rg.verba_principal_id}_${rg.caracteristica}`,
        nome: rg.nome,
        tipo: 'reflexa',
        valor: 'calculado',
        caracteristica: rg.caracteristica as PjeVerba['caracteristica'],
        ocorrencia_pagamento: rg.ocorrencia_pagamento as PjeVerba['ocorrencia_pagamento'],
        compor_principal: true,
        zerar_valor_negativo: false,
        dobrar_valor_devido: false,
        periodo_inicio: principalVerba.periodo_inicio,
        periodo_fim: principalVerba.periodo_fim,
        base_calculo: {
          historicos: [],
          verbas: [rg.verba_principal_id],
          tabelas: [],
          proporcionalizar: false,
          integralizar: rg.integralizar_base || false,
        },
        tipo_divisor: rg.divisor_tipo as PjeVerba['tipo_divisor'],
        divisor_informado: rg.divisor_valor,
        multiplicador: rg.multiplicador,
        tipo_quantidade: rg.tipo_quantidade as PjeVerba['tipo_quantidade'],
        quantidade_informada: 1,
        quantidade_proporcionalizar: false,
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        incidencias: {
          fgts: rg.incidencias.fgts,
          irpf: rg.incidencias.irpf,
          contribuicao_social: rg.incidencias.cs,
          previdencia_privada: false,
          pensao_alimenticia: false,
        },
        juros_ajuizamento: 'ocorrencias_vencidas',
        verba_principal_id: rg.verba_principal_id,
        comportamento_reflexo: rg.comportamento_reflexo as PjeVerba['comportamento_reflexo'],
        periodo_media_reflexo: rg.periodo_media_reflexo as PjeVerba['periodo_media_reflexo'],
        gerar_verba_reflexa: rg.gerar_reflexo as PjeVerba['gerar_verba_reflexa'],
        gerar_verba_principal: rg.gerar_principal as PjeVerba['gerar_verba_principal'],
        fracao_mes_modo: rg.tratamento_fracao_mes as PjeVerba['fracao_mes_modo'],
        ordem: rg.ordem,
      };

      engineVerbas.push(reflexaVerba);
    }
  }
  const engineFgts = toEngineFgtsConfig(caseData.fgtsConfig);
  const engineCs = toEngineCsConfig(caseData.csConfig);
  const engineIr = toEngineIrConfig(caseData.irConfig);
  const engineCorrecao = toEngineCorrecaoConfig(caseData.correcaoConfig, caseData.atualizacaoConfig);
  const engineHonorarios = toEngineHonorariosConfig(caseData.honorarios);
  const engineCustas = toEngineCustasConfig(caseData.custasConfig);

  const engineSeguro: PjeSeguroConfig = { apurar: false, parcelas: 0, recebeu: false };

  // 3.5. PRE-CALCULATION TABLE VALIDATION — Block if essential tables missing
  const hasPrecomputed = engineVerbas.some(v => v.ocorrencias_precomputadas && v.ocorrencias_precomputadas.length > 0);
  const compInicio = engineParams.data_inicial || engineParams.data_admissao || '';
  const compFim = engineParams.data_final || engineParams.data_demissao || '';
  
  const tableValidation = validarTabelasHistoricas({
    competencia_inicio: compInicio.slice(0, 7),
    competencia_fim: compFim.slice(0, 7),
    indice_correcao: engineCorrecao.indice,
    indicesDB,
    faixasINSSDB,
    faixasIRDB,
    apurar_cs: engineCs.apurar_segurado,
    apurar_ir: engineIr.apurar,
    apurar_fgts: engineFgts.apurar,
    data_liquidacao: engineCorrecao.data_liquidacao,
    modo_precomputado: hasPrecomputed,
  });

  // Log validation results
  for (const err of tableValidation.errors) {
    console.error(`[ORCHESTRATOR] TABLE VALIDATION ${err.severity.toUpperCase()}: [${err.code}] ${err.message}`);
  }
  for (const warn of tableValidation.warnings) {
    console.warn(`[ORCHESTRATOR] TABLE VALIDATION ${warn.severity.toUpperCase()}: [${warn.code}] ${warn.message}`);
  }

  if (!tableValidation.can_proceed) {
    const blockReasons = tableValidation.errors
      .filter(e => e.severity === 'critical')
      .map(e => `[${e.code}] ${e.message_friendly}`)
      .join('; ');
    throw new Error(`Cálculo bloqueado por falta de dados essenciais: ${blockReasons}`);
  }

  console.log(`[ORCHESTRATOR] Table coverage: indices=${tableValidation.coverage.indices_coverage}%, INSS=${tableValidation.coverage.inss_coverage}%, IR=${tableValidation.coverage.ir_coverage}%`);

  // 4. Execute engine — ALL 21 constructor params populated
  console.log(`[ORCHESTRATOR] Engine inputs: ${indicesDB.length} indices, ${faixasINSSDB.length} INSS faixas, ${faixasIRDB.length} IR faixas, ${feriadosDB.length} feriados`);
  console.log(`[ORCHESTRATOR] CS config: apurar_segurado=${engineCs.apurar_segurado}, FGTS: apurar=${engineFgts.apurar}, data_liquidacao=${engineCorrecao.data_liquidacao}`);
  
  const engine = new PjeCalcEngine(
    engineParams, engineHistoricos, engineFaltas, engineFerias,
    engineVerbas, engineCartao, engineFgts, engineCs, engineIr,
    engineCorrecao, engineHonorarios, engineCustas, engineSeguro,
    indicesDB,           // 14: correction indices  
    faixasINSSDB,        // 15: INSS progressive brackets
    faixasIRDB,          // 16: IR brackets
    [],                  // 17: excecoesCargas (TODO: load from pjecalc_excecoes_carga when available)
    feriadosDB,          // 18: holidays
    prevPrivadaConfig,   // 19: previdência privada
    pensaoConfig,        // 20: pensão alimentícia
    salarioFamiliaConfig,// 21: salário família
    seguroDesempregoDB,  // 22: seguro-desemprego DB rows
    salarioFamiliaDB,    // 23: salário-família DB rows
    [],                  // 24: excecoesSabado (TODO: load from DB when available)
  );

  const result = engine.liquidar();

  // Log summary for debugging
  console.log(`[ORCHESTRATOR] Result: Bruto=${result.resumo.principal_corrigido}, Juros=${result.resumo.juros_mora}, CS_seg=${result.resumo.cs_segurado}, CS_emp=${result.resumo.cs_empregador}, FGTS=${result.resumo.fgts_total}, IR=${result.resumo.ir_retido}, Líquido=${result.resumo.liquido_reclamante}, Total_Reclamada=${result.resumo.total_reclamada}`);

  // 5. Generate fingerprint
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id || 'anonymous';

  const fingerprint: EngineExecutionFingerprint = {
    engine_version: ENGINE_VERSION,
    ruleset_version: RULESET_VERSION,
    tax_table_versions: {
      inss: faixasINSSDB.length > 0 ? 'db' : '2025.01',
      irrf: faixasIRDB.length > 0 ? 'db' : '2025.01',
      seguro: seguroDesempregoDB.length > 0 ? 'db' : '2025.01',
      salario_familia: salarioFamiliaDB.length > 0 ? 'db' : '2025.01',
    },
    index_series_version: indicesDB.length > 0 ? `db_${indicesDB.length}` : 'embedded',
    input_hash: simpleHash({
      params: caseData.params,
      faltas: caseData.faltas,
      ferias: caseData.ferias,
      historicos: caseData.historicos,
      verbas: caseData.verbas,
    }),
    facts_hash: simpleHash({ histOcorrencias }),
    calculation_profile_version: 'pjecalc-v3',
    execution_timestamp: new Date().toISOString(),
    execution_user: userId,
    execution_mode: mode,
  };

  // 6. Persist resultado
  await svc.upsertResultado({
    case_id: caseId,
    total_bruto: result.resumo.principal_bruto,
    total_liquido: result.resumo.liquido_reclamante,
    inss_segurado: result.resumo.cs_segurado,
    irrf: result.resumo.ir_retido,
    inss_patronal: result.resumo.cs_empregador,
    honorarios: result.resumo.honorarios_sucumbenciais + result.resumo.honorarios_contratuais,
    custas: result.resumo.custas,
    fgts_depositar: result.fgts.total_depositos,
    fgts_multa_40: result.fgts.multa_valor,
    total_reclamante: result.resumo.liquido_reclamante,
    total_reclamado: result.resumo.total_reclamada,
    resultado: {
      ...result as unknown as Record<string, unknown>,
      _fingerprint: fingerprint as unknown as Record<string, unknown>,
    },
    engine_version: ENGINE_VERSION,
  });

  // 7. Persist ocorrências
  await svc.deleteOcorrencias(caseId);
  
  for (const verba of result.verbas) {
    for (const oc of verba.ocorrencias) {
      await svc.insertOcorrencia({
        case_id: caseId,
        verba_id: verba.verba_id,
        verba_nome: verba.nome,
        competencia: oc.competencia,
        base_valor: oc.base,
        multiplicador_valor: oc.multiplicador,
        divisor_valor: oc.divisor,
        quantidade_valor: oc.quantidade,
        dobra: oc.dobra,
        devido: oc.devido,
        pago: oc.pago,
        diferenca: oc.diferenca,
        correcao: oc.valor_corrigido - oc.diferenca,
        juros: oc.juros,
        total: oc.valor_final,
        origem: 'CALCULADA',
        ativa: true,
      });
    }
  }

  return {
    result,
    fingerprint,
    persistedAt: new Date().toISOString(),
    inputValidation,
    confidenceReport,
    canonicalInput,
  };
}
