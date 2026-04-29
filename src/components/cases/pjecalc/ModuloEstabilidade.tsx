import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Shield } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

type TipoEstabilidade = 'gestante' | 'cipa' | 'acidentaria' | 'outro';

interface EstabilidadeConfig {
  ativo: boolean;
  tipo: TipoEstabilidade;
  periodo_inicio: string;
  periodo_fim: string;
  data_evento: string;
  meses_estabilidade: string;
  observacoes: string;
}

const EMPTY: EstabilidadeConfig = {
  ativo: true,
  tipo: 'gestante',
  periodo_inicio: '',
  periodo_fim: '',
  data_evento: '',
  meses_estabilidade: '',
  observacoes: '',
};

const TIPO_LABELS: Record<TipoEstabilidade, { label: string; desc: string; meses: number }> = {
  gestante: { label: 'Gestante', desc: 'Art. 10, II, b, ADCT + Súmula 244 TST — até 5 meses após o parto', meses: 5 },
  cipa: { label: 'CIPA', desc: 'Art. 10, II, a, ADCT — 1 ano após fim do mandato', meses: 12 },
  acidentaria: { label: 'Acidentária', desc: 'Art. 118, Lei 8.213/91 — 12 meses após alta previdenciária', meses: 12 },
  outro: { label: 'Outro', desc: 'Estabilidade definida por norma coletiva ou decisão judicial', meses: 0 },
};

export function ModuloEstabilidade({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<EstabilidadeConfig>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: () => svc.getMultasConfig(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.estabilidade_config) {
        setConfig(d.estabilidade_config as EstabilidadeConfig);
      }
    }
  }, [data]);

  const update = (partial: Partial<EstabilidadeConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      // Auto-fill meses when tipo changes
      if (partial.tipo && partial.tipo !== 'outro') {
        next.meses_estabilidade = TIPO_LABELS[partial.tipo].meses.toString();
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = (data || {}) as Record<string, unknown>;
      await svc.upsertMultasConfig(caseId, {
        ...d,
        estabilidade_config: config,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Estabilidade salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const tipoInfo = TIPO_LABELS[config.tipo];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Estabilidade Provisória
        </h2>
        <Button onClick={save} disabled size="sm" title="Módulo desabilitado — não implementado">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Configuração de Estabilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[10px] text-orange-800 bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200 dark:border-orange-900">
            <strong>🚧 Não implementado — entrará no release v3.6.</strong>
            <br />Gestante (Art. 10 ADCT + Súm. 244 TST), CIPA (Art. 10 ADCT)
            e acidentária (Art. 118 Lei 8.213) exigem motor próprio de
            indenização (salários do período + reflexos 13º/férias/FGTS).
            Os campos abaixo estão desabilitados até a entrega.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox checked={config.ativo} onCheckedChange={v => update({ ativo: !!v })} disabled />
            <Label className="text-xs text-muted-foreground">Apurar indenização por estabilidade provisória</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo de Estabilidade</Label>
              <Select value={config.tipo} onValueChange={v => update({ tipo: v as TipoEstabilidade })} disabled>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestante">Gestante (Art. 10 ADCT)</SelectItem>
                  <SelectItem value="cipa">CIPA (Art. 10 ADCT)</SelectItem>
                  <SelectItem value="acidentaria">Acidentária (Art. 118, Lei 8.213)</SelectItem>
                  <SelectItem value="outro">Outro (norma coletiva)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Meses de Estabilidade</Label>
              <Input
                type="number" step="1" min="1"
                value={config.meses_estabilidade}
                onChange={e => update({ meses_estabilidade: e.target.value })}
                className="h-8 text-xs mt-1"
                disabled
              />
              {config.tipo !== 'outro' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Auto: {tipoInfo.meses} meses ({tipoInfo.label})</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Data do Evento</Label>
            <Input
              type="date"
              value={config.data_evento}
              onChange={e => update({ data_evento: e.target.value })}
              className="h-8 text-xs mt-1"
              disabled
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {config.tipo === 'gestante' ? 'Data do parto' :
               config.tipo === 'cipa' ? 'Data do fim do mandato' :
               config.tipo === 'acidentaria' ? 'Data da alta previdenciária' :
               'Data do início da estabilidade'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Período Início (Estabilidade)</Label>
              <Input type="date" value={config.periodo_inicio} onChange={e => update({ periodo_inicio: e.target.value })} className="h-8 text-xs mt-1" disabled />
            </div>
            <div>
              <Label className="text-xs">Período Fim (Estabilidade)</Label>
              <Input type="date" value={config.periodo_fim} onChange={e => update({ periodo_fim: e.target.value })} className="h-8 text-xs mt-1" disabled />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Input
              value={config.observacoes}
              onChange={e => update({ observacoes: e.target.value })}
              className="h-8 text-xs mt-1"
              placeholder="Ex: Empregada dispensada durante gestação. Súmula 244, III TST."
              disabled
            />
          </div>

          <div className="text-[10px] text-muted-foreground border-t pt-2 space-y-1">
            <p className="font-medium">{tipoInfo.label}: {tipoInfo.desc}</p>
            <p>Calcula salário integral para cada mês do período estabilitário.
              Gera reflexos em 13º salário, férias + 1/3 e FGTS.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
