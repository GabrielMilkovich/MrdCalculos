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
import { FGTSSaldosSaques } from "./FGTSSaldosSaques";
import { GradeFGTSOcorrencias } from "./GradeFGTSOcorrencias";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloFGTS({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_fgts_config", caseId],
    queryFn: () => svc.getFgtsConfig(caseId),
  });

  const [form, setForm] = useState({
    apurar: true, destino: 'pagar_reclamante', compor_principal: true,
    multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40,
    multa_base: 'devido', multa_valor_informado: '',
    deduzir_saldo: false, lc110_10: false, lc110_05: false,
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? true, destino: (d.destino as string) || 'pagar_reclamante',
        compor_principal: (d.compor_principal as boolean) ?? true, multa_apurar: (d.multa_apurar as boolean) ?? true,
        multa_tipo: (d.multa_tipo as string) || 'calculada', multa_percentual: (d.multa_percentual as number) ?? 40,
        multa_base: (d.multa_base as string) || 'devido', multa_valor_informado: d.multa_valor_informado?.toString() || '',
        deduzir_saldo: (d.deduzir_saldo as boolean) ?? false, lc110_10: (d.lc110_10 as boolean) ?? false, lc110_05: (d.lc110_05 as boolean) ?? false,
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertFgtsConfig({
        case_id: caseId, ...form,
        multa_percentual: Number(form.multa_percentual),
        multa_valor_informado: form.multa_valor_informado ? parseFloat(form.multa_valor_informado) : null,
      } as any);
      qc.invalidateQueries({ queryKey: ["pjecalc_fgts_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("FGTS configurado!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FGTS</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Depósitos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar FGTS (8%)</Label></div>
          <div>
            <Label className="text-xs">Destino</Label>
            <Select value={form.destino} onValueChange={v => setForm(p => ({ ...p, destino: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pagar_reclamante">Pagar ao Reclamante</SelectItem>
                <SelectItem value="recolher_conta">Recolher na Conta Vinculada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Checkbox checked={form.compor_principal} onCheckedChange={v => setForm(p => ({ ...p, compor_principal: !!v }))} /><Label className="text-xs">Compor Principal</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Multa Rescisória</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.multa_apurar} onCheckedChange={v => setForm(p => ({ ...p, multa_apurar: !!v }))} /><Label className="text-xs">Apurar Multa</Label></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Tipo</Label><Select value={form.multa_tipo} onValueChange={v => setForm(p => ({ ...p, multa_tipo: v }))}><SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calculada">Calculada</SelectItem><SelectItem value="informada">Informada</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Percentual (%)</Label><Select value={form.multa_percentual.toString()} onValueChange={v => setForm(p => ({ ...p, multa_percentual: Number(v) }))}><SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="40">40%</SelectItem><SelectItem value="20">20%</SelectItem><SelectItem value="0">0%</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Base</Label><Select value={form.multa_base} onValueChange={v => setForm(p => ({ ...p, multa_base: v }))}><SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="devido">Devido</SelectItem><SelectItem value="diferenca">Diferença</SelectItem><SelectItem value="saldo_saque">Saldo p/ Saque</SelectItem><SelectItem value="depositos_corrigidos">Depósitos Corrigidos</SelectItem></SelectContent></Select></div>
          </div>
          {form.multa_tipo === 'informada' && (
            <div><Label className="text-xs">Valor Informado (R$)</Label><Input type="number" step="0.01" value={form.multa_valor_informado} onChange={e => setForm(p => ({ ...p, multa_valor_informado: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Opções Adicionais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_saldo} onCheckedChange={v => setForm(p => ({ ...p, deduzir_saldo: !!v }))} /><Label className="text-xs">Deduzir Saldo/Saques</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.lc110_10} onCheckedChange={v => setForm(p => ({ ...p, lc110_10: !!v }))} /><Label className="text-xs">LC 110/2001 — 10% (empregador)</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.lc110_05} onCheckedChange={v => setForm(p => ({ ...p, lc110_05: !!v }))} /><Label className="text-xs">LC 110/2001 — 0,5% (empregador)</Label></div>
        </CardContent>
      </Card>
      <FGTSSaldosSaques caseId={caseId} />
      <GradeFGTSOcorrencias caseId={caseId} />
    </div>
  );
}
