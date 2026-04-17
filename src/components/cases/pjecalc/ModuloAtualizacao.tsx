import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Calculator, Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface AtualizacaoForm {
  data_pagamento: string;
  valor_pago: string;
  aplicar_pensao: boolean;
  aplicar_multas_indenizacoes: boolean;
  aplicar_honorarios: boolean;
  aplicar_custas: boolean;
}

interface CombJurosItem { indice: string; a_partir_de: string; }

interface JurosForm {
  juros_tipo: 'simples_mensal' | 'selic' | 'composto' | 'nenhum';
  juros_percentual: number;
  juros_inicio: 'ajuizamento' | 'citacao' | 'vencimento';
  combinacoes_juros: CombJurosItem[];
}

const TABELAS_JUROS_OPTS = [
  { value: 'JUROS_PADRAO', label: 'Juros Padrão' },
  { value: 'TRD_SIMPLES', label: 'TRD Juros Simples' },
  { value: 'TRD_COMPOSTOS', label: 'TRD Juros Compostos' },
  { value: 'SELIC_RF', label: 'SELIC (Receita Federal)' },
  { value: 'JUROS_CADERNETA', label: 'Juros Caderneta de Poupança' },
  { value: 'JUROS_FAZENDA_PUBLICA', label: 'Juros Fazenda Pública' },
  { value: 'JUROS_SIMPLES_05', label: 'Juros Simples 0,5% a.m.' },
  { value: 'JUROS_SIMPLES_10', label: 'Juros Simples 1,0% a.m.' },
  { value: 'TAXA_LEGAL', label: 'Taxa Legal' },
  { value: 'SEM_JUROS', label: 'Sem Juros' },
];

const EMPTY_FORM: AtualizacaoForm = {
  data_pagamento: '',
  valor_pago: '',
  aplicar_pensao: false,
  aplicar_multas_indenizacoes: false,
  aplicar_honorarios: false,
  aplicar_custas: false,
};

const EMPTY_JUROS: JurosForm = {
  juros_tipo: 'simples_mensal',
  juros_percentual: 1,
  juros_inicio: 'ajuizamento',
  combinacoes_juros: [],
};

