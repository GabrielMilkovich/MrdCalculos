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

  const [form, setForm] = useState({
    apurar: false, percentual: '',
    incidir_sobre_juros: false,
    base: 'liquido' as 'liquido' | 'bruto' | 'principal',
    // Sprint 2: campos novos
    incidencia_sobre_fgts: false,
    incidencia_sobre_multa_fgts: false,
    descontar_antes_ir: true,
    beneficiario: '',
  });

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? false,
        percentual: d.percentual?.toString() || '',
        incidir_sobre_juros: (d.incidir_sobre_juros as boolean) ?? false,
        base: ((d.base_incidencia as string) || 'liquido') as 'liquido' | 'bruto' | 'principal',
        incidencia_sobre_fgts: (d.incidencia_sobre_fgts as boolean) ?? false,
        incidencia_sobre_multa_fgts: (d.incidencia_sobre_multa_fgts as boolean) ?? false,
        descontar_antes_ir: (d.descontar_antes_ir as boolean) ?? true,
        beneficiario: (d.beneficiario as string) ?? '',
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertPensaoConfig(caseId, {
        apurar: form.apurar,
        percentual: form.percentual ? parseFloat(form.percentual) : 0,
        incidir_sobre_juros: form.incidir_sobre_juros,
        base: form.base,
        beneficiario: form.beneficiario,
        observacoes: '',
        valor_fixo: null,
        // Sprint 2: campos novos persistidos via dados extras (service deve aceitar)
        incidencia_sobre_fgts: form.incidencia_sobre_fgts,
        incidencia_sobre_multa_fgts: form.incidencia_sobre_multa_fgts,
        descontar_antes_ir: form.descontar_antes_ir,
      } as Record<string, unknown>);
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

              <div title="Nome do beneficiário (filho/cônjuge) que recebe a pensão.">
                <Label className="text-xs font-semibold">Beneficiário</Label>
                <Input value={form.beneficiario} onChange={e => setForm(p => ({ ...p, beneficiario: e.target.value }))} className="mt-1 h-8 text-xs w-72" placeholder="Nome do beneficiário" />
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Incidências adicionais</p>
                <p className="text-[10px] text-amber-700 mb-1 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">🔬 Em estudo — campos persistidos mas engine ainda não aplica pensão sobre FGTS/multa FGTS, nem deduz da base IR. Aguarda PJC com pensão alimentícia ativa (0/47 no corpus).</p>

                <div className="flex items-center gap-2" title="Quando marcado, pensão também incide sobre o FGTS pago ao reclamante. Lei 5.478/68 art. 4º. Java: <incidenciaPensaoAlimenticia> em Fgts.">
                  <Checkbox checked={form.incidencia_sobre_fgts} onCheckedChange={v => setForm(p => ({ ...p, incidencia_sobre_fgts: !!v }))} />
                  <Label className="text-xs">Incidir sobre FGTS</Label>
                </div>

                <div className="flex items-center gap-2" title="Pensão incide também sobre a multa 40% do FGTS quando há rescisão sem justa causa.">
                  <Checkbox checked={form.incidencia_sobre_multa_fgts} onCheckedChange={v => setForm(p => ({ ...p, incidencia_sobre_multa_fgts: !!v }))} />
                  <Label className="text-xs">Incidir sobre Multa 40% FGTS</Label>
                </div>

                <div className="flex items-center gap-2" title="Lei 9.250/95 art. 4º II: pensão alimentícia é dedução da base de cálculo do IR. Default ativado.">
                  <Checkbox checked={form.descontar_antes_ir} onCheckedChange={v => setForm(p => ({ ...p, descontar_antes_ir: !!v }))} />
                  <Label className="text-xs">Deduzir da base de IR (Lei 9.250/95)</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
