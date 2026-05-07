/**
 * PR-6 — Painel admin de backfill V6 em lote.
 *
 * Lista quantos docs ainda têm `parsed IS NULL` (precisam re-passar pelo
 * extrator V6) e oferece botões "30 dias / 90 dias / Tudo" pra disparar
 * `backfill-v6-batch` em lote. Função processa até 25 docs por chamada;
 * o painel re-dispara automaticamente até esvaziar a janela escolhida.
 *
 * Cada execução:
 *   - Invoca `backfill-v6-batch` com mode + before_iso (cursor).
 *   - Mostra progresso (sucessos / falhas) e detalhes por doc.
 *   - Continua paginando enquanto retornar `total > 0`.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type Mode = "30d" | "90d" | "all";

interface Processado {
  id: string;
  ok: boolean;
  motivo?: string;
  outcome?: string;
  mapper?: string;
}

interface BackfillResponse {
  total: number;
  sucessos: number;
  falhas: number;
  ultima_created_at: string | null;
  processados: Processado[];
  message?: string;
}

export default function V6Backfill() {
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [validados, setValidados] = useState<number | null>(null);
  const [running, setRunning] = useState<Mode | null>(null);
  const [logs, setLogs] = useState<Processado[]>([]);
  const [stats, setStats] = useState({ sucessos: 0, falhas: 0, lotes: 0 });
  const [error, setError] = useState<string | null>(null);

  const carregarStats = async () => {
    setError(null);
    const [pend, val] = await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .is("parsed", null)
        .eq("mime_type", "application/pdf"),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .not("parsed", "is", null),
    ]);
    if (pend.error) {
      setError(pend.error.message);
    } else {
      setPendentes(pend.count ?? 0);
    }
    if (!val.error) setValidados(val.count ?? 0);
  };

  useEffect(() => {
    void carregarStats();
  }, []);

  const rodar = async (mode: Mode) => {
    setRunning(mode);
    setLogs([]);
    setStats({ sucessos: 0, falhas: 0, lotes: 0 });
    setError(null);

    let cursor: string | null = null;
    try {
      // Loop até esvaziar janela (ou erro).
      // Hard cap de 50 lotes pra evitar runaway acidental.
      for (let lote = 0; lote < 50; lote++) {
        const body: Record<string, unknown> = { mode, limit: 10 };
        if (cursor) body.before_iso = cursor;
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "backfill-v6-batch",
          { body },
        );
        if (invokeErr) {
          logger.error("backfill-v6-batch falhou", invokeErr);
          setError(invokeErr.message ?? String(invokeErr));
          break;
        }
        const r = data as BackfillResponse;
        setLogs((prev) => [...prev, ...r.processados]);
        setStats((prev) => ({
          sucessos: prev.sucessos + r.sucessos,
          falhas: prev.falhas + r.falhas,
          lotes: prev.lotes + 1,
        }));
        if (r.total === 0) break;
        cursor = r.ultima_created_at;
        if (!cursor) break;
      }
    } finally {
      setRunning(null);
      void carregarStats();
    }
  };

  const labelModo = (m: Mode): string =>
    m === "30d" ? "30 dias" : m === "90d" ? "90 dias" : "Tudo";

  const total = useMemo(() => stats.sucessos + stats.falhas, [stats]);

  return (
    <MainLayout
      breadcrumbs={[{ label: "Admin" }, { label: "Backfill V6" }]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Backfill V6 — extrator geométrico</h1>
          <p className="text-sm text-muted-foreground">
            Reprocessa documentos PDF com <code>parsed IS NULL</code>{" "}
            (subidos antes do deploy V6 ou onde o pipeline falhou). Cada lote
            processa até 10 docs e o painel pagina automaticamente até
            esvaziar a janela.
          </p>
        </div>

        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">
              Falha: {error}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Documentos pendentes</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {pendentes ?? "…"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <code>parsed IS NULL</code> + <code>mime_type = 'application/pdf'</code>.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Documentos já parsed</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {validados ?? "…"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Já indexados pelo V6 ou versão anterior.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sessão atual</CardDescription>
              <CardTitle className="text-3xl font-mono">
                {total}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {stats.sucessos} sucesso(s), {stats.falhas} falha(s) em{" "}
              {stats.lotes} lote(s).
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disparar backfill</CardTitle>
            <CardDescription>
              Cada janela processa docs com <code>created_at</code> dentro do
              recorte. "Tudo" cobre todos os pendentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-center">
            {(["30d", "90d", "all"] as Mode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={running === m ? "default" : "outline"}
                onClick={() => void rodar(m)}
                disabled={running !== null}
                className="gap-1.5"
              >
                {running === m ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {labelModo(m)}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void carregarStats()}
              disabled={running !== null}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar contagem
            </Button>
          </CardContent>
        </Card>

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log de execução</CardTitle>
              <CardDescription>
                Mais recente no topo. Falhas aparecem com o motivo retornado
                pelo <code>reprocess-v6</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[420px] pr-2">
                <ul className="space-y-1 text-[11px] font-mono">
                  {logs.slice().reverse().map((p, i) => (
                    <li
                      key={`${p.id}-${i}`}
                      className="flex items-center gap-2 py-0.5"
                    >
                      <Badge
                        variant="outline"
                        className={
                          p.ok
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200"
                        }
                      >
                        {p.ok ? "OK" : "FAIL"}
                      </Badge>
                      <span className="opacity-70">{p.id.slice(0, 8)}…</span>
                      <span className="opacity-60">
                        {p.mapper ?? p.outcome ?? "—"}
                      </span>
                      {p.motivo && (
                        <span className="text-muted-foreground">
                          — {p.motivo}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
