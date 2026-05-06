/**
 * HoleritePreviewDialog — UI v2 (estilo planilha) para revisar a
 * categorização das rubricas antes de gerar o ZIP.
 *
 * Layout:
 *   ┌─ Holerite 08/2019 — 11 rubricas ─────────────────────────────┐
 *   │ [Buscar...] [Ações em lote ▼]      Mostrando 11 de 11        │
 *   │                                                                │
 *   │  ☑   Cod   Nome              Valor    Categoria       Flag    │
 *   │  ☑  0501  DSR(Comissão)     272,64   DSR ▼          (hint)  │
 *   │  ☑  0620  Comissões        1.158,82  Comissões ▼    (hint)  │
 *   │  ☐  5560  INSS              -188,77  Ignorado ▼     (descto) │
 *   │  ⚠  9999  BONUS XYZ          500,00  Salário Fixo ▼ (revise) │
 *   │  ...                                                            │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ Total no ZIP final:                                            │
 *   │   • Comissões        1.312,86                                  │
 *   │   • DSR                272,64                                  │
 *   │   • Premiações         461,44                                  │
 *   │   • Salário Fixo       500,00 ⚠ revise                         │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │ [Cancelar]                       [Confirmar e baixar ZIP]      │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Estado vive só no modal — sem persistência. Cancelar = nada salvo.
 * Confirmar = chama buildHoleriteZip + dispara download.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Loader2,
  Search,
  Sparkles,
  XCircle,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildHoleriteZipWithReport,
  logCsvExport,
  scoreHolerite,
  triggerBlobDownload,
  type BuildReport,
  type CategoriaSlug,
  type ClassificacaoHolerite,
  type LinhaClassificada,
} from "@/features/data-extraction";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import { SugerirBucketIA } from "./SugerirBucketIA";
import {
  type HoleriteParseResult,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classificacao: ClassificacaoHolerite;
  /** HoleriteParseResult cru — preservado para futura sugestão de bucket por IA. */
  parsed?: HoleriteParseResult;
  filename: string;
  /** Opcional — preservado para futuras integrações (ex: telemetria). */
  documentId?: string;
  /** OCR original — usado no scoring de confiança. */
  ocrText?: string;
}

const CATEGORIA_LABELS: Record<CategoriaSlug, string> = {
  salario_fixo: "Salário Fixo",
  comissao: "Comissões",
  dsr: "DSR",
  premiacao: "Premiações",
  minimo_garantido: "Mínimo Garantido",
  salario_familia: "Salário-família",
};

const CATEGORIA_ORDER: CategoriaSlug[] = [
  "salario_fixo",
  "comissao",
  "dsr",
  "premiacao",
  "minimo_garantido",
  "salario_familia",
];

const ORIGEM_BADGE: Record<
  LinhaClassificada["origem"],
  { label: string; tone: "default" | "amber" | "muted" | "red" }
> = {
  hint: { label: "auto", tone: "default" },
  fallback: { label: "revise", tone: "amber" },
  desconto: { label: "desconto", tone: "muted" },
  ignorar_hint: { label: "ignorado", tone: "muted" },
};

