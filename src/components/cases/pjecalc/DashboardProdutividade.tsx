/**
 * Phase 4, Item 8: Dashboard de Produtividade do Calculista
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import {
  BarChart3, Clock, Calculator, FileCheck, TrendingUp, AlertTriangle,
  CheckCircle2, RefreshCw,
} from "lucide-react";

export function DashboardProdutividade() {
  const { data: metricas } = useQuery({
    queryKey: ["pjecalc_metricas_dashboard"],
    queryFn: async () => {
      // Aggregate metrics from liquidation results and cases
      const [casesRes, liquidacoesRes] = await Promise.all([
        supabase.from("cases").select("id, status, criado_em").order("criado_em", { ascending: false }),
        fromUntyped("pjecalc_liquidacao_resultado").select("case_id, created_at, total_bruto, total_liquido, engine_version").order("created_at", { ascending: false }),
      ]);

      const cases = casesRes.data || [];
      const liquidacoes = (liquidacoesRes as any).data || [];

      const total = cases.length;
      const emAnalise = cases.filter((c: any) => c.status === 'em_analise').length;
      const calculados = cases.filter((c: any) => c.status === 'calculado').length;
      const revisados = cases.filter((c: any) => c.status === 'revisado').length;
      const rascunhos = cases.filter((c: any) => c.status === 'rascunho').length;
      const totalLiquidacoes = liquidacoes.length;

      // Unique cases with liquidation
      const casesComLiquidacao = new Set(liquidacoes.map((l: any) => l.case_id)).size;
      const taxaConclusao = total > 0 ? Math.round((casesComLiquidacao / total) * 100) : 0;

      // Cases with multiple liquidations (rework indicator)
      const liquidacoesPorCaso: Record<string, number> = {};
      liquidacoes.forEach((l: any) => {
        liquidacoesPorCaso[l.case_id] = (liquidacoesPorCaso[l.case_id] || 0) + 1;
      });
      const casosComRetrabalho = Object.values(liquidacoesPorCaso).filter(v => v > 1).length;
      const taxaRetrabalho = casesComLiquidacao > 0 ? Math.round((casosComRetrabalho / casesComLiquidacao) * 100) : 0;

      return {
        total, emAnalise, calculados, revisados, rascunhos,
        totalLiquidacoes, casesComLiquidacao, taxaConclusao,
        casosComRetrabalho, taxaRetrabalho,
      };
    },
  });

  const m = metricas || {
    total: 0, emAnalise: 0, calculados: 0, revisados: 0, rascunhos: 0,
    totalLiquidacoes: 0, casesComLiquidacao: 0, taxaConclusao: 0,
    casosComRetrabalho: 0, taxaRetrabalho: 0,
  };

  const kpis = [
    { label: "Total de Casos", value: m.total, icon: Calculator, color: "text-primary" },
    { label: "Liquidações Executadas", value: m.totalLiquidacoes, icon: FileCheck, color: "text-[hsl(var(--success))]" },
    { label: "Taxa de Conclusão", value: `${m.taxaConclusao}%`, icon: TrendingUp, color: "text-primary" },
    { label: "Taxa de Retrabalho", value: `${m.taxaRetrabalho}%`, icon: RefreshCw, color: m.taxaRetrabalho > 30 ? "text-destructive" : "text-[hsl(var(--warning))]" },
  ];

  const statusBreakdown = [
    { label: "Rascunho", value: m.rascunhos, color: "bg-muted" },
    { label: "Em Análise", value: m.emAnalise, color: "bg-[hsl(var(--warning))]" },
    { label: "Calculado", value: m.calculados, color: "bg-[hsl(var(--success))]" },
    { label: "Revisado", value: m.revisados, color: "bg-primary" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        Dashboard de Produtividade
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <div>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statusBreakdown.map(s => (
              <div key={s.label} className="flex items-center gap-3 text-xs">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="w-24">{s.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${s.color}`}
                    style={{ width: m.total > 0 ? `${(s.value / m.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="font-mono w-8 text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
