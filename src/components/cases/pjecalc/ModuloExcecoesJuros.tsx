import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Scale, AlertTriangle } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

const TIPOS_JUROS = [
  { value: 'SEM_JUROS', label: 'Sem Juros' },
  { value: 'SELIC', label: 'SELIC' },
  { value: 'TAXA_LEGAL', label: 'Taxa Legal' },
  { value: 'UM_PORCENTO', label: '1% a.m.' },
  { value: 'MEIO_PORCENTO', label: '0,5% a.m.' },
];

export function ModuloExcecoesJuros({ caseId }: Props) {
  const qc = useQueryClient();
  const { data: excecoes = [] } = useQuery({
    queryKey: ["pjecalc_excecoes_juros", caseId],
    queryFn: () => svc.getExcecoesJuros(caseId),
  });

  const [adding, setAdding] = useState(false);
  const [newExc, setNewExc] = useState({ periodo_inicio: '', periodo_fim: '', tipo_juros: 'SEM_JUROS' as string, motivo: '' });

  const handleAdd = async () => {
    if (!newExc.periodo_inicio || !newExc.periodo_fim) {
      toast.error("Período início e fim são obrigatórios");
      return;
    }
    try {
      await svc.insertExcecaoJuros({
        calculo_id: caseId,
        periodo_inicio: newExc.periodo_inicio,
        periodo_fim: newExc.periodo_fim,
        tipo_juros: newExc.tipo_juros as svc.ExcecaoJurosRow['tipo_juros'],
        motivo: newExc.motivo || null,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_juros", caseId] });
      setNewExc({ periodo_inicio: '', periodo_fim: '', tipo_juros: 'SEM_JUROS', motivo: '' });
      setAdding(false);
      toast.success("Exceção adicionada");
    } catch {
      toast.error("Erro ao adicionar");
    }
  };

  const handleDelete = async (id: string) => {
    await svc.deleteExcecaoJuros(id);
    qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_juros", caseId] });
    toast.success("Exceção removida");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4" />Exceções de Juros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 rounded-md">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Módulo em desenvolvimento</div>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              As exceções de juros cadastradas aqui ainda não são lidas pelo motor de cálculo.
              Para aplicar regime diferente de juros, use a configuração de Combinação por Data no módulo Correção.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Períodos com regime de juros diferente do padrão</p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" />Adicionar
          </Button>
        </div>

        {excecoes.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground p-3 text-center border rounded-md border-dashed">Nenhuma exceção cadastrada</p>
        )}

        {excecoes.map((e: svc.ExcecaoJurosRow) => (
          <div key={e.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
            <span className="text-xs">{e.periodo_inicio} → {e.periodo_fim}</span>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10">{TIPOS_JUROS.find(t => t.value === e.tipo_juros)?.label}</span>
            {e.motivo && <span className="text-xs text-muted-foreground flex-1">{e.motivo}</span>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(e.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}

        {adding && (
          <div className="p-3 rounded border border-primary/30 bg-primary/5 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px]">Início</Label>
                <Input type="date" className="h-7 text-xs" value={newExc.periodo_inicio} onChange={e => setNewExc(p => ({ ...p, periodo_inicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Fim</Label>
                <Input type="date" className="h-7 text-xs" value={newExc.periodo_fim} onChange={e => setNewExc(p => ({ ...p, periodo_fim: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Tipo</Label>
                <Select value={newExc.tipo_juros} onValueChange={v => setNewExc(p => ({ ...p, tipo_juros: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_JUROS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Motivo</Label>
                <Input className="h-7 text-xs" value={newExc.motivo} onChange={e => setNewExc(p => ({ ...p, motivo: e.target.value }))} placeholder="Ex: COVID-19" />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>Confirmar</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
