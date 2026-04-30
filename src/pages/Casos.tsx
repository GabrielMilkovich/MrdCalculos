import { useState } from "react";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseCard } from "@/components/cases/CaseCard";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, Briefcase, TrendingUp, FileStack,
  CheckCircle2, Clock, Calculator, Scale, Archive, FileSpreadsheet, Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CaseMode } from "@/features/data-extraction";

interface CaseWithMetrics {
  id: string;
  cliente: string;
  numero_processo: string | null;
  tribunal: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  mode: CaseMode;
  criado_em: string;
  arquivado: boolean;
  doc_count: number;
  fact_count: number;
  confirmed_fact_count: number;
  snapshot_count: number;
  total_bruto: number | null;
}

const STATUS_TABS = [
  { value: "all", label: "Todos", icon: Briefcase },
  { value: "rascunho", label: "Rascunho", icon: Clock },
  { value: "em_analise", label: "Em Análise", icon: Scale },
  { value: "calculado", label: "Calculado", icon: Calculator },
  { value: "revisado", label: "Revisado", icon: CheckCircle2 },
  { value: "arquivado", label: "Arquivados", icon: Archive },
];

const MODE_TABS: { value: "all" | CaseMode; label: string; icon: typeof Layers }[] = [
  { value: "all", label: "Todos os modos", icon: Layers },
  { value: "calculation", label: "Cálculo Completo", icon: Calculator },
  { value: "data_extraction", label: "Extração de Dados", icon: FileSpreadsheet },
];

