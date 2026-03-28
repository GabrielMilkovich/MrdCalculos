import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloPensaoAlimenticia({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_pensao_config", caseId],
    queryFn: () => svc.getPensaoConfig(caseId),
  });

  const [form, setForm] = useState({ apurar: false, percentual: '', incidir_sobre_juros: false, base: 'liquido' as 'liquido' | 'bruto' | 'principal' });

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? false,
        percentual: d.percentual?.toString() || '',
        incidir_sobre_juros: (d.incidir_sobre_juros as boolean) ?? false,
        base: ((d.base_incidencia as string) || 'liquido') as 'liquido' | 'bruto' | 'principal',
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertPensaoConfig(caseId, {
        apurar: form.apurar, percentual: form.percentual ? parseFloat(form.percentual) : 0,
        incidir_sobre_juros: form.incidir_sobre_juros, base: form.base, beneficiario: '', observacoes: '', valor_fixo: null,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_pensao_config", caseId] });
      toast.success("Pensão Alimentícia salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pensão Alimentícia</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Pensão Alimentícia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs font-medium">Apurar Pensão Alimentícia</Label></div>
          {form.apurar && (
            <div className="space-y-4">
              <div><Label className="text-xs font-semibold">Alíquota (%)</Label><Input type="number" step="0.01" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: e.target.value }))} className="mt-1 h-8 text-xs w-40" placeholder="Ex: 30" /></div>
              <div className="flex items-center gap-2"><Checkbox checked={form.incidir_sobre_juros} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_juros: !!v }))} /><Label className="text-xs">Incidir sobre Juros</Label></div>
              <div>
                <Label className="text-xs font-semibold">Base de Cálculo</Label>
                <Select value={form.base} onValueChange={v => setForm(p => ({ ...p, base: v as typeof form.base }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liquido">Base Líquida (após INSS e IR)</SelectItem>
                    <SelectItem value="bruto">Base Bruta (antes dos descontos)</SelectItem>
                    <SelectItem value="principal">Somente Principal (sem multas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
