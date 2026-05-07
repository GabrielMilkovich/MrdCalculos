/**
 * F2 — Botão "Verificar com IA" para review dialogs.
 *
 * Aparece no header dos dialogs quando score do parser está em [50, 85].
 * Score >= 86 → extração já confiável, IA dispensável.
 * Score < 50  → revisão manual obrigatória, IA pode mascarar problemas.
 *
 * Invoca edge function `verify-extraction-ai` que tem contrato anti-alucinação:
 *   - Substring literal: todo valor sugerido deve estar no OCR original.
 *   - Structured output strict (json_schema).
 *   - Timeout 15s.
 *
 * Operador vê sugestões em popover, marca quais aceitar individualmente,
 * e "Aplica selecionadas" OU clica "Pular análise" (capturando razão).
 *
 * NÃO altera estrutura diretamente — caller fornece `onApplySuggestions(list)`
 * que decide como aplicar field path no estado local.
 */
import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Builder =
  | "holerite"
  | "cartao_ponto"
  | "ferias"
  | "faltas"
  | "ctps";

export interface AISuggestion {
  field: string;
  current: string | number | null;
  suggested: string | number | null;
  reason: string;
}

export interface AIVerifyResponse {
  suggestions: AISuggestion[];
  discarded_hallucinations: Array<{
    field: string;
    suggested: string;
    reason: string;
  }>;
  ai_confidence: number;
  ai_confidence_raw: number;
  summary: string;
  model: string;
  duration_ms: number;
}

/**
 * Resultado que o caller recebe após interação completa do operador.
 * `aiInvoked=true` sempre que o botão foi clicado e a chamada terminou
 * (mesmo que operador depois tenha pulado).
 */
export interface AIInteractionResult {
  aiInvoked: boolean;
  aiChangedFields: string[];
  aiConfidence: number | null;
  aiSkippedReason: string | null;
}

interface Props {
  /** Score 0..100 do parser. Botão fica disabled fora de [50, 85]. */
  score: number;
  builder: Builder;
  documentId?: string | null;
  /** Estrutura `parsed` atual (rubricas, apuracoes, etc.). */
  parsed: unknown;
  /** OCR completo — IA precisa pra anti-alucinação. */
  ocrText: string;
  /**
   * Callback chamado quando operador aceita N sugestões. Caller decide
   * como aplicar `field` (dot path) no seu estado local — o componente
   * não toca no estado externo.
   */
  onApplySuggestions: (accepted: AISuggestion[]) => void;
  /**
   * Callback opcional pra propagar telemetria. O componente já chama uma
   * vez no final (success ou skip). Caller deve guardar e mandar pra
   * `logCsvExport({ aiInvoked, aiChangedFields, aiConfidence, aiSkippedReason })`.
   */
  onTelemetry?: (result: AIInteractionResult) => void;
}

const SCORE_MIN = 50;
const SCORE_MAX = 85;

