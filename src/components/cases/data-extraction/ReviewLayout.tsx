/**
 * Layout compartilhado pelos 4 Review Dialogs (cartão de ponto, férias,
 * faltas, holerite).
 *
 * Estrutura:
 *   ┌──────── Header com tipo + filename + tela cheia ──────┐
 *   │ Banner amber se houver warnings/unparsed              │
 *   ├──── PAINEL OCR ──┊── PAINEL TABELA ──────────────────┤
 *   │  read-only,      ┊   editável (children)             │
 *   │  highlights      ┊                                   │
 *   │  (RESIZABLE: drag o divisor para ajustar)            │
 *   ├──────────────────┴───────────────────────────────────┤
 *   │ ☑ Datas  ☑ Valores  ☑ Cobertura                       │
 *   │ [Cancelar]   [Confirmar e baixar CSV]                 │
 *   └───────────────────────────────────────────────────────┘
 *
 * UX (PR de ampliação):
 *   - Painéis OCR | tabela são REDIMENSIONÁVEIS (drag horizontal). Tamanho
 *     persistido em localStorage.
 *   - Botão "tela cheia" maximiza o dialog (100vw / 100vh) — útil em
 *     monitores grandes / quando OCR é denso. Estado persistido.
 *   - Tipografia AMPLIADA no OCR (text-sm leading-6) e tabela (text-[13px]
 *     com h-9 nos inputs) para leitura confortável de dados densos.
 *   - Header colapsável: clique no chevron para esconder o subtitle e
 *     headerSlot quando precisar ganhar espaço vertical.
 *
 * Ressalva: o preview NUNCA permite baixar sem o checklist de 3 itens,
 * porque o gate humano é a garantia de cobertura 100% do conteúdo OCR.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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
  /**
   * Identificador estável (ex: filename + tipo) para persistir preferências
   * de layout (split, fullscreen) por documento. Quando ausente, persiste
   * globalmente via key "default".
   */
  layoutKey?: string;
}

const LS_KEY_FULLSCREEN = "review-layout:fullscreen";
const LS_KEY_OCR_PANEL_SIZE = "review-layout:ocr-panel-size";
const LS_KEY_HEADER_COLLAPSED = "review-layout:header-collapsed";

