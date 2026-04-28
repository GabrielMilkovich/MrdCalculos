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
import { PjeCalcEngineV3 } from './engine-v3';
import type {
  PjeParametros,
  PjeHistoricoSalarial,
  PjeFalta,
  PjeFerias,
  PjeVerba,
  PjeCartaoPonto,
  PjeFGTSConfig,
  PjeCSConfig,
  PjeIRConfig,
  PjeCorrecaoConfig,
  PjeHonorariosConfig,
  PjeCustasConfig,
  PjeSeguroConfig,
  PjeLiquidacaoResult,
  PjeIndiceRow,
  PjeINSSFaixaRow,
  PjeIRFaixaRow,
  PjeFeriadoDB,
  PjeExcecaoCargaHoraria,
  PjePrevidenciaPrivadaConfig,
  PjePensaoConfig,
  PjeSalarioFamiliaConfig,
} from './engine-types';
import * as svc from './service';
import { verificarDesatualizacaoIndices, getUltimoMesDisponivel } from './indices-fallback';
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
  PjecalcDadosProcessoRow,
} from './types';
import { gerarReflexosPadrao, type VerbaBase, type ReflexoGerado } from './reflexo-engine';
import { logger } from '@/lib/logger';

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
    tipo_mes: (p.tipo_mes as 'civil' | 'comercial' | null | undefined) ?? 'comercial',
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

// Normalise DB enum values to engine enum values (case-insensitive)
function normalizeDivisorTipo(raw: string | null | undefined): PjeVerba['tipo_divisor'] {
  const map: Record<string, PjeVerba['tipo_divisor']> = {
    'INFORMADO': 'informado', 'OUTRO_VALOR': 'informado',
    'JORNADA': 'jornada', 'MENSAL': 'mensal', 'DIARIO': 'diario',
    'HORA': 'hora', 'MINUTO': 'minuto',
  };
  return map[(raw || '').toUpperCase()] ?? 'informado';
}

function normalizeQuantidadeTipo(raw: string | null | undefined, caracteristica: string): PjeVerba['tipo_quantidade'] {
  const map: Record<string, PjeVerba['tipo_quantidade']> = {
    'INFORMADA': 'informada', 'AVOS': 'avos', 'CALENDARIO': 'calendario',
    'REPOUSOS': 'repousos', 'CARTAO_HORAS': 'cartao_horas',
    'CARTAO_DIAS': 'cartao_dias', 'MEDIA_APURADA': 'media_apurada',
  };
  const fromDB = map[(raw || '').toUpperCase()];
  if (fromDB) return fromDB;
  // Fallback: infer from caracteristica when DB not populated
  if (caracteristica === '13_salario' || caracteristica === 'ferias') return 'avos';
  return 'informada';
}

function normalizeComportamento(raw: string | null | undefined): PjeVerba['comportamento_reflexo'] {
  const map: Record<string, PjeVerba['comportamento_reflexo']> = {
    'VALOR_MENSAL': 'valor_mensal', 'MEDIA_VALOR_ABSOLUTO': 'media_valor_absoluto',
    'MEDIA_VALOR_CORRIGIDO': 'media_valor_corrigido', 'MEDIA_QUANTIDADE': 'media_quantidade',
    'MEDIA_PELA_QUANTIDADE': 'media_pela_quantidade',
  };
  return map[(raw || '').toUpperCase()] ?? 'valor_mensal';
}

function normalizeGerarVerba(raw: string | null | undefined): 'diferenca' | 'devido' {
  return (raw || '').toUpperCase() === 'DEVIDO' ? 'devido' : 'diferenca';
}

function normalizeFracaoMes(raw: string | null | undefined): PjeVerba['fracao_mes_modo'] {
  const map: Record<string, PjeVerba['fracao_mes_modo']> = {
    'MANTER_FRACAO': 'manter_fracao', 'INTEGRALIZAR': 'integralizar',
    'DESPREZAR': 'desprezar', 'DESPREZAR_MENOR_15': 'desprezar_menor_15',
  };
  return map[(raw || '').toUpperCase()] ?? 'manter_fracao';
}

