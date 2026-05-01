/**
 * DataExtractionValidationTab — orquestrador da aba Validação no modo
 * data_extraction. Máquina de estados de 2 sub-etapas:
 *
 *   ① OCR     → reusa DocumentOcrValidation com props extras
 *                 (showExtractionTypeSelector + canAdvance + advanceLabel)
 *   ② Extração → ExtractionStep (lista + split view planilha+PDF)
 *
 * Heurística pra abrir direto na sub-etapa 2:
 *   se TODOS os docs com tipo_extracao !== 'nao_extrair' já têm
 *   ocr_validated=true E pelo menos 1 tem extracao_status='done',
 *   começa em 'extracao'. Caso contrário, em 'ocr'.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentOcrValidation } from "./DocumentOcrValidation";
import { ExtractionStepper, type ExtractionStep as Step } from "./data-extraction/ExtractionStepper";
import { ExtractionStep } from "./data-extraction/ExtractionStep";
import { ComposicaoExportDialog } from "./data-extraction/ComposicaoExportDialog";

interface Props {
  caseId: string;
  caseSlug: string;
  numeroProcesso: string | null;
  mode: "calculation" | "data_extraction";
}

interface DocSnapshot {
  id: string;
  ocr_validated: boolean | null;
  tipo_extracao: string | null;
  extracao_status: string | null;
  validation_status: string | null;
}

export function DataExtractionValidationTab({
  caseId,
  caseSlug,
  numeroProcesso,
  mode,
}: Props) {
  const [step, setStep] = useState<Step>("ocr");
  const [openCompose, setOpenCompose] = useState(false);
  const [autoStepDecided, setAutoStepDecided] = useState(false);

  // Snapshot leve dos docs pra decisões (sub-etapa atual + canAdvance OCR)
  const { data: docs = [] } = useQuery({
    queryKey: ["docs-snapshot", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, ocr_validated, tipo_extracao, extracao_status, validation_status")
        .eq("case_id", caseId);
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).map((d) => ({
        id: d.id as string,
        ocr_validated: d.ocr_validated as boolean | null,
        tipo_extracao: (d.tipo_extracao as string | null) ?? null,
        extracao_status: (d.extracao_status as string | null) ?? null,
        validation_status: (d.validation_status as string | null) ?? null,
      })) as DocSnapshot[];
    },
    refetchInterval: 5000, // refresh leve, evita stale UI
  });

  // Heurística: já avança pra extração se OCR já completo + algum extraído
  useEffect(() => {
    if (autoStepDecided) return;
    if (docs.length === 0) return;
    const extractables = docs.filter(
      (d) => d.tipo_extracao && d.tipo_extracao !== "nao_extrair",
    );
    if (extractables.length === 0) {
      setAutoStepDecided(true);
      return;
    }
    const allOcrValidated = extractables.every((d) => d.ocr_validated === true);
    const someExtracted = extractables.some((d) => d.extracao_status === "done");
    if (allOcrValidated && someExtracted) {
      setStep("extracao");
    }
    setAutoStepDecided(true);
  }, [docs, autoStepDecided]);

  if (mode !== "data_extraction") {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Este caso não está em modo "Extração de Dados".
        </CardContent>
      </Card>
    );
  }

  // canAdvance pra sub-etapa OCR: todos OCR validados E pelo menos 1 doc
  // com tipo de extração escolhido.
  const canAdvanceFromOcr = (docRows: { ocr_validated: boolean | null; tipo_extracao?: string | null }[]) => {
    if (docRows.length === 0) return false;
    const allValidated = docRows.every((d) => d.ocr_validated === true);
    const hasExtractable = docRows.some(
      (d) => d.tipo_extracao && d.tipo_extracao !== "nao_extrair",
    );
    return allValidated && hasExtractable;
  };

  // Razão "bloqueado" customizada quando OCR está validado mas faltou tipo
  const advanceBlockedReason =
    "Selecione o tipo de extração de pelo menos 1 documento (Holerite, Recibo de Férias ou Registro de Faltas).";

  return (
    <div className="space-y-4">
      <ExtractionStepper
        current={step}
        ocrComplete={canAdvanceFromOcr(docs)}
        onClickStep={(s) => setStep(s)}
      />

      {step === "ocr" && (
        <DocumentOcrValidation
          caseId={caseId}
          showExtractionTypeBadges
          advanceLabel="Avançar para extração"
          canAdvance={canAdvanceFromOcr}
          advanceBlockedReason={advanceBlockedReason}
          onGoToCalculo={async () => setStep("extracao")}
        />
      )}

      {step === "extracao" && (
        <ExtractionStep
          caseId={caseId}
          onBack={() => setStep("ocr")}
          onCompose={() => setOpenCompose(true)}
        />
      )}

      <ComposicaoExportDialog
        open={openCompose}
        onOpenChange={setOpenCompose}
        caseId={caseId}
        caseSlug={caseSlug}
        numeroProcesso={numeroProcesso}
      />
    </div>
  );
}
