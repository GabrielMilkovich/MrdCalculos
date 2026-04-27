import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface MultaIndenizacao {
  descricao: string; credor: string; devedor: string; terceiro_nome: string;
  valor_tipo: 'calculado' | 'informado'; base: string; aliquota: string; valor: string;
  vencimento: string; indice: string; indice_outro: string; aplicar_juros: boolean; apurar_ir: boolean;
}

const EMPTY_MULTA: MultaIndenizacao = {
  descricao: '', credor: 'reclamante', devedor: 'reclamado', terceiro_nome: '',
  valor_tipo: 'calculado', base: 'principal', aliquota: '', valor: '', vencimento: '',
  indice: 'trabalhista', indice_outro: '', aplicar_juros: true, apurar_ir: false,
};

export function ModuloMultasCLT({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [multas, setMultas] = useState<MultaIndenizacao[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MultaIndenizacao>(EMPTY_MULTA);
  const [apurar467, setApurar467] = useState(false);
  const [apurar477, setApurar477] = useState(false);
  // Sprint 2: Multa 523 CPC (10% por descumprimento de sentença)
  const [apurar523Cpc, setApurar523Cpc] = useState(false);
  const [percentual523, setPercentual523] = useState('10');

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.multas_indenizacoes && Array.isArray(d.multas_indenizacoes)) setMultas(d.multas_indenizacoes as MultaIndenizacao[]);
      setApurar467((d.apurar_467 as boolean) ?? false);
      setApurar477((d.apurar_477 as boolean) ?? false);
      setApurar523Cpc((d.apurar_523_cpc as boolean) ?? false);
      setPercentual523(((d.percentual_523 as number) ?? 10).toString());
    }
  }, [data]);

  const openNew = () => { setEditIdx(null); setEditForm(EMPTY_MULTA); setDialogOpen(true); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditForm({ ...multas[idx] }); setDialogOpen(true); };
  const saveItem = () => {
    if (editIdx !== null) setMultas(p => p.map((m, i) => i === editIdx ? editForm : m));
    else setMultas(p => [...p, editForm]);
    setDialogOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        apurar_467: apurar467, valor_467: (d.valor_467 as number) ?? 0,
        apurar_477: apurar477, valor_477_tipo: (d.valor_477_tipo as string) || 'salario',
        valor_477_informado: d.valor_477_informado ?? null, observacoes: (d.observacoes as string) || '',
        multas_indenizacoes: multas,
        // Sprint 2: Multa 523 CPC
        apurar_523_cpc: apurar523Cpc,
        percentual_523: percentual523 ? parseFloat(percentual523) : 10,
      } as Record<string, unknown>);
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      toast.success("Multas e Indenizações salvas!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Multas e Indenizações</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Multas CLT Automáticas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={apurar467} onCheckedChange={v => setApurar467(!!v)} />
            <Label className="text-xs">Apurar Multa Art. 467 CLT (valores incontroversos não pagos na rescisão — 50%)</Label>
          </div>
          <div className="flex items-center gap-2" title="CLT art. 477 §8º — quando o empregador atrasa o pagamento das verbas rescisórias (>10 dias).">
            <Checkbox checked={apurar477} onCheckedChange={v => setApurar477(!!v)} />
            <Label className="text-xs">Apurar Multa Art. 477 CLT (atraso nas verbas rescisórias — 1 salário)</Label>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2" title="CPC art. 523 §1º: quando o devedor não paga voluntariamente em 15 dias após sentença líquida, multa de 10%. Aplicável em execução trabalhista.">
              <Checkbox checked={apurar523Cpc} onCheckedChange={v => setApurar523Cpc(!!v)} />
              <Label className="text-xs">Apurar Multa Art. 523 CPC (descumprimento de sentença líquida — 10%)</Label>
            </div>
            {apurar523Cpc && (
              <div className="ml-6 mt-2" title="Percentual da multa CPC art. 523. Default: 10%.">
                <Label className="text-xs">Percentual (%)</Label>
                <Input type="number" step="0.1" value={percentual523} onChange={e => setPercentual523(e.target.value)} className="h-7 text-xs w-24 mt-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Listar Multas e Indenizações</CardTitle>
            <Button onClick={openNew} size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Novo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {multas.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-4">Não existem resultados para a pesquisa solicitada.</p>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b border-border"><th className="p-2 text-left font-medium w-20">Ação</th><th className="p-2 text-left font-medium">Descrição</th><th className="p-2 text-left font-medium">Devedor</th><th className="p-2 text-left font-medium">Credor</th><th className="p-2 text-left font-medium">Apurar Imposto de Renda</th></tr></thead>
                <tbody>
                  {multas.map((m, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(idx)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMultas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button></div></td>
                      <td className="p-2 uppercase font-medium">{m.descricao || '—'}</td>
                      <td className="p-2 capitalize">{m.devedor}</td>
                      <td className="p-2 capitalize">{m.credor === 'terceiro' ? m.terceiro_nome : m.credor}</td>
                      <td className="p-2">{m.apurar_ir ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {multas.length > 0 && <p className="text-[10px] text-muted-foreground text-right mt-1">Registros encontrados: {multas.length}</p>}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editIdx !== null ? 'Editar' : 'Nova'} Multa / Indenização</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Descrição</Label><Input value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Devedor</Label><Select value={editForm.devedor} onValueChange={v => setEditForm(p => ({ ...p, devedor: v }))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reclamante">Reclamante</SelectItem><SelectItem value="reclamado">Reclamado</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Credor</Label><Select value={editForm.credor} onValueChange={v => setEditForm(p => ({ ...p, credor: v }))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reclamante">Reclamante</SelectItem><SelectItem value="reclamado">Reclamado</SelectItem><SelectItem value="terceiro">Terceiro</SelectItem></SelectContent></Select></div>
            </div>
            {editForm.credor === 'terceiro' && <div><Label className="text-xs">Nome do Terceiro</Label><Input value={editForm.terceiro_nome} onChange={e => setEditForm(p => ({ ...p, terceiro_nome: e.target.value }))} className="h-8 text-xs mt-1" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo de Valor</Label><Select value={editForm.valor_tipo} onValueChange={v => setEditForm(p => ({ ...p, valor_tipo: v as 'calculado' | 'informado' }))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calculado">Calculado</SelectItem><SelectItem value="informado">Informado</SelectItem></SelectContent></Select></div>
              {editForm.valor_tipo === 'calculado' ? (
                <div><Label className="text-xs">Alíquota (%)</Label><Input type="number" step="0.1" value={editForm.aliquota} onChange={e => setEditForm(p => ({ ...p, aliquota: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              ) : (
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={editForm.valor} onChange={e => setEditForm(p => ({ ...p, valor: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              )}
            </div>
            <div className="flex items-center gap-2"><Checkbox checked={editForm.apurar_ir} onCheckedChange={v => setEditForm(p => ({ ...p, apurar_ir: !!v }))} /><Label className="text-xs">Apurar Imposto de Renda</Label></div>
          </div>
          <DialogFooter><Button size="sm" onClick={saveItem}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
