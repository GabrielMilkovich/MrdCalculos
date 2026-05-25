import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Clock, Database, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type ProcessingStage =
  | "uploaded"
  | "pending"
  | "queued"
  | "downloading"
  | "ocr"
  | "chunking"
  | "embedding"
  | "completed"
  | "embedded"
  | "failed"
  | "error";

export interface ProcessingMonitorDocument {
  id: string;
  file_name?: string | null;
  status?: string | null;
  processing_status?: string | null;
  page_count?: number | null;
  error_message?: string | null;
  metadata?: {
    processing_progress?: number;
    processing_message?: string;
    chunks_created?: number;
  } | null;
}

export interface CaseProcessingStats {
  total_documents: number | null;
  indexed_documents: number | null;
  pending_documents: number | null;
  processing_documents: number | null;
  failed_documents: number | null;
  total_chunks: number | null;
  last_processed_at: string | null;
}

function getEffectiveStatus(doc: ProcessingMonitorDocument): ProcessingStage {
  return (doc.processing_status || doc.status || "uploaded") as ProcessingStage;
}

function estimateMinutesForDoc(doc: ProcessingMonitorDocument): number {
  // Heurística simples para feedback ao usuário.
  // - OCR costuma dominar (≈30s a 90s por página em PDFs/imagens)
  // - chunk+embedding geralmente mais rápido, mas depende do tamanho
  const pages = Math.max(1, doc.page_count ?? 1);
  const base = 0.8; // min
  const perPage = 0.6; // min/página
  return base + pages * perPage;
}

export function ProcessingMonitorPanel({
  documents,
  stats,
  totalChunks,
}: {
  documents: ProcessingMonitorDocument[];
  stats?: CaseProcessingStats | null;
  totalChunks?: number;
}) {
  const derived = useMemo(() => {
    const effective = documents.map((d) => ({ doc: d, status: getEffectiveStatus(d) }));
    const processing = effective.filter((d) =>
      ["queued", "downloading", "ocr", "chunking", "embedding"].includes(d.status)
    );
    const pending = effective.filter((d) => ["uploaded", "pending"].includes(d.status));
    const done = effective.filter((d) => ["completed", "embedded"].includes(d.status));
    const failed = effective.filter((d) => ["failed", "error"].includes(d.status));

    const estimatedMinutes = processing
      .map((d) => estimateMinutesForDoc(d.doc))
      .reduce((a, b) => a + b, 0);

    const progressItems = processing
      .map(({ doc, status }) => {
        const progress = doc.metadata?.processing_progress;
        const message = doc.metadata?.processing_message;
        return {
          id: doc.id,
          name: doc.file_name || "Documento",
          status,
          progress: typeof progress === "number" ? progress : null,
          message: typeof message === "string" ? message : null,
        };
      })
      .slice(0, 4);

    const lastErrors = failed
      .map(({ doc, status }) => ({
        id: doc.id,
        name: doc.file_name || "Documento",
        status,
        error: doc.error_message || doc.metadata?.processing_message || "Falha sem detalhes",
      }))
      .slice(0, 3);

    return {
      processingCount: processing.length,
      pendingCount: pending.length,
      doneCount: done.length,
      failedCount: failed.length,
      estimatedMinutes,
      progressItems,
      lastErrors,
    };
  }, [documents]);

  const totalDocs = stats?.total_documents ?? documents.length;
  const totalChunksFromStats = stats?.total_chunks ?? null;
  const doneChunks =
    (typeof totalChunks === "number" ? totalChunks : totalChunksFromStats) ??
    documents.reduce((sum, d) => sum + (d.metadata?.chunks_created ?? 0), 0);

  const pctDone = totalDocs > 0 ? Math.round((derived.doneCount / totalDocs) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Monitor de Processamento</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe o processamento e erros recentes dos documentos do caso.
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Database className="h-3.5 w-3.5" />
            {typeof doneChunks === "number" ? `${doneChunks} chunks` : "—"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4" />
              Em processamento
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{derived.processingCount}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimativa
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {derived.processingCount > 0 ? `${Math.max(1, Math.round(derived.estimatedMinutes))}m` : "—"}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Concluídos
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{derived.doneCount}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Erros
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{derived.failedCount}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="text-foreground font-medium">{pctDone}%</span>
          </div>
          <Progress value={pctDone} />
          {stats?.last_processed_at && (
            <p className="text-xs text-muted-foreground">
              Último processamento: {new Date(stats.last_processed_at).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {(derived.progressItems.length > 0 || derived.lastErrors.length > 0) && <Separator />}

        {derived.progressItems.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Agora</div>
            <div className="space-y-3">
              {derived.progressItems.map((it) => (
                <div key={it.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{it.message || it.status}</div>
                    </div>
                    <Badge variant="outline">{it.progress !== null ? `${Math.round(it.progress)}%` : "…"}</Badge>
                  </div>
                  {it.progress !== null && it.progress > 0 && it.progress < 100 && (
                    <div className="mt-2">
                      <Progress value={it.progress} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {derived.lastErrors.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Últimos erros</div>
            <div className="space-y-2">
              {derived.lastErrors.map((e) => (
                <div key={e.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 break-words">{e.error}</div>
                    </div>
                    <Badge variant="outline">{e.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
