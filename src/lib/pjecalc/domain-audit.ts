import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildTimeline } from "@/domain/timeline-builder";
import { resolveJudicialTitle, type ResolvedTitleState } from "@/domain/judicial-title-resolver";
import type {
  CalculationCompetency,
  CalculationItem,
  EmploymentContract,
  EvidenceSource,
  GlobalCalculationParams,
  InconsistencyFlag,
  JudicialTitleVersion,
  LaborCase,
} from "@/domain/types";
import type { OrchestratorConfig } from "./domain-orchestrator";
import type { PjeFerias, PjeHistoricoSalarial, PjeHistoricoOcorrencia, PjeVerba } from "./engine-types";
import * as svc from "./service";

export interface DomainComparisonRow {
  verba: string;
  competencia: string;
  valorMRD: number;
  valorPJC: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number;
  explicacao?: string;
}

export interface DomainAuditData {
  timeline: CalculationCompetency[];
  title: ResolvedTitleState;
  flags: InconsistencyFlag[];
  rows: DomainComparisonRow[];
  totalMRD: number;
  totalPJC: number;
}

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type ScenarioRow = Database["public"]["Tables"]["calc_scenarios"]["Row"];
type InconsistencyRow = Database["public"]["Tables"]["inconsistency_flags"]["Row"];
type DomainItemRow = Database["public"]["Tables"]["domain_calculation_items"]["Row"];
type TitleVersionRow = Database["public"]["Tables"]["judicial_title_versions"]["Row"];
type JudicialRuleRow = Database["public"]["Tables"]["judicial_rules"]["Row"];
type ContractRow = Database["public"]["Tables"]["employment_contracts"]["Row"];
type SnapshotRow = Pick<Database["public"]["Tables"]["calc_snapshots"]["Row"], "id" | "total_bruto">;
type CalcResultItemRow = Pick<Database["public"]["Tables"]["calc_result_items"]["Row"], "rubrica_codigo" | "competencia" | "valor_bruto">;

function toSerializableJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value));
}

function mapDocumentStatus(status: string | null): EvidenceSource["status"] {
  switch (status) {
    case "processing":
    case "pending":
      return "processing";
    case "indexed":
      return "validated";
    case "failed":
      return "failed";
    default:
      return "uploaded";
  }
}

function toEvidenceSources(caseId: string, documents: DocumentRow[]): EvidenceSource[] {
  return documents.map((doc) => ({
    id: doc.id,
    case_id: caseId,
    tipo: (doc.tipo ?? "manual") as EvidenceSource["tipo"],
    nome: doc.file_name ?? doc.storage_path ?? doc.id,
    periodo_referencia_inicio: doc.periodo_referencia_inicio ?? doc.periodo_inicio ?? undefined,
    periodo_referencia_fim: doc.periodo_referencia_fim ?? doc.periodo_fim ?? undefined,
    status: mapDocumentStatus(doc.status),
    confidence: Math.max(0, Math.min(1, doc.ocr_confidence ?? doc.ocr_confianca ?? 0.75)),
    metadata: typeof doc.metadata === "object" && doc.metadata ? (doc.metadata as Record<string, unknown>) : undefined,
  }));
}

function toScenarioParams(
  params: Awaited<ReturnType<typeof svc.getParametros>>,
  dadosProcesso: Awaited<ReturnType<typeof svc.getDadosProcesso>>,
): GlobalCalculationParams {
  const today = new Date().toISOString().slice(0, 10);
  return {
    data_liquidacao: params?.data_final || today,
    data_ajuizamento: params?.data_ajuizamento || today,
    data_citacao: dadosProcesso?.data_citacao || undefined,
    prescricao_quinquenal: params?.prescricao_quinquenal ?? true,
    data_prescricao: undefined,
    sabado_dia_util: params?.sabado_dia_util ?? true,
    considerar_feriado_estadual: params?.considerar_feriado_estadual ?? true,
    considerar_feriado_municipal: params?.considerar_feriado_municipal ?? true,
    projetar_aviso_indenizado: params?.projetar_aviso_indenizado ?? false,
    zerar_valor_negativo: params?.zerar_valor_negativo ?? true,
    tipo_mes: "comercial",
    carga_horaria_padrao: params?.carga_horaria_padrao || 220,
    estado: params?.estado || "SP",
    municipio: params?.municipio || "São Paulo",
    indice_correcao: "IPCA-E",
    taxa_juros: 1,
    juros_inicio: dadosProcesso?.data_citacao ? "citacao" : "ajuizamento",
  };
}

