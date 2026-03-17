import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseWorkspace } from "@/components/cases/CaseWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, Play, FileText, Sparkles, ShieldCheck,
  Calculator, FileStack, Scroll, RefreshCw, ChevronRight, Check,
  Settings2, Clock, ArrowRight, CheckCircle2, XCircle, TrendingUp, BookOpen,
  Search, FileWarning, CircleAlert, CircleCheck, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import components
import { FactValidationView } from "@/components/cases/FactValidationView";
import { ValidationViewV2 } from "@/components/cases/ValidationViewV2";
import { CalculatorSuggestions } from "@/components/cases/CalculatorSuggestions";
import { DocumentsManager } from "@/components/cases/DocumentsManager";
import { ProcessingMonitorPanel } from "@/components/cases/ProcessingMonitorPanel";
import { CalculationDetailView } from "@/components/cases/CalculationDetailView";
import { PetitionGenerator } from "@/components/cases/PetitionGenerator";
import { PremissasEditor } from "@/components/cases/PremissasEditor";
import { CaseBriefing } from "@/components/cases/CaseBriefing";
import { RiskAnalysisPanel } from "@/components/cases/pericial/RiskAnalysisPanel";
import { TimelineView } from "@/components/cases/audit/TimelineView";
import { TitleConsolidationView } from "@/components/cases/audit/TitleConsolidationView";
import { InconsistencyPanel } from "@/components/cases/audit/InconsistencyPanel";
import { ComparisonView } from "@/components/cases/audit/ComparisonView";
import { ControversyManager } from "@/components/cases/pericial/ControversyManager";
import { ScenarioManager } from "@/components/cases/pericial/ScenarioManager";
import { PjeCalcSummaryWidget } from "@/components/cases/PjeCalcSummaryWidget";
import { PjeCalcInline } from "@/components/cases/PjeCalcInline";
import {
  CalculationEngine,
  type CalculatorRules,
  type FactMap,
  type IndexSeries,
  type TaxTable,
} from "@/lib/calculation";
import { runCrossValidation, applyCorrections, type CrossValidationResult } from "@/lib/calculation/cross-validation";
import { orchestrateCalculation } from "@/lib/pjecalc/domain-orchestrator";
import { buildDomainExecutionConfig, loadDomainAuditData, persistDomainAuditSnapshot } from "@/lib/pjecalc/domain-audit";

// =====================================================
// TYPES
// =====================================================
interface CaseData {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
  tags?: string[] | null;
}

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  origem: string;
  confianca: number | null;
  confirmado: boolean;
  citacao?: string | null;
  pagina?: number | null;
}

