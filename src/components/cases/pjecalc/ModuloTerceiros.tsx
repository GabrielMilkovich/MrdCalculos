/**
 * ModuloTerceiros — Third-party contributions (Sistema S) configuration and display
 *
 * UI for configuring and viewing third-party contributions based on FPAS code:
 * - FPAS code selector (auto-fills entities)
 * - Toggle individual entities on/off
 * - Show calculated values per entity
 */
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Loader2, Building2, Calculator } from "lucide-react";
import {
  FPAS_DEFINITIONS,
  buildTerceirosConfigFromFPAS,
  calcularTerceiros,
  type TerceirosConfig,
  type TerceirosEntidade,
  type TerceirosResult,
  type FPASDefinition,
} from "@/lib/pjecalc/terceiros-contributions";

interface Props {
  caseId: string;
  baseCalculo?: number; // Current INSS base for preview
  onConfigChange?: (config: TerceirosConfig) => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ModuloTerceiros({ caseId, baseCalculo, onConfigChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TerceirosConfig>({
    apurar: true,
    fpas: "515",
    entidades: [],
  });

  // Initialize with default FPAS (Commerce)
  useEffect(() => {
    const initial = buildTerceirosConfigFromFPAS("515");
    setConfig(initial);
  }, []);

  // Computed preview
  const preview: TerceirosResult | null = useMemo(() => {
    if (!config.apurar || !baseCalculo || baseCalculo <= 0) return null;
    return calcularTerceiros(baseCalculo, config);
  }, [config, baseCalculo]);

  const handleFPASChange = (fpas: string) => {
    const newConfig = buildTerceirosConfigFromFPAS(fpas);
    setConfig(newConfig);
    onConfigChange?.(newConfig);

    const def = FPAS_DEFINITIONS.find((f) => f.codigo === fpas);
    if (def) {
      toast.info(
        `FPAS ${fpas} (${def.atividade}) aplicado: ${def.total_terceiros}% total`
      );
    }
  };

  const toggleEntidade = (index: number) => {
    setConfig((prev) => {
      const updated = { ...prev };
      updated.entidades = prev.entidades.map((e, i) =>
        i === index ? { ...e, ativa: !e.ativa } : e
      );
      onConfigChange?.(updated);
      return updated;
    });
  };

  const updateAliquota = (index: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setConfig((prev) => {
      const updated = { ...prev };
      updated.entidades = prev.entidades.map((e, i) =>
        i === index ? { ...e, aliquota: num } : e
      );
      onConfigChange?.(updated);
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist to pjecalc config via service
      // For now, emit via callback
      onConfigChange?.(config);
      toast.success("Configuracao de terceiros salva.");
    } catch (err) {
      toast.error("Erro ao salvar configuracao de terceiros.");
    } finally {
      setSaving(false);
    }
  };

  const selectedFPAS = FPAS_DEFINITIONS.find((f) => f.codigo === config.fpas);
  const activeAliquotaTotal = config.entidades
    .filter((e) => e.ativa)
    .reduce((sum, e) => sum + e.aliquota, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Contribuicoes de Terceiros (Sistema S)
          {config.apurar && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
              {activeAliquotaTotal.toFixed(1)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="terceiros-apurar"
            checked={config.apurar}
            onCheckedChange={(checked) => {
              setConfig((prev) => {
                const updated = { ...prev, apurar: !!checked };
                onConfigChange?.(updated);
                return updated;
              });
            }}
          />
          <Label htmlFor="terceiros-apurar" className="text-sm">
            Apurar contribuicoes de terceiros
          </Label>
        </div>

        {config.apurar && (
          <>
            {/* FPAS Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Codigo FPAS</Label>
              <Select value={config.fpas} onValueChange={handleFPASChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o FPAS..." />
                </SelectTrigger>
                <SelectContent>
                  {FPAS_DEFINITIONS.map((def) => (
                    <SelectItem key={def.codigo} value={def.codigo}>
                      {def.codigo} - {def.descricao} ({def.total_terceiros}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFPAS && (
                <p className="text-xs text-muted-foreground">
                  Atividade: {selectedFPAS.atividade} | Total padrao:{" "}
                  {selectedFPAS.total_terceiros}%
                </p>
              )}
            </div>

            {/* Entities table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Ativa</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="w-20 text-right">Aliquota %</TableHead>
                    {preview && (
                      <TableHead className="w-28 text-right">Valor (R$)</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.entidades.map((ent, idx) => {
                    const previewItem = preview?.items.find(
                      (i) => i.sigla === ent.sigla
                    );
                    return (
                      <TableRow
                        key={ent.sigla}
                        className={!ent.ativa ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={ent.ativa}
                            onCheckedChange={() => toggleEntidade(idx)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 font-mono"
                            >
                              {ent.sigla}
                            </Badge>
                            <span className="text-sm">{ent.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={ent.aliquota}
                            onChange={(e) =>
                              updateAliquota(idx, e.target.value)
                            }
                            className="w-20 h-7 text-right text-sm ml-auto"
                            disabled={!ent.ativa}
                          />
                        </TableCell>
                        {preview && (
                          <TableCell className="text-right font-mono text-sm">
                            {previewItem && ent.ativa
                              ? fmt(previewItem.valor)
                              : "-"}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  <TableRow className="font-medium bg-muted/30">
                    <TableCell />
                    <TableCell>Total Terceiros</TableCell>
                    <TableCell className="text-right">
                      {activeAliquotaTotal.toFixed(1)}%
                    </TableCell>
                    {preview && (
                      <TableCell className="text-right font-mono">
                        {fmt(preview.total_valor)}
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Preview info */}
            {baseCalculo && baseCalculo > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                <Calculator className="h-3.5 w-3.5" />
                <span>
                  Previa calculada sobre base de R$ {fmt(baseCalculo)} (mesma
                  base INSS)
                </span>
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar Configuracao
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
