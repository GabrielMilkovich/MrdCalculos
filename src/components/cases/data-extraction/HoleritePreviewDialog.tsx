/**
 * HoleritePreviewDialog — preview da categorização do holerite antes de
 * gerar o ZIP final.
 *
 * Usuário vê todas as rubricas extraídas, agrupadas por categoria, e pode:
 *   - Toggle inclusão (☑/☐) por linha
 *   - Reclassificar (dropdown por linha)
 *   - Ver bloco "Ignorados" (descontos + hints "ignorar")
 *
 * Estado vive só aqui — nada vai pro banco. Cancelar = nada baixado.
 * Confirmar = chama buildHoleriteZip + dispara download.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  buildHoleriteZip,
  triggerBlobDownload,
  type CategoriaSlug,
  type ClassificacaoHolerite,
  type LinhaClassificada,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classificacao: ClassificacaoHolerite;
  filename: string;
}

const CATEGORIA_LABELS: Record<CategoriaSlug, string> = {
  salario_fixo: "Salário Fixo",
  comissao: "Comissões",
  dsr: "DSR",
  premiacao: "Premiações",
  minimo_garantido: "Mínimo Garantido",
  salario_familia: "Salário-família",
};

const CATEGORIA_OPTIONS: Array<{ value: CategoriaSlug | "ignorar"; label: string }> = [
  { value: "salario_fixo", label: "Salário Fixo" },
  { value: "comissao", label: "Comissões" },
  { value: "dsr", label: "DSR" },
  { value: "premiacao", label: "Premiações" },
  { value: "minimo_garantido", label: "Mínimo Garantido" },
  { value: "salario_familia", label: "Salário-família" },
  { value: "ignorar", label: "Ignorar" },
];

export function HoleritePreviewDialog({
  open,
  onOpenChange,
  classificacao,
  filename,
}: Props) {
  const [linhas, setLinhas] = useState<LinhaClassificada[]>(classificacao.linhas);
  const [downloading, setDownloading] = useState(false);

  // Resetar quando classificacao mudar (novo doc)
  useMemo(() => {
    setLinhas(classificacao.linhas);
  }, [classificacao]);

  const updateLinha = (key: string, patch: Partial<LinhaClassificada>) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  // Agrupa por categoria (ou "Ignorados") para renderização
  const agrupado = useMemo(() => {
    const grupos = new Map<CategoriaSlug, LinhaClassificada[]>();
    const ignorados: LinhaClassificada[] = [];
    for (const l of linhas) {
      if (l.categoria === null || !l.incluir) {
        ignorados.push(l);
        continue;
      }
      const list = grupos.get(l.categoria) ?? [];
      list.push(l);
      grupos.set(l.categoria, list);
    }
    return { grupos, ignorados };
  }, [linhas]);

  const totalCategorias = agrupado.grupos.size;

  const handleConfirmar = async () => {
    setDownloading(true);
    try {
      const blob = await buildHoleriteZip({ ...classificacao, linhas });
      triggerBlobDownload(blob, filename);
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview da exportação</DialogTitle>
          <DialogDescription>
            Competência {classificacao.competencia} · layout{" "}
            <code className="text-xs">{classificacao.layout_usado}</code> ·{" "}
            {totalCategorias} categoria(s) com dados
          </DialogDescription>
        </DialogHeader>

        {classificacao.warnings.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" /> Avisos do parser
            </div>
            {classificacao.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="text-amber-800 dark:text-amber-200">
                · {w}
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 pb-2">
            {[...agrupado.grupos.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([slug, items]) => {
                const total = items.reduce((s, l) => s + l.valorParaCsv, 0);
                return (
                  <CategoriaBlock
                    key={slug}
                    label={CATEGORIA_LABELS[slug]}
                    total={total}
                    items={items}
                    onUpdate={updateLinha}
                  />
                );
              })}

            {agrupado.ignorados.length > 0 && (
              <IgnoradosBlock items={agrupado.ignorados} onUpdate={updateLinha} />
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={downloading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={downloading || totalCategorias === 0}
            className="gap-1.5"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Confirmar e baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Bloco por categoria
// =====================================================

function CategoriaBlock({
  label,
  total,
  items,
  onUpdate,
}: {
  label: string;
  total: number;
  items: LinhaClassificada[];
  onUpdate: (key: string, patch: Partial<LinhaClassificada>) => void;
}) {
  const hasFallback = items.some((l) => l.origem === "fallback");
  return (
    <Collapsible defaultOpen>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm">{label}</span>
            <Badge variant="secondary" className="text-[10px]">
              {items.length} rubrica(s)
            </Badge>
            {hasFallback && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300"
              >
                revise
              </Badge>
            )}
          </div>
          <span className="font-mono text-sm font-semibold">
            R$ {total.toFixed(2)}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {items.map((l) => (
              <LinhaRow key={l.key} linha={l} onUpdate={onUpdate} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =====================================================
// Bloco "Ignorados"
// =====================================================

function IgnoradosBlock({
  items,
  onUpdate,
}: {
  items: LinhaClassificada[];
  onUpdate: (key: string, patch: Partial<LinhaClassificada>) => void;
}) {
  return (
    <Collapsible>
      <div className="rounded-md border bg-muted/20">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/40">
          <span className="text-xs text-muted-foreground">
            Ignorados ({items.length})
          </span>
          <span className="text-[10px] text-muted-foreground">
            descontos + hints "ignorar"
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {items.map((l) => (
              <LinhaRow key={l.key} linha={l} onUpdate={onUpdate} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =====================================================
// Linha individual (toggle + reclassify + valor)
// =====================================================

function LinhaRow({
  linha,
  onUpdate,
}: {
  linha: LinhaClassificada;
  onUpdate: (key: string, patch: Partial<LinhaClassificada>) => void;
}) {
  const venc = linha.rubrica.valor_vencimento;
  const desc = linha.rubrica.valor_desconto;
  const valorMostrado = venc !== null && venc > 0 ? venc : (desc ?? 0);
  const isDesconto = linha.origem === "desconto";

  const currentValue: CategoriaSlug | "ignorar" =
    linha.categoria ?? "ignorar";

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted/30 border-t first:border-t-0">
      <Checkbox
        checked={linha.incluir}
        onCheckedChange={(v) => onUpdate(linha.key, { incluir: Boolean(v) })}
        disabled={isDesconto}
      />
      <span className="font-mono text-muted-foreground w-12">
        {linha.rubrica.codigo ?? "—"}
      </span>
      <span className="flex-1 truncate">{linha.rubrica.nome}</span>
      <span
        className={`font-mono w-20 text-right ${
          isDesconto ? "text-muted-foreground italic" : ""
        }`}
      >
        {isDesconto ? `-${valorMostrado.toFixed(2)}` : valorMostrado.toFixed(2)}
      </span>
      <Select
        value={currentValue}
        disabled={isDesconto}
        onValueChange={(v) => {
          if (v === "ignorar") {
            onUpdate(linha.key, { categoria: null, incluir: false });
          } else {
            onUpdate(linha.key, {
              categoria: v as CategoriaSlug,
              incluir: linha.valorParaCsv > 0,
            });
          }
        }}
      >
        <SelectTrigger className="h-6 text-[11px] w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIA_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