export default function Casos() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState<"all" | CaseMode>("all");
  // Fetch cases with counts
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases-with-metrics"],
    queryFn: async () => {
      const { data: casesData, error } = await supabase
        .from("cases")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      if (!casesData || casesData.length === 0) return [];

      const caseIds = casesData.map(c => c.id);

      // Parallel fetches for metrics
      const [docsRes, factsRes, snapsRes] = await Promise.all([
        supabase.from("documents").select("case_id").in("case_id", caseIds),
        supabase.from("facts").select("case_id, confirmado").in("case_id", caseIds),
        supabase.from("calc_snapshots").select("case_id, total_bruto").in("case_id", caseIds),
      ]);

      const docCounts = new Map<string, number>();
      (docsRes.data || []).forEach(d => docCounts.set(d.case_id, (docCounts.get(d.case_id) || 0) + 1));

      const factCounts = new Map<string, number>();
      const confirmedCounts = new Map<string, number>();
      (factsRes.data || []).forEach(f => {
        factCounts.set(f.case_id, (factCounts.get(f.case_id) || 0) + 1);
        if (f.confirmado) confirmedCounts.set(f.case_id, (confirmedCounts.get(f.case_id) || 0) + 1);
      });

      const snapCounts = new Map<string, number>();
      const latestTotals = new Map<string, number>();
      (snapsRes.data || []).forEach(s => {
        snapCounts.set(s.case_id, (snapCounts.get(s.case_id) || 0) + 1);
        if (s.total_bruto && (!latestTotals.has(s.case_id) || s.total_bruto > (latestTotals.get(s.case_id) || 0))) {
          latestTotals.set(s.case_id, s.total_bruto);
        }
      });

      return casesData.map(c => {
        const raw = c as Record<string, unknown>;
        const rawMode = raw.mode;
        return {
          ...c,
          arquivado: raw.arquivado === true,
          mode: (rawMode === "data_extraction" ? "data_extraction" : "calculation") as CaseMode,
          doc_count: docCounts.get(c.id) || 0,
          fact_count: factCounts.get(c.id) || 0,
          confirmed_fact_count: confirmedCounts.get(c.id) || 0,
          snapshot_count: snapCounts.get(c.id) || 0,
          total_bruto: latestTotals.get(c.id) || null,
        };
      }) as CaseWithMetrics[];
    },
  });

  // Separa ativos de arquivados. Lista principal (statusFilter != "arquivado")
  // sempre filtra arquivados fora; tab "Arquivados" mostra apenas arquivados.
  const activeCases = cases.filter(c => !c.arquivado);
  const archivedCases = cases.filter(c => c.arquivado);

  const visibleCases = statusFilter === "arquivado" ? archivedCases : activeCases;

  const filteredCases = visibleCases.filter((c) => {
    const matchesSearch = !searchQuery ||
      c.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.numero_processo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || statusFilter === "arquivado" || c.status === statusFilter;
    const matchesMode = modeFilter === "all" || c.mode === modeFilter;
    return matchesSearch && matchesStatus && matchesMode;
  });

  // Status counts respeitam o filtro de modo (mas não o de busca/status, pois eles
  // estão sendo aplicados em paralelo). Mantém UX coerente: ao trocar modo, os
  // contadores das tabs de status acompanham.
  const statusScope = (cases: CaseWithMetrics[]) =>
    modeFilter === "all" ? cases : cases.filter(c => c.mode === modeFilter);

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    if (tab.value === "arquivado") acc[tab.value] = statusScope(archivedCases).length;
    else if (tab.value === "all") acc[tab.value] = statusScope(activeCases).length;
    else acc[tab.value] = statusScope(activeCases).filter(c => c.status === tab.value).length;
    return acc;
  }, {} as Record<string, number>);

  const modeCounts: Record<"all" | CaseMode, number> = {
    all: activeCases.length,
    calculation: activeCases.filter(c => c.mode === "calculation").length,
    data_extraction: activeCases.filter(c => c.mode === "data_extraction").length,
  };

  // KPIs — apenas casos ativos
  const totalValue = activeCases.reduce((sum, c) => sum + (c.total_bruto || 0), 0);
  const totalDocs = activeCases.reduce((sum, c) => sum + c.doc_count, 0);
  const pendingCases = activeCases.filter(c => c.status === "em_analise").length;

  // Handlers arquivar/desarquivar/excluir
  const archiveCase = async (caseId: string, archive: boolean) => {
    const { error } = await supabase
      .from("cases")
      .update({ arquivado: archive, arquivado_em: archive ? new Date().toISOString() : null } as Record<string, unknown>)
      .eq("id", caseId);
    if (error) {
      toast.error(`Erro ao ${archive ? "arquivar" : "desarquivar"}: ${error.message}`);
      return;
    }
    toast.success(archive ? "Caso arquivado." : "Caso desarquivado.");
    queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
  };

  const deleteCase = async (caseId: string) => {
    const { error } = await supabase.from("cases").delete().eq("id", caseId);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }
    toast.success("Caso excluído.");
    queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
  };

  return (
    <MainLayoutPremium breadcrumbs={[{ label: "Casos" }]} title="Casos">
      <div className="space-y-6 animate-fade-in">
        {/* KPI Stats */}
        {cases.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{cases.length}</div>
                    <div className="text-xs text-muted-foreground">Casos Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Clock className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{pendingCases}</div>
                    <div className="text-xs text-muted-foreground">Em Análise</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10">
                    <FileStack className="h-4 w-4 text-[hsl(var(--success))]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{totalDocs}</div>
                    <div className="text-xs text-muted-foreground">Documentos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {totalValue > 0 
                        ? `R$ ${(totalValue / 1000).toFixed(0)}k` 
                        : "—"
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Valor Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou processo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <CreateCaseDialog />
          </div>
        </div>

        {/* Filters: Status + Mode */}
        <div className="flex flex-col gap-2">
          {/* Status Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit max-w-full overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = statusCounts[tab.value] || 0;
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                  <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] h-4 px-1.5 ml-0.5">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Mode Tabs (Cálculo Completo / Extração de Dados) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-medium">
              Modo
            </span>
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit border border-border/40">
              {MODE_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = modeCounts[tab.value];
                const isActive = modeFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setModeFilter(tab.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-card text-foreground shadow-sm ring-1 ring-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {tab.label}
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] h-4 px-1.5 ml-0.5">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="empty-state">
            <Briefcase className="empty-state-icon" />
            <h3 className="empty-state-title">
              {cases.length === 0 ? "Nenhum caso cadastrado" : "Nenhum resultado"}
            </h3>
            <p className="empty-state-description mb-4">
              {cases.length === 0
                ? "Crie seu primeiro caso trabalhista para começar a calcular."
                : "Tente ajustar os filtros de busca."}
            </p>
            {cases.length === 0 && (
              <div className="flex gap-3">
                <CreateCaseDialog />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
            {filteredCases.map((c) => (
              <CaseCard
                key={c.id}
                id={c.id}
                cliente={c.cliente}
                numeroProcesso={c.numero_processo}
                tribunal={c.tribunal}
                status={c.status}
                mode={c.mode}
                criadoEm={c.criado_em}
                documentCount={c.doc_count}
                factCount={c.fact_count}
                confirmedFactCount={c.confirmed_fact_count}
                snapshotCount={c.snapshot_count}
                totalBruto={c.total_bruto}
                arquivado={c.arquivado}
                onArchive={() => archiveCase(c.id, !c.arquivado)}
                onDelete={() => deleteCase(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayoutPremium>
  );
}
