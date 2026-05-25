import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  FolderOpen,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocRow {
  id: string;
  file_name: string | null;
  tipo: string | null;
  status: string;
  case_id: string | null;
  validado: boolean | null;
  uploaded_em: string | null;
  updated_at: string | null;
  error_message: string | null;
}

interface DocStats {
  total: number;
  validated: number;
  pending: number;
  errored: number;
  recentUploads: number;
  casesWithDocs: number;
  recent: DocRow[];
}

const TIPO_LABEL: Record<string, string> = {
  peticao: "Petição",
  trct: "TRCT",
  holerite: "Holerite",
  cartao_ponto: "Cartão de Ponto",
  ponto: "Ponto",
  sentenca: "Sentença",
  outro: "Outro",
  ctps: "CTPS",
  contrato: "Contrato",
  cct: "CCT",
  fgts: "FGTS",
  ficha_financeira: "Ficha Financeira",
};

function statusBadge(status: string, validado: boolean | null): JSX.Element {
  if (validado) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-300">
        Validado
      </Badge>
    );
  }
  if (status === "failed") {
    return <Badge variant="destructive">Erro</Badge>;
  }
  if (status === "ocr_running") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        OCR rodando
      </Badge>
    );
  }
  if (status === "uploaded") {
    return <Badge variant="outline">Processando</Badge>;
  }
  if (status === "completed") {
    return <Badge variant="outline">Pronto</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function Documentos() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data, isLoading, error } = useQuery<DocStats, Error>({
    queryKey: ["user_documents_stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Pull all documents owned by the user. RLS already filters; we
      // also restrict by owner_user_id for safety.
      const { data: rows, error: qErr } = await supabase
        .from("documents")
        .select(
          "id, file_name, tipo, status, case_id, validado, uploaded_em, updated_at, error_message",
        )
        .eq("owner_user_id", user.id)
        .order("uploaded_em", { ascending: false })
        .limit(200);

      if (qErr) throw qErr;
      const docs = (rows ?? []) as DocRow[];

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const validated = docs.filter((d) => d.validado === true).length;
      const pending = docs.filter(
        (d) => d.status === "ocr_running" || d.status === "uploaded",
      ).length;
      const errored = docs.filter(
        (d) => d.status === "failed" || d.status === "ocr_failed",
      ).length;
      const recentUploads = docs.filter((d) => {
        if (!d.uploaded_em) return false;
        const t = Date.parse(d.uploaded_em);
        return Number.isFinite(t) && t >= sevenDaysAgo;
      }).length;
      const cases = new Set(docs.map((d) => d.case_id).filter(Boolean));

      return {
        total: docs.length,
        validated,
        pending,
        errored,
        recentUploads,
        casesWithDocs: cases.size,
        recent: docs.slice(0, 20),
      };
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie documentos de todos os casos
          </p>
        </div>

        {error && (
          <Card className="glass-card border-destructive/40">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Falha ao carregar documentos
                </p>
                <p className="text-xs text-muted-foreground">{error.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.total ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Em todos os casos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OCR Validados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.validated ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Confirmados pelo usuário
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.pending ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                OCR rodando ou aguardando
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.errored ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Reprocessar no caso
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uploads Recentes</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.recentUploads ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Nos últimos 7 dias</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casos com Docs</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.casesWithDocs ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Distintos com pelo menos 1 doc
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Documentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !data || data.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum documento ainda
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Os documentos serão listados aqui quando você fizer upload em
                  algum caso. Acesse um caso específico para fazer upload de
                  documentos.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-xs">
                      <th className="p-2 text-left font-medium">Arquivo</th>
                      <th className="p-2 text-left font-medium">Tipo</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-left font-medium">Caso</th>
                      <th className="p-2 text-left font-medium">Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((d) => {
                      const tipoLabel =
                        d.tipo ? (TIPO_LABEL[d.tipo] ?? d.tipo) : "—";
                      return (
                        <tr
                          key={d.id}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            if (d.case_id) {
                              navigate(`/casos/${d.case_id}?tab=documentos`);
                            }
                          }}
                        >
                          <td className="p-2 truncate max-w-[260px]">
                            {d.file_name ?? "(sem nome)"}
                          </td>
                          <td className="p-2 text-xs uppercase">{tipoLabel}</td>
                          <td className="p-2">
                            {statusBadge(d.status, d.validado)}
                          </td>
                          <td className="p-2 text-xs font-mono text-muted-foreground">
                            {d.case_id ? d.case_id.slice(0, 8) : "—"}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {fmtDate(d.uploaded_em)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