function toEmploymentContract(
  caseId: string,
  params: Awaited<ReturnType<typeof svc.getParametros>>,
  contract: ContractRow | null,
): EmploymentContract {
  const admissao = contract?.data_admissao || params?.data_admissao;
  if (!admissao) {
    throw new Error("Contrato de trabalho não encontrado para o cálculo de domínio.");
  }

  const demissao = contract?.data_demissao || params?.data_demissao || undefined;
  const cargaHoraria = params?.carga_horaria_padrao || 220;
  const salarioBase = contract?.salario_inicial || params?.ultima_remuneracao || params?.maior_remuneracao || 0;
  const contractId = contract?.id || `contract-${caseId}`;

  return {
    id: contractId,
    case_id: caseId,
    admissao,
    demissao,
    funcao: contract?.funcao || "Função não informada",
    regime: "clt",
    tipo_salario: "misto",
    carga_horaria_semanal: 44,
    jornada_descricao: typeof contract?.jornada_contratual === "object" && contract?.jornada_contratual
      ? JSON.stringify(contract.jornada_contratual)
      : undefined,
    periods: [
      {
        id: `${contractId}-period-1`,
        contract_id: contractId,
        inicio: admissao,
        fim: demissao || params?.data_final || todayString(),
        funcao: contract?.funcao || "Função não informada",
        salario_base: salarioBase,
        carga_horaria: cargaHoraria,
        cct_aplicavel: undefined,
        observacoes: undefined,
      },
    ],
    salary_histories: [],
    events: [],
  };
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function toLaborCase(caseRow: CaseRow, documents: DocumentRow[], contract: EmploymentContract, scenario: OrchestratorConfig["scenario"]): LaborCase {
  return {
    id: caseRow.id,
    numero_processo: caseRow.numero_processo || undefined,
    tribunal: caseRow.tribunal || undefined,
    vara: undefined,
    reclamante: { nome: caseRow.cliente },
    reclamado: { nome: "Parte reclamada não informada" },
    contracts: [contract],
    scenarios: [scenario],
    documents: toEvidenceSources(caseRow.id, documents),
    created_at: (caseRow.criado_em || new Date().toISOString()).slice(0, 10),
    updated_at: (caseRow.atualizado_em || caseRow.criado_em || new Date().toISOString()).slice(0, 10),
  };
}

function toJudicialTitleVersions(
  versions: (TitleVersionRow & { judicial_rules?: JudicialRuleRow[] | null })[],
): JudicialTitleVersion[] {
  return versions.map((version) => ({
    id: version.id,
    case_id: version.case_id,
    versao: version.versao,
    tipo: version.tipo as JudicialTitleVersion["tipo"],
    data_decisao: version.data_decisao,
    descricao: version.descricao,
    fonte_documento_id: version.fonte_documento_id || undefined,
    created_at: version.created_at,
    rules: (version.judicial_rules || []).map((rule) => ({
      id: rule.id,
      title_version_id: rule.title_version_id,
      rubric_code: rule.rubric_code || undefined,
      tipo: rule.tipo as JudicialTitleVersion["rules"][number]["tipo"],
      descricao: rule.descricao,
      parametros: typeof rule.parametros === "object" && rule.parametros ? (rule.parametros as Record<string, unknown>) : {},
      periodo_inicio: rule.periodo_inicio || undefined,
      periodo_fim: rule.periodo_fim || undefined,
      prioridade: rule.prioridade,
      substitui_rule_id: rule.substitui_rule_id || undefined,
      fonte: rule.fonte as JudicialTitleVersion["rules"][number]["fonte"],
      observacoes: rule.observacoes || undefined,
    })),
  }));
}

async function getScenarioRow(caseId: string, ensureExists: boolean): Promise<ScenarioRow | null> {
  const { data: existing, error } = await supabase
    .from("calc_scenarios")
    .select("*")
    .eq("case_id", caseId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;
  if (!ensureExists) return null;

  const { data: created, error: createError } = await supabase
    .from("calc_scenarios")
    .insert({
      case_id: caseId,
      nome: "Cenário principal",
      descricao: "Gerado automaticamente para auditoria do domínio",
      tipo: "principal",
      ativo: true,
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

function toScenario(
  caseId: string,
  scenarioRow: ScenarioRow | null,
  params: Awaited<ReturnType<typeof svc.getParametros>>,
  dadosProcesso: Awaited<ReturnType<typeof svc.getDadosProcesso>>,
): OrchestratorConfig["scenario"] {
  return {
    id: scenarioRow?.id || `preview-${caseId}`,
    case_id: caseId,
    nome: scenarioRow?.nome || "Cenário de auditoria",
    descricao: scenarioRow?.descricao || "Preview do cálculo de domínio",
    tipo: ((scenarioRow?.tipo as OrchestratorConfig["scenario"]["tipo"]) || "principal"),
    ativo: scenarioRow?.ativo ?? true,
    params: toScenarioParams(params, dadosProcesso),
    status: "rascunho",
    created_at: (scenarioRow?.created_at || new Date().toISOString()).slice(0, 10),
    updated_at: (scenarioRow?.updated_at || new Date().toISOString()).slice(0, 10),
  };
}

function mapCaracteristica(value: string | null): PjeVerba["caracteristica"] {
  switch (value) {
    case "13_salario":
    case "aviso_previo":
    case "ferias":
      return value;
    default:
      return "comum";
  }
}

function mapOcorrenciaPagamento(value: string | null): PjeVerba["ocorrencia_pagamento"] {
  switch (value) {
    case "dezembro":
    case "periodo_aquisitivo":
    case "desligamento":
      return value;
    default:
      return "mensal";
  }
}

function toEngineVerbas(rows: Awaited<ReturnType<typeof svc.getVerbas>>, params: Awaited<ReturnType<typeof svc.getParametros>>): PjeVerba[] {
  const periodoInicioDefault = params?.data_admissao || todayString();
  const periodoFimDefault = params?.data_final || params?.data_demissao || todayString();

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    tipo: row.tipo === "reflexa" ? "reflexa" : "principal",
    valor: row.valor === "informado" ? "informado" : "calculado",
    caracteristica: mapCaracteristica(row.caracteristica),
    ocorrencia_pagamento: mapOcorrenciaPagamento(row.ocorrencia_pagamento),
    compor_principal: true,
    zerar_valor_negativo: true,
    dobrar_valor_devido: false,
    periodo_inicio: row.periodo_inicio || periodoInicioDefault,
    periodo_fim: row.periodo_fim || periodoFimDefault,
    base_calculo: {
      historicos: row.hist_salarial_nome ? [row.hist_salarial_nome] : [],
      verbas: [],
      tabelas: [],
      proporcionalizar: false,
      integralizar: false,
    },
    tipo_divisor: "informado",
    divisor_informado: row.divisor_informado || params?.carga_horaria_padrao || 220,
    multiplicador: row.multiplicador || 1,
    tipo_quantidade: "informada",
    quantidade_informada: 1,
    quantidade_proporcionalizar: false,
    exclusoes: {
      faltas_justificadas: false,
      faltas_nao_justificadas: false,
      ferias_gozadas: false,
    },
    valor_informado_devido: row.valor_informado_devido || undefined,
    valor_informado_pago: row.valor_informado_pago || undefined,
    incidencias: {
      fgts: row.incide_fgts ?? true,
      irpf: row.incide_ir ?? false,
      contribuicao_social: row.incide_inss ?? true,
      previdencia_privada: false,
      pensao_alimenticia: false,
    },
    juros_ajuizamento: "ocorrencias_vencidas",
    verba_principal_id: row.verba_principal_id || undefined,
    comportamento_reflexo: "valor_mensal",
    periodo_media_reflexo: "global",
    gerar_verba_reflexa: "diferenca",
    gerar_verba_principal: "devido",
    ordem: row.ordem || 0,
  }));
}

function toEngineFerias(rows: Awaited<ReturnType<typeof svc.getFerias>>): PjeFerias[] {
  return rows.map((row) => ({
    id: row.id,
    relativas: row.periodo_aquisitivo_inicio || row.id,
    periodo_aquisitivo_inicio: row.periodo_aquisitivo_inicio || todayString(),
    periodo_aquisitivo_fim: row.periodo_aquisitivo_fim || todayString(),
    periodo_concessivo_inicio: row.periodo_concessivo_inicio || row.periodo_aquisitivo_fim || todayString(),
    periodo_concessivo_fim: row.periodo_concessivo_fim || row.gozo_fim || todayString(),
    prazo_dias: row.dias || 30,
    situacao: (row.situacao as PjeFerias["situacao"]) || "gozadas",
    dobra: row.dobra,
    abono: row.abono,
    periodos_gozo: row.gozo_inicio
      ? [
          {
            inicio: row.gozo_inicio,
            fim: row.gozo_fim || row.gozo_inicio,
            dias: row.dias || 30,
          },
        ]
      : undefined,
    abono_dias: row.dias_abono || undefined,
  }));
}

function toEngineHistoricos(
  rows: Awaited<ReturnType<typeof svc.getHistoricoSalarial>>,
  ocorrencias: PjeHistoricoOcorrencia[],
): PjeHistoricoSalarial[] {
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    periodo_inicio: row.periodo_inicio || todayString(),
    periodo_fim: row.periodo_fim || todayString(),
    tipo_valor: row.tipo_valor === "calculado" ? "calculado" : "informado",
    valor_informado: row.valor_informado || undefined,
    incidencia_fgts: row.incidencia_fgts,
    incidencia_cs: row.incidencia_cs,
    fgts_recolhido: false,
    cs_recolhida: false,
    ocorrencias: ocorrencias.filter((entry) => entry.historico_id === row.id),
  }));
}