const CRITICAL_FACTS = ["data_admissao", "data_demissao", "salario_base", "salario_mensal", "jornada_contratual"];
const criticalLabels: Record<string, string> = {
  data_admissao: "Data de Admissão",
  data_demissao: "Data de Demissão",
  salario_base: "Salário Base",
  salario_mensal: "Salário Mensal",
  jornada_contratual: "Jornada Contratual",
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("documentos");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [isExtractingFacts, setIsExtractingFacts] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewElapsed, setReviewElapsed] = useState(0);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [createCriticalKeyRequest, setCreateCriticalKeyRequest] = useState<string | null>(null);
  const [createCriticalNonce, setCreateCriticalNonce] = useState(0);

  // Timer for review elapsed time
  useEffect(() => {
    if (!isReviewing) return;
    const interval = setInterval(() => setReviewElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isReviewing]);

  // =====================================================
  // DATA FETCHING
  // =====================================================
  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (error) throw error;
      return data as CaseData;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("case_id", id).order("uploaded_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: facts = [] } = useQuery({
    queryKey: ["facts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("facts").select("*").eq("case_id", id).order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Fact[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calculation_profiles").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["calculation_runs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("calculation_runs").select("*").eq("case_id", id).order("executado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: snapshotsData = [] } = useQuery({
    queryKey: ["calc_snapshots", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("calc_snapshots").select("id, total_bruto, versao, status").eq("case_id", id).order("versao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Also fetch PJe-Calc liquidação total for the header display
  const { data: pjecalcLiquidacao } = useQuery({
    queryKey: ["pjecalc_liquidacao", id],
    queryFn: async () => {
      const svc = await import("@/lib/pjecalc/service");
      return svc.getResultado(id!);
    },
  });

  const { data: extractionsCount = 0 } = useQuery({
    queryKey: ["extractions_count", id],
    queryFn: async () => {
      const { count, error } = await supabase.from("extractions").select("id", { count: "exact" }).eq("case_id", id).eq("status", "pendente");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: processingStats = null } = useQuery({
    queryKey: ["case_processing_stats", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("case_processing_stats").select("*").eq("case_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: chunksCountDirect = 0 } = useQuery({
    queryKey: ["document_chunks_count", id],
    queryFn: async () => {
      const { count, error } = await supabase.from("document_chunks").select("id", { count: "exact" }).eq("case_id", id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: domainAuditData, isLoading: domainAuditLoading } = useQuery({
    queryKey: ["domain_audit", id],
    queryFn: async () => loadDomainAuditData(id!),
    enabled: !!id && activeTab === "auditoria",
  });

  // =====================================================
  // MUTATIONS
  // =====================================================
  const updateStatusMutation = useMutation({
    mutationFn: async (status: CaseData["status"]) => {
      const { error } = await supabase.from("cases").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      toast.success("Status atualizado!");
    },
  });

  // =====================================================
  // LOADING / ERROR STATES
  // =====================================================
  if (caseLoading) {
    return (
      <MainLayoutPremium breadcrumbs={[{ label: "Casos", href: "/casos" }, { label: "Carregando..." }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayoutPremium>
    );
  }

  if (!caseData) {
    return (
      <MainLayoutPremium breadcrumbs={[{ label: "Casos", href: "/casos" }, { label: "Não encontrado" }]}>
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">Caso não encontrado</h3>
          <p className="empty-state-description">O caso solicitado não existe ou você não tem permissão.</p>
          <Button onClick={() => navigate("/casos")} className="mt-4">Voltar para Casos</Button>
        </div>
      </MainLayoutPremium>
    );
  }

  // =====================================================
  // DERIVED STATE
  // =====================================================
  const confirmedFacts = facts.filter(f => f.confirmado);
  const criticalFactsInCase = facts.filter(f => CRITICAL_FACTS.includes(f.chave));
  const isTestCase = caseData.tags?.includes("teste_avancado");
  const canCalculate = isTestCase || (criticalFactsInCase.length > 0 && criticalFactsInCase.every(f => f.confirmado));
  const missingCriticalKeys = CRITICAL_FACTS.filter(k => !facts.some(f => f.chave === k));
  const chunksCount = Math.max(processingStats?.total_chunks ?? 0, chunksCountDirect ?? 0);
  const snapshotsCount = snapshotsData.length;
  // Use most recent total from either calc_snapshots or pjecalc_liquidacao_resultado
  const snapshotTotal = snapshotsData[0]?.total_bruto ?? null;
  const pjecalcTotal = pjecalcLiquidacao?.total_bruto ?? null;
  const latestTotal = pjecalcTotal ?? snapshotTotal;

  // Progress calculation
  const progressSteps = [
    isTestCase || documents.length > 0,
    isTestCase || facts.length > 0,
    canCalculate,
    snapshotsCount > 0,
    caseData.status === "revisado",
  ];
  const progressPercent = Math.round((progressSteps.filter(Boolean).length / progressSteps.length) * 100);

  // =====================================================
  // WORKFLOW STEPS (simplified to 6)
  // =====================================================
  const workflowSteps = [
    ...(snapshotsCount > 0 ? [{
      id: "resumo", label: "Resumo", icon: FileText,
      completed: documents.length > 0 && facts.length > 0,
      active: activeTab === "resumo",
      tooltip: "Visão geral do caso",
    }] : []),
    {
      id: "documentos", label: "Documentos", icon: FileStack,
      completed: documents.length > 0,
      active: activeTab === "documentos",
      count: documents.length,
      tooltip: "Upload e OCR de documentos",
    },
    {
      id: "validacao", label: "Validação", icon: ShieldCheck,
      completed: canCalculate,
      active: activeTab === "validacao",
      count: facts.filter(f => !f.confirmado).length || undefined,
      tooltip: "Extração e validação de fatos",
    },
    // Premissas mesclada com Cálculo
    {
      id: "calculo", label: "Cálculo", icon: Calculator,
      completed: snapshotsCount > 0,
      active: activeTab === "calculo",
      count: snapshotsCount || undefined,
      tooltip: "Execução e snapshots de cálculo",
    },
    // {
    //   id: "peticao", label: "Petição", icon: Scroll,
    //   completed: caseData.status === "revisado",
    //   active: activeTab === "peticao",
    //   tooltip: "Geração de petição inicial",
    // },
    {
      id: "roteiro", label: "Diagnóstico", icon: BookOpen,
      completed: false,
      active: activeTab === "roteiro",
      tooltip: "Diagnóstico completo do caso gerado por IA",
    },
    {
      id: "auditoria", label: "Auditoria", icon: Search,
      completed: false,
      active: activeTab === "auditoria",
      tooltip: "Timeline, título executivo, inconsistências e comparação",
    },
  ];

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  const mapFactsToEngine = (allFacts: Fact[]): FactMap => {
    const out: FactMap = {};
    for (const f of allFacts) {
      const tipo = ((): FactMap[string]["tipo"] => {
        if (f.tipo === "boolean") return "booleano";
        if (f.tipo === "numero") return "numero";
        if (f.tipo === "data") return "data";
        if (f.tipo === "moeda") return "moeda";
        return "texto";
      })();
      out[f.chave] = { valor: f.valor, tipo, confianca: f.confianca ?? undefined, confirmado: !!f.confirmado };
    }
    return out;
  };

  const runFactExtraction = async () => {
    if (!id) return;
    setIsExtractingFacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-facts-rag", { body: { case_id: id } });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["facts", id] });
      toast.success(`Extração concluída: ${data?.facts_valid ?? 0} fato(s) válido(s)`);
    } catch (e) {
      toast.error("Falha ao extrair fatos: " + (e as Error).message);
    } finally {
      setIsExtractingFacts(false);
    }
  };

  const restartFactExtraction = async () => {
    if (!id || !chunksCount) return;
    if (!window.confirm("Isso apagará todos os fatos e reexecutará a extração. Continuar?")) return;
    setIsExtractingFacts(true);
    try {
      await supabase.from("facts").delete().eq("case_id", id);
      await queryClient.invalidateQueries({ queryKey: ["facts", id] });
      const { data, error } = await supabase.functions.invoke("extract-facts-rag", { body: { case_id: id } });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["facts", id] });
      toast.success(`Extração reiniciada: ${data?.facts_valid ?? 0} fato(s)`);
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    } finally {
      setIsExtractingFacts(false);
    }
  };

  // =====================================================
  // PRE-CALC REVIEW (runs before calculation)
  // =====================================================
  const runPreCalcReview = async () => {
    if (!id || !selectedProfile || !canCalculate) {
      if (!selectedProfile) toast.error("Selecione um perfil de cálculo.");
      if (!canCalculate) toast.error("Confirme os fatos críticos primeiro.");
      return;
    }

    setIsReviewing(true);
    setReviewElapsed(0);
    try {
      const { data, error } = await supabase.functions.invoke("pre-calc-review", {
        body: { case_id: id },
      });

      if (error) throw error;

      if (data?.review) {
        setReviewResult(data);
        setShowReviewDialog(true);
      } else {
        toast.warning("Revisão não retornou resultados. Prosseguindo com cálculo...");
        await executeCalculation();
      }
    } catch (e) {
      console.error("Pre-calc review error:", e);
      toast.error("Erro na revisão: " + (e as Error).message);
    } finally {
      setIsReviewing(false);
    }
  };

  const executeCalculation = async () => {
    setShowReviewDialog(false);
    if (!id || !selectedProfile || !canCalculate) {
      return;
    }

    setIsCalculating(true);
    try {
      // Sempre recarregar fatos do banco antes de cada cálculo (evita estado stale)
      const { data: currentFacts, error: factsError } = await supabase
        .from("facts")
        .select("*")
        .eq("case_id", id)
        .order("criado_em", { ascending: false });
      if (factsError) throw factsError;
      const factsForRun = (currentFacts || []) as Fact[];

      // Load profile + calculators + indices + tables
      const { data: profile } = await supabase.from("calculation_profiles").select("*").eq("id", selectedProfile).single();
      if (!profile) throw new Error("Perfil não encontrado");

      const { data: profileCalcs } = await supabase
        .from("profile_calculators")
        .select(`calculator_version_id, calculator_versions:calculator_version_id (id, versao, vigencia_inicio, vigencia_fim, regras, calculators:calculator_id ( id, nome ))`)
        .eq("profile_id", selectedProfile);

      const calculatorsWithRules = (profileCalcs || [])
        .map((row: Record<string, unknown>) => {
          const cv = row.calculator_versions as Record<string, unknown> | null;
          const calc = cv?.calculators as Record<string, unknown> | null;
          if (!cv || !calc?.nome) return null;
          const regrasObj = cv.regras as Record<string, unknown> | null;
          return {
            nome: String(calc.nome),
            rules: { versao: cv.versao, vigencia_inicio: cv.vigencia_inicio, vigencia_fim: cv.vigencia_fim ?? undefined, regras: (regrasObj?.regras ?? regrasObj ?? {}) as Record<string, unknown>, formula: regrasObj?.formula ?? undefined } as CalculatorRules,
          };
        })
        .filter(Boolean) as { nome: string; rules: CalculatorRules }[];

      const adm = factsForRun.find(f => f.chave === "data_admissao")?.valor;
      const dem = factsForRun.find(f => f.chave === "data_demissao")?.valor;

      // Fix definitivo: garante cálculo de verbas rescisórias quando há vínculo encerrado,
      // mesmo que o perfil ainda não tenha essa calculadora vinculada no admin.
      const hasRescisoriasCalculator = calculatorsWithRules.some(c => c.nome === "verbas_rescisorias");
      if (adm && dem && !hasRescisoriasCalculator) {
        calculatorsWithRules.push({
          nome: "verbas_rescisorias",
          rules: {
            versao: "1.0.0",
            vigencia_inicio: new Date().toISOString().slice(0, 10),
            regras: {},
          } as CalculatorRules,
        });
      }

      const start = adm ? new Date(adm) : null;
      const end = dem ? new Date(dem) : null;

      const [indexRes, taxRes] = await Promise.all([
        supabase.from("index_series").select("nome, competencia, valor, fonte").order("competencia")
          .gte("competencia", start?.toISOString().slice(0, 10) || "1900-01-01")
          .lte("competencia", end?.toISOString().slice(0, 10) || "2100-01-01"),
        supabase.from("tax_tables").select("id, tipo, vigencia_inicio, vigencia_fim, faixas").order("vigencia_inicio"),
      ]);

      const indices: IndexSeries[] = (indexRes.data || []).map((r: Record<string, unknown>) => ({ nome: r.nome as string, competencia: new Date(r.competencia as string), valor: Number(r.valor), fonte: (r.fonte as string) ?? undefined }));
      const taxTables: TaxTable[] = (taxRes.data || []).map((t: Record<string, unknown>) => ({ id: t.id as string, tipo: t.tipo as "inss" | "irrf", vigencia_inicio: new Date(t.vigencia_inicio as string), vigencia_fim: t.vigencia_fim ? new Date(t.vigencia_fim as string) : undefined, faixas: Array.isArray(t.faixas) ? t.faixas : [] }));

      // ═══ VALIDAÇÃO CRUZADA DE FATOS ═══
      // Detecta inconsistências entre documentos (ex: código FGTS vs tipo_demissao do OCR)
      const rawFactMap = mapFactsToEngine(factsForRun);
      const crossValidation = runCrossValidation(rawFactMap);

      // Mostrar alertas ao advogado
      if (crossValidation.alerts.length > 0) {
        for (const alert of crossValidation.alerts) {
          toast.warning(alert.titulo, {
            description: alert.recomendacao,
            duration: 10000,
          });
        }
      }

      // Aplicar correções automáticas (ex: código FGTS prevalece)
      const correctedFactMap = crossValidation.corrections.length > 0
        ? applyCorrections(rawFactMap, crossValidation.corrections)
        : rawFactMap;

      // Persistir correções no banco se houver
      if (crossValidation.corrections.length > 0) {
        await Promise.all(crossValidation.corrections.map(async (correction) => {
          const aliasKeys = correction.campo === "tipo_demissao"
            ? ["tipo_demissao", "motivo_demissao"]
            : [correction.campo];

          const factToUpdate = factsForRun.find(f => aliasKeys.includes(f.chave));

          if (factToUpdate) {
            const { error: updateError } = await supabase
              .from("facts")
              .update({
                valor: correction.valor_corrigido,
                confianca: correction.confianca,
              })
              .eq("id", factToUpdate.id);
            if (updateError) throw updateError;
            return;
          }

          const { error: insertError } = await supabase.from("facts").insert({
            case_id: id,
            chave: correction.campo,
            valor: correction.valor_corrigido,
            tipo: "texto" as const,
            origem: "ia_extracao" as const,
            confianca: correction.confianca,
            confirmado: false,
          });
          if (insertError) throw insertError;
        }));
        // Criar controvérsia para registro
        for (const alert of crossValidation.alerts) {
          await supabase.from("case_controversies").insert({
            case_id: id,
            campo: alert.campo_afetado,
            descricao: alert.descricao,
            status: 'resolvido',
            valor_escolhido: crossValidation.corrections.find(c => c.campo === alert.campo_afetado)?.valor_corrigido || null,
            justificativa: alert.recomendacao,
            fundamentacao_legal: `Código FGTS/eSocial — Manual CEF`,
            prioridade: alert.severidade === 'critica' ? 'alta' : 'media',
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["facts", id] });
        toast.info(`${crossValidation.corrections.length} fato(s) corrigido(s) pela validação cruzada documental.`);
      }

      // Execute engine with corrected facts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = new CalculationEngine({ id: profile.id, nome: profile.nome, config: (profile.config ?? {}), calculadoras_incluidas: profile.calculadoras_incluidas ?? [] } as any, indices, taxTables, correctedFactMap);
      engine.loadCalculators(calculatorsWithRules);
      const result = engine.executeAll();

      // Inject cross-validation warnings into result
      result.warnings.push(...crossValidation.warnings);

      // Persist
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;

      const { data: insertedRun } = await supabase.from("calculation_runs").insert({
        case_id: id!, profile_id: selectedProfile, executado_por: userId,
        facts_snapshot: JSON.parse(JSON.stringify(result.facts_snapshot)),
        calculators_used: JSON.parse(JSON.stringify(result.calculators_used)),
        resultado_bruto: JSON.parse(JSON.stringify(result.resultado_bruto)),
        resultado_liquido: JSON.parse(JSON.stringify(result.resultado_liquido)),
        warnings: JSON.parse(JSON.stringify(result.warnings)),
      }).select("id").single();

      if (!insertedRun?.id) throw new Error("Falha ao salvar cálculo");

      const totalBrutoRaw = Number(result.resultado_bruto?.total ?? 0);
      const totalLiquidoRaw = Number(result.resultado_liquido?.total ?? totalBrutoRaw);
      const totalBruto = Number.isFinite(totalBrutoRaw) ? totalBrutoRaw : 0;
      const totalLiquido = Number.isFinite(totalLiquidoRaw) ? totalLiquidoRaw : totalBruto;

      const { count: existingSnaps } = await supabase.from("calc_snapshots").select("id", { count: "exact" }).eq("case_id", id);
      const nextVersion = (existingSnaps || 0) + 1;

      const { data: insertedSnapshot } = await supabase.from("calc_snapshots").insert({
        case_id: id!, profile_id: selectedProfile, created_by: userId!, engine_version: "2.0.0",
        versao: nextVersion, status: "gerado" as const,
        inputs_snapshot: JSON.parse(JSON.stringify(result.facts_snapshot)),
        resultado_bruto: JSON.parse(JSON.stringify(result.resultado_bruto)),
        resultado_liquido: JSON.parse(JSON.stringify(result.resultado_liquido)),
        total_bruto: totalBruto, total_liquido: totalLiquido,
        total_descontos: totalBruto - totalLiquido,
        warnings: JSON.parse(JSON.stringify(result.warnings)),
      }).select("id").single();

      // Persist result items
      if (insertedSnapshot?.id && Array.isArray(result.auditLines) && result.auditLines.length > 0) {
        const items = result.auditLines.filter(l => l.valor_bruto != null).map((l, idx) => ({
          snapshot_id: insertedSnapshot.id, rubrica_codigo: l.calculadora || "GERAL",
          rubrica_nome: l.descricao, competencia: l.competencia || null, ordem: idx + 1,
          valor_bruto: l.valor_bruto || 0, valor_liquido: l.valor_liquido || l.valor_bruto || 0,
          memoria_detalhada: l.metadata ? JSON.parse(JSON.stringify(l.metadata)) : null,
        }));
        if (items.length > 0) await supabase.from("calc_result_items").insert(items);
      }

      // Persist audit lines
      if (Array.isArray(result.auditLines) && result.auditLines.length > 0) {
        await supabase.from("audit_lines").insert(result.auditLines.map((l) => ({
          run_id: insertedRun.id, linha: l.linha, calculadora: l.calculadora,
          competencia: l.competencia ?? null, descricao: l.descricao, formula: l.formula ?? null,
          valor_bruto: l.valor_bruto ?? null, valor_liquido: l.valor_liquido ?? null,
          metadata: l.metadata ? JSON.parse(JSON.stringify(l.metadata)) : null,
        })));
      }

      let domainAuditMessage = "";
      try {
        const domainConfig = await buildDomainExecutionConfig(id!, true);
        const domainResult = orchestrateCalculation(domainConfig);
        await persistDomainAuditSnapshot(
          id!,
          domainConfig.scenario.id,
          domainResult.items,
          domainResult.inconsistencies,
        );
        domainAuditMessage = ` • auditoria atualizada (${domainResult.items.length} itens)`;
      } catch (domainError) {
        console.error("Domain audit persistence error:", domainError);
        toast.warning("Cálculo salvo, mas a auditoria técnica não pôde ser atualizada.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["facts", id] }),
        queryClient.invalidateQueries({ queryKey: ["calculation_runs", id] }),
        queryClient.invalidateQueries({ queryKey: ["calc_snapshots", id] }),
        queryClient.invalidateQueries({ queryKey: ["latest_calc_run", id] }),
        queryClient.invalidateQueries({ queryKey: ["audit_lines_detail"] }),
        queryClient.invalidateQueries({ queryKey: ["domain_audit", id] }),
      ]);
      toast.success(`Cálculo executado! Snapshot v${nextVersion} gerado${domainAuditMessage}.`);
      updateStatusMutation.mutate("calculado");
      setActiveTab("calculo");
    } catch (e) {
      console.error(e);
      toast.error("Falha: " + (e as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  const goToValidation = () => setActiveTab("validacao");
  const requestCreateCritical = (key: string) => {
    setCreateCriticalKeyRequest(key);
    setCreateCriticalNonce(n => n + 1);
    goToValidation();
  };

  // =====================================================
  // TAB CONTENT
  // =====================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case "resumo":
        return (
          <div className="space-y-5">
            {/* Progress Bar */}
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso do Caso</span>
                  <span className="text-sm font-bold text-primary">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span className={documents.length > 0 ? "text-[hsl(var(--success))]" : ""}>Documentos</span>
                  <span className={facts.length > 0 ? "text-[hsl(var(--success))]" : ""}>Extração</span>
                  <span className={canCalculate ? "text-[hsl(var(--success))]" : ""}>Validação</span>
                  <span className={snapshotsCount > 0 ? "text-[hsl(var(--success))]" : ""}>Cálculo</span>
                  <span className={caseData.status === "revisado" ? "text-[hsl(var(--success))]" : ""}>Petição</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Documentos", value: documents.length, icon: FileStack, color: "text-primary" },
                { label: "Chunks", value: chunksCount, icon: Sparkles, color: "text-accent" },
                { label: "Fatos", value: facts.length, icon: ShieldCheck, color: "text-primary" },
                { label: "Confirmados", value: confirmedFacts.length, icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
              ].map((stat) => (
                <Card key={stat.label} className="bg-card/80">
                  <CardContent className="p-4 flex items-center gap-3">
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Next Action */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Próxima Ação</div>
                      <div className="text-xs text-muted-foreground">
                        {documents.length === 0 ? "Faça upload dos documentos do caso" :
                         facts.length === 0 ? "Execute a extração de fatos via IA" :
                         !canCalculate ? "Valide os fatos críticos para liberar o cálculo" :
                         snapshotsCount === 0 ? "Selecione um perfil e execute o cálculo" :
                         "Revise os snapshots e gere a petição"}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => {
                    if (documents.length === 0) setActiveTab("documentos");
                    else if (facts.length === 0) setActiveTab("validacao");
                    else if (!canCalculate) setActiveTab("validacao");
                    else if (snapshotsCount === 0) setActiveTab("calculo");
                    else setActiveTab("peticao");
                  }}>
                    Ir <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Critical Facts */}
            {facts.length > 0 && (
              <Card className="bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Fatos Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CRITICAL_FACTS.map((key) => {
                      const fact = facts.find(f => f.chave === key);
                      return (
                        <div key={key} className={cn(
                          "p-3 rounded-lg border text-center",
                          fact?.confirmado ? "bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20" :
                          fact ? "bg-accent/5 border-accent/20" : "bg-muted/50 border-border"
                        )}>
                          <div className="text-[10px] text-muted-foreground mb-1 truncate">{criticalLabels[key]}</div>
                          <div className="text-xs font-medium truncate">{fact?.valor || "—"}</div>
                          <div className="mt-1">
                            {fact?.confirmado ? <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))] mx-auto" /> :
                             fact ? <Clock className="h-3 w-3 text-accent mx-auto" /> :
                             <XCircle className="h-3 w-3 text-muted-foreground mx-auto" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {missingCriticalKeys.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {missingCriticalKeys.map(k => (
                        <Button key={k} size="sm" variant="outline" className="text-xs h-7" onClick={() => requestCreateCritical(k)}>
                          + {criticalLabels[k]}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Risk & Controversies */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RiskAnalysisPanel caseId={id!} facts={facts as any} documents={documents as any} onNavigate={setActiveTab} />
              <ControversyManager caseId={id!} facts={facts as any} documents={documents as any} />
            </div>
          </div>
        );

      case "documentos":
        return (
          <div className="space-y-5">
            <DocumentsManager caseId={id!} documents={documents as any} onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })} />
          </div>
        );

      case "validacao":
        return (
          <div className="space-y-5">
            {/* Extraction Controls */}
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Extração de Fatos via IA</div>
                      <div className="text-xs text-muted-foreground">
                        {chunksCount} chunks disponíveis • {facts.length} fatos extraídos
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={runFactExtraction} disabled={isExtractingFacts || chunksCount === 0}>
                      {isExtractingFacts ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                      Extrair
                    </Button>
                    {facts.length > 0 && (
                      <Button size="sm" variant="outline" onClick={restartFactExtraction} disabled={isExtractingFacts}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Reiniciar
                      </Button>
                    )}
                  </div>
                </div>
                {chunksCount === 0 && (
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-accent/5 border border-accent/20 text-xs text-accent">
                    <AlertTriangle className="h-3 w-3" />
                    Nenhum chunk indexado. Processe os documentos primeiro.
                  </div>
                )}
              </CardContent>
            </Card>

            {extractionsCount > 0 && (
              <ValidationViewV2 caseId={id!} onValidationComplete={() => setActiveTab("calculo")} />
            )}

            <FactValidationView
              caseId={id!} facts={facts} documents={documents}
              onFactsChange={() => queryClient.invalidateQueries({ queryKey: ["facts", id] })}
              onValidationComplete={() => setActiveTab("calculo")}
              createCriticalKeyRequest={createCriticalKeyRequest}
              createCriticalNonce={createCriticalNonce}
            />
          </div>
        );

      // premissas merged into calculo

      case "calculo":
        return (
          <div className="space-y-5">
            <PjeCalcInline caseId={id!} />
          </div>
        );

      case "peticao":
        return (
          <div className="space-y-5">
            {!canCalculate && (
              <Card className="border-accent/20 bg-accent/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Validação Pendente</div>
                    <div className="text-xs text-muted-foreground">Confirme os fatos críticos antes de gerar a petição.</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("validacao")}>Validar</Button>
                </CardContent>
              </Card>
            )}
            {runs.length === 0 && canCalculate && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <Calculator className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Cálculo Necessário</div>
                    <div className="text-xs text-muted-foreground">Execute um cálculo para incluir valores na petição.</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("calculo")}>Calcular</Button>
                </CardContent>
              </Card>
            )}
            <PetitionGenerator
              caseId={id!}
              calculationRunId={runs[0]?.id}
              onPetitionGenerated={() => {
                toast.success("Petição gerada com sucesso!");
                updateStatusMutation.mutate("revisado");
              }}
            />
          </div>
        );

      case "roteiro":
        return (
          <CaseBriefing
            caseId={id!}
            caseInfo={{
              cliente: caseData.cliente,
              numero_processo: caseData.numero_processo,
              tribunal: (caseData as any).tribunal,
              status: caseData.status,
            }}
          />
        );

      case "auditoria":
        return (
          <div className="space-y-5">
            {domainAuditLoading ? (
              <Card className="bg-card/80">
                <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Carregando auditoria técnica...
                </CardContent>
              </Card>
            ) : (
              <>
                <TimelineView timeline={domainAuditData?.timeline || []} />
                <TitleConsolidationView title={domainAuditData?.title || { global_rules: [], rules_by_rubric: new Map(), denied_rubrics: new Set(), granted_rubrics: new Set(), conflicts: [], latest_version: null }} />
                <InconsistencyPanel flags={domainAuditData?.flags || []} />
                <ComparisonView rows={domainAuditData?.rows || []} totalMRD={domainAuditData?.totalMRD || 0} totalPJC={domainAuditData?.totalPJC || 0} />
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // =====================================================
  // REVIEW DIALOG HELPERS
  // =====================================================
  const review = reviewResult?.review;
  const reviewMeta = reviewResult?.metadata;
  const severityColor = (s: string) => {
    switch (s) {
      case 'critica': return 'text-red-600 bg-red-50 border-red-200';
      case 'alta': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'media': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'baixa': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <MainLayoutPremium
      breadcrumbs={[{ label: "Casos", href: "/casos" }, { label: caseData.cliente }]}
      title={caseData.cliente}
    >
      <CaseWorkspace
        cliente={caseData.cliente}
        numeroProcesso={caseData.numero_processo}
        status={caseData.status}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workflowSteps={workflowSteps}
        totalBruto={latestTotal}
      >
        {renderTabContent()}
      </CaseWorkspace>

      {/* ===== PRE-CALC REVIEW DIALOG ===== */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {review?.aprovado ? (
                <CircleCheck className="h-5 w-5 text-green-600" />
              ) : (
                <CircleAlert className="h-5 w-5 text-amber-600" />
              )}
              Revisão Documental Pré-Cálculo
            </DialogTitle>
            <DialogDescription>
              {reviewMeta && (
                <span className="text-xs">
                  {reviewMeta.chunks_analisados} chunks • {reviewMeta.fatos_verificados} fatos • {reviewMeta.documentos_analisados} documentos analisados
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            {review && (
              <div className="space-y-4">
                {/* Score */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className={cn("text-3xl font-bold", review.score_confianca >= 80 ? "text-green-600" : review.score_confianca >= 50 ? "text-amber-600" : "text-red-600")}>
                      {review.score_confianca}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Confiança</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{review.resumo_documental}</p>
                  </div>
                  <Badge variant={review.aprovado ? "default" : "destructive"} className="text-xs">
                    {review.aprovado ? "Aprovado" : "Pendências"}
                  </Badge>
                </div>

                {/* Divergências */}
                {review.divergencias?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <FileWarning className="h-4 w-4 text-amber-600" />
                      Divergências ({review.divergencias.length})
                    </h4>
                    <div className="space-y-2">
                      {review.divergencias.map((d: any, i: number) => (
                        <div key={i} className={cn("p-3 rounded-lg border text-sm", severityColor(d.severidade))}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{d.campo}</span>
                            <Badge variant="outline" className="text-[10px]">{d.severidade}</Badge>
                          </div>
                          {d.valor_fato && <p className="text-xs">Sistema: <strong>{d.valor_fato}</strong></p>}
                          {d.valor_documento && <p className="text-xs">Documento: <strong>{d.valor_documento}</strong></p>}
                          {d.documento_fonte && <p className="text-xs opacity-70">Fonte: {d.documento_fonte}</p>}
                          <p className="text-xs mt-1">💡 {d.recomendacao}</p>
                          {d.impacto_financeiro && <p className="text-xs mt-1 font-medium">💰 {d.impacto_financeiro}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dados não cadastrados */}
                {review.dados_extraidos_nao_cadastrados?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Dados nos Documentos NÃO Cadastrados ({review.dados_extraidos_nao_cadastrados.length})
                    </h4>
                    <div className="space-y-2">
                      {review.dados_extraidos_nao_cadastrados.map((d: any, i: number) => (
                        <div key={i} className={cn("p-3 rounded-lg border text-sm", severityColor(d.importancia))}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{d.campo}: {d.valor_sugerido}</span>
                            <Badge variant="outline" className="text-[10px]">{d.importancia}</Badge>
                          </div>
                          <p className="text-xs">{d.justificativa}</p>
                          {d.documento_fonte && <p className="text-xs opacity-70 mt-1">Fonte: {d.documento_fonte}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correções sugeridas */}
                {review.correcoes_sugeridas?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Settings2 className="h-4 w-4 text-primary" />
                      Correções Sugeridas ({review.correcoes_sugeridas.length})
                    </h4>
                    <div className="space-y-2">
                      {review.correcoes_sugeridas.map((c: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border bg-primary/5 border-primary/20 text-sm">
                          <span className="font-medium">{c.campo}</span>
                          {c.valor_atual && <span className="text-muted-foreground"> ({c.valor_atual})</span>}
                          <span> → </span>
                          <span className="font-bold text-primary">{c.valor_correto}</span>
                          <p className="text-xs mt-1">{c.motivo}</p>
                          <p className="text-xs opacity-70">Fonte: {c.fonte}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alertas de cálculo */}
                {review.alertas_calculo?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4" />
                      Alertas para o Cálculo ({review.alertas_calculo.length})
                    </h4>
                    <div className="space-y-2">
                      {review.alertas_calculo.map((a: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border bg-accent/5 border-accent/20 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                            <span className="font-medium">{a.descricao}</span>
                          </div>
                          <p className="text-xs">{a.impacto}</p>
                          {a.acao_necessaria && <p className="text-xs mt-1 text-primary">⚡ {a.acao_necessaria}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verbas identificadas */}
                {review.verbas_identificadas?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Verbas Identificáveis ({review.verbas_identificadas.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {review.verbas_identificadas.map((v: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg border bg-green-50/50 border-green-200 text-sm">
                          <span className="font-medium">{v.verba}</span>
                          <Badge variant="outline" className={cn("text-[10px] ml-2",
                            v.confianca === 'alta' ? 'border-green-300 text-green-700' :
                            v.confianca === 'media' ? 'border-amber-300 text-amber-700' :
                            'border-red-300 text-red-700'
                          )}>{v.confianca}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{v.base_documental}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <Separator />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              <Ban className="h-4 w-4 mr-2" /> Cancelar e Corrigir
            </Button>
            <Button onClick={executeCalculation} disabled={isCalculating}>
              {isCalculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Prosseguir com Cálculo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayoutPremium>
  );
}
