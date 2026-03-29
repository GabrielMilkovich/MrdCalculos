import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Zap } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface PericulosidadeConfig {
  ativo: boolean;
  percentual: string;
  periodo_inicio: string;
  periodo_fim: string;
  base_calculo: 'salario_base' | 'salario_contratual';
  observacoes: string;
}

const EMPTY: PericulosidadeConfig = {
  ativo: true,
  percentual: '30',
  periodo_inicio: '',
  periodo_fim: '',
  base_calculo: 'salario_base',
  observacoes: '',
};

export function ModuloPericulosidade({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PericulosidadeConfig>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.periculosidade_config) {
        setConfig(d.periculosidade_config as PericulosidadeConfig);
      }
    }
  }, [data]);

  const update = (partial: Partial<PericulosidadeConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }));

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        ...d,
        periculosidade_config: config,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Periculosidade salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" /> Adicional de Periculosidade
        </h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Art. 193 CLT - Periculosidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={config.ativo} onCheckedChange={v => update({ ativo: !!v })} />
            <Label className="text-xs">Apurar adicional de periculosidade</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Input
                type="number" step="1" min="0" max="100"
                value={config.percentual}
                onChange={e => update({ percentual: e.target.value })}
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Art. 193 CLT: 30% sobre salário base</p>
            </div>
            <div>
              <Label className="text-xs">Base de Cálculo</Label>
              <Select value={config.base_calculo} onValueChange={v => update({ base_calculo: v as PericulosidadeConfig['base_calculo'] })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salario_base">Salário Base (sem adicionais)</SelectItem>
                  <SelectItem value="salario_contratual">Salário Contratual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Período Início</Label>
              <Input
                type="date"
                value={config.periodo_inicio}
                onChange={e => update({ periodo_inicio: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Período Fim</Label>
              <Input
                type="date"
                value={config.periodo_fim}
                onChange={e => update({ periodo_fim: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Input
              value={config.observacoes}
              onChange={e => update({ observacoes: e.target.value })}
              className="h-8 text-xs mt-1"
              placeholder="Ex: Laudo pericial positivo. Não acumula com insalubridade (Art. 193 §2)."
            />
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Importante: O adicional de periculosidade NÃO acumula com insalubridade (Art. 193 §2 CLT).
            Gera reflexos em 13º salário, férias + 1/3 e FGTS.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