function toEngineVerbas(
  verbas: PjecalcVerbaRow[],
  historicosDisponiveis: PjecalcHistoricoSalarialRow[] = [],
): PjeVerba[] {
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
      const alvo = v.hist_salarial_nome.trim().toLowerCase();
      // 1) Match exato (case-insensitive)
      let resolved = historicosDisponiveis.find(
        h => (h.nome || '').trim().toLowerCase() === alvo,
      );
      // 2) Match parcial (startsWith) como fallback
      if (!resolved) {
        resolved = historicosDisponiveis.find(
          h => (h.nome || '').trim().toLowerCase().startsWith(alvo),
        );
      }
      if (resolved) {
        bcHistoricos = [resolved.id];
      } else {
        logger.warn(
          `[ORCHESTRATOR] hist_salarial_nome "${v.hist_salarial_nome}" não encontrado em historicos disponíveis — usando fallback por nome (pode resultar em base 0).`,
        );
        bcHistoricos = [v.hist_salarial_nome];
      }
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

    // Read engine-critical fields from DB (now exposed via view after migration 20260327000010)
    const tipoDivisor = normalizeDivisorTipo(v.divisor_tipo);
    const tipoQuantidade = normalizeQuantidadeTipo(v.quantidade_tipo, caracteristica);
    const fracaoMesModo = normalizeFracaoMes(v.fracao_mes_modo);
    const comportamentoReflexa = v.comportamento_reflexo
      ? normalizeComportamento(v.comportamento_reflexo)
      : undefined;
    const periodoMediaReflexa = v.periodo_media_reflexo as PjeVerba['periodo_media_reflexo'] | undefined;

    return {
      id: v.id,
      nome: v.nome,
      tipo: (v.tipo === 'reflexa' ? 'reflexa' : 'principal') as 'principal' | 'reflexa',
      valor: (v.valor as 'calculado' | 'informado') || 'calculado',
      caracteristica,
      ocorrencia_pagamento: ocorrenciaPagamento,
      compor_principal: v.compor_principal !== false,
      zerar_valor_negativo: false,
      dobrar_valor_devido: v.dobrar_valor_devido === true,
      periodo_inicio: v.periodo_inicio || '',
      periodo_fim: v.periodo_fim || '',
      base_calculo: {
        historicos: bcHistoricos,
        verbas: bcVerbas,
        tabelas: bcTabelas,
        proporcionalizar: bcProporcionalizar,
        integralizar: bcIntegralizar,
      },
      tipo_divisor: tipoDivisor,
      divisor_informado: v.divisor_informado || 1,
      multiplicador: v.multiplicador || 1,
      tipo_quantidade: tipoQuantidade,
      quantidade_informada: v.quantidade_valor ?? 1,
      quantidade_proporcionalizar: v.quantidade_proporcionalizar === true,
      fracao_mes_modo: fracaoMesModo,
      exclusoes: {
        faltas_justificadas: v.excluir_falta_justificada === true,
        faltas_nao_justificadas: v.excluir_falta_nao_justificada === true,
        ferias_gozadas: v.excluir_ferias_gozadas === true,
      },
      valor_informado_devido: v.valor_informado_devido ?? undefined,
      valor_informado_pago: v.valor_informado_pago ?? undefined,
      incidencias,
      juros_ajuizamento: 'ocorrencias_vencidas' as const,
      verba_principal_id: v.verba_principal_id ?? undefined,
      gerar_verba_reflexa: normalizeGerarVerba(v.gerar_reflexo),
      gerar_verba_principal: normalizeGerarVerba(v.gerar_principal),
      comportamento_reflexo: comportamentoReflexa,
      periodo_media_reflexo: periodoMediaReflexa,
      hora_noturna_ficticia: v.hora_noturna_ficticia === true,
      constante_mensal: v.constante_mensal ?? undefined,
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
  // Support both old (habilitado/percentual_multa) and new column names
  const apurar = cfg?.apurar ?? cfg?.habilitado ?? true;
  const multaPercentual = cfg?.multa_percentual ?? cfg?.percentual_multa ?? 40;
  const saldosSaques = Array.isArray(cfg?.saldos_saques) ? cfg!.saldos_saques : [];
  return {
    apurar,
    destino: (cfg?.destino as PjeFGTSConfig['destino']) ?? 'pagar_reclamante',
    compor_principal: cfg?.compor_principal ?? false,
    multa_apurar: cfg?.multa_apurar ?? true,
    multa_tipo: (cfg?.multa_tipo as PjeFGTSConfig['multa_tipo']) ?? 'calculada',
    multa_percentual: multaPercentual,
    multa_base: (cfg?.multa_base as PjeFGTSConfig['multa_base']) ?? 'diferenca',
    multa_valor_informado: cfg?.multa_valor_informado ?? undefined,
    saldos_saques: saldosSaques as any,
    deduzir_saldo: cfg?.deduzir_saldo ?? false,
    lc110_10: cfg?.lc110_10 ?? false,
    lc110_05: cfg?.lc110_05 ?? false,
  };
}

function toEngineCsConfig(cfg: PjecalcCsConfigRow | null): PjeCSConfig {
  // Support both old (habilitado/aliquota_empresa) and new column names
  const apurarSegurado = cfg?.apurar_segurado ?? cfg?.habilitado ?? true;
  const aliqEmpresa = cfg?.aliquota_empresa_fixa ?? cfg?.aliquota_empresa ?? 20;
  const aliqSat = cfg?.aliquota_sat_fixa ?? cfg?.aliquota_sat ?? 2;
  const aliqTerceiros = cfg?.aliquota_terceiros_fixa ?? cfg?.aliquota_terceiros ?? 5.8;
  return {
    apurar_segurado: apurarSegurado,
    cobrar_reclamante: cfg?.cobrar_reclamante ?? true,
    cs_sobre_salarios_pagos: cfg?.cs_sobre_salarios_pagos ?? false,
    aliquota_segurado_tipo: (cfg?.aliquota_segurado_tipo as PjeCSConfig['aliquota_segurado_tipo']) ?? 'empregado',
    aliquota_segurado_fixa: cfg?.aliquota_segurado_fixa ?? undefined,
    limitar_teto: cfg?.limitar_teto ?? true,
    apurar_empresa: cfg?.apurar_empresa ?? true,
    apurar_sat: cfg?.apurar_sat ?? true,
    apurar_terceiros: cfg?.apurar_terceiros ?? true,
    aliquota_empregador_tipo: 'fixa',
    aliquota_empresa_fixa: aliqEmpresa,
    aliquota_sat_fixa: aliqSat,
    aliquota_terceiros_fixa: aliqTerceiros,
    periodos_simples: Array.isArray(cfg?.periodos_simples) ? cfg!.periodos_simples as PjeCSConfig['periodos_simples'] : [],
    contribuicao_sindical: cfg?.contribuicao_sindical ?? false,
    contribuicao_sindical_pos2017: cfg?.contribuicao_sindical_pos2017 ?? false,
    fpas_code: (cfg as unknown as Record<string, unknown> | null)?.fpas_code as string | undefined,
  };
}

function toEngineIrConfig(cfg: PjecalcIrConfigRow | null): PjeIRConfig {
  // Support both old (habilitado) and new column names (apurar)
  const apurar = cfg?.apurar ?? cfg?.habilitado ?? true;
  return {
    apurar,
    incidir_sobre_juros: cfg?.incidir_sobre_juros ?? false,
    cobrar_reclamado: cfg?.cobrar_reclamado ?? false,
    tributacao_exclusiva_13: cfg?.tributacao_exclusiva_13 ?? true,
    tributacao_separada_ferias: cfg?.tributacao_separada_ferias ?? true,
    deduzir_cs: cfg?.deduzir_cs ?? true,
    deduzir_prev_privada: cfg?.deduzir_prev_privada ?? false,
    deduzir_pensao: cfg?.deduzir_pensao ?? false,
    deduzir_honorarios: cfg?.deduzir_honorarios ?? false,
    aposentado_65: cfg?.aposentado_65 ?? false,
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
    } catch (e) { logger.warn('[ORCHESTRATOR] Falha ao parsear combinacoes_indice JSON', { error: e }); }
  }
  if (correcaoRow?.combinacoes_juros) {
    try {
      const parsed = typeof correcaoRow.combinacoes_juros === 'string'
        ? JSON.parse(correcaoRow.combinacoes_juros)
        : correcaoRow.combinacoes_juros;
      combinacoes_juros = parsed;
    } catch (e) { logger.warn('[ORCHESTRATOR] Falha ao parsear combinacoes_juros JSON', { error: e }); }
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
    throw new Error(
      'data_liquidacao não definida: preencha o campo "Data de Liquidação" na aba de Correção Monetária ' +
      'para garantir que o cálculo seja determinístico e reprodutível. ' +
      'Usar a data atual como fallback produziria resultados diferentes a cada execução, ' +
      'o que é inaceitável em cálculo judicial.'
    );
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
    data_liquidacao: dataLiq,
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
  /** Orchestrator-level warnings (non-blocking) emitted during the run */
  warnings?: Array<{ code: string; message: string }>;
}

// =====================================================
// DB LOADERS: INSS faixas, IR faixas, feriados
// =====================================================

async function loadINSSFaixas(): Promise<PjeINSSFaixaRow[]> {
  try {
    const rows = await svc.getInssFaixas();
    if (rows.length === 0) {
      logger.warn('[ORCHESTRATOR] No INSS faixas in DB — using default 2025 tables');
      return [];
    }
    return rows.map(r => ({
      competencia_inicio: String(r.competencia_inicio || ''),
      competencia_fim: r.competencia_fim ? String(r.competencia_fim) : null,
      faixa: Number(r.faixa || 0),
      valor_ate: Number(r.valor_ate || 0),
      aliquota: Number(r.aliquota || 0),
    }));
  } catch (e) {
    logger.error('[ORCHESTRATOR] Failed to load INSS faixas', e);
    throw e; // MUST throw — empty faixas silently causes wrong CS calculations
  }
}

async function loadIRFaixas(): Promise<PjeIRFaixaRow[]> {
  try {
    const rows = await svc.getIrFaixas();
    if (rows.length === 0) {
      logger.warn('[ORCHESTRATOR] No IR faixas in DB — using default 2025 tables');
      return [];
    }
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
    logger.error('[ORCHESTRATOR] Failed to load IR faixas', e);
    throw e; // MUST throw — empty faixas silently causes wrong IR calculations
  }
}

async function loadFeriados(): Promise<PjeFeriadoDB[]> {
  try {
    const rows = await svc.getFeriados();
    if (rows.length === 0) return [];
    return rows.map(r => ({
      data: String(r.data || ''),
      nome: String(r.nome || ''),
      tipo: (r.tipo as 'nacional' | 'estadual' | 'municipal' | 'facultativo') || 'nacional',
      uf: r.uf ? String(r.uf) : undefined,
      municipio: r.municipio ? String(r.municipio) : undefined,
    }));
  } catch (e) {
    logger.error('[ORCHESTRATOR] Failed to load feriados', e);
    throw e; // MUST throw — missing feriados causes wrong dias_uteis calculations
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
  } catch (err: any) {
    // "No rows" is expected — pensao may not be configured
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
      return { apurar: false, percentual: 0, base: 'liquido' };
    }
    logger.error('[ORCHESTRATOR] Erro inesperado em loadPensaoConfig', err);
    throw err;
  }
}