export async function buildDomainExecutionConfig(caseId: string, ensureScenario = false): Promise<OrchestratorConfig> {
  const [pjeData, caseRes, docsRes, contractRes, scenarioRow, titleRes] = await Promise.all([
    svc.loadCaseData(caseId),
    supabase.from("cases").select("*").eq("id", caseId).single(),
    supabase.from("documents").select("*").eq("case_id", caseId).order("uploaded_em", { ascending: false }),
    supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
    getScenarioRow(caseId, ensureScenario),
    supabase.from("judicial_title_versions").select("*, judicial_rules(*)").eq("case_id", caseId).order("versao", { ascending: true }),
  ]);

  if (caseRes.error) throw caseRes.error;
  if (docsRes.error) throw docsRes.error;
  if (contractRes.error) throw contractRes.error;
  if (titleRes.error) throw titleRes.error;
  if (!pjeData.params) throw new Error("Parâmetros do cálculo não preenchidos.");

  const historicoIds = pjeData.historicos.map((item) => item.id);
  const [historicoOcorrencias, ocorrencias] = await Promise.all([
    svc.getHistoricoOcorrenciasByIds(historicoIds) as unknown as Promise<PjeHistoricoOcorrencia[]>,
    svc.getOcorrencias(caseId),
  ]);

  const scenario = toScenario(caseId, scenarioRow, pjeData.params, pjeData.dadosProcesso);
  const contract = toEmploymentContract(caseId, pjeData.params, contractRes.data);
  const laborCase = toLaborCase(caseRes.data, docsRes.data || [], contract, scenario);
  const titleVersions = toJudicialTitleVersions((titleRes.data || []) as (TitleVersionRow & { judicial_rules?: JudicialRuleRow[] | null })[]);

  return {
    laborCase,
    contract,
    scenario,
    titleVersions,
    verbas: toEngineVerbas(pjeData.verbas, pjeData.params),
    historicos: toEngineHistoricos(pjeData.historicos, historicoOcorrencias),
    cartaoPonto: pjeData.cartaoPonto,
    faltas: pjeData.faltas,
    ferias: toEngineFerias(pjeData.ferias),
    ocorrencias,
    resultadoFinanceiro: pjeData.resultado,
  };
}

