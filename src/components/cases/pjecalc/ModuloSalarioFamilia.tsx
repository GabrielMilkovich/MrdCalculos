import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }
interface FilhoDetalhe { nome: string; nascimento: string; ate_14: boolean; }
interface VariacaoQtd { competencia: string; quantidade: number; }

/**
 * Salário-Família — espelha a tela PJe-Calc:
 *   Apurar | Compor Principal (Sim/Não)
 *   Competência Inicial / Final
 *   Qtd de filhos menores de 14 anos
 *   Variação de Qtd filhos (Competência + Quantidade) — múltiplos pontos
 *   Remuneração Mensal — Salários Pagos (Nenhum/Maior/Histórico)
 *   Remuneração Mensal — Salários Devidos Diferença (Nenhum/Maior/Histórico)
 *   Verba / Integralizar
 *
 * Cálculo segue Art. 65 e ss. Lei 8.213/91 + Portaria MPS/MF vigente.
 * A cota é devida por filho < 14 anos OU inválido, se renda ≤ teto.
 */
export function ModuloSalarioFamilia({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_salario_familia_config", caseId],
    queryFn: () => svc.getSalarioFamiliaConfig(caseId),
  });

  const [form, setForm] = useState({
    apurar: false,
    compor_principal: true,
    competencia_inicial: '',
    competencia_final: '',
    qtd_filhos: 0,
    remuneracao_pagos: 'maior' as 'nenhum' | 'maior' | 'historico',
    remuneracao_devidos: 'nenhum' as 'nenhum' | 'maior' | 'historico',
    historico_id: '',
    integralizar: false,
    observacoes: '',
  });
  const [filhos, setFilhos] = useState<FilhoDetalhe[]>([]);
  const [variacoes, setVariacoes] = useState<VariacaoQtd[]>([]);

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? false,
        compor_principal: (d.compor_principal as boolean) ?? true,
        competencia_inicial: (d.competencia_inicial as string) || '',
        competencia_final: (d.competencia_final as string) || '',
        qtd_filhos: (d.qtd_filhos as number) ?? 0,
        remuneracao_pagos: ((d.remuneracao_pagos as string) || 'maior') as typeof form.remuneracao_pagos,
        remuneracao_devidos: ((d.remuneracao_devidos as string) || 'nenhum') as typeof form.remuneracao_devidos,
        historico_id: (d.historico_id as string) || '',
        integralizar: (d.integralizar as boolean) ?? false,
        observacoes: (d.observacoes as string) || '',
      });
      setFilhos((d.filhos_detalhes as FilhoDetalhe[]) || []);
      setVariacoes((d.variacoes_qtd as VariacaoQtd[]) || []);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertSalarioFamiliaConfig(caseId, {
        ...form,
        numero_filhos: filhos.length || form.qtd_filhos,
        filhos_detalhes: filhos,
        variacoes_qtd: variacoes,
      } as never);
      qc.invalidateQueries({ queryKey: ["pjecalc_salario_familia_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Salário-Família salvo!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Salário-Família</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Salário-família</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
              <Label className="text-xs font-semibold">Apurar Salário-família (Art. 65 Lei 8.213/91)</Label>
            </div>
            <div>
              <Label className="text-xs">Compor Principal *</Label>
              <RadioGroup value={form.compor_principal ? 'sim' : 'nao'} onValueChange={v => setForm(p => ({ ...p, compor_principal: v === 'sim' }))} className="flex gap-4 mt-1">
                <div className="flex items-center gap-1"><RadioGroupItem value="sim" id="sfcs" /><Label htmlFor="sfcs" className="text-xs">Sim</Label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="nao" id="sfcn" /><Label htmlFor="sfcn" className="text-xs">Não</Label></div>
              </RadioGroup>
            </div>
          </div>

          {form.apurar && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs">Competência Inicial *</Label><Input value={form.competencia_inicial} onChange={e => setForm(p => ({ ...p, competencia_inicial: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="MM/AAAA" /></div>
                <div><Label className="text-xs">Competência Final *</Label><Input value={form.competencia_final} onChange={e => setForm(p => ({ ...p, competencia_final: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="MM/AAAA" /></div>
                <div><Label className="text-xs">Qtd de filhos menores de 14 anos *</Label><Input type="number" min={0} value={form.qtd_filhos} onChange={e => setForm(p => ({ ...p, qtd_filhos: parseInt(e.target.value) || 0 }))} className="mt-1 h-8 text-xs" /></div>
              </div>

              <Card className="bg-muted/20">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs">Variação de Qtd filhos menores 14 anos</CardTitle>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setVariacoes(p => [...p, { competencia: '', quantidade: 0 }])}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {variacoes.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma variação. Use quando a quantidade de filhos ≤14 mudar durante o período.</p>
                  ) : (
                    <div className="space-y-2">
                      {variacoes.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={v.competencia} onChange={e => { const n = [...variacoes]; n[i] = { ...n[i], competencia: e.target.value }; setVariacoes(n); }} className="h-7 text-xs" placeholder="MM/AAAA" />
                          <Input type="number" min={0} value={v.quantidade} onChange={e => { const n = [...variacoes]; n[i] = { ...n[i], quantidade: parseInt(e.target.value) || 0 }; setVariacoes(n); }} className="h-7 text-xs w-24" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVariacoes(p => p.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2 pt-3"><CardTitle className="text-xs">Remuneração Mensal — Salários Pagos</CardTitle></CardHeader>
                  <CardContent>
                    <RadioGroup value={form.remuneracao_pagos} onValueChange={v => setForm(p => ({ ...p, remuneracao_pagos: v as typeof form.remuneracao_pagos }))} className="space-y-1">
                      <div className="flex items-center gap-1"><RadioGroupItem value="nenhum" id="rpn" /><Label htmlFor="rpn" className="text-xs">Nenhum</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="maior" id="rpm" /><Label htmlFor="rpm" className="text-xs">Maior Remuneração</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="historico" id="rph" /><Label htmlFor="rph" className="text-xs">Histórico Salarial</Label></div>
                    </RadioGroup>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2 pt-3"><CardTitle className="text-xs">Remuneração Mensal — Salários Devidos (Diferença)</CardTitle></CardHeader>
                  <CardContent>
                    <RadioGroup value={form.remuneracao_devidos} onValueChange={v => setForm(p => ({ ...p, remuneracao_devidos: v as typeof form.remuneracao_devidos }))} className="space-y-1">
                      <div className="flex items-center gap-1"><RadioGroupItem value="nenhum" id="rdn" /><Label htmlFor="rdn" className="text-xs">Nenhum</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="maior" id="rdm" /><Label htmlFor="rdm" className="text-xs">Maior Remuneração</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="historico" id="rdh" /><Label htmlFor="rdh" className="text-xs">Histórico Salarial</Label></div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </div>

              {(form.remuneracao_pagos === 'historico' || form.remuneracao_devidos === 'historico') && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Histórico *</Label><Input value={form.historico_id} onChange={e => setForm(p => ({ ...p, historico_id: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="ID" /></div>
                  <div className="flex items-center gap-2 pt-4"><Checkbox checked={form.integralizar} onCheckedChange={v => setForm(p => ({ ...p, integralizar: !!v }))} /><Label className="text-xs">Integralizar (completa meses parciais)</Label></div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs">Filhos / Dependentes detalhados ({filhos.length})</CardTitle>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setFilhos(p => [...p, { nome: '', nascimento: '', ate_14: true }])}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filhos.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">Opcional. Individualizar filhos permite rastreio de limite por idade (14 anos).</p>
                  ) : filhos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/50">
                      <Input value={f.nome} onChange={e => { const n = [...filhos]; n[i] = { ...n[i], nome: e.target.value }; setFilhos(n); }} className="h-7 text-xs flex-1" placeholder="Nome" />
                      <Input type="date" value={f.nascimento} onChange={e => { const n = [...filhos]; n[i] = { ...n[i], nascimento: e.target.value }; setFilhos(n); }} className="h-7 text-xs w-36" />
                      <div className="flex items-center gap-1"><Checkbox checked={f.ate_14} onCheckedChange={v => { const n = [...filhos]; n[i] = { ...n[i], ate_14: !!v }; setFilhos(n); }} /><Label className="text-[10px]">≤14 anos</Label></div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFilhos(p => p.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <p className="text-[10px] text-muted-foreground">2025: R$ 62,04 por filho para remuneração ≤ R$ 1.819,26 (Portaria SUP/2024).</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
