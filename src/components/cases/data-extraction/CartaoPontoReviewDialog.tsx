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
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
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
  buildCartaoPontoCSV,
  scoreCartaoPonto,
  triggerBlobDownload,
  type ApuracaoDiaria,
  type EventoDiario,
  type Marcacao,
  type OcorrenciaApuracao,
  type ParseCartaoPontoResult,
} from "@/features/data-extraction";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AICopilotBanner } from "./AICopilotBanner";
import { ReconciliationDivergenceList } from "./ReconciliationDivergenceList";
import { useAICopilot } from "./useAICopilot";
import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { checkHorasTrabalhadas } from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseCartaoPontoResult;
  ocrText: string;
  filename: string;
  /** Opcional — habilita o botão "Tentar com IA". */
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
  documentId,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  // Co-piloto IA: dispara em paralelo, reconcilia regex × IA, e devolve
  // `effective` já com a melhor fonte aplicada por dia (cartão-ponto).
  const copilot = useAICopilot({
    tipo: "cartao_ponto",
    documentId: documentId ?? null,
    ocrText,
    parsed,
    enabled: !!documentId,
  });
  const effectiveParsed = copilot.effective;

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
    setRows((prev) => [
      ...prev,
      {
        data: prev[prev.length - 1]?.data ?? "",
        dia_semana: null,
        ocorrencia: "NORMAL",
        marcacoes: fillMarcacoes([]),
        eventos: [],
        observacao: null,
        _key: newKey(),
      },
    ]);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const unparsedLines = effectiveParsed.unparsed_lines.map((u) => u.linha);

  // Score de confiança da extração + datas fora da janela de competência.
  // Usa o resultado EFETIVO (regex / IA / reconciliado já com overrides) —
  // calculado dentro do hook do co-piloto. Garante que o badge reflete a
  // melhor fonte aplicada, não fica preso no score regex inicial quando
  // a IA já consolidou uma versão melhor.
  const confidence = copilot.effectiveScore;

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

  const warnings = useMemo(() => {
    const ws = [...effectiveParsed.warnings];
    if (linhasComCorte.length > 0) {
      ws.push(
        `${linhasComCorte.length} dia(s) com mais de ${MAX_PARES} pares E/S — excedente será truncado.`,
      );
    }
    return ws;
  }, [effectiveParsed.warnings, linhasComCorte]);

  const handleConfirm = async () => {
    // Limpa marcações vazias antes de gerar CSV. Preserva batidas
    // independentemente da ocorrência (feriado trabalhado, atestado parcial,
    // etc. precisam das batidas no CSV).
    const apuracoes: ApuracaoDiaria[] = sorted
      .filter((r) => r.data) // descarta linhas sem data
      .map((r) => ({
        data: r.data,
        dia_semana: r.dia_semana ?? null,
        ocorrencia: r.ocorrencia,
        marcacoes: trimMarcacoes(r.marcacoes),
        eventos: r.eventos ?? [],
        observacao: r.observacao,
      }));
    const blob = buildCartaoPontoCSV({
      apuracoes,
      // Preserva competências da fonte ativa (regex/IA/reconciliada)
      // — útil pra futuras validações de "CSV mistura competências".
      competencias: effectiveParsed.competencias,
      competencia_predominante: effectiveParsed.competencia_predominante,
      data_inicial: apuracoes[0]?.data ?? "",
      data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
      warnings: [],
      unparsed_lines: [],
      parser_version: effectiveParsed.parser_version,
    });
    triggerBlobDownload(blob, filename);
  };

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar jornada — Cartão de Ponto"
      subtitle={`${rows.length} apurações detectadas em ${effectiveParsed.competencias.size} competência(s) · ${filename} · parser ${effectiveParsed.parser_version}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      outOfWindowLines={outOfWindowLines}
      warnings={warnings}
      contadores={{ extraidos: rows.length, etiqueta: "apuração" }}
      headerSlot={
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge
              score={confidence}
              iaSalvouDias={
                copilot.modo !== "regex" &&
                (copilot.reconciliacao?.contadores.onlyIa ?? 0) > 0
              }
            />
            <AICopilotBanner
              loading={copilot.loading}
              loadingDeep={copilot.loadingDeep}
              erro={copilot.erro}
              regexScore={copilot.regexScore}
              iaScore={copilot.iaScore}
              reconciliacao={copilot.reconciliacao}
              modo={copilot.modo}
              onModoChange={copilot.setModo}
              onRunDeep={documentId ? () => void copilot.runDeep() : undefined}
              ocrTruncado={copilot.ocrTruncado}
              ocrCharsOriginais={copilot.ocrCharsOriginais}
              ocrCharsProcessados={copilot.ocrCharsProcessados}
            />
          </div>
          {copilot.modo === "reconciliado" && copilot.reconciliacao && (
            <ReconciliationDivergenceList
              reconciliacao={copilot.reconciliacao}
              overrides={copilot.overrides}
              onChooseRegex={(d) => copilot.setOverride(d, "regex")}
              onChooseIA={(d) => copilot.setOverride(d, "ia")}
              onJumpTo={(d) => {
                // Encontra a row pela data e scrolla
                const tr = document.querySelector(
                  `tr[data-row-data="${d}"]`,
                ) as HTMLElement | null;
                tr?.scrollIntoView({ block: "center", behavior: "smooth" });
                tr?.classList.add("ring-2", "ring-violet-500");
                setTimeout(
                  () => tr?.classList.remove("ring-2", "ring-violet-500"),
                  1500,
                );
              }}
            />
          )}
        </div>
      }
      onConfirm={handleConfirm}
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
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
          <TableHeader className="sticky top-[42px] bg-background z-10">
            <TableRow>
              <TableHead className="w-[120px] text-[10px]">Data</TableHead>
              <TableHead className="w-[110px] text-[10px]">Ocorrência</TableHead>
              <TableHead
                className="text-[10px] text-center"
                colSpan={MAX_PARES * 2}
              >
                {MAX_PARES} pares E/S (E1 S1 … E{MAX_PARES} S{MAX_PARES})
              </TableHead>
              <TableHead className="w-[140px] text-[10px]">Eventos</TableHead>
              <TableHead className="w-[40px] text-[10px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const htDisc = htDiscPorData.get(r.data) ?? false;
              const corteExc = paresPreenchidos(r.marcacoes) > MAX_PARES;
              const cls = htDisc
                ? "bg-rose-50 dark:bg-rose-950/15"
                : corteExc
                  ? "bg-amber-50 dark:bg-amber-950/10"
                  : "";
              return (
              <TableRow
                key={r._key}
                data-row-data={r.data}
                title={
                  htDisc
                    ? "Soma de batidas não bate com Horas Trabalhadas do OCR — revise"
                    : undefined
                }
                className={`text-xs transition-shadow ${cls}`}
              >
                <TableCell className="p-1">
                  <Input
                    type="date"
                    value={r.data}
                    onChange={(e) => updateRow(r._key, { data: e.target.value })}
                    className="h-7 text-[11px] font-mono"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={r.ocorrencia}
                    onValueChange={(v) =>
                      updateRow(r._key, {
                        ocorrencia: v as OcorrenciaApuracao,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCORRENCIAS.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {Array.from({ length: MAX_PARES }).map((_, idx) => (
                  <TableCell key={`pair-${idx}`} className="p-0.5" colSpan={2}>
                    <div className="flex gap-0.5">
                      <Input
                        placeholder={idx === 0 ? "08:00" : ""}
                        value={r.marcacoes[idx]?.e ?? ""}
                        onChange={(e) =>
                          updateMarcacao(r._key, idx, "e", e.target.value)
                        }
                        title={
                          r.marcacoes[idx]?.e_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-7 text-[11px] font-mono w-[48px] px-1 ${
                          r.marcacoes[idx]?.e_inserida
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}
                        
                      />
                      <Input
                        placeholder={idx === 0 ? "12:00" : ""}
                        value={r.marcacoes[idx]?.s ?? ""}
                        onChange={(e) =>
                          updateMarcacao(r._key, idx, "s", e.target.value)
                        }
                        title={
                          r.marcacoes[idx]?.s_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-7 text-[11px] font-mono w-[48px] px-1 ${
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
