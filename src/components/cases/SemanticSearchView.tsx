// =====================================================
// COMPONENTE: BUSCA SEMÂNTICA EM DOCUMENTOS
// Pesquisa vetorial com criação de fatos a partir de chunks
// =====================================================

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from '@/lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  FileText,
  Quote,
  Plus,
  Sparkles,
  Filter,
  ArrowRight,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SemanticSearchViewProps {
  caseId: string;
  onFactCreated: () => void;
}

interface SearchResult {
  chunk_id: string;
  document_id: string;
  page_number: number | null;
  content: string;
  doc_type: string | null;
  similarity: number;
  document_name?: string;
}

const docTypeLabels: Record<string, string> = {
  holerite: "Holerite",
  ctps: "CTPS",
  contrato: "Contrato",
  cct: "Convenção Coletiva",
  ponto: "Cartão de Ponto",
  fgts: "Extrato FGTS",
  peticao: "Petição",
  sentenca: "Sentença",
  trct: "TRCT",
  outro: "Outro",
};

const factTypeOptions = [
  { value: "texto", label: "Texto" },
  { value: "data", label: "Data" },
  { value: "moeda", label: "Valor monetário" },
  { value: "numero", label: "Número" },
  { value: "boolean", label: "Sim/Não" },
];

export function SemanticSearchView({ caseId, onFactCreated }: SemanticSearchViewProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [topK, setTopK] = useState(10);
  
  // Create fact dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<SearchResult | null>(null);
  const [newFact, setNewFact] = useState({
    chave: "",
    valor: "",
    tipo: "texto" as "texto" | "data" | "moeda" | "numero" | "boolean",
    citacao: "",
  });

  // Execute semantic search
  const executeSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Digite uma pergunta para buscar");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: {
          case_id: caseId,
          query: query.trim(),
          top_k: topK,
          doc_types: filterDocType !== "all" ? [filterDocType] : null,
        },
      });

      if (error) throw error;

      if (data.results && data.results.length > 0) {
        setResults(data.results);
        toast.success(`${data.results.length} trechos encontrados`);
      } else {
        toast.info("Nenhum resultado encontrado");
      }
    } catch (err) {
      logger.error("Search error:", err)
      toast.error("Erro na busca: " + (err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }, [caseId, query, topK, filterDocType]);

  // Open create fact dialog
  const openCreateFactDialog = useCallback((chunk: SearchResult) => {
    setSelectedChunk(chunk);
    setNewFact({
      chave: "",
      valor: "",
      tipo: "texto",
      citacao: chunk.content.substring(0, 500),
    });
    setShowCreateDialog(true);
  }, []);

  // Create fact from chunk
  const createFactFromChunk = useCallback(async () => {
    if (!selectedChunk || !newFact.chave.trim() || !newFact.valor.trim()) {
      toast.error("Preencha a chave e o valor do fato");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Não autenticado");

      // Insert fact
      const { data: insertedFact, error: factError } = await supabase
        .from("facts")
        .insert({
          case_id: caseId,
          chave: newFact.chave.trim(),
          valor: newFact.valor.trim(),
          tipo: newFact.tipo,
          origem: "usuario" as const,
          confianca: selectedChunk.similarity,
          confirmado: true,
          confirmado_por: session.session.user.id,
          confirmado_em: new Date().toISOString(),
          citacao: newFact.citacao,
          pagina: selectedChunk.page_number,
          chunk_id: selectedChunk.chunk_id,
        })
        .select()
        .single();

      if (factError) throw factError;

      // Insert evidence
      if (insertedFact && selectedChunk.document_id) {
        await supabase.from("fact_evidences").insert({
          case_id: caseId,
          fact_id: insertedFact.id,
          document_id: selectedChunk.document_id,
          chunk_id: selectedChunk.chunk_id,
          page_number: selectedChunk.page_number,
          quote: newFact.citacao,
          confidence: selectedChunk.similarity,
        });
      }

      toast.success(`Fato "${newFact.chave}" criado com sucesso!`);
      setShowCreateDialog(false);
      setSelectedChunk(null);
      onFactCreated();

    } catch (err) {
      logger.error("Create fact error:", err)
      toast.error("Erro ao criar fato: " + (err as Error).message);
    }
  }, [caseId, selectedChunk, newFact, onFactCreated]);

  // Copy content to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  }, []);

  // Highlight matching terms in content
  const highlightContent = useCallback((content: string, searchQuery: string) => {
    if (!searchQuery.trim()) return content;
    
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    let result = content;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
    });
    
    return result;
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Busca Semântica
          </CardTitle>
          <CardDescription>
            Faça perguntas em linguagem natural para encontrar informações nos documentos indexados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: Qual era o salário base do trabalhador? Quando foi a data de admissão?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                className="pl-10"
              />
            </div>
            <Select value={filterDocType} onValueChange={setFilterDocType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo de doc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(docTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={topK.toString()} onValueChange={(v) => setTopK(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={executeSearch} disabled={isSearching} className="gap-2">
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>• A busca usa embeddings vetoriais para encontrar trechos semanticamente similares</p>
            <p>• Clique em "Criar Fato" para transformar um trecho em um fato confirmado</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
            </h3>
            <Badge variant="outline">
              Ordenado por similaridade
            </Badge>
          </div>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <Card key={result.chunk_id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Similarity score */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`text-lg font-bold ${
                        result.similarity >= 0.8 ? "text-green-600" :
                        result.similarity >= 0.6 ? "text-yellow-600" : "text-muted-foreground"
                      }`}>
                        {Math.round(result.similarity * 100)}%
                      </div>
                      <span className="text-xs text-muted-foreground">match</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {docTypeLabels[result.doc_type || "outro"] || result.doc_type}
                        </Badge>
                        {result.page_number && (
                          <Badge variant="secondary" className="text-xs">
                            Página {result.page_number}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                      
                      <div 
                        className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightContent(result.content, query) 
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCreateFactDialog(result)}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Criar Fato
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Criar fato a partir deste trecho</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar texto</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isSearching && results.length === 0 && query && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente reformular sua pergunta ou verifique se os documentos foram indexados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial state */}
      {!isSearching && results.length === 0 && !query && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Faça uma busca</h3>
            <p className="text-muted-foreground">
              Digite uma pergunta para buscar nos documentos indexados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Fact Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Fato a partir do Trecho
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um fato confirmado a partir deste trecho.
            </DialogDescription>
          </DialogHeader>

          {selectedChunk && (
            <div className="space-y-4">
              {/* Original chunk */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Trecho original</span>
                  {selectedChunk.page_number && (
                    <Badge variant="secondary" className="text-xs">
                      Página {selectedChunk.page_number}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {Math.round(selectedChunk.similarity * 100)}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {selectedChunk.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fact-key">Chave do Fato *</Label>
                  <Input
                    id="fact-key"
                    placeholder="Ex: salario_base, data_admissao"
                    value={newFact.chave}
                    onChange={(e) => setNewFact(prev => ({ ...prev, chave: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use snake_case sem acentos
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fact-type">Tipo do Valor *</Label>
                  <Select 
                    value={newFact.tipo} 
                    onValueChange={(v) => setNewFact(prev => ({ ...prev, tipo: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {factTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fact-value">Valor *</Label>
                <Input
                  id="fact-value"
                  placeholder="Ex: 2500.00, 2024-01-15"
                  value={newFact.valor}
                  onChange={(e) => setNewFact(prev => ({ ...prev, valor: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Para datas use YYYY-MM-DD. Para valores monetários use números sem R$.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fact-quote">Citação (trecho literal)</Label>
                <Textarea
                  id="fact-quote"
                  rows={3}
                  value={newFact.citacao}
                  onChange={(e) => setNewFact(prev => ({ ...prev, citacao: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createFactFromChunk} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Criar Fato Confirmado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
