// =====================================================
// COMPONENTE: VALIDAÇÃO DE FATOS COM SPLIT VIEW
// Visualização lado-a-lado: Formulário | Documento
// =====================================================

import { useEffect, useRef, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Calculator,
  Sparkles,
  Lock,
  Unlock,
  ExternalLink,
  Download,
  Loader2,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  HelpCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

// =====================================================
// TYPES
// =====================================================

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  origem: string;
  confianca: number | null;
  confirmado: boolean;
  citacao?: string | null;
  pagina?: number | null;
  status_pericial?: "incontroverso" | "controvertido" | null;
  justificativa_validacao?: string | null;
  prova_qualidade?: string | null;
}

interface Document {
  id: string;
  tipo: string;
  arquivo_url: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  uploaded_em: string;
}

type FactEvidence = {
  document_id: string;
  page_number: number | null;
  quote: string;
  confidence: number | null;
};

interface FactValidationViewProps {
  caseId: string;
  facts: Fact[];
  documents: Document[];
  onFactsChange?: () => void;
  onValidationComplete?: () => void;
  /** Trigger externo para abrir o modal de criação de fato crítico (atalho vindo da aba Cálculo) */
  createCriticalKeyRequest?: string | null;
  createCriticalNonce?: number;
}

// Fatos críticos que DEVEM ser confirmados antes do cálculo
const CRITICAL_FACTS = [
  "data_admissao",
  "data_demissao",
  "salario_base",
  "salario_mensal",
  "jornada_contratual",
];

// Labels para tipos de fatos
const tipoLabels: Record<string, string> = {
  data: "Data",
  moeda: "Moeda",
  numero: "Número",
  texto: "Texto",
  boolean: "Sim/Não",
};

// Labels para origem dos fatos
const origemLabels: Record<string, string> = {
  ia_extracao: "IA",
  usuario: "Manual",
  documento: "Documento",
};

// Labels para chaves de fatos
const chaveLabels: Record<string, string> = {
  data_admissao: "Data de Admissão",
  data_demissao: "Data de Demissão",
  salario_base: "Salário Base",
  salario_mensal: "Salário Mensal",
  jornada_contratual: "Jornada Contratual",
  jornada_alegada: "Jornada Alegada",
  intervalo_intrajornada: "Intervalo Intrajornada",
  adicional_insalubridade: "Adicional Insalubridade",
  adicional_periculosidade: "Adicional Periculosidade",
  horas_extras_mensais: "Horas Extras (Média Mensal)",
  cargo: "Cargo",
  funcao: "Função",
  motivo_demissao: "Motivo Demissão",
  aviso_previo: "Aviso Prévio",
  ferias_vencidas: "Férias Vencidas",
  fgts_depositado: "FGTS Depositado",
};

// =====================================================
// COMPONENTE: DETALHES DO CÁLCULO DE SALÁRIO VIA FGTS
// =====================================================

