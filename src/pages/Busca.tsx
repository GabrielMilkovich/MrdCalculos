import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  FileText,
  Brain,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  chunk_id: string;
  document_id: string;
  texto: string;
  page_number: number | null;
  similarity: number;
  metadata: Record<string, unknown>;
  document_type?: string;
}

interface SearchResponse {
  success?: boolean;
  query?: string;
  results?: SearchResult[];
  total_results?: number;
  error?: string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
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
  unknown: "Documento",
};

function highlightTerms(texto: string, query: string): JSX.Element {
  const tokens = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
        .filter((t) => t.length >= 3),
    ),
  );
  if (tokens.length === 0) return <>{texto}</>;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = texto.split(re);
  return (
    <>
      {parts.map((part, idx) =>
        re.test(part) ? (
          <mark
            key={idx}
            className="bg-accent/20 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        ),
      )}
    </>
  );
}

export default function Busca() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      setError("Digite uma pergunta para buscar.");
      return;
    }
    setError(null);
    setSearching(true);
    setResults(null);
    setLastQuery(q);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<
        SearchResponse
      >("semantic-search", {
        body: { query: q, threshold: 0.65, limit: 20 },
      });
      if (invokeError) throw invokeError;
      if (!data) throw new Error("Resposta vazia da edge function.");
      if (data.error) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void runSearch();
    }
  };

  const goToDoc = (documentId: string) => {
    navigate(`/casos?doc=${documentId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Busca Semântica</h1>
          <p className="text-muted-foreground">
            Pesquise em todos os documentos usando linguagem natural
          </p>
        </div>

        {/* Search Box */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Ex: Quais são os valores de horas extras mencionados nos holerites?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="min-h-[100px] resize-none pr-12"
                  disabled={searching}
                />
                <Sparkles className="absolute right-4 top-4 h-5 w-5 text-accent" />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Dica: pressione <kbd className="px-1 rounded border bg-muted">Ctrl</kbd>+<kbd className="px-1 rounded border bg-muted">Enter</kbd> para buscar.
                </p>
                <Button
                  className="gap-2"
                  onClick={runSearch}
                  disabled={searching || !query.trim()}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="glass-card border-destructive/40">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Falha na busca
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results !== null && !searching && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Resultados</span>
                <Badge variant="secondary">{results.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-md mt-1">
                    Tente reformular a pergunta ou verificar se há documentos
                    com OCR processado e embeddings gerados.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {results.map((r) => {
                    const tipo = r.document_type ?? "unknown";
                    const tipoLabel = DOC_TYPE_LABEL[tipo] ?? tipo;
                    const sim = Math.round(r.similarity * 100);
                    return (
                      <li key={r.chunk_id}>
                        <button
                          type="button"
                          onClick={() => goToDoc(r.document_id)}
                          className="w-full text-left rounded border border-border bg-background/40 hover:bg-accent/10 transition-colors p-3"
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-medium uppercase">
                                {tipoLabel}
                              </span>
                              {r.page_number !== null &&
                                r.page_number !== undefined && (
                                  <Badge variant="outline" className="text-[10px]">
                                    pág. {r.page_number}
                                  </Badge>
                                )}
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {sim}% relevância
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                            {highlightTerms(r.texto, lastQuery)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features (only shown when no search yet) */}
        {results === null && !searching && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">IA Avançada</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Busca semântica usando embeddings vetoriais para encontrar
                    informações relevantes.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-base">
                      Todos os Documentos
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Pesquisa em petições, TRCTs, holerites, cartões de ponto e
                    sentenças.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-calculated/10">
                      <Sparkles className="h-5 w-5 text-status-calculated" />
                    </div>
                    <CardTitle className="text-base">Linguagem Natural</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Faça perguntas em português como faria para um assistente.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Empty State */}
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Faça sua primeira busca
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  A busca semântica permite encontrar informações específicas em
                  todos os seus documentos usando perguntas em linguagem
                  natural.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {searching && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-muted-foreground mb-4 animate-spin" />
              <p className="text-sm font-medium text-foreground">
                Buscando documentos relevantes…
              </p>
              <p className="text-xs text-muted-foreground">
                Gerando embedding e consultando pgvector.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
