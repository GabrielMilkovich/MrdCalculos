import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

const INDICES = [
  { value: 'IPCA-E', label: 'IPCA-E' }, { value: 'SELIC', label: 'SELIC (Receita Federal)' },
  { value: 'TR', label: 'TR' }, { value: 'INPC', label: 'INPC' }, { value: 'IGP-M', label: 'IGP-M' },
  { value: 'IGP-DI', label: 'IGP-DI' }, { value: 'IPCA', label: 'IPCA' }, { value: 'IPC-FIPE', label: 'IPC-FIPE' },
  { value: 'TJLP', label: 'TJLP' }, { value: 'TLP', label: 'TLP' }, { value: 'FACDT', label: 'FACDT' },
  { value: 'SEM_CORRECAO', label: 'Sem Correção' },
];

const TABELAS_JUROS = [
  { value: 'TRD_SIMPLES', label: 'TRD Juros Simples' }, { value: 'SELIC_RF', label: 'SELIC (Receita Federal)' },
  { value: 'TAXA_LEGAL', label: 'Taxa Legal' }, { value: 'SEM_JUROS', label: 'Sem Juros' },
];

interface CombItem { indice: string; a_partir_de: string; }
interface Props { caseId: string; }

export function ModuloCorrecao({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_correcao_config", caseId],
    queryFn: () => svc.getCorrecaoConfig(caseId),
  });

  const [form, setForm] = useState({
    indice: 'IPCA-E', combinar_indice: true, combinacoes_indice: [] as CombItem[],
    ignorar_taxa_negativa: true, juros_pre_judicial: true, tabela_juros: 'TRD_SIMPLES',
    combinar_juros: true, combinacoes_juros: [] as CombItem[],
    data_liquidacao: new Date().toISOString().slice(0, 10),
    juros_inicio: 'ajuizamento' as 'ajuizamento' | 'citacao' | 'distribuicao',
    multa_523: false,
    multa_523_percentual: 10,
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      let combIndice: CombItem[] = [];
      let combJuros: CombItem[] = [];
      try { combIndice = d.combinacoes_indice ? JSON.parse(d.combinacoes_indice as string) : []; } catch {}
      try { combJuros = d.combinacoes_juros ? JSON.parse(d.combinacoes_juros as string) : []; } catch {}
      if (combIndice.length === 0 && Array.isArray(d.combinacoes_indice)) {
        combIndice = (d.combinacoes_indice as Array<Record<string, string>>).map(c => ({ indice: c.indice || c.ate, a_partir_de: c.ate || '' }));
      }
      setForm({
        indice: (d.indice as string) || 'IPCA-E',
        combinar_indice: combIndice.length > 0 || !!(d.transicao_adc58),
        combinacoes_indice: combIndice.length > 0 ? combIndice : [{ indice: 'SEM_CORRECAO', a_partir_de: '' }, { indice: 'IPCA', a_partir_de: '' }],
        ignorar_taxa_negativa: true, juros_pre_judicial: true,
        tabela_juros: 'TRD_SIMPLES',
        combinar_juros: combJuros.length > 0,
        combinacoes_juros: combJuros.length > 0 ? combJuros : [{ indice: 'SELIC_RF', a_partir_de: '' }, { indice: 'TAXA_LEGAL', a_partir_de: '' }],
        data_liquidacao: (d.data_liquidacao as string) || new Date().toISOString().slice(0, 10),
        juros_inicio: ((d.juros_inicio as string) || 'ajuizamento') as 'ajuizamento' | 'citacao' | 'distribuicao',
        multa_523: (d.multa_523 as boolean) ?? false,
        multa_523_percentual: (d.multa_523_percentual as number) ?? 10,
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertCorrecaoConfig({
        case_id: caseId, indice: form.indice,
        epoca: 'mensal',
        juros_tipo: form.tabela_juros === 'SELIC_RF' ? 'selic' : 'simples_mensal',
        juros_percentual: 1, juros_inicio: form.juros_inicio,
        multa_523: form.multa_523, multa_523_percentual: form.multa_523_percentual,
        data_liquidacao: form.data_liquidacao,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_correcao_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Correção/Juros configurados!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const CombTable = ({ items, onChange, options, label }: { items: CombItem[]; onChange: (items: CombItem[]) => void; options: { value: string; label: string }[]; label: string; }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-medium">{label}</Label>
        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onChange([...items, { indice: options[0].value, a_partir_de: '' }])}><Plus className="h-3 w-3" /></Button>
      </div>
      {items.length > 0 && (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="bg-muted/50 border-b"><th className="p-1.5 text-left font-medium w-8">Ação</th><th className="p-1.5 text-left font-medium">Índice</th><th className="p-1.5 text-left font-medium">A partir de</th></tr></thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="p-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onChange(items.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>
                  <td className="p-1"><Select value={item.indice} onValueChange={v => { const n = [...items]; n[idx] = { ...n[idx], indice: v }; onChange(n); }}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></td>
                  <td className="p-1"><Input type="date" value={item.a_partir_de} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], a_partir_de: e.target.value }; onChange(n); }} className="h-7 text-xs" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Correção, Juros e Multa</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dados de Correção, Juros e Multa</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="especificos">
            <TabsList className="h-8 mb-3">
              <TabsTrigger value="gerais" className="text-xs h-7">Dados Gerais</TabsTrigger>
              <TabsTrigger value="especificos" className="text-xs h-7">Dados Específicos</TabsTrigger>
            </TabsList>
            <TabsContent value="gerais" className="space-y-3">
              <div><Label className="text-xs">Data da Liquidação</Label><Input type="date" value={form.data_liquidacao} onChange={e => setForm(p => ({ ...p, data_liquidacao: e.target.value }))} className="mt-1 h-8 text-xs w-48" /></div>
              <div>
                <Label className="text-xs">Início dos Juros de Mora</Label>
                <Select value={form.juros_inicio} onValueChange={v => setForm(p => ({ ...p, juros_inicio: v as typeof form.juros_inicio }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuizamento">Data do Ajuizamento</SelectItem>
                    <SelectItem value="citacao">Data da Citação</SelectItem>
                    <SelectItem value="distribuicao">Data da Distribuição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Checkbox checked={form.multa_523} onCheckedChange={v => setForm(p => ({ ...p, multa_523: !!v }))} /><Label className="text-xs">Multa Art. 523 CPC</Label></div>
              {form.multa_523 && (
                <div><Label className="text-xs">Percentual Multa 523 (%)</Label><Input type="number" step="1" min={0} max={100} value={form.multa_523_percentual} onChange={e => setForm(p => ({ ...p, multa_523_percentual: parseFloat(e.target.value) || 10 }))} className="mt-1 h-8 text-xs w-32" /></div>
              )}
            </TabsContent>
            <TabsContent value="especificos">
              <div className="flex gap-6">
                <div className="flex-1 space-y-3">
                  <Label className="text-xs font-semibold">Correção Monetária</Label>
                  <div><Label className="text-[10px] font-medium">Índice Trabalhista</Label><Select value={form.indice} onValueChange={v => setForm(p => ({ ...p, indice: v }))}><SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{INDICES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex items-center gap-2"><Checkbox checked={form.combinar_indice} onCheckedChange={v => setForm(p => ({ ...p, combinar_indice: !!v }))} /><Label className="text-xs font-medium">Combinar com Outro Índice</Label></div>
                  {form.combinar_indice && <CombTable items={form.combinacoes_indice} onChange={items => setForm(p => ({ ...p, combinacoes_indice: items }))} options={INDICES} label="Outro Índice Trabalhista *  /  A partir de *" />}
                  <div className="flex items-center gap-2 pt-2"><Checkbox checked={form.ignorar_taxa_negativa} onCheckedChange={v => setForm(p => ({ ...p, ignorar_taxa_negativa: !!v }))} /><Label className="text-xs">Ignorar Taxa Negativa para Índice(s) selecionado(s)</Label></div>
                </div>
                <div className="flex-1 space-y-3">
                  <Label className="text-xs font-semibold">Juros de Mora</Label>
                  <div className="flex items-center gap-2"><Checkbox checked={form.juros_pre_judicial} onCheckedChange={v => setForm(p => ({ ...p, juros_pre_judicial: !!v }))} /><Label className="text-xs font-medium">Aplicar Juros na Fase Pré-Judicial</Label></div>
                  <div><Label className="text-[10px] font-medium">Tabela de Juros</Label><Select value={form.tabela_juros} onValueChange={v => setForm(p => ({ ...p, tabela_juros: v }))}><SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{TABELAS_JUROS.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex items-center gap-2"><Checkbox checked={form.combinar_juros} onCheckedChange={v => setForm(p => ({ ...p, combinar_juros: !!v }))} /><Label className="text-xs font-medium">Combinar com Outra Tabela de Juros</Label></div>
                  {form.combinar_juros && <CombTable items={form.combinacoes_juros} onChange={items => setForm(p => ({ ...p, combinacoes_juros: items }))} options={[...TABELAS_JUROS, ...INDICES.filter(i => i.value === 'SELIC')]} label="Tabela Juros *  /  A partir de *" />}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
