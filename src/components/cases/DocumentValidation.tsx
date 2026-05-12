/**
 * DocumentValidation — split view para revisar OCR antes de extrair.
 *
 * Fluxo:
 *  1. Usuário abre o modal após upload + OCR automático.
 *  2. Lado esquerdo: textarea editável com o texto OCR (pode corrigir erros).
 *  3. Lado direito: PDF preview via `<object>` / `<iframe>` (signed URL).
 *  4. Usuário clica "Confirmar e Extrair Dados" → chama `extract-and-fill`
 *     com `ocr_text` + `mark_validated:true`.
 *  5. Extract-and-fill pula o OCR e vai direto pra extração estruturada.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isTerminal } from "@/lib/document-status";
import { toast } from "sonner";
import { autoFillFromOcr } from "@/features/auto-fill/auto-fill-from-ocr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, FileCheck2, Eye, Pencil, RotateCcw, AlertTriangle, CheckCircle2, Download,
} from "lucide-react";
import { logger } from "@/lib/logger";

/** Extrai mensagem real do FunctionsHttpError do supabase-js (body JSON). */
async function unwrapFunctionsError(err: unknown): Promise<Error> {
  try {
    const anyErr = err as { message?: string; context?: Response };
    if (anyErr?.context && typeof anyErr.context.json === "function") {
      const body = await anyErr.context.json().catch(() => null);
      if (body && typeof body === "object") {
        const parts = [(body as Record<string, unknown>).error, (body as Record<string, unknown>).hint].filter(Boolean);
        if (parts.length > 0) return new Error(parts.join(" — "));
      }
      const text = await anyErr.context.text().catch(() => "");
      if (text) return new Error(text.slice(0, 500));
    }
    if (anyErr?.message) return new Error(anyErr.message);
  } catch { /* fallthrough */ }
  return err instanceof Error ? err : new Error(String(err));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  /** Disparado após validação bem-sucedida (invalidar queries, refresh, etc). */
  onValidated?: () => void;
}

interface DocRow {
  id: string;
  file_name: string;
  mime_type: string | null;
  storage_path: string | null;
  arquivo_url: string | null;
  status: string | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_validated: boolean | null;
  page_count: number | null;
  error_message: string | null;
}

async function getFreshSignedUrl(storagePath: string): Promise<string | null> {
  // Tenta nos 2 buckets conhecidos (upload-document pode ter colocado em qualquer).
  for (const bucket of ["juriscalculo-documents", "case-documents"]) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 7200);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

