/**
 * =====================================================
 * INPUT RESOLVER — Monta CanonicalCaseInput a partir de múltiplas fontes
 * =====================================================
 * 
 * Pipeline de resolução com prioridade:
 * 1. Input explícito do caso (manual/override)
 * 2. XML/PJC real
 * 3. Banco histórico/versionado
 * 4. Parâmetros inferidos
 * 5. Defaults seguros e auditados
 */

import type {
  CanonicalCaseInput,
  InputFieldMeta,
  InputSource,
  CaseIdentification,
  TemporalMarks,
  JuridicalParameters,
  MonetaryInputs,
  TaxInputs,
  ReferenceTables,
  SalaryHistoryInput,
  VerbaInput,
  FeriasInput,
  FaltaInput,
  JornadaInputs,
} from './types';
import { resolved, absent } from './types';
import { findCanonicalRubric } from './rubric-taxonomy';
import type {
  PjecalcParametrosRow,
  PjecalcDadosProcessoRow,
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
} from '../types';
import type { PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow, PjeFeriadoDB } from '../engine-types';

// =====================================================
// SOURCE DATA CONTAINER
// =====================================================

export interface ResolverSources {
  params: PjecalcParametrosRow | null;
  dadosProcesso?: PjecalcDadosProcessoRow | null;
  historicos: PjecalcHistoricoSalarialRow[];
  histOcorrencias: { id: string; historico_id: string; competencia: string; valor: number; tipo: string }[];
  verbas: PjecalcVerbaRow[];
  faltas: PjecalcFaltaRow[];
  ferias: PjecalcFeriasRow[];
  cartaoPonto: PjecalcCartaoPontoRow[];
  fgtsConfig: PjecalcFgtsConfigRow | null;
  csConfig: PjecalcCsConfigRow | null;
  irConfig: PjecalcIrConfigRow | null;
  correcaoConfig: PjecalcCorrecaoConfigRow | null;
  atualizacaoConfig: any[];
  honorarios: PjecalcHonorariosRow | null;
  custasConfig: PjecalcCustasConfigRow | null;
  // Reference tables
  indicesDB: PjeIndiceRow[];
  faixasINSSDB: PjeINSSFaixaRow[];
  faixasIRDB: PjeIRFaixaRow[];
  feriadosDB: PjeFeriadoDB[];
  seguroDesempregoDB: any[];
  salarioFamiliaDB: any[];
  // Metadata
  isPjcImport: boolean;
}

// =====================================================
// RESOLVER HELPERS
// =====================================================

function resolveString(val: string | null | undefined, required: boolean, blocks: boolean, source: InputSource = 'database', warnCode?: string): InputFieldMeta<string | null> {
  if (val && val.trim() !== '') {
    return resolved(val, source, { isRequired: required, blocksCalculation: false });
  }
  return absent(required, blocks, warnCode);
}

function resolveStringRequired(val: string | null | undefined, source: InputSource, warnCode: string): InputFieldMeta<string> {
  if (val && val.trim() !== '') {
    return resolved(val, source, { isRequired: true, blocksCalculation: false });
  }
  return {
    value: '',
    source: 'absent',
    confidence: 0,
    isRequired: true,
    isResolved: false,
    isInferred: false,
    blocksCalculation: true,
    warningCode: warnCode,
    warningMessage: `Campo obrigatório ausente [${warnCode}]`,
  };
}

function resolveNum(val: number | null | undefined, dflt: number, source: InputSource = 'database'): InputFieldMeta<number> {
  if (val != null) return resolved(val, source, { isRequired: false });
  return resolved(dflt, 'default_audited', { isRequired: false, warningCode: 'DEFAULT_NUM' });
}

function resolveBool(val: boolean | null | undefined, dflt: boolean, source: InputSource = 'database'): InputFieldMeta<boolean> {
  if (val != null) return resolved(val, source, { isRequired: false });
  return resolved(dflt, 'default_audited', { isRequired: false });
}

// =====================================================
// MAIN RESOLVER
// =====================================================