export function HoleritePreviewDialog({
  open,
  onOpenChange,
  classificacao,
  parsed: _parsed,
  filename,
  documentId: _documentId,
  ocrText,
}: Props) {
  const effectiveClassificacao = classificacao;

  const [linhas, setLinhas] = useState<LinhaClassificada[]>(
    effectiveClassificacao.linhas,
  );
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");

  // Reset quando classificacao efetiva mudar (novo doc OU troca regex/IA).
  useEffect(() => {
    setLinhas(effectiveClassificacao.linhas);
    setSearch("");
  }, [effectiveClassificacao]);

  const updateLinha = (key: string, patch: Partial<LinhaClassificada>) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) => {
      const cod = (l.rubrica.codigo ?? "").toLowerCase();
      const nome = l.rubrica.nome.toLowerCase();
      return cod.includes(q) || nome.includes(q);
    });
  }, [linhas, search]);

  const totals = useMemo(() => {
    const map = new Map<CategoriaSlug, { soma: number; hasFallback: boolean }>();
    for (const l of linhas) {
      if (!l.incluir || l.categoria === null) continue;
      if (l.valorParaCsv <= 0) continue;
      const cur = map.get(l.categoria) ?? { soma: 0, hasFallback: false };
      cur.soma += l.valorParaCsv;
      if (l.origem === "fallback") cur.hasFallback = true;
      map.set(l.categoria, cur);
    }
    return map;
  }, [linhas]);

  const totalLinhasIncluidas = linhas.filter(
    (l) => l.incluir && l.categoria !== null && l.valorParaCsv > 0,
  ).length;

  // Score de confiança da extração (recalcula quando linhas mudam, p.ex.
  // se o usuário corrige rubricas).
  const confidence = useMemo(
    () =>
      scoreHolerite(
        {
          competencia: effectiveClassificacao.competencia,
          rubricas: linhas.map((l) => l.rubrica),
          layout_usado: effectiveClassificacao.layout_usado,
          warnings: effectiveClassificacao.warnings,
        },
        ocrText ?? "",
      ),
    [effectiveClassificacao, linhas, ocrText],
  );

  // Ações em lote
  const setIncluirAll = (predicate: (l: LinhaClassificada) => boolean, v: boolean) => {
    setLinhas((prev) =>
      prev.map((l) => (predicate(l) ? { ...l, incluir: v } : l)),
    );
  };

  const [reportPreview, setReportPreview] = useState<{
    blob: Blob;
    report: BuildReport;
  } | null>(null);

  const handleConfirmar = async () => {
    setDownloading(true);
    try {
      const { blob, report } = await buildHoleriteZipWithReport({
        ...classificacao,
        linhas,
      });
      setReportPreview({ blob, report });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadConfirmed = async () => {
    if (!reportPreview) return;
    setDownloading(true);
    try {
      triggerBlobDownload(reportPreview.blob, filename);
      void logCsvExport({
        builder: "holerite",
        report: reportPreview.report,
        documentId: _documentId ?? null,
        baixadoComPerdas: reportPreview.report.linhasRejeitadas.length > 0,
        parserOrigem: `regex_v5_holerite|${effectiveClassificacao.layout_usado}`,
      });
      setReportPreview(null);
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  const totalCategorias = totals.size;
  const showingCount = filtered.length;

  // Bloqueia download quando competência não foi detectada/é inválida.
  // Holerite sem competência válida (MM/yyyy entre 01-12) não tem como
  // entrar corretamente no histórico salarial — o engine de cálculo
  // alocaria as rubricas em mês indefinido. Erro juridicamente grave.
  const RE_COMPETENCIA_VALIDA = /^(0[1-9]|1[0-2])\/\d{4}$/;
  const competenciaInvalida =
    !effectiveClassificacao.competencia ||
    !RE_COMPETENCIA_VALIDA.test(effectiveClassificacao.competencia);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1500px] max-h-[94vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <DialogTitle>Conferir antes de baixar</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <ConfidenceBadge score={confidence} />
            </div>
          </div>
          <DialogDescription className="text-xs">
            Holerite <strong>{effectiveClassificacao.competencia}</strong> · layout{" "}
            <code className="text-[10px]">{effectiveClassificacao.layout_usado}</code> ·{" "}
            {linhas.length} rubrica{linhas.length === 1 ? "" : "s"} extraída
            {linhas.length === 1 ? "" : "s"} · {totalLinhasIncluidas} entram no
            ZIP
          </DialogDescription>
        </DialogHeader>

        {competenciaInvalida && (
          <div className="border border-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded p-2 text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-medium text-rose-900 dark:text-rose-100">
              <AlertTriangle className="h-3.5 w-3.5" /> Competência inválida —
              download bloqueado
            </div>
            <p className="text-[11px] text-rose-900/80 dark:text-rose-100/80">
              A competência detectada é{" "}
              <code className="text-[10px] bg-rose-100 dark:bg-rose-950/40 px-1 rounded">
                {effectiveClassificacao.competencia || "(vazio)"}
              </code>
              . Holerites devem ter competência no formato MM/AAAA (mês
              01–12). Sem competência válida, as rubricas não podem entrar
              corretamente no histórico salarial. Reabra o documento e ajuste
              a competência manualmente, ou re-execute a IA em modo profundo.
            </p>
          </div>
        )}

        {classificacao.warnings.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" /> Avisos do parser
            </div>
            {classificacao.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="text-amber-800 dark:text-amber-200">
                · {w}
              </div>
            ))}
          </div>
        )}

        {/* Toolbar: busca + ações em lote */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código ou nome..."
              className="pl-7 h-8 text-xs"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Ações em lote
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                onClick={() => setIncluirAll(() => true, true)}
              >
                Selecionar todas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIncluirAll(() => true, false)}
              >
                Limpar seleção
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIncluirAll((l) => l.origem === "hint", true)}
              >
                Selecionar só "auto" (hint casado)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setIncluirAll((l) => l.origem === "fallback", false)
                }
              >
                Excluir todos "revise" (sem hint)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {showingCount} de {linhas.length}
          </span>
        </div>

        {/* Tabela única */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0">
                <TableRow>
                  <TableHead className="w-[40px] text-[10px]"></TableHead>
                  <TableHead className="w-[60px] text-[10px]">Cód</TableHead>
                  <TableHead className="text-[10px]">Nome</TableHead>
                  <TableHead className="w-[100px] text-right text-[10px]">
                    Valor
                  </TableHead>
                  <TableHead className="w-[180px] text-[10px]">
                    Categoria
                  </TableHead>
                  <TableHead className="w-[80px] text-[10px]">Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      Nenhuma rubrica casa com "{search}".
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((l) => (
                  <LinhaRow key={l.key} linha={l} onUpdate={updateLinha} />
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        {/* Resumo do CSV final */}
        <div className="border rounded-md bg-muted/20 p-2.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total que vai pro ZIP final ({totalCategorias} CSV
            {totalCategorias === 1 ? "" : "s"})
          </div>
          {totals.size === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              Nada selecionado — ZIP terá apenas LEIA-ME.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              {CATEGORIA_ORDER.map((slug) => {
                const t = totals.get(slug);
                if (!t) return null;
                return (
                  <div
                    key={slug}
                    className="flex justify-between items-center"
                  >
                    <span className="flex items-center gap-1">
                      {CATEGORIA_LABELS[slug]}
                      {t.hasFallback && (
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      )}
                    </span>
                    <span className="font-mono font-semibold">
                      R$ {t.soma.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
            onClick={handleConfirmar}
            disabled={
              downloading || totalCategorias === 0 || competenciaInvalida
            }
            className="gap-1.5"
            title={
              competenciaInvalida
                ? `Competência "${effectiveClassificacao.competencia || "vazia"}" inválida. Corrija antes de baixar — o cálculo trabalhista não pode alocar rubricas sem mês de referência válido.`
                : undefined
            }
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Confirmar e baixar ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
      <CsvBuildReportPanel
        open={!!reportPreview}
        onOpenChange={(o) => {
          if (!o && !downloading) setReportPreview(null);
        }}
        nomeRecurso={`holerite ${effectiveClassificacao.competencia}`}
        report={reportPreview?.report ?? { linhasGeradas: 0, linhasRejeitadas: [], linhasAjustadas: [], warnings: [] }}
        onConfirm={handleDownloadConfirmed}
        loading={downloading}
      />
    </Dialog>
  );
}

// =====================================================
// Linha individual
// =====================================================

function LinhaRow({
  linha,
  onUpdate,
}: {
  linha: LinhaClassificada;
  onUpdate: (key: string, patch: Partial<LinhaClassificada>) => void;
}) {
  const venc = linha.rubrica.valor_vencimento;
  const desc = linha.rubrica.valor_desconto;
  const valorMostrado = venc !== null && venc > 0 ? venc : (desc ?? 0);
  const isDesconto = linha.origem === "desconto";

  const currentValue: CategoriaSlug | "ignorar" = linha.categoria ?? "ignorar";
  const badge = ORIGEM_BADGE[linha.origem];

  // Highlight por origem
  const rowClass =
    linha.origem === "fallback"
      ? "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10"
      : isDesconto
      ? "text-muted-foreground hover:bg-muted/40"
      : !linha.incluir
      ? "opacity-60 hover:bg-muted/30"
      : "hover:bg-muted/30";

  return (
    <TableRow className={`text-xs ${rowClass}`}>
      <TableCell className="p-1">
        <Checkbox
          checked={linha.incluir}
          onCheckedChange={(v) => onUpdate(linha.key, { incluir: Boolean(v) })}
          disabled={isDesconto}
        />
      </TableCell>
      <TableCell className="p-1 font-mono text-[11px] text-muted-foreground">
        {linha.rubrica.codigo ?? "—"}
      </TableCell>
      <TableCell className="p-1 truncate max-w-0">
        <span title={linha.rubrica.nome}>{linha.rubrica.nome}</span>
      </TableCell>
      <TableCell className="p-1 text-right font-mono text-[11px]">
        {isDesconto ? (
          <span className="text-rose-600 dark:text-rose-400">
            -{valorMostrado.toFixed(2).replace(".", ",")}
          </span>
        ) : (
          valorMostrado.toFixed(2).replace(".", ",")
        )}
      </TableCell>
      <TableCell className="p-1">
        <Select
          value={currentValue}
          disabled={isDesconto}
          onValueChange={(v) => {
            if (v === "ignorar") {
              onUpdate(linha.key, { categoria: null, incluir: false });
            } else {
              onUpdate(linha.key, {
                categoria: v as CategoriaSlug,
                incluir: linha.valorParaCsv > 0,
              });
            }
          }}
        >
          <SelectTrigger className="h-6 text-[11px] w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIA_ORDER.map((slug) => (
              <SelectItem key={slug} value={slug} className="text-xs">
                {CATEGORIA_LABELS[slug]}
              </SelectItem>
            ))}
            <SelectItem value="ignorar" className="text-xs">
              Ignorar
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1">
        <div className="flex items-center gap-1">
          <OrigemBadge origem={linha.origem} hint={linha.hint} />
          {linha.origem === "fallback" && !isDesconto && (
            <SugerirBucketIA rubricaNome={linha.rubrica.nome} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function OrigemBadge({
  origem,
  hint,
}: {
  origem: LinhaClassificada["origem"];
  hint: LinhaClassificada["hint"];
}) {
  const meta = ORIGEM_BADGE[origem];
  const motivo = hint?.motivo ?? null;
  const Icon =
    origem === "hint"
      ? Sparkles
      : origem === "fallback"
      ? AlertTriangle
      : XCircle;
  const tone =
    meta.tone === "default"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
      : meta.tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"
      : "border-muted bg-muted/40 text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] font-normal ${tone}`}
      title={motivo ?? meta.label}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </Badge>
  );
}
