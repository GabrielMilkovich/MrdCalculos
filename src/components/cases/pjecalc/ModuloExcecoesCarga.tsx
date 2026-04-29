import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

// =====================================================
// MÓDULO EXCEÇÕES DE CARGA HORÁRIA — ExcecaoDaCargaHoraria.java
// Persiste em pjecalc_excecoes_carga.
// =====================================================

interface Props { caseId: string; }

type ExcForm = {
  id?: string;
  periodo_inicio: string;
  periodo_fim: string;
  carga_horaria_mensal: string;
};

const emptyExc = (): ExcForm => ({
  periodo_inicio: "",
  periodo_fim: "",
  carga_horaria_mensal: "",
});

export function ModuloExcecoesCarga({ caseId }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExcForm>(emptyExc());
  const [saving, setSaving] = useState(false);

  const { data: excecoes = [], isLoading } = useQuery({
    queryKey: ["pjecalc_excecoes_carga", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_excecoes_carga")
        .select("*")
        .eq("case_id", caseId)
        .order("periodo_inicio", { ascending: true });
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
      periodo_inicio: e.periodo_inicio ?? "",
      periodo_fim: e.periodo_fim ?? "",
      carga_horaria_mensal: e.carga_horaria_mensal?.toString() ?? "",
    });
    setDialogOpen(true);
  };

  const saveExc = async () => {
    if (!editing.periodo_inicio || !editing.periodo_fim) {
      toast.error("Informe o período (início e fim).");
      return;
    }
    if (!editing.carga_horaria_mensal.trim()) {
      toast.error("Informe a carga horária mensal.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        periodo_inicio: editing.periodo_inicio,
        periodo_fim: editing.periodo_fim,
        carga_horaria_mensal: Number(editing.carga_horaria_mensal.replace(",", ".")),
      };
      if (editing.id) {
        const { error } = await fromUntyped("pjecalc_excecoes_carga")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await fromUntyped("pjecalc_excecoes_carga")
          .insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_carga", caseId] });
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
      const { error } = await fromUntyped("pjecalc_excecoes_carga").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_excecoes_carga", caseId] });
      toast.success("Exceção excluída!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Exceções de Carga Horária</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Exceções por Período ({excecoes.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && excecoes.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">Nenhuma exceção cadastrada. A carga contratual será aplicada a todo o contrato.</p>
          )}
          {excecoes.length > 0 && (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-1.5 text-left w-32">Período Início</th>
                    <th className="p-1.5 text-left w-32">Período Fim</th>
                    <th className="p-1.5 text-right w-32">Carga Mensal (h)</th>
                    <th className="p-1.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {excecoes.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-1.5">{e.periodo_inicio}</td>
                      <td className="p-1.5">{e.periodo_fim}</td>
                      <td className="p-1.5 text-right font-mono">{e.carga_horaria_mensal}</td>
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
            <DialogTitle className="text-base">{editing.id ? "Editar Exceção" : "Nova Exceção de Carga"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Período Início *</Label>
              <Input type="date" value={editing.periodo_inicio} onChange={(e) => setEditing((p) => ({ ...p, periodo_inicio: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Período Fim *</Label>
              <Input type="date" value={editing.periodo_fim} onChange={(e) => setEditing((p) => ({ ...p, periodo_fim: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Carga Horária Mensal (h) *</Label>
              <Input type="number" step="0.01" value={editing.carga_horaria_mensal} onChange={(e) => setEditing((p) => ({ ...p, carga_horaria_mensal: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 180" />
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
