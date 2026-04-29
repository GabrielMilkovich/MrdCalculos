/**
 * GeradorReflexos — UI para gerar reflexos automáticos a partir das verbas base
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import * as svc from "@/lib/pjecalc/service";
import { toast } from "sonner";
import { Loader2, Wand2, Trash2, RefreshCw } from "lucide-react";
import {
  gerarReflexosPadrao,
  listarTemplatesReflexo,
  type VerbaBase,
  type ReflexoGerado,
} from "@/lib/pjecalc/reflexo-engine";

interface Props {
  caseId: string;
}

export function GeradorReflexos({ caseId }: Props) {
  const qc = useQueryClient();
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(
    listarTemplatesReflexo().map(t => t.sufixo)
  );
  const [preview, setPreview] = useState<ReflexoGerado[] | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: verbas = [], isLoading } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: () => svc.getVerbas(caseId),
  });

  const verbasPrincipais = verbas.filter(
    (v) => !v.verba_principal_id && v.ativa !== false
  );
  const verbasReflexas = verbas.filter((v) => v.verba_principal_id);

  const templates = listarTemplatesReflexo();

  const toggleTemplate = (sufixo: string) => {
    setSelectedTemplates(prev =>
      prev.includes(sufixo)
        ? prev.filter(s => s !== sufixo)
        : [...prev, sufixo]
    );
    setPreview(null);
  };

  const handlePreview = () => {
    const bases: VerbaBase[] = verbasPrincipais.map((v) => ({
      id: v.id,
      nome: v.nome,
      ordem: (v as Record<string, unknown>).ordem || 0,
      incidencias: {
        fgts: (v as Record<string, unknown>).incidencia_fgts !== false,
        irpf: (v as Record<string, unknown>).incidencia_irpf !== false,
        cs: (v as Record<string, unknown>).incidencia_cs !== false,
      },
    }));
    const excludes = templates
      .filter(t => !selectedTemplates.includes(t.sufixo))
      .map(t => t.sufixo);
    const reflexos = gerarReflexosPadrao(bases, undefined, excludes);
    setPreview(reflexos);
  };

  const handleSave = async () => {
    if (!preview || preview.length === 0) return;
    setSaving(true);
    try {
      // Delete existing reflexos
      for (const vr of verbasReflexas) {
        await svc.deleteVerba(vr.id);
      }

      // Insert new reflexos
      for (const r of preview) {
        await svc.insertVerba({
          case_id: caseId,
          nome: r.nome,
          tipo: 'reflexa',
          verba_principal_id: r.verba_principal_id,
          caracteristica: r.caracteristica,
          ocorrencia_pagamento: r.ocorrencia_pagamento,
          comportamento_reflexo: r.comportamento_reflexo,
          multiplicador: r.multiplicador,
          divisor_informado: r.divisor_valor,
          tipo_quantidade: r.tipo_quantidade === 'avos' ? 'avos' : r.tipo_quantidade === 'calendario' ? 'calendario' : 'informada',
          quantidade_informada: r.tipo_quantidade === 'informada' ? 1 : undefined,
          incidencia_fgts: r.incidencias.fgts,
          incidencia_irpf: r.incidencias.irpf,
          incidencia_cs: r.incidencias.cs,
          gerar_principal: r.gerar_principal,
          gerar_reflexo: r.gerar_reflexo,
          ordem: r.ordem,
          ativa: true,
        } as Record<string, unknown>);
      }

      qc.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
      toast.success(`${preview.length} reflexos gerados com sucesso`);
      setPreview(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (verbasReflexas.length === 0) return;
    try {
      for (const vr of verbasReflexas) {
        await svc.deleteVerba(vr.id);
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
      toast.success("Reflexos removidos");
      setPreview(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Gerador de Reflexos Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verbasPrincipais.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma verba principal cadastrada. Adicione verbas antes de gerar reflexos.
          </p>
        ) : (
          <>
            {/* Verbas base */}
            <div>
              <p className="text-xs font-medium mb-2">Verbas Base ({verbasPrincipais.length})</p>
              <div className="flex flex-wrap gap-1">
                {verbasPrincipais.map((v: any) => (
                  <Badge key={v.id} variant="secondary" className="text-[9px]">
                    {v.nome}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Template selection */}
            <div>
              <p className="text-xs font-medium mb-2">Reflexos a gerar</p>
              <div className="space-y-2">
                {templates.map(t => (
                  <label key={t.sufixo} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedTemplates.includes(t.sufixo)}
                      onCheckedChange={() => toggleTemplate(t.sufixo)}
                    />
                    <span className="font-medium">{t.sufixo}</span>
                    <span className="text-muted-foreground">({t.caracteristica})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handlePreview}>
                <RefreshCw className="h-3 w-3 mr-1" /> Pré-visualizar
              </Button>
              {verbasReflexas.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleClear}>
                  <Trash2 className="h-3 w-3 mr-1" /> Limpar Reflexos ({verbasReflexas.length})
                </Button>
              )}
            </div>

            {/* Preview */}
            {preview && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium">{preview.length} reflexos serão gerados:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {preview.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-background border">
                      <Badge variant="outline" className="text-[8px]">R</Badge>
                      <span className="flex-1 truncate">{r.nome}</span>
                      <span className="text-muted-foreground">{r.caracteristica}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  Salvar {preview.length} Reflexos
                </Button>
              </div>
            )}

            {/* Existing reflexos */}
            {verbasReflexas.length > 0 && !preview && (
              <div>
                <p className="text-xs font-medium mb-2">Reflexos atuais ({verbasReflexas.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {verbasReflexas.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/30">
                      <Badge variant="outline" className="text-[8px]">R</Badge>
                      <span className="flex-1 truncate">{v.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
