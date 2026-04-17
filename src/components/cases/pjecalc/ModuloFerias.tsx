import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Calculator } from "lucide-react";

interface Props { caseId: string; }

interface FeriasRow {
  id: string;
  case_id?: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  situacao: string;
  prazo_dias: number;
  dobra?: boolean;
  abono?: boolean;
  abono_dias?: number;
  gozo_1_inicio?: string | null;
  gozo_1_fim?: string | null;
  gozo_1_dobra?: boolean;
  gozo_2_inicio?: string | null;
  gozo_2_fim?: string | null;
  gozo_2_dobra?: boolean;
  gozo_3_inicio?: string | null;
  gozo_3_fim?: string | null;
  gozo_3_dobra?: boolean;
  observacoes?: string | null;
}

const SITUACOES = [
  { value: 'gozadas', label: 'Gozadas' },
  { value: 'gozadas_parcialmente', label: 'Gozadas Parcialmente' },
  { value: 'indenizadas', label: 'Indenizadas' },
  { value: 'vencidas_nao_gozadas', label: 'Vencidas Não Gozadas' },
  { value: 'perdidas', label: 'Perdidas' },
];

export function ModuloFerias({ caseId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: ferias = [] } = useQuery({
    queryKey: ["pjecalc_ferias", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_ferias" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("periodo_aquisitivo_inicio");
      if (error) throw error;
      return (data || []) as unknown as FeriasRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] });

  const toggleExpanded = (id: string) => {
    setExpanded(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const addFerias = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
    const { error } = await supabase.from("pjecalc_ferias" as any).insert({
      case_id: caseId,
      periodo_aquisitivo_inicio: today,
      periodo_aquisitivo_fim: nextYear.toISOString().slice(0, 10),
      periodo_concessivo_inicio: nextYear.toISOString().slice(0, 10),
      periodo_concessivo_fim: today,
      situacao: 'gozadas',
      prazo_dias: 30,
      dobra: false,
      abono: false,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    invalidate();
    toast.success("Período de férias adicionado");
  };

  const updateField = async (id: string, patch: Partial<FeriasRow>) => {
    const { error } = await supabase.from("pjecalc_ferias" as any).update(patch).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    invalidate();
  };

  const removeFerias = async (id: string) => {
    const { error } = await supabase.from("pjecalc_ferias" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Férias</h2>
          <p className="text-xs text-muted-foreground">Períodos aquisitivos e concessivos, situação e gozos parciais.</p>
        </div>
        <Button size="sm" onClick={addFerias}>
          <Plus className="h-4 w-4 mr-1" /> Novo Período
        </Button>
      </div>

      {ferias.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum período de férias cadastrado. Use o gerador automático da tela principal ou adicione manualmente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ferias.map((f) => {
            const isOpen = expanded.has(f.id);
            return (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">
                      {f.periodo_aquisitivo_inicio} → {f.periodo_aquisitivo_fim}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleExpanded(f.id)}>
                        {isOpen ? 'Recolher' : 'Expandir gozos'}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFerias(f.id)} aria-label="Remover período">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px]">Aquisitivo Início</Label>
                      <Input type="date" defaultValue={f.periodo_aquisitivo_inicio} className="h-8 text-xs"
                        onBlur={e => updateField(f.id, { periodo_aquisitivo_inicio: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Aquisitivo Fim</Label>
                      <Input type="date" defaultValue={f.periodo_aquisitivo_fim} className="h-8 text-xs"
                        onBlur={e => updateField(f.id, { periodo_aquisitivo_fim: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Concessivo Início</Label>
                      <Input type="date" defaultValue={f.periodo_concessivo_inicio} className="h-8 text-xs"
                        onBlur={e => updateField(f.id, { periodo_concessivo_inicio: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Concessivo Fim</Label>
                      <Input type="date" defaultValue={f.periodo_concessivo_fim} className="h-8 text-xs"
                        onBlur={e => updateField(f.id, { periodo_concessivo_fim: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <Label className="text-[10px]">Situação</Label>
                      <Select defaultValue={f.situacao} onValueChange={v => updateField(f.id, { situacao: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SITUACOES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Prazo (dias)</Label>
                      <Input type="number" min={0} max={30} defaultValue={f.prazo_dias} className="h-8 text-xs"
                        onBlur={e => updateField(f.id, { prazo_dias: parseInt(e.target.value) || 0 })} />
                    </div>
                    <label className="flex items-center gap-2 text-xs pb-1">
                      <Checkbox defaultChecked={!!f.dobra} onCheckedChange={v => updateField(f.id, { dobra: !!v })} />
                      Dobra Geral
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox defaultChecked={!!f.abono} onCheckedChange={v => updateField(f.id, { abono: !!v })} />
                        Abono
                      </label>
                      <div className="flex-1">
                        <Label className="text-[10px]">Dias Abono</Label>
                        <Input type="number" min={0} max={10} defaultValue={f.abono_dias ?? 0} className="h-8 text-xs"
                          onBlur={e => updateField(f.id, { abono_dias: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t pt-3">
                      <Label className="text-xs font-semibold">Gozos Parciais</Label>
                      {[1, 2, 3].map(n => {
                        const ki = `gozo_${n}_inicio` as const;
                        const kf = `gozo_${n}_fim` as const;
                        const kd = `gozo_${n}_dobra` as const;
                        return (
                          <div key={n} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <div className="text-xs font-medium text-muted-foreground pb-2">Gozo {n}</div>
                            <div>
                              <Label className="text-[10px]">Início</Label>
                              <Input type="date" defaultValue={(f[ki] as string) ?? ''} className="h-8 text-xs"
                                onBlur={e => updateField(f.id, { [ki]: e.target.value || null } as Partial<FeriasRow>)} />
                            </div>
                            <div>
                              <Label className="text-[10px]">Fim</Label>
                              <Input type="date" defaultValue={(f[kf] as string) ?? ''} className="h-8 text-xs"
                                onBlur={e => updateField(f.id, { [kf]: e.target.value || null } as Partial<FeriasRow>)} />
                            </div>
                            <label className="flex items-center gap-2 text-xs pb-1">
                              <Checkbox defaultChecked={!!f[kd]} onCheckedChange={v => updateField(f.id, { [kd]: !!v } as Partial<FeriasRow>)} />
                              Dobra
                            </label>
                          </div>
                        );
                      })}
                      <div>
                        <Label className="text-[10px]">Observações</Label>
                        <Input defaultValue={f.observacoes ?? ''} className="h-8 text-xs"
                          onBlur={e => updateField(f.id, { observacoes: e.target.value })} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
