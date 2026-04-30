/**
 * ExtractionStepper — stepper compacto que mostra as 2 sub-etapas do
 * modo data_extraction:
 *   ① Validar OCR  →  ② Extrair e classificar
 *
 * Permite voltar pra OCR clicando no badge.
 */
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, CheckCircle2 } from "lucide-react";

export type ExtractionStep = "ocr" | "extracao";

interface Props {
  current: ExtractionStep;
  ocrComplete: boolean;
  onClickStep: (s: ExtractionStep) => void;
}

export function ExtractionStepper({ current, ocrComplete, onClickStep }: Props) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2 flex-wrap">
        <StepBadge
          n={1}
          label="Validar OCR"
          active={current === "ocr"}
          completed={ocrComplete && current !== "ocr"}
          onClick={() => onClickStep("ocr")}
        />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <StepBadge
          n={2}
          label="Extrair e classificar"
          active={current === "extracao"}
          disabled={!ocrComplete}
          onClick={() => ocrComplete && onClickStep("extracao")}
        />
      </CardContent>
    </Card>
  );
}

function StepBadge({
  n,
  label,
  active,
  completed,
  disabled,
  onClick,
}: {
  n: number;
  label: string;
  active: boolean;
  completed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "step" : undefined}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : completed
            ? "bg-green-600/15 text-green-700 dark:text-green-400 hover:bg-green-600/25"
            : disabled
              ? "bg-muted/50 text-muted-foreground/60 cursor-not-allowed"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      <span
        className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
          active
            ? "bg-primary-foreground/20"
            : completed
              ? "bg-green-600/20"
              : "bg-background/60"
        }`}
      >
        {completed ? <CheckCircle2 className="h-3 w-3" /> : n}
      </span>
      {label}
    </button>
  );
}
