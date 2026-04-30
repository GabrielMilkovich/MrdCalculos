/**
 * ExtractionTypeBadgeAndSelect — substitui o ExtractionTypeSelector simples
 * no card do DocumentOcrValidation quando `showExtractionTypeBadges=true`.
 *
 * Mostra:
 *   1. Badge "🤖 sugerido" quando tipo_extracao_origem='auto' (com tooltip
 *      explicando os motivos da detecção).
 *   2. Select editável pra usuário sobrescrever o tipo.
 *   3. Badge "auto-extraído" quando extracao_origem='auto' e ainda pending
 *      validação humana.
 *   4. Badge "erro" quando extracao_status='failed'.
 *
 * Mudança manual de tipo após auto-extração já ter rubricas: AlertDialog
 * confirma "Re-extrair com o novo tipo? Vai apagar as rubricas atuais."
 */
import { useState } from "react";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
} from "@/components/ui/alert-dialog";
import { ExtractionTypeSelector } from "./ExtractionTypeSelector";
import type { TipoExtracao } from "@/features/data-extraction";

export interface DocForBadge {
  id: string;
  tipo_extracao: TipoExtracao | null;
  tipo_extracao_origem: "manual" | "auto" | null;
  tipo_extracao_confianca: "alta" | "media" | "baixa" | null;
  tipo_extracao_motivos: string[] | null;
  extracao_status: "pending" | "running" | "done" | "failed" | null;
  extracao_origem: "manual" | "auto" | null;
  validation_status: "pending" | "validated" | "rejected" | null;
}

interface Props {
  doc: DocForBadge;
  /** Chamado quando o usuário muda o tipo. Recebe o novo tipo + flag
   *  indicando se deve re-extrair (true quando havia rubricas auto-extraídas). */
  onChange: (novo: TipoExtracao, shouldReextract: boolean) => Promise<void> | void;
}

export function ExtractionTypeBadgeAndSelect({ doc, onChange }: Props) {
  const [pendingChange, setPendingChange] = useState<TipoExtracao | null>(null);

  const isAutoSugerido =
    doc.tipo_extracao_origem === "auto" &&
    doc.tipo_extracao !== "nao_extrair" &&
    doc.tipo_extracao !== null;
  const motivosTooltip =
    (doc.tipo_extracao_motivos ?? []).join(" · ") || "Detectado automaticamente.";

  const isAutoExtraido =
    doc.extracao_origem === "auto" &&
    doc.extracao_status === "done" &&
    doc.validation_status === "pending";

  const haveAutoData =
    doc.extracao_status === "done" || doc.extracao_status === "running";

  const handleTipoChange = (novo: TipoExtracao) => {
    // Se já tem dados auto-extraídos e usuário muda o tipo, pede confirmação
    if (haveAutoData && novo !== doc.tipo_extracao) {
      setPendingChange(novo);
      return;
    }
    void onChange(novo, false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {isAutoSugerido && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-1 text-[10px] cursor-help"
              >
                <Sparkles className="h-3 w-3" /> sugerido
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-xs">
              <strong className="block mb-1">
                Confiança {doc.tipo_extracao_confianca ?? "—"}
              </strong>
              {motivosTooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <ExtractionTypeSelector
        value={doc.tipo_extracao ?? "nao_extrair"}
        onChange={handleTipoChange}
      />

      {doc.extracao_status === "running" && (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Loader2 className="h-3 w-3 animate-spin" /> extraindo...
        </Badge>
      )}

      {isAutoExtraido && (
        <Badge
          variant="outline"
          className="gap-1 text-[10px] text-amber-700 dark:text-amber-300 border-amber-400 bg-amber-50 dark:bg-amber-950/30"
        >
          <Sparkles className="h-3 w-3" /> auto-extraído
        </Badge>
      )}

      {doc.extracao_status === "failed" && (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          <AlertTriangle className="h-3 w-3" /> erro
        </Badge>
      )}

      {/* Confirmação de re-extração ao trocar tipo */}
      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-extrair com o novo tipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Este documento já tem dados extraídos. Mudar o tipo para{" "}
              <strong>{tipoLabel(pendingChange ?? "nao_extrair")}</strong> vai
              apagar tudo e re-extrair com o novo prompt.
              <br />
              <br />
              Suas classificações manuais serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const novo = pendingChange;
                setPendingChange(null);
                if (novo) void onChange(novo, true);
              }}
            >
              Re-extrair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function tipoLabel(t: TipoExtracao): string {
  return (
    {
      nao_extrair: "Não extrair",
      holerite: "Holerite",
      recibo_ferias: "Recibo de Férias",
      registro_faltas: "Registro de Faltas",
    } as const
  )[t];
}
