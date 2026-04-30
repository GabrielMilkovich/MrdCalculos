/**
 * RubricasGrid — planilha editável de rubricas extraídas.
 *
 * Substitui o card monolítico do antigo DocumentExtractionCard por uma
 * grid célula-por-célula com:
 *   - Cód. (read-only)
 *   - Rubrica (clique → input inline pra edição quando OCR errou)
 *   - Valor (clique → input numérico, formata BR no blur)
 *   - Categoria (RubricaCategorySelect com tooltip de hint/memo)
 *   - Trash (deleta manual; "soft-delete via Ignorar" pra ocr_ai)
 *
 * Auto-save com debounce 500ms. Toast só em erro.
 *
 * NOTA: edição inline de `rubrica.nome` ainda não persiste (não há API
 * `updateRubricaNome` no lib). Marcamos como TODO pra ticket separado.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { RefreshCw, Sparkles, Trash2, Loader2 } from "lucide-react";
import { RubricaCategorySelect } from "./RubricaCategorySelect";
import { ManualRubricaDialog } from "./ManualRubricaDialog";
import {
  formatNumeroBR,
  getDefaultHint,
  type Categoria,
  type RubricaExtraida,
  type TipoExtracao,
} from "@/features/data-extraction";
import { useRubricasDoDocumento } from "@/features/data-extraction/hooks/useRubricasDoDocumento";

interface Props {
  documentId: string;
  caseId: string;
  competencia: string;
  categorias: Categoria[];
  /** Tipo da extração — usado pra re-extrair. Default: 'holerite'. */
  tipoExtracao?: Exclude<TipoExtracao, "nao_extrair">;
  /** Callback quando o usuário re-extrai (opcional, p/ atualização externa). */
  onReextracted?: () => void;
}

