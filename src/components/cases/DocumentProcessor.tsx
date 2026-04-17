// =====================================================
// COMPONENTE: PROCESSADOR DE DOCUMENTOS
// Upload, OCR, Indexação e Status de Processamento
// =====================================================

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  Search,
  RefreshCw,
  Trash2,
  Eye,
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
  arquivo_url: string | null;
  uploaded_em: string;
  processing_status?: string;
  processing_error?: string;
  chunk_count?: number;
  page_count?: number;
}

interface DocumentProcessorProps {
  caseId: string;
  documents: Document[];
  onDocumentsChange: () => void;
}

const docTypeLabels: Record<string, string> = {
  peticao: "Petição",
  trct: "TRCT",
  holerite: "Holerite",
  cartao_ponto: "Cartão de Ponto",
  sentenca: "Sentença",
  outro: "Outro",
};

const docTypeIcons: Record<string, typeof FileText> = {
  peticao: FileText,
  trct: FileType,
  holerite: FileText,
  cartao_ponto: FileText,
  sentenca: FileText,
  outro: FileType,
};

const statusConfig: Record<string, { label: string; icon: typeof Loader2; color: string }> = {
  pending: { label: "Pendente", icon: AlertTriangle, color: "text-yellow-500" },
  processing: { label: "Processando...", icon: Loader2, color: "text-blue-500" },
  completed: { label: "Indexado", icon: CheckCircle, color: "text-green-500" },
  error: { label: "Erro", icon: XCircle, color: "text-destructive" },
};

