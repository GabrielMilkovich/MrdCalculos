/**
 * ExtractionStep — sub-etapa 2 do modo data_extraction.
 *
 * Replica o padrão visual do DocumentOcrValidation:
 *   - Lista clicável de docs com tipo_extracao !== 'nao_extrair'
 *   - Split view abaixo (planilha + PDF) — via ExtractionSplitView
 *   - Footer: contador validados + Voltar pra OCR + Compor CSVs
 *
 * Auto-extrai (invoke ocr-extract-document-rubricas) o doc selecionado se
 * extracao_status === 'pending'. Realtime via supabase channel pra
 * refrescar quando outro tab muda algum doc.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  loadCategorias,
  extractDocument,
  type TipoExtracao,
} from "@/features/data-extraction";
import { ExtractionSplitView } from "./ExtractionSplitView";
import type { DocSummary } from "./types";

interface Props {
  caseId: string;
  onBack: () => void;
  onCompose: () => void;
}

type ExtractDoc = DocSummary & {
  storage_path: string | null;
  arquivo_url: string | null;
  mime_type: string | null;
  uploaded_em: string | null;
};

export function ExtractionStep({ caseId, onBack, onCompose }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-rubrica"],
    queryFn: loadCategorias,
    staleTime: 5 * 60 * 1000,
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents-extraction", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, file_name, storage_path, arquivo_url, mime_type, tipo_extracao, extracao_status, extracao_error, extracao_origem, competencia_referencia, validation_status, uploaded_em",
        )
        .eq("case_id", caseId)
        .order("uploaded_em", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>)
        .filter((d) => (d.tipo_extracao as string) !== "nao_extrair" && d.tipo_extracao !== null)
        .map((d) => ({
          id: d.id as string,
          case_id: caseId,
          file_name: (d.file_name as string | null) ?? null,
          storage_path: (d.storage_path as string | null) ?? null,
          arquivo_url: (d.arquivo_url as string | null) ?? null,
          mime_type: (d.mime_type as string | null) ?? null,
          tipo_extracao: (d.tipo_extracao as ExtractDoc["tipo_extracao"]) ?? "nao_extrair",
          extracao_status: ((d.extracao_status as string) ?? "pending") as ExtractDoc["extracao_status"],
          extracao_error: (d.extracao_error as string | null) ?? null,
          extracao_origem: ((d.extracao_origem as string) ?? "manual") as ExtractDoc["extracao_origem"],
          competencia_referencia: (d.competencia_referencia as string | null) ?? null,
          validation_status: ((d.validation_status as string) ?? "pending") as ExtractDoc["validation_status"],
          uploaded_em: (d.uploaded_em as string | null) ?? null,
        })) as ExtractDoc[];
    },
  });

  // Realtime: refresca lista quando docs mudam externamente
  useEffect(() => {
    const channel = supabase
      .channel(`extr-step-${caseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `case_id=eq.${caseId}` },
        () => qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, qc]);

  // Seleção automática: primeiro doc se nada selecionado
  useEffect(() => {
    if (!selectedId && docs.length > 0) {
      setSelectedId(docs[0].id);
    }
  }, [docs, selectedId]);

  const selected = useMemo(
    () => docs.find((d) => d.id === selectedId) ?? docs[0] ?? null,
    [docs, selectedId],
  );

  // Auto-extrai o doc selecionado se ainda não foi extraído
  useEffect(() => {
    if (!selected) return;
    if (selected.extracao_status !== "pending") return;
    if (extractingIds.has(selected.id)) return;

    const tipo = selected.tipo_extracao as Exclude<TipoExtracao, "nao_extrair">;
    setExtractingIds((prev) => new Set(prev).add(selected.id));
    (async () => {
      try {
        const result = await extractDocument(selected.id, tipo);
        if (result.ok) {
          toast.success(`${selected.file_name}: extraídas ${result.count} linhas.`);
        } else {
          toast.error(`${selected.file_name}: ${result.error}`);
        }
      } catch (e) {
        toast.error(`Falha ao extrair: ${(e as Error).message}`);
      } finally {
        setExtractingIds((prev) => {
          const next = new Set(prev);
          next.delete(selected.id);
          return next;
        });
        qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] });
      }
    })();
  }, [selected, extractingIds, qc, caseId]);

  const validatedCount = docs.filter((d) => d.validation_status === "validated").length;
  const allValidated = docs.length > 0 && validatedCount === docs.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos...
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhum documento marcado para extração. Volte para a etapa OCR e
            selecione o tipo de extração de pelo menos 1 documento.
          </p>
          <Button size="sm" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para OCR
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lista de documentos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Documentos para extração
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{validatedCount}/{docs.length} validados</span>
              {allValidated && (
                <Badge className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Tudo OK
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 gap-2">
            {docs.map((doc) => {
              const isSelected = doc.id === selectedId;
              const isExtracting = extractingIds.has(doc.id) || doc.extracao_status === "running";
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(doc.id);
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition cursor-pointer ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.file_name || "sem nome"}</div>
                    <div className="text-xs text-muted-foreground">
                      {tipoLabel(doc.tipo_extracao)}
                      {doc.competencia_referencia ? ` · ${doc.competencia_referencia}` : ""}
                    </div>
                  </div>
                  <DocStatusBadge
                    isExtracting={isExtracting}
                    extracaoStatus={doc.extracao_status}
                    validationStatus={doc.validation_status}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Split view do doc selecionado */}
      {selected && <ExtractionSplitView doc={selected} categorias={categorias} />}

      {/* Footer: voltar + compor */}
      <Card className={allValidated ? "border-primary/40 bg-primary/5" : "border-dashed"}>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para OCR
          </Button>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-medium">
              {allValidated
                ? "Todos os documentos validados!"
                : `${validatedCount} / ${docs.length} validados.`}
            </div>
            <div className="text-xs text-muted-foreground">
              {allValidated
                ? "Clique em 'Compor CSVs PJe-Calc' para gerar o pacote."
                : "Valide cada documento acima pra liberar a composição."}
            </div>
          </div>
          <Button onClick={onCompose} disabled={!allValidated}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Compor CSVs PJe-Calc
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function tipoLabel(t: TipoExtracao): string {
  return t === "holerite"
    ? "Holerite"
    : t === "recibo_ferias"
      ? "Recibo de Férias"
      : t === "registro_faltas"
        ? "Registro de Faltas"
        : "—";
}

function DocStatusBadge({
  isExtracting,
  extracaoStatus,
  validationStatus,
}: {
  isExtracting: boolean;
  extracaoStatus: "pending" | "running" | "done" | "failed";
  validationStatus: "pending" | "validated" | "rejected";
}) {
  if (isExtracting || extracaoStatus === "running") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Loader2 className="h-3 w-3 animate-spin" /> extraindo...
      </Badge>
    );
  }
  if (extracaoStatus === "failed") {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" /> falhou
      </Badge>
    );
  }
  if (validationStatus === "validated") {
    return (
      <Badge className="gap-1 bg-green-600 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> validado
      </Badge>
    );
  }
  if (validationStatus === "rejected") {
    return <Badge variant="destructive" className="text-[10px]">rejeitado</Badge>;
  }
  if (extracaoStatus === "done") {
    return <Badge variant="secondary" className="text-[10px]">aguardando</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">pendente</Badge>;
}
