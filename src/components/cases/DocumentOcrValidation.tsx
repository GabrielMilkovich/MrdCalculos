/**
 * DocumentOcrValidation — validação de OCR dos documentos do caso.
 *
 * Usada no topo da aba Validação. Fluxo:
 *   1. Lista todos os documentos com OCR concluído.
 *   2. Usuário seleciona um → split view abre abaixo da lista.
 *   3. Lado esquerdo: texto OCR editável + botão "Exportar .csv".
 *   4. Lado direito: preview do documento original (PDF/imagem).
 *   5. Botão "Confirmar OCR" → marca `documents.ocr_validated=true`
 *      (NÃO dispara extract-and-fill; extração roda só na aba Cálculo).
 *   6. Quando todos validados → botão "Seguir para Cálculo" aparece e
 *      chama o callback `onGoToCalculo` (que dispara o extract-and-fill
 *      em batch antes de navegar).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  FileText,
  Download,
  Pencil,
  Eye,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { ExtractionTypeSelector } from "@/components/cases/data-extraction/ExtractionTypeSelector";
import {
  ExtractionTypeBadgeAndSelect,
  type DocForBadge,
} from "@/components/cases/data-extraction/ExtractionTypeBadgeAndSelect";
import { setTipoExtracao, type TipoExtracao } from "@/features/data-extraction";
import { DocumentPreview } from "@/components/cases/shared/DocumentPreview";
import { autoFillFromOcr } from "@/features/auto-fill/auto-fill-from-ocr";

interface DocRow {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  storage_path: string | null;
  arquivo_url: string | null;
  status: string | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_validated: boolean | null;
  page_count: number | null;
  error_message: string | null;
  tipo: string | null;
  tipo_extracao: TipoExtracao | null;
  // Auto-detect / auto-disparo (spec §5/§6)
  tipo_extracao_origem: "manual" | "auto" | null;
  tipo_extracao_confianca: "alta" | "media" | "baixa" | null;
  tipo_extracao_motivos: string[] | null;
  extracao_status: "pending" | "running" | "done" | "failed" | null;
  extracao_origem: "manual" | "auto" | null;
  validation_status: "pending" | "validated" | "rejected" | null;
  processing_started_at: string | null;
}

/** Apos quantos ms em 'ocr_running' consideramos o doc travado. */
const OCR_STALE_MS = 3 * 60 * 1000;

interface Props {
  caseId: string;
  /** Callback disparado quando o usuário clica no botão de avanço. */
  onGoToCalculo: () => Promise<void> | void;
  /** Disparado após qualquer mudança validada (Confirmar OCR, OCR executado, etc.). */
  onValidated?: () => void;
  /** Quando true, mostra dropdown "Tipo de extração" no card de cada documento.
   *  Usado pelo modo data_extraction. */
  showExtractionTypeSelector?: boolean;
  /** Quando true, usa ExtractionTypeBadgeAndSelect (com badge "sugerido"
   *  + "auto-extraído"). Implica showExtractionTypeSelector=true. Spec §5/§6. */
  showExtractionTypeBadges?: boolean;
  /** Texto do botão de avanço. Default: "Seguir para Cálculo". */
  advanceLabel?: string;
  /** Validador customizado para habilitar o botão de avanço. Recebe os docs
   *  e retorna true se pode avançar. Default: todos validados. */
  canAdvance?: (docs: DocRow[]) => boolean;
  /** Mensagem opcional exibida no rodapé quando `canAdvance` retorna false
   *  por motivo diferente de "OCR faltando". */
  advanceBlockedReason?: string;
  /** Quando true, mostra botão "Baixar CSV/ZIP" em cada doc com OCR validado.
   *  Usado pelo modo data_extraction (v4). */
  showDownloadButton?: boolean;
  /** Quando true, oculta o passo de "Confirmar leitura" por documento E o card
   *  de rodapé com gate "Confira X documento(s) restante(s)". Usado no modo
   *  data_extraction onde o avanço é noop — confirmação manual é burocracia
   *  inútil que prende o operador quando um doc dá erro (2026-06-01). */
  hideValidationGate?: boolean;
}