function serializeItem(item: CalculationItem): Database["public"]["Tables"]["domain_calculation_items"]["Insert"] {
  return {
    id: item.id,
    scenario_id: item.scenario_id,
    rubric_code: item.rubric_code,
    rubric_name: item.rubric_name,
    competencia: item.competencia,
    base: item.base.toNumber(),
    base_source: item.base_source,
    divisor: item.divisor.toNumber(),
    divisor_source: item.divisor_source,
    multiplicador: item.multiplicador.toNumber(),
    quantidade: item.quantidade.toNumber(),
    quantidade_source: item.quantidade_source,
    dobra: item.dobra.toNumber(),
    valor_devido: item.valor_devido.toNumber(),
    valor_pago: item.valor_pago.toNumber(),
    diferenca: item.diferenca.toNumber(),
    correcao: item.correcao.toNumber(),
    juros: item.juros.toNumber(),
    total: item.total.toNumber(),
    formula_aplicada: item.formula_aplicada,
    judicial_rule_id: item.judicial_rule_id || null,
    ativo: item.ativo,
    reflections: toSerializableJson(item.reflections.map((reflection) => ({ ...reflection, valor: reflection.valor.toNumber() }))),
    incidences: toSerializableJson(item.incidences.map((incidence) => ({
      ...incidence,
      base: incidence.base.toNumber(),
      aliquota: incidence.aliquota.toNumber(),
      valor: incidence.valor.toNumber(),
    }))),
    offsets: toSerializableJson(item.offsets.map((offset) => ({ ...offset, valor_abatido: offset.valor_abatido.toNumber() }))),
    audit_trail: toSerializableJson(item.audit_trail),
  };
}

