import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import * as svc from "@/lib/pjecalc/service";
import { toast } from "sonner";
import { Calculator, Loader2, ArrowLeft, Trash2, RefreshCw, Edit3, Search, Filter, CheckSquare, Square } from "lucide-react";

interface Props {
  caseId: string;
  verbaId: string;
  verbaNome: string;
  periodoInicio: string;
  periodoFim: string;
  onClose: () => void;
}

type Ocorrencia = {
  id: string;
  competencia: string;
  ativa: boolean;
  origem: string;
  base_valor: number;
  divisor_valor: number;
  multiplicador_valor: number;
  quantidade_valor: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
  correcao: number;
  juros: number;
  total: number;
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function GradeOcorrencias({ caseId, verbaId, verbaNome, periodoInicio, periodoFim, onClose }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [showRegerar, setShowRegerar] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchField, setBatchField] = useState('pago');
  const [batchValue, setBatchValue] = useState('');
  const [batchCompInicio, setBatchCompInicio] = useState('');
  const [batchCompFim, setBatchCompFim] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtiva, setFilterAtiva] = useState<'all' | 'ativa' | 'inativa'>('all');
  const [filterOrigem, setFilterOrigem] = useState<'all' | 'CALCULADA' | 'INFORMADA'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const queryKey = ["pjecalc_ocorrencias", caseId, verbaId];

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await svc.getOcorrenciasByCalculo(caseId, verbaId);
      return data as unknown as Ocorrencia[];
    },
  });

  const gerarOcorrencias = async (strategy: 'MANTER_ALTERACOES_MANUAIS' | 'SOBRESCREVER_TUDO') => {
    if (!periodoInicio || !periodoFim) { toast.error("Verba sem período definido."); return; }
    setGenerating(true);
    try {
      if (strategy === 'SOBRESCREVER_TUDO') {
        await svc.deleteOcorrenciasByCalculo(caseId, verbaId);
      }

      const start = new Date(periodoInicio + "T00:00:00");
      const end = new Date(periodoFim + "T00:00:00");
      const rows: Record<string, unknown>[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);

      const existingInformadas = strategy === 'MANTER_ALTERACOES_MANUAIS'
        ? ocorrencias.filter(o => o.origem === 'INFORMADA').map(o => o.competencia)
        : [];

      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        if (!existingInformadas.includes(comp)) {
          rows.push({
            calculo_id: caseId,
            verba_id: verbaId,
            competencia: comp,
            ativa: true,
            origem: 'CALCULADA',
            base_valor: 0, divisor_valor: 30, multiplicador_valor: 1,
            quantidade_valor: 1, dobra: 1,
            devido: 0, pago: 0, diferenca: 0,
            correcao: 0, juros: 0, total: 0,
          });
        }
        cur.setMonth(cur.getMonth() + 1);
      }

      if (strategy === 'MANTER_ALTERACOES_MANUAIS') {
        await svc.deleteOcorrenciasByCalculo(caseId, verbaId, 'CALCULADA');
      }

      await svc.insertOcorrenciasBatch(rows);

      qc.invalidateQueries({ queryKey });
      toast.success(`${rows.length} ocorrências geradas (${strategy === 'MANTER_ALTERACOES_MANUAIS' ? 'manuais preservadas' : 'todas sobrescritas'})`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); setShowRegerar(false); }
  };

  const updateCell = useCallback(async (id: string, field: string, value: number | boolean) => {
    const updates: Record<string, unknown> = { [field]: value, origem: 'INFORMADA', updated_at: new Date().toISOString() };

    const row = ocorrencias.find(o => o.id === id);
    if (row && typeof value === 'number') {
      const newRow = { ...row, [field]: value };
      const devido = (newRow.base_valor * newRow.multiplicador_valor / (newRow.divisor_valor || 30)) * newRow.quantidade_valor * newRow.dobra;
      const diferenca = devido - newRow.pago;
      updates.devido = Math.round(devido * 100) / 100;
      updates.diferenca = Math.round(diferenca * 100) / 100;
      updates.total = Math.round((diferenca + newRow.correcao + newRow.juros) * 100) / 100;
    }

    await svc.updateOcorrencia(id, updates);
    qc.invalidateQueries({ queryKey });
  }, [ocorrencias, caseId, verbaId, qc, queryKey]);

  const executeBatchEdit = async () => {
    setBatchLoading(true);
    try {
      const filtro = { verba_ids: [verbaId] } as Record<string, unknown>;
      if (batchCompInicio) (filtro as Record<string, unknown>).competencia_inicio = batchCompInicio;
      if (batchCompFim) (filtro as Record<string, unknown>).competencia_fim = batchCompFim;
      const changes: Record<string, unknown> = {};
      changes[batchField] = parseFloat(batchValue) || 0;

      const { data, error } = await supabase.rpc('pjecalc_batch_update_ocorrencias', {
        p_calculo_id: caseId,
        p_filtro: filtro as unknown as import("@/integrations/supabase/types").Json,
        p_changes: changes as unknown as import("@/integrations/supabase/types").Json,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey });
      toast.success(`${data} ocorrências atualizadas em lote`);
      setShowBatch(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBatchLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = ocorrencias;
    if (searchTerm) list = list.filter(o => o.competencia.includes(searchTerm));
    if (filterAtiva === 'ativa') list = list.filter(o => o.ativa);
    if (filterAtiva === 'inativa') list = list.filter(o => !o.ativa);
    if (filterOrigem !== 'all') list = list.filter(o => o.origem === filterOrigem);
    return list;
  }, [ocorrencias, searchTerm, filterAtiva, filterOrigem]);

  const totalDevido = filtered.filter(o => o.ativa).reduce((s, o) => s + (o.devido || 0), 0);
  const totalPago = filtered.filter(o => o.ativa).reduce((s, o) => s + (o.pago || 0), 0);
  const totalDif = filtered.filter(o => o.ativa).reduce((s, o) => s + (o.diferenca || 0), 0);

  const allSelected = filtered.length > 0 && filtered.every(o => selectedRows.has(o.id));
  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(o => o.id)));
  };
  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedRows.size} ocorrência(s)?`)) return;
    for (const id of selectedRows) {
      await svc.deleteOcorrenciaById(id);
    }
    setSelectedRows(new Set());
    qc.invalidateQueries({ queryKey });
    toast.success(`${selectedRows.size} ocorrências excluídas`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grade de Ocorrências</h2>
          <p className="text-xs text-muted-foreground">{verbaNome}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowRegerar(true)} disabled={generating}>
            <RefreshCw className="h-4 w-4 mr-1" /> Regerar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBatch(true)}>
            <Edit3 className="h-4 w-4 mr-1" /> Lote
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" variant="destructive" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir ({selectedRows.size})
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Devido</div><div className="font-mono font-bold text-sm">{fmt(totalDevido)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Pago</div><div className="font-mono font-bold text-sm">{fmt(totalPago)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Diferença</div><div className="font-mono font-bold text-sm text-primary">{fmt(totalDif)}</div></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : ocorrencias.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Clique em "Regerar" para criar as ocorrências mensais.
        </CardContent></Card>
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar competência..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-7 text-xs" />
            </div>
            <Select value={filterAtiva} onValueChange={(v) => setFilterAtiva(v as typeof filterAtiva)}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="inativa">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOrigem} onValueChange={(v) => setFilterOrigem(v as typeof filterOrigem)}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="CALCULADA">Calculadas</SelectItem>
                <SelectItem value="INFORMADA">Informadas</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[10px]">{filtered.length}/{ocorrencias.length}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-1 text-center w-6">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="p-2 text-center font-medium w-6">✓</th>
                  <th className="p-2 text-left font-medium">Comp.</th>
                  <th className="p-2 text-center font-medium w-14">Origem</th>
                  <th className="p-2 text-center font-medium">Base</th>
                  <th className="p-2 text-center font-medium">÷ Div.</th>
                  <th className="p-2 text-center font-medium">× Mult.</th>
                  <th className="p-2 text-center font-medium">× Qtd.</th>
                  <th className="p-2 text-center font-medium">× Dobra</th>
                  <th className="p-2 text-right font-medium">Devido</th>
                  <th className="p-2 text-center font-medium">Pago</th>
                  <th className="p-2 text-right font-medium">Diferença</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={`border-b border-border/30 hover:bg-muted/20 ${!o.ativa ? 'opacity-40' : ''} ${selectedRows.has(o.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-1 text-center">
                      <Checkbox checked={selectedRows.has(o.id)} onCheckedChange={() => toggleRow(o.id)} />
                    </td>
                    <td className="p-1 text-center">
                      <Checkbox
                        checked={o.ativa}
                        onCheckedChange={v => updateCell(o.id, 'ativa', !!v)}
                        title={o.ativa ? 'Ativa — incluída no cálculo' : 'Inativa — zerada no cálculo (mês preservado para IRRF RRA)'}
                      />
                    </td>
                    <td className="p-2 font-mono font-medium">{o.competencia}</td>
                    <td className="p-1 text-center">
                      <Badge variant={o.origem === 'INFORMADA' ? 'default' : 'secondary'} className="text-[9px] px-1">
                        {o.origem === 'INFORMADA' ? 'INF' : 'CALC'}
                      </Badge>
                    </td>
                    {(['base_valor', 'divisor_valor', 'multiplicador_valor', 'quantidade_valor', 'dobra'] as const).map(field => (
                      <td key={field} className="p-1 text-center">
                        <Input type="number" step="0.01" defaultValue={o[field] || 0}
                          className="h-7 text-xs w-20 text-center mx-auto"
                          onBlur={e => updateCell(o.id, field, parseFloat(e.target.value) || 0)}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                      </td>
                    ))}
                    <td className="p-2 text-right font-mono">{(o.devido || 0).toFixed(2)}</td>
                    <td className="p-1 text-center">
                      <Input type="number" step="0.01" defaultValue={o.pago || 0}
                        className="h-7 text-xs w-20 text-center mx-auto"
                        onBlur={e => updateCell(o.id, 'pago', parseFloat(e.target.value) || 0)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-medium">{(o.diferenca || 0).toFixed(2)}</td>
                    <td className="p-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                        await svc.deleteOcorrenciaById(o.id);
                        qc.invalidateQueries({ queryKey });
                      }}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-bold">
                  <td colSpan={9} className="p-2 text-right">TOTAIS</td>
                  <td className="p-2 text-right font-mono">{totalDevido.toFixed(2)}</td>
                  <td className="p-2 text-center font-mono">{totalPago.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-primary">{totalDif.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Dialog Regerar */}
      <Dialog open={showRegerar} onOpenChange={setShowRegerar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regerar Ocorrências</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha a estratégia de regeração:</p>
          <div className="space-y-3 mt-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => gerarOcorrencias('MANTER_ALTERACOES_MANUAIS')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Manter Alterações Manuais — recalcula apenas CALCULADAS
            </Button>
            <Button className="w-full justify-start" variant="destructive" onClick={() => gerarOcorrencias('SOBRESCREVER_TUDO')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sobrescrever Tudo — reseta todas as ocorrências
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Alteração em Lote */}
      <Dialog open={showBatch} onOpenChange={setShowBatch}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alteração em Lote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Competência Início</Label><Input type="month" value={batchCompInicio} onChange={e => setBatchCompInicio(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Competência Fim</Label><Input type="month" value={batchCompFim} onChange={e => setBatchCompFim(e.target.value)} className="mt-1 h-8 text-xs" /></div>
            </div>
            <div>
              <Label className="text-xs">Campo</Label>
              <Select value={batchField} onValueChange={setBatchField}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_valor">Base</SelectItem>
                  <SelectItem value="divisor_valor">Divisor</SelectItem>
                  <SelectItem value="multiplicador_valor">Multiplicador</SelectItem>
                  <SelectItem value="quantidade_valor">Quantidade</SelectItem>
                  <SelectItem value="dobra">Dobra</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Novo Valor</Label>
              <Input type="number" step="0.01" value={batchValue} onChange={e => setBatchValue(e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatch(false)}>Cancelar</Button>
            <Button onClick={executeBatchEdit} disabled={batchLoading}>
              {batchLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
