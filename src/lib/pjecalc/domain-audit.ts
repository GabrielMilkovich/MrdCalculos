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
    confidence: Math.max(0, Math.min(1, (doc.ocr_confidence ?? doc.ocr_confianca ?? 0.75))),
    metadata: typeof doc.metadata === "object" && doc.metadata ? (doc.metadata as Record<string, unknown>) : undefined,
  }));
}

function toScenarioParams(params: Awaited<ReturnType<typeof svc.getParametros>>): GlobalCalculationParams {
  const today = new Date().toISOString().slice(0, 10);
  return {
    data_liquidacao: params?.data_final || today,
    data_ajuizamento: params?.data_ajuizamento || today,
    data_citacao: params?.data_citacao || undefined,
    prescricao_quinquenal: params?.prescricao_quinquenal ?? true,
    data_prescricao: params?.data_prescricao_quinquenal || undefined,
    sabado_dia_util: params?.sabado_dia_util ?? true,
    considerar_feriado_estadual: params?.considerar_feriado_estadual ?? true,
    considerar_feriado_municipal: params?.considerar_feriado_municipal ?? true,
    projetar_aviso_indenizado: params?.projetar_aviso_indenizado ?? false,
    zerar_valor_negativo: params?.zerar_valor_negativo ?? true,
    tipo_mes: params?.tipo_mes === "civil" ? "civil" : "comercial",
    carga_horaria_padrao: params?.carga_horaria_padrao || 220,
    estado: params?.estado || "SP",
    municipio: params?.municipio || "São Paulo",
    indice_correcao: "IPCA-E",
    taxa_juros: 1,
    juros_inicio: params?.data_citacao ? "citacao" : "ajuizamento",
  };
}

