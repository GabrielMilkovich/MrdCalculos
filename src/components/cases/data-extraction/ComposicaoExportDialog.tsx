/**
 * ComposicaoExportDialog — substitui ComposicaoCsvDialog (legado só-CSV).
 *
 * Junta:
 *   - Composição de Histórico Salarial (com flags + conflitos)
 *   - Composição de Férias / Faltas / Cartões de Ponto
 *   - Verificação dos meta-dados PJC (admissão, processo, beneficiário...)
 *   - Geração de UM ZIP final contendo:
 *       <slug>_<processo>.pjc  (importável direto no PJe-Calc)
 *       historico_salarial_*.csv  (fallback)
 *       ferias.csv / faltas.csv (fallback)
 *       LEIA-ME.txt
 *
 * Reaproveita os componentes de painel/conflito do dialog antigo via
 * imports, mas troca o handleDownload pelo buildExport().
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Package,
} from "lucide-react";
import {
  buildExport,
  buildPjcCalculoData,
  buildHistoricoSalarialCSV,
  buildFeriasCSV,
  buildFaltasCSV,
  composeFaltas,
  composeFerias,
  composeHistoricoSalarial,
  composeCartoesPonto,
  ensureCategoriaConfigs,
  loadApuracoesByCase,
  loadCategorias,
  loadFaltasByCase,
  loadFeriasByCase,
  loadPjcMeta,
  loadRubricasByCase,
  type Categoria,
  type CategoriaIncidenciaConfig,
  type ComposicaoCartoesPonto,
  type ComposicaoFaltas,
  type ComposicaoFerias,
  type ConflitoHistoricoSalarial,
  type LinhaHistoricoSalarial,
  type PjcMetaCheck,
  type ResolucaoConflito,
  type ResolucaoFaltas,
  type ResolucaoFerias,
  type ZipExportPayload,
} from "@/features/data-extraction";

type ComposicoesLocal = {
  historicos: Record<
    string,
    {
      linhas: LinhaHistoricoSalarial[];
      conflitos: ConflitoHistoricoSalarial[];
      categoria: Categoria;
    }
  >;
  ferias: ComposicaoFerias;
  faltas: ComposicaoFaltas;
  cartoes: ComposicaoCartoesPonto;
};

type DialogData = {
  cats: Categoria[];
  configs: CategoriaIncidenciaConfig[];
  rubricas: import("@/features/data-extraction").RubricaExtraida[];
  ferias: import("@/features/data-extraction").FeriasExtraida[];
  faltas: import("@/features/data-extraction").FaltaExtraida[];
  cartoes: Array<{
    cartao: import("@/features/data-extraction").CartaoPontoExtraido;
    apuracoes: import("@/features/data-extraction").ApuracaoDiaria[];
  }>;
  docs: Array<{
    id: string;
    file_name: string | null;
    extracao_origem: string | null;
  }>;
  metaCheck: PjcMetaCheck;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
  caseSlug: string;
  numeroProcesso: string | null;
}

export function ComposicaoExportDialog({
  open,
  onOpenChange,
  caseId,
  caseSlug,
  numeroProcesso,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["composicao-export", caseId, open],
    queryFn: async () => {
      const cats = await loadCategorias();
      const configs = await ensureCategoriaConfigs(caseId, cats);
      const [rubricas, ferias, faltas, cartoes, docs, metaCheck] =
        await Promise.all([
          loadRubricasByCase(caseId),
          loadFeriasByCase(caseId),
          loadFaltasByCase(caseId),
          loadApuracoesByCase(caseId),
          supabase
            .from("documents")
            .select("id, file_name, extracao_origem")
            .eq("case_id", caseId)
            .then((r) =>
              (r.data ?? []) as Array<{
                id: string;
                file_name: string | null;
                extracao_origem: string | null;
              }>,
            ),
          loadPjcMeta(caseId),
        ]);
      return { cats, configs, rubricas, ferias, faltas, cartoes, docs, metaCheck };
    },
    enabled: open,
  });

  const [resolucoes, setResolucoes] = useState<ResolucaoConflito[]>([]);
  const [resolucoesFerias, setResolucoesFerias] = useState<ResolucaoFerias[]>([]);
  const [resolucoesFaltas, setResolucoesFaltas] = useState<ResolucaoFaltas[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      setResolucoes([]);
      setResolucoesFerias([]);
      setResolucoesFaltas([]);
    }
  }, [open]);

  const docMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of data?.docs ?? []) m.set(d.id, d.file_name ?? d.id);
    return m;
  }, [data?.docs]);

  const composicoes = useMemo(() => {
    if (!data) return null;
    const byCat: Record<
      string,
      ReturnType<typeof composeHistoricoSalarial> & { categoria: Categoria }
    > = {};
    for (const cat of data.cats) {
      byCat[cat.id] = {
        ...composeHistoricoSalarial(data.rubricas, cat.id, docMap, resolucoes),
        categoria: cat,
      };
    }
    return {
      historicos: byCat,
      ferias: composeFerias(data.ferias, resolucoesFerias),
      faltas: composeFaltas(data.faltas, resolucoesFaltas),
      cartoes: composeCartoesPonto(data.cartoes),
    };
  }, [data, docMap, resolucoes, resolucoesFerias, resolucoesFaltas]);

  const totalConflitos = composicoes
    ? Object.values(composicoes.historicos).reduce(
        (s, h) => s + h.conflitos.length,
        0,
      ) +
      composicoes.ferias.conflitos.length +
      composicoes.faltas.conflitos.length
    : 0;

  const handleDownload = async () => {
    if (!composicoes || !data) return;
    if (data.metaCheck.missing.length > 0) {
      toast.error(
        `Preencha antes: ${data.metaCheck.missing.join(", ")}`,
      );
      return;
    }
    setDownloading(true);
    try {
      // 1) Build histórico salarial CSV payloads (iguais ao dialog legado)
      const historicoCsvs = Object.values(composicoes.historicos)
        .filter((h) => h.linhas.length > 0)
        .sort((a, b) => a.categoria.ordem - b.categoria.ordem)
        .map((h) => {
          const cfg =
            data.configs.find((c) => c.categoria_id === h.categoria.id) ??
            buildDefaultConfig(caseId, h.categoria);
          return {
            slug: h.categoria.slug,
            nomePjecalc: h.categoria.nome_pjecalc,
            csv: buildHistoricoSalarialCSV(h.linhas, cfg),
            config: cfg,
            linhas: h.linhas.length,
          };
        });

      const feriasCsv =
        composicoes.ferias.linhas.length > 0
          ? {
              csv: buildFeriasCSV(composicoes.ferias.linhas),
              linhas: composicoes.ferias.linhas.length,
            }
          : null;
      const faltasCsv =
        composicoes.faltas.linhas.length > 0
          ? {
              csv: buildFaltasCSV(composicoes.faltas.linhas),
              linhas: composicoes.faltas.linhas.length,
            }
          : null;

      const zipPayload: ZipExportPayload = {
        caseSlug,
        numeroProcesso,
        historicoSalarialCSVs: historicoCsvs,
        feriasCsv,
        faltasCsv,
      };

      // 2) Build PjcCalculoData
      const pjcData = buildPjcCalculoData({
        meta: data.metaCheck.meta,
        historicos: Object.values(composicoes.historicos)
          .filter((h) => h.linhas.length > 0)
          .map((h) => ({
            nomePjecalc: h.categoria.nome_pjecalc,
            linhas: h.linhas,
            config:
              data.configs.find((c) => c.categoria_id === h.categoria.id) ??
              buildDefaultConfig(caseId, h.categoria),
          })),
        ferias: composicoes.ferias,
        faltas: composicoes.faltas,
        cartoes: composicoes.cartoes,
      });

      // 3) Bundle final + download
      const out = await buildExport({ zipPayload, pjcData });
      triggerDownload(out.blob, out.filename);
      toast.success(`ZIP gerado (${out.csvCount} CSVs + 1 .pjc).`);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const totalLinhas = composicoes
    ? Object.values(composicoes.historicos).reduce(
        (s, h) => s + h.linhas.length,
        0,
      )
    : 0;
  const hasFerias = (composicoes?.ferias.linhas.length ?? 0) > 0;
  const hasFaltas = (composicoes?.faltas.linhas.length ?? 0) > 0;
  const totalApuracoes = composicoes?.cartoes.totalApuracoes ?? 0;

  const canExport =
    !!composicoes &&
    !!data &&
    totalConflitos === 0 &&
    data.metaCheck.missing.length === 0 &&
    (totalLinhas > 0 || hasFerias || hasFaltas || totalApuracoes > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Compor exportação PJe-Calc
          </DialogTitle>
          <DialogDescription>
            Gera <strong>.pjc</strong> (1 import único no PJe-Calc Cidadão) +
            CSVs avulsos como fallback. Resolva conflitos e valide os
            meta-dados antes de baixar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}

            {data && data.metaCheck.missing.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Meta-dados ausentes: {data.metaCheck.missing.join(", ")}.
                  Preencha em "Dados do Processo" antes de exportar.
                </AlertDescription>
              </Alert>
            )}

            {composicoes && data && (
              <>
                {/* Resumo do que vai entrar no .pjc */}
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    O .pjc gerado vai conter:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <SummaryStat label="Histórico Salarial" value={totalLinhas} />
                    <SummaryStat
                      label="Períodos de Férias"
                      value={composicoes.ferias.linhas.length}
                    />
                    <SummaryStat
                      label="Faltas"
                      value={composicoes.faltas.linhas.length}
                    />
                    <SummaryStat
                      label="Apurações Cartão Ponto"
                      value={totalApuracoes}
                      icon={<Clock className="h-3 w-3" />}
                    />
                  </div>
                </div>

                {/* Conflitos compactos por seção */}
                <CategoriasSection
                  composicoes={composicoes}
                  data={data}
                  caseId={caseId}
                  resolucoes={resolucoes}
                  setResolucoes={setResolucoes}
                />

                <FeriasSection
                  composicoes={composicoes}
                  onResolve={(relativa, registro_id) =>
                    setResolucoesFerias((prev) => [
                      ...prev.filter((r) => r.relativa !== relativa),
                      { relativa, registro_id },
                    ])
                  }
                />

                <FaltasSection
                  composicoes={composicoes}
                  onResolve={(chave, registro_id) =>
                    setResolucoesFaltas((prev) => [
                      ...prev.filter((r) => r.chave !== chave),
                      { chave, registro_id },
                    ])
                  }
                />

                <CartoesSection composicoes={composicoes} />
              </>
            )}
          </div>
        </ScrollArea>

        {totalConflitos > 0 && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {totalConflitos} conflito(s) não resolvido(s). Resolver para baixar.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canExport || downloading}
            onClick={handleDownload}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Gerando..." : "Baixar .pjc + CSVs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Sub-secções (uso interno do dialog)
