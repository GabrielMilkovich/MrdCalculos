import { Sparkles, FileScan, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  ocrProvider?: string | null;
  compact?: boolean;
  className?: string;
}

export function OcrProviderBadge({ ocrProvider, compact, className }: Props) {
  const provider = ocrProvider?.toLowerCase() ?? null;
  const isV7 = provider === "pdfjs_geometric";
  const isOcr = provider === "claude-vision" ||
    provider === "claude_vision" ||
    provider === "mistral_ocr" ||
    provider === "mistral" ||
    provider === "mistral-ocr";

  if (isV7) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800 ${className ?? ""}`}
        title="V7: extração via pdfjs_geometric + mappers v7 (PDF text-native, sem OCR). Texto limpo direto do PDF."
      >
        <Sparkles className="h-3 w-3" />
        {compact ? "V7" : "V7 nativo"}
      </Badge>
    );
  }
  if (isOcr) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 ${className ?? ""}`}
        title="OCR via Claude Vision (PDF escaneado ou V7 falhou). Revise valores numéricos com atenção."
      >
        <FileScan className="h-3 w-3" />
        {compact ? "OCR" : "Claude Vision"}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-muted-foreground ${className ?? ""}`}
      title={
        ocrProvider
          ? `Provider desconhecido: "${ocrProvider}".`
          : "Sem provider registrado — doc antigo ou ainda não processado."
      }
    >
      <HelpCircle className="h-3 w-3" />
      {compact ? "—" : (ocrProvider ?? "sem provider")}
    </Badge>
  );
}
