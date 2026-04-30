import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  type Categoria,
  type CategoriaIncidenciaConfig,
  type ConflitoFaltas,
  type ConflitoFerias,
  type ConflitoHistoricoSalarial,
  type FaltaExtraida,
  type FeriasExtraida,
  type ResolucaoConflito,
  type ResolucaoFaltas,
  type ResolucaoFerias,
  type RubricaExtraida,
  type ZipExportPayload,
  composeFaltas,
  composeFerias,
  composeHistoricoSalarial,
  buildHistoricoSalarialCSV,
  buildFeriasCSV,
  buildFaltasCSV,
  countCsvsToExport,
  downloadZip,
  ensureCategoriaConfigs,
  formatNumeroBR,
  loadCategorias,
  loadFaltasByCase,
  loadFeriasByCase,
  loadRubricasByCase,
  updateCategoriaConfig,
} from '@/features/data-extraction';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
  caseSlug: string;
  numeroProcesso: string | null;
}

export function ComposicaoCsvDialog({
  open,
  onOpenChange,
  caseId,
  caseSlug,
  numeroProcesso,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['composicao-csv', caseId, open],
    queryFn: async () => {
      const cats = await loadCategorias();
      const configs = await ensureCategoriaConfigs(caseId, cats);
      const [rubricas, ferias, faltas, docs] = await Promise.all([
        loadRubricasByCase(caseId),
        loadFeriasByCase(caseId),
        loadFaltasByCase(caseId),
        supabase
          .from('documents')
          .select('id, file_name')
          .eq('case_id', caseId)
          .then((r) => (r.data ?? []) as Array<{ id: string; file_name: string | null }>),
      ]);
      return { cats, configs, rubricas, ferias, faltas, docs };
    },
    enabled: open,
  });

  const [resolucoes, setResolucoes] = useState<ResolucaoConflito[]>([]);
  const [resolucoesFerias, setResolucoesFerias] = useState<ResolucaoFerias[]>([]);
  const [resolucoesFaltas, setResolucoesFaltas] = useState<ResolucaoFaltas[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Reset resolutions on open
  useEffect(() => {
    if (open) {
      setResolucoes([]);
      setResolucoesFerias([]);
      setResolucoesFaltas([]);
    }
  }, [open]);

  const docMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of data?.docs ?? []) {
      m.set(d.id, d.file_name ?? d.id);
    }
    return m;
  }, [data?.docs]);

  // Composições
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
    setDownloading(true);
    try {
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

      const payload: ZipExportPayload = {
        caseSlug,
        numeroProcesso,
        historicoSalarialCSVs: historicoCsvs,
        feriasCsv,
        faltasCsv,
      };
      await downloadZip(payload);
      toast.success('ZIP gerado.');
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const csvCount = composicoes && data
    ? countCsvsToExport({
        caseSlug,
        numeroProcesso,
        historicoSalarialCSVs: Object.values(composicoes.historicos).map((h) => ({
          slug: h.categoria.slug,
          nomePjecalc: h.categoria.nome_pjecalc,
          csv: '',
          config: buildDefaultConfig(caseId, h.categoria),
          linhas: h.linhas.length,
        })),
        feriasCsv:
          composicoes.ferias.linhas.length > 0
            ? { csv: '', linhas: composicoes.ferias.linhas.length }
            : null,
        faltasCsv:
          composicoes.faltas.linhas.length > 0
            ? { csv: '', linhas: composicoes.faltas.linhas.length }
            : null,
      })
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Compor CSVs PJe-Calc
          </DialogTitle>
          <DialogDescription>
            Revise as agregações por categoria, configure incidência e resolva
            conflitos antes de baixar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}

            {composicoes && data && (
              <>
                {/* Painéis de Histórico Salarial por categoria */}
                {Object.values(composicoes.historicos)
                  .sort((a, b) => a.categoria.ordem - b.categoria.ordem)
                  .map((h) => (
                    <CategoriaPanel
                      key={h.categoria.id}
                      categoria={h.categoria}
                      linhas={h.linhas}
                      conflitos={h.conflitos}
                      config={
                        data.configs.find((c) => c.categoria_id === h.categoria.id) ??
                        buildDefaultConfig(caseId, h.categoria)
                      }
                      caseId={caseId}
                      resolucoes={resolucoes}
                      setResolucoes={setResolucoes}
                    />
                  ))}

                {/* Férias */}
                <FeriasPanel
                  linhas={composicoes.ferias.linhas}
                  conflitos={composicoes.ferias.conflitos}
                  onResolve={(relativa, registro_id) =>
                    setResolucoesFerias((prev) => [
                      ...prev.filter((r) => r.relativa !== relativa),
                      { relativa, registro_id },
                    ])
                  }
                />

                {/* Faltas */}
                <FaltasPanel
                  linhas={composicoes.faltas.linhas}
                  conflitos={composicoes.faltas.conflitos}
                  onResolve={(chave, registro_id) =>
                    setResolucoesFaltas((prev) => [
                      ...prev.filter((r) => r.chave !== chave),
                      { chave, registro_id },
                    ])
                  }
                />
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
            disabled={totalConflitos > 0 || csvCount === 0 || downloading}
            onClick={handleDownload}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading
              ? 'Gerando...'
              : `Baixar ZIP (${csvCount} ${csvCount === 1 ? 'CSV' : 'CSVs'})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Painel por categoria (Histórico Salarial)
// =====================================================

function CategoriaPanel({
  categoria,
  linhas,
  conflitos,
  config,
  caseId,
  resolucoes,
  setResolucoes,
}: {
  categoria: Categoria;
  linhas: ReturnType<typeof composeHistoricoSalarial>['linhas'];
  conflitos: ConflitoHistoricoSalarial[];
  config: CategoriaIncidenciaConfig;
  caseId: string;
  resolucoes: ResolucaoConflito[];
  setResolucoes: React.Dispatch<React.SetStateAction<ResolucaoConflito[]>>;
}) {
  const [open, setOpen] = useState(linhas.length > 0 || conflitos.length > 0);
  const [localCfg, setLocalCfg] = useState(config);

  useEffect(() => setLocalCfg(config), [config]);

  const isEmpty = linhas.length === 0 && conflitos.length === 0;

  const updateCfg = async (patch: Partial<CategoriaIncidenciaConfig>) => {
    const next = { ...localCfg, ...patch };
    setLocalCfg(next);
    try {
      await updateCategoriaConfig(caseId, categoria.id, patch);
    } catch (e) {
      toast.error(`Erro ao salvar: ${(e as Error).message}`);
      setLocalCfg(localCfg);
    }
  };

  const resolveConflict = (competencia: string, document_id: string) => {
    setResolucoes((prev) => {
      const filtered = prev.filter((r) => r.competencia !== competencia);
      return [...filtered, { competencia, document_id_escolhido: document_id }];
    });
  };

  const flagsLocked = localCfg.natureza_indenizatoria;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition">
          <div className="flex items-center gap-2 min-w-0">
            {open ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
            <span className="font-medium text-sm truncate">
              HISTÓRICO SALARIAL — {categoria.nome_exibicao}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {conflitos.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {conflitos.length} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {linhas.length} {linhas.length === 1 ? 'linha' : 'linhas'}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t">
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic mt-2">
                Sem dados — não será gerado CSV para esta categoria.
              </p>
            ) : (
              <>
                {/* Flags de incidência */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Incidência
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['incide_fgts', 'Incide FGTS'],
                      ['fgts_recolhido', 'FGTS Recolhido'],
                      ['incide_inss', 'Incide INSS'],
                      ['inss_recolhido', 'INSS Recolhido'],
                    ] as const).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 text-xs ${flagsLocked ? 'opacity-50' : ''}`}
                      >
                        <Checkbox
                          checked={flagsLocked ? false : Boolean(localCfg[key])}
                          disabled={flagsLocked}
                          onCheckedChange={(v) =>
                            void updateCfg({ [key]: Boolean(v) } as Partial<CategoriaIncidenciaConfig>)
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs pt-1">
                    <Checkbox
                      checked={localCfg.natureza_indenizatoria}
                      onCheckedChange={(v) =>
                        void updateCfg({ natureza_indenizatoria: Boolean(v) })
                      }
                    />
                    <span>Natureza indenizatória (zera todas as flags)</span>
                  </label>
                </div>

                {/* Tabela de linhas */}
                {linhas.length > 0 && (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">Competência</th>
                          <th className="text-right p-2">Soma</th>
                          <th className="text-left p-2">Origem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((l) => (
                          <tr key={l.competencia} className="border-t">
                            <td className="p-2 font-mono">{l.competencia}</td>
                            <td className="p-2 text-right font-mono">
                              R$ {formatNumeroBR(l.valor)}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {summarizeOrigem(l.documentos_origem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Conflitos */}
                {conflitos.map((c) => (
                  <ConflictResolver
                    key={c.competencia}
                    conflito={c}
                    onResolve={(docId) => resolveConflict(c.competencia, docId)}
                  />
                ))}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ConflictResolver({
  conflito,
  onResolve,
}: {
  conflito: ConflitoHistoricoSalarial;
  onResolve: (document_id: string) => void;
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Conflito em {conflito.competencia} — {conflito.candidatos.length} fontes divergem
      </div>
      <RadioGroup
        value={selected}
        onValueChange={(v) => {
          setSelected(v);
          onResolve(v);
        }}
        className="space-y-1.5"
      >
        {conflito.candidatos.map((c) => (
          <Label
            key={c.document_id}
            htmlFor={`${conflito.competencia}-${c.document_id}`}
            className="flex items-start gap-2 cursor-pointer rounded p-1.5 hover:bg-background"
          >
            <RadioGroupItem
              id={`${conflito.competencia}-${c.document_id}`}
              value={c.document_id}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold">
                  R$ {formatNumeroBR(c.valor_total)}
                </span>
                <span className="text-muted-foreground truncate">{c.document_name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {c.rubricas.length} rubricas
              </p>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

function FeriasPanel({
  linhas,
  conflitos,
  onResolve,
}: {
  linhas: FeriasExtraida[];
  conflitos: ConflitoFerias[];
  onResolve: (relativa: string, registro_id: string) => void;
}) {
  const total = linhas.length + conflitos.length;
  const [open, setOpen] = useState(total > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">FÉRIAS</span>
          </div>
          <div className="flex items-center gap-2">
            {conflitos.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {conflitos.length} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {linhas.length} {linhas.length === 1 ? 'período' : 'períodos'}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-3">
            {linhas.length === 0 && conflitos.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Nenhum período de férias incluído.
              </p>
            )}
            {linhas.length > 0 && (
              <ul className="text-xs space-y-1">
                {linhas.map((f) => (
                  <li key={f.id} className="flex justify-between">
                    <span className="font-mono">{f.relativa}</span>
                    <span className="text-muted-foreground">
                      {f.prazo}d · {situacaoLabel(f.situacao)}
                      {f.abono ? ` · abono ${f.dias_abono}d` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {conflitos.map((c) => (
              <FeriasConflictResolver
                key={c.relativa}
                conflito={c}
                onResolve={(id) => onResolve(c.relativa, id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FaltasPanel({
  linhas,
  conflitos,
  onResolve,
}: {
  linhas: FaltaExtraida[];
  conflitos: ConflitoFaltas[];
  onResolve: (chave: string, registro_id: string) => void;
}) {
  const total = linhas.length + conflitos.length;
  const [open, setOpen] = useState(total > 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">FALTAS</span>
          </div>
          <div className="flex items-center gap-2">
            {conflitos.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {conflitos.length} conflito(s)
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {linhas.length} {linhas.length === 1 ? 'ocorrência' : 'ocorrências'}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-3">
            {linhas.length === 0 && conflitos.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Nenhuma falta incluída.
              </p>
            )}
            {linhas.length > 0 && (
              <ul className="text-xs space-y-1">
                {linhas.map((f) => (
                  <li key={f.id} className="flex justify-between">
                    <span className="font-mono">
                      {toBR(f.data_inicio)} → {toBR(f.data_fim)}
                    </span>
                    <span className="text-muted-foreground">
                      {f.justificada ? 'justif.' : 'injustif.'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {conflitos.map((c) => (
              <FaltasConflictResolver
                key={c.chave}
                conflito={c}
                onResolve={(id) => onResolve(c.chave, id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FeriasConflictResolver({
  conflito,
  onResolve,
}: {
  conflito: ConflitoFerias;
  onResolve: (registro_id: string) => void;
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Conflito em {conflito.relativa} — {conflito.candidatos.length} fontes divergem
      </div>
      <RadioGroup
        value={selected}
        onValueChange={(v) => {
          setSelected(v);
          onResolve(v);
        }}
        className="space-y-1.5"
      >
        {conflito.candidatos.map((c) => (
          <Label
            key={c.id}
            htmlFor={`fer-${conflito.relativa}-${c.id}`}
            className="flex items-start gap-2 cursor-pointer rounded p-1.5 hover:bg-background"
          >
            <RadioGroupItem
              id={`fer-${conflito.relativa}-${c.id}`}
              value={c.id}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-mono">
                {c.prazo}d · {situacaoLabel(c.situacao)}
                {c.abono ? ` · abono ${c.dias_abono}d` : ''}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Gozos: {gozosSummary(c)}
              </p>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

function FaltasConflictResolver({
  conflito,
  onResolve,
}: {
  conflito: ConflitoFaltas;
  onResolve: (registro_id: string) => void;
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Conflito em {toBR(conflito.data_inicio)} → {toBR(conflito.data_fim)} —{' '}
        {conflito.candidatos.length} fontes divergem
      </div>
      <RadioGroup
        value={selected}
        onValueChange={(v) => {
          setSelected(v);
          onResolve(v);
        }}
        className="space-y-1.5"
      >
        {conflito.candidatos.map((c) => (
          <Label
            key={c.id}
            htmlFor={`fa-${conflito.chave}-${c.id}`}
            className="flex items-start gap-2 cursor-pointer rounded p-1.5 hover:bg-background"
          >
            <RadioGroupItem
              id={`fa-${conflito.chave}-${c.id}`}
              value={c.id}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-medium">
                {c.justificada ? 'Justificada' : 'Não justificada'}
                {c.reiniciar_periodo_aquisitivo ? ' · reinicia período' : ''}
              </div>
              {c.justificativa && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {c.justificativa}
                </p>
              )}
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

function gozosSummary(f: FeriasExtraida): string {
  const gs = [f.gozo1, f.gozo2, f.gozo3].filter(Boolean) as Array<{
    inicio: string;
    fim: string;
  }>;
  if (gs.length === 0) return '—';
  return gs.map((g) => `${g.inicio}–${g.fim}`).join(' · ');
}

// Helpers

function buildDefaultConfig(caseId: string, c: Categoria): CategoriaIncidenciaConfig {
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

function summarizeOrigem(origens: Array<{ document_id: string; document_name: string; rubricas: RubricaExtraida[] }>): string {
  if (origens.length === 0) return '—';
  const totalRubs = origens.reduce((s, o) => s + o.rubricas.length, 0);
  return `${totalRubs} rubrica(s) em ${origens.length} doc(s)`;
}

function situacaoLabel(s: 'G' | 'GP' | 'NG' | 'I' | 'P'): string {
  return { G: 'Gozadas', GP: 'Goz. Parc.', NG: 'Não gozadas', I: 'Indenizadas', P: 'Perdidas' }[s];
}

function toBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
