// =====================================================
// COMPONENTE: GERENCIADOR DE DOCUMENTOS DO CASO
// Upload drag-drop, filtros, reprocessamento, classificação
// =====================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// syncFromValidation removed (deleted module)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Image,
  FileType,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Database,
  Trash2,
  Eye,
  MoreVertical,
  Filter,
  Search,
  FolderUp,
  Clock,
  Percent,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";

interface Document {
  id: string;
  tipo: string;
  file_name?: string;
  arquivo_url: string | null;
  storage_path?: string;
  uploaded_em: string;
  status?: string;
  processing_status?: string;
  page_count?: number;
  ocr_confidence?: number;
  error_message?: string;
  retry_count?: number;
  metadata?: {
    processing_progress?: number;
    processing_message?: string;
    chunks_total?: number;
    chunks_processed?: number;
    chunks_created?: number;
    [key: string]: unknown;
  };
}

interface DocumentsManagerProps {
  caseId: string;
  documents: Document[];
  onDocumentsChange: () => void;
  /** Navega para a aba Validação (preview + confirmar OCR por documento). */
  onGoToValidation?: () => void;
}

const docTypeOptions = [
  { value: "holerite", label: "Holerite", icon: "💰" },
  { value: "ctps", label: "CTPS", icon: "📘" },
  { value: "contrato", label: "Contrato", icon: "📄" },
  { value: "cct", label: "Convenção Coletiva", icon: "📋" },
  { value: "cartao_ponto", label: "Cartão de Ponto", icon: "⏰" },
  { value: "fgts", label: "Extrato FGTS", icon: "🏦" },
  { value: "ficha_financeira", label: "Ficha Financeira", icon: "📊" },
  { value: "peticao", label: "Petição", icon: "⚖️" },
  { value: "sentenca", label: "Sentença", icon: "📜" },
  { value: "trct", label: "TRCT", icon: "📝" },
  { value: "outro", label: "Outro", icon: "📎" },
];

