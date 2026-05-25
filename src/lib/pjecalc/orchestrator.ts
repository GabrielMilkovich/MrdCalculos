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

import Decimal from 'decimal.js';
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
  PjecalcOcorrenciaRow,
  PjecalcReflexoRow,
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
    reinicia: f.reiniciar_ferias ?? false,
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
  ocorrenciasPorVerba: Map<string, PjecalcOcorrenciaRow[]> = new Map(),
): PjeVerba[] {
  return verbas.map(v => {
    // Sprint Hotfix bug #4 — popula `ocorrencias_precomputadas` quando a
    // verba tem ocorrências persistidas (vindas do import PJC, gravadas
    // por `pjc-persist.ts`). Sem isto, o motor caía em "from scratch"
    // mesmo quando o XML PJC trazia ocorrências completas (51 competências),
    // gerando líquido subestimado em ~5x. Quando `ocorrenciasPorVerba`
    // não traz entrada pra essa verba, o motor segue cálculo normal.
    const ocs = ocorrenciasPorVerba.get(v.id) ?? [];
    const ocorrenciasPrecomputadas = ocs.length > 0
      ? ocs.map(o => ({
          // Banco grava `competencia` como DATE (yyyy-mm-dd); motor espera
          // formato "yyyy-mm" pra agrupar por mês.
          competencia: typeof o.competencia === 'string'
            ? o.competencia.slice(0, 7)
            : String(o.competencia).slice(0, 7),
          base: Number(o.base_valor) || 0,
          divisor: Number(o.divisor_valor) || 1,
          multiplicador: Number(o.multiplicador_valor) || 1,
          quantidade: Number(o.quantidade_valor) || 1,
          // Banco grava dobra como NUMERIC(4,2) (1 ou 2). Motor espera boolean.
          dobra: Number(o.dobra) >= 2,
          devido: Number(o.devido) || 0,
          pago: Number(o.pago) || 0,
          indice_acumulado: o.indice_acumulado != null
            ? Number(o.indice_acumulado)
            : undefined,
        }))
      : undefined;
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
      // Sprint Hotfix bug #4 — passa ocorrências precomputadas pro motor
      // quando vieram do PJC import. Quando undefined, motor segue
      // cálculo "from scratch" (histórico + cartão).
      ocorrencias_precomputadas: ocorrenciasPrecomputadas,
    };
  });
}

/**
 * Sprint Hotfix bug #5 — converte reflexos persistidos (`pjecalc_reflexo`,
 * carregados por `getReflexos`) em `PjeVerba` com `tipo='reflexa'` para
 * o motor V3.
 *
 * Sem isso, o orchestrator não enxergava os reflexos do XML PJC (a view
 * `pjecalc_verbas` lê só `pjecalc_verba_base`), `existingReflexas` ficava
 * vazio, e `principalsSemReflexo` virava o conjunto inteiro de Calculadas
 * — disparando `gerarReflexosPadrao` que gerava 13º/Férias/Aviso/DSR
 * GENÉRICOS por cima das ocorrências já precomputadas, inflando o
 * líquido (ROSICLEIA: R$ 412k vs alvo R$ 245k).
 *
 * Reflexos com múltiplas verbas base (M:N) usam `base_verba_ids[0]` como
 * `verba_principal_id` — mesmo comportamento do pipeline V3 puro
 * (`pjc-to-engine.ts:612`). Quando o reflexo tem ocorrências
 * precomputadas (via `ocorrenciasPorVerba.get(reflexo.id)`), o motor
 * usa essas ocorrências direto (não recalcula).
 */
