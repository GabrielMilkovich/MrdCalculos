/**
 * ExtractionTypeBadgeAndSelect — badges + select de tipo + botão Baixar.
 *
 * Renderizado dentro do DocumentOcrValidation (ver showExtractionTypeBadges).
 *
 * Layout:
 *   [🤖 sugerido]  [Tipo: Holerite ▼]  [⬇ Baixar ZIP]
 *
 * O botão de download:
 *   - aparece quando `showDownloadButton=true` (modo data_extraction v4)
 *   - desabilita se `tipo_extracao === 'nao_extrair' | null`
 *   - chama `generateExportForDocument(doc.id)`
 *   - se holerite → abre HoleritePreviewDialog (preview antes de gerar ZIP)
 *   - se outros → download direto
 *   - mostra AlertDialog com erro se parser falhar
 */
import { useState } from "react";
import { Sparkles, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExtractionTypeSelector } from "./ExtractionTypeSelector";
import { HoleritePreviewDialog } from "./HoleritePreviewDialog";
import { CartaoPontoReviewDialog } from "./CartaoPontoReviewDialog";
import { FeriasReviewDialog } from "./FeriasReviewDialog";
import { FaltasReviewDialog } from "./FaltasReviewDialog";
import {
  generateExportForDocument,
  type ClassificacaoHolerite,
  type ParseCartaoPontoResult,
  type ParseFaltasResult,
  type ParseFeriasResult,
  type TipoExtracao,
} from "@/features/data-extraction";

export interface DocForBadge {
  id: string;
  tipo_extracao: TipoExtracao | null;
  tipo_extracao_origem: "manual" | "auto" | null;
  tipo_extracao_confianca: "alta" | "media" | "baixa" | null;
  tipo_extracao_motivos: string[] | null;
  ocr_validated?: boolean | null;
}

interface Props {
  doc: DocForBadge;
  /** Chamado quando o usuário muda o tipo. */
  onChange: (novo: TipoExtracao) => Promise<void> | void;
  /** Quando true, mostra botão "Baixar CSV/ZIP". */
  showDownloadButton?: boolean;
}

export function ExtractionTypeBadgeAndSelect({
  doc,
  onChange,
  showDownloadButton,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    classificacao: ClassificacaoHolerite;
    filename: string;
  } | null>(null);
  const [cartaoState, setCartaoState] = useState<{
    parsed: ParseCartaoPontoResult;
    ocrText: string;
    filename: string;
  } | null>(null);
  const [feriasState, setFeriasState] = useState<{
    parsed: ParseFeriasResult;
    ocrText: string;
    filename: string;
  } | null>(null);
  const [faltasState, setFaltasState] = useState<{
    parsed: ParseFaltasResult;
    ocrText: string;
    filename: string;
  } | null>(null);

  const isAutoSugerido =
    doc.tipo_extracao_origem === "auto" &&
    doc.tipo_extracao !== "nao_extrair" &&
    doc.tipo_extracao !== null;
  const motivosTooltip =
    (doc.tipo_extracao_motivos ?? []).join(" · ") || "Detectado automaticamente.";

  const canDownload =
    doc.ocr_validated === true &&
    doc.tipo_extracao !== "nao_extrair" &&
    doc.tipo_extracao !== null;

  const buttonLabel =
    doc.tipo_extracao === "holerite" ? "Revisar e baixar ZIP" : "Revisar e baixar CSV";

  const tooltipDisabled =
    doc.ocr_validated !== true
      ? "Confirme o OCR antes de baixar."
      : doc.tipo_extracao === "nao_extrair" || doc.tipo_extracao === null
      ? "Selecione um tipo de extração antes."
      : null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await generateExportForDocument(doc.id);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      switch (result.kind) {
        case "holerite-preview":
          setPreviewState({
            classificacao: result.preview,
            filename: result.filename,
          });
          break;
        case "cartao-ponto-review":
          setCartaoState({
            parsed: result.parsed,
            ocrText: result.ocr_text,
            filename: result.filename,
          });
          break;
        case "ferias-review":
          setFeriasState({
            parsed: result.parsed,
            ocrText: result.ocr_text,
            filename: result.filename,
          });
          break;
        case "faltas-review":
          setFaltasState({
            parsed: result.parsed,
            ocrText: result.ocr_text,
            filename: result.filename,
          });
          break;
      }
    } finally {
      setDownloading(false);
    }
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
        onChange={(novo) => void onChange(novo)}
      />

      {showDownloadButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!canDownload || downloading}
                  className="gap-1 h-8 text-xs"
                >
                  {downloading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {buttonLabel}
                </Button>
              </span>
            </TooltipTrigger>
            {tooltipDisabled && (
              <TooltipContent side="top" className="text-xs">
                {tooltipDisabled}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      <AlertDialog
        open={errorMsg !== null}
        onOpenChange={(o) => !o && setErrorMsg(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não foi possível extrair</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {errorMsg}
              <br />
              <br />
              <span className="text-muted-foreground">
                Edite o OCR (na lateral esquerda do card) e tente baixar novamente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMsg(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewState && (
        <HoleritePreviewDialog
          open={previewState !== null}
          onOpenChange={(o) => !o && setPreviewState(null)}
          classificacao={previewState.classificacao}
          filename={previewState.filename}
        />
      )}
      {cartaoState && (
        <CartaoPontoReviewDialog
          open={cartaoState !== null}
          onOpenChange={(o) => !o && setCartaoState(null)}
          parsed={cartaoState.parsed}
          ocrText={cartaoState.ocrText}
          filename={cartaoState.filename}
        />
      )}
      {feriasState && (
        <FeriasReviewDialog
          open={feriasState !== null}
          onOpenChange={(o) => !o && setFeriasState(null)}
          parsed={feriasState.parsed}
          ocrText={feriasState.ocrText}
          filename={feriasState.filename}
        />
      )}
      {faltasState && (
        <FaltasReviewDialog
          open={faltasState !== null}
          onOpenChange={(o) => !o && setFaltasState(null)}
          parsed={faltasState.parsed}
          ocrText={faltasState.ocrText}
          filename={faltasState.filename}
        />
      )}
    </div>
  );
}
