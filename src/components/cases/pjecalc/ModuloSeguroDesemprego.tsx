import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

/**
 * Seguro-Desemprego — espelha a tela PJe-Calc:
 *   Apurar | Valor (Informado/Calculado) | Empregado Doméstico (Sim/Não)
 *   Tipo Solicitação (Trabalhador Urbano/Rural/Doméstico/Pescador)
 *   Compor Principal | Quantidade de Parcelas
 *   Remuneração Mensal — Salários Devidos (Nenhum/Maior/Histórico) + Verba/Integralizar
 *   Histórico (quando "Histórico Salarial")
 */
export function ModuloSeguroDesemprego({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_seguro_config", caseId],
    queryFn: () => svc.getSeguroConfig(caseId),
  });

  const [form, setForm] = useState({
    apurar: false,
    valor_tipo: 'calculado' as 'informado' | 'calculado',
    valor_informado: '',
    empregado_domestico: false,
    tipo_solicitacao: 'trabalhador_urbano' as 'trabalhador_urbano' | 'trabalhador_rural' | 'empregado_domestico' | 'pescador_artesanal',
    compor_principal: true,
    parcelas: 5,
    valor_parcela: '',
    remuneracao_fonte: 'maior' as 'nenhum' | 'maior' | 'historico',
    historico_id: '',
    integralizar: 'nao' as 'sim' | 'nao',
    recebeu: false,
    observacoes: '',
  });

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? false,
        valor_tipo: ((d.valor_tipo as string) || 'calculado') as 'informado' | 'calculado',
        valor_informado: d.valor_informado?.toString() || '',
        empregado_domestico: (d.empregado_domestico as boolean) ?? false,
        tipo_solicitacao: ((d.tipo_solicitacao as string) || 'trabalhador_urbano') as typeof form.tipo_solicitacao,
        compor_principal: (d.compor_principal as boolean) ?? true,
        parcelas: (d.parcelas as number) ?? 5,
        valor_parcela: d.valor_parcela?.toString() || '',
        remuneracao_fonte: ((d.remuneracao_fonte as string) || 'maior') as typeof form.remuneracao_fonte,
        historico_id: (d.historico_id as string) || '',
        integralizar: ((d.integralizar as string) || 'nao') as 'sim' | 'nao',
        recebeu: (d.recebeu as boolean) ?? false,
        observacoes: (d.observacoes as string) || '',
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertSeguroConfig(caseId, {
        ...form,
        valor_parcela: form.valor_parcela ? parseFloat(form.valor_parcela) : null,
        valor_informado: form.valor_informado ? parseFloat(form.valor_informado) : null,
      } as never);
      qc.invalidateQueries({ queryKey: ["pjecalc_seguro_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Seguro-desemprego salvo!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Seguro-Desemprego</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Seguro-desemprego</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
              <Label className="text-xs font-semibold">Apurar Seguro-desemprego</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.empregado_domestico} onCheckedChange={v => setForm(p => ({ ...p, empregado_domestico: !!v }))} />
              <Label className="text-xs">Empregado Doméstico</Label>
            </div>
            <div>
              <Label className="text-xs">Valor</Label>
              <RadioGroup value={form.valor_tipo} onValueChange={v => setForm(p => ({ ...p, valor_tipo: v as 'informado' | 'calculado' }))} className="flex gap-4 mt-1">
                <div className="flex items-center gap-1"><RadioGroupItem value="informado" id="vi" /><Label htmlFor="vi" className="text-xs">Informado</Label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="calculado" id="vc" /><Label htmlFor="vc" className="text-xs">Calculado</Label></div>
              </RadioGroup>
            </div>
          </div>

          {form.apurar && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Tipo de Solicitação *</Label>
                  <Select value={form.tipo_solicitacao} onValueChange={v => setForm(p => ({ ...p, tipo_solicitacao: v as typeof form.tipo_solicitacao }))}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabalhador_urbano">Trabalhador Urbano</SelectItem>
                      <SelectItem value="trabalhador_rural">Trabalhador Rural</SelectItem>
                      <SelectItem value="empregado_domestico">Empregado Doméstico</SelectItem>
                      <SelectItem value="pescador_artesanal">Pescador Artesanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Compor Principal *</Label>
                  <RadioGroup value={form.compor_principal ? 'sim' : 'nao'} onValueChange={v => setForm(p => ({ ...p, compor_principal: v === 'sim' }))} className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1"><RadioGroupItem value="sim" id="cs" /><Label htmlFor="cs" className="text-xs">Sim</Label></div>
                    <div className="flex items-center gap-1"><RadioGroupItem value="nao" id="cn" /><Label htmlFor="cn" className="text-xs">Não</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs">Quantidade de Parcelas *</Label>
                  <Input type="number" min={3} max={5} value={form.parcelas} onChange={e => setForm(p => ({ ...p, parcelas: parseInt(e.target.value) || 5 }))} className="mt-1 h-8 text-xs" />
                </div>
              </div>

              {form.valor_tipo === 'informado' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Valor Informado Total (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_informado} onChange={e => setForm(p => ({ ...p, valor_informado: e.target.value }))} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor por Parcela (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_parcela} onChange={e => setForm(p => ({ ...p, valor_parcela: e.target.value }))} className="mt-1 h-8 text-xs" />
                  </div>
                </div>
              )}

              <Card className="bg-muted/20">
                <CardHeader className="pb-2 pt-3"><CardTitle className="text-xs">Remuneração Mensal — Salários Devidos</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <RadioGroup value={form.remuneracao_fonte} onValueChange={v => setForm(p => ({ ...p, remuneracao_fonte: v as typeof form.remuneracao_fonte }))} className="flex gap-6">
                    <div className="flex items-center gap-1"><RadioGroupItem value="nenhum" id="rn" /><Label htmlFor="rn" className="text-xs">Nenhum</Label></div>
                    <div className="flex items-center gap-1"><RadioGroupItem value="maior" id="rm" /><Label htmlFor="rm" className="text-xs">Maior Remuneração</Label></div>
                    <div className="flex items-center gap-1"><RadioGroupItem value="historico" id="rh" /><Label htmlFor="rh" className="text-xs">Histórico Salarial</Label></div>
                  </RadioGroup>
                  {form.remuneracao_fonte === 'historico' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Histórico *</Label>
                        <Input value={form.historico_id} onChange={e => setForm(p => ({ ...p, historico_id: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="ID do histórico salarial" />
                      </div>
                      <div>
                        <Label className="text-xs">Integralizar *</Label>
                        <RadioGroup value={form.integralizar} onValueChange={v => setForm(p => ({ ...p, integralizar: v as 'sim' | 'nao' }))} className="flex gap-4 mt-1">
                          <div className="flex items-center gap-1"><RadioGroupItem value="sim" id="is" /><Label htmlFor="is" className="text-xs">Sim</Label></div>
                          <div className="flex items-center gap-1"><RadioGroupItem value="nao" id="in" /><Label htmlFor="in" className="text-xs">Não</Label></div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox checked={form.recebeu} onCheckedChange={v => setForm(p => ({ ...p, recebeu: !!v }))} />
                <Label className="text-xs">Reclamante recebeu Seguro-Desemprego (desabilita apuração)</Label>
              </div>
              <p className="text-[10px] text-muted-foreground">Valor calculado com base na tabela FAT/CODEFAT vigente. Resolução CODEFAT 957/2022.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
