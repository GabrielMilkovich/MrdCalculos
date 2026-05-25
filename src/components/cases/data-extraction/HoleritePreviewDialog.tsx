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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import { DetalhesTecnicos } from "./DetalhesTecnicos";
import { OntologiaClassificacaoBanner } from "./OntologiaClassificacaoBanner";
import { SugerirBucketIA } from "./SugerirBucketIA";
import { traduzir } from "./glossario-ux";
import {
  type AIInteractionResult,
  type AISuggestion,
} from "./VerifyExtractionAIButton";
import { VerifyParityForenseButton } from "./VerifyParityForenseButton";
import {
  type HoleriteParseResult,
} from "@/features/data-extraction";
import type { LlmStatus } from "@/features/data-extraction/export/per-doc";
import type { ComparacaoResultado } from "@/features/data-extraction/quality/comparador-llm-parser";
import { ComparacaoLLMPanel } from "./ComparacaoLLMPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfirmClassificacoes } from "@/hooks/useConfirmClassificacoes";

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
  /** FASE 3 — status da chamada LLM extractor (shadow check). */
  llmStatus?: LlmStatus;
  /** FASE 3 — comparação parser × LLM (presente quando llmStatus='ok'). */
  comparacao?: ComparacaoResultado;
  /** FASE 3 — confiança autoreportada pela IA (0..100). */
  llmAiConfidence?: number;
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
  // FASE 1.2 — totalizador identificado em linha de rubrica (defesa em
  // profundidade: parser ou nome do item parece totalizador). Vermelho.
  totalizador_suspeito: { label: "totalizador", tone: "red" },
};

