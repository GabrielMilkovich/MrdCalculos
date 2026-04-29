import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Props { caseId: string; }

interface FaltaRow {
  id: string;
  case_id?: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  reiniciar_ferias?: boolean;
  motivo?: string | null;
  documento_id?: string | null;
}

export function ModuloFaltas({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_faltas")
        .select("*")
        .eq("case_id", caseId)
        .order("data_inicial");
      if (error) throw error;
      return (data || []) as unknown as FaltaRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] });

  const addFalta = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await fromUntyped("pjecalc_faltas").insert({
        case_id: caseId,
        data_inicial: today,
        data_final: today,
        justificada: false,
        reiniciar_ferias: false,
        motivo: '',
      });
      if (error) throw error;
      invalidate();
      toast.success("Falta adicionada");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = async (id: string, patch: Partial<FaltaRow>) => {
    const { error } = await fromUntyped("pjecalc_faltas").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    invalidate();
  };

  const removeFalta = async (id: string) => {
    const { error } = await fromUntyped("pjecalc_faltas").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Faltas</h2>
          <p className="text-xs text-muted-foreground">Registros de faltas do empregado (justificadas ou não). Faltas não justificadas reduzem o prazo de férias (Art. 130 CLT).</p>
        </div>
        <Button size="sm" onClick={addFalta} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Nova Falta
        </Button>
      </div>

      <p className="text-[10px] text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200 dark:border-emerald-900"><strong>✓ Reiniciar Férias implementado (v3.6).</strong> Quando marcado, a falta reinicia o período aquisitivo de férias a partir da data de retorno (data final + 1 dia), conforme Art. 130-A CLT (DL 2.318/87). Faltas anteriores ao retorno deixam de contar para a redutora do Art. 130.</p>

      {faltas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma falta registrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {faltas.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label className="text-[10px]">Data Inicial *</Label>
                    <Input
                      type="date"
                      defaultValue={f.data_inicial}
                      className="h-8 text-xs"
                      onBlur={(e) => updateField(f.id, { data_inicial: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Data Final *</Label>
                    <Input
                      type="date"
                      defaultValue={f.data_final}
                      className="h-8 text-xs"
                      onBlur={(e) => updateField(f.id, { data_final: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs pb-1">
                    <Checkbox
                      defaultChecked={f.justificada}
                      onCheckedChange={(v) => updateField(f.id, { justificada: !!v })}
                    />
                    Justificada
                  </label>
                  <label className="flex items-center gap-2 text-xs pb-1" title="Art. 130-A CLT: a partir da data de retorno (data_final + 1 dia), o período aquisitivo de férias reinicia. Faltas anteriores não contam para a redução do Art. 130.">
                    <Checkbox
                      defaultChecked={f.reiniciar_ferias ?? false}
                      onCheckedChange={(v) => updateField(f.id, { reiniciar_ferias: !!v })}
                    />
                    Reiniciar Férias
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-auto"
                    onClick={() => removeFalta(f.id)}
                    aria-label="Remover falta"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Motivo</Label>
                    <Input
                      defaultValue={f.motivo ?? ''}
                      placeholder="Ex: Atestado médico / Licença"
                      className="h-8 text-xs"
                      onBlur={(e) => updateField(f.id, { motivo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Documento ID (opcional)</Label>
                    <Input
                      defaultValue={f.documento_id ?? ''}
                      placeholder="UUID do documento anexado"
                      className="h-8 text-xs font-mono"
                      onBlur={(e) => updateField(f.id, { documento_id: e.target.value || null })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
