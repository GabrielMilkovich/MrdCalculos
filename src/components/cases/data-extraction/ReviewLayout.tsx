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
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
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
  /**
   * Callback de confirmação. F0.4: recebe `bloqueioBurlado=true` quando o
   * operador marcou o checkbox override "Confirmo que revisei manualmente
   * cada divergência acima" — possível apenas se `divergenciasCount > 0`.
   * Caller deve propagar pra `logCsvExport({ bloqueioBurlado })`.
   */
  onConfirm: (opts?: { bloqueioBurlado: boolean }) => Promise<void> | void;
  confirmDisabled?: boolean;
  /**
   * F0.4 — quantidade de divergências detectadas (linhas rejeitadas + warnings
   * críticos do parser/builder). Quando > 0, exige 4º checkbox override
   * "Confirmo que revisei manualmente cada divergência acima" e setamos
   * `bloqueioBurlado=true` no callback.
   */
  divergenciasCount?: number;
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
const LS_KEY_OCR_HIDDEN = "review-layout:ocr-hidden";

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
  divergenciasCount,
  layoutKey,
}: Props) {
  const lsSuffix = layoutKey ? `:${layoutKey}` : "";

  // Gate de confirmação removido: divergências e perdas continuam visíveis
  // no `CsvBuildReportPanel` que cada dialog mostra após o build, e a
  // telemetria (csv_export_telemetry) registra rejeições/warnings/campos
  // não exportados em todo download. Sem checklist forçado.
  const [downloading, setDownloading] = useState(false);

  // Preferências de layout — restauradas do localStorage.
  const [fullscreen, setFullscreen] = useState<boolean>(() =>
    readLs(LS_KEY_FULLSCREEN + lsSuffix, false),
  );
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(() =>
    readLs(LS_KEY_HEADER_COLLAPSED + lsSuffix, false),
  );
  // OCR começa OCULTO por padrão — a planilha ocupa toda a área e o
  // operador ganha tela útil. O botão "Mostrar OCR" no header reexibe
  // pontualmente quando ele quer comparar com a referência.
  const [ocrHidden, setOcrHidden] = useState<boolean>(() =>
    readLs(LS_KEY_OCR_HIDDEN + lsSuffix, true),
  );
  const ocrPanelInitial = readLs(LS_KEY_OCR_PANEL_SIZE + lsSuffix, 50);

  useEffect(() => {
    writeLs(LS_KEY_FULLSCREEN + lsSuffix, fullscreen);
  }, [fullscreen, lsSuffix]);
  useEffect(() => {
    writeLs(LS_KEY_HEADER_COLLAPSED + lsSuffix, headerCollapsed);
  }, [headerCollapsed, lsSuffix]);
  useEffect(() => {
    writeLs(LS_KEY_OCR_HIDDEN + lsSuffix, ocrHidden);
  }, [ocrHidden, lsSuffix]);

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
      // NÃO fechamos o dialog aqui — onConfirm tipicamente abre o painel
      // CsvBuildReportPanel (que vive DENTRO deste dialog). Fechar aqui
      // desmonta o painel antes do operador conseguir clicar "Baixar".
      // Quem fecha é o handleDownloadConfirmed do caller, depois que o
      // triggerBlobDownload de fato disparou o arquivo.
      await onConfirm({ bloqueioBurlado: false });
    } catch (err) {
      // Erro silencioso era pior que o bug — surfaca no console e via toast.
      console.error("[ReviewLayout] onConfirm falhou:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao gerar CSV: ${msg.slice(0, 200)}`);
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
                className="h-7 px-2 text-[11px] gap-1"
                onClick={() => setOcrHidden((v) => !v)}
                title={
                  ocrHidden
                    ? "Mostrar painel do OCR (referência)"
                    : "Ocultar painel do OCR — a planilha ocupa toda a área. Você pode reexibir a qualquer momento."
                }
              >
                {ocrHidden ? (
                  <>
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                    Mostrar OCR
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="h-3.5 w-3.5" />
                    Ocultar OCR
                  </>
                )}
              </Button>
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

        {/* Banner "Atenção — revise antes de baixar" REMOVIDO por feedback
            do user: era visualmente intrusivo e duplicava info que já fica
            visível na tabela (linhas REVISAR_OCR em rose, contagem no
            header colapsável). Warnings continuam acessíveis via tooltip
            das linhas marcadas. */}

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

        {/* Área principal: OCR + Tabela.
            Quando `ocrHidden`, a tabela ocupa 100% — modo "ganhar tela".
            Quando visível, painéis redimensionáveis mantêm controle do operador.
            Em ambos os casos, o painel da tabela é IDENTICAL para evitar
            re-render destrutivo dos inputs ao alternar visibilidade. */}
        {ocrHidden ? (
          <div className="flex-1 min-h-0 rounded-md border flex flex-col">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-muted/30 border-b flex items-center justify-between">
              <span>Dados extraídos (editáveis)</span>
              <span className="text-muted-foreground font-normal normal-case text-[10px]">
                OCR oculto · clique em "Mostrar OCR" no topo para reexibir
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          </div>
        ) : (
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
        )}

        <DialogFooter className="gap-2 pt-2 border-t">
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
            onClick={() => {
              if (!downloading) handleConfirm();
            }}
            disabled={confirmDisabled || downloading}
            className="gap-1.5"
            title="Baixar CSV — divergências e perdas, se houver, ficam visíveis no painel de relatório do build."
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Baixar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