function FGTSSalaryCalculationDetails({ citacao, caseId }: { citacao: string; caseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  
  // Extract chunk_id from citation (format: "CHUNK_ID:xxx\n...")
  const chunkIdMatch = citacao.match(/CHUNK_ID:\s*([a-f0-9-]+)/i);
  const chunkId = chunkIdMatch ? chunkIdMatch[1] : null;

  // Fetch the original document chunk content
  const { data: chunkData } = useQuery({
    queryKey: ["fgts-chunk", chunkId],
    queryFn: async () => {
      if (!chunkId) return null;
      const { data, error } = await supabase
        .from("document_chunks")
        .select(`
          id,
          content,
          page_number,
          document_id,
          documents (
            id,
            arquivo_url,
            tipo
          )
        `)
        .eq("id", chunkId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!chunkId,
  });

  // Parse the citation to extract deposit details
  // Format: "Calculado automaticamente a partir de X depósitos FGTS (8% do salário). Depósitos: 2024-01: R$ 160.00 → R$ 2000.00; ..."
  const parseDeposits = useMemo(() => {
    const depositsMatch = citacao.match(/Depósitos:\s*(.+)$/);
    if (!depositsMatch) return [];
    
    const depositsStr = depositsMatch[1];
    const depositEntries = depositsStr.split(";").map(entry => entry.trim()).filter(Boolean);
    
    return depositEntries.map(entry => {
      // Format: "2024-01: R$ 160.00 → R$ 2000.00"
      const match = entry.match(/([^:]+):\s*R\$\s*([\d.,]+)\s*→\s*R\$\s*([\d.,]+)/);
      if (match) {
        return {
          competencia: match[1].trim(),
          deposito: parseFloat(match[2].replace(".", "").replace(",", ".")),
          salario: parseFloat(match[3].replace(".", "").replace(",", ".")),
        };
      }
      return null;
    }).filter(Boolean) as Array<{ competencia: string; deposito: number; salario: number }>;
  }, [citacao]);

  const countMatch = citacao.match(/(\d+)\s+depósitos FGTS/);
  const depositCount = countMatch ? parseInt(countMatch[1]) : parseDeposits.length;

  // Highlight deposit lines in the document content
  const highlightedContent = useMemo(() => {
    if (!chunkData?.content) return null;
    const content = chunkData.content;
    
    // Split content into lines and highlight deposit lines
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const isDepositLine = /115-DEPOSITO|DEPOSITO.*\d{4}/i.test(line);
      const isValueLine = /R\$\s*[\d.,]+/.test(line);
      return {
        text: line,
        isDeposit: isDepositLine,
        hasValue: isValueLine && !isDepositLine,
        key: idx,
      };
    });
  }, [chunkData?.content]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left group">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Calculado via Extrato FGTS
              </span>
              <Badge variant="secondary" className="text-xs">
                {depositCount} depósitos
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs group-hover:text-foreground transition-colors">
                {isOpen ? "Ocultar" : "Ver detalhes"}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          {/* Formula Explanation */}
          <div className="p-2 bg-background/60 rounded border border-border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong>Fórmula:</strong> Depósito FGTS ÷ 0.08 = Salário Bruto
                <br />
                <span className="italic">O FGTS corresponde a 8% do salário mensal bruto.</span>
              </div>
            </div>
          </div>

          {/* Deposits Table */}
          {parseDeposits.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Depósitos utilizados:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parseDeposits.map((dep, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-background/40 rounded text-xs"
                  >
                    <span className="text-muted-foreground font-mono">
                      {dep.competencia}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        <DollarSign className="h-3 w-3 inline mr-0.5" />
                        {dep.deposito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        R$ {dep.salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average Calculation */}
          {parseDeposits.length > 0 && (
            <div className="p-2 bg-primary/10 rounded border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  Média calculada:
                </span>
                <span className="text-sm font-bold text-primary">
                  R$ {(parseDeposits.reduce((sum, d) => sum + d.salario, 0) / parseDeposits.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Original Document Content Toggle */}
          {chunkData && (
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => setShowDocument(!showDocument)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{showDocument ? "Ocultar trecho do documento" : "Ver trecho do documento original"}</span>
                {chunkData.page_number && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Página {chunkData.page_number}
                  </Badge>
                )}
              </button>
              
              {showDocument && highlightedContent && (
                <div className="mt-2 p-3 bg-muted/30 rounded border border-border max-h-60 overflow-y-auto">
                  <div className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {highlightedContent.map((line) => (
                      <div
                        key={line.key}
                        className={cn(
                          "py-0.5",
                          line.isDeposit && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-medium px-1 rounded",
                          line.hasValue && !line.isDeposit && "text-muted-foreground"
                        )}
                      >
                        {line.text || "\u00A0"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function FactValidationView({
  caseId,
  facts,
  documents,
  onFactsChange,
  onValidationComplete,
  createCriticalKeyRequest,
  createCriticalNonce,
}: FactValidationViewProps) {
  const queryClient = useQueryClient();
  const highlightTimeoutRef = useRef<number | null>(null);
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editForm, setEditForm] = useState({ valor: "", tipo: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ chave: "", valor: "", tipo: "texto" });

  // Pericial status modal
  const [pericialDialogOpen, setPericialDialogOpen] = useState(false);
  const [pericialFact, setPericialFact] = useState<Fact | null>(null);
  const [pericialForm, setPericialForm] = useState<{
    status: "incontroverso" | "controvertido";
    justificativa: string;
    prova_qualidade: string;
  }>({ status: "incontroverso", justificativa: "", prova_qualidade: "forte" });

  // Feedback visual após confirmar fatos críticos
  const [highlightFactId, setHighlightFactId] = useState<string | null>(null);
  const [criticalCounterPulseNonce, setCriticalCounterPulseNonce] = useState(0);

  // Atalho externo: abre o modal já com a chave solicitada
  useEffect(() => {
    if (!createCriticalNonce) return;
    if (!createCriticalKeyRequest) return;
    setCreateForm((p) => ({ ...p, chave: createCriticalKeyRequest }));
    setCreateOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createCriticalNonce]);

  // Separar fatos por status
  const pendingFacts = facts.filter((f) => !f.confirmado);
  const confirmedFacts = facts.filter((f) => f.confirmado);

  // Identificar fatos críticos não confirmados
  const unconfirmedCriticalFacts = useMemo(() => {
    return facts.filter(
      (f) => CRITICAL_FACTS.includes(f.chave) && !f.confirmado
    );
  }, [facts]);

  const confirmedCriticalCount = useMemo(() => {
    return facts.filter((f) => CRITICAL_FACTS.includes(f.chave) && f.confirmado)
      .length;
  }, [facts]);

  const criticalProgress = useMemo(() => {
    const total = CRITICAL_FACTS.length;
    if (!total) return 0;
    return Math.round((confirmedCriticalCount / total) * 100);
  }, [confirmedCriticalCount]);

  const missingCriticalKeys = useMemo(() => {
    const keysInCase = new Set(facts.map((f) => f.chave));
    return CRITICAL_FACTS.filter((k) => !keysInCase.has(k));
  }, [facts]);

  // Verificar se pode calcular (todos críticos confirmados)
  const canCalculate = useMemo(() => {
    const criticalFactsInCase = facts.filter((f) =>
      CRITICAL_FACTS.includes(f.chave)
    );
    return (
      criticalFactsInCase.length > 0 &&
      criticalFactsInCase.every((f) => f.confirmado)
    );
  }, [facts]);

  // =====================================================
  // MUTATIONS
  // =====================================================

  const confirmMutation = useMutation({
    mutationFn: async ({
      factId,
      confirmed,
    }: {
      factId: string;
      confirmed: boolean;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("facts")
        .update({
          confirmado: confirmed,
          confirmado_por: confirmed ? session?.session?.user.id : null,
          confirmado_em: confirmed ? new Date().toISOString() : null,
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      onFactsChange?.();

      // Se confirmou um fato crítico, anima contador e destaca o item temporariamente
      if (variables.confirmed) {
        const wasCritical = facts.some(
          (f) => f.id === variables.factId && CRITICAL_FACTS.includes(f.chave)
        );

        if (wasCritical) {
          setCriticalCounterPulseNonce((n) => n + 1);
          setHighlightFactId(variables.factId);
        }
      }
    },
  });

  // Limpa destaque temporário
  useEffect(() => {
    if (!highlightFactId) return;

    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightFactId(null);
      highlightTimeoutRef.current = null;
    }, 1200);

    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [highlightFactId]);

  const editMutation = useMutation({
    mutationFn: async ({
      factId,
      valor,
      tipo,
    }: {
      factId: string;
      valor: string;
      tipo: string;
    }) => {
      const { error } = await supabase
        .from("facts")
        .update({
          valor,
          tipo: tipo as "data" | "moeda" | "numero" | "texto" | "boolean",
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      setEditingFact(null);
      toast.success("Fato atualizado!");
      onFactsChange?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (factId: string) => {
      const { error } = await supabase.from("facts").delete().eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Fato removido!");
      onFactsChange?.();
    },
  });

  const createCriticalFactMutation = useMutation({
    mutationFn: async ({ chave, valor, tipo }: { chave: string; valor: string; tipo: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase.from("facts").insert({
        case_id: caseId,
        chave,
        valor,
        tipo: tipo as "data" | "moeda" | "numero" | "texto" | "boolean",
        origem: "usuario",
        // Como é inserção manual do usuário, já nasce confirmado.
        confirmado: true,
        confirmado_por: userId ?? null,
        confirmado_em: new Date().toISOString(),
        status_pericial: "incontroverso",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Fato crítico adicionado e confirmado!");
      setCreateOpen(false);
      setCreateForm({ chave: "", valor: "", tipo: "texto" });
      onFactsChange?.();
    },
    onError: (e) => {
      logger.error("Não foi possível adicionar o fato", e);
      toast.error("Não foi possível adicionar o fato.");
    },
  });

  // Pericial status update mutation
  const updatePericialMutation = useMutation({
    mutationFn: async ({
      factId,
      status,
      justificativa,
      prova_qualidade,
    }: {
      factId: string;
      status: "incontroverso" | "controvertido";
      justificativa: string;
      prova_qualidade: string;
    }) => {
      const { error } = await supabase
        .from("facts")
        .update({
          status_pericial: status,
          justificativa_validacao: justificativa,
          prova_qualidade,
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Status pericial atualizado!");
      setPericialDialogOpen(false);
      setPericialFact(null);
      onFactsChange?.();
    },
    onError: (e) => {
      logger.error("Erro ao atualizar status pericial", e);
      toast.error("Erro ao atualizar status pericial.");
    },
  });

  const openCreateForFirstMissing = () => {
    const nextKey = missingCriticalKeys[0] || "";
    setCreateForm((prev) => ({ ...prev, chave: prev.chave || nextKey }));
    setCreateOpen(true);
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const STORAGE_BUCKET = "juriscalculo-documents";

  const signedUrlMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "get-signed-document-url",
        {
          body: {
            document_id: documentId,
            expires_in: 3600,
          },
        }
      );

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("URL assinada não retornada");
      return data as { signedUrl: string; fileName?: string | null; mimeType?: string | null };
    },
  });

  const getFreshSignedUrlFromStorage = async (documentId: string) => {
    const baseDoc = documents.find((d) => d.id === documentId);
    if (!baseDoc?.storage_path) return null;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      // TTL 15min — URL viva só pelo handler de click.
      .createSignedUrl(baseDoc.storage_path, 900);

    if (error || !data?.signedUrl) return null;

    return {
      signedUrl: data.signedUrl,
      fileName: baseDoc.file_name ?? null,
      mimeType: baseDoc.mime_type ?? null,
    };
  };

  const getBestSignedUrl = async (documentId: string) => {
    try {
      return await signedUrlMutation.mutateAsync(documentId);
    } catch (edgeError) {
      logger.error("Falha ao gerar URL via função de backend", edgeError);
      const storageSigned = await getFreshSignedUrlFromStorage(documentId);
      if (storageSigned) {
        toast.warning("Usando rota alternativa para gerar o preview.");
        return storageSigned;
      }
      throw edgeError;
    }
  };

  const getConfidenceConfig = (confianca: number | null) => {
    if (!confianca || confianca === 0)
      return {
        color: "bg-gray-100 text-gray-600 border-gray-300",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        icon: AlertTriangle,
        label: "Sem dados",
      };
    if (confianca >= 0.8)
      return {
        color: "bg-green-100 text-green-700 border-green-300",
        bgColor: "bg-green-50/50",
        borderColor: "border-green-200",
        icon: ShieldCheck,
        label: "Alta confiança",
      };
    if (confianca >= 0.5)
      return {
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        bgColor: "bg-yellow-50/50",
        borderColor: "border-yellow-200",
        icon: AlertTriangle,
        label: "Verificar",
      };
    return {
      color: "bg-red-100 text-red-700 border-red-300",
      bgColor: "bg-red-50/50",
      borderColor: "border-red-200",
      icon: ShieldAlert,
      label: "Baixa confiança",
    };
  };

  const isCritical = (chave: string) => CRITICAL_FACTS.includes(chave);

  const buildPreviewUrl = (signedUrl: string, mimeType?: string | null, pageNumber?: number | null) => {
    // Para PDFs, o fragment #page=N geralmente funciona no viewer do navegador
    if (mimeType?.includes("pdf") && pageNumber && pageNumber > 0) {
      return `${signedUrl}#page=${pageNumber}`;
    }
    return signedUrl;
  };

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const fetchPreviewBlobFromBackend = async (documentId: string, mimeType?: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Sessão inválida para preview");

    let response: Response;
    try {
      response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signed-document-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document_id: documentId, mode: "blob" }),
        cache: "no-store",
      });
    } catch (networkErr) {
      logger.error("Network error fetching preview blob", networkErr, { documentId });
      throw new Error("Falha de rede ao buscar pré-visualização do documento");
    }

    if (!response.ok) {
      throw new Error(`Backend preview failed (${response.status})`);
    }

    try {
      const blob = await response.blob();
      const type = mimeType || blob.type || "application/pdf";
      return new Blob([blob], { type });
    } catch (parseErr) {
      logger.error("Failed to read preview blob body", parseErr, { documentId });
      throw new Error("Erro ao ler corpo do documento");
    }
  };

  const fetchAndCreateBlobUrl = async (documentId: string, signedUrl: string, mimeType?: string | null) => {
    setBlobLoading(true);
    try {
      // Caminho principal (definitivo): baixar bytes via backend para evitar bloqueio em iframe
      let finalBlob: Blob;
      try {
        finalBlob = await fetchPreviewBlobFromBackend(documentId, mimeType);
      } catch (backendErr) {
        logger.error("Backend blob preview failed, trying signed URL", backendErr);
        const response = await fetch(signedUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Signed URL fetch failed");
        const blob = await response.blob();
        const type = mimeType || blob.type || "application/pdf";
        finalBlob = new Blob([blob], { type });
      }

      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const url = URL.createObjectURL(finalBlob);
      setBlobUrl(url);
    } catch (e) {
      logger.error("Blob preview failed", e);
      setBlobUrl(null);
    } finally {
      setBlobLoading(false);
    }
  };

  const handleViewDocument = async (fact: Fact) => {
    setSelectedFact(fact);
    setSelectedDoc(null);
    setSelectedDocUrl(null);
    setSelectedPageNumber(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    // 1) Tentar encontrar evidência (documento + página) para este fato
    let evidence: FactEvidence | null = null;
    try {
      const { data, error } = await supabase
        .from("fact_evidences")
        .select("document_id,page_number,quote,confidence")
        .eq("case_id", caseId)
        .eq("fact_id", fact.id)
        .order("confidence", { ascending: false, nullsFirst: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        evidence = data[0] as FactEvidence;
      }
    } catch (e) {
      logger.error("Erro ao buscar fact_evidences", e);
    }

    // 2) Se não achou via fact_evidences, tentar via chunk_id na citação
    let documentId = evidence?.document_id;
    let pageNumber = evidence?.page_number ?? null;

    if (!documentId && fact.citacao) {
      const chunkMatch = fact.citacao.match(/CHUNK_ID:\s*([a-f0-9-]+)/i);
      if (chunkMatch) {
        try {
          const { data: chunkData } = await supabase
            .from("document_chunks")
            .select("document_id, page_number")
            .eq("id", chunkMatch[1])
            .single();
          if (chunkData) {
            documentId = chunkData.document_id;
            pageNumber = chunkData.page_number ?? pageNumber;
          }
        } catch (e) {
          logger.error("Chunk lookup failed", e);
        }
      }
    }

    // 3) Fallback: usar fact.pagina ou primeiro documento
    if (!documentId) {
      documentId = documents[0]?.id;
    }
    if (!pageNumber && fact.pagina) {
      pageNumber = fact.pagina;
    }

    if (!documentId) {
      toast.error("Nenhum documento disponível para visualização.");
      return;
    }

    setSelectedPageNumber(pageNumber);

    const sourceDoc = documents.find((d) => d.id === documentId) ?? null;
    if (sourceDoc) setSelectedDoc(sourceDoc);

    // 4) Sempre tentar URL assinada fresca (função de backend -> storage fallback)
    try {
      const res = await getBestSignedUrl(documentId);
      const resolvedMimeType = res.mimeType ?? sourceDoc?.mime_type ?? null;
      const previewUrl = buildPreviewUrl(res.signedUrl, resolvedMimeType, pageNumber);
      setSelectedDocUrl(previewUrl);
      setSelectedDoc(
        sourceDoc
          ? {
              ...sourceDoc,
              arquivo_url: res.signedUrl,
              file_name: res.fileName ?? sourceDoc.file_name,
              mime_type: resolvedMimeType,
            }
          : {
              id: documentId,
              tipo: "outro",
              arquivo_url: res.signedUrl,
              uploaded_em: new Date().toISOString(),
              file_name: res.fileName ?? null,
              mime_type: resolvedMimeType,
            }
      );
      await fetchAndCreateBlobUrl(documentId, res.signedUrl, resolvedMimeType);
      return;
    } catch (e) {
      logger.error("Erro ao criar blob URL", e);
    }

    // 5) Último fallback: URL já salva no documento (pode estar expirada)
    if (sourceDoc?.arquivo_url) {
      setSelectedDoc(sourceDoc);
      setSelectedDocUrl(buildPreviewUrl(sourceDoc.arquivo_url, sourceDoc.mime_type ?? null, pageNumber));
      await fetchAndCreateBlobUrl(documentId, sourceDoc.arquivo_url, sourceDoc.mime_type);
      toast.warning("Usando link existente do documento. Se falhar, abra em nova aba.");
      return;
    }

    toast.error("Não foi possível abrir o documento.");
  };

  const handleEdit = (fact: Fact) => {
    setEditingFact(fact);
    setEditForm({ valor: fact.valor, tipo: fact.tipo });
  };

  const handleSaveEdit = () => {
    if (editingFact) {
      editMutation.mutate({
        factId: editingFact.id,
        valor: editForm.valor,
        tipo: editForm.tipo,
      });
    }
  };

  // =====================================================
  // RENDER FACT ROW
  // =====================================================

  const renderFactRow = (fact: Fact) => {
    const confidence = getConfidenceConfig(fact.confianca);
    const critical = isCritical(fact.chave);
    const ConfidenceIcon = confidence.icon;
    const isHighlighted = highlightFactId === fact.id;

    return (
      <div
        key={fact.id}
        className={`p-4 rounded-lg border-2 transition-all ${confidence.bgColor} ${confidence.borderColor} ${
          critical ? "ring-2 ring-primary/20" : ""
        } ${
          isHighlighted
            ? "ring-2 ring-primary/40 shadow-sm animate-enter"
            : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Fact Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {chaveLabels[fact.chave] || fact.chave}
              </span>
              {critical && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive" className="text-xs">
                        Crítico
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este fato deve ser confirmado antes do cálculo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline" className="text-xs">
                {tipoLabels[fact.tipo] || fact.tipo}
              </Badge>
            </div>

            <div className="text-lg font-bold text-foreground">
              {fact.chave === "salario_mensal" && fact.tipo === "moeda" 
                ? `R$ ${parseFloat(fact.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : fact.valor
              }
            </div>

            {/* Special: FGTS Salary Calculation Details */}
            {fact.chave === "salario_mensal" && fact.citacao?.includes("depósitos FGTS") && (
              <FGTSSalaryCalculationDetails citacao={fact.citacao} caseId={caseId} />
            )}

            {/* Regular Citation Display (skip for FGTS calculated salary) */}
            {fact.citacao && !(fact.chave === "salario_mensal" && fact.citacao?.includes("depósitos FGTS")) && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md border border-muted">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Citação Original
                      {fact.pagina && (
                        <span className="ml-2 text-primary">(Página {fact.pagina})</span>
                      )}
                    </p>
                    <p className="text-sm italic text-foreground/80">
                      "{fact.citacao}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm flex-wrap">
              <Badge className={confidence.color}>
                <ConfidenceIcon className="h-3 w-3 mr-1" />
                {fact.confianca ? `${Math.round(fact.confianca * 100)}%` : "N/A"}
              </Badge>
              <Badge variant="secondary">
                {origemLabels[fact.origem] || fact.origem}
              </Badge>
              {fact.confirmado && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmado
                </Badge>
              )}
              {/* Pericial Status Badge */}
              {fact.status_pericial && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    fact.status_pericial === "incontroverso"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  )}
                >
                  <Scale className="h-3 w-3" />
                  {fact.status_pericial === "incontroverso" ? "Incontroverso" : "Controvertido"}
                </Badge>
              )}
              {/* Prova quality badge */}
              {fact.prova_qualidade && (
                <Badge variant="outline" className="text-xs">
                  Prova: {fact.prova_qualidade}
                </Badge>
              )}
            </div>
            {/* Justificativa display if controvertido */}
            {fact.status_pericial === "controvertido" && fact.justificativa_validacao && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300">
                  <strong>Justificativa:</strong> {fact.justificativa_validacao}
                </p>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            {!fact.confirmado ? (
              <Button
                size="sm"
                onClick={() =>
                  confirmMutation.mutate({ factId: fact.id, confirmed: true })
                }
                disabled={confirmMutation.isPending}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Confirmar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  confirmMutation.mutate({ factId: fact.id, confirmed: false })
                }
                disabled={confirmMutation.isPending}
                className="gap-1"
              >
                <Clock className="h-4 w-4" />
                Reverter
              </Button>
            )}

            <div className="flex gap-1 flex-wrap">
              {/* Pericial Status Button */}
              {fact.confirmado && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={fact.status_pericial ? "outline" : "secondary"}
                        onClick={() => {
                          setPericialFact(fact);
                          setPericialForm({
                            status: fact.status_pericial || "incontroverso",
                            justificativa: fact.justificativa_validacao || "",
                            prova_qualidade: fact.prova_qualidade || "forte",
                          });
                          setPericialDialogOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Scale className="h-4 w-4" />
                        {!fact.status_pericial && "Qualificar"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Definir status pericial: Incontroverso ou Controvertido</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {documents.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewDocument(fact)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(fact)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(fact.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (facts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum fato extraído ainda.
            <br />
            Faça upload de documentos e use a IA para extrair fatos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Banner */}
      <Card
        className={
          canCalculate
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {canCalculate ? (
                <Unlock className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    canCalculate ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {canCalculate
                    ? "✓ Conferência completa — Pronto para calcular"
                    : `⚠ ${unconfirmedCriticalFacts.length} fato(s) crítico(s) pendente(s)`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {canCalculate
                    ? "Todos os fatos críticos foram confirmados"
                    : "Confirme os fatos marcados como 'Crítico' para liberar o cálculo"}
                </p>

                {!canCalculate && missingCriticalKeys.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Faltando no caso: {missingCriticalKeys.map((k) => chaveLabels[k] || k).join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!canCalculate && missingCriticalKeys.length > 0 && (
                <Button variant="outline" onClick={openCreateForFirstMissing}>
                  Adicionar fato crítico
                </Button>
              )}
              <Button disabled={!canCalculate} onClick={onValidationComplete} className="gap-2">
                <Calculator className="h-4 w-4" />
                {canCalculate ? "Prosseguir para Cálculo" : "Bloqueado"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-foreground">{facts.length}</p>
            <p className="text-sm text-muted-foreground">Total de Fatos</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {confirmedFacts.length}
            </p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {pendingFacts.length}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {facts.filter((f) => (f.confianca || 0) < 0.5).length}
            </p>
            <p className="text-sm text-muted-foreground">Baixa Confiança</p>
          </CardContent>
        </Card>
      </div>

      {/* Split View: Facts | Document */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Facts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fatos Extraídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Seção fixa (topo) - Fatos críticos */}
            <div className="mb-4 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">Fatos críticos</div>
                  <div className="text-xs text-muted-foreground">
                    <span
                      key={criticalCounterPulseNonce}
                      className="inline-flex items-baseline gap-1 animate-enter"
                    >
                      <span className="font-medium text-foreground">
                        {confirmedCriticalCount}
                      </span>
                      <span>/</span>
                      <span>{CRITICAL_FACTS.length}</span>
                      <span>confirmados</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingCriticalKeys.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={openCreateForFirstMissing}
                    >
                      Adicionar crítico
                    </Button>
                  )}
                  {unconfirmedCriticalFacts.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const first = unconfirmedCriticalFacts[0];
                        if (first) void handleViewDocument(first);
                      }}
                    >
                      Revisar pendentes
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <Progress value={criticalProgress} />
              </div>

              {(missingCriticalKeys.length > 0 || unconfirmedCriticalFacts.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingCriticalKeys.map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreateForm((p) => ({ ...p, chave: k }));
                        setCreateOpen(true);
                      }}
                      title="Adicionar e confirmar este fato crítico"
                    >
                      + {chaveLabels[k] || k}
                    </Button>
                  ))}

                  {unconfirmedCriticalFacts.map((f) => (
                    <Button
                      key={f.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleViewDocument(f)}
                      title="Abrir evidência e confirmar"
                    >
                      {chaveLabels[f.chave] || f.chave}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {/* Critical Facts First */}
                {unconfirmedCriticalFacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      Fatos Críticos Pendentes
                    </div>
                    {unconfirmedCriticalFacts.map(renderFactRow)}
                    <Separator className="my-4" />
                  </>
                )}

                {/* Other Pending Facts */}
                {pendingFacts.filter((f) => !CRITICAL_FACTS.includes(f.chave))
                  .length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium">
                      <Clock className="h-4 w-4" />
                      Outros Fatos Pendentes
                    </div>
                    {pendingFacts
                      .filter((f) => !CRITICAL_FACTS.includes(f.chave))
                      .map(renderFactRow)}
                    <Separator className="my-4" />
                  </>
                )}

                {/* Confirmed Facts */}
                {confirmedFacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Fatos Confirmados
                    </div>
                    {confirmedFacts.map(renderFactRow)}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visualização do Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDocUrl ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    {selectedFact ? (
                      <span>
                        Documento para: <span className="text-foreground font-medium">{chaveLabels[selectedFact.chave] || selectedFact.chave}</span>
                      </span>
                    ) : (
                      <span>Documento selecionado</span>
                    )}
                    {selectedDoc?.file_name ? (
                      <span className="ml-2">• {selectedDoc.file_name}</span>
                    ) : null}
                    {selectedPageNumber ? (
                      <span className="ml-2">• Página {selectedPageNumber}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <a href={selectedDocUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Abrir em nova aba
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <a href={selectedDocUrl} download rel="noreferrer">
                        <Download className="h-4 w-4" />
                        Baixar
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Inline preview: renderiza SOMENTE blob local para evitar bloqueio de iframe pelo navegador */}
                {blobLoading ? (
                  <div className="h-[600px] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20">
                    <div className="text-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                      <p className="font-medium">Carregando documento…</p>
                    </div>
                  </div>
                ) : blobUrl ? (
                  <div className="h-[600px] rounded-lg overflow-hidden border">
                    <iframe
                      src={blobUrl + (selectedPageNumber ? `#page=${selectedPageNumber}` : "")}
                      className="w-full h-full"
                      title="Document Preview"
                    />
                  </div>
                ) : (
                  <div className="h-[600px] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20 px-6">
                    <div className="text-center text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-yellow-600" />
                      <p className="font-medium">Não foi possível renderizar no painel</p>
                      <p className="text-sm mt-1">
                        Use <span className="text-foreground">"Abrir em nova aba"</span> ou <span className="text-foreground">"Baixar"</span> acima.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[600px] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Selecione um fato para visualizar</p>
                  <p className="text-sm">
                    Clique no ícone de olho ao lado de um fato
                  </p>
                  {documents.length === 0 && (
                    <p className="text-sm mt-2 text-yellow-600">
                      Nenhum documento anexado ao caso
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingFact}
        onOpenChange={(open) => !open && setEditingFact(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar: {chaveLabels[editingFact?.chave || ""] || editingFact?.chave}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={editForm.valor}
                onChange={(e) =>
                  setEditForm({ ...editForm, valor: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editForm.tipo}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFact(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Critical Fact Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar fato crítico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave</Label>
              <Select
                value={createForm.chave}
                onValueChange={(value) => setCreateForm((p) => ({ ...p, chave: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CRITICAL_FACTS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {chaveLabels[k] || k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={createForm.valor}
                onChange={(e) => setCreateForm((p) => ({ ...p, valor: e.target.value }))}
                placeholder="Ex.: 01/02/2024, R$ 2.500,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={createForm.tipo}
                onValueChange={(value) => setCreateForm((p) => ({ ...p, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createCriticalFactMutation.mutate({
                  chave: createForm.chave,
                  valor: createForm.valor,
                  tipo: createForm.tipo,
                })
              }
              disabled={!createForm.chave || !createForm.valor || createCriticalFactMutation.isPending}
            >
              Adicionar e confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pericial Status Dialog */}
      <Dialog open={pericialDialogOpen} onOpenChange={setPericialDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Qualificar Fato: {chaveLabels[pericialFact?.chave || ""] || pericialFact?.chave}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Status Pericial</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPericialForm({ ...pericialForm, status: "incontroverso" })}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    pericialForm.status === "incontroverso"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : "border-border hover:border-green-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Incontroverso</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fato aceito por ambas as partes, não precisa de justificativa detalhada.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPericialForm({ ...pericialForm, status: "controvertido" })}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    pericialForm.status === "controvertido"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                      : "border-border hover:border-red-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Controvertido</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fato disputado - requer justificativa obrigatória.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qualidade da Prova</Label>
              <Select
                value={pericialForm.prova_qualidade}
                onValueChange={(v) => setPericialForm({ ...pericialForm, prova_qualidade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forte">Forte (documento original)</SelectItem>
                  <SelectItem value="media">Média (cópia/testemunho)</SelectItem>
                  <SelectItem value="fraca">Fraca (apenas alegação)</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(pericialForm.status === "controvertido" || CRITICAL_FACTS.includes(pericialFact?.chave || "")) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Justificativa
                  {pericialForm.status === "controvertido" && (
                    <Badge variant="destructive" className="text-xs">Obrigatória</Badge>
                  )}
                </Label>
                <Textarea
                  value={pericialForm.justificativa}
                  onChange={(e) => setPericialForm({ ...pericialForm, justificativa: e.target.value })}
                  placeholder="Descreva a razão da controvérsia ou a base probatória..."
                  rows={3}
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    "Valor confirmado pelo TRCT (doc. oficial).",
                    "Divergência entre holerites e alegação.",
                    "Adotado por ausência de impugnação.",
                    "Média aritmética conforme jurisprudência.",
                  ].map((tpl, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setPericialForm({ ...pericialForm, justificativa: tpl })}
                    >
                      {tpl.slice(0, 25)}...
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPericialDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pericialFact) {
                  updatePericialMutation.mutate({
                    factId: pericialFact.id,
                    status: pericialForm.status,
                    justificativa: pericialForm.justificativa,
                    prova_qualidade: pericialForm.prova_qualidade,
                  });
                }
              }}
              disabled={
                updatePericialMutation.isPending ||
                (pericialForm.status === "controvertido" && !pericialForm.justificativa)
              }
            >
              {updatePericialMutation.isPending ? "Salvando..." : "Salvar Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