export function RubricasGrid({
  documentId,
  caseId,
  competencia,
  categorias,
  tipoExtracao = "holerite",
  onReextracted,
}: Props) {
  const {
    rubricas,
    isLoading,
    reclassify,
    saveValor,
    addManual,
    removeRubrica,
    reextract,
  } = useRubricasDoDocumento(documentId, caseId);

  const [confirmReextract, setConfirmReextract] = useState(false);
  const [reextracting, setReextracting] = useState(false);

  const handleReextract = async () => {
    setConfirmReextract(false);
    setReextracting(true);
    try {
      await reextract(tipoExtracao);
      onReextracted?.();
    } finally {
      setReextracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando rubricas...
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-md min-h-[500px] overflow-hidden">
      {/* Header da planilha */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Rubricas extraídas ({rubricas.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => setConfirmReextract(true)}
          disabled={reextracting}
        >
          {reextracting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Re-extrair
        </Button>
      </div>

      {/* Tabela editável */}
      <div className="flex-1 overflow-auto">
        {rubricas.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma rubrica extraída ainda. Use "+ Adicionar rubrica" abaixo ou
            clique em "Re-extrair".
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/50 z-10">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 w-[70px]">Cód.</th>
                <th className="px-2 py-2">Rubrica</th>
                <th className="px-2 py-2 w-[110px] text-right">Valor</th>
                <th className="px-2 py-2 w-[200px]">Categoria</th>
                <th className="px-2 py-2 w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {rubricas.map((r) => (
                <RubricaRow
                  key={r.id}
                  rubrica={r}
                  categorias={categorias}
                  onSaveValor={saveValor}
                  onReclassify={reclassify}
                  onDelete={removeRubrica}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer: + Adicionar rubrica */}
      <div className="border-t bg-muted/30 p-2 flex-shrink-0">
        <ManualRubricaDialog
          competencia={competencia}
          categorias={categorias}
          onSubmit={async (input) => {
            await addManual({ ...input, competencia });
          }}
        />
      </div>

      {/* AlertDialog de re-extrair */}
      <AlertDialog open={confirmReextract} onOpenChange={setConfirmReextract}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-extrair vai apagar suas classificações</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as rubricas extraídas deste documento (e suas categorias
              atribuídas manualmente neste documento) serão substituídas. O memo
              do caso será reaplicado automaticamente. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReextract}>Re-extrair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =====================================================
// RubricaRow — linha individual com edição inline + auto-save
// =====================================================

interface RowProps {
  rubrica: RubricaExtraida;
  categorias: Categoria[];
  onSaveValor: (id: string, raw: number) => Promise<boolean>;
  onReclassify: (r: RubricaExtraida, novaCategoriaId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function RubricaRow({ rubrica, categorias, onSaveValor, onReclassify, onDelete }: RowProps) {
  const [editingValor, setEditingValor] = useState(false);
  const [valorDraft, setValorDraft] = useState<string>(
    String(rubrica.valor).replace(".", ","),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sincroniza draft quando rubrica muda externamente (re-extract)
  useEffect(() => {
    if (!editingValor) setValorDraft(String(rubrica.valor).replace(".", ","));
  }, [rubrica.valor, editingValor]);

  // Cleanup debounce no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleValorChange = (raw: string) => {
    setValorDraft(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const numeric = Number(raw.replace(",", "."));
      if (Number.isFinite(numeric) && numeric >= 0) {
        void onSaveValor(rubrica.id, numeric);
      }
    }, 500);
  };

  const handleValorBlur = () => {
    setEditingValor(false);
    // Forçar persistência imediata se houver pendência
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const numeric = Number(valorDraft.replace(",", "."));
    if (Number.isFinite(numeric) && numeric >= 0) {
      void onSaveValor(rubrica.id, numeric);
    }
  };

  const value: string =
    rubrica.categoria_id ?? (rubrica.classificacao_origem === "hint" ? "__ignorar__" : "__none__");

  const memoSourceLabel =
    rubrica.classificacao_origem === "memo" && rubrica.codigo
      ? `${rubrica.codigo} ${rubrica.nome}`
      : null;
  const hint = rubrica.classificacao_origem === "hint" ? getDefaultHint(rubrica.nome) : null;
  const hintMotivo = hint && "motivo" in hint ? hint.motivo : null;

  // Realce sutil:
  // - amber quando categoria_id null e origem 'none' (precisa decisão)
  // - muted quando categoria_id null + origem 'manual' ou 'hint' (= ignorar consciente)
  const rowClass = useMemo(() => {
    if (rubrica.categoria_id === null && rubrica.classificacao_origem === "none") {
      return "bg-amber-50/40 dark:bg-amber-900/10";
    }
    if (rubrica.categoria_id === null) {
      return "bg-muted/30 text-muted-foreground";
    }
    return "";
  }, [rubrica.categoria_id, rubrica.classificacao_origem]);

  const isManual = rubrica.origem === "manual";
  // Para rubricas OCR-AI, a UX correta é "marcar como Ignorar" em vez de DELETE
  // (preserva auditoria e hint propagado). Mantemos DELETE só pra manuais.
  const showDelete = isManual;

  return (
    <>
      <tr className={`border-t hover:bg-muted/20 ${rowClass}`}>
        <td className="px-2 py-1.5 font-mono text-[11px]">{rubrica.codigo ?? "—"}</td>
        <td className="px-2 py-1.5 font-medium">
          {rubrica.nome}
          {isManual && (
            <Badge variant="outline" className="ml-2 text-[9px] py-0 px-1.5">
              manual
            </Badge>
          )}
        </td>
        <td className="px-2 py-1.5 text-right font-mono">
          {editingValor ? (
            <Input
              autoFocus
              value={valorDraft}
              onChange={(e) => handleValorChange(e.target.value)}
              onBlur={handleValorBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValorBlur();
                if (e.key === "Escape") {
                  setEditingValor(false);
                  setValorDraft(String(rubrica.valor).replace(".", ","));
                }
              }}
              inputMode="decimal"
              className="h-7 text-xs text-right w-[90px] ml-auto"
            />
          ) : (
            <button
              type="button"
              className="hover:underline"
              onClick={() => setEditingValor(true)}
              aria-label="Editar valor"
            >
              {formatNumeroBR(Number(rubrica.valor))}
            </button>
          )}
        </td>
        <td className="px-2 py-1.5">
          <RubricaCategorySelect
            value={value}
            onChange={(v) => {
              if (v === "__none__") return;
              const cat = v === "__ignorar__" ? null : v;
              void onReclassify(rubrica, cat);
            }}
            categorias={categorias}
            origem={rubrica.classificacao_origem}
            hintMotivo={hintMotivo}
            memoSourceLabel={memoSourceLabel}
          />
        </td>
        <td className="px-2 py-1.5">
          {showDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Excluir rubrica"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Excluir rubrica manual</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!showDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/40 hover:text-muted-foreground/70"
                    onClick={() => {
                      // Soft-delete: mover pra "Ignorar" (preserva auditoria + memo)
                      void onReclassify(rubrica, null);
                      toast.info("Rubrica marcada como Ignorar.");
                    }}
                    aria-label="Marcar como Ignorar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Marcar como Ignorar (preserva auditoria)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </td>
      </tr>
      {showDelete && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir rubrica manual?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{rubrica.nome}</strong> ({formatNumeroBR(Number(rubrica.valor))}) será
                permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmDelete(false);
                  void onDelete(rubrica.id);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
