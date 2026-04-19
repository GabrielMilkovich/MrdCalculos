/**
 * OcrValidationList — tela "Validação de OCR" que lista todos os
 * documentos do caso e mostra o status de validação com check verde visual.
 *
 * Status possíveis por doc:
 *   - "uploaded" → badge azul "aguardando OCR"
 *   - "ocr_running" → badge amarelo "OCRizando..."
 *   - "ocr_done" / "ocr_partial" com ocr_validated=false → "aguardando validação"
 *   - ocr_validated=true → ✅ verde "validado"
 *   - "failed" → badge vermelho com error_message
 *
 * Clicar num item abre o DocumentValidation modal (split view). Após validar,
 * a lista atualiza automaticamente via React Query invalidation.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Loader2, Eye,
} from "lucide-react";
import { DocumentValidation } from "@/components/cases/DocumentValidation";

interface Props {
  caseId: string;
}

interface DocRow {
  id: string;
  file_name: string;
  tipo: string | null;
  status: string | null;
  page_count: number | null;
  ocr_confidence: number | null;
  ocr_validated: boolean | null;
  ocr_validated_at: string | null;
  error_message: string | null;
  uploaded_em: string;
}

export function OcrValidationList({ caseId }: Props) {
  const qc = useQueryClient();
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["ocr_validation_list", caseId],
    queryFn: async (): Promise<DocRow[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, tipo, status, page_count, ocr_confidence, ocr_validated, ocr_validated_at, error_message, uploaded_em")
        .eq("case_id", caseId)
        .order("uploaded_em", { ascending: false });
      if (error) throw error;
      return (data || []) as DocRow[];
    },
    // Auto-refresh a cada 3s enquanto houver docs em processamento
    refetchInterval: (data) => {
      const arr = (data as any)?.state?.data ?? [];
      const hasProcessing = Array.isArray(arr) && arr.some(
        (d: DocRow) => d.status === "ocr_running" || d.status === "extracting"
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const total = docs.length;
  const validados = docs.filter(d => d.ocr_validated).length;

  const getBadge = (d: DocRow) => {
    if (d.status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          erro
        </Badge>
      );
    }
    if (d.status === "ocr_running") {
      return (
        <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          OCRizando...
        </Badge>
      );
    }
    if (d.status === "extracting") {
      return (
        <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          extraindo...
        </Badge>
      );
    }
    if (d.ocr_validated) {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 border border-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          validado
        </Badge>
      );
    }
    if (d.status === "ocr_done" || d.status === "ocr_partial" || d.status === "extracted") {
      return (
        <Badge className="gap-1 bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-300">
          <Clock className="h-3 w-3" />
          aguardando validação
        </Badge>
      );
    }
    // uploaded
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        aguardando OCR
      </Badge>
    );
  };

  const getTipoLabel = (tipo: string | null): string => {
    const map: Record<string, string> = {
      ctps: "CTPS",
      cartao_ponto: "Cartão de Ponto",
      ponto: "Cartão de Ponto",
      holerite: "Holerite",
      ficha_financeira: "Ficha Financeira",
      trct: "TRCT",
      contrato: "Contrato",
      cct: "CCT",
      fgts: "FGTS",
      sentenca: "Sentença",
      peticao: "Petição",
      outro: "Documento",
    };
    return map[tipo || "outro"] || "Documento";
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Validação de OCR
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <span className={validados === total && total > 0 ? "text-green-600 font-semibold" : ""}>
                {validados}/{total}
              </span>{" "}
              validados
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhum documento enviado ainda. Faça upload na aba Documentos.
            </div>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                  d.ocr_validated
                    ? "bg-green-50/50 border-green-200 hover:bg-green-50"
                    : "bg-card hover:bg-muted/30 border-border"
                }`}
              >
                <FileText className={`h-5 w-5 flex-shrink-0 ${d.ocr_validated ? "text-green-600" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" title={d.file_name}>
                    {d.file_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTipoLabel(d.tipo)}
                    {d.page_count ? ` · ${d.page_count} pg` : ""}
                    {d.ocr_confidence ? ` · conf. ${Math.round(d.ocr_confidence * 100)}%` : ""}
                    {d.ocr_validated && d.ocr_validated_at
                      ? ` · validado ${new Date(d.ocr_validated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                      : ""}
                  </div>
                  {d.status === "failed" && d.error_message && (
                    <div className="text-xs text-destructive mt-0.5 truncate" title={d.error_message}>
                      {d.error_message}
                    </div>
                  )}
                </div>
                {getBadge(d)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setValidatingId(d.id)}
                  disabled={d.status === "ocr_running" || d.status === "extracting"}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {d.ocr_validated ? "Revisar" : "Validar"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <DocumentValidation
        open={validatingId !== null}
        onOpenChange={(open) => !open && setValidatingId(null)}
        documentId={validatingId}
        onValidated={() => {
          setValidatingId(null);
          qc.invalidateQueries({ queryKey: ["ocr_validation_list", caseId] });
          qc.invalidateQueries({ queryKey: ["pjecalc_case_data"] });
          qc.invalidateQueries({ queryKey: ["cases"] });
        }}
      />
    </div>
  );
}
