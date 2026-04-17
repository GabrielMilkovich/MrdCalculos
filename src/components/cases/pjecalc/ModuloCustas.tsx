import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, FileText } from "lucide-react";
import Decimal from "decimal.js";
import * as svc from "@/lib/pjecalc/service";
import {
  abrirRelatorioCustasDetalhado,
  calcularSubtotaisCustas,
  type TipoCusta,
} from "@/lib/pjecalc/pdf-report-custas";
import type {
  PjeLiquidacaoResult,
  PjeCustaResult,
  PjeCustasConfig,
  PjeCustaItem,
} from "@/lib/pjecalc/engine-types";

interface AutoItem { tipo: string; vencimento: string; valor_bem: string; }
interface ArmazenamentoItem { inicio: string; termino: string; valor_bem: string; }
interface Props { caseId: string; }

type CategoriaFixa = { tipo: TipoCusta; label: string };
const CATEGORIAS_FIXAS: CategoriaFixa[] = [
  { tipo: 'judiciais',   label: 'Custas Judiciais' },
  { tipo: 'periciais',   label: 'Custas Periciais' },
  { tipo: 'emolumentos', label: 'Emolumentos' },
  { tipo: 'postais',     label: 'Custas Postais' },
];

interface CategoriaEstado {
  apurar: boolean;
  percentual: string;
  valor_fixo: string;
}

interface OutraCusta {
  descricao: string;
  valor: string;
}

const defaultCategorias = (): Record<TipoCusta, CategoriaEstado> => ({
  judiciais:   { apurar: true,  percentual: '2',    valor_fixo: '' },
  periciais:   { apurar: false, percentual: '',     valor_fixo: '' },
  emolumentos: { apurar: false, percentual: '',     valor_fixo: '' },
  postais:     { apurar: false, percentual: '',     valor_fixo: '' },
  outras:      { apurar: true,  percentual: '',     valor_fixo: '' },
});

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);

