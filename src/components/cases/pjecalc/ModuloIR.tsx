import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloIR({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_ir_config", caseId],
    queryFn: () => svc.getIrConfig(caseId),
  });

  const [form, setForm] = useState({
    apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
    tributacao_exclusiva_13: false, tributacao_separada_ferias: false,
    aplicar_regime_caixa: false, deduzir_cs: true, deduzir_prev_privada: true,
    deduzir_pensao: true, deduzir_honorarios: true, aposentado_65: false, dependentes: 0,
    // Sprint 3: RRA art. 12-A Lei 7.713/88
    apurar_rra: false,
    rra_meses: 0,
    rra_numero_parcelas: 0,
    incidir_sobre_principal_tributavel: true,
    incidir_sobre_principal_nao_tributavel: false,
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? true,
        incidir_sobre_juros: (d.incidir_sobre_juros as boolean) ?? false,
        cobrar_reclamado: (d.cobrar_reclamado as boolean) ?? false,
        tributacao_exclusiva_13: (d.tributacao_exclusiva_13 as boolean) ?? false,
        tributacao_separada_ferias: (d.tributacao_separada_ferias as boolean) ?? false,
        aplicar_regime_caixa: (d.aplicar_regime_caixa as boolean) ?? false,
        deduzir_cs: (d.deduzir_cs as boolean) ?? true,
        deduzir_prev_privada: (d.deduzir_prev_privada as boolean) ?? true,
        deduzir_pensao: (d.deduzir_pensao as boolean) ?? true,
        deduzir_honorarios: (d.deduzir_honorarios as boolean) ?? true,
        aposentado_65: (d.aposentado_65 as boolean) ?? false,
        dependentes: (d.dependentes as number) ?? 0,
        apurar_rra: (d.apurar_rra as boolean) ?? false,
        rra_meses: (d.rra_meses as number) ?? 0,
        rra_numero_parcelas: (d.rra_numero_parcelas as number) ?? 0,
        incidir_sobre_principal_tributavel: (d.incidir_sobre_principal_tributavel as boolean) ?? true,
        incidir_sobre_principal_nao_tributavel: (d.incidir_sobre_principal_nao_tributavel as boolean) ?? false,
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertIrConfig({ case_id: caseId, ...form } as any);
      qc.invalidateQueries({ queryKey: ["pjecalc_ir_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("IR configurado!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Imposto de Renda</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Imposto de Renda do Reclamante</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
            <Label className="text-xs font-semibold">Apurar Imposto de Renda</Label>
          </div>
          {form.apurar && (
            <div className="flex gap-8">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2" title="Quando marcado, IR incide também sobre os juros mora (Lei 8.541/92 art. 46). Súmula 463 STJ: IRRF sobre juros mora é discutível.">
                  <Checkbox checked={form.incidir_sobre_juros} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_juros: !!v }))} />
                  <Label className="text-xs">Incidir sobre Juros de Mora</Label>
                </div>
                <p className="text-[10px] text-amber-700 -mt-1 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">🔬 Em estudo — Súmula 368 IV TST: IR não incide sobre juros mora trabalhistas. Flag persiste mas engine ainda não distingue. Aguarda PJC com <code>incidirSobreJuros=true</code> + sentença explícita (0/47 no corpus).</p>
                <div className="flex items-center gap-2" title="Quando marcado, IR é cobrado do reclamado em vez do reclamante (raro, depende de sentença).">
                  <Checkbox checked={form.cobrar_reclamado} onCheckedChange={v => setForm(p => ({ ...p, cobrar_reclamado: !!v }))} />
                  <Label className="text-xs">Cobrar do Reclamado</Label>
                </div>
                <p className="text-[10px] text-amber-700 -mt-1 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">🔬 Em estudo — Lei 8.541/92 art. 46 vs Súmula 368 STJ. Flag persiste mas engine ainda calcula IR descontando do reclamante. Aguarda PJC com cobrança ao reclamado como ground-truth (0/47 no corpus).</p>
                <div className="flex items-center gap-2" title="13º salário tributado de forma exclusiva na fonte (separado dos demais rendimentos). Lei 7.713/88 art. 26.">
                  <Checkbox checked={form.tributacao_exclusiva_13} onCheckedChange={v => setForm(p => ({ ...p, tributacao_exclusiva_13: !!v }))} />
                  <Label className="text-xs">Tributação Exclusiva (13º)</Label>
                </div>
                <div className="flex items-center gap-2" title="Férias tributadas em separado. Pode reduzir alíquota efetiva.">
                  <Checkbox checked={form.tributacao_separada_ferias} onCheckedChange={v => setForm(p => ({ ...p, tributacao_separada_ferias: !!v }))} />
                  <Label className="text-xs">Tributação em Separado (Férias)</Label>
                </div>
                <div className="flex items-center gap-2" title="Regime de caixa: IR no momento do pagamento (default). Regime de competência: IR no momento em que devido.">
                  <Checkbox checked={form.aplicar_regime_caixa} onCheckedChange={v => setForm(p => ({ ...p, aplicar_regime_caixa: !!v }))} />
                  <Label className="text-xs">Regime de Caixa</Label>
                </div>

                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">RRA — Rendimentos Recebidos Acumuladamente (Art. 12-A Lei 7.713/88)</p>
                  <p className="text-[10px] text-amber-700 mb-2 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">🔬 Em estudo — UI persiste mas engine ainda calcula IR via tabela progressiva tradicional. Aguarda PJC com <code>rraMeses &gt; 0</code> como ground-truth (0/47 no corpus).</p>
                  <div className="flex items-center gap-2" title="Quando processo abrange período > 12 meses, IR é calculado sobre média mensal (base / RRA_meses). Reduz alíquota efetiva. Aplicável em ações trabalhistas longas.">
                    <Checkbox checked={form.apurar_rra} onCheckedChange={v => setForm(p => ({ ...p, apurar_rra: !!v }))} />
                    <Label className="text-xs">Apurar RRA</Label>
                  </div>
                  {form.apurar_rra && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div title="Número de meses-calendário a que se referem os rendimentos.">
                        <Label className="text-xs">Meses-calendário</Label>
                        <Input type="number" min={1} value={form.rra_meses} onChange={e => setForm(p => ({ ...p, rra_meses: parseInt(e.target.value) || 0 }))} className="h-7 text-xs mt-1" />
                      </div>
                      <div title="Número de parcelas mensais (default = meses).">
                        <Label className="text-xs">Número de Parcelas</Label>
                        <Input type="number" min={1} value={form.rra_numero_parcelas} onChange={e => setForm(p => ({ ...p, rra_numero_parcelas: parseInt(e.target.value) || 0 }))} className="h-7 text-xs mt-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Bases tributáveis</p>
                  <p className="text-[10px] text-amber-700 mb-1 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded">🔬 Em estudo — engine aplica IR sobre verba principal sem distinção tributável/não-tributável. Casos especiais (danos morais tributáveis) aguardam PJC ground-truth.</p>
                  <div className="flex items-center gap-2" title="Verba tributável (salário, hora extra, 13º, férias gozadas). Default: incide IR.">
                    <Checkbox checked={form.incidir_sobre_principal_tributavel} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_principal_tributavel: !!v }))} />
                    <Label className="text-xs">Verba principal TRIBUTÁVEL (default)</Label>
                  </div>
                  <div className="flex items-center gap-2" title="Verba indenizatória normalmente não-tributável (FGTS, multa, férias indenizadas). Marcar apenas em casos específicos como danos morais reconhecidos como tributáveis.">
                    <Checkbox checked={form.incidir_sobre_principal_nao_tributavel} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_principal_nao_tributavel: !!v }))} />
                    <Label className="text-xs">Verba principal NÃO-tributável</Label>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-xs font-semibold">Deduzir da Base do Imposto de Renda</CardTitle></CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2.5">
                    <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_cs} onCheckedChange={v => setForm(p => ({ ...p, deduzir_cs: !!v }))} /><Label className="text-xs">Contribuição Social devida pelo Reclamante</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_prev_privada} onCheckedChange={v => setForm(p => ({ ...p, deduzir_prev_privada: !!v }))} /><Label className="text-xs">Previdência Privada</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_pensao} onCheckedChange={v => setForm(p => ({ ...p, deduzir_pensao: !!v }))} /><Label className="text-xs">Pensão Alimentícia</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_honorarios} onCheckedChange={v => setForm(p => ({ ...p, deduzir_honorarios: !!v }))} /><Label className="text-xs">Honorários devidos pelo Reclamante</Label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={form.aposentado_65} onCheckedChange={v => setForm(p => ({ ...p, aposentado_65: !!v }))} /><Label className="text-xs">Aposentado maior de 65 Anos</Label></div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.dependentes > 0} onCheckedChange={v => setForm(p => ({ ...p, dependentes: v ? Math.max(p.dependentes, 1) : 0 }))} />
                      <Label className="text-xs">Dependentes</Label>
                      <Input type="number" min={0} value={form.dependentes} onChange={e => setForm(p => ({ ...p, dependentes: parseInt(e.target.value) || 0 }))} className="h-7 text-xs w-16" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
