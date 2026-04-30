/**
 * Painel admin: lista os últimos 100 erros persistidos em `app_error_log`.
 * RLS: apenas admins (has_role) leem todas as linhas; usuários leem as próprias.
 */
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fromUntyped } from "@/lib/supabase-untyped";
import { logger } from "@/lib/logger";
import { copyToClipboard } from "@/lib/error-reporter";
import { toast } from "sonner";

interface ErrorRow {
  id: string;
  created_at: string;
  user_id: string | null;
  source: string | null;
  message: string | null;
  stack: string | null;
  route: string | null;
  context: Record<string, unknown> | null;
}

export default function AdminErrors() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fromUntyped("app_error_log")
      .select("id, created_at, user_id, source, message, stack, route, context")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      logger.error("AdminErrors: select falhou", error);
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ErrorRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <MainLayout breadcrumbs={[{ label: "Admin" }, { label: "Erros" }]}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Erros recentes</h1>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
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

        {rows.length === 0 && !loading && !error && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground text-center">
              Nenhum erro registrado.
            </CardContent>
          </Card>
        )}

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive">{r.source ?? "?"}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.route && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.route}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">{r.message ?? "(sem mensagem)"}</p>
                  {r.stack && (
                    <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto max-h-48">
                      {r.stack}
                    </pre>
                  )}
                  {r.context && Object.keys(r.context).length > 0 && (
                    <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(r.context, null, 2)}
                    </pre>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      copyToClipboard(JSON.stringify(r, null, 2));
                      toast.success("Erro copiado");
                    }}
                  >
                    Copiar JSON
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