export function ModuloCustas({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_custas_config", caseId],
    queryFn: () => svc.getCustasConfig(caseId),
  });

  const [form, setForm] = useState({
    base_custas: 'bruto_mais_debitos',
    rec_conhecimento: 'nao_aplica', rec_conhecimento_valor: '',
    rdo_conhecimento: 'nao_aplica', rdo_conhecimento_valor: '',
    rdo_liquidacao: 'nao_aplica', rdo_liquidacao_valor: '',
    custas_fixas_vencimento: '',
    custas_fixas: {
      oficiais_urbana: false, oficiais_rural: false, agravo_instrumento: false,
      agravo_peticao: false, impugnacao_sentenca: false, embargos_arrematacao: false,
      embargos_execucao: false, embargos_terceiros: false, recurso_revista: false,
    },
    autos: [] as AutoItem[], armazenamento: [] as ArmazenamentoItem[],
  });
  const [recolhidas, setRecolhidas] = useState<{ descricao: string; valor: string; data: string }[]>([]);
  const [categorias, setCategorias] = useState<Record<TipoCusta, CategoriaEstado>>(defaultCategorias());
  const [outras, setOutras] = useState<OutraCusta[]>([]);

  // Ultimo resultado de liquidacao (para gerar o PDF detalhado e preview dos subtotais)
  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao_resultado", caseId],
    queryFn: () => svc.getResultado(caseId),
  });
  const { data: caseData } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: () => svc.getDadosProcesso(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      setForm(prev => ({
        ...prev,
        base_custas: (d.base_custas as string) || 'bruto_mais_debitos',
        rec_conhecimento: (d.rec_conhecimento as string) || 'nao_aplica',
        rec_conhecimento_valor: d.rec_conhecimento_valor?.toString() || '',
        rdo_conhecimento: (d.rdo_conhecimento as string) || 'nao_aplica',
        rdo_conhecimento_valor: d.rdo_conhecimento_valor?.toString() || '',
        rdo_liquidacao: (d.rdo_liquidacao as string) || 'nao_aplica',
        rdo_liquidacao_valor: d.rdo_liquidacao_valor?.toString() || '',
        custas_fixas_vencimento: (d.custas_fixas_vencimento as string) || '',
        custas_fixas: (d.custas_fixas as typeof prev.custas_fixas) || prev.custas_fixas,
        autos: (d.autos as AutoItem[]) || [],
        armazenamento: (d.armazenamento as ArmazenamentoItem[]) || [],
      }));
      if (d.recolhidas && Array.isArray(d.recolhidas)) setRecolhidas(d.recolhidas as typeof recolhidas);
      // Restaurar itens por categoria (PjeCustasConfig.itens)
      if (Array.isArray(d.itens)) {
        const cats = defaultCategorias();
        const outrasList: OutraCusta[] = [];
        for (const raw of d.itens as PjeCustaItem[]) {
          if (!raw || typeof raw !== 'object') continue;
          if (raw.tipo === 'outras') {
            outrasList.push({
              descricao: raw.descricao ?? '',
              valor: raw.valor_fixo != null ? String(raw.valor_fixo) : '',
            });
          } else if (raw.tipo && (['judiciais','periciais','emolumentos','postais'] as TipoCusta[]).includes(raw.tipo)) {
            cats[raw.tipo] = {
              apurar: !!raw.apurar,
              percentual: raw.percentual != null ? String(raw.percentual) : '',
              valor_fixo: raw.valor_fixo != null ? String(raw.valor_fixo) : '',
            };
          }
        }
        setCategorias(cats);
        setOutras(outrasList);
      }
    }
  }, [data]);

  // Construir lista de itens de custas para persistir e para preview do PDF
  const itensCustas = useMemo<PjeCustaItem[]>(() => {
    const out: PjeCustaItem[] = [];
    for (const cat of CATEGORIAS_FIXAS) {
      const c = categorias[cat.tipo];
      if (!c.apurar) continue;
      const pct = c.percentual ? new Decimal(c.percentual).toNumber() : 0;
      const vf = c.valor_fixo ? new Decimal(c.valor_fixo).toNumber() : undefined;
      out.push({
        tipo: cat.tipo,
        descricao: cat.label,
        apurar: true,
        percentual: Number.isFinite(pct) ? pct : 0,
        valor_fixo: vf != null && Number.isFinite(vf) ? vf : undefined,
        valor_minimo: 0,
        isento: false,
      });
    }
    for (const o of outras) {
      if (!o.descricao.trim() && !o.valor) continue;
      const v = o.valor ? new Decimal(o.valor).toNumber() : 0;
      out.push({
        tipo: 'outras',
        descricao: o.descricao.trim() || 'Outras custas',
        apurar: true,
        percentual: 0,
        valor_fixo: Number.isFinite(v) ? v : 0,
        valor_minimo: 0,
        isento: false,
      });
    }
    return out;
  }, [categorias, outras]);

  // Construir config completa para o PDF
  const custasConfig = useMemo<PjeCustasConfig>(() => ({
    apurar: true,
    percentual: categorias.judiciais.percentual ? new Decimal(categorias.judiciais.percentual).toNumber() : 2,
    valor_minimo: 0,
    isento: false,
    assistencia_judiciaria: false,
    itens: itensCustas,
  }), [categorias.judiciais.percentual, itensCustas]);

  // Preview de subtotais a partir do ultimo resultado de liquidacao (apenas leitura)
  const resultadoLiquidacao = useMemo<PjeLiquidacaoResult | null>(() => {
    const rec = resultado as unknown as { resultado?: PjeLiquidacaoResult } | null;
    return rec?.resultado || null;
  }, [resultado]);

  const subtotaisPreview = useMemo(() => {
    if (resultadoLiquidacao) {
      return calcularSubtotaisCustas(resultadoLiquidacao);
    }
    // Sem liquidacao ainda: calcular preview local usando valor_fixo das categorias apuradas
    // (aprovacao sem base financeira e so preview grosseiro)
    return CATEGORIAS_FIXAS.map(cat => {
      const c = categorias[cat.tipo];
      const v = c.apurar && c.valor_fixo ? new Decimal(c.valor_fixo).toNumber() : 0;
      return { tipo: cat.tipo, titulo: cat.label, subtotal: v, quantidade: c.apurar ? 1 : 0 };
    }).concat([{
      tipo: 'outras' as TipoCusta,
      titulo: 'Outras Custas',
      subtotal: outras.reduce((acc, o) => acc.plus(new Decimal(o.valor || 0)), new Decimal(0)).toDecimalPlaces(2).toNumber(),
      quantidade: outras.filter(o => o.descricao.trim() || o.valor).length,
    }]);
  }, [resultadoLiquidacao, categorias, outras]);

  const totalPreview = useMemo(() =>
    subtotaisPreview.reduce((acc, s) => acc.plus(new Decimal(s.subtotal)), new Decimal(0)).toDecimalPlaces(2).toNumber()
  , [subtotaisPreview]);

  const handleGerarPDF = () => {
    if (!resultadoLiquidacao) {
      toast.error('Execute a liquidacao antes de gerar o relatorio detalhado de custas.');
      return;
    }
    abrirRelatorioCustasDetalhado(resultadoLiquidacao, {
      cliente: caseData?.reclamante_nome ?? undefined,
      processo: caseData?.numero_processo ?? undefined,
      reclamado: caseData?.reclamado ?? undefined,
      dataLiquidacao: resultadoLiquidacao.data_liquidacao,
      custasConfig,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertCustasConfig({
        case_id: caseId, apurar: true, percentual: 2, base_custas: form.base_custas,
        rec_conhecimento: form.rec_conhecimento,
        rec_conhecimento_valor: form.rec_conhecimento_valor ? parseFloat(form.rec_conhecimento_valor) : null,
        rdo_conhecimento: form.rdo_conhecimento,
        rdo_conhecimento_valor: form.rdo_conhecimento_valor ? parseFloat(form.rdo_conhecimento_valor) : null,
        rdo_liquidacao: form.rdo_liquidacao,
        rdo_liquidacao_valor: form.rdo_liquidacao_valor ? parseFloat(form.rdo_liquidacao_valor) : null,
        custas_fixas_vencimento: form.custas_fixas_vencimento || null,
        custas_fixas: form.custas_fixas, autos: form.autos, armazenamento: form.armazenamento,
        recolhidas, itens: itensCustas,
      } as any);
      qc.invalidateQueries({ queryKey: ["pjecalc_custas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Custas salvas!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const RadioOption = ({ label, value, current, onChange }: { label: string; value: string; current: string; onChange: (v: string) => void }) => (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="h-3 w-3 accent-primary" />
      <span className="text-xs">{label}</span>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custas Judiciais</h2>
        <div className="flex gap-2">
          <Button onClick={handleGerarPDF} size="sm" variant="outline" disabled={!resultadoLiquidacao}>
            <FileText className="h-4 w-4 mr-1" /> Gerar PDF Custas
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
          </Button>
        </div>
      </div>

      {/* ─── Categorias detalhadas de custas (5 secoes) ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Categorias de Custas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-1.5 text-left w-8">Apurar</th>
                  <th className="p-1.5 text-left">Categoria</th>
                  <th className="p-1.5 text-left w-28">Percentual (%)</th>
                  <th className="p-1.5 text-left w-32">Valor Fixo (R$)</th>
                  <th className="p-1.5 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIAS_FIXAS.map(cat => {
                  const c = categorias[cat.tipo];
                  const preview = subtotaisPreview.find(s => s.tipo === cat.tipo);
                  return (
                    <tr key={cat.tipo} className="border-b border-border/50">
                      <td className="p-1.5">
                        <Checkbox
                          checked={c.apurar}
                          onCheckedChange={v =>
                            setCategorias(p => ({ ...p, [cat.tipo]: { ...p[cat.tipo], apurar: !!v } }))
                          }
                        />
                      </td>
                      <td className="p-1.5">{cat.label}</td>
                      <td className="p-1">
                        <Input
                          type="number" step="0.01" min="0"
                          value={c.percentual}
                          disabled={!c.apurar}
                          onChange={e =>
                            setCategorias(p => ({ ...p, [cat.tipo]: { ...p[cat.tipo], percentual: e.target.value } }))
                          }
                          className="h-7 text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number" step="0.01" min="0"
                          value={c.valor_fixo}
                          disabled={!c.apurar}
                          onChange={e =>
                            setCategorias(p => ({ ...p, [cat.tipo]: { ...p[cat.tipo], valor_fixo: e.target.value } }))
                          }
                          className="h-7 text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1.5 text-right font-mono">{fmtBRL(preview?.subtotal ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Outras Custas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Outras Custas</Label>
              <Button
                variant="outline" size="icon" className="h-6 w-6"
                onClick={() => setOutras(p => [...p, { descricao: '', valor: '' }])}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {outras.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-1">
                Nenhuma custa adicional. Use o botao + para incluir.
              </p>
            )}
            {outras.length > 0 && (
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-1.5 text-left">Descricao</th>
                      <th className="p-1.5 text-left w-32">Valor (R$)</th>
                      <th className="p-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {outras.map((o, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-1">
                          <Input
                            value={o.descricao}
                            onChange={e => {
                              const n = [...outras]; n[i] = { ...o, descricao: e.target.value };
                              setOutras(n);
                            }}
                            className="h-7 text-xs"
                            placeholder="Ex.: Taxa de Diligencia"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number" step="0.01" min="0"
                            value={o.valor}
                            onChange={e => {
                              const n = [...outras]; n[i] = { ...o, valor: e.target.value };
                              setOutras(n);
                            }}
                            className="h-7 text-xs"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-1">
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setOutras(p => p.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totalizador Preview */}
          <div className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide">Total Preview de Custas</span>
            <span className="text-sm font-mono font-bold">{fmtBRL(totalPreview)}</span>
          </div>
          {!resultadoLiquidacao && (
            <p className="text-[10px] text-muted-foreground">
              Dica: execute a liquidacao para obter o subtotal real calculado pelo motor.
              O preview acima usa apenas os valores fixos informados.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dados de Custas Judiciais</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="devidas">
            <TabsList className="h-8 mb-3">
              <TabsTrigger value="devidas" className="text-xs h-7">Custas Devidas</TabsTrigger>
              <TabsTrigger value="recolhidas" className="text-xs h-7">Custas Recolhidas</TabsTrigger>
            </TabsList>
            <TabsContent value="devidas" className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-3">
                  <Label className="text-xs font-semibold">Base para Custas de Conhecimento e Liquidação</Label>
                  <Select value={form.base_custas} onValueChange={v => setForm(p => ({ ...p, base_custas: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bruto_reclamante">Bruto Devido ao Reclamante</SelectItem>
                      <SelectItem value="bruto_mais_debitos">Bruto Devido ao Reclamante + Outros Débitos do Reclamado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Card className="bg-muted/30"><CardContent className="p-3 space-y-2">
                    <Label className="text-xs font-semibold">Custas do Reclamante - Conhecimento</Label>
                    <div className="space-y-1">
                      <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                      <RadioOption label="Calculada 2%" value="calculado_2" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                      <RadioOption label="Informada" value="informado" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                    </div>
                  </CardContent></Card>
                </div>
              </div>
              <Card className="bg-muted/30"><CardContent className="p-3">
                <Label className="text-xs font-semibold mb-2 block">Custas do Reclamado</Label>
                <div className="flex gap-6">
                  <div className="space-y-1"><Label className="text-[10px] font-medium">Conhecimento</Label>
                    <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                    <RadioOption label="Calculada 2%" value="calculado_2" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                    <RadioOption label="Informada" value="informado" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-medium">Liquidação</Label>
                    <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                    <RadioOption label="Calculada 0,5%" value="calculado_05" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                    <RadioOption label="Informada" value="informado" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                  </div>
                </div>
              </CardContent></Card>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-semibold">Custas Fixas</Label>
                  <div><Label className="text-[10px]">Vencimento</Label><Input type="date" value={form.custas_fixas_vencimento} onChange={e => setForm(p => ({ ...p, custas_fixas_vencimento: e.target.value }))} className="h-7 text-xs mt-0.5 w-36" /></div>
                  {Object.entries({
                    oficiais_urbana: 'Atos dos Oficiais de Justiça - Zona Urbana', oficiais_rural: 'Atos dos Oficiais de Justiça - Zona Rural',
                    agravo_instrumento: 'Agravo de Instrumento', agravo_peticao: 'Agravo de Petição',
                    impugnacao_sentenca: 'Impugnação à Sentença de Liquidação', embargos_arrematacao: 'Embargos à Arrematação',
                    embargos_execucao: 'Embargos à Execução', embargos_terceiros: 'Embargos de Terceiros', recurso_revista: 'Recurso de Revista',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-[10px] flex-1">{label}</Label>
                      <Checkbox checked={(form.custas_fixas as Record<string, boolean>)[key] ?? false} onCheckedChange={v => setForm(p => ({ ...p, custas_fixas: { ...p.custas_fixas, [key]: !!v } }))} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-xs font-semibold">Autos 5%</Label><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, autos: [...p.autos, { tipo: '', vencimento: '', valor_bem: '' }] }))}><Plus className="h-3 w-3" /></Button></div>
                    {form.autos.length > 0 && (
                      <div className="border border-border rounded overflow-hidden">
                        <table className="w-full text-[10px]"><thead><tr className="bg-muted/50 border-b"><th className="p-1.5 text-left">Tipo de Auto *</th><th className="p-1.5 text-left">Vencimento *</th><th className="p-1.5 text-left">Valor do Bem *</th><th className="p-1.5 w-6"></th></tr></thead>
                          <tbody>{form.autos.map((a, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="p-1"><Input value={a.tipo} onChange={e => { const n = [...form.autos]; n[i] = { ...a, tipo: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Input type="date" value={a.vencimento} onChange={e => { const n = [...form.autos]; n[i] = { ...a, vencimento: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Input type="number" step="0.01" value={a.valor_bem} onChange={e => { const n = [...form.autos]; n[i] = { ...a, valor_bem: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setForm(p => ({ ...p, autos: p.autos.filter((_, j) => j !== i) }))}><Trash2 className="h-2.5 w-2.5 text-destructive" /></Button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-xs font-semibold">Armazenamento 0,1%</Label><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, armazenamento: [...p.armazenamento, { inicio: '', termino: '', valor_bem: '' }] }))}><Plus className="h-3 w-3" /></Button></div>
                    {form.armazenamento.length > 0 && (
                      <div className="border border-border rounded overflow-hidden">
                        <table className="w-full text-[10px]"><thead><tr className="bg-muted/50 border-b"><th className="p-1.5 text-left">Início *</th><th className="p-1.5 text-left">Término *</th><th className="p-1.5 text-left">Valor do Bem *</th><th className="p-1.5 w-6"></th></tr></thead>
                          <tbody>{form.armazenamento.map((a, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="p-1"><Input type="date" value={a.inicio} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, inicio: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Input type="date" value={a.termino} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, termino: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Input type="number" step="0.01" value={a.valor_bem} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, valor_bem: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                              <td className="p-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setForm(p => ({ ...p, armazenamento: p.armazenamento.filter((_, j) => j !== i) }))}><Trash2 className="h-2.5 w-2.5 text-destructive" /></Button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="recolhidas" className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Custas Recolhidas (Dedução)</Label>
                <Button variant="outline" size="sm" onClick={() => setRecolhidas(p => [...p, { descricao: '', valor: '', data: '' }])} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
              </div>
              {recolhidas.length === 0 && <p className="text-[10px] text-muted-foreground py-2">Nenhuma custa recolhida registrada.</p>}
              {recolhidas.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={r.descricao} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], descricao: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs flex-1" placeholder="Descrição" />
                  <Input type="number" step="0.01" value={r.valor} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], valor: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-24" placeholder="R$" />
                  <Input type="date" value={r.data} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], data: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-32" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRecolhidas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
