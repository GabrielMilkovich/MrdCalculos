/**
 * Banner amarelo + dialog de classificação manual de rubricas não classificadas
 * pela ontologia do escritório.
 *
 * Aparece dentro do HoleritePreviewDialog quando `resumo_classificacao.nao_classificadas > 0`.
 * Operador atribui categoria por rubrica; persistência fica em
 * `rubrica_aliases_tentativa` (escopo por-case, propaga entre holerites do
 * mesmo case e — após Confirmar — entre cases via `rubrica_aliases`).
 *
 * Sprint 3c (2026-05-23): redirecionada persistência de
 * `documents.metadata.classificacoes_manuais_holerite` (escopo por-doc) pra
 * `rubrica_aliases_tentativa`. Hook `useClassificacoesTentativa` cuida do
 * debounce otimista (800ms) e da hidratação a partir de 3 fontes
 * (tentativa > legacy > seed).
 *
 * IMPORTANTE: este banner NÃO bloqueia download/export. Apenas informa que
 * existem rubricas sem categoria para cálculo de DSR sobre comissões. ZIP
 * pra PJe-Calc continua passando pelo bucket-mapper antigo
 * (`src/features/rubrica-mapping/`) — escopo separado.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ListChecks, Undo2, Circle } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CategoriaOntologiaRubrica,
  ResumoClassificacaoOntologia,
} from "@/features/data-extraction/parsers/holerite/types";
import {
  useClassificacoesTentativa,
  type SeedInicial,
} from "@/hooks/useClassificacoesTentativa";

interface Props {
  documentId?: string;
  resumo: ResumoClassificacaoOntologia;
}

const CATEGORIA_LABELS: Record<Exclude<CategoriaOntologiaRubrica, 'NAO_CLASSIFICADO'>, string> = {
  MINIMO_GARANTIDO: "Mínimo Garantido",
  SALARIO_SUBSTITUICAO: "Salário Substituição",
  COMISSOES_PRODUTOS: "Comissões — Produtos",
  COMISSOES_SERVICOS: "Comissões — Serviços",
  PREMIOS: "Prêmios",
  DSR_S_COMISSOES: "DSR (já pago)",
  DESCONSIDERADAS: "Desconsiderar (não entra em DSR)",
};

const CATEGORIA_ORDEM: Array<Exclude<CategoriaOntologiaRubrica, 'NAO_CLASSIFICADO'>> = [
  "COMISSOES_PRODUTOS",
  "COMISSOES_SERVICOS",
  "PREMIOS",
  "DSR_S_COMISSOES",
  "MINIMO_GARANTIDO",
  "SALARIO_SUBSTITUICAO",
  "DESCONSIDERADAS",
];

/**
 * Normalize 1:1 com mapper V2 + gerador do seed. Necessário pra computar
 * `normalized_key` no frontend a partir do nome cru da rubrica (que é o
 * que está em `resumo.rubricas_nao_classificadas`).
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function OntologiaClassificacaoBanner({
  documentId,
  resumo,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Deriva caseId do documentId pra alimentar o hook.
  const [caseId, setCaseId] = useState<string | null>(null);
  useEffect(() => {
    if (!documentId) {
      setCaseId(null);
      return;
    }
    let cancelado = false;
    void (async () => {
      const { data } = await supabase
        .from("documents")
        .select("case_id")
        .eq("id", documentId)
        .maybeSingle();
      if (!cancelado) setCaseId((data?.case_id as string | null) ?? null);
    })();
    return () => {
      cancelado = true;
    };
  }, [documentId]);

  const naoClassificadasUnicas = useMemo(() => {
    return [...new Set(resumo.rubricas_nao_classificadas)].sort();
  }, [resumo.rubricas_nao_classificadas]);

  // SeedInicial pro hook: cada rubrica não-classificada vira entry com
  // categoria=NAO_CLASSIFICADO. Quando operador escolhe, hook atualiza
  // categoria + deriva tipo_pjecalc/base_* das regras.
  const rubricasIniciais = useMemo<SeedInicial[]>(
    () =>
      naoClassificadasUnicas.map((nome) => ({
        alias_original: nome,
        normalized_key: normalize(nome),
        categoria: "NAO_CLASSIFICADO",
        tipo_pjecalc: "INDEFINIDO",
      })),
    [naoClassificadasUnicas],
  );

  const { classificacoes, setClassificacao, isLoading } = useClassificacoesTentativa({
    caseId,
    documentId,
    rubricasIniciais,
  });

  // Tradução normalized_key → estado local pra render. Inclui contagem
  // de "atribuídas" no rodapé.
  const totalAtribuidas = useMemo(() => {
    let n = 0;
    for (const entry of classificacoes.values()) {
      if (entry.categoria !== "NAO_CLASSIFICADO") n += 1;
    }
    return n;
  }, [classificacoes]);

  if (resumo.nao_classificadas === 0) return null;

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
                agregadas — e, ao confirmar, a classificação vira aprendizado
                aplicado aos próximos casos.
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
              automaticamente. As escolhas são salvas em background — pode
              fechar o diálogo a qualquer momento. Rubricas em branco continuam
              como{" "}
              <code className="text-[10px] bg-muted px-1 rounded">
                NAO_CLASSIFICADO
              </code>
              . Ao clicar &quot;Confirmar e baixar ZIP&quot; no diálogo
              principal, as classificações desta sessão viram aprendizado
              propagado para próximos casos.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              Carregando classificações deste caso...
            </div>
          ) : (
            <TooltipProvider>
              <ScrollArea className="max-h-[420px] pr-3">
                <div className="space-y-2">
                  {naoClassificadasUnicas.map((nome) => {
                    const key = normalize(nome);
                    const entry = classificacoes.get(key);
                    const escolha =
                      entry && entry.categoria !== "NAO_CLASSIFICADO"
                        ? entry.categoria
                        : undefined;
                    return (
                      <div
                        key={nome}
                        className="grid grid-cols-[1fr_24px_220px] items-center gap-2 p-2 rounded border border-border bg-card"
                      >
                        <div className="text-sm font-mono break-all">{nome}</div>
                        <div className="flex justify-center">
                          {entry?.saving ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Circle
                                  className="h-2.5 w-2.5 fill-amber-500 text-amber-500 animate-pulse"
                                  data-testid={`saving-${key}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>Salvando...</TooltipContent>
                            </Tooltip>
                          ) : entry?.origem === "tentativa" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Undo2
                                  className="h-3 w-3 text-muted-foreground"
                                  data-testid={`herdada-${key}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                Classificada anteriormente neste caso — clique
                                no dropdown para alterar
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        <Select
                          value={escolha ?? "__UNSET__"}
                          onValueChange={(v) => {
                            if (v === "__UNSET__") {
                              setClassificacao(key, "NAO_CLASSIFICADO");
                            } else {
                              setClassificacao(key, v as CategoriaOntologiaRubrica);
                            }
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
            </TooltipProvider>
          )}

          <DialogFooter className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {totalAtribuidas} de {naoClassificadasUnicas.length}{" "}
              atribuída{totalAtribuidas === 1 ? "" : "s"}
            </div>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
