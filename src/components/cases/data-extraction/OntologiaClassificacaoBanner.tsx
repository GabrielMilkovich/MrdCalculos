/**
 * Banner amarelo + dialog de classificação manual de rubricas não-classificadas
 * pela ontologia do escritório (Sprint 2 / Fase 3, 2026-05-21).
 *
 * Aparece dentro do HoleritePreviewDialog quando `resumo_classificacao.nao_classificadas > 0`.
 * Operador atribui categoria manualmente por rubrica; persistência fica em
 * `documents.metadata.classificacoes_manuais_holerite` (objeto
 * `{[nome_original]: CategoriaOntologiaRubrica}`).
 *
 * IMPORTANTE: este banner NÃO bloqueia download/export. Apenas informa que
 * existem rubricas sem categoria para cálculo de DSR sobre comissões. A
 * geração de ZIP/CSV pra PJe-Calc continua passando pelo bucket-mapper antigo
 * (`src/features/rubrica-mapping/`) — escopo separado.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CategoriaOntologiaRubrica,
  ResumoClassificacaoOntologia,
} from "@/features/data-extraction/parsers/holerite/types";

interface Props {
  documentId?: string;
  resumo: ResumoClassificacaoOntologia;
}

const CATEGORIA_LABELS: Record<Exclude<CategoriaOntologiaRubrica, 'NAO_CLASSIFICADO'>, string> = {
  MINIMO_GARANTIDO: "Mínimo Garantido",
  COMISSAO_PRODUTOS: "Comissões — Produtos",
  COMISSAO_SERVICOS: "Comissões — Serviços",
  PREMIO: "Prêmios",
  DSR_PAGO: "DSR (já pago)",
  DESCONSIDERAR: "Desconsiderar (não entra em DSR)",
};

const CATEGORIA_ORDEM: Array<Exclude<CategoriaOntologiaRubrica, 'NAO_CLASSIFICADO'>> = [
  "COMISSAO_PRODUTOS",
  "COMISSAO_SERVICOS",
  "PREMIO",
  "DSR_PAGO",
  "MINIMO_GARANTIDO",
  "DESCONSIDERAR",
];

export function OntologiaClassificacaoBanner({
  documentId,
  resumo,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<string, CategoriaOntologiaRubrica>>({});
  const [persistindo, setPersistindo] = useState(false);
  const [hidratado, setHidratado] = useState(false);

  // Lê classificações manuais já persistidas no documento na primeira vez
  // que o dialog é aberto. Evita fetch desnecessário enquanto o operador
  // só está olhando o banner.
  useEffect(() => {
    if (!dialogOpen || !documentId || hidratado) return;
    let cancelado = false;
    (async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("metadata")
        .eq("id", documentId)
        .single();
      if (cancelado) return;
      if (error) {
        toast.error(`Erro ao carregar classificações salvas: ${error.message}`);
        setHidratado(true);
        return;
      }
      const meta = (data?.metadata ?? {}) as Record<string, unknown>;
      const previas = meta.classificacoes_manuais_holerite as
        | Record<string, CategoriaOntologiaRubrica>
        | undefined;
      if (previas && typeof previas === "object") {
        setEscolhas(previas);
      }
      setHidratado(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [dialogOpen, documentId, hidratado]);

  const naoClassificadasUnicas = useMemo(() => {
    return [...new Set(resumo.rubricas_nao_classificadas)].sort();
  }, [resumo.rubricas_nao_classificadas]);

  const totalManualClassificadas = useMemo(() => {
    return naoClassificadasUnicas.filter((nome) => escolhas[nome] !== undefined).length;
  }, [naoClassificadasUnicas, escolhas]);

  if (resumo.nao_classificadas === 0) return null;

  async function persistir() {
    if (!documentId) {
      toast.error("documentId ausente — classificações não podem ser salvas.");
      return;
    }
    setPersistindo(true);
    try {
      const { data: docRow, error: readErr } = await supabase
        .from("documents")
        .select("metadata")
        .eq("id", documentId)
        .single();
      if (readErr) throw readErr;
      const metaAtual = (docRow?.metadata ?? {}) as Record<string, unknown>;
      const { error: updErr } = await supabase
        .from("documents")
        .update({
          metadata: {
            ...metaAtual,
            classificacoes_manuais_holerite: escolhas,
            classificacoes_manuais_holerite_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      if (updErr) throw updErr;
      toast.success(
        `Classificação manual salva: ${totalManualClassificadas} de ${naoClassificadasUnicas.length} rubricas atribuídas.`,
      );
      setDialogOpen(false);
    } catch (err) {
      toast.error(`Erro ao salvar classificações: ${(err as Error).message}`);
    } finally {
      setPersistindo(false);
    }
  }

  return (
    <>
      <div
        className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-3 text-xs space-y-2"
        data-testid="ontologia-banner-nao-classificadas"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-100">
                {resumo.nao_classificadas} de {resumo.total_rubricas}{" "}
                {resumo.nao_classificadas === 1 ? "rubrica não foi" : "rubricas não foram"}{" "}
                classificada{resumo.nao_classificadas === 1 ? "" : "s"} pela
                ontologia
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-0.5">
                Isso não bloqueia o download do CSV/ZIP. Sinaliza apenas que essas
                rubricas não têm categoria atribuída para cálculo de DSR sobre
                comissões. Classifique manualmente para incluí-las nas bases
                agregadas.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-950/40"
            onClick={() => setDialogOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5 mr-1" />
            Classificar manualmente
          </Button>
        </div>
        <div className="text-[11px] text-amber-800/90 dark:text-amber-200/90">
          <strong>Rubricas pendentes:</strong>{" "}
          {naoClassificadasUnicas.slice(0, 6).join(", ")}
          {naoClassificadasUnicas.length > 6 && ` e mais ${naoClassificadasUnicas.length - 6}`}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Classificar rubricas manualmente</DialogTitle>
            <DialogDescription>
              Atribua uma categoria para cada rubrica não classificada
              automaticamente. As escolhas ficam salvas no documento e podem
              ser reabertas a qualquer momento. Não é necessário classificar
              todas — rubricas em branco continuam como{" "}
              <code className="text-[10px] bg-muted px-1 rounded">
                NAO_CLASSIFICADO
              </code>
              .
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[420px] pr-3">
            <div className="space-y-2">
              {naoClassificadasUnicas.map((nome) => {
                const escolha = escolhas[nome];
                return (
                  <div
                    key={nome}
                    className="grid grid-cols-[1fr_220px] items-center gap-3 p-2 rounded border border-border bg-card"
                  >
                    <div className="text-sm font-mono break-all">{nome}</div>
                    <Select
                      value={escolha ?? "__UNSET__"}
                      onValueChange={(v) => {
                        setEscolhas((prev) => {
                          const next = { ...prev };
                          if (v === "__UNSET__") delete next[nome];
                          else next[nome] = v as CategoriaOntologiaRubrica;
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="(sem categoria)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__UNSET__">
                          <span className="text-muted-foreground">(deixar em branco)</span>
                        </SelectItem>
                        {CATEGORIA_ORDEM.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORIA_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {totalManualClassificadas} de {naoClassificadasUnicas.length}{" "}
              atribuída{totalManualClassificadas === 1 ? "" : "s"}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={persistindo}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={persistir}
                disabled={persistindo || !documentId}
              >
                {persistindo ? (
                  "Salvando..."
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Salvar classificações
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