export function DocumentProcessor({ 
  caseId, 
  documents, 
  onDocumentsChange 
}: DocumentProcessorProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("outro");

  // Upload de arquivos
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!caseId || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const fileName = `${caseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Validar tipo de arquivo
        const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];
        if (!validExtensions.includes(fileExt || '')) {
          toast.error(`Tipo de arquivo não suportado: ${fileExt}`);
          continue;
        }

        // Upload para Storage
        const { error: uploadError } = await supabase.storage
          .from("case-documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Obter URL
        const { data: { publicUrl } } = supabase.storage
          .from("case-documents")
          .getPublicUrl(fileName);

        // Criar registro do documento
        const { error: dbError } = await supabase
          .from("documents")
          .insert([{
            case_id: caseId,
            tipo: selectedType as "peticao" | "trct" | "holerite" | "cartao_ponto" | "sentenca" | "outro",
            arquivo_url: publicUrl,
            processing_status: "pending",
          }]);

        if (dbError) throw dbError;

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      onDocumentsChange();
      toast.success(`${files.length} documento(s) enviado(s)! Clique em "Processar" para indexar.`);
    } catch (error) {
      logger.error("Upload error", error);
      toast.error("Erro ao enviar documento: " + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [caseId, selectedType, onDocumentsChange]);

  // Processar documento individual (OCR + Chunking + Embeddings)
  const processDocument = useCallback(async (documentId: string) => {
    setProcessingDocId(documentId);
    toast.info("Iniciando processamento com OCR e indexação vetorial...");

    try {
      const { data, error } = await supabase.functions.invoke("process-document", {
        body: { document_id: documentId },
      });

      if (error) throw error;

      toast.success(`Documento processado: ${data.chunks_created} chunks criados`);
      onDocumentsChange();
    } catch (err) {
      logger.error("Processing error", err);
      toast.error("Erro no processamento: " + (err as Error).message);
    } finally {
      setProcessingDocId(null);
    }
  }, [onDocumentsChange]);

  // Processar todos os documentos pendentes
  const processAllPending = useCallback(async () => {
    const pendingDocs = documents.filter(d => 
      d.processing_status === "pending" || d.processing_status === "error"
    );

    if (pendingDocs.length === 0) {
      toast.info("Nenhum documento pendente para processar.");
      return;
    }

    toast.info(`Processando ${pendingDocs.length} documento(s)...`);

    for (const doc of pendingDocs) {
      await processDocument(doc.id);
    }

    toast.success("Todos os documentos foram processados!");
  }, [documents, processDocument]);

  // Excluir documento
  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      // Primeiro excluir chunks
      await supabase
        .from("doc_chunks")
        .delete()
        .eq("document_id", documentId);

      // Depois excluir documento
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Documento excluído");
      onDocumentsChange();
    } catch (err) {
      toast.error("Erro ao excluir: " + (err as Error).message);
    }
  }, [onDocumentsChange]);

  // Estatísticas
  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.processing_status === "pending").length,
    processing: documents.filter(d => d.processing_status === "processing").length,
    completed: documents.filter(d => d.processing_status === "completed").length,
    error: documents.filter(d => d.processing_status === "error").length,
    totalChunks: documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0),
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return Image;
    }
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(docTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivos (PDF, DOCX, Imagens)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                disabled={isUploading}
                className="cursor-pointer"
              />
            </div>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>• Formatos aceitos: PDF, DOCX, JPG, PNG, WEBP</p>
            <p>• PDFs escaneados e imagens serão processados com OCR (reconhecimento de texto)</p>
            <p>• Os documentos serão divididos em chunks e indexados para busca semântica</p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {documents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Indexados</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-destructive">{stats.error}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chunks</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalChunks}</p>
                </div>
                <Database className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documentos Anexados</CardTitle>
            {stats.pending > 0 && (
              <Button onClick={processAllPending} className="gap-2">
                <Cpu className="h-4 w-4" />
                Processar Todos ({stats.pending})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {documents.map((doc) => {
                const status = statusConfig[doc.processing_status || 'pending'];
                const StatusIcon = status.icon;
                const FileIcon = doc.arquivo_url ? getFileIcon(doc.arquivo_url) : FileText;
                const isProcessing = processingDocId === doc.id;

                return (
                  <div key={doc.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{docTypeLabels[doc.tipo] || doc.tipo}</p>
                          <Badge variant="outline" className={status.color}>
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <StatusIcon className={`h-3 w-3 mr-1 ${doc.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                            )}
                            {isProcessing ? "Processando..." : status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{new Date(doc.uploaded_em).toLocaleDateString("pt-BR")}</span>
                          {doc.page_count && (
                            <span>{doc.page_count} página(s)</span>
                          )}
                          {doc.chunk_count && doc.chunk_count > 0 && (
                            <span className="text-primary">{doc.chunk_count} chunks</span>
                          )}
                        </div>
                        {doc.processing_error && (
                          <p className="text-sm text-destructive mt-1">{doc.processing_error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.arquivo_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" asChild>
                              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver documento</TooltipContent>
                        </Tooltip>
                      )}
                      
                      {(doc.processing_status === "pending" || doc.processing_status === "error") && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => processDocument(doc.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Cpu className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Processar com OCR</TooltipContent>
                        </Tooltip>
                      )}

                      {doc.processing_status === "completed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => processDocument(doc.id)}
                              disabled={isProcessing}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reprocessar</TooltipContent>
                        </Tooltip>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá excluir o documento e todos os chunks indexados.
                              Os fatos extraídos deste documento serão mantidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDocument(doc.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {documents.length === 0 && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum documento anexado
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Faça upload de documentos PDF, DOCX ou imagens. 
              O sistema irá processar com OCR e indexar para busca semântica.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Button for RAG Extraction */}
      {stats.completed > 0 && (
        <div className="flex justify-center">
          <Button
            size="lg"
            className="gap-2"
            onClick={async () => {
              toast.info("Iniciando extração com busca semântica (RAG)...");
              try {
                const { data, error } = await supabase.functions.invoke("extract-facts-rag", {
                  body: { case_id: caseId },
                });
                if (error) throw error;
                
                queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
                
                toast.success(
                  `Extração RAG concluída: ${data.facts_valid} fato(s) extraído(s) de ${data.chunks_analyzed} chunks`
                );

                if (data.fatos_nao_encontrados?.length > 0) {
                  toast.warning(
                    `Fatos não encontrados: ${data.fatos_nao_encontrados.join(', ')}`
                  );
                }
              } catch (err) {
                toast.error("Erro na extração: " + (err as Error).message);
              }
            }}
          >
            <Search className="h-5 w-5" />
            Extrair Fatos com Busca Semântica (RAG)
          </Button>
        </div>
      )}
    </div>
  );
}
