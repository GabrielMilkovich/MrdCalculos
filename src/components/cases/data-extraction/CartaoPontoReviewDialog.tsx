/**
 * CartaoPontoReviewDialog — revisão visual + edição da jornada antes de
 * baixar o CSV "Importar Jornada" do PJe-Calc.
 *
 * Recursos:
 *   - Lê texto OCR + ApuracaoDiaria[] do parser.
 *   - Tabela editável: data, ocorrência, 6 pares E/S por dia (limite PJe-Calc).
 *   - Batidas são exportadas independentemente da ocorrência — feriado
 *     trabalhado, atestado parcial e similares preservam as batidas.
 *   - Adicionar/remover linha.
 *   - Linhas do OCR não casadas ficam em amarelo no painel de referência.
 *   - Checkbox "conferi" obrigatório para liberar download.
 *   - Avisa quando há mais de 6 pares preenchidos (excedente truncado).
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewLayout } from "./ReviewLayout";
import {
  buildCartaoPontoZipWithReport,
  logCsvExport,
  scoreCartaoPonto,
  triggerBlobDownload,
  type ApuracaoDiaria,
  type BuildReport,
  type EventoDiario,
  type Marcacao,
  type OcorrenciaApuracao,
  type ParseCartaoPontoResult,
} from "@/features/data-extraction";
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import {
  VerifyExtractionAIButton,
  type AIInteractionResult,
  type AISuggestion,
} from "./VerifyExtractionAIButton";
import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { checkHorasTrabalhadas } from "@/features/data-extraction";
import { applyHoraMask, normalizeHoraOnBlur } from "./hora-mask";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseCartaoPontoResult;
  ocrText: string;
  filename: string;
  /** Opcional — preservado para futuras integrações (ex: telemetria). */
  documentId?: string;
}

const OCORRENCIAS: OcorrenciaApuracao[] = [
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
];

type Row = ApuracaoDiaria & { _key: string };

