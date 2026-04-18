import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Case {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
  atualizado_em: string | null;
}

interface ValidationPending {
  case_id: string;
  cliente: string;
  pending_count: number;
}

interface RecentCalculation {
  id: string;
  case_id: string;
  cliente: string;
  executado_em: string;
  total_bruto: number;
}

const statusConfig = {
  rascunho: { label: "Rascunho", icon: FileText, className: "text-muted-foreground" },
  em_analise: { label: "Em Análise", icon: Sparkles, className: "text-amber-600" },
  calculado: { label: "Calculado", icon: Calculator, className: "text-emerald-600" },
  revisado: { label: "Revisado", icon: CheckCircle2, className: "text-blue-600" },
};

export default function Index() {
  const navigate = useNavigate();

  // Fetch cases
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["dashboard-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("atualizado_em", { ascending: false, nullsFirst: false })
        .limit(10);
      if (error) throw error;
      return data as Case[];
    },
  });

  const { data: validationPending = [] } = useQuery({
    queryKey: ["dashboard-validation-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facts")
        .select("case_id, cases!inner(cliente)")
        .eq("confirmado", false)
        .limit(100);
      if (error) throw error;
      const grouped = (data || []).reduce((acc, item) => {
        const existing = acc.find((x: ValidationPending) => x.case_id === item.case_id);
        if (existing) {
          existing.pending_count++;
        } else {
          acc.push({ case_id: item.case_id, cliente: (item.cases as any)?.cliente || "—", pending_count: 1 });
        }
        return acc;
      }, [] as ValidationPending[]);
      return grouped.slice(0, 5);
    },
  });

  const { data: recentCalcs = [] } = useQuery({
    queryKey: ["dashboard-recent-calcs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calc_snapshots")
        .select("id, case_id, created_at, total_bruto, cases!inner(cliente)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((item) => ({
        id: item.id,
        case_id: item.case_id,
        cliente: (item.cases as any)?.cliente || "—",
        executado_em: item.created_at,
        total_bruto: item.total_bruto || 0,
      })) as RecentCalculation[];
    },
  });

  const { data: docsPending = 0 } = useQuery({
    queryKey: ["dashboard-docs-pending"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "queued", "processing"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = {
    total: cases.length,
    emAnalise: cases.filter((c) => c.status === "em_analise").length,
    calculados: cases.filter((c) => c.status === "calculado").length,
    revisados: cases.filter((c) => c.status === "revisado").length,
  };

  const totalPendingValidations = validationPending.reduce((sum, v) => sum + v.pending_count, 0);

  return (
    <MainLayoutPremium breadcrumbs={[]} title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Casos Ativos" value={stats.total} sub={`${stats.emAnalise} em análise`} icon={Briefcase} />
          <StatCard title="Pendências" value={totalPendingValidations} sub={`${validationPending.length} casos`} icon={ShieldCheck} alert={totalPendingValidations > 5} />
          <StatCard title="Calculados" value={stats.calculados + stats.revisados} sub={`${stats.revisados} revisados`} icon={Calculator} />
          <StatCard title="Docs Processando" value={docsPending} sub="em fila" icon={FileCheck} />
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Work Queue */}
            {(validationPending.length > 0 || docsPending > 0) && (
              <div className="glass-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Fila de Trabalho
                </h2>
                <div className="space-y-2">
                  {validationPending.slice(0, 3).map((item) => (
                    <button
                      key={item.case_id}
                      onClick={() => navigate(`/casos/${item.case_id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-accent/15 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.cliente}</p>
                          <p className="text-xs text-muted-foreground">{item.pending_count} fatos pendentes</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  {docsPending > 0 && (
                    <button
                      onClick={() => navigate("/documentos")}
                      className="w-full flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{docsPending} documentos processando</p>
                          <p className="text-xs text-muted-foreground">OCR e indexação</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recent Cases */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Casos Recentes
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/casos")} className="text-xs h-7 text-primary">
                  Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhum caso cadastrado</p>
                  <Button size="sm" onClick={() => navigate("/casos")}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar Caso
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {cases.slice(0, 6).map((c) => {
                    const cfg = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.rascunho;
                    return (
                      <Link
                        key={c.id}
                        to={`/casos/${c.id}`}
                        className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <cfg.icon className={cn("h-4 w-4 flex-shrink-0", cfg.className)} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {c.cliente}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.numero_processo || "Sem processo"} · {formatDistanceToNow(new Date(c.atualizado_em || c.criado_em), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", cfg.className)}>
                          {cfg.label}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Side Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Calcs */}
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Últimos Cálculos
              </h2>
              {recentCalcs.length === 0 ? (
                <div className="text-center py-6">
                  <Calculator className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum cálculo executado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCalcs.map((calc) => (
                    <Link
                      key={calc.id}
                      to={`/casos/${calc.case_id}`}
                      className="block p-3 rounded-md border border-border/60 hover:border-primary/20 hover:bg-muted/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{calc.cliente}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(calc.executado_em), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-base font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calc.total_bruto)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Progresso
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Casos Finalizados</span>
                    <span className="font-semibold">{stats.revisados}/{stats.total || 1}</span>
                  </div>
                  <Progress value={stats.total > 0 ? (stats.revisados / stats.total) * 100 : 0} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Validações Pendentes</span>
                    <span className="font-semibold">{totalPendingValidations}</span>
                  </div>
                  <Progress value={Math.max(0, 100 - totalPendingValidations * 5)} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayoutPremium>
  );
}

function StatCard({ title, value, sub, icon: Icon, alert }: {
  title: string;
  value: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  alert?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <Icon className={cn("h-4 w-4", alert ? "text-amber-500" : "text-muted-foreground/50")} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