function readLs<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLs(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
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
  layoutKey,
}: Props) {
  const lsSuffix = layoutKey ? `:${layoutKey}` : "";

  // Checklist de 3 itens dirigidos — força atenção em pontos específicos
  // antes de liberar o download. UX gate: única coisa entre revisão
  // visual e o CSV juridicamente vinculante.
  const [conferiuDatas, setConferiuDatas] = useState(false);
  const [conferiuValores, setConferiuValores] = useState(false);
  const [conferiuCobertura, setConferiuCobertura] = useState(false);
  const conferido = conferiuDatas && conferiuValores && conferiuCobertura;
  const [downloading, setDownloading] = useState(false);

  // Preferências de layout — restauradas do localStorage.
  const [fullscreen, setFullscreen] = useState<boolean>(() =>
    readLs(LS_KEY_FULLSCREEN + lsSuffix, false),
  );
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(() =>
    readLs(LS_KEY_HEADER_COLLAPSED + lsSuffix, false),
  );
  const ocrPanelInitial = readLs(LS_KEY_OCR_PANEL_SIZE + lsSuffix, 50);

  useEffect(() => {
    writeLs(LS_KEY_FULLSCREEN + lsSuffix, fullscreen);
  }, [fullscreen, lsSuffix]);
  useEffect(() => {
    writeLs(LS_KEY_HEADER_COLLAPSED + lsSuffix, headerCollapsed);
  }, [headerCollapsed, lsSuffix]);

  const linhasOcr = useMemo(() => ocrText.split(/\r?\n/), [ocrText]);
  const unparsedSet = useMemo(
    () => new Set(unparsedLines ?? []),
    [unparsedLines],
  );
  const outOfWindowSet = useMemo(
    () => new Set(outOfWindowLines ?? []),
    [outOfWindowLines],
  );

  // Auto-scroll do OCR para a primeira linha problemática quando o
  // dialog abre — a maior dor era ter que rolar manualmente para achar.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const primeiraProblema = [...outOfWindowSet, ...unparsedSet].sort(
        (a, b) => a - b,
      )[0];
      if (!primeiraProblema) return;
      const el = document.querySelector(
        `[data-ocr-line="${primeiraProblema}"]`,
      ) as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => clearTimeout(t);
  }, [open, outOfWindowSet, unparsedSet]);

  const handleConfirm = async () => {
    setDownloading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  // Em fullscreen, o dialog ocupa 100% da viewport. Senão, mantém o cap
  // anterior (96vw / 1600px) que é confortável em monitores 1080p.
  const dialogClass = fullscreen
    ? "w-screen h-screen max-w-none max-h-none rounded-none p-4 flex flex-col gap-2"
    : "w-[96vw] max-w-[1700px] max-h-[94vh] overflow-hidden flex flex-col sm:w-[96vw]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setHeaderCollapsed((v) => !v)}
                title={
                  headerCollapsed
                    ? "Expandir cabeçalho"
                    : "Recolher cabeçalho (ganha mais espaço vertical)"
                }
              >
                {headerCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setFullscreen((v) => !v)}
                title={
                  fullscreen
                    ? "Sair da tela cheia"
                    : "Tela cheia (recomendado em monitores grandes)"
                }
              >
                {fullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          {!headerCollapsed && subtitle && (
            <DialogDescription className="text-xs">{subtitle}</DialogDescription>
          )}
          {!headerCollapsed && headerSlot && (
            <div className="flex items-center gap-2 pt-1">{headerSlot}</div>
          )}
        </DialogHeader>

        {/* Avisos */}
        {!headerCollapsed &&
          ((warnings && warnings.length > 0) || unparsedSet.size > 0) && (
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

        {!headerCollapsed && contadores && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="text-[11px]">
              {contadores.extraidos} {contadores.etiqueta} extraído
              {contadores.extraidos === 1 ? "" : "s"}
            </Badge>
            {linhasOcr.length > 0 && (
              <Badge variant="outline" className="text-[11px]">
                {linhasOcr.length} linha(s) no OCR
              </Badge>
            )}
          </div>
        )}

        {/* Split view OCR | Tabela editável — REDIMENSIONÁVEL */}
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 min-h-0 rounded-md border"
          onLayout={(sizes) => {
            // Persiste o tamanho do painel OCR (primeiro). Soma sempre 100.
            if (sizes && sizes.length >= 1) {
              writeLs(LS_KEY_OCR_PANEL_SIZE + lsSuffix, Math.round(sizes[0]));
            }
          }}
        >
          {/* OCR */}
          <ResizablePanel
            defaultSize={ocrPanelInitial}
            minSize={20}
            className="flex flex-col min-h-0"
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-muted/30 border-b flex items-center justify-between">
              <span>Texto do OCR (referência)</span>
              <span className="text-muted-foreground font-normal normal-case text-[10px]">
                {linhasOcr.length} linhas · clique numa linha da tabela para
                navegar aqui
              </span>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <pre
                className="text-sm font-mono leading-6 p-3 whitespace-pre-wrap"
                data-ocr-pre
              >
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
                    <div
                      key={linhaNum}
                      className={`transition-colors ${cls}`}
                      data-ocr-line={linhaNum}
                    >
                      <span className="text-muted-foreground select-none mr-2">
                        {String(linhaNum).padStart(4, " ")}
                      </span>
                      {linha || " "}
                    </div>
                  );
                })}
              </pre>
            </ScrollArea>
          </ResizablePanel>
          <ResizableHandle withHandle />
          {/* Tabela editável (children) */}
          <ResizablePanel minSize={30} className="flex flex-col min-h-0">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-muted/30 border-b">
              Dados extraídos (editáveis)
            </div>
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Gate de confirmação — checklist de 3 itens dirigidos.
            Em fullscreen, layout horizontal pra economizar altura. */}
        <div
          className={`border-t pt-3 ${fullscreen ? "flex items-center gap-4 flex-wrap" : "space-y-1.5"}`}
        >
          {!fullscreen && (
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Confirme antes de baixar:
            </p>
          )}
          <label className="flex items-start gap-2 text-xs select-none cursor-pointer">
            <Checkbox
              checked={conferiuDatas}
              onCheckedChange={(v) => setConferiuDatas(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              <strong>Datas</strong>
              {!fullscreen && (
                <>
                  {" "}conferem com o período do documento — sem datas fora da
                  janela e sem dias faltando.
                </>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs select-none cursor-pointer">
            <Checkbox
              checked={conferiuValores}
              onCheckedChange={(v) => setConferiuValores(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              <strong>Valores</strong>
              {!fullscreen && (
                <>
                  {" "}(horários / rubricas / dias) batem com o OCR — soma de
                  batidas corresponde ao Horas Trabalhadas declarado.
                </>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs select-none cursor-pointer">
            <Checkbox
              checked={conferiuCobertura}
              onCheckedChange={(v) => setConferiuCobertura(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              <strong>Cobertura</strong>
              {!fullscreen && (
                <>
                  {" "}completa — nenhuma linha amarela do OCR ficou sem virar
                  uma linha aqui, e eventos relevantes (HE, banco de horas,
                  faltas) foram preservados.
                </>
              )}
            </span>
          </label>
        </div>

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