function toEmploymentContract(caseId: string, params: Awaited<ReturnType<typeof svc.getParametros>>, contract: ContractRow | null): EmploymentContract {
  const admissao = contract?.data_admissao || params?.data_admissao;
  if (!admissao) {
    throw new Error("Contrato de trabalho não encontrado para o cálculo de domínio.");
  }

  const demissao = contract?.data_demissao || params?.data_demissao || undefined;
  const jornadaDescricao = typeof contract?.jornada_contratual === "object" && contract?.jornada_contratual
    ? JSON.stringify(contract.jornada_contratual)
    : undefined;
  const cargaHoraria = params?.carga_horaria_padrao || 220;
  const salarioBase = contract?.salario_inicial || params?.ultima_remuneracao || params?.maior_remuneracao || 0;

  return {
    id: contract?.id || `contract-${caseId}`,
    case_id: caseId,
    admissao,
    demissao,
    funcao: contract?.funcao || "Função não informada",
    regime: "clt",
    tipo_salario: "misto",
    carga_horaria_semanal: Math.round((cargaHoraria / 5) * 1.0),
    jornada_descricao: jornadaDescricao,
    periods: [
      {
        id: `${contract?.id || `contract-${caseId}`}-period-1`,
        contract_id: contract?.id || `contract-${caseId}`,
        inicio: admissao,
        fim: demissao || params?.data_final || new Date().toISOString().slice(0, 10),
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
      tipo: rule.tipo as JudicialRuleRow["tipo"] & any,
      descricao: rule.descricao,
      parametros: typeof rule.parametros === "object" && rule.parametros ? (rule.parametros as Record<string, unknown>) : {},
      periodo_inicio: rule.periodo_inicio || undefined,
      periodo_fim: rule.periodo_fim || undefined,
      prioridade: rule.prioridade,
      substitui_rule_id: rule.substitui_rule_id || undefined,
      fonte: rule.fonte as any,
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

function toScenario(caseId: string, scenarioRow: ScenarioRow | null, params: Awaited<ReturnType<typeof svc.getParametros>>): OrchestratorConfig["scenario"] {
  const globalParams = toScenarioParams(params);

  return {
    id: scenarioRow?.id || `preview-${caseId}`,
    case_id: caseId,
    nome: scenarioRow?.nome || "Cenário de auditoria",
    descricao: scenarioRow?.descricao || "Preview do cálculo de domínio",
    tipo: (scenarioRow?.tipo as OrchestratorConfig["scenario"]["tipo"]) || "principal",
    ativo: scenarioRow?.ativo ?? true,
    params: globalParams,
    status: (scenarioRow?.tipo ? "calculado" : "rascunho") as OrchestratorConfig["scenario"]["status"],
    created_at: (scenarioRow?.created_at || new Date().toISOString()).slice(0, 10),
    updated_at: (scenarioRow?.updated_at || new Date().toISOString()).slice(0, 10),
  };
}

export async function buildDomainExecutionConfig(caseId: string, ensureScenario = false): Promise<OrchestratorConfig> {
  const [pjeData, caseRes, docsRes, contractRes, scenarioRow, titleRes] = await Promise.all([
    svc.loadCaseData(caseId),
    supabase.from("cases").select("*").eq("id", caseId).single(),
    supabase.from("documents").select("*").eq("case_id", caseId).order("uploaded_em", { ascending: false }),
    supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
    getScenarioRow(caseId, ensureScenario),
    supabase
      .from("judicial_title_versions")
      .select("*, judicial_rules(*)")
      .eq("case_id", caseId)
      .order("versao", { ascending: true }),
  ]);

  if (caseRes.error) throw caseRes.error;
  if (docsRes.error) throw docsRes.error;
  if (contractRes.error) throw contractRes.error;
  if (titleRes.error) throw titleRes.error;
  if (!pjeData.params) throw new Error("Parâmetros do cálculo não preenchidos.");

  const scenario = toScenario(caseId, scenarioRow, pjeData.params);
  const contract = toEmploymentContract(caseId, pjeData.params, contractRes.data);
  const laborCase = toLaborCase(caseRes.data, docsRes.data || [], contract, scenario);
  const titleVersions = toJudicialTitleVersions((titleRes.data || []) as (TitleVersionRow & { judicial_rules?: JudicialRuleRow[] | null })[]);

  return {
    laborCase,
    contract,
    scenario,
    titleVersions,
    verbas: pjeData.verbas,
    historicos: pjeData.historicos,
    cartaoPonto: pjeData.cartaoPonto,
    faltas: pjeData.faltas,
    ferias: pjeData.ferias,
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
    reflections: item.reflections.map((reflection) => ({
      ...reflection,
      valor: reflection.valor.toNumber(),
    })),
    incidences: item.incidences.map((incidence) => ({
      ...incidence,
      base: incidence.base.toNumber(),
      aliquota: incidence.aliquota.toNumber(),
      valor: incidence.valor.toNumber(),
    })),
    offsets: item.offsets.map((offset) => ({
      ...offset,
      valor_abatido: offset.valor_abatido.toNumber(),
    })),
    audit_trail: item.audit_trail,
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
    if (current) {
      current.valor += item.total;
    } else {
      map.set(key, {
        verba: item.rubric_name || item.rubric_code,
        competencia: item.competencia,
        valor: item.total,
      });
    }
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
    const { data, error } = await supabase
      .from("calc_result_items")
      .select("rubrica_codigo, competencia, valor_bruto")
      .eq("snapshot_id", latestSnapshot.id);
    if (error) throw error;
    referenceItems = (data || []) as CalcResultItemRow[];
  }

  const domainMap = aggregateDomainItems(domainItems);
  const referenceMap = aggregateReferenceItems(referenceItems);
  const keys = new Set([...domainMap.keys(), ...referenceMap.keys()]);

  const rows: DomainComparisonRow[] = Array.from(keys).map((key) => {
    const domain = domainMap.get(key);
    const reference = referenceMap.get(key) || 0;
    const valorMRD = domain?.valor || 0;
    const valorPJC = reference;
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
    totalPJC: latestSnapshot?.total_bruto || referenceItems.reduce((acc, item) => acc + item.valor_bruto, 0),
  };
}
