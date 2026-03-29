/**
 * EvolucaoDebito — Debt Evolution Report Component
 *
 * Displays month-by-month debt evolution with:
 * - Line chart showing principal, correction, interest, and total
 * - Data table with monthly breakdown
 * - Summary statistics
 * - CSV export button
 */
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  TrendingUp,
  Download,
  BarChart3,
  TableIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  calcularEvolucaoDebito,
  exportarEvolucaoCSV,
  type DebtEvolutionEntry,
  type DebtEvolutionResult,
} from "@/lib/pjecalc/debt-evolution";
import type { PjeLiquidacaoResult, PjeCorrecaoConfig } from "@/lib/pjecalc/engine-types";

interface Props {
  result: PjeLiquidacaoResult;
  correcaoConfig?: PjeCorrecaoConfig;
}

const chartConfig: ChartConfig = {
  principal_acumulado: {
    label: "Principal",
    color: "hsl(var(--chart-1))",
  },
  correcao_acumulada: {
    label: "Correção Monetária",
    color: "hsl(var(--chart-2))",
  },
  juros_acumulados: {
    label: "Juros de Mora",
    color: "hsl(var(--chart-3))",
  },
  total_acumulado: {
    label: "Total",
    color: "hsl(var(--chart-4))",
  },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

export function EvolucaoDebito({ result, correcaoConfig }: Props) {
  const [tab, setTab] = useState<string>("chart");

  const evolution: DebtEvolutionResult = useMemo(
    () => calcularEvolucaoDebito(result, correcaoConfig),
    [result, correcaoConfig]
  );

  const { entries, summary } = evolution;

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução do Débito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum dado disponível para gerar a evolução do débito.
            Execute a liquidação primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    const csv = exportarEvolucaoCSV(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolucao-debito-${summary.competencia_inicial}-${summary.competencia_final}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução do Débito
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5">
              {summary.total_meses} meses
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleExportCSV}
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Principal Total"
            value={fmt(entries[entries.length - 1].principal_acumulado)}
            prefix="R$"
          />
          <SummaryCard
            label="Correção Total"
            value={fmt(entries[entries.length - 1].correcao_acumulada)}
            prefix="R$"
          />
          <SummaryCard
            label="Juros Total"
            value={fmt(entries[entries.length - 1].juros_acumulados)}
            prefix="R$"
          />
          <SummaryCard
            label="Crescimento"
            value={`${summary.crescimento_total_pct.toFixed(1)}%`}
            detail={`Média: ${summary.taxa_mensal_media.toFixed(2)}%/mês`}
            positive={summary.crescimento_total_pct > 0}
          />
        </div>

        {/* Tabs: Chart / Table */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8">
            <TabsTrigger value="chart" className="text-xs gap-1 h-6">
              <BarChart3 className="h-3 w-3" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="table" className="text-xs gap-1 h-6">
              <TableIcon className="h-3 w-3" />
              Tabela
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-3">
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <AreaChart
                data={entries}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="fillPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-principal_acumulado)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-principal_acumulado)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total_acumulado)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-total_acumulado)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="competencia"
                  tickFormatter={(v: string) => {
                    const [y, m] = v.split("-");
                    return `${m}/${y.slice(2)}`;
                  }}
                  fontSize={10}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tickFormatter={(v: number) => `R$${fmtCompact(v)}`}
                  fontSize={10}
                  width={70}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => {
                        if (typeof label === 'string') {
                          const [y, m] = label.split("-");
                          return `${m}/${y}`;
                        }
                        return String(label);
                      }}
                      formatter={(value, name) => {
                        const numVal = typeof value === 'number' ? value : 0;
                        return (
                          <span className="font-mono">
                            R$ {fmt(numVal)}
                          </span>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="principal_acumulado"
                  stroke="var(--color-principal_acumulado)"
                  fill="url(#fillPrincipal)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="correcao_acumulada"
                  stroke="var(--color-correcao_acumulada)"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <Area
                  type="monotone"
                  dataKey="juros_acumulados"
                  stroke="var(--color-juros_acumulados)"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
                <Area
                  type="monotone"
                  dataKey="total_acumulado"
                  stroke="var(--color-total_acumulado)"
                  fill="url(#fillTotal)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="table" className="mt-3">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Competência</TableHead>
                    <TableHead className="text-xs text-right">
                      Principal Acum.
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Correção Acum.
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Juros Acum.
                    </TableHead>
                    <TableHead className="text-xs text-right font-bold">
                      Total Acum.
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Var. Mensal
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Var. %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.competencia} className="text-xs">
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatCompetencia(e.competencia)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(e.principal_acumulado)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(e.correcao_acumulada)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(e.juros_acumulados)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {fmt(e.total_acumulado)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            e.variacao_mensal > 0
                              ? "text-red-600"
                              : e.variacao_mensal < 0
                                ? "text-emerald-600"
                                : ""
                          }
                        >
                          {e.variacao_mensal >= 0 ? "+" : ""}
                          {fmt(e.variacao_mensal)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end gap-0.5">
                          {e.variacao_percentual > 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-red-500" />
                          ) : e.variacao_percentual < 0 ? (
                            <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                          ) : null}
                          {e.variacao_percentual.toFixed(2)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Helper components ---

function SummaryCard({
  label,
  value,
  prefix,
  detail,
  positive,
}: {
  label: string;
  value: string;
  prefix?: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">
        {prefix && (
          <span className="text-muted-foreground font-normal text-xs mr-0.5">
            {prefix}
          </span>
        )}
        {value}
        {positive !== undefined && (
          positive ? (
            <ArrowUpRight className="h-3.5 w-3.5 inline ml-1 text-red-500" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 inline ml-1 text-emerald-500" />
          )
        )}
      </p>
      {detail && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
      )}
    </div>
  );
}

function formatCompetencia(comp: string): string {
  const [y, m] = comp.split("-");
  return `${m}/${y}`;
}