const statusConfig: Record<string, { label: string; icon: typeof Loader2; color: string; bgColor: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
  queued: { label: "Na fila", icon: Clock, color: "text-blue-500", bgColor: "bg-blue-50" },
  uploaded: { label: "Enviado", icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
  downloading: { label: "Baixando", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  ocr_pending: { label: "Aguardando OCR", icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  ocr: { label: "OCR em andamento", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  ocr_running: { label: "OCR em andamento", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  ocr_done: { label: "OCR concluído", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  ocr_failed: { label: "OCR falhou", icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  chunking: { label: "Dividindo em chunks", icon: Loader2, color: "text-purple-600", bgColor: "bg-purple-100" },
  chunk_pending: { label: "Aguardando indexação", icon: Database, color: "text-purple-600", bgColor: "bg-purple-100" },
  embedding: { label: "Gerando embeddings", icon: Loader2, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  embedded: { label: "Indexado", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  embedded_partial: { label: "Parcialmente indexado", icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  failed: { label: "Erro", icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  retrying: { label: "Tentando novamente", icon: Loader2, color: "text-orange-600", bgColor: "bg-orange-100" },
  processing: { label: "Processando", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  extracting: { label: "Extraindo com IA", icon: Loader2, color: "text-purple-600", bgColor: "bg-purple-100" },
  extracted: { label: "Extraído", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  completed: { label: "Concluído", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
};

export function DocumentsManager({
  caseId,
  documents,
  onDocumentsChange,
  onGoToValidation,
}: DocumentsManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("outro");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Batch processing state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<Record<string, "pending" | "processing" | "done" | "error">>({});
  const batchAbortRef = useRef(false);

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    if (filterType !== "all" && doc.tipo !== filterType) return false;
    const effectiveStatus = (doc.processing_status || doc.status || "uploaded") as string;
    if (filterStatus !== "all" && effectiveStatus !== filterStatus) return false;
    if (searchQuery && !doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  // Detectar tipo de documento automaticamente pelo nome do arquivo
  const detectDocType = (fileName: string): string => {
    const name = fileName.toLowerCase();
    
    // TRCT / Termo de Rescisão
    if (name.includes("trct") || name.includes("rescis") || name.includes("termo_rescis") || name.includes("termo de rescis")) {
      return "trct";
    }
    // Holerite / Contracheque
    if (name.includes("holerite") || name.includes("contracheque") || name.includes("recibo_pagamento") || name.includes("folha_pagamento") || name.includes("demonstrativo")) {
      return "holerite";
    }
    // CTPS
    if (name.includes("ctps") || name.includes("carteira de trabalho")) {
      return "ctps";
    }
    // Cartão de ponto
    if (name.includes("ponto") || name.includes("cartao_ponto") || name.includes("registro_ponto") || name.includes("jornada") || name.includes("frequencia")) {
      return "cartao_ponto";
    }
    // Petição
    if (name.includes("peticao") || name.includes("petição") || name.includes("inicial") || name.includes("contestacao") || name.includes("contestação") || name.includes("recurso")) {
      return "peticao";
    }
    // Sentença
    if (name.includes("sentenca") || name.includes("sentença") || name.includes("acordao") || name.includes("acórdão") || name.includes("decisao") || name.includes("decisão") || name.includes("despacho")) {
      return "sentenca";
    }
    return "outro";
  };

  // Upload de arquivos
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!caseId || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase();

        // Validar tipo de arquivo
        const validExtensions = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "doc", "docx"];
        if (!validExtensions.includes(fileExt || "")) {
          toast.error(`Tipo não suportado: ${file.name}`);
          continue;
        }

        // Detectar tipo automaticamente pelo nome do arquivo
        const autoDetectedType = detectDocType(file.name);

        // Upload direto do cliente (RLS do bucket garante ownership pelo user_id no path)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Sessão expirada. Faça login novamente.");
          continue;
        }

        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${user.id}/${caseId}/${timestamp}_${sanitizedFilename}`;

        const { error: uploadError } = await supabase.storage
          .from("juriscalculo-documents")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          logger.error("Storage upload error", uploadError);
          toast.error(`Erro ao enviar: ${file.name}`);
          continue;
        }

        const { data: signedUrlData } = await supabase.storage
          .from("juriscalculo-documents")
          .createSignedUrl(storagePath, 3600);

        const { data: docData, error: docError } = await supabase
          .from("documents")
          .insert({
            case_id: caseId,
            owner_user_id: user.id,
            file_name: file.name,
            mime_type: file.type,
            storage_path: storagePath,
            tipo: autoDetectedType as "peticao" | "trct" | "holerite" | "cartao_ponto" | "sentenca" | "outro" | "ctps" | "contrato" | "cct" | "fgts" | "ficha_financeira",
            status: "uploaded",
            arquivo_url: signedUrlData?.signedUrl ?? null,
            metadata: {
              original_name: file.name,
              size: file.size,
              uploaded_at: new Date().toISOString(),
            },
          })
          .select("id")
          .single();

        if (docError || !docData) {
          logger.error("Document insert error", docError);
          await supabase.storage.from("juriscalculo-documents").remove([storagePath]);
          toast.error(`Erro ao registrar: ${file.name}`);
          continue;
        }

        // Auto-dispara OCR e ESPERA o background terminar antes do próximo
        // upload. Sem polling, `await invoke` retorna em ~500ms (handler
        // responde 200 e dispara EdgeRuntime.waitUntil), e N invokes em
        // sequência viram N background tasks competindo pelo pool de
        // isolates do Supabase — todas killed silently, deixando docs
        // travados em 'ocr_running'.
        try {
          const invokePromise = supabase.functions.invoke("ocr-document", {
            body: { document_id: docData.id },
          });
          // Não aguardamos a Promise (não vai resolver em tempo útil pra
          // documentos grandes); detectamos completion via polling do status.
          invokePromise.catch((err) => {
            logger.warn(`auto-OCR invoke falhou para ${file.name}:`, err);
          });

          // Polling: até 4 minutos, checando a cada 3s. Evita disparar
          // próximo OCR enquanto este ainda está em background.
          const MAX_POLLS = 80;
          const POLL_MS = 3000;
          for (let p = 0; p < MAX_POLLS; p++) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            const { data: status } = await supabase
              .from("documents")
              .select("status")
              .eq("id", docData.id)
              .single();
            const s = status?.status;
            if (s !== "ocr_running" && s !== "uploaded" && s !== "ocr_pending") {
              break; // 'done' / 'failed' / 'ocr_failed' — pode prosseguir
            }
          }
        } catch (err) {
          logger.warn(`auto-OCR trigger falhou para ${file.name}:`, err);
        }

        successCount++;
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (successCount > 0) {
        onDocumentsChange();
        toast.success(`${successCount} documento(s) enviado(s). OCR rodando automaticamente...`);
      }
    } catch (error) {
      logger.error("Upload error", error);
      toast.error("Erro ao enviar documento: " + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [caseId, selectedType, onDocumentsChange]);

  // Processar documento (pipeline Mistral OCR + chunking + embeddings)
  // Usa `process-document-mistral` que orquestra:
  //   1. ocr-document (Mistral OCR com split de PDF para cartões grandes)
  //   2. chunk-and-embed (OpenAI embeddings)
  const processDocument = useCallback(async (documentId: string) => {
    setProcessingDocId(documentId);
    toast.info("Iniciando: OCR Mistral → Chunking → Embeddings...");

    try {
      const { data, error } = await supabase.functions.invoke("process-document-mistral", {
        body: { document_id: documentId },
      });

      if (error) throw error;

      const pageCount = data?.ocr?.page_count ?? "?";
      const chunksCreated = data?.chunking?.chunks_created ?? 0;
      const provider = data?.ocr?.provider ?? "mistral";
      if (data?.partial) {
        toast.warning(`OCR concluído (${pageCount} pg, ${provider}), mas chunking falhou. Revise manualmente.`);
      } else {
        toast.success(`Documento processado: ${pageCount} pg via ${provider}, ${chunksCreated} chunks.`);
      }
      onDocumentsChange();
    } catch (err) {
      logger.error("Processing error", err);
      toast.error("Erro no processamento: " + (err as Error).message);
    } finally {
      setProcessingDocId(null);
    }
  }, [onDocumentsChange]);

  // Extrair dados e preencher automaticamente os campos do cálculo
  // extractAndFill legado removido — fluxo agora é único: botão FileCheck2
  // abre DocumentValidation (split view) que gerencia OCR + validação + extração
  // estruturada via ocr-document + extract-and-fill com ocr_text_override.

  // Processar todos os pendentes — sequencial com progresso visual
  const processAllPending = useCallback(async () => {
    const pendingDocs = documents.filter(d => 
      !d.status || d.status === "uploaded" || d.status === "failed"
    );

    if (pendingDocs.length === 0) {
      toast.info("Nenhum documento pendente para processar.");
      return;
    }

    const docIds = pendingDocs.map(d => d.id);
    const initialResults: Record<string, "pending" | "processing" | "done" | "error"> = {};
    docIds.forEach(id => { initialResults[id] = "pending"; });

    setBatchQueue(docIds);
    setBatchCurrentIndex(0);
    setBatchResults(initialResults);
    setIsBatchProcessing(true);
    batchAbortRef.current = false;

    let successCount = 0;
    let errorCount = 0;

    // Process documents ONE AT A TIME to avoid memory exhaustion on Edge Functions
    for (let i = 0; i < docIds.length; i++) {
      if (batchAbortRef.current) break;

      const docId = docIds[i];
      setBatchCurrentIndex(i);
      setBatchResults(prev => ({ ...prev, [docId]: "processing" }));
      setProcessingDocId(docId);

      try {
        // Roda SOMENTE OCR. A extração estruturada (auto-preenchimento do
        // pjecalc) NÃO é disparada aqui — o usuário precisa abrir o split
        // view, revisar o texto e clicar "Confirmar e Extrair Dados" para
        // cada documento quando estiver pronto.
        const { data: docCheck } = await supabase
          .from("documents")
          .select("ocr_text, status")
          .eq("id", docId)
          .maybeSingle();

        // Tipo: ocr_text é coluna adicionada por migration recente, ainda
        // não regenerada em src/integrations/supabase/types.ts. Tipamos
        // explicitamente em vez de `as any`.
        const docCheckTyped = docCheck as { ocr_text: string | null; status: string } | null;
        const hasOcr = docCheckTyped &&
                       typeof docCheckTyped.ocr_text === "string" &&
                       docCheckTyped.ocr_text.length >= 50;

        if (hasOcr) {
          // Já tem OCR — nada a fazer nesse doc.
          setBatchResults(prev => ({ ...prev, [docId]: "done" }));
          successCount++;
          onDocumentsChange();
          continue;
        }

        const { error: ocrErr } = await supabase.functions.invoke("ocr-document", {
          body: { document_id: docId },
        });
        if (ocrErr) throw ocrErr;
      } catch (err) {
        logger.error(`OCR trigger error for ${docId}`, err);
        setBatchResults(prev => ({ ...prev, [docId]: "error" }));
        errorCount++;
        continue;
      }

      // Aguarda OCR concluir (status = ocr_done / ocr_partial) ou falhar.
      const pollInterval = 3000;
      const maxPolls = 100; // ~5 min max por documento (OCR longos são comuns)
      let finished = false;

      for (let poll = 0; poll < maxPolls && !finished; poll++) {
        await new Promise(r => setTimeout(r, pollInterval));

        const { data: docStatus } = await supabase
          .from("documents")
          .select("id, status, ocr_text")
          .eq("id", docId)
          .maybeSingle();

        if (!docStatus) continue;

        // ocr_text não está no schema gerado (migration nova). Cast explícito.
        const docStatusTyped = docStatus as { id: string; status: string; ocr_text: string | null };
        const s = docStatusTyped.status;
        const ocrLen = (docStatusTyped.ocr_text ?? "").length;
        if (s === "ocr_done" || s === "ocr_partial" || (s === "extracted" && ocrLen >= 50)) {
          setBatchResults(prev => ({ ...prev, [docId]: "done" }));
          successCount++;
          finished = true;
        } else if (s === "failed") {
          setBatchResults(prev => ({ ...prev, [docId]: "error" }));
          errorCount++;
          finished = true;
        }
      }

      if (!finished) {
        setBatchResults(prev => ({ ...prev, [docId]: "error" }));
        errorCount++;
      }

      onDocumentsChange();
    }

    setProcessingDocId(null);
    setIsBatchProcessing(false);

    if (errorCount === 0) {
      toast.success(`✅ OCR concluído em ${successCount} documento(s). Abra cada um no split view para revisar e extrair.`);
    } else {
      toast.warning(`OCR: ${successCount} ok, ${errorCount} com erro.`);
    }
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    onDocumentsChange();
  }, [documents, caseId, onDocumentsChange, queryClient]);

  const cancelBatchProcessing = useCallback(() => {
    batchAbortRef.current = true;
    toast.info("Cancelando processamento em lote...");
  }, []);

  // Recuperar documentos travados em ocr_running > 5 min via RPC.
  // Existe um pg_cron rodando a cada 1 min, mas o usuário pode querer
  // forçar a recuperação imediata sem esperar o tick.
  const recoverStaleDocs = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('recover_stale_ocr_documents');
      if (error) throw error;
      const recovered = (data ?? []) as Array<{ id: string; file_name: string; stale_seconds: number }>;
      if (recovered.length === 0) {
        toast.info('Nenhum documento travado encontrado.');
      } else {
        toast.success(`${recovered.length} documento(s) recuperado(s). Re-clique "Processar" para tentar novamente.`);
        onDocumentsChange();
      }
    } catch (err) {
      toast.error('Erro ao recuperar travados: ' + (err as Error).message);
    }
  }, [onDocumentsChange]);

  // Atualizar tipo de documento
  const updateDocType = useCallback(async (documentId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        // tipo é string-livre na coluna; cast desnecessário
        .update({ tipo: newType })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Tipo atualizado");
      onDocumentsChange();
    } catch (err) {
      toast.error("Erro ao atualizar tipo");
    }
  }, [onDocumentsChange]);

  // Excluir documento
  const deleteDocument = useCallback(async (documentId: string, storagePath?: string) => {
    try {
      // Excluir chunks primeiro
      await supabase.from("document_chunks").delete().eq("document_id", documentId);
      await supabase.from("doc_chunks").delete().eq("document_id", documentId);

      // Excluir documento
      const { error } = await supabase.from("documents").delete().eq("id", documentId);
      if (error) throw error;

      // Tentar excluir do storage
      if (storagePath) {
        await supabase.storage.from("juriscalculo-documents").remove([storagePath]);
      }

      toast.success("Documento excluído");
      onDocumentsChange();
    } catch (err) {
      toast.error("Erro ao excluir: " + (err as Error).message);
    }
  }, [onDocumentsChange]);

  // Detecta documentos potencialmente travados (status running mas sem
  // mudança há >3 min). Usado pra mostrar botão "Recuperar travados".
  const staleCount = documents.filter((d) => {
    const s = (d.processing_status || d.status || 'uploaded') as string;
    if (s !== 'ocr_running' && s !== 'processing') return false;
    const startedAt = (d as { processing_started_at?: string }).processing_started_at;
    if (!startedAt) return false;
    const ageMs = Date.now() - new Date(startedAt).getTime();
    return ageMs > 3 * 60 * 1000;
  }).length;

  // Estatísticas
  const stats = {
    total: documents.length,
    pending: documents.filter(d => {
      const s = (d.processing_status || d.status || "uploaded") as string;
      return s === "uploaded" || s === "pending" || s === "queued";
    }).length,
    processing: documents.filter(d => {
      const s = (d.processing_status || d.status || "uploaded") as string;
      return ["downloading", "ocr", "ocr_running", "chunking", "embedding", "processing"].includes(s);
    }).length,
    indexed: documents.filter(d => {
      const s = (d.processing_status || d.status || "uploaded") as string;
      return s === "completed" || s === "embedded";
    }).length,
    failed: documents.filter(d => {
      const s = (d.processing_status || d.status || "uploaded") as string;
      return s === "failed" || s === "error";
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone com Drag & Drop */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className={`p-4 rounded-full ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
              <FolderUp className={`h-10 w-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isDragging ? "Solte os arquivos aqui" : "Arraste documentos ou clique para selecionar"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, DOCX, JPG, PNG, WEBP • Máx. 50MB por arquivo
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {docTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
            </div>
          </div>
          
          {isUploading && (
            <div className="mt-6 space-y-2 max-w-md mx-auto">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Processing Progress Panel */}
      {isBatchProcessing && batchQueue.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processando documentos
              </CardTitle>
              <Button variant="outline" size="sm" onClick={cancelBatchProcessing}>
                Cancelar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-medium text-foreground">
                  {Object.values(batchResults).filter(s => s === "done" || s === "error").length} / {batchQueue.length}
                </span>
              </div>
              <Progress
                value={
                  (Object.values(batchResults).filter(s => s === "done" || s === "error").length / batchQueue.length) * 100
                }
              />
              <p className="text-xs text-muted-foreground">
                {Math.round(
                  (Object.values(batchResults).filter(s => s === "done" || s === "error").length / batchQueue.length) * 100
                )}% concluído
              </p>
            </div>

            {/* Per-document status */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {batchQueue.map((docId, idx) => {
                const doc = documents.find(d => d.id === docId);
                const status = batchResults[docId] || "pending";
                return (
                  <div
                    key={docId}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      status === "processing"
                        ? "bg-primary/10 border-primary/30"
                        : status === "done"
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : status === "error"
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center">
                        {status === "processing" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : status === "done" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : status === "error" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[250px]">
                        {doc?.file_name || `Documento ${idx + 1}`}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        status === "processing"
                          ? "text-primary border-primary/40"
                          : status === "done"
                          ? "text-green-700 border-green-300"
                          : status === "error"
                          ? "text-destructive border-destructive/40"
                          : "text-muted-foreground"
                      }`}
                    >
                      {status === "processing"
                        ? "OCR + Indexação..."
                        : status === "done"
                        ? "Concluído ✓"
                        : status === "error"
                        ? "Erro"
                        : "Na fila"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas e Filtros */}
      {documents.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Stats Cards */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.total}</span>
              <span className="text-muted-foreground text-sm">total</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{stats.pending}</span>
                <span className="text-sm">pendentes</span>
              </div>
            )}
            {stats.indexed > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{stats.indexed}</span>
                <span className="text-sm">indexados</span>
              </div>
            )}
            {stats.failed > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">{stats.failed}</span>
                <span className="text-sm">erros</span>
              </div>
            )}
            {staleCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={recoverStaleDocs}
                className="gap-1.5 h-8 text-xs border-amber-500/40 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-100"
                title={`${staleCount} documento(s) parecem travados há mais de 3 minutos. Recovery automático roda a cada 1 min via cron, mas você pode forçar agora.`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Recuperar travados ({staleCount})
              </Button>
            )}
          </div>

          {/* Actions & Filters */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {docTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="uploaded">Enviado</SelectItem>
                <SelectItem value="embedded">Indexado</SelectItem>
                <SelectItem value="failed">Erro</SelectItem>
              </SelectContent>
            </Select>
            {stats.pending > 0 && (
              <Button onClick={processAllPending} variant="default" className="gap-2" disabled={isBatchProcessing}>
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isBatchProcessing ? "Rodando OCR..." : `Rodar OCR de todos (${stats.pending})`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Banner: OCR concluído em pelo menos 1 doc → sugere ir para Validação */}
      {onGoToValidation && documents.some(d => {
        const s = (d.processing_status || d.status || "uploaded") as string;
        return ["ocr_done", "ocr_partial", "extracted"].includes(s);
      }) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-medium">OCR concluído em {documents.filter(d => {
                const s = (d.processing_status || d.status || "uploaded") as string;
                return ["ocr_done", "ocr_partial", "extracted"].includes(s);
              }).length} documento(s)</div>
              <div className="text-xs text-muted-foreground">
                Revise o texto extraído na aba Validação antes de seguir para o cálculo.
              </div>
            </div>
            <Button size="sm" onClick={onGoToValidation}>
              Ir para Validação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos em Tabela */}
      {filteredDocuments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Páginas</TableHead>
                  <TableHead className="text-center">Confiança OCR</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const effectiveStatus = (doc.processing_status || doc.status || "uploaded") as string;
                  const status = statusConfig[effectiveStatus] || statusConfig.uploaded;
                  const StatusIcon = status.icon;
                  const isProcessing = processingDocId === doc.id;
                  const docType = docTypeOptions.find(o => o.value === doc.tipo);

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {doc.file_name || doc.arquivo_url?.split('/').pop() || "Documento"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.uploaded_em).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={doc.tipo}
                          onValueChange={(value) => updateDocType(doc.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue>
                              <span className="flex items-center gap-1">
                                <span>{docType?.icon}</span>
                                <span className="text-sm">{docType?.label || doc.tipo}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {docTypeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${status.bgColor} ${status.color} border-0`}>
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <StatusIcon className={`h-3 w-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                          )}
                          {isProcessing ? "Processando..." : status.label}
                        </Badge>
                        {doc.metadata?.processing_message && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={doc.metadata.processing_message}>
                            {doc.metadata.processing_message}
                          </p>
                        )}
                        {typeof doc.metadata?.processing_progress === "number" && doc.metadata.processing_progress > 0 && doc.metadata.processing_progress < 100 && (
                          <div className="mt-2 max-w-[220px]">
                            <Progress value={doc.metadata.processing_progress} />
                          </div>
                        )}
                        {doc.error_message && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-[150px]" title={doc.error_message}>
                            {doc.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.page_count ? (
                          <span className="font-medium">{doc.page_count}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.ocr_confidence ? (
                          <div className="flex items-center justify-center gap-1">
                            <Percent className="h-3 w-3 text-muted-foreground" />
                            <span className={`font-medium ${
                              doc.ocr_confidence >= 0.9 ? "text-green-600" :
                              doc.ocr_confidence >= 0.7 ? "text-yellow-600" : "text-destructive"
                            }`}>
                              {Math.round(doc.ocr_confidence * 100)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.arquivo_url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver documento</TooltipContent>
                            </Tooltip>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover o documento e todos os dados extraídos (chunks, embeddings).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDocument(doc.id, doc.storage_path)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum documento</h3>
            <p className="text-muted-foreground">
              Faça upload de documentos para iniciar o processamento
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