export async function persistDomainAuditSnapshot(
  caseId: string,
  scenarioId: string,
  items: CalculationItem[],
  flags: InconsistencyFlag[],
): Promise<void> {
  const [deleteItemsRes, deleteFlagsRes] = await Promise.all([
    supabase.from("domain_calculation_items").delete().eq("scenario_id", scenarioId),
    supabase.from("inconsistency_flags").delete().eq("case_id", caseId).eq("scenario_id", scenarioId),
  ]);

  if (deleteItemsRes.error) throw deleteItemsRes.error;
  if (deleteFlagsRes.error) throw deleteFlagsRes.error;

  if (items.length > 0) {
    const rows = items.map(serializeItem);
    for (let index = 0; index < rows.length; index += 200) {
      const chunk = rows.slice(index, index + 200);
      const { error } = await supabase.from("domain_calculation_items").insert(chunk);
      if (error) throw error;
    }
  }

  if (flags.length > 0) {
    const rows: Database["public"]["Tables"]["inconsistency_flags"]["Insert"][] = flags.map((flag) => ({
      id: flag.id,
      case_id: flag.case_id,
      scenario_id: flag.scenario_id || scenarioId,
      categoria: flag.categoria,
      severidade: flag.severidade,
      competencia: flag.competencia || null,
      rubric_code: flag.rubric_code || null,
      descricao: flag.descricao,
      sugestao: flag.sugestao || null,
      resolvido: flag.resolvido,
      resolvido_em: flag.resolvido_em || null,
      resolvido_por: flag.resolvido_por || null,
    }));

    const { error } = await supabase.from("inconsistency_flags").insert(rows);
    if (error) throw error;
  }
}

function buildTimelineFromConfig(config: OrchestratorConfig): CalculationCompetency[] {
  return buildTimeline({
    contract: config.contract,
    calendarRules: [],
    normativeRules: [],
    evidenceSources: config.laborCase.documents || [],
    sabadoDiaUtil: config.scenario.params.sabado_dia_util,
    considerarFeriadoEstadual: config.scenario.params.considerar_feriado_estadual,
    considerarFeriadoMunicipal: config.scenario.params.considerar_feriado_municipal,
  });
}

function aggregateDomainItems(items: DomainItemRow[]): Map<string, { verba: string; competencia: string; valor: number }> {
  const map = new Map<string, { verba: string; competencia: string; valor: number }>();
  for (const item of items) {
    const key = `${item.rubric_code}::${item.competencia}`;
    const current = map.get(key);
    if (current) current.valor += item.total;
    else map.set(key, { verba: item.rubric_name || item.rubric_code, competencia: item.competencia, valor: item.total });
  }
  return map;
}

function aggregateReferenceItems(items: CalcResultItemRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = `${item.rubrica_codigo}::${item.competencia || "sem_competencia"}`;
    map.set(key, (map.get(key) || 0) + item.valor_bruto);
  }
  return map;
}

