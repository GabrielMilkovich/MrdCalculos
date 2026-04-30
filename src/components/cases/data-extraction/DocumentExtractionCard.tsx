import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  type Categoria,
  type RubricaExtraida,
  type FeriasExtraida,
  type FaltaExtraida,
  type ClassificacaoOrigem,
  formatNumeroBR,
  getDefaultHint,
  reclassificarRubrica,
  loadRubricasByDocument,
  loadFeriasByDocument,
  loadFaltasByDocument,
  insertManualRubrica,
  updateRubricaValor,
  deleteRubrica,
  toggleFeriasIncluir,
  toggleFaltasIncluir,
  extractDocument,
  setCompetenciaReferencia,
  markValidationStatus,
} from '@/features/data-extraction';
import { RubricaCategorySelect } from './RubricaCategorySelect';
import { ManualRubricaDialog } from './ManualRubricaDialog';

export type DocSummary = {
  id: string;
  case_id: string;
  file_name: string | null;
  tipo_extracao: 'holerite' | 'recibo_ferias' | 'registro_faltas' | 'nao_extrair';
  extracao_status: 'pending' | 'running' | 'done' | 'failed';
  extracao_error: string | null;
  competencia_referencia: string | null;
  validation_status: 'pending' | 'validated' | 'rejected';
};

interface Props {
  doc: DocSummary;
  categorias: Categoria[];
}