function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function resolveCanonicalInput(sources: ResolverSources): CanonicalCaseInput {
  const p = sources.params;
  const src: InputSource = sources.isPjcImport ? 'pjc_import' : 'database';

  // ── IDENTIFICATION ──
  const identification: CaseIdentification = {
    case_id: resolved(p?.case_id || '', src, { isRequired: true }),
    processo_cnj: resolveString(p?.numero_processo, false, false, src),
    reclamante_nome: resolveString(p?.reclamante_nome, false, false, src),
    reclamante_cpf: resolveString(p?.reclamante_cpf, false, false, src),
    reclamado_nome: resolveString(p?.reclamada_nome, false, false, src),
    reclamado_cnpj: resolveString(p?.reclamada_cnpj, false, false, src),
    tipo_liquidacao: resolved('sentenca' as const, 'default_audited', { isRequired: false }),
    fonte_caso: resolved(sources.isPjcImport ? 'pjc' as const : 'manual' as const, src, { isRequired: false }),
    versao_input: resolved(1, 'database', { isRequired: false }),
  };

  // ── TEMPORAL ──
  const correcaoCfg = sources.correcaoConfig;
  const temporal: TemporalMarks = {
    data_admissao: resolveStringRequired(p?.data_admissao, src, 'E001_ADMISSAO'),
    data_demissao: resolveString(p?.data_demissao, false, false, src),
    data_ajuizamento: resolveStringRequired(p?.data_ajuizamento, src, 'E002_AJUIZAMENTO'),
    data_citacao: resolveString(p?.data_citacao, false, false, src, 'W001_CITACAO'),
    data_liquidacao: resolveStringRequired(correcaoCfg?.data_liquidacao, src, 'E003_LIQUIDACAO'),
    data_inicial_calculo: resolveString(p?.data_inicial, false, false, src),
    data_final_calculo: resolveString(p?.data_final, false, false, src),
    data_exigibilidade: resolveString(null, false, false),
    data_prescricao_calculada: resolveString(p?.data_prescricao, false, false, src),
  };

  // ── JURIDICAL ──
  const juridical: JuridicalParameters = {
    prescricao_quinquenal: resolveBool(p?.prescricao_quinquenal, false, src),
    prescricao_fgts: resolveBool(p?.prescricao_fgts, false, src),
    projetar_aviso_indenizado: resolveBool(p?.projetar_aviso_indenizado, false, src),
    prazo_aviso_previo: resolved((p?.prazo_aviso_previo as any) || 'nao_apurar', src, { isRequired: false }),
    prazo_aviso_dias: resolveNum(p?.prazo_aviso_dias, 0, src),
    limitar_avos_periodo: resolveBool(p?.limitar_avos_periodo, false, src),
    zerar_valor_negativo: resolveBool(p?.zerar_valor_negativo, false, src),
    sabado_dia_util: resolveBool(p?.sabado_dia_util, true, src),
    considerar_feriado_estadual: resolveBool(p?.considerar_feriado_estadual, false, src),
    considerar_feriado_municipal: resolveBool(p?.considerar_feriado_municipal, false, src),
    tipo_mes: resolved((p?.tipo_mes as 'civil' | 'comercial') || 'comercial', src, { isRequired: false }),
    estado: resolved(p?.estado || '', src, { isRequired: true, blocksCalculation: false }),
    municipio: resolved(p?.municipio || '', src, { isRequired: false }),
    carga_horaria_padrao: resolveNum(p?.carga_horaria_padrao, 220, src),
    regime_trabalho: resolved((p?.regime_trabalho as any) || 'tempo_integral', src, { isRequired: false }),
  };

  // ── SALARY ──
  const salary: SalaryHistoryInput[] = sources.historicos.map(h => ({
    id: h.id,
    nome: resolved(h.nome, src),
    periodo_inicio: resolved(h.periodo_inicio || '', src, { isRequired: true }),
    periodo_fim: resolved(h.periodo_fim || '', src, { isRequired: true }),
    tipo_valor: resolved((h.tipo_valor as 'informado' | 'calculado') || 'informado', src),
    valor_informado: resolved(h.valor_informado ?? null, src, { isRequired: false }),
    incidencia_fgts: resolveBool(h.incidencia_fgts, true, src),
    incidencia_cs: resolveBool(h.incidencia_cs, true, src),
    fgts_recolhido: resolveBool(false, false, 'default_audited'),
    cs_recolhida: resolveBool(false, false, 'default_audited'),
    ocorrencias: sources.histOcorrencias
      .filter(o => o.historico_id === h.id)
      .map(o => ({
        id: o.id,
        competencia: o.competencia,
        valor: resolved(o.valor, src),
        tipo: resolved((o.tipo as 'calculado' | 'informado') || 'informado', src),
      })),
  }));

  // ── VERBAS ──
  const verbas: VerbaInput[] = sources.verbas.map(v => {
    const canonical = findCanonicalRubric(v.nome);
    let bcHistoricos: string[] = [];
    if (v.base_calculo && typeof v.base_calculo === 'object') {
      const bc = v.base_calculo as Record<string, unknown>;
      if (Array.isArray(bc.historicos)) bcHistoricos = bc.historicos.map(String);
    }
    if (bcHistoricos.length === 0 && v.hist_salarial_nome) {
      bcHistoricos = [v.hist_salarial_nome];
    }

    return {
      id: v.id,
      nome: resolved(v.nome, src),
      codigo_canonico: canonical ? resolved(canonical.code, 'database') : absent(false, false, 'W_RUBRIC_UNMAPPED'),
      tipo: resolved((v.tipo === 'reflexa' ? 'reflexa' : 'principal') as const, src),
      caracteristica: resolved(v.caracteristica || 'COMUM', src),
      periodo_inicio: resolved(v.periodo_inicio || '', src, { isRequired: true }),
      periodo_fim: resolved(v.periodo_fim || '', src, { isRequired: true }),
      multiplicador: resolveNum(v.multiplicador, 1, src),
      divisor_informado: resolveNum(v.divisor_informado, 1, src),
      base_calculo_historicos: resolved(bcHistoricos, src),
      incidencias: {
        fgts: resolveBool(v.incide_fgts, canonical?.incidencias.fgts ?? true, src),
        irpf: resolveBool(v.incide_ir, canonical?.incidencias.irrf ?? true, src),
        contribuicao_social: resolveBool(v.incide_inss, canonical?.incidencias.inss ?? true, src),
      },
      verba_principal_id: resolveString(v.verba_principal_id, false, false, src),
      depende_jornada: resolved(canonical?.depende_jornada ?? false, canonical ? 'database' : 'default_audited'),
      depende_historico: resolved(canonical?.depende_historico ?? true, canonical ? 'database' : 'default_audited'),
    };
  });

  // ── FÉRIAS ──
  const ferias: FeriasInput[] = sources.ferias.map(f => ({
    id: f.id,
    periodo_aquisitivo_inicio: resolved(f.periodo_aquisitivo_inicio || '', src, { isRequired: true }),
    periodo_aquisitivo_fim: resolved(f.periodo_aquisitivo_fim || '', src, { isRequired: true }),
    dias: resolveNum(f.dias, 30, src),
    situacao: resolved(f.situacao || 'GOZADAS', src),
    dobra: resolveBool(f.dobra, false, src),
    abono: resolveBool(f.abono, false, src),
  }));

  // ── FALTAS ──
  const faltas: FaltaInput[] = sources.faltas.map(f => ({
    id: f.id,
    data_inicial: resolved(f.data_inicial || '', src, { isRequired: true }),
    data_final: resolved(f.data_final || '', src, { isRequired: true }),
    justificada: resolveBool(f.justificada, false, src),
  }));

  // ── JORNADA ──
  const jornada: JornadaInputs = {
    cartao_ponto: sources.cartaoPonto.map(c => ({
      competencia: c.competencia,
      dias_uteis: resolveNum(c.dias_uteis, 0, src),
      dias_trabalhados: resolveNum(c.dias_trabalhados, 0, src),
      horas_extras_50: resolveNum(c.horas_extras_50, 0, src),
      horas_extras_100: resolveNum(c.horas_extras_100, 0, src),
      horas_noturnas: resolveNum(c.horas_noturnas, 0, src),
      intervalo_suprimido: resolveNum(c.intervalo_suprimido, 0, src),
      dsr_horas: resolveNum(c.dsr_horas, 0, src),
      sobreaviso: resolveNum(c.sobreaviso, 0, src),
    })),
    has_daily_apuracao: resolved(sources.cartaoPonto.length > 0, src),
    excecoesCargas: [],
    excecoesSabado: [],
  };

  // ── MONETARY ──
  let combinacoesIndice: any[] = [];
  let combinacoesJuros: any[] = [];
  const atualizacaoCorrecao = sources.atualizacaoConfig?.find((a: any) => a.tipo === 'correcao');
  if (atualizacaoCorrecao?.combinacoes_indice) {
    try {
      combinacoesIndice = typeof atualizacaoCorrecao.combinacoes_indice === 'string'
        ? JSON.parse(atualizacaoCorrecao.combinacoes_indice) : atualizacaoCorrecao.combinacoes_indice;
    } catch { /* ignore */ }
  }
  if (atualizacaoCorrecao?.combinacoes_juros) {
    try {
      combinacoesJuros = typeof atualizacaoCorrecao.combinacoes_juros === 'string'
        ? JSON.parse(atualizacaoCorrecao.combinacoes_juros) : atualizacaoCorrecao.combinacoes_juros;
    } catch { /* ignore */ }
  }

  const monetary: MonetaryInputs = {
    indice_principal: resolved(correcaoCfg?.indice || 'IPCA-E', src, { isRequired: true }),
    combinacoes_indice: resolved(combinacoesIndice, src),
    combinacoes_juros: resolved(combinacoesJuros, src),
    juros_tipo: resolved(correcaoCfg?.juros_tipo || 'simples_mensal', src),
    juros_percentual: resolveNum(correcaoCfg?.juros_percentual, 1, src),
    juros_inicio: resolved((correcaoCfg?.juros_inicio as any) || 'ajuizamento', src),
    juros_apos_deducao_cs: resolveBool(true, true, 'default_audited'),
    ignorar_taxa_negativa: resolveBool(false, false, 'default_audited'),
    base_de_juros_das_verbas: resolved('DIFERENCA', 'default_audited'),
    multa_523: resolveBool(correcaoCfg?.multa_523, false, src),
    multa_523_percentual: resolveNum(correcaoCfg?.multa_523_percentual, 10, src),
    multa_467: resolveBool(false, false, 'default_audited'),
  };

  // ── TAXES ──
  const fgtsCfg = sources.fgtsConfig;
  const csCfg = sources.csConfig;
  const irCfg = sources.irConfig;
  const honCfg = sources.honorarios;
  const custasCfg = sources.custasConfig;

  const taxes: TaxInputs = {
    fgts: {
      apurar: resolveBool(fgtsCfg?.habilitado, true, src),
      multa_percentual: resolveNum(fgtsCfg?.percentual_multa, 40, src),
      multa_apurar: resolveBool(true, true, 'default_audited'),
    },
    cs: {
      apurar_segurado: resolveBool(csCfg?.habilitado, true, src),
      apurar_empresa: resolveBool(true, true, 'default_audited'),
      aliquota_empresa: resolveNum(csCfg?.aliquota_empresa, 20, src),
      aliquota_sat: resolveNum(csCfg?.aliquota_sat, 2, src),
      aliquota_terceiros: resolveNum(csCfg?.aliquota_terceiros, 5.8, src),
      cobrar_reclamante: resolveBool(csCfg?.cobrar_reclamante, true, src),
    },
    ir: {
      apurar: resolveBool(irCfg?.habilitado, true, src),
      dependentes: resolveNum(irCfg?.dependentes, 0, src),
      tributacao_exclusiva_13: resolveBool(true, true, 'default_audited'),
      tributacao_separada_ferias: resolveBool(true, true, 'default_audited'),
      deduzir_cs: resolveBool(true, true, 'default_audited'),
    },
    honorarios: {
      apurar: resolveBool(!!honCfg, false, src),
      percentual: resolveNum(honCfg?.percentual, 15, src),
      base: resolved((honCfg?.sobre as any) || 'condenacao', src),
    },
    custas: {
      apurar: resolveBool(!!custasCfg, false, src),
      percentual: resolveNum(custasCfg?.percentual, 2, src),
      isento: resolveBool(false, false, 'default_audited'),
    },
  };

  // ── REFERENCE TABLES ──
  const referenceTables: ReferenceTables = {
    indices_correcao: resolved(
      { loaded: sources.indicesDB.length > 0, count: sources.indicesDB.length, source: 'database' },
      'database',
      { isRequired: true, blocksCalculation: sources.indicesDB.length === 0 },
    ),
    faixas_inss: resolved(
      { loaded: sources.faixasINSSDB.length > 0, count: sources.faixasINSSDB.length, source: 'database' },
      'database',
      { isRequired: true, blocksCalculation: false }, // engine has fallback constants
    ),
    faixas_ir: resolved(
      { loaded: sources.faixasIRDB.length > 0, count: sources.faixasIRDB.length, source: 'database' },
      'database',
      { isRequired: true, blocksCalculation: false },
    ),
    feriados: resolved(
      { loaded: sources.feriadosDB.length > 0, count: sources.feriadosDB.length, source: 'database' },
      'database',
      { isRequired: false },
    ),
    seguro_desemprego: resolved(
      { loaded: sources.seguroDesempregoDB.length > 0, count: sources.seguroDesempregoDB.length, source: 'database' },
      'database',
      { isRequired: false },
    ),
    salario_familia: resolved(
      { loaded: sources.salarioFamiliaDB.length > 0, count: sources.salarioFamiliaDB.length, source: 'database' },
      'database',
      { isRequired: false },
    ),
  };

  return {
    identification,
    temporal,
    juridical,
    salary,
    jornada,
    verbas,
    ferias,
    faltas,
    monetary,
    taxes,
    referenceTables,
    _version: 1,
    _assembledAt: new Date().toISOString(),
    _inputHash: simpleHash({ identification, temporal, juridical, salary: salary.length, verbas: verbas.length }),
  };
}
