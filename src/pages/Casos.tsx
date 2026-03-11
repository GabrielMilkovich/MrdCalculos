import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseCard } from "@/components/cases/CaseCard";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Loader2, Briefcase, Plus, TrendingUp, FileStack, 
  CheckCircle2, Clock, Calculator, Scale, FlaskConical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { seedAdvancedTestCase } from "@/lib/test-case-seed";
import { seedCasoMarcelo } from "@/lib/test-case-seed-marcelo";
import { seedCasoMaria } from "@/lib/test-case-seed-maria";
import { seedCasoRosicleia } from "@/lib/test-case-seed-rosicleia";
import { seedCasoRoque } from "@/lib/test-case-seed-roque";
import { toast } from "sonner";

interface CaseWithMetrics {
  id: string;
  cliente: string;
  numero_processo: string | null;
  tribunal: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
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
];

export default function Casos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seedingTest, setSeedingTest] = useState(false);

  const [seedingMarcelo, setSeedingMarcelo] = useState(false);
  const [seedingMaria, setSeedingMaria] = useState(false);
  const [seedingRosicleia, setSeedingRosicleia] = useState(false);
  const [seedingRoque, setSeedingRoque] = useState(false);
  const handleSeedTestCase = async () => {
    setSeedingTest(true);
    try {
      const caseId = await seedAdvancedTestCase();
      if (caseId) {
        toast.success("Caso teste avançado criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
        navigate(`/casos/${caseId}`);
      }
    } catch (err: any) {
      toast.error("Erro ao criar caso teste: " + err.message);
    } finally {
      setSeedingTest(false);
    }
  };

  const handleSeedMarcelo = async () => {
    setSeedingMarcelo(true);
    try {
      const caseId = await seedCasoMarcelo();
      toast.success("Caso Marcelo Henrique Pires criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
      navigate(`/casos/${caseId}`);
    } catch (err: any) {
      toast.error("Erro ao criar caso: " + err.message);
    } finally {
      setSeedingMarcelo(false);
    }
  };

  const handleSeedMaria = async () => {
    setSeedingMaria(true);
    try {
      const caseId = await seedCasoMaria();
      toast.success("Caso Maria Madalena (Via Varejo) criado! Pronto para liquidar.");
      queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
      navigate(`/casos/${caseId}`);
    } catch (err: any) {
      toast.error("Erro ao criar caso: " + err.message);
    } finally {
      setSeedingMaria(false);
    }
  };

  const handleSeedRosicleia = async () => {
    setSeedingRosicleia(true);
    try {
      const caseId = await seedCasoRosicleia();
      toast.success("Caso Rosicleia Pereira Chaves criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
      navigate(`/casos/${caseId}`);
    } catch (err: any) {
      toast.error("Erro ao criar caso: " + err.message);
    } finally {
      setSeedingRosicleia(false);
    }
  };
  const handleSeedRoque = async () => {
    setSeedingRoque(true);
    try {
      const caseId = await seedCasoRoque();
      toast.success("Caso Roque Guerreiro Teixeira criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
      navigate(`/casos/${caseId}`);
    } catch (err: any) {
      toast.error("Erro ao criar caso: " + err.message);
    } finally {
      setSeedingRoque(false);
    }
  };


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

      return casesData.map(c => ({
        ...c,
        doc_count: docCounts.get(c.id) || 0,
        fact_count: factCounts.get(c.id) || 0,
        confirmed_fact_count: confirmedCounts.get(c.id) || 0,
        snapshot_count: snapCounts.get(c.id) || 0,
        total_bruto: latestTotals.get(c.id) || null,
      })) as CaseWithMetrics[];
    },
  });

  const filteredCases = cases.filter((c) => {
    const matchesSearch = !searchQuery ||
      c.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.numero_processo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.value] = tab.value === "all" ? cases.length : cases.filter(c => c.status === tab.value).length;
    return acc;
  }, {} as Record<string, number>);

  // KPIs
  const totalValue = cases.reduce((sum, c) => sum + (c.total_bruto || 0), 0);
  const totalDocs = cases.reduce((sum, c) => sum + c.doc_count, 0);
  const pendingCases = cases.filter(c => c.status === "em_analise").length;

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
            <Button 
              variant="outline" size="sm" 
              onClick={handleSeedRosicleia}
              disabled={seedingRosicleia}
              className="gap-1.5 h-9 text-sm border-primary/30 text-primary"
            >
              <FlaskConical className="h-4 w-4" />
              {seedingRosicleia ? "Criando..." : "Caso Rosicleia (Comissionista)"}
            </Button>
            <Button 
              variant="outline" size="sm" 
              onClick={handleSeedMaria}
              disabled={seedingMaria}
              className="gap-1.5 h-9 text-sm"
            >
              <FlaskConical className="h-4 w-4" />
              {seedingMaria ? "Criando..." : "Caso Maria (Comissionista)"}
            </Button>
            <Button
              variant="outline" size="sm" 
              onClick={handleSeedTestCase}
              disabled={seedingTest}
              className="gap-1.5 h-9 text-sm"
            >
              <FlaskConical className="h-4 w-4" />
              {seedingTest ? "Criando..." : "Caso Teste 1"}
            </Button>
            <Button 
              variant="outline" size="sm" 
              onClick={handleSeedMarcelo}
              disabled={seedingMarcelo}
              className="gap-1.5 h-9 text-sm"
            >
              <FlaskConical className="h-4 w-4" />
              {seedingMarcelo ? "Criando..." : "Caso Teste 2"}
            </Button>
            <Button 
              variant="outline" size="sm" 
              onClick={() => navigate("/novo-calculo")}
              className="gap-1.5 h-9 text-sm"
            >
              <Calculator className="h-4 w-4" />
              Wizard Completo
            </Button>
            <CreateCaseDialog />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = statusCounts[tab.value] || 0;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
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
                <Button onClick={() => navigate("/novo-calculo")} className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Wizard Completo
                </Button>
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
                criadoEm={c.criado_em}
                documentCount={c.doc_count}
                factCount={c.fact_count}
                confirmedFactCount={c.confirmed_fact_count}
                snapshotCount={c.snapshot_count}
                totalBruto={c.total_bruto}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayoutPremium>
  );
}
