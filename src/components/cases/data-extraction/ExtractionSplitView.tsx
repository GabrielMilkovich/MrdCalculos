/**
 * ExtractionSplitView — split view do documento selecionado na sub-etapa
 * Extração. Espelha o layout do DocumentOcrValidation (lista + split):
 *
 *   ┌────────── PLANILHA / FORM ──────────┬────── DOCUMENTO ──────┐
 *   │ Cód  Rubrica       Valor   Categ.   │                       │
 *   │ ...                                 │   [PDF preview]       │
 *   └─────────────────────────────────────┴───────────────────────┘
 *   [Re-extrair (já no header)]    [Rejeitar]   [✓ Validar documento]
 *
 * Esquerda varia conforme tipo_extracao:
 *   - holerite           → RubricasGrid
 *   - recibo_ferias      → FeriasForm
 *   - registro_faltas    → FaltasForm
 *
 * Direita: DocumentPreview (compartilhado).
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Pencil, X, AlertTriangle } from "lucide-react";
import { DocumentPreview } from "@/components/cases/shared/DocumentPreview";
import { RubricasGrid } from "./RubricasGrid";
import { FeriasForm } from "./FeriasForm";
import { FaltasForm } from "./FaltasForm";
import { useRubricasDoDocumento } from "@/features/data-extraction/hooks/useRubricasDoDocumento";
import type { Categoria, TipoExtracao } from "@/features/data-extraction";
import type { DocSummary } from "./types";

interface Props {
  doc: DocSummary & {
    storage_path: string | null;
    arquivo_url: string | null;
    mime_type: string | null;
    extracao_status: "pending" | "running" | "done" | "failed";
  };
  categorias: Categoria[];
}

export function ExtractionSplitView({ doc, categorias }: Props) {
  const qc = useQueryClient();
  const [editingComp, setEditingComp] = useState<string | null>(null);

  // Hook compartilhado pra ações de competência/validate/reject
  const { saveCompetencia, validate, reject } = useRubricasDoDocumento(doc.id, doc.case_id);

  // Reset edit-mode quando troca de doc
  useEffect(() => {
    setEditingComp(null);
  }, [doc.id]);

  const tipoExtracao = doc.tipo_extracao as Exclude<TipoExtracao, "nao_extrair">;
  const isHolerite = tipoExtracao === "holerite";
  const isFerias = tipoExtracao === "recibo_ferias";
  const isFaltas = tipoExtracao === "registro_faltas";
  const tipoLabel = isHolerite ? "Holerite" : isFerias ? "Recibo de Férias" : "Registro de Faltas";

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CardTitle className="text-sm truncate">{doc.file_name ?? doc.id}</CardTitle>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">{tipoLabel}</Badge>
          {doc.validation_status === "validated" && (
            <Badge className="gap-1 bg-green-600 text-[10px] flex-shrink-0">
              <CheckCircle2 className="h-3 w-3" /> validado
            </Badge>
          )}
          {doc.validation_status === "rejected" && (
            <Badge variant="destructive" className="text-[10px] flex-shrink-0">rejeitado</Badge>
          )}
        </div>
        {/* Competência (apenas pra holerite) */}
        {isHolerite && (
          <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
            <span className="text-muted-foreground">Comp:</span>
            {editingComp !== null ? (
              <>
                <Input
                  value={editingComp}
                  onChange={(e) => setEditingComp(e.target.value)}
                  placeholder="MM/yyyy"
                  className="h-7 text-xs w-[80px]"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={async () => {
                    if (await saveCompetencia(editingComp)) setEditingComp(null);
                  }}
                >
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setEditingComp(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <strong className="font-mono">{doc.competencia_referencia ?? "—"}</strong>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingComp(doc.competencia_referencia ?? "")}
                  aria-label="Editar competência"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Banner de erro de extração, se houver */}
        {doc.extracao_status === "failed" && doc.extracao_error && (
          <div className="mb-3 text-xs text-destructive flex items-start gap-2 bg-destructive/5 p-2 rounded">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{doc.extracao_error}</span>
          </div>
        )}

        {/* Grid 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ minHeight: "500px" }}>
          {/* Esquerda: planilha/form variando por tipo */}
          {isHolerite && (
            <RubricasGrid
              documentId={doc.id}
              caseId={doc.case_id}
              competencia={doc.competencia_referencia ?? ""}
              categorias={categorias}
              tipoExtracao="holerite"
              onReextracted={() => {
                qc.invalidateQueries({ queryKey: ["documents-extraction", doc.case_id] });
              }}
            />
          )}
          {isFerias && <FeriasForm documentId={doc.id} caseId={doc.case_id} />}
          {isFaltas && <FaltasForm documentId={doc.id} caseId={doc.case_id} />}

          {/* Direita: PDF preview */}
          <DocumentPreview
            storagePath={doc.storage_path}
            arquivoUrl={doc.arquivo_url}
            mimeType={doc.mime_type}
            fileName={doc.file_name}
          />
        </div>

        {/* Footer: ações */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1" />
          {doc.validation_status === "validated" ? (
            <Badge className="gap-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3" /> Documento validado
            </Badge>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => void reject()}>
                Rejeitar
              </Button>
              <Button size="sm" onClick={() => void validate()}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Validar documento
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