async function loadPrevPrivadaConfig(caseId: string): Promise<PjePrevidenciaPrivadaConfig> {
  try {
    const cfg = await svc.getPrevPrivConfig(caseId);
    if (!cfg) return { apurar: false, percentual: 0, base_calculo: 'diferenca' };
    return {
      apurar: !!cfg.apurar,
      percentual: Number(cfg.percentual_empregado || 0),
      base_calculo: (cfg.base_calculo as 'diferenca' | 'devido' | 'corrigido') || 'diferenca',
    };
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
      return { apurar: false, percentual: 0, base_calculo: 'diferenca' };
    }
    logger.error('[ORCHESTRATOR] Erro inesperado em loadPrevPrivadaConfig', err);
    throw err;
  }
}

async function loadSalarioFamiliaConfig(caseId: string): Promise<PjeSalarioFamiliaConfig> {
  try {
    const cfg = await svc.getSalarioFamiliaConfig(caseId);
    if (!cfg) return { apurar: false, numero_filhos: 0 };
    return {
      apurar: !!cfg.apurar,
      numero_filhos: Number(cfg.numero_filhos || 0),
    };
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
      return { apurar: false, numero_filhos: 0 };
    }
    logger.error('[ORCHESTRATOR] Erro inesperado em loadSalarioFamiliaConfig', err);
    throw err;
  }
}

