import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

type GrauInsalubridade = 'minimo_10' | 'medio_20' | 'maximo_40';

interface InsalubridadeConfig {
  ativo: boolean;
  grau: GrauInsalubridade;
  base_calculo: 'salario_minimo' | 'salario_base' | 'salario_contratual';
  periodo_inicio: string;
  periodo_fim: string;
  atividade: string;
  observacoes: string;
}

const EMPTY: InsalubridadeConfig = {
  ativo: true,
  grau: 'medio_20',
  base_calculo: 'salario_minimo',
  periodo_inicio: '',
  periodo_fim: '',
  atividade: '',
  observacoes: '',
};

export function ModuloInsalubridade({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<InsalubridadeConfig>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.insalubridade_config) {
        setConfig(d.insalubridade_config as InsalubridadeConfig);
      }
    }
  }, [data]);

  const update = (partial: Partial<InsalubridadeConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }));

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        ...d,
        insalubridade_config: config,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Insalubridade salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Adicional de Insalubridade
        </h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Art. 192 CLT + NR 15 MTE - Insalubridade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={config.ativo} onCheckedChange={v => update({ ativo: !!v })} />
            <Label className="text-xs">Apurar adicional de insalubridade</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Grau de Insalubridade</Label>
              <Select value={config.grau} onValueChange={v => update({ grau: v as GrauInsalubridade })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimo_10">Grau Minimo (10%)</SelectItem>
                  <SelectItem value="medio_20">Grau Medio (20%)</SelectItem>
                  <SelectItem value="maximo_40">Grau Maximo (40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Base de Calculo</Label>
              <Select value={config.base_calculo} onValueChange={v => update({ base_calculo: v as InsalubridadeConfig['base_calculo'] })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salario_minimo">Salario Minimo (Sumula Vinculante 4 STF - padrao)</SelectItem>
                  <SelectItem value="salario_base">Salario Base</SelectItem>
                  <SelectItem value="salario_contratual">Salario Contratual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Periodo Inicio</Label>
              <Input
                type="date"
                value={config.periodo_inicio}
                onChange={e => update({ periodo_inicio: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Periodo Fim</Label>
              <Input
                type="date"
                value={config.periodo_fim}
                onChange={e => update({ periodo_fim: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Atividade Insalubre</Label>
            <Select value={config.atividade} onValueChange={v => update({ atividade: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecione a atividade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agentes_quimicos">Agentes Quimicos</SelectItem>
                <SelectItem value="agentes_biologicos">Agentes Biologicos</SelectItem>
                <SelectItem value="ruido">Ruido</SelectItem>
                <SelectItem value="calor">Calor</SelectItem>
                <SelectItem value="frio">Frio</SelectItem>
                <SelectItem value="umidade">Umidade</SelectItem>
                <SelectItem value="radiacao">Radiacao</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Observacoes</Label>
            <Input
              value={config.observacoes}
              onChange={e => update({ observacoes: e.target.value })}
              className="h-8 text-xs mt-1"
              placeholder="Ex: Laudo pericial positivo para agentes quimicos. NR 15, Anexo 13."
            />
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Importante: O adicional de insalubridade NAO acumula com periculosidade (Art. 193 &sect;2 CLT).
            Base de calculo padrao: Salario Minimo (Sumula Vinculante 4 STF).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