async function getFreshSignedUrl(storagePath: string): Promise<string | null> {
  for (const bucket of ["juriscalculo-documents", "case-documents"]) {
    // TTL 15min — URL deve durar só o suficiente pra renderizar o viewer.
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 900);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

/** Quebra o texto OCR em linhas e exporta como CSV (uma linha = uma célula). */
function exportTextAsCsv(text: string, fileName: string) {
  const lines = text.split(/\r?\n/);
  const csv = lines
    .map((line) => {
      // Escape: aspas duplas viram "" e a célula inteira fica entre aspas.
      const escaped = line.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName.replace(/\.[^.]+$/, "")}.ocr.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DocumentOcrValidation({
  caseId,
  onGoToCalculo,
  onValidated,
  showExtractionTypeSelector,
  showExtractionTypeBadges,
  showDownloadButton,
  advanceLabel,
  canAdvance,
  advanceBlockedReason,
  hideValidationGate,
}: Props) {
  const queryClient = useQueryClient();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** IDs que ja foram auto-retriados nesta sessao (evita loop). */
  const autoRetriedRef = useRef<Set<string>>(new Set());

  const selected = useMemo(() => docs.find((d) => d.id === selectedId) || null, [docs, selectedId]);

  // Carrega lista dos documentos do caso que interessam (tem OCR ou pelo menos foi upload).
  const loadDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, file_name, mime_type, storage_path, arquivo_url, status, ocr_text, ocr_confidence, ocr_validated, page_count, error_message, tipo, tipo_extracao, tipo_extracao_origem, tipo_extracao_confianca, tipo_extracao_motivos, extracao_status, extracao_origem, validation_status, processing_started_at")
      .eq("case_id", caseId)
      .order("uploaded_em", { ascending: true });
    if (error) {
      logger.error("loadDocs error", error);
      toast.error("Erro ao carregar documentos: " + error.message);
      return;
    }
    setDocs((data || []) as DocRow[]);
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    loadDocs();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [loadDocs]);

  // Poll até OCR terminar pros docs que ainda estão rodando.
  useEffect(() => {
    const anyRunning = docs.some((d) => d.status === "ocr_running" || (d.status === "uploaded" && !d.ocr_text));
    if (!anyRunning) return;
    pollRef.current = setTimeout(() => loadDocs(), 3000);
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [docs, loadDocs]);

  // Watchdog: detecta docs travados em 'ocr_running' ha > 3 min e
  // auto-retenta (uma vez por sessao, o backend eh idempotente).
  // Causa tipica: runtime do Edge Function killed mid-execucao sem
  // atualizar o status -> doc fica "OCR em andamento" pra sempre.
  useEffect(() => {
    const now = Date.now();
    for (const d of docs) {
      if (d.status !== "ocr_running") continue;
      if (!d.processing_started_at) continue;
      const elapsed = now - new Date(d.processing_started_at).getTime();
      if (elapsed < OCR_STALE_MS) continue;
      if (autoRetriedRef.current.has(d.id)) continue;
      autoRetriedRef.current.add(d.id);
      logger.warn(`[ocr-watchdog] doc parado em ocr_running, auto-retry`, { id: d.id, file_name: d.file_name, elapsed_s: Math.round(elapsed / 1000) });
      toast.info(`Processamento de "${d.file_name}" parecia travado. Retentando...`);
      // fire-and-forget — runOcr ja recarrega a lista ao terminar
      (async () => {
        try {
          await supabase.functions.invoke("ocr-document", {
            body: { document_id: d.id },
          });
          await loadDocs();
        } catch (err) {
          logger.warn("[ocr-watchdog] retry falhou:", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  // Quando seleciona um doc, carrega texto + gera signed URL fresca.
  useEffect(() => {
    if (!selected) {
      setEditedText("");
      setPdfUrl(null);
      setDirty(false);
      return;
    }
    setEditedText(selected.ocr_text || "");
    setDirty(false);
    (async () => {
      if (selected.storage_path) {
        const url = await getFreshSignedUrl(selected.storage_path);
        setPdfUrl(url || selected.arquivo_url);
      } else {
        setPdfUrl(selected.arquivo_url);
      }
    })();
  }, [selected?.id, selected?.ocr_text, selected?.storage_path, selected?.arquivo_url]);

  const runOcr = useCallback(async (docId: string) => {
    setSavingId(docId);
    try {
      const { data, error } = await supabase.functions.invoke("ocr-document", {
        body: { document_id: docId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao processar");
      toast.success(
        data.status === "ocr_running"
          ? "Processando documento. Aguarde a conclusão..."
          : `Documento processado: ${data.page_count ?? "?"} página(s)`
      );
      await loadDocs();
    } catch (err) {
      logger.error("runOcr error", err);
      toast.error("Erro ao processar: " + (err as Error).message);
    } finally {
      setSavingId(null);
    }
  }, [loadDocs]);

  const confirmOcr = useCallback(async () => {
    if (!selected) return;
    if (editedText.trim().length < 20) {
      toast.error("Texto muito curto. Processe o documento ou cole o texto manualmente.");
      return;
    }
    setSavingId(selected.id);
    try {
      // Se usuário editou, persiste o texto atualizado.
      const update: Record<string, unknown> = {
        ocr_validated: true,
        ocr_validated_at: new Date().toISOString(),
      };
      if (dirty) update.ocr_text = editedText;

      const { error } = await supabase
        .from("documents")
        .update(update)
        .eq("id", selected.id);
      if (error) throw error;

      toast.success("Leitura confirmada.");

      // AUTO-FILL: dispara parsers determinísticos e popula direto as
      // tabelas pjecalc_* dos 4 módulos da calculadora. Mostra toast de
      // erro EXPLÍCITO se falhar — operador precisa saber que o cálculo
      // não foi preenchido (vs. acreditar que está pronto e zerar a HE).
      void autoFillFromOcr(selected.id)
        .then((report) => {
          // Invalida queries dos 4 módulos da calculadora para que a UI
          // reflita imediatamente os dados recém-inseridos.
          queryClient.invalidateQueries({ queryKey: ["pjecalc_ponto_diario"] });
          queryClient.invalidateQueries({
            queryKey: ["pjecalc_apuracao_diaria"],
          });
          queryClient.invalidateQueries({ queryKey: ["pjecalc_faltas"] });
          queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias"] });
          queryClient.invalidateQueries({ queryKey: ["pjecalc_historico"] });
          queryClient.invalidateQueries({
            queryKey: ["pjecalc_historico_ocorrencias"],
          });

          if (!report.ok) {
            const msg = report.warnings[report.warnings.length - 1] ?? "erro desconhecido";
            toast.error(`Auto-preenchimento falhou: ${msg}`);
            logger.warn("autoFillFromOcr falhou", report);
            return;
          }
          const totalInserted = report.inserted.reduce(
            (s, r) => s + r.count,
            0,
          );
          if (totalInserted > 0) {
            toast.success(
              `Parâmetros do cálculo atualizados (${totalInserted} registro${
                totalInserted === 1 ? "" : "s"
              }).`,
            );
          }
        })
        .catch((e) => {
          toast.error(
            "Auto-preenchimento falhou: " + ((e as Error).message ?? "erro inesperado"),
          );
          logger.warn("autoFillFromOcr throw", e);
        });

      // PR-5 (RAG cego): dispara chunk-and-embed pra popular document_chunks.
      // Antes: só UPDATE ocr_validated=true; ninguém invocava a edge function;
      // tabela ficava com 0 rows e features RAG (extract-facts-rag,
      // semantic-search) retornavam vazio. Falha aqui é silenciosa pra não
      // bloquear o operador — botão admin de backfill cobre o re-tente.
      void supabase.functions
        .invoke("chunk-and-embed", {
          body: {
            document_id: selected.id,
            extracted_text: dirty ? editedText : selected.ocr_text,
          },
        })
        .then(({ error: chunkErr }) => {
          if (chunkErr) {
            logger.warn("chunk-and-embed após confirmOcr falhou", chunkErr);
          }
        })
        .catch((e) => {
          logger.warn("chunk-and-embed throw após confirmOcr", e);
        });

      setDirty(false);
      await loadDocs();
      onValidated?.();
    } catch (err) {
      logger.error("confirmOcr error", err);
      toast.error("Erro ao confirmar: " + (err as Error).message);
    } finally {
      setSavingId(null);
    }
  }, [selected, editedText, dirty, loadDocs, onValidated]);

  const validatedCount = docs.filter((d) => d.ocr_validated || (d.ocr_text && d.ocr_text.length > 20)).length;
  const ocrReadyCount = docs.filter((d) => d.ocr_text && (d.ocr_text.length >= 20)).length;
  const allValidated = docs.length > 0 && validatedCount === docs.length;

  const handleGoToCalculo = useCallback(async () => {
    setAdvancing(true);
    try {
      await onGoToCalculo();
    } finally {
      setAdvancing(false);
    }
  }, [onGoToCalculo]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos...
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhum documento ainda. Envie arquivos na aba Documentos primeiro.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Conferência dos dados
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{validatedCount}/{docs.length} conferidos</span>
              {allValidated && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Tudo conferido
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 gap-2">
            {docs.map((doc) => {
              const hasOcr = !!(doc.ocr_text && doc.ocr_text.length >= 20);
              const isSelected = doc.id === selectedId;
              const onSelect = () => setSelectedId(doc.id);
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={onSelect}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect();
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition cursor-pointer ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.file_name || "sem nome"}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.tipo || "outro"}
                      {doc.page_count ? ` · ${doc.page_count} pg` : ""}
                    </div>
                  </div>
                  {(showExtractionTypeSelector || showExtractionTypeBadges) && hasOcr && (
                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                      {showExtractionTypeBadges ? (
                        <ExtractionTypeBadgeAndSelect
                          doc={doc as DocForBadge}
                          showDownloadButton={showDownloadButton}
                          onChange={async (novo) => {
                            try {
                              await setTipoExtracao(doc.id, novo);
                              await loadDocs();
                              onValidated?.();
                            } catch (err) {
                              toast.error("Erro ao salvar tipo: " + (err as Error).message);
                            }
                          }}
                        />
                      ) : (
                        <ExtractionTypeSelector
                          value={doc.tipo_extracao ?? "nao_extrair"}
                          onChange={async (v) => {
                            try {
                              await setTipoExtracao(doc.id, v);
                              await loadDocs();
                              onValidated?.();
                            } catch (err) {
                              toast.error("Erro ao salvar tipo: " + (err as Error).message);
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                  {doc.ocr_validated || hasOcr ? (
                    <Badge variant="default" className="gap-1 bg-green-600 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Conferido
                    </Badge>
                  ) : doc.status === "ocr_running" ? (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processando...
                    </Badge>
                  ) : doc.status === "failed" || doc.status === "ocr_failed" ? (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="h-3 w-3" /> Erro
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processando
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0 gap-2">
            <CardTitle className="text-sm truncate">{selected.file_name}</CardTitle>
            <div className="flex items-center gap-2">
              {selected.ocr_validated && (
                <Badge variant="default" className="gap-1 bg-green-600 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Conferido
                </Badge>
              )}
              {dirty && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400 text-[10px]">
                  <Pencil className="h-3 w-3" /> editado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ minHeight: "500px" }}>
              {/* Lado esquerdo: OCR text editável */}
              <div className="flex flex-col border rounded-md min-h-[500px]">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Texto do documento
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setEditedText(selected.ocr_text || "");
                        setDirty(false);
                        toast.info("Texto restaurado.");
                      }}
                      disabled={!dirty}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => exportTextAsCsv(editedText, selected.file_name || "documento")}
                      disabled={editedText.trim().length < 1}
                    >
                      <Download className="h-3 w-3 mr-1" /> Exportar .csv
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={editedText}
                  onChange={(e) => { setEditedText(e.target.value); setDirty(true); }}
                  placeholder={selected.ocr_text ? "" : "Documento ainda não processado. Clique em 'Processar documento' abaixo."}
                  className="flex-1 font-mono text-xs resize-none rounded-none border-0 focus-visible:ring-0"
                />
              </div>

              {/* Lado direito: PDF preview (componente compartilhado) */}
              <DocumentPreview
                storagePath={selected.storage_path}
                arquivoUrl={selected.arquivo_url}
                mimeType={selected.mime_type}
                fileName={selected.file_name}
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runOcr(selected.id)}
                disabled={savingId === selected.id}
              >
                {savingId === selected.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                {selected.ocr_text ? "Tentar novamente" : "Processar documento"}
              </Button>
              <div className="flex-1" />
              {!hideValidationGate && !selected.ocr_validated && selected.ocr_text && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={confirmOcr}
                  disabled={savingId === selected.id || editedText.trim().length < 20}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Confirmar leitura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé: avanço (default "Seguir para Cálculo", customizável via props).
          Quando hideValidationGate=true, o card inteiro é omitido — modo
          data_extraction tem avanço noop, então o gate é só burocracia. */}
      {!hideValidationGate && (() => {
        const canGoNext = canAdvance ? canAdvance(docs) : allValidated;
        // Se canAdvance retornou false mas allValidated é true, usar
        // advanceBlockedReason; senão fallback pra texto padrão de OCR.
        const blockedByCustom = !canGoNext && allValidated && advanceBlockedReason;
        const label = advanceLabel ?? "Seguir para Cálculo";
        return (
          <Card className={canGoNext ? "border-primary/40 bg-primary/5" : "border-dashed"}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {canGoNext
                    ? "Todos os documentos foram conferidos."
                    : blockedByCustom
                      ? advanceBlockedReason
                      : allValidated
                        ? "Todos os documentos conferidos!"
                        : `Confira ${docs.length - validatedCount} documento(s) restante(s) para seguir.`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {canGoNext
                    ? `${validatedCount} de ${docs.length} documentos preparados.`
                    : blockedByCustom
                      ? "Resolva a pendência acima para liberar o botão."
                      : `${validatedCount} de ${docs.length} documentos preparados. Abra cada um acima, revise e confirme.`}
                </div>
              </div>
              <Button onClick={handleGoToCalculo} disabled={!canGoNext || advancing}>
                {advancing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1" />
                )}
                {label}
              </Button>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
