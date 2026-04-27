import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface AliquotaPeriodo { competencia_inicial: string; competencia_final: string; aliquota: string; }
interface Props { caseId: string; }

export function ModuloPrevidenciaPrivada({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_prev_priv", caseId],
    queryFn: () => svc.getPrevPrivConfig(caseId),
  });

  const [apurar, setApurar] = useState(false);
  const [periodos, setPeriodos] = useState<AliquotaPeriodo[]>([{ competencia_inicial: '', competencia_final: '', aliquota: '' }]);
  // Sprint 2: campos antes hardcoded
  const [baseCalculo, setBaseCalculo] = useState<'diferenca' | 'devido' | 'corrigido'>('diferenca');
  const [tetoMensal, setTetoMensal] = useState('');
  const [juros, setJuros] = useState<'trabalhista' | 'pago_atraso' | 'nenhum'>('trabalhista');

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setApurar((d.apurar as boolean) ?? false);
      if (d.periodos && Array.isArray(d.periodos) && (d.periodos as AliquotaPeriodo[]).length > 0) {
        setPeriodos(d.periodos as AliquotaPeriodo[]);
      } else if (d.percentual) {
        setPeriodos([{ competencia_inicial: '', competencia_final: '', aliquota: d.percentual?.toString() || '' }]);
      }
      setBaseCalculo(((d.base_calculo as string) || 'diferenca') as 'diferenca' | 'devido' | 'corrigido');
      setTetoMensal(d.teto_mensal?.toString() || '');
      setJuros(((d.juros as string) || 'trabalhista') as 'trabalhista' | 'pago_atraso' | 'nenhum');
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertPrevPrivConfig(caseId, {
        apurar,
        percentual: periodos[0]?.aliquota ? parseFloat(periodos[0].aliquota) : 0,
        base_calculo: baseCalculo,
        periodos,
        observacao: null,
        // Sprint 2: novos campos
        teto_mensal: tetoMensal ? parseFloat(tetoMensal) : null,
        juros,
      } as Record<string, unknown>);
      qc.invalidateQueries({ queryKey: ["pjecalc_prev_priv", caseId] });
      toast.success("Previdência Privada configurada!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Previdência Privada</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Previdência Privada</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2"><Checkbox checked={apurar} onCheckedChange={v => setApurar(!!v)} /><Label className="text-xs font-medium">Apurar Previdência Privada</Label></div>
          {apurar && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Alíquota por Período</Label>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPeriodos(p => [...p, { competencia_inicial: '', competencia_final: '', aliquota: '' }])}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border"><th className="p-2 text-left font-medium">Competência Inicial *</th><th className="p-2 text-left font-medium">Competência Final *</th><th className="p-2 text-left font-medium">Alíquota (%) *</th><th className="p-2 w-8"></th></tr></thead>
                  <tbody>
                    {periodos.map((p, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1.5"><Input value={p.competencia_inicial} onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], competencia_inicial: e.target.value }; setPeriodos(n); }} className="h-7 text-xs" placeholder="MM/AAAA" /></td>
                        <td className="p-1.5"><Input value={p.competencia_final} onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], competencia_final: e.target.value }; setPeriodos(n); }} className="h-7 text-xs" placeholder="MM/AAAA" /></td>
                        <td className="p-1.5"><Input type="number" step="0.01" value={p.aliquota} onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], aliquota: e.target.value }; setPeriodos(n); }} className="h-7 text-xs" /></td>
                        <td className="p-1.5">{periodos.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPeriodos(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground">A previdência privada complementar será apurada sobre as verbas com incidência marcada e poderá ser deduzida da base do IR conforme Art. 11 da Lei 9.532/97.</p>

              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Configurações avançadas</p>
                <p className="text-[10px] text-emerald-700 mb-1 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded">✓ <strong>Base de Cálculo</strong> e <strong>Deduzir IR</strong> agora são editáveis (antes hardcoded). 🔬 Teto Mensal e Juros em estudo — aguarda PJC com prev. privada ativa (0/47 no corpus).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div title="Base sobre a qual incide o percentual: diferença (devido - pago), valor devido total, ou valor corrigido.">
                    <Label className="text-xs">Base de Cálculo</Label>
                    <Select value={baseCalculo} onValueChange={v => setBaseCalculo(v as 'diferenca' | 'devido' | 'corrigido')}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diferenca">Diferença (devido - pago)</SelectItem>
                        <SelectItem value="devido">Valor Devido</SelectItem>
                        <SelectItem value="corrigido">Valor Corrigido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div title="Teto mensal: alíquota não incide sobre o valor que exceder esse limite. Útil quando o plano de previdência tem teto contratual.">
                    <Label className="text-xs">Teto Mensal (R$)</Label>
                    <Input type="number" step="0.01" value={tetoMensal} onChange={e => setTetoMensal(e.target.value)} className="h-8 text-xs mt-1" placeholder="Sem teto" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div title="Como aplicar juros sobre prev. privada atrasada. Trabalhista (default) usa o mesmo dos demais. Pago em atraso aplica juros desde a data efetiva.">
                    <Label className="text-xs">Juros</Label>
                    <Select value={juros} onValueChange={v => setJuros(v as 'trabalhista' | 'pago_atraso' | 'nenhum')}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trabalhista">Trabalhista (default)</SelectItem>
                        <SelectItem value="pago_atraso">Pago em atraso</SelectItem>
                        <SelectItem value="nenhum">Sem juros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
