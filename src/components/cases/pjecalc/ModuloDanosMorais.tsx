import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Heart } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface DanosMoraisConfig {
  ativo: boolean;
  valor: string;
  data_sentenca: string;
  indice_correcao: 'IPCAE' | 'IPCA' | 'SELIC' | 'TR';
  grau_ofensa: 'leve' | 'medio' | 'grave' | 'gravissimo';
  observacoes: string;
}

const EMPTY: DanosMoraisConfig = {
  ativo: true,
  valor: '',
  data_sentenca: '',
  indice_correcao: 'IPCAE',
  grau_ofensa: 'medio',
  observacoes: '',
};

export function ModuloDanosMorais({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DanosMoraisConfig>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.danos_morais_config) {
        setConfig(d.danos_morais_config as DanosMoraisConfig);
      }
    }
  }, [data]);

  const update = (partial: Partial<DanosMoraisConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }));

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        ...d,
        danos_morais_config: config,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Danos morais salvos!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5" /> Danos Morais
        </h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Art. 223-G CLT - Indenização por Danos Morais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={config.ativo} onCheckedChange={v => update({ ativo: !!v })} />
            <Label className="text-xs">Apurar indenização por danos morais</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor Arbitrado (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={config.valor}
                onChange={e => update({ valor: e.target.value })}
                className="h-8 text-xs mt-1"
                placeholder="0,00"
              />
            </div>
            <div>
              <Label className="text-xs">Data da Sentença</Label>
              <Input
                type="date"
                value={config.data_sentenca}
                onChange={e => update({ data_sentenca: e.target.value })}
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Correção monetária a partir desta data</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Índice de Correção</Label>
              <Select value={config.indice_correcao} onValueChange={v => update({ indice_correcao: v as DanosMoraisConfig['indice_correcao'] })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPCAE">IPCA-E</SelectItem>
                  <SelectItem value="IPCA">IPCA</SelectItem>
                  <SelectItem value="SELIC">SELIC</SelectItem>
                  <SelectItem value="TR">TR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grau da Ofensa (Art. 223-G §1)</Label>
              <Select value={config.grau_ofensa} onValueChange={v => update({ grau_ofensa: v as DanosMoraisConfig['grau_ofensa'] })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve (até 3x último salário)</SelectItem>
                  <SelectItem value="medio">Médio (até 5x último salário)</SelectItem>
                  <SelectItem value="grave">Grave (até 20x último salário)</SelectItem>
                  <SelectItem value="gravissimo">Gravíssimo (até 50x último salário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Input
              value={config.observacoes}
              onChange={e => update({ observacoes: e.target.value })}
              className="h-8 text-xs mt-1"
              placeholder="Ex: Assédio moral comprovado. Sentença de 1a instância."
            />
          </div>

          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Natureza indenizatória: NÃO incide FGTS, INSS ou IRPF. NÃO gera reflexos.
            Correção monetária a partir da data da sentença (Súmula 439 TST).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
