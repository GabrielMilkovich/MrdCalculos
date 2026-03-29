/**
 * SeletorTRT — TRT Selector component
 *
 * Dropdown to select a TRT (Tribunal Regional do Trabalho) that
 * auto-configures calculation parameters based on regional rules.
 */
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Scale,
  Calendar,
  Info,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  TRT_CONFIGS,
  getTRTById,
  getTRTLabel,
  getTRTParametrosDefaults,
  type TRTConfig,
} from "@/lib/pjecalc/trt-templates";

interface Props {
  selectedTrtId?: number | null;
  onSelect: (trtId: number, defaults: ReturnType<typeof getTRTParametrosDefaults>) => void;
  compact?: boolean;
}

export function SeletorTRT({ selectedTrtId, onSelect, compact }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [detailTrt, setDetailTrt] = useState<TRTConfig | null>(null);

  const selectedTrt = useMemo(
    () => (selectedTrtId ? getTRTById(selectedTrtId) : null),
    [selectedTrtId]
  );

  const handleSelect = (value: string) => {
    const trtId = parseInt(value, 10);
    const defaults = getTRTParametrosDefaults(trtId);
    onSelect(trtId, defaults);

    const trt = getTRTById(trtId);
    if (trt) {
      const notes: string[] = [];
      if (!trt.sabado_dia_util_default) {
        notes.push("Sábado NÃO é dia útil (Sabadão)");
      }
      notes.push(`Índice preferencial: ${trt.indice_correcao_preferencial}`);
      if (trt.honorarios_default_pct !== 15) {
        notes.push(`Honorários: ${trt.honorarios_default_pct}%`);
      }

      toast.success(
        `${getTRTLabel(trt)} selecionado. ${notes.join(". ")}.`
      );
    }
  };

  const handleShowDetail = (trt: TRTConfig) => {
    setDetailTrt(trt);
    setShowDetail(true);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedTrtId?.toString() || ""}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecione o TRT..." />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[300px]">
              {TRT_CONFIGS.map((trt) => (
                <SelectItem key={trt.trt_id} value={trt.trt_id.toString()}>
                  {getTRTLabel(trt)}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        {selectedTrt && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleShowDetail(selectedTrt)}
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        )}
        <TRTDetailDialog
          trt={detailTrt}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Tribunal Regional do Trabalho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedTrtId?.toString() || ""}
          onValueChange={handleSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o TRT da jurisdição..." />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[300px]">
              {TRT_CONFIGS.map((trt) => (
                <SelectItem key={trt.trt_id} value={trt.trt_id.toString()}>
                  {getTRTLabel(trt)}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>

        {selectedTrt && (
          <div className="space-y-3 pt-2">
            {/* Quick summary of applied defaults */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Sábado:{" "}
                  <span className="font-medium">
                    {selectedTrt.sabado_dia_util_default
                      ? "Dia útil"
                      : "NÃO dia útil"}
                  </span>
                </span>
                {!selectedTrt.sabado_dia_util_default && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">
                    Sabadão
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="text-muted-foreground text-xs">Índice:</span>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {selectedTrt.indice_correcao_preferencial}
                </Badge>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="text-muted-foreground text-xs">Honorários:</span>
                <span className="font-medium">
                  {selectedTrt.honorarios_default_pct}%
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="text-muted-foreground text-xs">Custas:</span>
                <span className="font-medium">
                  {selectedTrt.custas_default_pct}%
                </span>
              </div>
            </div>

            {/* Regional rules summary */}
            {selectedTrt.regras_especificas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Regras regionais ({selectedTrt.regras_especificas.length}):
                </p>
                {selectedTrt.regras_especificas.slice(0, 2).map((r) => (
                  <div
                    key={r.codigo}
                    className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900"
                  >
                    <span className="font-medium">{r.codigo}</span>
                    <span className="text-muted-foreground ml-1">
                      ({r.tipo})
                    </span>
                    <p className="mt-0.5 text-muted-foreground line-clamp-2">
                      {r.descricao}
                    </p>
                  </div>
                ))}
                {selectedTrt.regras_especificas.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleShowDetail(selectedTrt)}
                  >
                    Ver todas as regras{" "}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}

            {selectedTrt.tabela_unica_url && (
              <a
                href={selectedTrt.tabela_unica_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Tabela Única do {selectedTrt.sigla}
                <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>

      <TRTDetailDialog
        trt={detailTrt}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </Card>
  );
}

// --- Detail Dialog ---

function TRTDetailDialog({
  trt,
  open,
  onClose,
}: {
  trt: TRTConfig | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!trt) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {getTRTLabel(trt)}
          </DialogTitle>
          <DialogDescription>{trt.nome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow
              label="Estados"
              value={trt.estados.join(", ")}
            />
            <InfoRow
              label="Sábado dia útil"
              value={trt.sabado_dia_util_default ? "Sim" : "Não (Sabadão)"}
            />
            <InfoRow
              label="Índice preferencial"
              value={trt.indice_correcao_preferencial}
            />
            <InfoRow
              label="Honorários"
              value={`${trt.honorarios_default_pct}%`}
            />
            <InfoRow
              label="Custas"
              value={`${trt.custas_default_pct}%`}
            />
          </div>

          {/* Jurisprudence */}
          {trt.regras_especificas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Jurisprudência Regional
              </h4>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {trt.regras_especificas.map((r) => (
                    <div
                      key={r.codigo}
                      className="p-2.5 rounded border text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5"
                        >
                          {r.tipo}
                        </Badge>
                        <span className="font-medium">{r.codigo}</span>
                      </div>
                      <p className="text-muted-foreground">{r.descricao}</p>
                      <p className="text-[10px] text-muted-foreground italic">
                        Ref: {r.referencia}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {trt.tabela_unica_url && (
            <a
              href={trt.tabela_unica_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Acessar Tabela Única
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
