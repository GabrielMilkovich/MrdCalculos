/**
 * F3.1 — Badge visual indicando qual pipeline extraiu o documento.
 *
 * V7 (pdfjs_geometric)  → verde, "V7 nativo"
 *   PDF text-native lido por unpdf+pdfjs + mappers v7 determinísticos.
 *   Texto LIMPO, sem custo OpenAI, qualidade máxima.
 *
 * V5 (mistral_ocr)      → amber, "V5 OCR"
 *   Fallback OCR Mistral (PDF escaneado ou V7 falhou). Texto pode ter
 *   ruído, parser regex precisa ser mais defensivo.
 *
 * Outros / null         → muted, "—"
 *   Doc ainda não processado, ou pipeline antigo sem registro.
 *
 * Tooltip explica o que cada provider significa para que o operador
 * entenda o contexto antes de revisar o CSV.
 */
import { Sparkles, FileScan, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  ocrProvider?: string | null;
  /** Compact mode: só ícone + sigla (V6/V5/—) sem texto longo. */
  compact?: boolean;
  className?: string;
}

export function OcrProviderBadge({ ocrProvider, compact, className }: Props) {
  const provider = ocrProvider?.toLowerCase() ?? null;
  const isV7 = provider === "pdfjs_geometric";
  const isV5 = provider === "mistral_ocr" ||
    provider === "mistral" ||
    provider === "mistral-ocr";

  if (isV7) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800 ${className ?? ""}`}
        title="V7: extração via pdfjs_geometric + mappers v7 (PDF text-native, sem OCR). Texto limpo direto do PDF — alta qualidade pra mappers determinísticos."
      >
        <Sparkles className="h-3 w-3" />
        {compact ? "V7" : "V7 nativo"}
      </Badge>
    );
  }
  if (isV5) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 ${className ?? ""}`}
        title="V5: OCR Mistral (PDF escaneado ou V7 falhou). Texto pode ter ruído de OCR — revise valores numéricos com atenção."
      >
        <FileScan className="h-3 w-3" />
        {compact ? "V5" : "V5 OCR"}
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