export function DocumentExtractionCard({ doc, categorias }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmReextract, setConfirmReextract] = useState(false);

  const [rubricas, setRubricas] = useState<RubricaExtraida[] | null>(null);
  const [ferias, setFerias] = useState<FeriasExtraida[] | null>(null);
  const [faltas, setFaltas] = useState<FaltaExtraida[] | null>(null);

  const [editingValor, setEditingValor] = useState<{ id: string; value: string } | null>(null);
  const [editingComp, setEditingComp] = useState<string | null>(null);

  const tipoLabel =
    doc.tipo_extracao === 'holerite'
      ? 'Holerite'
      : doc.tipo_extracao === 'recibo_ferias'
        ? 'Recibo de Férias'
        : 'Registro de Faltas';

  const reload = async () => {
    if (doc.tipo_extracao === 'holerite') {
      setRubricas(await loadRubricasByDocument(doc.id));
    } else if (doc.tipo_extracao === 'recibo_ferias') {
      setFerias(await loadFeriasByDocument(doc.id));
    } else if (doc.tipo_extracao === 'registro_faltas') {
      setFaltas(await loadFaltasByDocument(doc.id));
    }
  };

  useEffect(() => {
    if (doc.extracao_status === 'done') {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.extracao_status]);

  const handleExtract = async (force = false) => {
    if (!force && doc.extracao_status === 'done') {
      setConfirmReextract(true);
      return;
    }
    setBusy(true);
    const result = await extractDocument(
      doc.id,
      doc.tipo_extracao as 'holerite' | 'recibo_ferias' | 'registro_faltas',
    );
    setBusy(false);
    if (result.ok) {
      toast.success(`Extraídas ${result.count} linhas.`);
      qc.invalidateQueries({ queryKey: ['documents-extraction', doc.case_id] });
      await reload();
    } else {
      toast.error(`Falha: ${result.error}`);
      qc.invalidateQueries({ queryKey: ['documents-extraction', doc.case_id] });
    }
  };

  const handleReclassify = async (
    r: RubricaExtraida,
    novaCategoriaId: string | null,
  ) => {
    const result = await reclassificarRubrica(r, novaCategoriaId, supabase);
    if (!result.ok) {
      toast.error(`Erro: ${result.error}`);
      return;
    }
    if (result.afetadas > 0) {
      toast.success(`Classificação aplicada em ${result.afetadas} outras rubricas do caso.`);
    }
    await reload();
  };

  const handleSaveValor = async (id: string, raw: string) => {
    const numeric = Number(raw.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error('Valor inválido');
      setEditingValor(null);
      return;
    }
    try {
      await updateRubricaValor(id, numeric);
      await reload();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
    setEditingValor(null);
  };

  const handleAddManual = async (input: {
    codigo: string | null;
    nome: string;
    valor: number;
    categoria_id: string | null;
  }) => {
    try {
      await insertManualRubrica({
        document_id: doc.id,
        case_id: doc.case_id,
        competencia: doc.competencia_referencia ?? '',
        codigo: input.codigo,
        nome: input.nome,
        valor: input.valor,
        categoria_id: input.categoria_id,
      });
      toast.success('Rubrica adicionada.');
      await reload();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const handleDeleteRubrica = async (id: string) => {
    try {
      await deleteRubrica(id);
      await reload();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const handleSaveCompetencia = async (newComp: string) => {
    if (!/^\d{2}\/\d{4}$/.test(newComp)) {
      toast.error('Formato MM/yyyy esperado');
      return;
    }
    try {
      await setCompetenciaReferencia(doc.id, newComp);
      qc.invalidateQueries({ queryKey: ['documents-extraction', doc.case_id] });
      setEditingComp(null);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const handleValidate = async () => {
    // Bloqueia se houver rubrica com valor>0 sem categoria_id e sem origem manual de "ignorar"
    if (doc.tipo_extracao === 'holerite' && rubricas) {
      const pending = rubricas.filter(
        (r) =>
          Number(r.valor) > 0 &&
          r.categoria_id === null &&
          r.classificacao_origem !== 'manual' &&
          r.classificacao_origem !== 'hint',
      );
      if (pending.length > 0) {
        toast.error(
          `${pending.length} rubrica(s) sem decisão. Classifique ou marque como Ignorar.`,
        );
        return;
      }
    }
    try {
      await markValidationStatus(doc.id, 'validated');
      qc.invalidateQueries({ queryKey: ['documents-extraction', doc.case_id] });
      toast.success('Documento validado.');
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const handleReject = async () => {
    try {
      await markValidationStatus(doc.id, 'rejected');
      qc.invalidateQueries({ queryKey: ['documents-extraction', doc.case_id] });
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const totalLinhas =
    doc.tipo_extracao === 'holerite'
      ? rubricas?.length ?? 0
      : doc.tipo_extracao === 'recibo_ferias'
        ? ferias?.length ?? 0
        : faltas?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{doc.file_name ?? doc.id}</span>
              <Badge variant="outline" className="text-[10px]">{tipoLabel}</Badge>
              <StatusBadge status={doc.validation_status} extracao={doc.extracao_status} />
            </CardTitle>
            <CardDescription className="text-xs flex items-center gap-2 mt-1">
              {doc.tipo_extracao === 'holerite' && (
                <>
                  Competência:
                  {editingComp !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <Input
                        value={editingComp}
                        onChange={(e) => setEditingComp(e.target.value)}
                        placeholder="MM/yyyy"
                        className="h-6 text-xs w-[80px]"
                      />
                      <Button
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleSaveCompetencia(editingComp)}
                      >
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => setEditingComp(null)}
                      >
                        Cancelar
                      </Button>
                    </span>
                  ) : (
                    <>
                      <strong>{doc.competencia_referencia ?? '—'}</strong>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingComp(doc.competencia_referencia ?? '')}
                        aria-label="Editar competência"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </>
              )}
              {totalLinhas > 0 && <Badge variant="secondary" className="text-[10px]">{totalLinhas} linhas</Badge>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {doc.extracao_status === 'pending' && (
              <Button size="sm" onClick={() => handleExtract()} disabled={busy} className="gap-1.5 h-8 text-xs">
                <Sparkles className="h-3 w-3" />
                {busy ? 'Extraindo...' : 'Extrair dados'}
              </Button>
            )}
            {doc.extracao_status === 'running' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Extraindo
              </Badge>
            )}
            {doc.extracao_status === 'failed' && (
              <Button size="sm" variant="outline" onClick={() => handleExtract(true)} disabled={busy} className="gap-1.5 h-8 text-xs">
                <RefreshCw className="h-3 w-3" /> Tentar de novo
              </Button>
            )}
            {doc.extracao_status === 'done' && (
              <Button size="sm" variant="outline" onClick={() => handleExtract()} disabled={busy} className="gap-1.5 h-8 text-xs">
                <RefreshCw className="h-3 w-3" /> Re-extrair
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Recolher' : 'Expandir'}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {doc.extracao_status === 'failed' && doc.extracao_error && (
          <div className="mt-2 text-xs text-destructive flex items-start gap-2 bg-destructive/5 p-2 rounded">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{doc.extracao_error}</span>
          </div>
        )}
      </CardHeader>

      {open && doc.extracao_status === 'done' && (
        <CardContent className="space-y-3">
          {doc.tipo_extracao === 'holerite' && (
            <HoleriteTable
              rubricas={rubricas ?? []}
              categorias={categorias}
              onReclassify={handleReclassify}
              onSaveValor={handleSaveValor}
              onDelete={handleDeleteRubrica}
              editingValor={editingValor}
              setEditingValor={setEditingValor}
            />
          )}
          {doc.tipo_extracao === 'recibo_ferias' && (
            <FeriasTable rows={ferias ?? []} onToggle={async (id, v) => { await toggleFeriasIncluir(id, v); await reload(); }} />
          )}
          {doc.tipo_extracao === 'registro_faltas' && (
            <FaltasTable rows={faltas ?? []} onToggle={async (id, v) => { await toggleFaltasIncluir(id, v); await reload(); }} />
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t">
            <div className="flex items-center gap-2">
              {doc.tipo_extracao === 'holerite' && (
                <ManualRubricaDialog
                  competencia={doc.competencia_referencia ?? ''}
                  categorias={categorias}
                  onSubmit={handleAddManual}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {doc.validation_status === 'validated' ? (
                <Badge className="gap-1 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                  <CheckCircle2 className="h-3 w-3" /> Validado
                </Badge>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={handleReject} className="h-8 text-xs">
                    Rejeitar
                  </Button>
                  <Button size="sm" onClick={handleValidate} className="gap-1.5 h-8 text-xs">
                    <CheckCircle2 className="h-3 w-3" /> Validar documento
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}

      <AlertDialog open={confirmReextract} onOpenChange={setConfirmReextract}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-extrair vai apagar suas classificações</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as rubricas extraídas deste documento (e suas categorias atribuídas
              manualmente neste documento) serão substituídas. O memo do caso será
              reaplicado automaticamente. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReextract(false);
                void handleExtract(true);
              }}
            >
              Re-extrair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function StatusBadge({
  status,
  extracao,
}: {
  status: 'pending' | 'validated' | 'rejected';
  extracao: 'pending' | 'running' | 'done' | 'failed';
}) {
  if (status === 'validated') {
    return (
      <Badge className="text-[10px] gap-1 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
        <CheckCircle2 className="h-3 w-3" /> Validado
      </Badge>
    );
  }
  if (status === 'rejected') {
    return <Badge variant="destructive" className="text-[10px]">Rejeitado</Badge>;
  }
  if (extracao === 'failed') {
    return <Badge variant="destructive" className="text-[10px]">Falhou</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
}

function HoleriteTable({
  rubricas,
  categorias,
  onReclassify,
  onSaveValor,
  onDelete,
  editingValor,
  setEditingValor,
}: {
  rubricas: RubricaExtraida[];
  categorias: Categoria[];
  onReclassify: (r: RubricaExtraida, novaCategoriaId: string | null) => Promise<void>;
  onSaveValor: (id: string, raw: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  editingValor: { id: string; value: string } | null;
  setEditingValor: (s: { id: string; value: string } | null) => void;
}) {
  const categoriasMap = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );

  if (rubricas.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhuma rubrica extraída.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-xs">Cód.</TableHead>
            <TableHead className="text-xs">Rubrica</TableHead>
            <TableHead className="w-[120px] text-xs text-right">Valor</TableHead>
            <TableHead className="w-[200px] text-xs">Categoria</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rubricas.map((r) => {
            const value: string =
              r.categoria_id ?? (r.classificacao_origem === 'hint' ? '__ignorar__' : '__none__');
            const memoSourceLabel =
              r.classificacao_origem === 'memo' && r.codigo
                ? `${r.codigo} ${r.nome}`
                : null;
            const hint = r.classificacao_origem === 'hint' ? getDefaultHint(r.nome) : null;
            const hintMotivo = hint && 'motivo' in hint ? hint.motivo : null;

            return (
              <TableRow key={r.id} className="text-xs">
                <TableCell className="font-mono text-[11px]">{r.codigo ?? '—'}</TableCell>
                <TableCell className="font-medium">
                  {r.nome}
                  {r.origem === 'manual' && (
                    <Badge variant="outline" className="ml-2 text-[10px]">manual</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {editingValor?.id === r.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Input
                        value={editingValor.value}
                        onChange={(e) => setEditingValor({ id: r.id, value: e.target.value })}
                        className="h-7 text-xs w-[90px] text-right"
                        inputMode="decimal"
                      />
                      <button
                        type="button"
                        onClick={() => onSaveValor(r.id, editingValor.value)}
                        className="text-primary hover:underline text-[10px]"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingValor(null)}
                        className="text-muted-foreground hover:underline text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() =>
                        setEditingValor({ id: r.id, value: String(r.valor).replace('.', ',') })
                      }
                      aria-label="Editar valor"
                    >
                      {formatNumeroBR(Number(r.valor))}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <RubricaCategorySelect
                    value={value}
                    onChange={(v) => {
                      if (v === '__none__') return;
                      const cat = v === '__ignorar__' ? null : v;
                      void onReclassify(r, cat);
                    }}
                    categorias={categorias}
                    origem={r.classificacao_origem}
                    hintMotivo={hintMotivo}
                    memoSourceLabel={memoSourceLabel}
                  />
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void onDelete(r.id)}
                          aria-label="Excluir rubrica"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FeriasTable({
  rows,
  onToggle,
}: {
  rows: FeriasExtraida[];
  onToggle: (id: string, v: boolean) => Promise<void>;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhuma férias extraída.</p>;
  }
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] text-xs">Relativa</TableHead>
            <TableHead className="w-[80px] text-xs">Prazo</TableHead>
            <TableHead className="w-[100px] text-xs">Situação</TableHead>
            <TableHead className="w-[80px] text-xs">Abono</TableHead>
            <TableHead className="text-xs">Gozos</TableHead>
            <TableHead className="w-[80px] text-xs">Incluir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((f) => (
            <TableRow key={f.id} className="text-xs">
              <TableCell className="font-mono">{f.relativa}</TableCell>
              <TableCell>{f.prazo} dias</TableCell>
              <TableCell>{situacaoLabel(f.situacao)}</TableCell>
              <TableCell>{f.abono ? `${f.dias_abono}d` : '—'}</TableCell>
              <TableCell className="text-[11px]">{gozosSummary(f)}</TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  checked={f.incluir}
                  onChange={(e) => void onToggle(f.id, e.target.checked)}
                  className="h-4 w-4"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FaltasTable({
  rows,
  onToggle,
}: {
  rows: FaltaExtraida[];
  onToggle: (id: string, v: boolean) => Promise<void>;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhuma falta extraída.</p>;
  }
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] text-xs">Início</TableHead>
            <TableHead className="w-[120px] text-xs">Fim</TableHead>
            <TableHead className="w-[100px] text-xs">Justificada</TableHead>
            <TableHead className="text-xs">Justificativa</TableHead>
            <TableHead className="w-[80px] text-xs">Incluir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((f) => (
            <TableRow key={f.id} className="text-xs">
              <TableCell className="font-mono">{toBR(f.data_inicio)}</TableCell>
              <TableCell className="font-mono">{toBR(f.data_fim)}</TableCell>
              <TableCell>{f.justificada ? 'Sim' : 'Não'}</TableCell>
              <TableCell className="text-[11px]">{f.justificativa ?? '—'}</TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  checked={f.incluir}
                  onChange={(e) => void onToggle(f.id, e.target.checked)}
                  className="h-4 w-4"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function situacaoLabel(s: 'G' | 'GP' | 'NG' | 'I' | 'P'): string {
  return {
    G: 'Gozadas',
    GP: 'Goz. Parc.',
    NG: 'Não goz.',
    I: 'Indenizadas',
    P: 'Perdidas',
  }[s];
}

function gozosSummary(f: FeriasExtraida): string {
  const gs = [f.gozo1, f.gozo2, f.gozo3].filter(Boolean) as Array<{
    inicio: string;
    fim: string;
  }>;
  if (gs.length === 0) return '—';
  return gs.map((g) => `${g.inicio}–${g.fim}`).join(' · ');
}

function toBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
