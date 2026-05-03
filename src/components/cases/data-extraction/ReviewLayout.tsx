/**
 * Layout compartilhado pelos 3 Review Dialogs (cartão de ponto, férias, faltas).
 *
 * Estrutura:
 *   ┌──────── Header com tipo + filename ──────┐
 *   │ Banner amber se houver warnings/unparsed │
 *   ├─────────────────┬────────────────────────┤
 *   │  TEXTO OCR      │   TABELA EDITÁVEL      │
 *   │  (read-only,    │   (extraído, editável) │
 *   │   highlights)   │                        │
 *   ├─────────────────┴────────────────────────┤
 *   │ ☑ Conferi que está completo              │
 *   │ [Cancelar]   [Confirmar e baixar CSV]    │
 *   └──────────────────────────────────────────┘
 *
 * Ressalva: o preview NUNCA permite baixar sem o checkbox de confirmação,
 * porque o gate humano é a garantia de cobertura 100% do conteúdo OCR.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  ocrText: string;
  /** Linhas (1-based) do OCR que ficaram sem casar com nenhum item. */
  unparsedLines?: number[];
  /** Linhas do OCR (1-based) com data fora da janela do espelho. */
  outOfWindowLines?: number[];
  warnings?: string[];
  /** Total de itens extraídos vs total estimado pelo OCR (informativo). */
  contadores?: { extraidos: number; etiqueta: string };
  /** Slot opcional para a badge de confiança no header. */
  headerSlot?: ReactNode;
  children: ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmDisabled?: boolean;
}

export function ReviewLayout({
  open,
  onOpenChange,
  title,
  subtitle,
  ocrText,
  unparsedLines,
  outOfWindowLines,
  warnings,
  contadores,
  headerSlot,
  children,
  onConfirm,
  confirmDisabled,
}: Props) {
  const [conferido, setConferido] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const linhasOcr = useMemo(() => ocrText.split(/\r?\n/), [ocrText]);
  const unparsedSet = useMemo(
    () => new Set(unparsedLines ?? []),
    [unparsedLines],
  );
  const outOfWindowSet = useMemo(
    () => new Set(outOfWindowLines ?? []),
    [outOfWindowLines],
  );

  const handleConfirm = async () => {
    setDownloading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1600px] max-h-[94vh] overflow-hidden flex flex-col sm:w-[96vw]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-xs">{subtitle}</DialogDescription>
          )}
          {headerSlot && <div className="flex items-center gap-2 pt-1">{headerSlot}</div>}
        </DialogHeader>

        {/* Avisos */}
        {((warnings && warnings.length > 0) || unparsedSet.size > 0) && (
          <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              Atenção — revise antes de baixar
            </div>
            {unparsedSet.size > 0 && (
              <div className="text-amber-800 dark:text-amber-200">
                · {unparsedSet.size} linha(s) do OCR com possível dado mas não
                casaram com nenhum item — destacadas em amarelo abaixo.
              </div>
            )}
            {(warnings ?? []).slice(0, 5).map((w, i) => (
              <div key={i} className="text-amber-800 dark:text-amber-200">
                · {w}
              </div>
            ))}
            {(warnings?.length ?? 0) > 5 && (
              <div className="text-[10px] text-amber-700">
                ...e mais {(warnings?.length ?? 0) - 5} aviso(s).
              </div>
            )}
          </div>
        )}

        {contadores && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="text-[10px]">
              {contadores.extraidos} {contadores.etiqueta} extraído
              {contadores.extraidos === 1 ? "" : "s"}
            </Badge>
            {linhasOcr.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {linhasOcr.length} linha(s) no OCR
              </Badge>
            )}
          </div>
        )}

        {/* Split view OCR | Tabela editável */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
          {/* OCR */}
          <div className="border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-muted/30 border-b">
              Texto do OCR (referência)
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <pre className="text-xs font-mono leading-relaxed p-2 whitespace-pre-wrap">
                {linhasOcr.map((linha, idx) => {
                  const linhaNum = idx + 1;
                  const isUnparsed = unparsedSet.has(linhaNum);
                  const isOutOfWindow = outOfWindowSet.has(linhaNum);
                  const cls = isOutOfWindow
                    ? "bg-rose-100 dark:bg-rose-900/40 px-1 rounded"
                    : isUnparsed
                      ? "bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
                      : "";
                  return (
                    <div key={linhaNum} className={cls}>
                      <span className="text-muted-foreground select-none">
                        {String(linhaNum).padStart(3, " ")}
                        {"  "}
                      </span>
                      {linha || " "}
                    </div>
                  );
                })}
              </pre>
            </ScrollArea>
          </div>

          {/* Tabela editável (children) */}
          <div className="border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-muted/30 border-b">
              Dados extraídos (editáveis)
            </div>
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          </div>
        </div>

        {/* Gate de confirmação */}
        <label className="flex items-center gap-2 text-xs select-none border-t pt-3">
          <Checkbox
            checked={conferido}
            onCheckedChange={(v) => setConferido(Boolean(v))}
          />
          <span>
            <strong>Conferi</strong> que todos os dados relevantes do OCR estão
            na tabela ao lado e que nada importante está faltando.
          </span>
        </label>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={downloading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!conferido || confirmDisabled || downloading}
            className="gap-1.5"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Confirmar e baixar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
