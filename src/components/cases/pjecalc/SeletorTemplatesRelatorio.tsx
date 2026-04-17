/**
 * SeletorTemplatesRelatorio - Selector of report templates for MRD Calc.
 * Dialog with 9 cards: single-click prints; multi-select downloads a ZIP.
 * Legacy generators open windows; ZIP flow captures their HTML via a shim.
 */
import { useCallback, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  FileText, FileSpreadsheet, Scale, Landmark, BookOpen,
  Calculator, Layers, GitCompare, NotebookPen, Loader2, Download,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

import type {
  PjeLiquidacaoResult, PjeCorrecaoConfig, PjeCSConfig, PjeIRConfig, PjeFGTSConfig,
} from "@/lib/pjecalc/engine-types";

import { gerarRelatorioPDF } from "@/lib/pjecalc/pdf-report";
import { gerarRelatorioCompleto } from "@/lib/pjecalc/pdf-report-completo";
import { gerarRelatorioMemoriaCalculo } from "@/lib/pjecalc/pdf-report-memoria";
import { gerarRelatorioCustasDetalhado } from "@/lib/pjecalc/pdf-report-custas";
import {
  gerarRelatorioPrecatorio, type TipoPrecatorio,
} from "@/lib/pjecalc/pdf-report-precatorio";
import { gerarRelatorioJustificativa } from "@/lib/pjecalc/pdf-report-justificativa";
import { gerarRelatorioApuracaoJuros } from "@/lib/pjecalc/pdf-report-apuracao-juros";
import {
  gerarRelatorioConsolidadoCompleto, type CalculoConsolidado,
} from "@/lib/pjecalc/pdf-report-consolidado";
import { gerarRelatorioDiferenca } from "@/lib/pjecalc/pdf-report-diferenca";

export type TemplateId =
  | "resumo" | "completo" | "memoria" | "custas" | "precatorio"
  | "justificativa" | "apuracao_juros" | "consolidado" | "diferenca";

export interface SeletorTemplatesRelatorioProps {
  resultado: PjeLiquidacaoResult;
  correcaoConfig?: PjeCorrecaoConfig;
  csConfig?: PjeCSConfig;
  irConfig?: PjeIRConfig;
  fgtsConfig?: PjeFGTSConfig;
  processo: string;
  beneficiario: string;
  data_liquidacao: string;
}

interface TemplateDef {
  id: TemplateId;
  titulo: string;
  descricao: string;
  Icon: typeof FileText;
}

const TEMPLATES: readonly TemplateDef[] = [
  { id: "resumo", titulo: "Resumo Basico", descricao: "Resumo rapido da liquidacao.", Icon: FileText },
  { id: "completo", titulo: "Demonstrativo Completo", descricao: "Demonstrativo detalhado com todas as secoes.", Icon: FileSpreadsheet },
  { id: "memoria", titulo: "Memoria de Calculo", descricao: "Memoria de calculo por verba e competencia.", Icon: NotebookPen },
  { id: "custas", titulo: "Custas Detalhado", descricao: "Custas judiciais, periciais, emolumentos e postais.", Icon: Scale },
  { id: "precatorio", titulo: "Precatorio / RPV", descricao: "Relatorio de precatorio federal, estadual ou municipal.", Icon: Landmark },
  { id: "justificativa", titulo: "Justificativa", descricao: "Justificativa e criterios de calculo em prosa.", Icon: BookOpen },
  { id: "apuracao_juros", titulo: "Apuracao de Juros", descricao: "Apuracao detalhada de juros por periodo.", Icon: Calculator },
  { id: "consolidado", titulo: "Consolidado por Processo", descricao: "Consolida multiplos calculos do mesmo processo.", Icon: Layers },
  { id: "diferenca", titulo: "Diferenca entre Cenarios", descricao: "Diferencas liquidas por verba e competencia.", Icon: GitCompare },
] as const;

/** Capture HTML from a generator that writes into `window.open(...).document`. */
function captureLegacyHTML(run: () => void): string {
  const buf: string[] = [];
  const originalOpen = window.open;
  const fakeWin = {
    document: { write: (s: string) => { buf.push(s); }, close: () => {} },
    print: () => {},
  } as unknown as Window;
  try { window.open = () => fakeWin; run(); } finally { window.open = originalOpen; }
  return buf.join("");
}

const htmlBlob = (html: string): Blob => new Blob([html], { type: "text/html;charset=utf-8" });

/** Dispatch to the matching generator and return an HTML Blob. */
export function buildReportBlob(id: TemplateId, p: SeletorTemplatesRelatorioProps): Blob {
  const metaBase = { cliente: p.beneficiario, processo: p.processo, dataLiquidacao: p.data_liquidacao };
  switch (id) {
    case "resumo":
      return htmlBlob(captureLegacyHTML(() => gerarRelatorioPDF(p.resultado, metaBase)));
    case "completo":
      return htmlBlob(captureLegacyHTML(() =>
        gerarRelatorioCompleto(p.resultado, { ...metaBase, reclamado: "" })));
    case "memoria":
      return htmlBlob(captureLegacyHTML(() => gerarRelatorioMemoriaCalculo(p.resultado, metaBase)));
    case "diferenca":
      return htmlBlob(captureLegacyHTML(() => gerarRelatorioDiferenca(p.resultado, metaBase)));
    case "custas":
      return gerarRelatorioCustasDetalhado(p.resultado, metaBase);
    case "precatorio": {
      const tipo: TipoPrecatorio = "FEDERAL";
      return gerarRelatorioPrecatorio(p.resultado, { tipoPrecatorio: tipo, esfera: "Uniao", processo: p.processo });
    }
    case "justificativa": {
      if (!p.correcaoConfig || !p.csConfig || !p.irConfig || !p.fgtsConfig) {
        throw new Error("Justificativa requer correcaoConfig, csConfig, irConfig e fgtsConfig");
      }
      return gerarRelatorioJustificativa({
        resultado: p.resultado, correcaoConfig: p.correcaoConfig, csConfig: p.csConfig,
        irConfig: p.irConfig, fgtsConfig: p.fgtsConfig,
        processo: p.processo, beneficiario: p.beneficiario, data_liquidacao: p.data_liquidacao,
      });
    }
    case "apuracao_juros": {
      if (!p.correcaoConfig) throw new Error("Apuracao de juros requer correcaoConfig");
      return gerarRelatorioApuracaoJuros({
        resultado: p.resultado, correcaoConfig: p.correcaoConfig,
        data_ajuizamento: p.data_liquidacao, data_liquidacao: p.data_liquidacao,
        processo: p.processo, beneficiario: p.beneficiario,
      });
    }
    case "consolidado": {
      const calculo: CalculoConsolidado = {
        id: p.processo || "calc-1", nome: p.beneficiario,
        resultado: p.resultado, dataLiquidacao: p.data_liquidacao,
      };
      return gerarRelatorioConsolidadoCompleto([calculo], { processo: p.processo, cliente: p.beneficiario });
    }
  }
}

function filename(id: TemplateId, processo: string): string {
  const slug = (processo || "calc").replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${id}_${slug}.html`;
}

/** Build a ZIP with all selected templates. Exported for testing. */
export async function buildZipFromSelection(
  ids: TemplateId[], p: SeletorTemplatesRelatorioProps,
): Promise<Blob> {
  const zip = new JSZip();
  for (const id of ids) {
    const blob = buildReportBlob(id, p);
    zip.file(filename(id, p.processo), await blob.text());
  }
  return zip.generateAsync({ type: "blob" });
}

function openInNewWindow(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => win.print?.(), 600);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SeletorTemplatesRelatorio(props: SeletorTemplatesRelatorioProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<TemplateId>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = useCallback((id: TemplateId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSingle = useCallback((id: TemplateId) => {
    try {
      setLoading(true);
      openInNewWindow(buildReportBlob(id, props));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatorio.");
    } finally { setLoading(false); }
  }, [props]);

  const handleSelected = useCallback(async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      setLoading(true);
      if (ids.length === 1) {
        openInNewWindow(buildReportBlob(ids[0], props));
      } else {
        const zip = await buildZipFromSelection(ids, props);
        triggerDownload(zip, `relatorios_${props.processo || "calc"}.zip`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatorios.");
    } finally { setLoading(false); }
  }, [selected, props]);

  const selectedCount = selected.size;

  const grid = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {TEMPLATES.map(({ id, titulo, descricao, Icon }) => (
        <Card key={id} data-template-id={id} className="flex flex-col">
          <CardHeader className="flex-1 p-4">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selected.has(id)}
                onCheckedChange={() => toggle(id)}
                aria-label={`Selecionar ${titulo}`}
              />
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <CardTitle className="text-base leading-tight">{titulo}</CardTitle>
            </div>
            <CardDescription className="text-xs mt-2">{descricao}</CardDescription>
          </CardHeader>
          <div className="p-3 pt-0">
            <Button type="button" size="sm" variant="outline" className="w-full"
              disabled={loading} onClick={() => handleSingle(id)}>Gerar</Button>
          </div>
        </Card>
      ))}
    </div>
  ), [selected, loading, handleSingle, toggle]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="default" size="sm">
          <FileText className="h-4 w-4" /> Gerar Relatorios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Gerar Relatorios</DialogTitle></DialogHeader>
        {grid}
        <DialogFooter>
          <Button type="button" disabled={selectedCount === 0 || loading} onClick={handleSelected}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Gerar Selecionados {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const __TEMPLATES = TEMPLATES;
