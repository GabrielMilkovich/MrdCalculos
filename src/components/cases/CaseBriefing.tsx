// =====================================================
// DIAGNÓSTICO DO CASO — Gerado por IA
// Salva automaticamente após geração. Gera independente de cálculo.
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Loader2,
  RefreshCw,
  Download,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface CaseBriefingProps {
  caseId: string;
  caseInfo: {
    cliente: string;
    numero_processo: string | null;
    tribunal?: string | null;
    status: string;
  };
}

export function CaseBriefing({ caseId, caseInfo }: CaseBriefingProps) {
  const [briefing, setBriefing] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Load saved briefing
  // case_briefings é uma tabela custom fora do schema gerado em
  // src/types/supabase.ts; declaramos aqui o subset usado pelo UI.
  interface CaseBriefingRow {
    id: string;
    case_id: string;
    content: string;
    created_by: string | null;
    created_at: string;
    updated_at: string | null;
  }
  const { data: savedBriefing, isLoading: loadingSaved } = useQuery<CaseBriefingRow | null>({
    queryKey: ["case_briefing", caseId],
    queryFn: async () => {
      const { data } = await supabase
        // tabela custom fora do schema gerado
        .from("case_briefings" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data ?? null) as unknown as CaseBriefingRow | null;
    },
  });

  // Populate from saved
  useEffect(() => {
    if (savedBriefing && !briefing && !isGenerating) {
      setBriefing(savedBriefing.content);
      setGeneratedAt(new Date(savedBriefing.updated_at || savedBriefing.created_at));
    }
  }, [savedBriefing, briefing, isGenerating]);

  // Fetch all data for context (optional - used if available)
  const { data: facts = [] } = useQuery({
    queryKey: ["facts", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("facts").select("*").eq("case_id", caseId);
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("case_id", caseId);
      return data || [];
    },
  });

  const { data: latestRun } = useQuery({
    queryKey: ["latest_calc_run_briefing", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("case_id", caseId)
        .order("executado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: auditLines = [] } = useQuery({
    queryKey: ["audit_lines_briefing", latestRun?.id],
    queryFn: async () => {
      if (!latestRun?.id) return [];
      const { data } = await supabase
        .from("audit_lines")
        .select("*")
        .eq("run_id", latestRun.id)
        .order("linha");
      return data || [];
    },
    enabled: !!latestRun?.id,
  });

  const { data: controversies = [] } = useQuery({
    queryKey: ["controversies_briefing", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("case_controversies")
        .select("*")
        .eq("case_id", caseId);
      return data || [];
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["contract_briefing", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employment_contracts")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch raw document chunks for comprehensive AI analysis
  const { data: documentChunks = [] } = useQuery({
    queryKey: ["document_chunks_briefing", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_chunks")
        .select("content, page_number, doc_type, chunk_index, document_id")
        .eq("case_id", caseId)
        .order("document_id")
        .order("chunk_index")
        .limit(80);
      return data || [];
    },
  });

  const saveBriefing = async (content: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;

      if (savedBriefing?.id) {
        // tabela custom case_briefings fora do schema gerado
        const builder = supabase.from("case_briefings" as any) as unknown as {
          update: (v: { content: string; updated_at: string }) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
        };
        await builder.update({ content, updated_at: new Date().toISOString() }).eq("id", savedBriefing.id);
      } else {
        // tabela custom case_briefings fora do schema gerado
        const builder = supabase.from("case_briefings" as any) as unknown as {
          insert: (v: { case_id: string; content: string; created_by: string | null }) => Promise<{ error: unknown }>;
        };
        await builder.insert({ case_id: caseId, content, created_by: userId });
      }
      queryClient.invalidateQueries({ queryKey: ["case_briefing", caseId] });
    } catch (e) {
      logger.error("Failed to save briefing", { error: String(e) });
    }
  };

  const generateBriefing = useCallback(async () => {
    setIsGenerating(true);
    setBriefing("");

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-case-briefing`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          facts,
          documents: documents.map((d: any) => ({
            file_name: d.file_name,
            tipo: d.tipo,
            status: d.status,
            ocr_confidence: d.ocr_confidence,
          })),
          calculation_result: latestRun ? {
            resultado_bruto: latestRun.resultado_bruto,
            resultado_liquido: latestRun.resultado_liquido,
          } : { resultado_bruto: { total: 0, por_verba: {} }, resultado_liquido: { total: 0, por_verba: {} } },
          audit_lines: auditLines,
          warnings: latestRun?.warnings || [],
          controversies,
          case_info: caseInfo,
          contract_info: contract ? {
            data_admissao: contract.data_admissao,
            data_demissao: contract.data_demissao,
            tipo_demissao: contract.tipo_demissao,
            salario_inicial: contract.salario_inicial,
            funcao: contract.funcao,
          } : null,
          document_chunks: documentChunks.map((c: any) => ({
            content: c.content,
            page_number: c.page_number,
            doc_type: c.doc_type,
          })),
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
          return;
        }
        if (resp.status === 402) {
          toast.error("Créditos insuficientes. Adicione créditos ao workspace.");
          return;
        }
        throw new Error(`Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setBriefing(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setBriefing(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      // Save to database
      if (fullText) {
        await saveBriefing(fullText);
      }

      setGeneratedAt(new Date());
      toast.success("Diagnóstico gerado e salvo com sucesso!");
    } catch (e) {
      logger.error("CaseBriefing handler error", { error: String(e) });
      toast.error("Falha ao gerar diagnóstico: " + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [facts, documents, latestRun, auditLines, controversies, caseInfo, contract, savedBriefing, documentChunks]);

  const exportAsText = () => {
    if (!briefing) return;
    const blob = new Blob([briefing], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostico-${caseInfo.cliente.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingSaved) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">Diagnóstico do Caso</div>
                <div className="text-xs text-muted-foreground">
                  Análise completa do caso por IA — fatos, cálculos, riscos e recomendações
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {briefing && (
                <Button size="sm" variant="outline" onClick={exportAsText} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Exportar .md
                </Button>
              )}
              <Button
                size="sm"
                onClick={generateBriefing}
                disabled={isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : briefing ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating ? "Analisando..." : briefing ? "Regenerar" : "Gerar Diagnóstico"}
              </Button>
            </div>
          </div>

          {savedBriefing && !isGenerating && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              Diagnóstico salvo automaticamente
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats when no briefing yet */}
      {!briefing && !isGenerating && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Fatos", value: facts.length },
            { label: "Documentos", value: documents.length },
            { label: "Chunks (texto)", value: documentChunks.length },
            { label: "Controvérsias", value: controversies.length },
          ].map((s) => (
            <Card key={s.label} className="bg-card/80">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Briefing Content */}
      {(briefing || isGenerating) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Diagnóstico Completo
              </CardTitle>
              {generatedAt && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Clock className="h-3 w-3" />
                  {generatedAt.toLocaleString("pt-BR")}
                </Badge>
              )}
            </div>
            <CardDescription>
              Análise gerada por IA com base em {facts.length} fatos, {documents.length} documentos e {auditLines.length} linhas de cálculo
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[65vh]">
              <div className="p-6 prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground">
                {briefing ? (
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(briefing) }} />
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analisando o caso completo...</span>
                  </div>
                )}
                {isGenerating && briefing && (
                  <div className="flex items-center gap-2 text-primary mt-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Escrevendo...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<[hul]|<li|<hr)(.+)$/gm, '<p>$1</p>')
    .replace(/\n\n/g, '')
    .replace(/\n/g, '');
}