async function loadIndicesDB(): Promise<PjeIndiceRow[]> {
  try {
    const { data: indicesData } = await supabase
      .from('pjecalc_correcao_monetaria')
      .select('indice, competencia, valor, acumulado')
      .order('indice')
      .order('competencia');
    if (indicesData && indicesData.length > 0) {
      const result = indicesData.map(r => ({
        indice: r.indice,
        competencia: r.competencia,
        valor: Number(r.valor),
        acumulado: Number(r.acumulado),
      }));
      return result;
    }
    logger.warn('[ORCHESTRATOR] No correction indices found in DB — fallback rates will be used');
    return [];
  } catch (e) {
    logger.error('[ORCHESTRATOR] Failed to load correction indices', e);
    throw e; // MUST throw — empty indices silently causes wrong monetary correction
  }
}

async function loadSeguroConfig(caseId: string): Promise<{ apurar: boolean; parcelas: number; recebeu: boolean; valor_parcela?: number } | null> {
  try {
    const data = await svc.getSeguroConfig(caseId);
    if (!data) return null;
    return {
      apurar: (data.apurar as boolean) ?? false,
      parcelas: (data.parcelas as number) ?? 5,
      recebeu: (data.recebeu as boolean) ?? false,
      valor_parcela: data.valor_parcela ? Number(data.valor_parcela) : undefined,
    };
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    logger.error('[ORCHESTRATOR] Erro inesperado em loadSeguroConfig', err);
    throw err;
  }
}