export function VerifyExtractionAIButton({
  score,
  builder,
  documentId,
  parsed,
  ocrText,
  onApplySuggestions,
  onTelemetry,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Por sugestão, se foi aceita pelo operador (default: false — operador
  // decide explicitamente o que aplicar).
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  // Modo skip: quando operador clica "Pular análise", abre um input de razão.
  const [skipping, setSkipping] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const dentroDaFaixa = score >= SCORE_MIN && score <= SCORE_MAX;

  const tooltipForaFaixa = score > SCORE_MAX
    ? `Extração já confiável (score ${score}/100 ≥ ${SCORE_MAX + 1}). IA dispensável.`
    : `Extração com score baixo (${score}/100 < ${SCORE_MIN}). Revisão manual obrigatória — IA pode mascarar problemas.`;

  async function chamarIA() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setAccepted({});
    setSkipping(false);
    setSkipReason("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "verify-extraction-ai",
        {
          body: {
            document_id: documentId ?? null,
            builder,
            parsed,
            ocr_text: ocrText,
            score,
          },
        },
      );
      if (fnError) throw new Error(fnError.message);
      const r = data as AIVerifyResponse | { error: string };
      if ("error" in r) throw new Error(r.error);
      setResponse(r);
      // Se IA não tem nada a sugerir, fecha popover automaticamente com toast.
      if (r.suggestions.length === 0) {
        toast.success(
          `IA verificou e não tem sugestões (confiança ${r.ai_confidence}/100). Estrutura parece consistente.`,
        );
        // Telemetria: invocada, sem mudanças.
        onTelemetry?.({
          aiInvoked: true,
          aiChangedFields: [],
          aiConfidence: r.ai_confidence,
          aiSkippedReason: null,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Timeout vem como 504 → erro de rede do supabase.
      if (msg.includes("timeout_15s") || msg.includes("AbortError")) {
        setError("timeout");
      } else {
        setError(msg);
      }
      // Telemetria: invocada, mas falhou.
      onTelemetry?.({
        aiInvoked: true,
        aiChangedFields: [],
        aiConfidence: null,
        aiSkippedReason: `erro: ${msg.slice(0, 200)}`,
      });
    } finally {
      setLoading(false);
    }
  }

  function aplicarSelecionadas() {
    if (!response) return;
    const sugestoesAceitas = response.suggestions.filter(
      (_, i) => accepted[i],
    );
    if (sugestoesAceitas.length === 0) {
      toast.warning("Nenhuma sugestão marcada — nada a aplicar.");
      return;
    }
    onApplySuggestions(sugestoesAceitas);
    onTelemetry?.({
      aiInvoked: true,
      aiChangedFields: sugestoesAceitas.map((s) => s.field),
      aiConfidence: response.ai_confidence,
      aiSkippedReason: null,
    });
    toast.success(
      `${sugestoesAceitas.length} sugestão(ões) aplicada(s). Revise antes de baixar o CSV.`,
    );
    setOpen(false);
  }

  function pularAnalise() {
    if (!skipReason.trim()) {
      toast.warning('Informe um motivo curto (ex: "valores conferem").');
      return;
    }
    onTelemetry?.({
      aiInvoked: true,
      aiChangedFields: [],
      aiConfidence: response?.ai_confidence ?? null,
      aiSkippedReason: skipReason.trim(),
    });
    toast.info("Análise IA descartada — registrado na telemetria.");
    setOpen(false);
  }

  const totalSelecionadas = response
    ? response.suggestions.filter((_, i) => accepted[i]).length
    : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          disabled={!dentroDaFaixa}
          title={dentroDaFaixa
            ? `Verificar extração com IA (score ${score}/100 — faixa ${SCORE_MIN}-${SCORE_MAX})`
            : tooltipForaFaixa}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Verificar com IA
          {dentroDaFaixa && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
              {score}/100
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[480px] max-h-[80vh] overflow-hidden p-0 flex flex-col"
      >
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Verificação IA — anti-alucinação
          </span>
          {response && (
            <Badge variant="outline" className="text-[10px]">
              IA conf. {response.ai_confidence}/100
              {response.discarded_hallucinations.length > 0 && (
                <span className="ml-1 text-rose-600 dark:text-rose-400">
                  ({response.discarded_hallucinations.length} descartadas)
                </span>
              )}
            </Badge>
          )}
        </div>

        {!response && !loading && !error && (
          <div className="p-4 text-sm space-y-2">
            <p className="text-muted-foreground">
              Score do parser: <strong>{score}/100</strong> (faixa média).
              IA vai verificar contra o OCR e sugerir ajustes pontuais.
            </p>
            <p className="text-[11px] text-muted-foreground">
              <strong>Anti-alucinação:</strong> sugestões cujo valor não está
              literalmente no OCR são descartadas automaticamente.
            </p>
            <Button
              size="sm"
              onClick={chamarIA}
              className="w-full gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Iniciar análise (15s timeout)
            </Button>
          </div>
        )}

        {loading && (
          <div className="p-6 flex flex-col items-center gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Consultando IA (até 15s)…</span>
            <span className="text-[11px] text-muted-foreground">
              Modelo: gpt-4o-mini · structured output strict
            </span>
          </div>
        )}

        {error === "timeout" && (
          <div className="p-4 text-sm space-y-2">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <strong>Timeout 15s</strong>
            </div>
            <p className="text-[12px] text-muted-foreground">
              OpenAI demorou demais. Tente novamente ou prossiga sem IA.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={chamarIA}>
                Tentar de novo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}

        {error && error !== "timeout" && (
          <div className="p-4 text-sm space-y-2">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>Erro na chamada</strong>
            </div>
            <p className="text-[12px] text-muted-foreground break-words">
              {error}
            </p>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        )}

        {response && response.suggestions.length > 0 && !skipping && (
          <>
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="p-3 space-y-2">
                <p className="text-[12px] text-muted-foreground italic">
                  {response.summary}
                </p>
                {response.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="border rounded p-2 text-[12px] space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={accepted[i] ?? false}
                        onCheckedChange={(v) =>
                          setAccepted((prev) => ({
                            ...prev,
                            [i]: Boolean(v),
                          }))
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] text-muted-foreground truncate">
                          {s.field}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="text-rose-700 dark:text-rose-300">
                            <span className="text-[10px] uppercase opacity-60">
                              Atual
                            </span>
                            <div className="font-mono">
                              {s.current === null
                                ? <em>vazio</em>
                                : String(s.current)}
                            </div>
                          </div>
                          <div className="text-emerald-700 dark:text-emerald-300">
                            <span className="text-[10px] uppercase opacity-60">
                              Sugerido
                            </span>
                            <div className="font-mono">
                              {s.suggested === null
                                ? <em>vazio</em>
                                : String(s.suggested)}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {s.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {response.discarded_hallucinations.length > 0 && (
                  <div className="border border-amber-300 dark:border-amber-700 rounded p-2 text-[11px] bg-amber-50 dark:bg-amber-950/20">
                    <div className="font-medium flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      {response.discarded_hallucinations.length}{" "}
                      sugestão(ões) descartada(s) por anti-alucinação
                    </div>
                    <ul className="space-y-1 text-muted-foreground">
                      {response.discarded_hallucinations.map((d, i) => (
                        <li key={i}>
                          <code className="text-[10px]">{d.field}</code>: "
                          {d.suggested}" — não encontrado no OCR.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-2 flex justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSkipping(true)}
              >
                Pular análise
              </Button>
              <Button
                size="sm"
                onClick={aplicarSelecionadas}
                disabled={totalSelecionadas === 0}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Aplicar {totalSelecionadas > 0 ? `(${totalSelecionadas})` : ""}
              </Button>
            </div>
          </>
        )}

        {skipping && (
          <div className="p-4 space-y-2 text-sm">
            <p className="text-[12px]">
              <strong>Pular análise IA</strong> — informe brevemente por quê
              (audit trail jurídico):
            </p>
            <Input
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Ex: valores já conferem com o OCR"
              maxLength={200}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSkipping(false)}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={pularAnalise}
                disabled={!skipReason.trim()}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Confirmar pular
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