export function ModuloAtualizacao({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savingJuros, setSavingJuros] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [form, setForm] = useState<AtualizacaoForm>(EMPTY_FORM);
  const [jurosForm, setJurosForm] = useState<JurosForm>(EMPTY_JUROS);
  const [resultado, setResultado] = useState<{ diferenca: number; corrigido: number; juros: number; total: number } | null>(null);

  const { data: correcaoData } = useQuery({
    queryKey: ["pjecalc_correcao_config", caseId],
    queryFn: () => svc.getCorrecaoConfig(caseId),
  });

  const { data: resultadoData } = useQuery({
    queryKey: ["pjecalc_resultado", caseId],
    queryFn: () => svc.getResultado(caseId),
  });

  useEffect(() => {
    if (correcaoData) {
      const d = correcaoData as unknown as Record<string, unknown>;
      const at = (d.atualizacao as Record<string, unknown>) || {};
      setForm({
        data_pagamento: (at.data_pagamento as string) || '',
        valor_pago: (at.valor_pago as string) || '',
        aplicar_pensao: (at.aplicar_pensao as boolean) ?? false,
        aplicar_multas_indenizacoes: (at.aplicar_multas_indenizacoes as boolean) ?? false,
        aplicar_honorarios: (at.aplicar_honorarios as boolean) ?? false,
        aplicar_custas: (at.aplicar_custas as boolean) ?? false,
      });
      let combs: CombJurosItem[] = [];
      try {
        combs = d.combinacoes_juros
          ? (typeof d.combinacoes_juros === 'string'
              ? JSON.parse(d.combinacoes_juros as string)
              : (d.combinacoes_juros as CombJurosItem[]))
          : [];
      } catch { combs = []; }
      setJurosForm({
        juros_tipo: ((d.juros_tipo as string) || 'simples_mensal') as JurosForm['juros_tipo'],
        juros_percentual: (d.juros_percentual as number) ?? 1,
        juros_inicio: ((d.juros_inicio as string) || 'ajuizamento') as JurosForm['juros_inicio'],
        combinacoes_juros: Array.isArray(combs) ? combs : [],
      });
    }
  }, [correcaoData]);

  const saveJuros = async () => {
    setSavingJuros(true);
    try {
      const existing = (correcaoData || {}) as Record<string, unknown>;
      await svc.upsertCorrecaoConfig({
        ...existing,
        case_id: caseId,
        juros_tipo: jurosForm.juros_tipo,
        juros_percentual: jurosForm.juros_percentual,
        juros_inicio: jurosForm.juros_inicio,
        combinacoes_juros: JSON.stringify(jurosForm.combinacoes_juros),
      } as any);
      qc.invalidateQueries({ queryKey: ["pjecalc_correcao_config", caseId] });
      toast.success("Tabela de juros salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSavingJuros(false); }
  };

  const addCombJuros = () => setJurosForm(f => ({ ...f, combinacoes_juros: [...f.combinacoes_juros, { indice: 'TRD_SIMPLES', a_partir_de: '' }] }));
  const removeCombJuros = (idx: number) => setJurosForm(f => ({ ...f, combinacoes_juros: f.combinacoes_juros.filter((_, i) => i !== idx) }));
  const updateCombJuros = (idx: number, patch: Partial<CombJurosItem>) => setJurosForm(f => ({
    ...f,
    combinacoes_juros: f.combinacoes_juros.map((c, i) => i === idx ? { ...c, ...patch } : c),
  }));

  const save = async () => {
    setSaving(true);
    try {
      const existing = (correcaoData || {}) as Record<string, unknown>;
      await svc.upsertCorrecaoConfig({
        ...existing,
        case_id: caseId,
        atualizacao: {
          data_pagamento: form.data_pagamento,
          valor_pago: form.valor_pago,
          aplicar_pensao: form.aplicar_pensao,
          aplicar_multas_indenizacoes: form.aplicar_multas_indenizacoes,
          aplicar_honorarios: form.aplicar_honorarios,
          aplicar_custas: form.aplicar_custas,
        },
      } as any);
      qc.invalidateQueries({ queryKey: ["pjecalc_correcao_config", caseId] });
      toast.success("Configuracao de atualizacao salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const liquidarAtualizacao = async () => {
    if (!form.data_pagamento || !form.valor_pago) {
      toast.error("Preencha a data do pagamento e o valor pago.");
      return;
    }
    setLiquidando(true);
    try {
      // Get the original liquidation total
      const res = resultadoData as any;
      if (!res?.resultado?.resumo) {
        toast.error("Execute a liquidacao principal primeiro.");
        return;
      }
      const resumo = res.resultado.resumo;
      const totalOriginal = resumo.total_reclamada ?? resumo.liquido_reclamante ?? 0;
      const valorPago = parseFloat(form.valor_pago) || 0;
      const diferenca = totalOriginal - valorPago;

      if (diferenca <= 0) {
        setResultado({ diferenca: 0, corrigido: 0, juros: 0, total: 0 });
        toast.info("O valor pago cobre ou excede o debito apurado.");
        return;
      }

      // Simple correction calculation: use the same correction config
      // In a full implementation this would call the engine with adjusted dates
      // For now, show the difference pending correction
      setResultado({
        diferenca: Number(diferenca.toFixed(2)),
        corrigido: Number(diferenca.toFixed(2)), // placeholder - needs engine call with date range
        juros: 0,
        total: Number(diferenca.toFixed(2)),
      });
      toast.success("Atualizacao calculada. Diferenca apurada: R$ " + diferenca.toFixed(2));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLiquidando(false); }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Atualizacao (Pos-Pagamento)</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Dados do Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Data do Pagamento *</Label>
              <Input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Valor Pago (R$) *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_pago} onChange={e => setForm(f => ({ ...f, valor_pago: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Incidencias na Atualizacao</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={form.aplicar_pensao} onCheckedChange={v => setForm(f => ({ ...f, aplicar_pensao: !!v }))} />
                Pensao Alimenticia
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={form.aplicar_multas_indenizacoes} onCheckedChange={v => setForm(f => ({ ...f, aplicar_multas_indenizacoes: !!v }))} />
                Multas e Indenizacoes
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={form.aplicar_honorarios} onCheckedChange={v => setForm(f => ({ ...f, aplicar_honorarios: !!v }))} />
                Honorarios
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={form.aplicar_custas} onCheckedChange={v => setForm(f => ({ ...f, aplicar_custas: !!v }))} />
                Custas Judiciais
              </label>
            </div>
          </div>

          <Button onClick={liquidarAtualizacao} disabled={liquidando} className="w-full">
            {liquidando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
            Liquidar Atualizacao
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Resultado da Atualizacao</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Diferenca apurada:</span><span className="font-medium">{fmt(resultado.diferenca)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor corrigido:</span><span className="font-medium">{fmt(resultado.corrigido)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Juros de mora:</span><span className="font-medium">{fmt(resultado.juros)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total atualizado:</span><span className="font-bold text-primary">{fmt(resultado.total)}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm">Tabela de Juros</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Config global de juros e regimes aplicáveis por período (TabelaDeJurosDoCalculo).</p>
          </div>
          <Button onClick={saveJuros} disabled={savingJuros} size="sm" variant="outline">
            {savingJuros ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar Juros
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo de Juros</Label>
              <Select value={jurosForm.juros_tipo} onValueChange={v => setJurosForm(f => ({ ...f, juros_tipo: v as JurosForm['juros_tipo'] }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_mensal">Simples Mensal</SelectItem>
                  <SelectItem value="selic">SELIC</SelectItem>
                  <SelectItem value="composto">Composto</SelectItem>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Percentual (% a.m.)</Label>
              <Input type="number" step="0.01" min="0" value={jurosForm.juros_percentual}
                onChange={e => setJurosForm(f => ({ ...f, juros_percentual: parseFloat(e.target.value) || 0 }))}
                className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Início dos Juros</Label>
              <Select value={jurosForm.juros_inicio} onValueChange={v => setJurosForm(f => ({ ...f, juros_inicio: v as JurosForm['juros_inicio'] }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ajuizamento">Ajuizamento</SelectItem>
                  <SelectItem value="citacao">Citação</SelectItem>
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Regimes de Juros (por data de início)</Label>
              <Button variant="outline" size="sm" className="h-7" onClick={addCombJuros}>
                <Plus className="h-3 w-3 mr-1" /> Regime
              </Button>
            </div>
            {jurosForm.combinacoes_juros.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded">
                Nenhum regime adicional. O tipo de juros acima será aplicado ao período inteiro.
              </p>
            ) : (
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-1.5 text-left font-medium w-8">Ação</th>
                      <th className="p-1.5 text-left font-medium">Tabela de Juros</th>
                      <th className="p-1.5 text-left font-medium">A partir de</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jurosForm.combinacoes_juros.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeCombJuros(idx)} aria-label="Remover regime">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                        <td className="p-1">
                          <Select value={item.indice} onValueChange={v => updateCombJuros(idx, { indice: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TABELAS_JUROS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input type="date" value={item.a_partir_de}
                            onChange={e => updateCombJuros(idx, { a_partir_de: e.target.value })}
                            className="h-7 text-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