export function DocumentValidation({ open, onOpenChange, documentId, onValidated }: Props) {
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [editedText, setEditedText] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningOcr, setRunningOcr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o documento + gera signed URL fresca toda vez que abre.
  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, mime_type, storage_path, arquivo_url, status, ocr_text, ocr_confidence, ocr_validated, page_count, error_message")
        .eq("id", documentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Documento não encontrado.");
        onOpenChange(false);
        return;
      }
      setDoc(data as DocRow);
      setEditedText((data as DocRow).ocr_text || "");
      setDirty(false);

      // Sempre gera signed URL fresca (evita URL expirada).
      if (data.storage_path) {
        const url = await getFreshSignedUrl(data.storage_path);
        setPdfUrl(url || (data as DocRow).arquivo_url);
      } else {
        setPdfUrl((data as DocRow).arquivo_url);
      }
    } catch (err) {
      logger.error("DocumentValidation load", err);
      toast.error("Erro ao carregar documento: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [documentId, onOpenChange]);

  useEffect(() => {
    if (open && documentId) load();
    return () => {
      if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    };
  }, [open, documentId, load]);

  // Se o OCR ainda não terminou, faz polling até atingir status terminal.
  // CRÍTICO: precisa do guard isTerminal pra evitar loop infinito quando
  // status='ocr_failed' AND ocr_text=null (caso real anterior ao fix).
  useEffect(() => {
    if (!open || !doc) return;
    // Se já está em terminal (ok ou erro), não pollar.
    if (isTerminal(doc.status)) return;
    const needsPoll = doc.status === "uploaded" || doc.status === "ocr_running" || !doc.ocr_text;
    if (!needsPoll) return;

    pollRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_name, mime_type, storage_path, arquivo_url, status, ocr_text, ocr_confidence, ocr_validated, page_count, error_message")
        .eq("id", doc.id)
        .maybeSingle();
      if (data) {
        setDoc(data as DocRow);
        // Se usuário ainda não editou, sincroniza com o OCR novo.
        if (!dirty) setEditedText((data as DocRow).ocr_text || "");
      }
    }, 3000);
    return () => {
      if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    };
  }, [open, doc, dirty]);

  // Auto-dispara OCR ao abrir o modal se ainda não tem texto extraído.
  // Inclusive quando o doc está `failed` porque o erro tipicamente é
  // "sem ocr_text" — nesse caso retentar OCR é exatamente o que queremos.
  useEffect(() => {
    if (!open || !doc || runningOcr) return;
    const hasText = !!(doc.ocr_text && doc.ocr_text.length >= 20);
    const isProcessing = doc.status === "ocr_running" || doc.status === "extracting";
    if (!hasText && !isProcessing) {
      runOcr();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id, doc?.status, doc?.ocr_text]);

  const runOcr = useCallback(async () => {
    if (!documentId) return;
    setRunningOcr(true);
    try {
      const { data, error } = await supabase.functions.invoke("ocr-document", {
        body: { document_id: documentId },
      });
      if (error) throw await unwrapFunctionsError(error);
      if (!data?.success) throw new Error(data?.error || "OCR falhou");
      toast.success(
        data.status === "ocr_running"
          ? "OCR iniciado. Aguarde — o texto aparece assim que concluir."
          : `OCR concluído: ${data.page_count ?? "?"} páginas, ${data.text_length ?? "?"} caracteres`
      );
      await load();
    } catch (err) {
      logger.error("OCR error", err);
      toast.error("Erro no OCR: " + (err as Error).message);
    } finally {
      setRunningOcr(false);
    }
  }, [documentId, load]);

  const submit = useCallback(async () => {
    if (!documentId) return;
    if (editedText.trim().length < 20) {
      toast.error("Texto OCR muito curto. Rode o OCR ou cole o texto manualmente.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: invokeErr } = await supabase.functions.invoke("extract-and-fill", {
        body: {
          document_id: documentId,
          ocr_text: editedText,
          mark_validated: true,
        },
      });
      if (invokeErr) throw await unwrapFunctionsError(invokeErr);

      // AUTO-FILL determinístico para cartao_ponto / ferias / faltas / holerite.
      // extract-and-fill cuida só do que precisa de LLM (rubricas).
      // Erro aqui é mostrado em toast, NÃO bloqueia o operador.
      try {
        const report = await autoFillFromOcr(documentId);
        if (report.ok) {
          const totalInserted = report.inserted.reduce((s, r) => s + r.count, 0);
          if (totalInserted > 0) {
            toast.success(
              `Parâmetros do cálculo atualizados (${totalInserted} registro${totalInserted === 1 ? "" : "s"}).`,
            );
          }
        } else {
          const msg = report.warnings[report.warnings.length - 1] ?? "erro desconhecido";
          toast.error(`Auto-preenchimento falhou: ${msg}`);
        }
      } catch (autoFillErr) {
        toast.error(
          "Auto-preenchimento falhou: " + ((autoFillErr as Error).message ?? "erro inesperado"),
        );
      }

      toast.success("Validação enviada.");
      onValidated?.();
      onOpenChange(false);
    } catch (err) {
      logger.error("Validation submit error", err);
      toast.error("Erro ao confirmar: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [documentId, editedText, onValidated, onOpenChange]);

  const resetToOcr = useCallback(() => {
    setEditedText(doc?.ocr_text || "");
    setDirty(false);
    toast.info("Texto restaurado para o OCR original.");
  }, [doc]);

  const downloadText = useCallback(() => {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc?.file_name || "documento"}.ocr.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [editedText, doc]);

  const statusBadge = () => {
    if (!doc) return null;
    if (doc.status === "failed") {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Erro: {doc.error_message?.slice(0, 40)}</Badge>;
    }
    if (doc.status === "ocr_running" || doc.status === "uploaded") {
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />OCR em andamento...</Badge>;
    }
    if (doc.ocr_validated) {
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Já validado</Badge>;
    }
    if (doc.status === "ocr_done" || doc.status === "ocr_partial" || doc.status === "extracted") {
      const conf = doc.ocr_confidence ? `${Math.round(doc.ocr_confidence * 100)}%` : "—";
      return (
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" />Aguardando validação · conf. {conf} · {doc.page_count || 0}p
        </Badge>
      );
    }
    return <Badge variant="outline">{doc.status}</Badge>;
  };

  const canSubmit = !!doc && editedText.trim().length >= 20 && !submitting && !runningOcr;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-4 gap-3">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Validação de OCR — {doc?.file_name || "..."}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compare o texto extraído (esquerda) com o documento original (direita).
            Edite o texto se necessário antes de confirmar.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-1">
            {statusBadge()}
            {dirty && <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400"><Pencil className="h-3 w-3" />editado</Badge>}
            <span className="text-xs text-muted-foreground ml-auto">{editedText.length.toLocaleString('pt-BR')} caracteres</span>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
            {/* ─── LADO ESQUERDO: OCR TEXT EDITÁVEL ─── */}
            <div className="flex flex-col min-h-0 border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Texto OCR (editável)
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={resetToOcr} disabled={!dirty}>
                    <RotateCcw className="h-3 w-3 mr-1" />Restaurar OCR
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={downloadText}>
                    <Download className="h-3 w-3 mr-1" />Baixar .txt
                  </Button>
                </div>
              </div>
              <Textarea
                value={editedText}
                onChange={(e) => { setEditedText(e.target.value); setDirty(true); }}
                placeholder={doc?.status === "uploaded" || doc?.status === "ocr_running"
                  ? "OCR em andamento... aguarde alguns segundos."
                  : "Texto OCR aparecerá aqui. Se estiver vazio, clique em 'Rodar OCR' abaixo."}
                className="flex-1 font-mono text-xs resize-none rounded-none border-0 focus-visible:ring-0"
                disabled={runningOcr}
              />
            </div>

            {/* ─── LADO DIREITO: PDF PREVIEW ─── */}
            <div className="flex flex-col min-h-0 border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Documento original
                </span>
                {pdfUrl && (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs underline text-muted-foreground hover:text-foreground">
                    Abrir em nova aba
                  </a>
                )}
              </div>
              <div className="flex-1 bg-muted/20 flex items-center justify-center overflow-hidden">
                {!pdfUrl ? (
                  <span className="text-sm text-muted-foreground">URL do documento indisponível.</span>
                ) : doc?.mime_type?.startsWith("image/") ? (
                  <img src={pdfUrl} alt={doc.file_name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <object data={pdfUrl} type="application/pdf" className="w-full h-full">
                    <iframe src={pdfUrl} title={doc?.file_name || "preview"} className="w-full h-full border-0" />
                  </object>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={runOcr}
            disabled={runningOcr || submitting || !doc}
          >
            {runningOcr ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />OCR rodando...</> : <><RotateCcw className="h-4 w-4 mr-1.5" />Rodar OCR novamente</>}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processando...</> : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Confirmar e Extrair Dados</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