export async function loadSeguroDesempregoDB(): Promise<import('./engine-types').PjeSeguroDesempregoDB[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_seguro_desemprego')
      .select('competencia, faixa, valor_inicial, valor_final, percentual, valor_soma, valor_piso, valor_teto')
      .order('competencia', { ascending: false })
      .order('faixa');
    if (data && data.length > 0) {
      return data.map(r => ({
        competencia: r.competencia, faixa: Number(r.faixa),
        valor_inicial: Number(r.valor_inicial), valor_final: Number(r.valor_final),
        percentual: Number(r.percentual), valor_soma: Number(r.valor_soma),
        valor_piso: Number(r.valor_piso), valor_teto: Number(r.valor_teto),
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    logger.error('[ORCHESTRATOR] Erro inesperado em loadSeguroDesempregoDB', err);
    throw err;
  }
}

export async function loadSalarioMinimoDB(): Promise<import('./engine-types').PjeSalarioMinimoRow[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_salario_minimo')
      .select('competencia, valor')
      .order('competencia', { ascending: true });
    if (data && data.length > 0) {
      return data.map(r => ({
        competencia: r.competencia,
        valor: Number(r.valor),
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    logger.error('[ORCHESTRATOR] Erro inesperado em loadSalarioMinimoDB', err);
    throw err;
  }
}

async function loadExcecoesCarga(caseId: string): Promise<import('./engine-types').PjeExcecaoCargaHoraria[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_excecoes_carga' as any)
      .select('id, periodo_inicio, periodo_fim, carga_horaria_mensal')
      .eq('case_id', caseId);
    if (data && data.length > 0) {
      return (data as unknown as { periodo_inicio: string; periodo_fim: string; carga_horaria_mensal: number }[]).map(r => ({
        data_inicial: r.periodo_inicio,
        data_final: r.periodo_fim,
        carga_horaria: Number(r.carga_horaria_mensal),
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    logger.error('[ORCHESTRATOR] Erro inesperado em loadExcecoesCarga', err);
    throw err;
  }
}

export async function loadExcecoesSabado(caseId: string): Promise<import('./engine-types').PjeExcecaoSabado[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_excecoes_sabado' as any)
      .select('id, data_inicio, data_fim, sabado_dia_util')
      .eq('case_id', caseId);
    if (data && data.length > 0) {
      return (data as unknown as { data_inicio: string; data_fim: string; sabado_dia_util: boolean }[]).map(r => ({
        data_inicial: r.data_inicio,
        data_final: r.data_fim,
        sabado_dia_util: Boolean(r.sabado_dia_util),
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    logger.error('[ORCHESTRATOR] Erro inesperado em loadExcecoesSabado', err);
    throw err;
  }
}

export async function loadSalarioFamiliaDBRows(): Promise<import('./engine-types').PjeSalarioFamiliaDB[]> {
  try {
    const { data } = await supabase
      .from('pjecalc_salario_familia')
      .select('competencia, faixa, valor_inicial, valor_final, valor_cota')
      .order('competencia', { ascending: false })
      .order('faixa');
    if (data && data.length > 0) {
      return data.map(r => ({
        competencia: r.competencia, faixa: Number(r.faixa),
        valor_inicial: Number(r.valor_inicial), valor_final: Number(r.valor_final),
        valor_cota: Number(r.valor_cota),
      }));
    }
    return [];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    logger.error('[ORCHESTRATOR] Erro inesperado em loadSalarioFamiliaDBRows', err);
    throw err;
  }
}


// =====================================================
// MULTAS CONFIG → ENGINE VERBAS
// =====================================================

/**
 * Converts multas_config (persisted by ModuloMultasCLT) into PjeVerba entries
 * that the engine can process through its generic formula.
 *
 * Handles:
 * - Art. 467 CLT: 50% of uncontested amounts not paid at termination
 * - Art. 477 CLT: penalty for late payment of termination amounts (1 month salary)
 * - Generic multas/indenizações: each entry from multas_indenizacoes array
 */
function multasConfigToVerbas(
  multasConfig: import('./types').PjecalcMultasConfigRow | null,
  params: PjeParametros,
  historicos: PjeHistoricoSalarial[],
): PjeVerba[] {
  if (!multasConfig) return [];
  const cfg = multasConfig as unknown as Record<string, unknown>;
  const result: PjeVerba[] = [];

  // Get base salary from first historico for Art. 477
  const baseSalario = historicos.length > 0 ? (historicos[0].valor_informado || 0) : 0;
  const periodoFim = params.data_demissao || params.data_final || params.data_ajuizamento;
  const periodoInicio = params.data_admissao || params.data_inicial || '';

  const defaultVerba = (id: string, nome: string): PjeVerba => ({
    id,
    nome,
    tipo: 'principal',
    valor: 'informado',
    caracteristica: 'comum',
    ocorrencia_pagamento: 'desligamento',
    compor_principal: true,
    zerar_valor_negativo: false,
    dobrar_valor_devido: false,
    periodo_inicio: periodoFim || periodoInicio,
    periodo_fim: periodoFim || periodoInicio,
    base_calculo: { historicos: [], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    tipo_divisor: 'informado',
    divisor_informado: 1,
    multiplicador: 1,
    tipo_quantidade: 'informada',
    quantidade_informada: 1,
    quantidade_proporcionalizar: false,
    exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
    incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    juros_ajuizamento: 'ocorrencias_vencidas',
    gerar_verba_reflexa: 'diferenca',
    gerar_verba_principal: 'diferenca',
    ordem: 9000,
  });

  // Art. 467 CLT
  if (cfg.apurar_467) {
    const valor467 = Number(cfg.valor_467 || 0);
    if (valor467 > 0) {
      const v = defaultVerba('multa_467_auto', 'Multa Art. 467 CLT');
      v.valor_informado_devido = valor467;
      v.ordem = 9001;
      result.push(v);
    }
  }

  // Art. 477 CLT — 1 month salary as penalty for late termination payment
  if (cfg.apurar_477) {
    const tipo477 = (cfg.valor_477_tipo as string) || 'salario';
    let valor477 = 0;
    if (tipo477 === 'informado') {
      valor477 = Number(cfg.valor_477_informado || 0);
    } else {
      valor477 = baseSalario;
    }
    if (valor477 > 0) {
      const v = defaultVerba('multa_477_auto', 'Multa Art. 477 CLT');
      v.valor_informado_devido = valor477;
      v.ordem = 9002;
      result.push(v);
    }
  }

  // Generic multas/indenizações
  const multas = cfg.multas_indenizacoes;
  if (Array.isArray(multas)) {
    multas.forEach((m: Record<string, unknown>, idx: number) => {
      const descricao = String(m.descricao || `Multa/Indenização ${idx + 1}`);
      const valorTipo = String(m.valor_tipo || 'informado');
      const v = defaultVerba(`multa_ind_${idx}`, descricao);
      v.ordem = 9010 + idx;

      if (valorTipo === 'informado') {
        v.valor_informado_devido = Number(m.valor || 0);
      } else {
        // Calculated: use aliquota over base (principal)
        v.valor = 'calculado';
        v.multiplicador = Number(m.aliquota || 0) / 100;
        v.tipo_divisor = 'informado';
        v.divisor_informado = 1;
        // Base from historicos
        if (historicos.length > 0) {
          v.base_calculo.historicos = [historicos[0].id];
        }
      }

      // Incidence flags
      v.incidencias.irpf = !!(m.apurar_ir);

      if (m.vencimento) {
        v.periodo_inicio = String(m.vencimento);
        v.periodo_fim = String(m.vencimento);
      }

      result.push(v);
    });
  }

  // ── Periculosidade (Art. 193 CLT) ──
  if (cfg.periculosidade_config) {
    const pc = cfg.periculosidade_config as { ativo: boolean; percentual: string; periodo_inicio: string; periodo_fim: string; base_calculo: string };
    if (pc.ativo) {
      const v = defaultVerba('periculosidade_auto', 'Adicional de Periculosidade');
      v.valor = 'calculado';
      v.multiplicador = Number(pc.percentual || 30) / 100;
      v.periodo_inicio = pc.periodo_inicio || periodoInicio;
      v.periodo_fim = pc.periodo_fim || periodoFim;
      v.ocorrencia_pagamento = 'mensal';
      v.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (historicos.length > 0) v.base_calculo.historicos = [historicos[0].id];
      v.ordem = 9020;
      result.push(v);
    }
  }

  // ── Danos Morais (Art. 223-G CLT) ──
  if (cfg.danos_morais_config) {
    const dm = cfg.danos_morais_config as { ativo: boolean; valor: string; data_sentenca: string };
    if (dm.ativo && Number(dm.valor) > 0) {
      const v = defaultVerba('danos_morais_auto', 'Indenização por Danos Morais');
      v.valor_informado_devido = Number(dm.valor);
      v.periodo_inicio = dm.data_sentenca || periodoFim;
      v.periodo_fim = dm.data_sentenca || periodoFim;
      v.incidencias = { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
      v.ordem = 9030;
      result.push(v);
    }
  }

  // ── Equiparação Salarial (Art. 461 CLT) ──
  if (cfg.equiparacao_config) {
    const eq = cfg.equiparacao_config as {
      ativo: boolean;
      paradigma_nome: string;
      periodo_inicio: string;
      periodo_fim: string;
      salarios: Array<{ competencia: string; salario_paradigma: string; salario_empregado: string }>;
    };
    if (eq.ativo && Array.isArray(eq.salarios) && eq.salarios.length > 0) {
      eq.salarios.forEach((s, idx) => {
        const diferenca = Number(s.salario_paradigma || 0) - Number(s.salario_empregado || 0);
        if (diferenca > 0) {
          const v = defaultVerba(`equiparacao_auto_${idx}`, `Diferença Salarial - Equiparação ${eq.paradigma_nome || ''} (${s.competencia})`);
          v.valor_informado_devido = diferenca;
          v.periodo_inicio = s.competencia || eq.periodo_inicio || periodoInicio;
          v.periodo_fim = s.competencia || eq.periodo_fim || periodoFim;
          v.ocorrencia_pagamento = 'mensal';
          v.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
          v.ordem = 9040 + idx;
          result.push(v);
        }
      });
    }
  }

  // ── Estabilidade Provisória ──
  if (cfg.estabilidade_config) {
    const est = cfg.estabilidade_config as { ativo: boolean; tipo: string; periodo_inicio: string; periodo_fim: string };
    if (est.ativo && est.periodo_inicio && est.periodo_fim) {
      const v = defaultVerba('estabilidade_auto', `Indenização Estabilidade (${est.tipo || 'provisória'})`);
      v.valor = 'calculado';
      v.multiplicador = 1;
      v.periodo_inicio = est.periodo_inicio;
      v.periodo_fim = est.periodo_fim;
      v.ocorrencia_pagamento = 'mensal';
      v.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (historicos.length > 0) v.base_calculo.historicos = [historicos[0].id];
      v.ordem = 9050;
      result.push(v);
    }
  }

  return result;
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

  // ── Verificar desatualização dos índices ──
  const statusIndices = verificarDesatualizacaoIndices(
    caseData.params.data_liquidacao || new Date().toISOString().slice(0, 10)
  );
  if (statusIndices.bloqueante) {
    throw new Error(`[INDICES_DESATUALIZADOS] ${statusIndices.warnings.join(' | ')}`);
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
    salarioMinimoDB,
    excecoesCargaDB,
    excecoesSabadoDB,
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
    loadSalarioMinimoDB(),
    loadExcecoesCarga(caseId),
    loadExcecoesSabado(caseId),
  ]);

  // 2.5. CANONICAL INPUT LAYER — Resolve, Validate, Score
  const canonicalInput = resolveCanonicalInput({
    params: caseData.params,
    dadosProcesso: (caseData.dadosProcesso as PjecalcDadosProcessoRow | null) || null,
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

  for (const b of inputValidation.blockers) {
    logger.error(`[ORCHESTRATOR] BLOCKER [${b.code}]: ${b.message}`);
  }
  for (const w of inputValidation.warnings) {
    logger.warn(`[ORCHESTRATOR] WARNING [${w.code}]: ${w.message}`);
  }

  if (!inputValidation.canProceed && mode !== 'seed') {
    const blockReasons = inputValidation.blockers
      .map(b => `[${b.code}] ${b.message_friendly}`)
      .join('; ');
    throw new Error(`Cálculo bloqueado por insumos incompletos: ${blockReasons}`);
  }

  // 3. Convert to engine types
  const engineParams = toEngineParams(caseData.params);

  // Accumulator for orchestrator-level warnings (non-blocking, surfaced in the result)
  const orchestratorWarnings: Array<{ code: string; message: string }> = [];

  // Propagar data_citacao e modo_calculo de dadosProcesso → engine params
  // (a VIEW pjecalc_parametros não expõe esses campos; eles vivem em pjecalc_dados_processo)
  const dadosProcesso = caseData.dadosProcesso as PjecalcDadosProcessoRow | null;
  if (dadosProcesso?.data_citacao) {
    engineParams.data_citacao = dadosProcesso.data_citacao;
  }
  // modo_calculo agora tem coluna real — sem necessidade de cast
  const modoCalculo = dadosProcesso?.modo_calculo ?? 'independent';
  engineParams.modo_calculo = modoCalculo;

  // FIX UX: Quando data_citacao não for informada, não bloqueia — tenta fallback a partir de
  // data_ajuizamento + 60 dias; se também não houver ajuizamento, segue sem split IPCA-E/SELIC.
  if (!engineParams.data_citacao) {
    if (engineParams.data_ajuizamento) {
      const ajuiz = new Date(engineParams.data_ajuizamento);
      if (!isNaN(ajuiz.getTime())) {
        const estimada = new Date(ajuiz);
        estimada.setDate(estimada.getDate() + 60);
        engineParams.data_citacao = estimada.toISOString().slice(0, 10);
        const warn = {
          code: 'W_CITACAO_ESTIMADA',
          message: `data_citacao não informada — usando ajuizamento + 60 dias (${engineParams.data_citacao}) como estimativa. Preencha a data real para precisão máxima.`,
        };
        orchestratorWarnings.push(warn);
        logger.warn(`[ORCHESTRATOR] ${warn.code}: ${warn.message}`);
      }
    } else {
      const warn = {
        code: 'W_CITACAO_E_AJUIZAMENTO_AUSENTES',
        message: 'Datas processuais não informadas — correção monetária calculada sem split IPCA-E/SELIC. Preencha em Dados do Processo.',
      };
      orchestratorWarnings.push(warn);
      logger.warn(`[ORCHESTRATOR] ${warn.code}: ${warn.message}`);
    }
  }

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

  let engineVerbas = toEngineVerbas(caseData.verbas, caseData.historicos);

  // ── Generate verbas from multas_config (multas/indenizações from ModuloMultasCLT) ──
  const multasVerbas = multasConfigToVerbas(
    caseData.multasConfig,
    engineParams,
    engineHistoricos,
  );
  if (multasVerbas.length > 0) {
    engineVerbas = [...engineVerbas, ...multasVerbas];
  }

  // ── Auto-generate reflexes if not already present ──
  const principalVerbas = engineVerbas.filter(v => v.tipo === 'principal');
  const existingReflexas = engineVerbas.filter(v => v.tipo === 'reflexa');
  
  const principalsWithReflexas = new Set(existingReflexas.map(r => r.verba_principal_id).filter(Boolean));
  const principalsSemReflexo = principalVerbas.filter(v => !principalsWithReflexas.has(v.id));

  if (principalsSemReflexo.length > 0) {
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

    // Default: aviso prévio indenizado (caso mais comum em reclamatórias).
    // Quando aviso trabalhado, o usuário deve configurar explicitamente.
    const reflexosGerados = gerarReflexosPadrao(verbasBase, undefined, ['AVISO PRÉVIO TRABALHADO']);

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

  const rawSeguro = await loadSeguroConfig(caseId);
  const engineSeguro: PjeSeguroConfig = rawSeguro
    ? {
        apurar: rawSeguro.apurar ?? false,
        parcelas: rawSeguro.parcelas ?? 5,
        recebeu: rawSeguro.recebeu ?? false,
        valor_parcela: rawSeguro.valor_parcela ?? undefined,
      }
    : { apurar: false, parcelas: 0, recebeu: false };

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
    // Passar combinações de índices para verificação de lacuna ADC 58/59
    combinacoes_indice: (caseData.correcaoConfig as { combinacoes_indice?: Array<{ indice: string }> } | null)?.combinacoes_indice,
  });

  // Log validation results
  for (const err of tableValidation.errors) {
    logger.error(`[ORCHESTRATOR] TABLE VALIDATION ${err.severity.toUpperCase()}: [${err.code}] ${err.message}`);
  }
  for (const warn of tableValidation.warnings) {
    logger.warn(`[ORCHESTRATOR] TABLE VALIDATION ${warn.severity.toUpperCase()}: [${warn.code}] ${warn.message}`);
  }

  if (!tableValidation.can_proceed) {
    const blockReasons = tableValidation.errors
      .filter(e => e.severity === 'critical')
      .map(e => `[${e.code}] ${e.message_friendly}`)
      .join('; ');
    throw new Error(`Cálculo bloqueado por falta de dados essenciais: ${blockReasons}`);
  }

  // 4. Execute engine — ALL 21 constructor params populated
  
  const engine = new PjeCalcEngineV3(
    engineParams, engineHistoricos, engineFaltas, engineFerias,
    engineVerbas, engineCartao, engineFgts, engineCs, engineIr,
    engineCorrecao, engineHonorarios, engineCustas, engineSeguro,
    indicesDB,           // 14: correction indices
    faixasINSSDB,        // 15: INSS progressive brackets
    faixasIRDB,          // 16: IR brackets
    excecoesCargaDB,     // 17: exceções de carga horária
    feriadosDB,          // 18: holidays
    prevPrivadaConfig,   // 19: previdência privada
    pensaoConfig,        // 20: pensão alimentícia
    salarioFamiliaConfig,// 21: salário família
    seguroDesempregoDB,  // 22: seguro-desemprego DB rows
    salarioFamiliaDB,    // 23: salário-família DB rows
    excecoesSabadoDB,    // 24: exceções de sábado
    salarioMinimoDB,     // 25: salário mínimo DB
  );

  const result = engine.liquidar();

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
    warnings: orchestratorWarnings.length > 0 ? orchestratorWarnings : undefined,
  };
}
