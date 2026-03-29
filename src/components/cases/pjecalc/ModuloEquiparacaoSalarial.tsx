import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Loader2, Scale, Plus, Trash2, Pencil } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface ParadigmaSalario {
  competencia: string;
  salario_paradigma: string;
  salario_empregado: string;
}

interface EquiparacaoConfig {
  ativo: boolean;
  paradigma_nome: string;
  paradigma_funcao: string;
  periodo_inicio: string;
  periodo_fim: string;
  salarios: ParadigmaSalario[];
  observacoes: string;
}

const EMPTY: EquiparacaoConfig = {
  ativo: true,
  paradigma_nome: '',
  paradigma_funcao: '',
  periodo_inicio: '',
  periodo_fim: '',
  salarios: [],
  observacoes: '',
};

const EMPTY_SALARIO: ParadigmaSalario = {
  competencia: '',
  salario_paradigma: '',
  salario_empregado: '',
};

export function ModuloEquiparacaoSalarial({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<EquiparacaoConfig>(EMPTY);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParadigmaSalario>(EMPTY_SALARIO);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.equiparacao_config) {
        setConfig(d.equiparacao_config as EquiparacaoConfig);
      }
    }
  }, [data]);

  const update = (partial: Partial<EquiparacaoConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }));

  const openNew = () => { setEditIdx(null); setEditForm({ ...EMPTY_SALARIO }); setDialogOpen(true); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditForm({ ...config.salarios[idx] }); setDialogOpen(true); };
  const saveItem = () => {
    if (editIdx !== null) {
      update({ salarios: config.salarios.map((s, i) => i === editIdx ? editForm : s) });
    } else {
      update({ salarios: [...config.salarios, editForm] });
    }
    setDialogOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        ...d,
        equiparacao_config: config,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Equiparacao salarial salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5" /> Equiparacao Salarial
        </h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Art. 461 CLT - Equiparacao Salarial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={config.ativo} onCheckedChange={v => update({ ativo: !!v })} />
            <Label className="text-xs">Apurar diferencas por equiparacao salarial</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome do Paradigma</Label>
              <Input
                value={config.paradigma_nome}
                onChange={e => update({ paradigma_nome: e.target.value })}
                className="h-8 text-xs mt-1"
                placeholder="Nome do empregado paradigma"
              />
            </div>
            <div>
              <Label className="text-xs">Funcao do Paradigma</Label>
              <Input
                value={config.paradigma_funcao}
                onChange={e => update({ paradigma_funcao: e.target.value })}
                className="h-8 text-xs mt-1"
                placeholder="Ex: Analista Sr."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Periodo Inicio</Label>
              <Input type="date" value={config.periodo_inicio} onChange={e => update({ periodo_inicio: e.target.value })} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Periodo Fim</Label>
              <Input type="date" value={config.periodo_fim} onChange={e => update({ periodo_fim: e.target.value })} className="h-8 text-xs mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Salarios por Competencia</CardTitle>
            <Button onClick={openNew} size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Novo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {config.salarios.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-4">Nenhum salario informado. Adicione as competencias com os salarios do paradigma e do empregado.</p>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b border-border"><th className="p-2 text-left font-medium w-20">Acao</th><th className="p-2 text-left font-medium">Competencia</th><th className="p-2 text-right font-medium">Sal. Paradigma</th><th className="p-2 text-right font-medium">Sal. Empregado</th><th className="p-2 text-right font-medium">Diferenca</th></tr></thead>
                <tbody>
                  {config.salarios.map((s, idx) => {
                    const dif = Math.max(0, parseFloat(s.salario_paradigma || '0') - parseFloat(s.salario_empregado || '0'));
                    return (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(idx)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => update({ salarios: config.salarios.filter((_, i) => i !== idx) })}><Trash2 className="h-3 w-3 text-destructive" /></Button></div></td>
                        <td className="p-2 font-medium">{s.competencia || '---'}</td>
                        <td className="p-2 text-right">{parseFloat(s.salario_paradigma || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-2 text-right">{parseFloat(s.salario_empregado || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-2 text-right font-medium text-green-600">{dif.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {config.salarios.length > 0 && <p className="text-[10px] text-muted-foreground text-right mt-1">Registros: {config.salarios.length}</p>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editIdx !== null ? 'Editar' : 'Novo'} Salario por Competencia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Competencia (YYYY-MM)</Label><Input value={editForm.competencia} onChange={e => setEditForm(p => ({ ...p, competencia: e.target.value }))} className="h-8 text-xs mt-1" placeholder="2024-01" /></div>
            <div><Label className="text-xs">Salario do Paradigma (R$)</Label><Input type="number" step="0.01" value={editForm.salario_paradigma} onChange={e => setEditForm(p => ({ ...p, salario_paradigma: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div><Label className="text-xs">Salario do Empregado (R$)</Label><Input type="number" step="0.01" value={editForm.salario_empregado} onChange={e => setEditForm(p => ({ ...p, salario_empregado: e.target.value }))} className="h-8 text-xs mt-1" /></div>
          </div>
          <DialogFooter><Button size="sm" onClick={saveItem}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-[10px] text-muted-foreground">
        Art. 461 CLT + Sumula 6 TST: mesma funcao, mesmo empregador, mesma localidade.
        Gera reflexos em 13o, ferias + 1/3, DSR e FGTS.
      </p>
    </div>
  );
}