function newKey(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const MAX_PARES = 6;

function fillMarcacoes(marcs: Marcacao[]): Marcacao[] {
  const out: Marcacao[] = [...marcs];
  while (out.length < MAX_PARES) out.push({ e: "", s: "" });
  return out.slice(0, MAX_PARES);
}

function trimMarcacoes(marcs: Marcacao[]): Marcacao[] {
  return marcs.filter((m) => m.e || m.s);
}

/** Conta pares com ao menos uma batida preenchida (E ou S). */
function paresPreenchidos(marcs: Marcacao[]): number {
  return marcs.filter((m) => m.e || m.s).length;
}

export function CartaoPontoReviewDialog({
  open,
  onOpenChange,
  parsed,
  ocrText,
  filename,
  documentId: _documentId,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const effectiveParsed = parsed;

  // Signed URL do PDF original — pra botão "Abrir PDF em outra aba".
  // Tenta nos 2 buckets conhecidos (juriscalculo-documents e case-documents).
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !_documentId) {
      setPdfUrl(null);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data: doc } = await supabase
        .from("documents")
        .select("storage_path")
        .eq("id", _documentId)
        .single();
      const path = doc?.storage_path;
      if (!path) return;
      for (const bucket of [
        "juriscalculo-documents",
        "case-documents",
      ]) {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 7200);
        if (!cancelado && data?.signedUrl) {
          setPdfUrl(data.signedUrl);
          return;
        }
      }
    })().catch(() => {
      // Falha de rede: usuário ainda pode revisar OCR; só perde o link
      // direto pro PDF. Não bloquear o dialog.
    });
    return () => {
      cancelado = true;
    };
  }, [open, _documentId]);

  // Inicializa quando o parsed (ou override IA) mudar
  useEffect(() => {
    setRows(
      effectiveParsed.apuracoes.map((a) => ({
        ...a,
        marcacoes: fillMarcacoes(a.marcacoes),
        _key: newKey(),
      })),
    );
  }, [effectiveParsed]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "")),
    [rows],
  );

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const updateMarcacao = (
    key: string,
    idx: number,
    field: "e" | "s",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const next = [...r.marcacoes];
        next[idx] = { ...next[idx], [field]: value };
        return { ...r, marcacoes: next };
      }),
    );
  };

  const addRow = () => {
    // Default: dia seguinte ao da última apuração; se lista vazia, hoje.
    // Sem isso a nova linha vinha com data="" e o sort jogava ela pro
    // TOPO da tabela (string vazia < qualquer ISO date), confundindo o
    // usuário que esperava ver a nova linha aparecer no fim/no foco.
    const ultimaData = rows.length > 0
      ? [...rows].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))[
          rows.length - 1
        ]?.data
      : null;
    let novaData: string;
    if (ultimaData) {
      const d = new Date(`${ultimaData}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      novaData = d.toISOString().slice(0, 10);
    } else {
      novaData = new Date().toISOString().slice(0, 10);
    }
    const novoKey = newKey();
    setRows((prev) => [
      ...prev,
      {
        data: novaData,
        dia_semana: null,
        ocorrencia: "NORMAL",
        marcacoes: fillMarcacoes([]),
        eventos: [],
        observacao: null,
        _key: novoKey,
      },
    ]);
    // Scroll + flash visual na linha nova (delay pra DOM atualizar).
    setTimeout(() => {
      const el = document.querySelector(
        `tr[data-row-key="${novoKey}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-500");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-emerald-500");
        }, 1500);
      }
    }, 80);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const unparsedLines = effectiveParsed.unparsed_lines.map((u) => u.linha);

  // Score de confiança da extração + datas fora da janela de competência
  // — agora calculado direto do `parsed` determinístico (v6 + parsers v5).
  const confidence = useMemo(
    () => scoreCartaoPonto(effectiveParsed, ocrText),
    [effectiveParsed, ocrText],
  );

  // Mapa de discrepância de Horas Trabalhadas por data — destaca dias
  // onde a soma das batidas não bate com o evento HT do OCR.
  const htDiscPorData = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of effectiveParsed.apuracoes) {
      if (a.marcacoes.length === 0) continue;
      m.set(a.data, !checkHorasTrabalhadas(a).ok);
    }
    return m;
  }, [effectiveParsed]);

  // Atalhos J/K — pula para próxima/anterior linha duvidosa
  // (HT divergente ou pares > 6).
  useKeyboardNavigation({
    enabled: open,
    selector: "tr[data-row-data]",
    isProblema: (idx) => {
      const r = sorted[idx];
      if (!r) return false;
      return (
        htDiscPorData.get(r.data) === true ||
        paresPreenchidos(r.marcacoes) > MAX_PARES
      );
    },
  });

  // Calcula linhas do OCR que mencionam datas fora de qualquer janela
  // detectada — são highlightadas em vermelho no painel de referência.
  const outOfWindowLines = useMemo(() => {
    if (!confidence.datasForaJanela?.length) return [] as number[];
    const set = new Set<number>();
    const linhas = ocrText.split(/\r?\n/);
    const datasBR = confidence.datasForaJanela.map((iso) =>
      iso.split("-").reverse().join("/"),
    );
    for (let i = 0; i < linhas.length; i++) {
      for (const d of datasBR) {
        if (linhas[i].includes(d)) {
          set.add(i + 1);
          break;
        }
      }
    }
    return [...set];
  }, [confidence.datasForaJanela, ocrText]);

  // Detecta dias com mais de 6 pares preenchidos — excedente é truncado pelo
  // builder (PJe-Calc tem limite de 6 pares E/S por dia).
  const linhasComCorte = useMemo(
    () =>
      sorted.filter((r) => paresPreenchidos(r.marcacoes) > MAX_PARES),
    [sorted],
  );

  // Apurações cuja DATA está fora da janela do espelho — provavelmente são
  // timestamps de aprovação eletrônica vazando como apuração. O score
  // detecta e penaliza, mas o usuário precisava deletar uma a uma. Bulk
  // delete em 1 clique resolve.
  const rowsForaDaJanela = useMemo(() => {
    if (!confidence.datasForaJanela || confidence.datasForaJanela.length === 0) {
      return [] as Row[];
    }
    const datasFora = new Set(confidence.datasForaJanela);
    return sorted.filter((r) => datasFora.has(r.data));
  }, [sorted, confidence.datasForaJanela]);

  const removeRowsForaDaJanela = () => {
    if (rowsForaDaJanela.length === 0) return;
    const keysParaRemover = new Set(rowsForaDaJanela.map((r) => r._key));
    setRows((prev) => prev.filter((r) => !keysParaRemover.has(r._key)));
  };

  /**
   * Scroll bidirecional: clique numa linha da tabela rola o painel OCR
   * para a linha-origem daquela apuração e pisca por 1.5s.
   */
  const scrollOcrToLine = (ocrLine: number | undefined) => {
    if (!ocrLine) return;
    const el = document.querySelector(
      `[data-ocr-line="${ocrLine}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-violet-500", "ring-inset");
    setTimeout(
      () => el.classList.remove("ring-2", "ring-violet-500", "ring-inset"),
      1500,
    );
  };

  const warnings = useMemo(() => {
    const ws = [...effectiveParsed.warnings];
    if (linhasComCorte.length > 0) {
      ws.push(
        `${linhasComCorte.length} dia(s) com mais de ${MAX_PARES} pares E/S — excedente será truncado.`,
      );
    }
    return ws;
  }, [effectiveParsed.warnings, linhasComCorte]);

  // FASE 3 — Apurações com REVISAR_OCR (Fase 1) ou REVISAR_OCR_TOTAL (Fase 2).
  // Quando há flags, recomendamos VERIFICAR COM IA antes de exportar.
  const apuracoesParaRevisar = useMemo(
    () => rows.filter((r) => r.observacao?.startsWith("REVISAR_OCR")),
    [rows],
  );
  const periodosDivergentes = useMemo(
    () =>
      (effectiveParsed.consistencia ?? []).filter(
        (c) => c.status === "divergente",
      ),
    [effectiveParsed.consistencia],
  );
  const recomendarVerificacaoIA =
    apuracoesParaRevisar.length > 0 || periodosDivergentes.length > 0;

  const [reportPreview, setReportPreview] = useState<{
    blob: Blob;
    report: BuildReport;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  // F0.4 — propaga checkbox override do ReviewLayout até logCsvExport.
  const [bloqueioBurladoFlag, setBloqueioBurladoFlag] = useState(false);
  // PR-2 — telemetria IA propagada do VerifyExtractionAIButton até logCsvExport.
  const [aiTelemetry, setAiTelemetry] = useState<AIInteractionResult | null>(
    null,
  );

  /**
   * Aplica sugestões aceitas pelo operador. Suporta os campos mais comuns
   * que a IA tipicamente sugere para cartão de ponto:
   *   - apuracao[N].marcacoes[K].e   → muda entrada do par K do dia N
   *   - apuracao[N].marcacoes[K].s   → muda saída do par K do dia N
   *   - apuracao[N].ocorrencia       → muda ocorrência do dia N
   *   - apuracao[N].dia_semana       → muda dia_semana do dia N
   * Campos não-suportados são ignorados silenciosamente (raros na prática).
   */
  function handleAISuggestions(suggestions: AISuggestion[]): void {
    // Ordena: REMOÇÕES primeiro (e por índice DESC) pra não invalidar
    // os índices das outras sugestões. Atualizações depois (índices
    // estáveis enquanto não há remoção).
    const remocoes: number[] = [];
    const atualizacoes: AISuggestion[] = [];
    for (const s of suggestions) {
      const matchRemove =
        s.suggested === null &&
        /^apuracoes?\[(\d+)\]\.data$/.test(s.field);
      if (matchRemove) {
        const idx = parseInt(s.field.match(/\[(\d+)\]/)![1], 10);
        remocoes.push(idx);
      } else {
        atualizacoes.push(s);
      }
    }
    // Índices DESC pra splice não invalidar os anteriores.
    const remocoesDesc = [...new Set(remocoes)].sort((a, b) => b - a);

    setRows((prev) => {
      const next = [...prev];

      // 1. Aceita ambos padrões "apuracao[N]" (legado) e "apuracoes[N]"
      //    (padrão atual, alinhado com schema do JSON da IA).
      for (const s of atualizacoes) {
        const mMarc = s.field.match(
          /^apuraco?es?\[(\d+)\]\.marcacoes\[(\d+)\]\.([es])$/,
        );
        if (mMarc) {
          const i = parseInt(mMarc[1], 10);
          const k = parseInt(mMarc[2], 10);
          const lado = mMarc[3] as "e" | "s";
          if (!next[i] || !next[i].marcacoes[k]) continue;
          if (typeof s.suggested !== "string") continue;
          const par = { ...next[i].marcacoes[k], [lado]: s.suggested };
          const marcacoes = [...next[i].marcacoes];
          marcacoes[k] = par;
          next[i] = { ...next[i], marcacoes };
          continue;
        }
        const mField = s.field.match(
          /^apuraco?es?\[(\d+)\]\.(ocorrencia|dia_semana|data)$/,
        );
        if (mField) {
          const i = parseInt(mField[1], 10);
          const campo = mField[2] as "ocorrencia" | "dia_semana" | "data";
          if (!next[i]) continue;
          if (campo === "data" && s.suggested === null) {
            // Caso teórico (já capturado em `remocoes`); skip.
            continue;
          }
          if (s.suggested === null || typeof s.suggested === "string") {
            next[i] = { ...next[i], [campo]: s.suggested } as typeof next[i];
          }
        }
      }

      // 2. Remove apurações marcadas REMOVER (índice DESC).
      for (const idx of remocoesDesc) {
        if (idx >= 0 && idx < next.length) {
          next.splice(idx, 1);
        }
      }
      return next;
    });
  }

  // Constrói o CSV em memória + abre o painel de auditoria. O download
  // só acontece quando o operador confirma (ou autoriza explicitamente
  // baixar mesmo com perdas).
  const handleConfirm = async (opts?: { bloqueioBurlado: boolean }) => {
    setBloqueioBurladoFlag(opts?.bloqueioBurlado ?? false);
    const apuracoes: ApuracaoDiaria[] = sorted
      .filter((r) => r.data)
      .map((r) => ({
        data: r.data,
        dia_semana: r.dia_semana ?? null,
        ocorrencia: r.ocorrencia,
        marcacoes: trimMarcacoes(r.marcacoes),
        eventos: r.eventos ?? [],
        observacao: r.observacao,
      }));
    // Pré-aviso bloqueante: dia com mais de 6 pares preenchidos. PJe-Calc
    // limita a 6 pares E/S por dia. O builder trunca silenciosamente —
    // injetamos como linha REJEITADA pra operador ver explicitamente.
    const reportExtras: BuildReport["linhasRejeitadas"] = [];
    sorted.forEach((r, i) => {
      const pares = paresPreenchidos(r.marcacoes);
      if (pares > MAX_PARES) {
        reportExtras.push({
          idx: i,
          motivo: `Dia ${r.data}: ${pares} pares preenchidos — PJe-Calc só aceita ${MAX_PARES}, ${pares - MAX_PARES} par(es) NÃO entrarão no CSV.`,
        });
      }
    });
    const { blob, report } = await buildCartaoPontoZipWithReport({
      apuracoes,
      competencias: effectiveParsed.competencias,
      competencia_predominante: effectiveParsed.competencia_predominante,
      consistencia: effectiveParsed.consistencia ?? [],
      data_inicial: apuracoes[0]?.data ?? "",
      data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
      warnings: [],
      unparsed_lines: [],
      parser_version: effectiveParsed.parser_version,
    });
    setReportPreview({
      blob,
      report: {
        ...report,
        linhasRejeitadas: [...reportExtras, ...report.linhasRejeitadas],
      },
    });
  };

  const handleDownloadConfirmed = async () => {
    if (!reportPreview) return;
    setDownloading(true);
    try {
      triggerBlobDownload(reportPreview.blob, filename);
      void logCsvExport({
        builder: "cartao_ponto",
        report: reportPreview.report,
        documentId: _documentId ?? null,
        baixadoComPerdas: reportPreview.report.linhasRejeitadas.length > 0,
        bloqueioBurlado: bloqueioBurladoFlag,
        parserOrigem: effectiveParsed.parser_version,
        aiInvoked: aiTelemetry?.aiInvoked ?? false,
        aiChangedFields: aiTelemetry?.aiChangedFields ?? [],
        aiConfidence: aiTelemetry?.aiConfidence ?? undefined,
        aiSkippedReason: aiTelemetry?.aiSkippedReason ?? undefined,
      });
      setReportPreview(null);
      setBloqueioBurladoFlag(false);
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar jornada — Cartão de Ponto"
      subtitle={`${rows.length} apurações detectadas em ${effectiveParsed.competencias.size} competência(s) · ${filename}${import.meta.env.DEV ? ` · parser ${effectiveParsed.parser_version}` : ""}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      outOfWindowLines={outOfWindowLines}
      warnings={warnings}
      contadores={{ extraidos: rows.length, etiqueta: "apuração" }}
      bloqueador={confidence.bloqueador === true}
      bloqueadorReasons={confidence.reasons}
      headerSlot={
        <div className="flex items-center gap-2 flex-wrap">
          {pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
              title="Abre o PDF original em uma nova aba do navegador"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir PDF
            </Button>
          )}
          <VerifyExtractionAIButton
            score={confidence.score}
            builder="cartao_ponto"
            documentId={_documentId ?? null}
            parsed={{
              apuracoes: sorted.map((r) => ({
                data: r.data,
                dia_semana: r.dia_semana ?? null,
                ocorrencia: r.ocorrencia,
                marcacoes: r.marcacoes,
                eventos: r.eventos ?? [],
                observacao: r.observacao,
              })),
              competencia_predominante: effectiveParsed.competencia_predominante,
              data_inicial: effectiveParsed.data_inicial,
              data_final: effectiveParsed.data_final,
              parser_version: effectiveParsed.parser_version,
            }}
            ocrText={ocrText ?? ""}
            onApplySuggestions={handleAISuggestions}
            onTelemetry={setAiTelemetry}
          />
        </div>
      }
      onConfirm={handleConfirm}
      divergenciasCount={
        unparsedLines.length + outOfWindowLines.length + warnings.length
      }
      bloqueador={confidence.bloqueador}
      bloqueadorMotivo={confidence.bloqueador_motivo}
    >
      <div className="h-10 px-2 flex items-center justify-between border-b sticky top-0 bg-background z-20 shrink-0">
        <span className="text-[11px] text-muted-foreground flex items-center gap-2">
          <span>
            Edite/adicione linhas conforme o OCR. Linhas amarelas no OCR
            precisam virar uma linha aqui.
          </span>
          {linhasComCorte.length > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {linhasComCorte.length} dia(s) com mais de {MAX_PARES} pares
              (excedente truncado)
            </span>
          )}
          {/* FASE 3 — banner REVISAR_OCR / consistência divergente */}
          {recomendarVerificacaoIA && (
            <span
              className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-semibold"
              title={`Apurações para revisão: ${apuracoesParaRevisar.length}. Períodos divergentes: ${periodosDivergentes.length}. Recomenda-se clicar em "Verificar com IA" no header antes de exportar.`}
            >
              <AlertTriangle className="h-3 w-3" />
              {apuracoesParaRevisar.length > 0 &&
                `${apuracoesParaRevisar.length} apuração(ões) para revisão`}
              {apuracoesParaRevisar.length > 0 &&
                periodosDivergentes.length > 0 &&
                " · "}
              {periodosDivergentes.length > 0 &&
                `${periodosDivergentes.length} período(s) divergente(s)`}
              {" · verifique com IA antes de exportar"}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {rowsForaDaJanela.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 border-rose-300 text-rose-900 dark:border-rose-700 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={removeRowsForaDaJanela}
              title={`Remove em lote ${rowsForaDaJanela.length} apuração(ões) com data fora do período do espelho — geralmente são timestamps de aprovação eletrônica vazando como jornada.`}
            >
              <Trash2 className="h-3 w-3" />
              Remover {rowsForaDaJanela.length} fora-janela
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={addRow}
          >
            <Plus className="h-3 w-3" /> Dia
          </Button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground text-center">
          Nenhuma apuração — clique em "Dia" para adicionar manualmente.
        </div>
      ) : (
        <Table>
          <TableHeader className="sticky top-[40px] bg-muted/60 z-10 border-b">
            <TableRow>
              <TableHead className="w-[140px] text-[11px] font-semibold py-2">
                Data
              </TableHead>
              <TableHead className="w-[130px] text-[11px] font-semibold py-2">
                Ocorrência
              </TableHead>
              {/* Cabeçalhos individuais de cada par E/S — antes era um único
                  colSpan={12} com texto centralizado, criando uma faixa
                  visualmente vazia entre "Ocorrência" e "Eventos". */}
              {Array.from({ length: MAX_PARES }).map((_, idx) => (
                <TableHead
                  key={`pair-h-${idx}`}
                  className="text-[10px] font-medium text-center py-2 px-1"
                  colSpan={2}
                >
                  Par {idx + 1}
                </TableHead>
              ))}
              <TableHead className="w-[160px] text-[11px] font-semibold py-2">
                Eventos
              </TableHead>
              <TableHead className="w-[44px] text-[11px] py-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const htDisc = htDiscPorData.get(r.data) ?? false;
              const corteExc = paresPreenchidos(r.marcacoes) > MAX_PARES;
              // FASE 3 — destaque rose intenso pra apurações REVISAR_OCR
              // (têm prioridade sobre htDisc/corte; são as mais críticas).
              const precisaRevisar = r.observacao?.startsWith("REVISAR_OCR") ?? false;
              const cls = precisaRevisar
                ? "bg-rose-100 dark:bg-rose-950/30 border-l-4 border-l-rose-500"
                : htDisc
                  ? "bg-rose-50 dark:bg-rose-950/15"
                  : corteExc
                    ? "bg-amber-50 dark:bg-amber-950/10"
                    : "";
              return (
              <TableRow
                key={r._key}
                data-row-data={r.data}
                data-row-key={r._key}
                title={
                  precisaRevisar
                    ? `REVISÃO RECOMENDADA — ${r.observacao}`
                    : htDisc
                      ? "Soma de batidas não bate com Horas Trabalhadas do OCR — revise"
                      : undefined
                }
                className={`text-[13px] transition-shadow ${cls}`}
              >
                <TableCell
                  className="p-1.5"
                  onClick={() => scrollOcrToLine(r.ocr_line)}
                  title={
                    r.ocr_line
                      ? `Clique para ver a linha ${r.ocr_line} no OCR`
                      : undefined
                  }
                >
                  <Input
                    type="date"
                    value={r.data}
                    onChange={(e) => updateRow(r._key, { data: e.target.value })}
                    onBlur={() => {
                      // Após editar a data, a linha muda de posição no
                      // sort por data. Faz scroll pra posição nova com
                      // flash visual pra mostrar onde ela parou.
                      setTimeout(() => {
                        const el = document.querySelector(
                          `tr[data-row-key="${r._key}"]`,
                        ) as HTMLElement | null;
                        if (el) {
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          el.classList.add("ring-2", "ring-emerald-500");
                          setTimeout(
                            () =>
                              el.classList.remove(
                                "ring-2",
                                "ring-emerald-500",
                              ),
                            1200,
                          );
                        }
                      }, 50);
                    }}
                    className={`h-9 text-[13px] font-mono ${r.ocr_line ? "cursor-pointer" : ""}`}
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Select
                    value={r.ocorrencia}
                    onValueChange={(v) =>
                      updateRow(r._key, {
                        ocorrencia: v as OcorrenciaApuracao,
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCORRENCIAS.map((o) => (
                        <SelectItem key={o} value={o} className="text-[13px]">
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {Array.from({ length: MAX_PARES }).map((_, idx) => (
                  <TableCell key={`pair-${idx}`} className="p-1" colSpan={2}>
                    <div className="flex gap-1">
                      <Input
                        placeholder={idx === 0 ? "08:00" : ""}
                        value={r.marcacoes[idx]?.e ?? ""}
                        onChange={(e) =>
                          updateMarcacao(
                            r._key,
                            idx,
                            "e",
                            applyHoraMask(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          updateMarcacao(
                            r._key,
                            idx,
                            "e",
                            normalizeHoraOnBlur(e.target.value),
                          )
                        }
                        title={
                          r.marcacoes[idx]?.e_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-9 text-[13px] font-mono w-[60px] px-1.5 ${
                          r.marcacoes[idx]?.e_inserida
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}

                      />
                      <Input
                        placeholder={idx === 0 ? "12:00" : ""}
                        value={r.marcacoes[idx]?.s ?? ""}
                        onChange={(e) =>
                          updateMarcacao(
                            r._key,
                            idx,
                            "s",
                            applyHoraMask(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          updateMarcacao(
                            r._key,
                            idx,
                            "s",
                            normalizeHoraOnBlur(e.target.value),
                          )
                        }
                        title={
                          r.marcacoes[idx]?.s_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-9 text-[13px] font-mono w-[60px] px-1.5 ${
                          r.marcacoes[idx]?.s_inserida
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}
                        
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="p-1">
                  <EventosBadges eventos={r.eventos ?? []} />
                </TableCell>
                <TableCell className="p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(r._key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <CsvBuildReportPanel
        open={!!reportPreview}
        onOpenChange={(o) => {
          if (!o && !downloading) setReportPreview(null);
        }}
        nomeRecurso="jornada (cartão de ponto)"
        report={reportPreview?.report ?? { linhasGeradas: 0, linhasRejeitadas: [], linhasAjustadas: [], warnings: [] }}
        onConfirm={handleDownloadConfirmed}
        loading={downloading}
        apuracoesRevisar={apuracoesParaRevisar.length}
        periodosDivergentes={periodosDivergentes.length}
      />
    </ReviewLayout>
  );
}

// =====================================================
// Badges de eventos jurídicos preservados
// =====================================================

const EVENTO_LABEL: Record<string, { label: string; tone: string }> = {
  horas_trabalhadas: { label: "HT", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200" },
  horas_previstas: { label: "HP", tone: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200" },
  banco_horas_debito: { label: "BH-", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
  banco_horas_70: { label: "BH+70%", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" },
  he_com_70: { label: "HE 70%", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
  he_intervalo: { label: "HE Interv.", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
  he_feriado_0: { label: "HE Feriado", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200" },
  rsr_trabalhado_0: { label: "RSR-Trab.", tone: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-200" },
  intrajornada_sup_2hs: { label: "Intra+2h", tone: "bg-pink-100 text-pink-800 dark:bg-pink-950/30 dark:text-pink-200" },
  feriado_dias: { label: "Feriado", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200" },
  dsr_semanal_dias: { label: "DSR", tone: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200" },
  ferias: { label: "Férias", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200" },
  licenca_medica: { label: "Lic. Méd.", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
  treinamento: { label: "Trein.", tone: "bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200" },
};

function EventosBadges({ eventos }: { eventos: EventoDiario[] }) {
  if (!eventos || eventos.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-0.5">
      {eventos.map((ev, i) => {
        const meta = EVENTO_LABEL[ev.tipo] ?? {
          label: ev.tipo,
          tone: "bg-muted text-muted-foreground",
        };
        return (
          <Badge
            key={i}
            variant="outline"
            className={`text-[9px] font-normal ${meta.tone} border-transparent`}
            title={`${ev.tipo}: ${ev.valor} (preservado do OCR)`}
          >
            {meta.label} {ev.valor}
          </Badge>
        );
      })}
    </div>
  );
}
