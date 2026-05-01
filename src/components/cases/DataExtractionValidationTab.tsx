/**
 * DataExtractionValidationTab — wrapper trivial sobre DocumentOcrValidation
 * para o modo `data_extraction` (v4).
 *
 * Após o cleanup massivo, não há mais sub-etapas / stepper / composição.
 * Cada documento ganha um botão "Baixar CSV/ZIP" no card quando o OCR é
 * confirmado (ver DocumentOcrValidation + ExtractionTypeBadgeAndSelect).
 */
import { Card, CardContent } from "@/components/ui/card";
import { DocumentOcrValidation } from "./DocumentOcrValidation";

interface Props {
  caseId: string;
  mode: "calculation" | "data_extraction";
}

export function DataExtractionValidationTab({ caseId, mode }: Props) {
  if (mode !== "data_extraction") {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Este caso não está em modo "Extração de Dados".
        </CardContent>
      </Card>
    );
  }

  return (
    <DocumentOcrValidation
      caseId={caseId}
      showExtractionTypeBadges
      showDownloadButton
      onGoToCalculo={async () => {
        /* noop — não há mais "avançar" */
      }}
    />
  );
}
