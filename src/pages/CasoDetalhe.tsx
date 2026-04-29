import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseWorkspace } from "@/components/cases/CaseWorkspace";
import { ImportPJCDialog } from "@/components/cases/pjecalc/ImportPJCDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
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
import { DocumentOcrValidation } from "@/components/cases/DocumentOcrValidation";
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
import { AuditDrillDown } from "@/components/cases/pjecalc/AuditDrillDown";
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
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Carrega user id para ações como Importar .PJC
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setCurrentUserId(data.session.user.id);
    });
  }, []);
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

  const getSeverityTone = (severity: string) => {
    switch (severity) {
      case "bloqueante":
        return "critica";
      case "alerta":
        return "media";
      default:
        return "baixa";
    }
  };

  const buildDomainWarnings = (messagePrefix: string, inconsistencies: Awaited<ReturnType<typeof orchestrateCalculation>>["inconsistencies"]) => {
    return inconsistencies.map((flag) => ({
      tipo: flag.severidade === "bloqueante" ? "erro" : flag.severidade === "alerta" ? "atencao" : "info",
      codigo: flag.categoria,
      mensagem: `${messagePrefix}${flag.descricao}`,
      sugestao: flag.sugestao,
    }));
  };

  const aggregateDomainValues = (
    items: Awaited<ReturnType<typeof orchestrateCalculation>>["items"],
    key: "diferenca" | "total",
  ) => {
    const porVerba: Record<string, { descricao: string; valor: number }> = {};
    const porCompetencia: Record<string, number> = {};

    for (const item of items) {
      const code = item.rubric_code;
      const competencia = item.competencia || "sem_competencia";
      const value = item[key].toNumber();

      porVerba[code] = {
        descricao: item.rubric_name,
        valor: (porVerba[code]?.valor || 0) + value,
      };
      porCompetencia[competencia] = (porCompetencia[competencia] || 0) + value;
    }

    return { porVerba, porCompetencia };
  };

  const buildAuditLinesFromDomain = (items: Awaited<ReturnType<typeof orchestrateCalculation>>["items"]) => {
    return items.map((item, index) => ({
      linha: index + 1,
      calculadora: item.rubric_code.toLowerCase(),
      competencia: item.competencia === "fechamento" ? null : item.competencia,
      descricao: item.rubric_name,
      formula: item.formula_aplicada,
      valor_bruto: item.diferenca.toNumber(),
      valor_liquido: item.total.toNumber(),
      metadata: JSON.parse(JSON.stringify({
        rubric_code: item.rubric_code,
        base: item.base.toNumber(),
        divisor: item.divisor.toNumber(),
        multiplicador: item.multiplicador.toNumber(),
        quantidade: item.quantidade.toNumber(),
        valor_devido: item.valor_devido.toNumber(),
        valor_pago: item.valor_pago.toNumber(),
        correcao: item.correcao.toNumber(),
        juros: item.juros.toNumber(),
        audit_trail: item.audit_trail,
      })),
    }));
  };

  const buildReviewFromDomain = (domainResult: Awaited<ReturnType<typeof orchestrateCalculation>>) => {
    const inconsistencies = domainResult.inconsistencies;
    const blockers = inconsistencies.filter((flag) => flag.severidade === "bloqueante");
    const score = Math.max(0, Math.min(100, 100 - blockers.length * 25 - (inconsistencies.length - blockers.length) * 8));
    const topRubricas = Array.from(
      domainResult.items.reduce((map, item) => {
        map.set(item.rubric_code, {
          verba: item.rubric_name,
          confianca: inconsistencies.some((flag) => flag.rubric_code === item.rubric_code && flag.severidade === "bloqueante")
            ? "baixa"
            : inconsistencies.some((flag) => flag.rubric_code === item.rubric_code)
              ? "media"
              : "alta",
          base_documental: item.formula_aplicada,
        });
        return map;
      }, new Map<string, { verba: string; confianca: string; base_documental: string }>()).values(),
    ).slice(0, 12);

    return {
      review: {
        aprovado: blockers.length === 0,
        score_confianca: score,
        resumo_documental: blockers.length === 0
          ? `Prévia do motor de domínio concluída com ${domainResult.items.length} itens e ${inconsistencies.length} inconsistência(s).`
          : `Foram encontrados ${blockers.length} bloqueio(s) no domínio antes da liquidação.` ,
        divergencias: inconsistencies.map((flag) => ({
          campo: flag.rubric_code || flag.categoria,
          severidade: getSeverityTone(flag.severidade),
          valor_fato: flag.competencia || "escopo geral",
          valor_documento: flag.descricao,
          documento_fonte: "orquestrador_de_dominio",
          recomendacao: flag.sugestao || "Revisar insumo ou premissa correspondente.",
          impacto_financeiro: flag.severidade === "bloqueante" ? "Impacto alto no cálculo final." : undefined,
        })),
        dados_extraidos_nao_cadastrados: [],
        correcoes_sugeridas: inconsistencies
          .filter((flag) => !!flag.sugestao)
          .map((flag) => ({
            campo: flag.rubric_code || flag.categoria,
            valor_atual: flag.descricao,
            valor_correto: flag.sugestao,
            motivo: flag.descricao,
            fonte: "motor_de_dominio",
          })),
        alertas_calculo: inconsistencies.map((flag) => ({
          tipo: flag.severidade,
          descricao: flag.descricao,
          impacto: flag.rubric_code ? `Rubrica afetada: ${flag.rubric_code}` : "Impacto transversal no cálculo.",
          acao_necessaria: flag.sugestao,
        })),
        verbas_identificadas: topRubricas,
      },
      metadata: {
        chunks_analisados: chunksCount,
        fatos_verificados: confirmedFacts.length,
        documentos_analisados: documents.length,
        competencias: domainResult.timeline.length,
      },
    };
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
      const domainConfig = await buildDomainExecutionConfig(id, true);
      const domainResult = orchestrateCalculation(domainConfig);
      setReviewResult(buildReviewFromDomain(domainResult));
      setShowReviewDialog(true);
    } catch (e) {
      logger.error("Domain pre-calc review error", { error: String(e) });
      toast.error("Erro na revisão: " + (e as Error).message);
    } finally {
      setIsReviewing(false);
    }
  };

  const executeCalculation = async () => {
    setShowReviewDialog(false);
    if (!id || !selectedProfile || !canCalculate) return;

    setIsCalculating(true);
    try {
      const [{ data: currentFacts, error: factsError }, { data: profile, error: profileError }, { data: session }] = await Promise.all([
        supabase.from("facts").select("*").eq("case_id", id).order("criado_em", { ascending: false }),
        supabase.from("calculation_profiles").select("id, nome").eq("id", selectedProfile).single(),
        supabase.auth.getSession(),
      ]);

      if (factsError) throw factsError;
      if (profileError) throw profileError;
      if (!profile) throw new Error("Perfil não encontrado");

      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Faça login para executar o cálculo.");

      const domainConfig = await buildDomainExecutionConfig(id, true);
      const domainResult = orchestrateCalculation(domainConfig);
      await persistDomainAuditSnapshot(id, domainConfig.scenario.id, domainResult.items, domainResult.inconsistencies);

      const bruto = aggregateDomainValues(domainResult.items, "diferenca");
      const liquido = aggregateDomainValues(domainResult.items, "total");
      const warnings = buildDomainWarnings("[domínio] ", domainResult.inconsistencies);
      const auditLines = buildAuditLinesFromDomain(domainResult.items);
      const calculatorsUsed = Array.from(new Set(domainResult.items.map((item) => item.rubric_code.toLowerCase()))).map((nome) => ({
        nome,
        versao: "domain-v3",
      }));
      const factsSnapshot = JSON.parse(JSON.stringify(currentFacts || []));

      const resultadoBruto = {
        total: domainResult.totalBruto.toNumber(),
        por_verba: bruto.porVerba,
        por_competencia: bruto.porCompetencia,
      };
      const resultadoLiquido = {
        total: domainResult.totalLiquido.toNumber(),
        por_verba: liquido.porVerba,
        por_competencia: liquido.porCompetencia,
      };

      const { data: insertedRun, error: runError } = await supabase.from("calculation_runs").insert({
        case_id: id,
        profile_id: selectedProfile,
        executado_por: userId,
        facts_snapshot: factsSnapshot,
        calculators_used: calculatorsUsed,
        resultado_bruto: resultadoBruto,
        resultado_liquido: resultadoLiquido,
        warnings,
      }).select("id").single();
      if (runError) throw runError;
      if (!insertedRun?.id) throw new Error("Falha ao salvar cálculo derivado do domínio.");

      const { count: existingSnaps, error: countError } = await supabase.from("calc_snapshots").select("id", { count: "exact", head: true }).eq("case_id", id);
      if (countError) throw countError;
      const nextVersion = (existingSnaps || 0) + 1;

      const { data: insertedSnapshot, error: snapshotError } = await supabase.from("calc_snapshots").insert({
        case_id: id,
        profile_id: selectedProfile,
        created_by: userId,
        engine_version: "domain-v3",
        versao: nextVersion,
        status: "gerado" as const,
        inputs_snapshot: factsSnapshot,
        resultado_bruto: resultadoBruto,
        resultado_liquido: resultadoLiquido,
        total_bruto: resultadoBruto.total,
        total_liquido: resultadoLiquido.total,
        total_descontos: resultadoBruto.total - resultadoLiquido.total,
        warnings,
      }).select("id").single();
      if (snapshotError) throw snapshotError;

      if (insertedSnapshot?.id) {
        const resultItems = domainResult.items.map((item, idx) => ({
          snapshot_id: insertedSnapshot.id,
          rubrica_codigo: item.rubric_code,
          rubrica_nome: item.rubric_name,
          competencia: item.competencia === "fechamento" ? null : item.competencia,
          ordem: idx + 1,
          base_calculo: item.base.toNumber(),
          quantidade: item.quantidade.toNumber(),
          fator: item.multiplicador.toNumber(),
          valor_bruto: item.diferenca.toNumber(),
          valor_liquido: item.total.toNumber(),
          memoria_detalhada: JSON.parse(JSON.stringify({
            formula_aplicada: item.formula_aplicada,
            audit_trail: item.audit_trail,
            reflections: item.reflections,
            incidences: item.incidences,
            offsets: item.offsets,
          })),
        }));

        for (let index = 0; index < resultItems.length; index += 200) {
          const chunk = resultItems.slice(index, index + 200);
          const { error } = await supabase.from("calc_result_items").insert(chunk);
          if (error) throw error;
        }
      }

      if (auditLines.length > 0) {
        for (let index = 0; index < auditLines.length; index += 200) {
          const chunk = auditLines.slice(index, index + 200).map((line) => ({
            run_id: insertedRun.id,
            linha: line.linha,
            calculadora: line.calculadora,
            competencia: line.competencia,
            descricao: line.descricao,
            formula: line.formula,
            valor_bruto: line.valor_bruto,
            valor_liquido: line.valor_liquido,
            metadata: line.metadata,
          }));
          const { error } = await supabase.from("audit_lines").insert(chunk);
          if (error) throw error;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["facts", id] }),
        queryClient.invalidateQueries({ queryKey: ["calculation_runs", id] }),
        queryClient.invalidateQueries({ queryKey: ["calc_snapshots", id] }),
        queryClient.invalidateQueries({ queryKey: ["latest_calc_run", id] }),
        queryClient.invalidateQueries({ queryKey: ["audit_lines_detail"] }),
        queryClient.invalidateQueries({ queryKey: ["domain_audit", id] }),
      ]);

      toast.success(`Cálculo executado no domínio! Snapshot v${nextVersion} gerado.`);
      updateStatusMutation.mutate("calculado");
      setActiveTab("calculo");
    } catch (e) {
      logger.error("CasoDetalhe handler error", { error: String(e) });
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
            <DocumentsManager
              caseId={id!}
              documents={documents as any}
              onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })}
              onGoToValidation={() => setActiveTab("validacao")}
            />
          </div>
        );

      case "validacao":
        return (
          <div className="space-y-5">
            {/* OCR validation: revisão documento por documento */}
            <DocumentOcrValidation
              caseId={id!}
              onValidated={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })}
              onGoToCalculo={async () => {
                // Le fresh do DB (documents prop pode estar stale — o
                // DocumentOcrValidation faz UPDATE direto e pode haver
                // race com a invalidacao).
                const { data: freshDocs } = await supabase
                  .from("documents")
                  .select("id, ocr_validated, status")
                  .eq("case_id", id!);
                const toExtract = (freshDocs || []).filter(
                  (d: any) => d.ocr_validated === true && d.status !== "extracted",
                );
                if (toExtract.length === 0) {
                  toast.info("Nenhum documento validado para extrair. Confirme o OCR primeiro.");
                  return;
                }

                const t = toast.loading(`Extraindo dados de ${toExtract.length} documento(s)...`);
                try {
                  // Dispara todos em paralelo (extract-and-fill retorna 200
                  // imediatamente e roda o processamento em background).
                  await Promise.allSettled(
                    toExtract.map((d: any) =>
                      supabase.functions.invoke("extract-and-fill", {
                        body: { document_id: d.id },
                      }),
                    ),
                  );

                  // Espera cada doc virar `extracted` (ou `failed`) antes de
                  // navegar. Polling com timeout de 4 min por doc.
                  const pollIds = toExtract.map((d: any) => d.id as string);
                  const maxPolls = 80; // ~4 min com 3s por poll
                  let done = 0;
                  for (let i = 0; i < maxPolls; i++) {
                    await new Promise((r) => setTimeout(r, 3000));
                    const { data: statuses } = await supabase
                      .from("documents")
                      .select("id, status")
                      .in("id", pollIds);
                    done = (statuses || []).filter((s: any) =>
                      s.status === "extracted" || s.status === "failed",
                    ).length;
                    toast.loading(`Extraindo... ${done}/${pollIds.length} concluído(s)`, { id: t });
                    if (done >= pollIds.length) break;
                  }

                  toast.success(`Extração concluída (${done}/${pollIds.length}). Abrindo aba Cálculo...`, { id: t });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_case_data"] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", id] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", id] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", id] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_faltas", id] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias", id] });
                  queryClient.invalidateQueries({ queryKey: ["pjecalc_dados_processo", id] });
                  queryClient.invalidateQueries({ queryKey: ["documents", id] });
                  setActiveTab("calculo");
                } catch (err) {
                  toast.error("Erro ao preencher: " + (err as Error).message, { id: t });
                }
              }}
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
              tribunal: (caseData as Record<string, unknown>).tribunal,
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
                <AuditDrillDown result={(pjecalcLiquidacao?.resultado as any) || null} />
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
        headerActions={currentUserId && id ? (
          <ImportPJCDialog
            caseId={id}
            userId={currentUserId}
            onImported={() => queryClient.invalidateQueries()}
          />
        ) : undefined}
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
