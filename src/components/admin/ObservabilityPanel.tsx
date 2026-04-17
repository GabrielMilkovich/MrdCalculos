/**
 * Painel admin de observabilidade: logs recentes + snapshot de métricas.
 * Auto-refresh 5s, filtro por nível, busca por source.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { logger, type LogEntry, type LogLevel } from "@/lib/logger";
import { metrics } from "@/lib/metrics";

const REFRESH_MS = 5000;
const LEVELS: Array<LogLevel | "all"> = ["all", "debug", "info", "warn", "error", "fatal"];
const LEVEL_VARIANT: Record<LogLevel, "secondary" | "default" | "destructive" | "outline"> = {
  debug: "outline", info: "secondary", warn: "default", error: "destructive", fatal: "destructive",
};

export function ObservabilityPanel() {
  const [entries, setEntries] = useState<LogEntry[]>(() => logger.getRecent(200));
  const [snapshot, setSnapshot] = useState<Record<string, number>>(() => metrics.getSnapshot());
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    const id = setInterval(() => {
      setEntries(logger.getRecent(200));
      setSnapshot(metrics.getSnapshot());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo<LogEntry[]>(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => (level === "all" ? true : e.level === level))
      .filter((e) => (q === "" ? true : (e.source ?? "").toLowerCase().includes(q)));
  }, [entries, level, search]);

  const metricEntries = useMemo(
    () => Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)),
    [snapshot],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Métricas</CardTitle></CardHeader>
        <CardContent>
          {metricEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma métrica registrada.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {metricEntries.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                  <span className="font-mono text-xs">{k}</span>
                  <span className="font-semibold">{v.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Logs recentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <Select value={level} onValueChange={(v) => setLevel(v as LogLevel | "all")}>
              <SelectTrigger className="md:w-40"><SelectValue placeholder="Nível" /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Filtrar por source..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem entradas para os filtros atuais.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.slice(-100).reverse().map((e, i) => (
                <li key={`${e.timestamp}-${i}`} className="rounded border px-2 py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={LEVEL_VARIANT[e.level]}>{e.level}</Badge>
                    <span className="font-mono text-muted-foreground">{e.timestamp}</span>
                    {e.source && <span className="font-mono text-muted-foreground">[{e.source}]</span>}
                  </div>
                  <div className="mt-1 font-medium">{e.message}</div>
                  {e.context && (
                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-1 text-[10px]">{JSON.stringify(e.context)}</pre>
                  )}
                  {e.error && (
                    <pre className="mt-1 overflow-x-auto rounded bg-destructive/10 p-1 text-[10px] text-destructive">{e.error.name}: {e.error.message}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
