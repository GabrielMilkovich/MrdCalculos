import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

// =====================================================
// MÓDULO EXCEÇÕES DE SÁBADO — ExcecaoDoSabado.java
// Persiste em pjecalc_excecoes_sabado.
// Override do flag global sabado_dia_util por período.
// =====================================================

interface Props { caseId: string; }

type ExcForm = {
  id?: string;
  data_inicio: string;
  data_fim: string;
  sabado_dia_util: boolean;
};

const emptyExc = (): ExcForm => ({
  data_inicio: "",
  data_fim: "",
  sabado_dia_util: false,
});

export function ModuloExcecoesSabado({ caseId }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExcForm>(emptyExc());
  const [saving, setSaving] = useState(false);

  const { data: excecoes = [], isLoading } = useQuery({
    queryKey: ["pjecalc_excecoes_sabado", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_excecoes_sabado")
        .select("*")
        .eq("case_id", caseId)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown[];
    },
  });

  const openNew = () => {
    setEditing(emptyExc());
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing({
      id: e.id,
      data_inicio: e.data_inicio ?? "",
      data_fim: e.data_fim ?? "",
      sabado_dia_util: e.sabado_dia_util ?? false,
    });
    setDialogOpen(true);
  };

  const saveExc = async () => {
    if (!editing.data_inicio || !editing.data_fim) {
      toast.error("Informe data inicial e final.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        data_inicio: editing.data_inicio,
        data_fim: editing.data_fim,
        sabado_dia_util: editing.sabado_dia_util,
      };
      if (editing.id) {
        const { error } = await fromUntyped("pjecalc_excecoes_sabado")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await fromUntyped("pjecalc_excecoes_sabado")
          .insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_sabado", caseId] });
      toast.success(editing.id ? "Exceção atualizada!" : "Exceção adicionada!");
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteExc = async (id: string) => {
    if (!confirm("Excluir esta exceção?")) return;
    try {
      const { error } = await fromUntyped("pjecalc_excecoes_sabado").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_sabado", caseId] });
      toast.success("Exceção excluída!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Exceções de Sábado</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Exceções por Período ({excecoes.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && excecoes.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">Nenhuma exceção. O flag global de sábado como dia útil será usado em todo o contrato.</p>
          )}
          {excecoes.length > 0 && (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-1.5 text-left w-32">Data Início</th>
                    <th className="p-1.5 text-left w-32">Data Fim</th>
                    <th className="p-1.5 text-center w-32">Sábado Dia Útil?</th>
                    <th className="p-1.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {excecoes.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-1.5">{e.data_inicio}</td>
                      <td className="p-1.5">{e.data_fim}</td>
                      <td className="p-1.5 text-center">{e.sabado_dia_util ? "Sim" : "Não"}</td>
                      <td className="p-1.5 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(e)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteExc(e.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing.id ? "Editar Exceção" : "Nova Exceção de Sábado"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Data Início *</Label>
              <Input type="date" value={editing.data_inicio} onChange={(e) => setEditing((p) => ({ ...p, data_inicio: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Data Fim *</Label>
              <Input type="date" value={editing.data_fim} onChange={(e) => setEditing((p) => ({ ...p, data_fim: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-2">
              <Checkbox checked={editing.sabado_dia_util} onCheckedChange={(v) => setEditing((p) => ({ ...p, sabado_dia_util: !!v }))} />
              <Label className="text-xs">Sábado é dia útil neste período</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={saveExc} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
