import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, Bus } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloValeTransporte({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["pjecalc_vt_config", caseId],
    queryFn: () => svc.getValeTransporteConfig(caseId),
  });

  const { data: linhas = [] } = useQuery({
    queryKey: ["pjecalc_vt_linhas", config?.id],
    queryFn: () => config?.id ? svc.getValeTransporteLinhas(config.id) : Promise.resolve([]),
    enabled: !!config?.id,
  });

  const [apurar, setApurar] = useState(false);
  const [descontoPct, setDescontoPct] = useState("6.00");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (config) {
      setApurar(config.apurar);
      setDescontoPct(String(config.desconto_empregado_pct));
      setObservacoes(config.observacoes || "");
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await svc.upsertValeTransporteConfig({
        id: config?.id,
        calculo_id: caseId,
        apurar,
        desconto_empregado_pct: Math.min(6, parseFloat(descontoPct) || 6),
        observacoes: observacoes || null,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_vt_config", caseId] });
      toast.success("Vale Transporte salvo");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLinha = async () => {
    if (!config?.id) {
      const configId = await svc.upsertValeTransporteConfig({
        calculo_id: caseId, apurar, desconto_empregado_pct: parseFloat(descontoPct) || 6,
      });
      await svc.insertValeTransporteLinha({
        config_id: configId, descricao: "Nova linha", tipo: "URBANO",
        valor_passagem: 0, quantidade_dia: 2,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_vt_config", caseId] });
    } else {
      await svc.insertValeTransporteLinha({
        config_id: config.id, descricao: "Nova linha", tipo: "URBANO",
        valor_passagem: 0, quantidade_dia: 2,
      });
    }
    qc.invalidateQueries({ queryKey: ["pjecalc_vt_linhas"] });
    toast.success("Linha adicionada");
  };

  const handleDeleteLinha = async (id: string) => {
    await svc.deleteValeTransporteLinha(id);
    qc.invalidateQueries({ queryKey: ["pjecalc_vt_linhas"] });
    toast.success("Linha removida");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Bus className="h-4 w-4" />Vale Transporte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox checked={apurar} onCheckedChange={v => setApurar(!!v)} id="vt-apurar" />
          <Label htmlFor="vt-apurar" className="text-xs">Apurar Vale Transporte</Label>
        </div>

        {apurar && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Desconto empregado (%)</Label>
                <Input type="number" min={0} max={6} step={0.01} className="mt-1 h-8 text-xs" value={descontoPct} onChange={e => setDescontoPct(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Máximo 6% do salário (Art. 4º Lei 7.418/85)</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Linhas de Transporte</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleAddLinha}>
                  <Plus className="h-3 w-3" />Adicionar
                </Button>
              </div>
              {linhas.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center border rounded-md border-dashed">Nenhuma linha cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {linhas.map((l: svc.ValeTransporteLinhaRow) => (
                    <div key={l.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                      <Input className="h-7 text-xs flex-1" defaultValue={l.descricao} placeholder="Descrição" />
                      <Select defaultValue={l.tipo}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="URBANO">Urbano</SelectItem>
                          <SelectItem value="INTERMUNICIPAL">Intermunicipal</SelectItem>
                          <SelectItem value="INTERESTADUAL">Interestadual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" className="h-7 text-xs w-20" defaultValue={l.valor_passagem} placeholder="Valor" />
                      <Input type="number" className="h-7 text-xs w-16" defaultValue={l.quantidade_dia} placeholder="Qtd" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteLinha(l.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea className="mt-1 text-xs" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações sobre vale transporte..." />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
