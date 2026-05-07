/**
 * F3.2 — Painel admin de telemetria de exports CSV.
 *
 * Lê `csv_export_telemetry` (RLS: admins veem todas as linhas) e renderiza:
 *   1. 4 KPI cards (últimos 30 dias):
 *        - Total exports
 *        - % com perdas (baixado_com_perdas=true)
 *        - % bloqueio burlado (operador marcou checkbox override)
 *        - % IA invocada (verify-extraction-ai)
 *   2. Gráfico de barras stacked: volume diário por builder.
 *   3. Gráfico de linha: % com perdas + % bloqueio burlado por dia.
 *
 * KPIs ajudam a calibrar:
 *   - Se "% com perdas" sobe consistentemente → parser regredindo.
 *   - Se "% bloqueio burlado" > 5% → operadores ignorando warnings reais
 *     OU parser está sinalizando demais (false positives).
 *   - Se "% IA invocada" baixa → score do parser está bom (faixa 50-85
 *     pequena), OU operadores não estão usando o botão (UX issue).
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type Builder = "cartao_ponto" | "holerite" | "ferias" | "faltas" | "ctps";

interface TelemetryRow {
  id: string;
  criado_em: string;
  builder: Builder;
  baixado_com_perdas: boolean;
  bloqueio_burlado: boolean;
  ai_invoked: boolean;
  ai_confidence: number | null;
  ai_skipped_reason: string | null;
  linhas_geradas: number;
  linhas_rejeitadas: number;
  warnings: number;
}

const BUILDER_COLORS: Record<Builder, string> = {
  cartao_ponto: "#3b82f6", // blue
  holerite: "#10b981", // emerald
  ferias: "#f59e0b", // amber
  faltas: "#ef4444", // rose
  ctps: "#8b5cf6", // violet
};

const BUILDER_LABEL: Record<Builder, string> = {
  cartao_ponto: "Cartão",
  holerite: "Holerite",
  ferias: "Férias",
  faltas: "Faltas",
  ctps: "CTPS",
};

/** Trunca uma data ISO para a chave "YYYY-MM-DD". */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Gera array de YYYY-MM-DD pra últimos N dias (inclusivo hoje). */
function ultimosNDias(n: number): string[] {
  const out: string[] = [];
  const hoje = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

interface DailyAggregate {
  day: string;
  cartao_ponto: number;
  holerite: number;
  ferias: number;
  faltas: number;
  ctps: number;
  total: number;
  com_perdas: number;
  bloqueio_burlado: number;
  ai_invoked: number;
  pct_perdas: number;
  pct_burlado: number;
  pct_ia: number;
}

function agregarPorDia(rows: TelemetryRow[], dias: string[]): DailyAggregate[] {
  const mapa = new Map<string, DailyAggregate>();
  for (const day of dias) {
    mapa.set(day, {
      day,
      cartao_ponto: 0,
      holerite: 0,
      ferias: 0,
      faltas: 0,
      ctps: 0,
      total: 0,
      com_perdas: 0,
      bloqueio_burlado: 0,
      ai_invoked: 0,
      pct_perdas: 0,
      pct_burlado: 0,
      pct_ia: 0,
    });
  }
  for (const r of rows) {
    const k = dayKey(r.criado_em);
    const agg = mapa.get(k);
    if (!agg) continue; // fora da janela
    agg.total += 1;
    agg[r.builder] += 1;
    if (r.baixado_com_perdas) agg.com_perdas += 1;
    if (r.bloqueio_burlado) agg.bloqueio_burlado += 1;
    if (r.ai_invoked) agg.ai_invoked += 1;
  }
  for (const agg of mapa.values()) {
    if (agg.total > 0) {
      agg.pct_perdas = (agg.com_perdas / agg.total) * 100;
      agg.pct_burlado = (agg.bloqueio_burlado / agg.total) * 100;
      agg.pct_ia = (agg.ai_invoked / agg.total) * 100;
    }
  }
  return [...mapa.values()];
}

interface KpiResumo {
  totalExports: number;
  pctPerdas: number;
  pctBurlado: number;
  pctIa: number;
}

function kpisDoPeriodo(rows: TelemetryRow[]): KpiResumo {
  const total = rows.length;
  if (total === 0) {
    return { totalExports: 0, pctPerdas: 0, pctBurlado: 0, pctIa: 0 };
  }
  return {
    totalExports: total,
    pctPerdas: (rows.filter((r) => r.baixado_com_perdas).length / total) * 100,
    pctBurlado: (rows.filter((r) => r.bloqueio_burlado).length / total) * 100,
    pctIa: (rows.filter((r) => r.ai_invoked).length / total) * 100,
  };
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

const BUILDERS: Builder[] = [
  "holerite",
  "cartao_ponto",
  "ferias",
  "faltas",
  "ctps",
];

export default function TelemetriaCSV() {
  const [rows, setRows] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dias = useMemo(() => ultimosNDias(30), []);

  const load = async () => {
    setLoading(true);
    setError(null);
    // Janela de 30 dias.
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    const { data, error: dbError } = await supabase
      .from("csv_export_telemetry")
      .select(
        "id, criado_em, builder, baixado_com_perdas, bloqueio_burlado, ai_invoked, ai_confidence, ai_skipped_reason, linhas_geradas, linhas_rejeitadas, warnings",
      )
      .gte("criado_em", desde.toISOString())
      .order("criado_em", { ascending: false });
    if (dbError) {
      logger.error("TelemetriaCSV: select falhou", dbError);
      setError(dbError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as TelemetryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const kpis = useMemo(() => kpisDoPeriodo(rows), [rows]);
  const daily = useMemo(() => agregarPorDia(rows, dias), [rows, dias]);

  return (
    <MainLayout
      breadcrumbs={[{ label: "Admin" }, { label: "Telemetria CSV" }]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Telemetria CSV — últimos 30 dias</h1>
            <p className="text-sm text-muted-foreground">
              Audit trail de fidelidade extração→CSV. Use pra detectar
              regressões em parsers ou identificar onde operadores estão
              ignorando warnings.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Recarregar"}
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">
              Falha ao carregar: {error}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de exports</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {kpis.totalExports}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Cliques em "Confirmar e baixar CSV" nos últimos 30 dias.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>% com perdas</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {formatPct(kpis.pctPerdas)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Exports onde houve linhas rejeitadas pelo builder.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                % bloqueio burlado
                {kpis.pctBurlado > 5 && (
                  <Badge variant="destructive" className="text-[10px] h-4">
                    {">"}5%
                  </Badge>
                )}
              </CardDescription>
              <CardTitle className="text-3xl font-mono">
                {formatPct(kpis.pctBurlado)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Operador marcou checkbox override apesar de divergências.
              Alvo: ≤ 5%. Acima disso → investigar parser ou treinar UX.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>% IA invocada</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {formatPct(kpis.pctIa)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Exports onde operador clicou "Verificar com IA"
              (faixa de score 50-85).
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume diário por builder</CardTitle>
            <CardDescription>
              Cada barra = 1 dia. Cores = tipo de doc. Stack mostra
              composição.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => d.slice(5)}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number, name: string) => [
                    v,
                    BUILDER_LABEL[name as Builder] ?? name,
                  ]}
                />
                <Legend
                  formatter={(name) => BUILDER_LABEL[name as Builder] ?? name}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {BUILDERS.map((b) => (
                  <Bar
                    key={b}
                    dataKey={b}
                    stackId="builders"
                    fill={BUILDER_COLORS[b]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              % com perdas e % bloqueio burlado por dia
            </CardTitle>
            <CardDescription>
              Tendência das duas séries que mais importam pra qualidade.
              Bloqueio burlado consistente acima de 5% = ação requerida.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => d.slice(5)}
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="pct_perdas"
                  name="% com perdas"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pct_burlado"
                  name="% bloqueio burlado"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pct_ia"
                  name="% IA invocada"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {!loading && rows.length === 0 && !error && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground text-center">
              Nenhum export nos últimos 30 dias. Quando operadores clicarem em
              "Confirmar e baixar CSV", aparecerá aqui.
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