function toEngineReflexos(
  reflexos: PjecalcReflexoRow[],
  ocorrenciasPorVerba: Map<string, PjecalcOcorrenciaRow[]> = new Map(),
): PjeVerba[] {
  const out: PjeVerba[] = [];
  for (const r of reflexos) {
    if (r.ativa === false) continue;
    if (r.base_verba_ids.length === 0) {
      logger.warn(
        `[ORCHESTRATOR] Reflexo "${r.nome}" (id=${r.id}) sem verba_principal_id (zero links em pjecalc_reflexo_base_verba) — ignorado.`,
      );
      continue;
    }
    const verbaPrincipalId = r.base_verba_ids[0];

    const caracteristicaMap: Record<string, string> = {
      'COMUM': 'comum', '13_SALARIO': '13_salario',
      'AVISO_PREVIO': 'aviso_previo', 'FERIAS': 'ferias',
    };
    const rawCaract = (r.tipo || 'COMUM').toUpperCase();
    const caracteristica = (caracteristicaMap[rawCaract] || rawCaract.toLowerCase()) as PjeVerba['caracteristica'];

    const tipoDivisor = normalizeDivisorTipo(r.divisor_tipo);
    const tipoQuantidade = normalizeQuantidadeTipo(r.quantidade_tipo, caracteristica);
    const comportamentoReflexa = r.comportamento_reflexo
      ? normalizeComportamento(r.comportamento_reflexo)
      : undefined;
    const periodoMediaReflexa = r.periodo_media_reflexo as PjeVerba['periodo_media_reflexo'] | undefined;
    const fracaoMesModo = normalizeFracaoMes(r.tratamento_fracao_mes);

    // Banco grava `gerar_principal`/`gerar_reflexo` como boolean (convertido
    // do XML PJC). Engine espera 'devido' (true) / 'diferenca' (false) —
    // padrão idêntico ao do pipeline V3 puro (`pjc-to-engine.ts:615-616`).
    const gerarReflexa: 'devido' | 'diferenca' = r.gerar_reflexo ? 'devido' : 'diferenca';
    const gerarPrincipal: 'devido' | 'diferenca' = r.gerar_principal ? 'devido' : 'diferenca';

    const ocs = ocorrenciasPorVerba.get(r.id) ?? [];
    const ocorrenciasPrecomputadas = ocs.length > 0
      ? ocs.map(o => ({
          competencia: typeof o.competencia === 'string'
            ? o.competencia.slice(0, 7)
            : String(o.competencia).slice(0, 7),
          base: Number(o.base_valor) || 0,
          divisor: Number(o.divisor_valor) || 1,
          multiplicador: Number(o.multiplicador_valor) || 1,
          quantidade: Number(o.quantidade_valor) || 1,
          dobra: Number(o.dobra) >= 2,
          devido: Number(o.devido) || 0,
          pago: Number(o.pago) || 0,
          indice_acumulado: o.indice_acumulado != null
            ? Number(o.indice_acumulado)
            : undefined,
        }))
      : undefined;

    out.push({
      id: r.id,
      nome: r.nome,
      tipo: 'reflexa',
      valor: 'calculado',
      caracteristica,
      ocorrencia_pagamento: 'mensal',
      compor_principal: true,
      zerar_valor_negativo: false,
      dobrar_valor_devido: false,
      periodo_inicio: r.periodo_inicio || '',
      periodo_fim: r.periodo_fim || '',
      base_calculo: {
        historicos: [],
        verbas: r.base_verba_ids,
        tabelas: [],
        proporcionalizar: false,
        integralizar: false,
      },
      tipo_divisor: tipoDivisor,
      divisor_informado: r.divisor ?? 1,
      multiplicador: r.multiplicador ?? 1,
      tipo_quantidade: tipoQuantidade,
      quantidade_informada: 1,
      quantidade_proporcionalizar: false,
      fracao_mes_modo: fracaoMesModo,
      exclusoes: {
        faltas_justificadas: false,
        faltas_nao_justificadas: false,
        ferias_gozadas: false,
      },
      incidencias: {
        fgts: r.incide_fgts !== false,
        irpf: r.incide_ir !== false,
        contribuicao_social: r.incide_inss !== false,
        previdencia_privada: false,
        pensao_alimenticia: false,
      },
      juros_ajuizamento: 'ocorrencias_vencidas',
      verba_principal_id: verbaPrincipalId,
      gerar_verba_reflexa: gerarReflexa,
      gerar_verba_principal: gerarPrincipal,
      comportamento_reflexo: comportamentoReflexa,
      periodo_media_reflexo: periodoMediaReflexa,
      hora_noturna_ficticia: false,
      ordem: r.ordem || 0,
      ocorrencias_precomputadas: ocorrenciasPrecomputadas,
    });
  }
  return out;
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

/**
 * Type guard: confirma que `v` é entrada `{ data: string; valor: number }`.
 * Usado para validar payloads JSON do banco antes de injetar no engine.
 */
function isSaldoSaqueEntry(v: unknown): v is { data: string; valor: number } {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.data === 'string' && typeof o.valor === 'number';
}

function toEngineFgtsConfig(cfg: PjecalcFgtsConfigRow | null): PjeFGTSConfig {
  // Support both old (habilitado/percentual_multa) and new column names
  const apurar = cfg?.apurar ?? cfg?.habilitado ?? true;
  const multaPercentual = cfg?.multa_percentual ?? cfg?.percentual_multa ?? 40;
  // saldos_saques vem como JSONB do banco. Filtra entradas malformadas
  // antes de passar ao engine — assim eliminamos o `as any` mantendo
  // resiliência contra dados ruins de migrations antigas.
  const rawSaldos: unknown = cfg?.saldos_saques;
  const saldosSaques: { data: string; valor: number }[] = Array.isArray(rawSaldos)
    ? rawSaldos.filter(isSaldoSaqueEntry)
    : [];
  return {
    apurar,
    destino: (cfg?.destino as PjeFGTSConfig['destino']) ?? 'pagar_reclamante',
    compor_principal: cfg?.compor_principal ?? false,
    multa_apurar: cfg?.multa_apurar ?? true,
    multa_tipo: (cfg?.multa_tipo as PjeFGTSConfig['multa_tipo']) ?? 'calculada',
    multa_percentual: multaPercentual,
    multa_base: (cfg?.multa_base as PjeFGTSConfig['multa_base']) ?? 'diferenca',
    multa_valor_informado: cfg?.multa_valor_informado ?? undefined,
    saldos_saques: saldosSaques,
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
  // RRA Lei 7.713/88 art. 12-A — sub-flags vindas da UI ModuloIR.
  // Quando ausentes na linha (view legacy), permanecem undefined → engine
  // mantém auto-detect (NM cardinalidade > 1 dispara art_12a_rra).
  const cfgExt = (cfg ?? {}) as unknown as Record<string, unknown>;
  const apurarRra = cfgExt.apurar_rra as boolean | undefined;
  const rraMesesRaw = cfgExt.rra_meses as number | undefined;
  const rraParcelasRaw = cfgExt.rra_numero_parcelas as number | undefined;
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
    // Sub-flags RRA (Lei 7.713/88 art. 12-A, incluído pela Lei 12.350/2010).
    // Engine v3 consome em irpf-modulo-adapter.ts:88 (apurarRraFlag) e :185
    // (computeNMRra) para forçar/desligar art_12a_rra.
    apurar_rra: apurarRra,
    rra_meses: rraMesesRaw && rraMesesRaw > 0 ? rraMesesRaw : undefined,
    rra_numero_parcelas: rraParcelasRaw && rraParcelasRaw > 0 ? rraParcelasRaw : undefined,
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

/**
 * Audit-fix C3: adapter PjecalcMultasConfigRow → PjeMultasConfig.
 *
 * Antes deste fix o orchestrator chamava `new PjeCalcEngineV3(...)` com 25
 * argumentos, deixando o construtor cair no default
 *   multasConfig = { apurar_467: false, apurar_477: false }
 * O gate interno (engine-v3.ts:1428: `if (apurar_467 === false) return 0`)
 * zerava a multa 467 mesmo quando o usuário marcava no ModuloMultasCLT.
 *
 * Agora lemos `caseData.multasConfig` do banco e passamos como 26º arg.
 */
function toEngineMultasConfig(
  cfg: import('./types').PjecalcMultasConfigRow | null,
): import('./engine-types').PjeMultasConfig {
  if (!cfg) return { apurar_467: false, apurar_477: false };
  const c = cfg as unknown as Record<string, unknown>;
  return {
    apurar_467: Boolean(c.apurar_467),
    apurar_477: Boolean(c.apurar_477),
    valor_477_tipo: (c.valor_477_tipo as 'salario' | 'informado' | undefined) ?? 'salario',
    valor_477_informado: c.valor_477_informado as number | undefined,
    apurar_523_cpc: Boolean(c.apurar_523_cpc),
    percentual_523: (c.percentual_523 as number | undefined) ?? 10,
    multas_indenizacoes: (c.multas_indenizacoes as import('./engine-types').PjeMultaItem[] | undefined) ?? [],
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
      // tabela custom pjecalc_* fora do schema gerado (src/types/supabase.ts)
      .from('pjecalc_excecoes_carga' as never)
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
      // tabela custom pjecalc_* fora do schema gerado (src/types/supabase.ts)
      .from('pjecalc_excecoes_sabado' as never)
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
export function multasConfigToVerbas(
  multasConfig: import('./types').PjecalcMultasConfigRow | null,
  params: PjeParametros,
  historicos: PjeHistoricoSalarial[],
): { verbas: PjeVerba[]; warnings: Array<{ code: string; message: string }> } {
  if (!multasConfig) return { verbas: [], warnings: [] };
  const cfg = multasConfig as unknown as Record<string, unknown>;
  const result: PjeVerba[] = [];
  const warnings: Array<{ code: string; message: string }> = [];

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
      const percentual = new Decimal(pc.percentual || '30').div(100);
      const inicio = pc.periodo_inicio || periodoInicio;
      const fim = pc.periodo_fim || periodoFim;

      // 1. Verba principal (Adicional Periculosidade mensal)
      const v = defaultVerba('periculosidade_auto', 'Adicional de Periculosidade');
      v.valor = 'calculado';
      v.multiplicador = percentual.toNumber();
      v.periodo_inicio = inicio;
      v.periodo_fim = fim;
      v.ocorrencia_pagamento = 'mensal';
      v.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      // FIX: usar TODOS os históricos, não só [0]
      if (historicos.length > 0) v.base_calculo.historicos = historicos.map(h => h.id);
      v.ordem = 9020;
      v.gerar_verba_reflexa = 'devido';
      result.push(v);

      // 2. Reflexo em 13º Salário (1/12 por mês)
      const v13 = defaultVerba('periculosidade_reflexo_13', 'REFLEXO PERICULOSIDADE EM 13º SALÁRIO');
      v13.valor = 'calculado';
      v13.multiplicador = percentual.div(12).toNumber();
      v13.periodo_inicio = inicio;
      v13.periodo_fim = fim;
      v13.ocorrencia_pagamento = 'desligamento';
      v13.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (historicos.length > 0) v13.base_calculo.historicos = historicos.map(h => h.id);
      v13.ordem = 9021;
      result.push(v13);

      // 3. Reflexo em Férias + 1/3 (1.3333/12 CLT 142)
      const vFerias = defaultVerba('periculosidade_reflexo_ferias', 'REFLEXO PERICULOSIDADE EM FÉRIAS + 1/3');
      vFerias.valor = 'calculado';
      vFerias.multiplicador = percentual.times(new Decimal('1.3333')).div(12).toNumber();
      vFerias.periodo_inicio = inicio;
      vFerias.periodo_fim = fim;
      vFerias.ocorrencia_pagamento = 'desligamento';
      vFerias.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (historicos.length > 0) vFerias.base_calculo.historicos = historicos.map(h => h.id);
      vFerias.ordem = 9022;
      result.push(vFerias);

      // 4. Reflexo em DSR (Lei 605/49) — SÓ se houver comissões/variável (Súmula 27 TST)
      const temVariavel = historicos.some(h =>
        h.nome?.toLowerCase().includes('comiss') ||
        h.nome?.toLowerCase().includes('premia') ||
        h.nome?.toLowerCase().includes('variavel') ||
        h.nome?.toLowerCase().includes('variável')
      );
      if (temVariavel) {
        const vDsr = defaultVerba('periculosidade_reflexo_dsr', 'REFLEXO PERICULOSIDADE EM DSR');
        vDsr.valor = 'calculado';
        vDsr.multiplicador = percentual.times(new Decimal('0.1666')).toNumber();
        vDsr.periodo_inicio = inicio;
        vDsr.periodo_fim = fim;
        vDsr.ocorrencia_pagamento = 'mensal';
        vDsr.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
        if (historicos.length > 0) vDsr.base_calculo.historicos = historicos.map(h => h.id);
        vDsr.ordem = 9023;
        result.push(vDsr);
      }

      // 5-6: FGTS e FGTS+40% — motor V3 calcula automaticamente via incidencias.fgts=true
      // 7: Aviso Prévio — motor V3 calcula automaticamente quando periculosidade incide no período
    }
  }

  // ── Insalubridade (Art. 192 CLT + NR 15 MTE + Súmula Vinculante 4 STF) ──
  if (cfg.insalubridade_config) {
    const ins = cfg.insalubridade_config as {
      ativo: boolean;
      grau: 'minimo_10' | 'medio_20' | 'maximo_40';
      base_calculo: 'salario_minimo' | 'salario_base' | 'salario_contratual';
      periodo_inicio: string;
      periodo_fim: string;
    };
    if (ins.ativo) {
      const percentualMap: Record<string, number> = { minimo_10: 10, medio_20: 20, maximo_40: 40 };
      const percentual = new Decimal(percentualMap[ins.grau] || 0).div(100);
      const inicio = ins.periodo_inicio || periodoInicio;
      const fim = ins.periodo_fim || periodoFim;

      // Verba principal
      const vIns = defaultVerba('insalubridade_auto', `Adicional de Insalubridade (${ins.grau})`);
      vIns.valor = 'calculado';
      vIns.multiplicador = percentual.toNumber();
      vIns.periodo_inicio = inicio;
      vIns.periodo_fim = fim;
      vIns.ocorrencia_pagamento = 'mensal';
      vIns.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (ins.base_calculo === 'salario_base') {
        const salFixo = historicos.filter(h =>
          h.nome?.toLowerCase().includes('fix') ||
          h.nome?.toLowerCase().includes('base') ||
          h.nome?.toLowerCase().includes('salário') ||
          h.nome?.toLowerCase().includes('salario')
        );
        vIns.base_calculo.historicos = salFixo.length > 0
          ? salFixo.map(h => h.id)
          : (historicos.length > 0 ? [historicos[0].id] : []);
      } else if (ins.base_calculo === 'salario_contratual') {
        if (historicos.length > 0) vIns.base_calculo.historicos = historicos.map(h => h.id);
      } else {
        // salario_minimo: usar valor_informado_devido como fallback estático
        // Motor V3 não suporta flag usar_salario_minimo, então calculamos valor fixo
        // DEBT: perde correção mensal automática do SM
        // SM 2025 = R$ 1.518,00 (usar params se disponível, senão hardcode)
        const sm = new Decimal('1518');
        vIns.valor = 'informado';
        vIns.valor_informado_devido = sm.times(percentual).toDP(2).toNumber();
      }
      vIns.ordem = 9024;
      vIns.gerar_verba_reflexa = 'devido';
      result.push(vIns);

      // Reflexo em 13º Salário
      const v13Ins = defaultVerba('insalubridade_reflexo_13', 'REFLEXO INSALUBRIDADE EM 13º SALÁRIO');
      v13Ins.valor = 'calculado';
      v13Ins.multiplicador = percentual.div(12).toNumber();
      v13Ins.periodo_inicio = inicio;
      v13Ins.periodo_fim = fim;
      v13Ins.ocorrencia_pagamento = 'desligamento';
      v13Ins.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (ins.base_calculo !== 'salario_minimo' && historicos.length > 0) {
        v13Ins.base_calculo.historicos = historicos.map(h => h.id);
      } else if (ins.base_calculo === 'salario_minimo') {
        const sm = new Decimal('1518');
        v13Ins.valor = 'informado';
        v13Ins.valor_informado_devido = sm.times(percentual).div(12).toDP(2).toNumber();
      }
      v13Ins.ordem = 9025;
      result.push(v13Ins);

      // Reflexo em Férias + 1/3
      const vFeriasIns = defaultVerba('insalubridade_reflexo_ferias', 'REFLEXO INSALUBRIDADE EM FÉRIAS + 1/3');
      vFeriasIns.valor = 'calculado';
      vFeriasIns.multiplicador = percentual.times(new Decimal('1.3333')).div(12).toNumber();
      vFeriasIns.periodo_inicio = inicio;
      vFeriasIns.periodo_fim = fim;
      vFeriasIns.ocorrencia_pagamento = 'desligamento';
      vFeriasIns.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
      if (ins.base_calculo !== 'salario_minimo' && historicos.length > 0) {
        vFeriasIns.base_calculo.historicos = historicos.map(h => h.id);
      } else if (ins.base_calculo === 'salario_minimo') {
        const sm = new Decimal('1518');
        vFeriasIns.valor = 'informado';
        vFeriasIns.valor_informado_devido = sm.times(percentual).times(new Decimal('1.3333')).div(12).toDP(2).toNumber();
      }
      vFeriasIns.ordem = 9026;
      result.push(vFeriasIns);

      // DSR — só se houver variável
      const temVariavelIns = historicos.some(h =>
        h.nome?.toLowerCase().includes('comiss') ||
        h.nome?.toLowerCase().includes('premia') ||
        h.nome?.toLowerCase().includes('variavel') ||
        h.nome?.toLowerCase().includes('variável')
      );
      if (temVariavelIns) {
        const vDsrIns = defaultVerba('insalubridade_reflexo_dsr', 'REFLEXO INSALUBRIDADE EM DSR');
        vDsrIns.valor = 'calculado';
        vDsrIns.multiplicador = percentual.times(new Decimal('0.1666')).toNumber();
        vDsrIns.periodo_inicio = inicio;
        vDsrIns.periodo_fim = fim;
        vDsrIns.ocorrencia_pagamento = 'mensal';
        vDsrIns.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
        if (ins.base_calculo !== 'salario_minimo' && historicos.length > 0) {
          vDsrIns.base_calculo.historicos = historicos.map(h => h.id);
        }
        vDsrIns.ordem = 9027;
        result.push(vDsrIns);
      }
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

  // ── Equiparação Salarial (Art. 461 CLT + Súmula 6 TST) ──
  // Diferença = paradigma_salario - empregado_salario (por competência).
  // Reflexos: 13º (pro-rata 1/12), férias + 1/3 (1.3333/12), FGTS (8%).
  if (cfg.equiparacao_config) {
    const eq = cfg.equiparacao_config as {
      ativo: boolean;
      paradigma_nome: string;
      paradigma_funcao?: string;
      periodo_inicio: string;
      periodo_fim: string;
      salarios: Array<{ competencia: string; salario_paradigma: string; salario_empregado: string }>;
    };
    if (eq.ativo && Array.isArray(eq.salarios) && eq.salarios.length > 0) {
      const totalDiferenca = eq.salarios.reduce((acc, s) => {
        const par = new Decimal(s.salario_paradigma || 0);
        const emp = new Decimal(s.salario_empregado || 0);
        const dif = Decimal.max(0, par.minus(emp));
        return acc.plus(dif);
      }, new Decimal(0));

      eq.salarios.forEach((s, idx) => {
        const par = new Decimal(s.salario_paradigma || 0);
        const emp = new Decimal(s.salario_empregado || 0);
        const diferenca = Decimal.max(0, par.minus(emp));
        if (diferenca.gt(0)) {
          const v = defaultVerba(`equiparacao_auto_${idx}`, `DIFERENCA EQUIPARACAO SALARIAL ${eq.paradigma_nome || ''} (${s.competencia})`.trim());
          v.valor_informado_devido = diferenca.toDP(2).toNumber();
          v.periodo_inicio = s.competencia ? `${s.competencia}-01` : (eq.periodo_inicio || periodoInicio);
          v.periodo_fim = s.competencia ? `${s.competencia}-28` : (eq.periodo_fim || periodoFim);
          v.ocorrencia_pagamento = 'mensal';
          v.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
          v.gerar_verba_reflexa = 'diferenca';
          v.ordem = 9040 + idx;
          result.push(v);
        }
      });

      // Reflexos automáticos consolidados ao fim do período (Súmula 6 TST item VI).
      if (totalDiferenca.gt(0)) {
        const baseRef = totalDiferenca;
        const dataReflexo = eq.periodo_fim || periodoFim || '';

        // 13º Salário: 1/12 da diferença anual
        const v13 = defaultVerba('equiparacao_reflexo_13', `REFLEXO EQUIPARACAO EM 13o SALARIO ${eq.paradigma_nome || ''}`.trim());
        v13.valor_informado_devido = baseRef.times(new Decimal(1).div(12)).toDP(2).toNumber();
        v13.periodo_inicio = eq.periodo_inicio || periodoInicio;
        v13.periodo_fim = dataReflexo;
        v13.ocorrencia_pagamento = 'desligamento';
        v13.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
        v13.ordem = 9060;
        result.push(v13);

        // Férias + 1/3: 1.3333/12 da diferença
        const vFerias = defaultVerba('equiparacao_reflexo_ferias', `REFLEXO EQUIPARACAO EM FERIAS + 1/3 ${eq.paradigma_nome || ''}`.trim());
        vFerias.valor_informado_devido = baseRef.times(new Decimal('1.3333')).div(12).toDP(2).toNumber();
        vFerias.periodo_inicio = eq.periodo_inicio || periodoInicio;
        vFerias.periodo_fim = dataReflexo;
        vFerias.ocorrencia_pagamento = 'desligamento';
        vFerias.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
        vFerias.ordem = 9061;
        result.push(vFerias);

        // FGTS reflexo (8% da diferença total + reflexos).
        const baseFgts = baseRef
          .plus(baseRef.times(new Decimal(1).div(12)))
          .plus(baseRef.times(new Decimal('1.3333')).div(12));
        const vFgts = defaultVerba('equiparacao_reflexo_fgts', `REFLEXO EQUIPARACAO EM FGTS ${eq.paradigma_nome || ''}`.trim());
        vFgts.valor_informado_devido = baseFgts.times(new Decimal('0.08')).toDP(2).toNumber();
        vFgts.periodo_inicio = eq.periodo_inicio || periodoInicio;
        vFgts.periodo_fim = dataReflexo;
        vFgts.ocorrencia_pagamento = 'desligamento';
        vFgts.incidencias = { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
        vFgts.ordem = 9062;
        result.push(vFgts);

        // DSR reflexo: aplicável quando historicos contêm remuneração variável (comissão/prêmio)
        const hasVariablePay = historicos.some(h =>
          /comiss[aã]o|premi[oô]|pr[eê]mio|variav|vari[áa]vel/i.test(h.nome),
        );
        if (hasVariablePay) {
          // DSR sobre diferença de equiparação: diferença / dias úteis * repousos ≈ baseRef / 26 * 4
          const dsrFator = new Decimal(1).div(26).times(4);
          const vDsr = defaultVerba('equiparacao_reflexo_dsr', `REFLEXO EQUIPARACAO EM DSR ${eq.paradigma_nome || ''}`.trim());
          vDsr.valor_informado_devido = baseRef.times(dsrFator).toDP(2).toNumber();
          vDsr.periodo_inicio = eq.periodo_inicio || periodoInicio;
          vDsr.periodo_fim = dataReflexo;
          vDsr.ocorrencia_pagamento = 'desligamento';
          vDsr.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
          vDsr.ordem = 9063;
          result.push(vDsr);
        }

        // Aviso prévio reflexo: quando aviso é "calculado" e projetar_aviso_indenizado = true
        if (params.prazo_aviso_previo === 'calculado' && params.projetar_aviso_indenizado) {
          // Aviso prévio = 1/12 da diferença total (projeção mensal)
          const vAviso = defaultVerba('equiparacao_reflexo_aviso', `REFLEXO EQUIPARACAO EM AVISO PREVIO ${eq.paradigma_nome || ''}`.trim());
          vAviso.valor_informado_devido = baseRef.times(new Decimal(1).div(12)).toDP(2).toNumber();
          vAviso.periodo_inicio = eq.periodo_inicio || periodoInicio;
          vAviso.periodo_fim = dataReflexo;
          vAviso.ocorrencia_pagamento = 'desligamento';
          vAviso.caracteristica = 'aviso_previo';
          vAviso.incidencias = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
          vAviso.ordem = 9064;
          result.push(vAviso);
        }
      }
    }
  }

  // ── Estabilidade Provisória (Art. 10 ADCT / Art. 118 Lei 8.213/91) ──
  if (cfg.estabilidade_config) {
    const est = cfg.estabilidade_config as {
      ativo: boolean;
      tipo: string;
      periodo_inicio: string;
      periodo_fim: string;
      data_evento?: string;
      meses_estabilidade?: string;
      observacoes?: string;
    };
    if (est.ativo) {
      // Mapa UI → engine (TipoEstabilidade)
      const tipoMapa: Record<string, 'GESTANTE' | 'CIPA' | 'ACIDENTE_TRABALHO' | 'OUTRO'> = {
        gestante: 'GESTANTE',
        cipa: 'CIPA',
        acidentaria: 'ACIDENTE_TRABALHO',
        acidente: 'ACIDENTE_TRABALHO',
        acidente_trabalho: 'ACIDENTE_TRABALHO',
        outro: 'OUTRO',
      };
      const tipoNorm = tipoMapa[(est.tipo || 'gestante').toLowerCase()] || 'OUTRO';

      // Determinar periodos: se UI nao forneceu, derivar de data_evento + meses
      let inicio = est.periodo_inicio;
      let fim = est.periodo_fim;
      if ((!inicio || !fim) && est.data_evento) {
        // Import dinamico — modulo registra-se em cima do registry
        const meses = Number(est.meses_estabilidade || 0);
        // Defaults legais por tipo de estabilidade
        const defaultMesesMap: Record<string, number> = { gestante: 5, cipa: 12, acidentaria: 12, acidente_trabalho: 12, acidente: 12 };
        const effectiveMeses = meses > 0 ? meses : (defaultMesesMap[(est.tipo || '').toLowerCase()] || 0);
        // Se mesmo com default o período é 0 e a estabilidade está ativa, emitir warning
        if (effectiveMeses === 0 && est.ativo) {
          warnings.push({
            code: 'W_ESTABILIDADE_MESES_ZERO',
            message: `Estabilidade tipo "${est.tipo || 'outro'}" ativa mas sem meses de estabilidade definidos. Nenhuma verba de estabilidade será gerada. Preencha o campo "Meses de Estabilidade" ou selecione um tipo com default legal.`,
          });
        }
        // Calculo simples inline (evita import circular):
        // fim = data_evento + effectiveMeses
        const ev = new Date(est.data_evento + 'T00:00:00Z');
        if (!Number.isNaN(ev.getTime())) {
          if (!inicio) inicio = est.data_evento;
          if (!fim && effectiveMeses > 0) {
            const dFim = new Date(ev.getTime());
            dFim.setUTCMonth(dFim.getUTCMonth() + effectiveMeses);
            const yyyy = dFim.getUTCFullYear().toString().padStart(4, '0');
            const mm = (dFim.getUTCMonth() + 1).toString().padStart(2, '0');
            const dd = dFim.getUTCDate().toString().padStart(2, '0');
            fim = `${yyyy}-${mm}-${dd}`;
          }
        }
      }

      if (inicio && fim) {
        const v = defaultVerba('estabilidade_auto', `INDENIZACAO ESTABILIDADE (${tipoNorm})`);
        v.valor = 'calculado';
        v.multiplicador = 1;
        v.periodo_inicio = inicio;
        v.periodo_fim = fim;
        v.ocorrencia_pagamento = 'mensal';
        v.tipo_quantidade = 'informada';
        v.quantidade_informada = 1;
        v.tipo_divisor = 'informado';
        v.divisor_informado = 1;
        v.incidencias = {
          fgts: true,
          irpf: true,
          contribuicao_social: true,
          previdencia_privada: false,
          pensao_alimenticia: false,
        };
        if (historicos.length > 0) v.base_calculo.historicos = historicos.map(h => h.id);
        v.ordem = 9050;
        if (est.observacoes) v.comentarios = est.observacoes;
        result.push(v);
      }
    }
  }

  return { verbas: result, warnings };
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

  // Sprint Hotfix bug #4 — agrupa ocorrências por verba antes de passar
  // pro motor. As ocorrências vêm da view `pjecalc_ocorrencias` que já
  // unifica `verba_base_id` e `reflexo_id` em `verba_id` via COALESCE.
  const ocorrenciasPorVerba = new Map<string, PjecalcOcorrenciaRow[]>();
  for (const oc of caseData.ocorrencias ?? []) {
    if (!oc.verba_id) continue;
    const bucket = ocorrenciasPorVerba.get(oc.verba_id);
    if (bucket) bucket.push(oc);
    else ocorrenciasPorVerba.set(oc.verba_id, [oc]);
  }

  let engineVerbas = toEngineVerbas(
    caseData.verbas,
    caseData.historicos,
    ocorrenciasPorVerba,
  );

  // Sprint Hotfix bug #5 — concatena reflexos persistidos em `pjecalc_reflexo`.
  // A view `pjecalc_verbas` lê só `pjecalc_verba_base` (Calculadas), então
  // sem este passo o orchestrator não enxerga os reflexos do PJC e dispara
  // a auto-geração padrão de 13º/Férias/Aviso/DSR — gerando reflexos
  // GENÉRICOS sobre as ocorrências já precomputadas e inflando o líquido
  // (~R$ 412k vs alvo ~R$ 245k para ROSICLEIA).
  if ((caseData.reflexos ?? []).length > 0) {
    const reflexasFromDb = toEngineReflexos(caseData.reflexos ?? [], ocorrenciasPorVerba);
    if (reflexasFromDb.length > 0) {
      engineVerbas = [...engineVerbas, ...reflexasFromDb];
    }
  }

  // ── Generate verbas from multas_config (multas/indenizações from ModuloMultasCLT) ──
  const multasResult = multasConfigToVerbas(
    caseData.multasConfig,
    engineParams,
    engineHistoricos,
  );
  if (multasResult.verbas.length > 0) {
    engineVerbas = [...engineVerbas, ...multasResult.verbas];
  }
  // Collect warnings from multasConfigToVerbas (e.g. estabilidade sem meses)
  orchestratorWarnings.push(...multasResult.warnings);

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

  // ── Validação: aviso prévio "informado" exige dias preenchidos ──
  if (engineParams.prazo_aviso_previo === 'informado' && !engineParams.prazo_aviso_dias) {
    throw new Error('Aviso prévio configurado como "informado" mas dias não preenchidos. Volte ao módulo Dados do Processo e preencha "Prazo de Aviso (dias)".');
  }

  // 4. Execute engine — 26 constructor params (audit-fix C3 adicionou multasConfig)

  const engineMultas = toEngineMultasConfig(caseData.multasConfig);

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
    engineMultas,        // 26: multas config (audit-fix C3) — antes default false
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