function addClosingReferenceRows(
  map: Map<string, number>,
  resultado: Awaited<ReturnType<typeof svc.getResultado>>,
) {
  if (!resultado) return map;

  const add = (code: string, value: number) => {
    if (Math.abs(value) < 0.005) return;
    map.set(`${code}::fechamento`, value);
  };

  add("FECHAMENTO_IRRF", -(resultado.irrf || 0));
  add("FECHAMENTO_CS_EMPREGADOR", resultado.inss_patronal || 0);
  add("FECHAMENTO_HONORARIOS", resultado.honorarios || 0);
  add("FECHAMENTO_CUSTAS", resultado.custas || 0);
  add("FECHAMENTO_FGTS", (resultado.fgts_depositar || 0) + (resultado.fgts_multa_40 || 0));

  return map;
}

function explainDifference(deltaPercent: number): string {
  const abs = Math.abs(deltaPercent);
  if (abs < 0.5) return "Paridade muito próxima entre os motores.";
  if (abs < 5) return "Diferença residual de base, divisor ou arredondamento.";
  return "Diferença material; revisar regras jurídicas, reflexos ou incidências.";
}

export async function loadDomainAuditData(caseId: string): Promise<DomainAuditData> {
  const config = await buildDomainExecutionConfig(caseId, false);
  const title = resolveJudicialTitle(config.titleVersions);
  const timeline = buildTimelineFromConfig(config);
  const actualScenarioId = config.scenario.id.startsWith("preview-") ? null : config.scenario.id;

  const [flagsRes, itemsRes, snapshotRes] = await Promise.all([
    actualScenarioId
      ? supabase.from("inconsistency_flags").select("*").eq("case_id", caseId).eq("scenario_id", actualScenarioId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    actualScenarioId
      ? supabase.from("domain_calculation_items").select("*").eq("scenario_id", actualScenarioId).order("competencia", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("calc_snapshots").select("id, total_bruto").eq("case_id", caseId).order("versao", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (flagsRes.error) throw flagsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (snapshotRes.error) throw snapshotRes.error;

  const domainItems = (itemsRes.data || []) as DomainItemRow[];
  const flags = ((flagsRes.data || []) as InconsistencyRow[]).map((flag) => ({
    id: flag.id,
    case_id: flag.case_id,
    scenario_id: flag.scenario_id || undefined,
    categoria: flag.categoria as InconsistencyFlag["categoria"],
    severidade: flag.severidade as InconsistencyFlag["severidade"],
    competencia: flag.competencia || undefined,
    rubric_code: flag.rubric_code || undefined,
    descricao: flag.descricao,
    sugestao: flag.sugestao || undefined,
    resolvido: flag.resolvido,
    resolvido_por: flag.resolvido_por || undefined,
    resolvido_em: flag.resolvido_em || undefined,
    created_at: flag.created_at,
  }));

  let referenceItems: CalcResultItemRow[] = [];
  const latestSnapshot = snapshotRes.data as SnapshotRow | null;
  if (latestSnapshot?.id) {
    const { data, error } = await supabase.from("calc_result_items").select("rubrica_codigo, competencia, valor_bruto").eq("snapshot_id", latestSnapshot.id);
    if (error) throw error;
    referenceItems = (data || []) as CalcResultItemRow[];
  }

  const domainMap = aggregateDomainItems(domainItems);
  const referenceMap = addClosingReferenceRows(aggregateReferenceItems(referenceItems), config.resultadoFinanceiro);
  const keys = new Set([...domainMap.keys(), ...referenceMap.keys()]);

  const rows: DomainComparisonRow[] = Array.from(keys).map((key) => {
    const domain = domainMap.get(key);
    const valorPJC = referenceMap.get(key) || 0;
    const valorMRD = domain?.valor || 0;
    const diferencaAbsoluta = valorMRD - valorPJC;
    const diferencaPercentual = valorPJC !== 0 ? (diferencaAbsoluta / valorPJC) * 100 : valorMRD === 0 ? 0 : 100;
    const [rubricaCodigo, competencia] = key.split("::");

    return {
      verba: domain?.verba || rubricaCodigo,
      competencia,
      valorMRD,
      valorPJC,
      diferencaAbsoluta,
      diferencaPercentual,
      explicacao: explainDifference(diferencaPercentual),
    };
  });

  return {
    timeline,
    title,
    flags,
    rows,
    totalMRD: domainItems.reduce((acc, item) => acc + item.total, 0),
    totalPJC: config.resultadoFinanceiro?.total_reclamado || latestSnapshot?.total_bruto || referenceItems.reduce((acc, item) => acc + item.valor_bruto, 0),
  };
}
