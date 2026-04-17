import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, DollarSign } from "lucide-react";
import { ImportadorFichaFinanceira } from "./ImportadorFichaFinanceira";

interface Props { caseId: string; }

interface HistoricoRow {
  id: string;
  case_id: string;
  nome: string;
  tipo_valor: string; // FIXA | VARIAVEL | INFORMADA
  valor_informado: number | null;
  incidencia_fgts: boolean | null;
  incidencia_cs: boolean | null;
  observacoes: string | null;
}

interface OcorrenciaRow {
  id: string;
  historico_id: string;
  case_id: string;
  competencia: string;
  valor: number;
  tipo: string;
  documento_id?: string | null;
}

const TIPOS = [
  { value: 'FIXA', label: 'Fixa' },
  { value: 'VARIAVEL', label: 'Variável' },
  { value: 'INFORMADA', label: 'Informada' },
];

export function ModuloHistoricoSalarial({ caseId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_historico_salarial" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as HistoricoRow[];
    },
  });

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ["pjecalc_historico_ocorrencias", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_historico_ocorrencias" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("competencia");
      if (error) throw error;
      return (data || []) as unknown as OcorrenciaRow[];
    },
  });

  const ocorrenciasByHist = useMemo(() => {
    const map = new Map<string, OcorrenciaRow[]>();
    for (const o of ocorrencias) {
      if (!map.has(o.historico_id)) map.set(o.historico_id, []);
      map.get(o.historico_id)!.push(o);
    }
    return map;
  }, [ocorrencias]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] });
    qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias", caseId] });
  };

  const toggleExpanded = (id: string) => {
    setExpanded(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const addHistorico = async () => {
    setAdding(true);
    try {
      const { error } = await supabase.from("pjecalc_historico_salarial" as any).insert({
        case_id: caseId,
        nome: `Base ${historicos.length + 1}`,
        tipo_valor: 'VARIAVEL',
        incidencia_fgts: true,
        incidencia_cs: true,
      });
      if (error) throw error;
      invalidate();
      toast.success("Base salarial adicionada");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  // UPDATEs go to the underlying table because the view does not have an UPDATE trigger.
  const updateHistField = async (id: string, patch: Partial<HistoricoRow> & { incide_ir?: boolean; incide_inss?: boolean; incide_fgts?: boolean; tipo_variacao?: string; valor_fixo?: number | null }) => {
    // Map view columns to underlying table columns
    const underlyingPatch: Record<string, unknown> = {};
    if (patch.nome !== undefined) underlyingPatch.nome = patch.nome;
    if (patch.tipo_valor !== undefined) underlyingPatch.tipo_variacao = patch.tipo_valor;
    if (patch.valor_informado !== undefined) underlyingPatch.valor_fixo = patch.valor_informado;
    if (patch.incidencia_fgts !== undefined) underlyingPatch.incide_fgts = patch.incidencia_fgts;
    if (patch.incidencia_cs !== undefined) underlyingPatch.incide_inss = patch.incidencia_cs;
    if (patch.incide_ir !== undefined) underlyingPatch.incide_ir = patch.incide_ir;
    if (patch.observacoes !== undefined) underlyingPatch.observacoes = patch.observacoes;
    const { error } = await supabase.from("pjecalc_hist_salarial" as any).update(underlyingPatch).eq("id", id);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    invalidate();
  };

  const removeHistorico = async (id: string) => {
    const { error } = await supabase.from("pjecalc_historico_salarial" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    invalidate();
  };

  const addOcorrencia = async (histId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("pjecalc_historico_ocorrencias" as any).insert({
      historico_id: histId, case_id: caseId,
      competencia: today, valor: 0, tipo: 'informado',
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    invalidate();
  };

  const updateOcorrencia = async (id: string, patch: Partial<OcorrenciaRow>) => {
    const { error } = await supabase.from("pjecalc_historico_ocorrencias" as any).update(patch).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    invalidate();
  };

  const removeOcorrencia = async (id: string) => {
    const { error } = await supabase.from("pjecalc_historico_ocorrencias" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    invalidate();
  };

  const getPeriodo = (histId: string): string => {
    const ocs = ocorrenciasByHist.get(histId) || [];
    if (ocs.length === 0) return '—';
    const comps = ocs.map(o => o.competencia).sort();
    return `${comps[0].slice(0, 7)} a ${comps[comps.length - 1].slice(0, 7)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Histórico Salarial</h2>
          <p className="text-xs text-muted-foreground">Bases salariais e ocorrências mensais (competência, valor, origem).</p>
        </div>
        <div className="flex gap-2">
          <ImportadorFichaFinanceira caseId={caseId} onImported={invalidate} />
          <Button size="sm" onClick={addHistorico} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Nova Base
          </Button>
        </div>
      </div>

      {historicos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma base cadastrada</p>
            <p className="text-xs text-muted-foreground">
              Importe uma Ficha Financeira ou adicione uma base manualmente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {historicos.map((h) => {
            const isOpen = expanded.has(h.id);
            const ocs = ocorrenciasByHist.get(h.id) || [];
            return (
              <Card key={h.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleExpanded(h.id)}
                      className="flex items-center gap-1 text-left flex-1"
                      aria-label="Expandir"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <CardTitle className="text-sm">{h.nome}</CardTitle>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{h.tipo_valor}</Badge>
                      <Badge variant="outline" className="text-[10px]">{ocs.length} ocor.</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{getPeriodo(h.id)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHistorico(h.id)} aria-label="Remover">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2">
                        <Label className="text-[10px]">Nome *</Label>
                        <Input defaultValue={h.nome} className="h-8 text-xs"
                          onBlur={e => updateHistField(h.id, { nome: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Tipo de Variação</Label>
                        <Select defaultValue={h.tipo_valor} onValueChange={v => updateHistField(h.id, { tipo_valor: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {h.tipo_valor === 'FIXA' && (
                        <div>
                          <Label className="text-[10px]">Valor Fixo (R$)</Label>
                          <Input type="number" step="0.01" defaultValue={h.valor_informado ?? ''} className="h-8 text-xs"
                            onBlur={e => updateHistField(h.id, { valor_informado: e.target.value ? parseFloat(e.target.value) : null })} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox defaultChecked={!!h.incidencia_cs} onCheckedChange={v => updateHistField(h.id, { incidencia_cs: !!v })} />
                        Incide INSS
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox defaultChecked={!!h.incidencia_fgts} onCheckedChange={v => updateHistField(h.id, { incidencia_fgts: !!v })} />
                        Incide FGTS
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox defaultChecked={true} onCheckedChange={v => updateHistField(h.id, { incide_ir: !!v })} />
                        Incide IR
                      </label>
                    </div>

                    <div>
                      <Label className="text-[10px]">Observações</Label>
                      <Input defaultValue={h.observacoes ?? ''} className="h-8 text-xs"
                        onBlur={e => updateHistField(h.id, { observacoes: e.target.value })} />
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Ocorrências Mensais</Label>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addOcorrencia(h.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Ocorrência
                        </Button>
                      </div>
                      {ocs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma ocorrência. Importe uma ficha financeira ou adicione manualmente.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="p-2 text-left font-medium">Competência</th>
                                <th className="p-2 text-right font-medium">Valor (R$)</th>
                                <th className="p-2 text-left font-medium">Origem</th>
                                <th className="p-2 text-left font-medium">Documento ID</th>
                                <th className="p-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {ocs.map(o => (
                                <tr key={o.id} className="border-b border-border/50">
                                  <td className="p-1">
                                    <Input type="month" defaultValue={o.competencia.slice(0, 7)} className="h-7 text-xs"
                                      onBlur={e => updateOcorrencia(o.id, { competencia: e.target.value + '-01' })} />
                                  </td>
                                  <td className="p-1">
                                    <Input type="number" step="0.01" defaultValue={o.valor} className="h-7 text-xs text-right font-mono"
                                      onBlur={e => updateOcorrencia(o.id, { valor: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="p-1">
                                    <Select defaultValue={o.tipo || 'informado'} onValueChange={v => updateOcorrencia(o.id, { tipo: v })}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="informado">Informado</SelectItem>
                                        <SelectItem value="IMPORTADA">Importada</SelectItem>
                                        <SelectItem value="extraido">Extraído</SelectItem>
                                        <SelectItem value="calculado">Calculado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-1">
                                    <Input defaultValue={o.documento_id ?? ''} placeholder="UUID" className="h-7 text-xs font-mono"
                                      onBlur={e => updateOcorrencia(o.id, { documento_id: e.target.value || null })} />
                                  </td>
                                  <td className="p-1 text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeOcorrencia(o.id)} aria-label="Remover ocorrência">
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