// =====================================================

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <div className="font-semibold text-sm">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

function CategoriasSection({
  composicoes,
  data,
  caseId,
  resolucoes,
  setResolucoes,
}: {
  composicoes: ComposicoesLocal;
  data: DialogData;
  caseId: string;
  resolucoes: ResolucaoConflito[];
  setResolucoes: React.Dispatch<React.SetStateAction<ResolucaoConflito[]>>;
}) {
  const list = Object.values(composicoes.historicos).sort(
    (a, b) => a.categoria.ordem - b.categoria.ordem,
  );
  if (list.every((h) => h.linhas.length === 0 && h.conflitos.length === 0)) {
    return null;
  }
  return (
    <div className="space-y-2">
      {list.map((h) => {
        if (h.linhas.length === 0 && h.conflitos.length === 0) return null;
        return (
          <CategoriaPanel
            key={h.categoria.id}
            categoria={h.categoria}
            linhasCount={h.linhas.length}
            conflitosCount={h.conflitos.length}
            conflitos={h.conflitos}
            config={
              data.configs.find((c) => c.categoria_id === h.categoria.id) ??
              buildDefaultConfig(caseId, h.categoria)
            }
            resolucoes={resolucoes}
            setResolucoes={setResolucoes}
          />
        );
      })}
    </div>
  );
}