export function HoleritePreviewDialog({
  open,
  onOpenChange,
  classificacao,
  parsed,
  filename,
  documentId,
  ocrText,
  llmStatus,
  comparacao,
  llmAiConfidence,
}: Props) {
  const effectiveClassificacao = classificacao;

  const [linhas, setLinhas] = useState<LinhaClassificada[]>(
    effectiveClassificacao.linhas,
  );
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [mostrarApenasRelevantes, setMostrarApenasRelevantes] = useState(true);

  // Deriva caseId do documentId. Necessário pra invocar holerite-classify-confirm
  // antes do build do ZIP — promove tentativas registradas pelo banner.
  const [caseId, setCaseId] = useState<string | null>(null);
  useEffect(() => {
    if (!documentId) {
      setCaseId(null);
      return;
    }
    let cancelado = false;
    void (async () => {
      const { data } = await supabase
        .from('documents')
        .select('case_id')
        .eq('id', documentId)
        .maybeSingle();
      if (!cancelado) setCaseId((data?.case_id as string | null) ?? null);
    })();
    return () => {
      cancelado = true;
    };
  }, [documentId]);

  const { confirm: confirmClassificacoes } = useConfirmClassificacoes(caseId);

  // Reset quando classificacao efetiva mudar (novo doc OU troca regex/IA).
  useEffect(() => {
    setLinhas(effectiveClassificacao.linhas);
    setSearch("");
  }, [effectiveClassificacao]);

  const updateLinha = (key: string, patch: Partial<LinhaClassificada>) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const relevantFilteredLinhas = useMemo(() => {
    if (!mostrarApenasRelevantes) return linhas;
    return linhas.filter(
      (l) => l.origem !== "ignorar_hint" && l.origem !== "desconto" && l.categoria !== null,
    );
  }, [linhas, mostrarApenasRelevantes]);

  const ocultadas = linhas.length - relevantFilteredLinhas.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return relevantFilteredLinhas;
    return relevantFilteredLinhas.filter((l) => {
      const cod = (l.rubrica.codigo ?? "").toLowerCase();
      const nome = l.rubrica.nome.toLowerCase();
      return cod.includes(q) || nome.includes(q);
    });
  }, [relevantFilteredLinhas, search]);

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
  const confidenceBase = useMemo(
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

  // FASE 3.3 — divergência grande entre IA e parser determinístico
  // (taxa_concordancia < 0.70) FORÇA bloqueador, mesmo que o score
  // interno do parser tenha passado. Uma das duas fontes está enganada;
  // operador precisa intervir.
  const confidence = useMemo(() => {
    if (
      llmStatus === "ok" &&
      comparacao &&
      comparacao.taxa_concordancia < 0.70
    ) {
      const pct = Math.round(comparacao.taxa_concordancia * 100);
      return {
        ...confidenceBase,
        bloqueador: true,
        reasons: [
          `BLOQUEADOR: IA e parser concordam em apenas ${pct}% das rubricas (limite ≥70%)`,
          ...confidenceBase.reasons,
        ],
      };
    }
    return confidenceBase;
  }, [confidenceBase, llmStatus, comparacao]);

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

  // F2 — telemetria IA propagada do VerifyExtractionAIButton até logCsvExport.
  const [aiTelemetry, setAiTelemetry] = useState<AIInteractionResult | null>(
    null,
  );
  function handleAISuggestions(suggestions: AISuggestion[]) {
    // Aplica sugestões por field path. Hoje suportamos:
    //   "competencia"           → muda effectiveClassificacao.competencia (read-only aqui)
    //   "rubrica[N].nome"       → muda nome da rubrica N
    //   "rubrica[N].valor_*"    → muda valor da rubrica N
    // Como o estado real é controlado por `linhas` (LinhaClassificada[]),
    // mapeamos rubricas via índice. Sugestões pra `competencia` exigem
    // re-extração e são ignoradas com toast (raras na prática).
    setLinhas((prev) => {
      const next = [...prev];
      for (const s of suggestions) {
        const m = s.field.match(/^rubrica\[(\d+)\]\.(\w+)$/);
        if (!m) continue;
        const idx = parseInt(m[1], 10);
        const campo = m[2];
        if (!next[idx]) continue;
        const linha = { ...next[idx] };
        const rubrica = { ...linha.rubrica };
        if (campo === "nome" && typeof s.suggested === "string") {
          rubrica.nome = s.suggested;
        } else if (
          (campo === "valor_vencimento" || campo === "valor_desconto" ||
            campo === "quantidade") &&
          (typeof s.suggested === "number" || s.suggested === null)
        ) {
          rubrica[campo] = s.suggested as number | null;
        }
        linha.rubrica = rubrica;
        next[idx] = linha;
      }
      return next;
    });
  }

  // F0.4 — checklist gate uniforme com os outros 4 dialogs.
  const [confirmacaoOpen, setConfirmacaoOpen] = useState(false);
  const [conferiuRubricas, setConferiuRubricas] = useState(false);
  const [conferiuValores, setConferiuValores] = useState(false);
  const [conferiuCobertura, setConferiuCobertura] = useState(false);
  const [conferiuDivergencias, setConferiuDivergencias] = useState(false);

  // Reset do checklist a cada abertura — força revisão consciente.
  useEffect(() => {
    if (!confirmacaoOpen) {
      setConferiuRubricas(false);
      setConferiuValores(false);
      setConferiuCobertura(false);
      setConferiuDivergencias(false);
    }
  }, [confirmacaoOpen]);

  // Divergências sinalizadas pelo parser/classifier:
  //   - warnings do parser (cross-validation, bases excluídas, dedup);
  //   - rubricas com origem "fallback" (sem hint óbvio, classificadas
  //     como Salário Fixo por default — operador deve revisar).
  const linhasFallbackIncluidas = linhas.filter(
    (l) => l.incluir && l.origem === "fallback",
  ).length;
  const divergenciasCount =
    classificacao.warnings.length + linhasFallbackIncluidas;
  const exigeOverride = divergenciasCount > 0;
  const conferido =
    conferiuRubricas &&
    conferiuValores &&
    conferiuCobertura &&
    (!exigeOverride || conferiuDivergencias);

  const handleConfirmar = async () => {
    setDownloading(true);
    try {
      // Sprint 3c: antes do build do ZIP, promove tentativas registradas pelo
      // banner para `rubrica_aliases` canônico via edge function. Conflitos
      // (categoria divergente OU observacao_juridica mudou) vêm no retorno
      // mas NÃO bloqueiam o ZIP — operador é notificado e decide depois.
      // ZIP usa state local (`linhas`), independente do que aconteceu na
      // promoção (decisão de produto).
      if (caseId) {
        try {
          const { promovidos, conflitos } = await confirmClassificacoes();
          if (promovidos > 0) {
            toast.success(
              `${promovidos} classificação${promovidos === 1 ? '' : 'ões'} salva${
                promovidos === 1 ? '' : 's'
              } para futuros casos.`,
            );
          }
          if (conflitos.length > 0) {
            toast.warning(
              `${conflitos.length} classificação${
                conflitos.length === 1 ? '' : 'ões'
              } pendente${
                conflitos.length === 1 ? '' : 's'
              } de revisão jurídica (categoria ou observação divergente).`,
            );
          }
        } catch (err) {
          // Falha em promover não impede o ZIP — operador pode reclassificar
          // depois e tentar de novo.
          toast.error(
            `Falha ao promover classificações: ${
              err instanceof Error ? err.message : String(err)
            }. ZIP continua sendo gerado.`,
          );
        }
      }

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
        documentId: documentId ?? null,
        baixadoComPerdas: reportPreview.report.linhasRejeitadas.length > 0,
        bloqueioBurlado: exigeOverride && conferiuDivergencias,
        aiInvoked: aiTelemetry?.aiInvoked ?? false,
        aiChangedFields: aiTelemetry?.aiChangedFields,
        aiConfidence: aiTelemetry?.aiConfidence ?? undefined,
        aiSkippedReason: aiTelemetry?.aiSkippedReason ?? undefined,
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
        <DialogHeader className="shrink-0 space-y-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <DialogTitle>Conferir contracheque: {effectiveClassificacao.competencia || "—"}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <VerifyParityForenseButton
                documentId={documentId ?? ""}
                builder="holerite"
                parsed={parsed}
                pdfDisponivel={!!documentId}
              />
            </div>
          </div>
          <DialogDescription className="text-xs">
            {totalLinhasIncluidas}{" "}
            {totalLinhasIncluidas === 1 ? "verba será considerada" : "verbas serão consideradas"} no cálculo
            {linhasFallbackIncluidas > 0 && (
              <> · <span className="text-amber-700 dark:text-amber-300">{linhasFallbackIncluidas} {linhasFallbackIncluidas === 1 ? "precisa" : "precisam"} de conferência</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        {competenciaInvalida && (
          <div className="shrink-0 border border-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded px-2 py-1 text-[11px] flex items-center gap-1.5 text-rose-900 dark:text-rose-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Mês/ano não identificado:</span>
            <code className="text-[10px] bg-rose-100 dark:bg-rose-950/40 px-1 rounded">
              {effectiveClassificacao.competencia || "(vazio)"}
            </code>
            <span className="text-rose-900/80 dark:text-rose-100/80">
              — corrija o período antes de confirmar.
            </span>
          </div>
        )}

        {/* Banner único consolidado — pendências do operador */}
        {(linhasFallbackIncluidas > 0 || (parsed?.resumo_classificacao && parsed.resumo_classificacao.nao_classificadas > 0)) && (
          <div className="shrink-0 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                  {linhasFallbackIncluidas > 0
                    ? `${linhasFallbackIncluidas} verba${linhasFallbackIncluidas === 1 ? " precisa" : "s precisam"} de conferência antes de continuar`
                    : `${parsed?.resumo_classificacao?.nao_classificadas ?? 0} verba${(parsed?.resumo_classificacao?.nao_classificadas ?? 0) === 1 ? " sem" : "s sem"} categoria definida`}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Revise os itens destacados na tabela abaixo. Você pode classificar manualmente ou usar o assistente IA.
                </p>
              </div>
            </div>
          </div>
        )}

        {parsed?.resumo_classificacao &&
          parsed.resumo_classificacao.nao_classificadas > 0 && (
            <div className="shrink-0">
              <OntologiaClassificacaoBanner
                documentId={documentId}
                resumo={parsed.resumo_classificacao}
              />
            </div>
          )}

        {/* Toolbar: busca + ações em lote */}
        <div className="shrink-0 flex items-center gap-2">
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
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap cursor-pointer select-none">
            <Checkbox
              checked={mostrarApenasRelevantes}
              onCheckedChange={(v) => setMostrarApenasRelevantes(Boolean(v))}
            />
            Só relevantes{ocultadas > 0 && <span className="opacity-70">(oculta {ocultadas})</span>}
          </label>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {showingCount} de {linhas.length}
          </span>
        </div>

        {/* Tabela única — `min-h-0` é obrigatório no flex child que precisa
            encolher; sem isso, banners empurram a tabela e o scroll não
            ativa (CSS bug clássico de flexbox). */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
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

        {/* Detalhes técnicos — colapsável, preserva toda info sem poluir UI */}
        <DetalhesTecnicos
          items={[
            { label: "Método de extração", value: traduzir("layout", effectiveClassificacao.layout_usado) },
            { label: "Confiança do parser", value: `${confidenceBase.score}/100`, tooltip: "Score interno (90+: alta, 60-89: média, <60: baixa)" },
            ...(parsed?.resumo_classificacao ? [{ label: "Verbas não classificadas", value: parsed.resumo_classificacao.nao_classificadas }] : []),
            ...(comparacao ? [{ label: "Concordância parser × IA", value: `${(comparacao.taxa_concordancia * 100).toFixed(0)}%` }] : []),
            { label: "Observações do extrator", value: classificacao.warnings.length },
          ]}
        >
          {classificacao.warnings.length > 0 && (
            <div className="text-xs">
              <p className="font-medium mb-1">Observações do extrator:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {classificacao.warnings.map((w, i) => <li key={i}>· {w}</li>)}
              </ul>
            </div>
          )}
          {confidence.bloqueador === true && confidence.reasons.length > 0 && (
            <div className="text-xs">
              <p className="font-medium mb-1 text-rose-700 dark:text-rose-300">Alertas de consistência:</p>
              <ul className="space-y-0.5 text-rose-600 dark:text-rose-400">
                {confidence.reasons.filter((r) => /BLOQUEADOR/i.test(r)).map((r, i) => (
                  <li key={i}>· {r.replace(/^BLOQUEADOR:\s*/, "")}</li>
                ))}
              </ul>
            </div>
          )}
        </DetalhesTecnicos>

        {/* Resumo do CSV final */}
        <div className="border rounded-md bg-muted/20 p-2.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total considerado neste documento
          </div>
          {totals.size === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              Nenhuma verba selecionada para o cálculo.
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
            onClick={() => setConfirmacaoOpen(true)}
            disabled={
              downloading ||
              totalCategorias === 0
            }
            className="gap-1.5"
            title={
              competenciaInvalida
                ? `Atenção: período "${effectiveClassificacao.competencia || "vazio"}" não identificado. Verifique antes de confirmar.`
                : confidence.bloqueador === true
                ? "Atenção: alguns dados podem estar incorretos. Revise as verbas marcadas antes de confirmar."
                : "Confirmar os dados deste contracheque"
            }
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Confirmar documento
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* F0.4 — Gate de confirmação humano. Reseta os checks a cada
          abertura para forçar revisão consciente. Se há divergências,
          exige checkbox override "bloqueio burlado". */}
      <AlertDialog open={confirmacaoOpen} onOpenChange={setConfirmacaoOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirme antes de continuar</AlertDialogTitle>
            <AlertDialogDescription>
              Verifique os itens abaixo antes de confirmar. Os dados deste
              documento serão usados no cálculo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiuRubricas}
                onCheckedChange={(v) => setConferiuRubricas(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Verbas categorizadas</strong> — cada verba incluída
                tem a categoria correta para o cálculo.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiuValores}
                onCheckedChange={(v) => setConferiuValores(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Valores conferidos</strong> — os valores
                correspondem ao documento original.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiuCobertura}
                onCheckedChange={(v) => setConferiuCobertura(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Período {effectiveClassificacao.competencia}</strong>{" "}
                está correto e todas as verbas relevantes estão incluídas.
              </span>
            </label>
            {exigeOverride && (
              <label className="flex items-start gap-3 text-sm select-none cursor-pointer border-t pt-3 border-amber-200 dark:border-amber-800">
                <Checkbox
                  checked={conferiuDivergencias}
                  onCheckedChange={(v) => setConferiuDivergencias(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  <strong className="text-amber-900 dark:text-amber-100">
                    Revisei as {divergenciasCount} verba{divergenciasCount === 1 ? "" : "s"} que precisam de atenção
                  </strong>{" "}
                  e confirmo que as categorias estão corretas.
                </span>
              </label>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={downloading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (conferido && !downloading) {
                  setConfirmacaoOpen(false);
                  void handleConfirmar();
                }
              }}
              disabled={!conferido || downloading}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Avançar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