function CategoriaPanel({
  categoria,
  linhasCount,
  conflitosCount,
  conflitos,
  config: _config,
  resolucoes: _resolucoes,
  setResolucoes,
}: {
  categoria: Categoria;
  linhasCount: number;
  conflitosCount: number;
  conflitos: import("@/features/data-extraction").ConflitoHistoricoSalarial[];
  config: CategoriaIncidenciaConfig;
  resolucoes: ResolucaoConflito[];
  setResolucoes: React.Dispatch<React.SetStateAction<ResolucaoConflito[]>>;
}) {
  const [open, setOpen] = useState(conflitosCount > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 transition">
          <div className="flex items-center gap-2 min-w-0">
            {open ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="font-medium text-xs truncate">
              {categoria.nome_exibicao}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {conflitosCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {conflitosCount} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {linhasCount} linha{linhasCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0 space-y-2 border-t">
            {conflitos.map((c) => (
              <div
                key={c.competencia}
                className="rounded border border-destructive/40 bg-destructive/5 p-2 space-y-1.5"
              >
                <div className="text-[11px] font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> Conflito {c.competencia}
                </div>
                {c.candidatos.map((cand) => (
                  <button
                    key={cand.document_id}
                    type="button"
                    onClick={() =>
                      setResolucoes((prev) => [
                        ...prev.filter((r) => r.competencia !== c.competencia),
                        {
                          competencia: c.competencia,
                          document_id_escolhido: cand.document_id,
                        },
                      ])
                    }
                    className="w-full text-left text-[11px] p-1 rounded hover:bg-background flex justify-between gap-2"
                  >
                    <span className="font-mono">
                      R$ {cand.valor_total.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {cand.document_name}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FeriasSection({
  composicoes,
  onResolve,
}: {
  composicoes: ComposicoesLocal;
  onResolve: (relativa: string, registro_id: string) => void;
}) {
  const c = composicoes.ferias;
  if (c.linhas.length === 0 && c.conflitos.length === 0) return null;
  return (
    <Collapsible defaultOpen={c.conflitos.length > 0}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50">
          <span className="font-medium text-xs">FÉRIAS</span>
          <div className="flex items-center gap-2">
            {c.conflitos.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {c.conflitos.length} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {c.linhas.length} período{c.linhas.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0 space-y-1 border-t">
            {c.conflitos.map((cf) => (
              <div
                key={cf.relativa}
                className="rounded border border-destructive/40 bg-destructive/5 p-2 space-y-1"
              >
                <div className="text-[11px] font-medium text-destructive">
                  Conflito {cf.relativa}
                </div>
                {cf.candidatos.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => onResolve(cf.relativa, cand.id)}
                    className="w-full text-left text-[11px] p-1 rounded hover:bg-background"
                  >
                    {cand.prazo}d · {cand.situacao}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FaltasSection({
  composicoes,
  onResolve,
}: {
  composicoes: ComposicoesLocal;
  onResolve: (chave: string, registro_id: string) => void;
}) {
  const c = composicoes.faltas;
  if (c.linhas.length === 0 && c.conflitos.length === 0) return null;
  return (
    <Collapsible defaultOpen={c.conflitos.length > 0}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50">
          <span className="font-medium text-xs">FALTAS</span>
          <div className="flex items-center gap-2">
            {c.conflitos.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {c.conflitos.length} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {c.linhas.length} ocorrência{c.linhas.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0 space-y-1 border-t">
            {c.conflitos.map((cf) => (
              <div
                key={cf.chave}
                className="rounded border border-destructive/40 bg-destructive/5 p-2 space-y-1"
              >
                <div className="text-[11px] font-medium text-destructive">
                  Conflito {cf.data_inicio} → {cf.data_fim}
                </div>
                {cf.candidatos.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => onResolve(cf.chave, cand.id)}
                    className="w-full text-left text-[11px] p-1 rounded hover:bg-background"
                  >
                    {cand.justificada ? "Justificada" : "Injustificada"}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CartoesSection({
  composicoes,
}: {
  composicoes: ComposicoesLocal;
}) {
  const cartoes = composicoes.cartoes.cartoes;
  if (cartoes.length === 0) return null;
  return (
    <Collapsible>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-xs">CARTÕES DE PONTO</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {cartoes.length} cartão(ões) · {composicoes.cartoes.totalApuracoes}{" "}
            apurações
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0 border-t">
            <ul className="text-[11px] space-y-0.5">
              {cartoes.map((c) => (
                <li
                  key={c.competencia}
                  className="flex justify-between font-mono"
                >
                  <span>{c.competencia}</span>
                  <span className="text-muted-foreground">
                    {c.apuracoes.length} apurações
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildDefaultConfig(
  caseId: string,
  c: Categoria,
): CategoriaIncidenciaConfig {
  return {
    case_id: caseId,
    categoria_id: c.id,
    incide_fgts: c.default_incide_fgts,
    fgts_recolhido: c.default_fgts_recolhido,
    incide_inss: c.default_incide_inss,
    inss_recolhido: c.default_inss_recolhido,
    natureza_indenizatoria: false,
  };
}
