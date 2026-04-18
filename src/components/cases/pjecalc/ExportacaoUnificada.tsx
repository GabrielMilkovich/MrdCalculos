/**
 * ExportacaoUnificada — hub de exportação PJe-Calc.
 *
 * Consolida 3 formatos de saída em uma única tela com abas:
 *   1. PDF (Memória de Cálculo / Resumo Executivo)
 *   2. Excel (XLSX com múltiplas abas + CSV)
 *   3. PJC XML (formato nativo PJe-Calc para reimportação)
 *
 * Cada aba tem opções próprias e usa as libs existentes:
 *   - `@/lib/pjecalc/pdf`                 (buildMemoriaDeCalculo, buildResumo)
 *   - `@/lib/pjecalc/excel-export`        (exportToExcel, exportToCSV)
 *   - `@/lib/pjecalc/pjc-export-builder`  (buildPJCRealFromCase)
 *   - `@/lib/pjecalc/pjc-xml-real`        (exportPJCXml, downloadPJCXml)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2, FileSpreadsheet, FileText, Download, Printer, FileCode2,
  Eye, CheckCircle2, Info,
} from "lucide-react";
import { toast } from "sonner";

import type {
  PjeLiquidacaoResult,
  PjeParametros,
  PjeVerba,
} from "@/lib/pjecalc/engine-types";

// Excel
import {
  exportToExcel,
  exportToCSV,
  downloadBlob,
  downloadCSV,
  DEFAULT_SHEETS,
  type ExcelSheetSelection,
} from "@/lib/pjecalc/excel-export";

// PDF
import {
  buildMemoriaDeCalculo,
  buildResumo,
  openAndPrint,
  downloadHTML,
  generateFilename,
  type DadosProcesso,
} from "@/lib/pjecalc/pdf";

// PJC XML
import { buildPJCRealFromCase, type PJCExportInputs } from "@/lib/pjecalc/pjc-export-builder";
import { exportPJCXml, downloadPJCXml } from "@/lib/pjecalc/pjc-xml-real";

interface Props {
  result: PjeLiquidacaoResult;
  params?: PjeParametros;
  verbas?: PjeVerba[];
  dadosProcesso?: DadosProcesso;
  /** Configs opcionais para enriquecer o PJC XML export. */
  pjcExtras?: Partial<Omit<PJCExportInputs, 'result' | 'params' | 'verbas' | 'dadosProcesso'>>;
  /** Prefixo do nome do arquivo (sem extensão). */
  processo?: string;
}

const SHEET_LABELS: Record<keyof ExcelSheetSelection, string> = {
  resumo: "Resumo Geral",
  verbas: "Verbas Detalhadas",
  correcao: "Correção Monetária",
  inss: "INSS/CS Detalhado",
  irrf: "IRRF Detalhado",
  fgts: "FGTS Detalhado",
  honorarios: "Honorários e Custas",
  memoria: "Memória de Cálculo",
};

export function ExportacaoUnificada({
  result,
  params,
  verbas = [],
  dadosProcesso,
  pjcExtras,
  processo,
}: Props) {
  // ─── Estado compartilhado ───
  const fileBase = processo ? processo.replace(/[^0-9A-Za-z._-]/g, '_') : 'mrdcalc';
  const dadosProc: DadosProcesso = dadosProcesso ?? {};

  // ─── PDF ───
  const [pdfMode, setPdfMode] = useState<'memoria' | 'resumo'>('memoria');
  const [pdfBusy, setPdfBusy] = useState<'print' | 'download' | null>(null);

  const buildPdfHtml = (): string => {
    return pdfMode === 'memoria'
      ? buildMemoriaDeCalculo(result, params, dadosProc)
      : buildResumo(result, params, dadosProc);
  };

  const handlePdfPrint = () => {
    setPdfBusy('print');
    try {
      const html = buildPdfHtml();
      openAndPrint(html);
      toast.success("Janela de impressão aberta.");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e as Error).message);
    } finally {
      setPdfBusy(null);
    }
  };

  const handlePdfDownload = () => {
    setPdfBusy('download');
    try {
      const html = buildPdfHtml();
      const label = pdfMode === 'memoria' ? 'MemoriaCalculo' : 'Resumo';
      const filename = generateFilename(label, processo);
      downloadHTML(html, filename);
      toast.success("HTML baixado. Abra no navegador e use Ctrl+P para gerar PDF.");
    } catch (e) {
      toast.error("Erro ao gerar: " + (e as Error).message);
    } finally {
      setPdfBusy(null);
    }
  };

  // ─── Excel ───
  const [sheets, setSheets] = useState<ExcelSheetSelection>({ ...DEFAULT_SHEETS });
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const selectedCount = Object.values(sheets).filter(Boolean).length;

  const toggleSheet = (key: keyof ExcelSheetSelection) =>
    setSheets(prev => ({ ...prev, [key]: !prev[key] }));

  const handleXlsx = async () => {
    if (selectedCount === 0) { toast.error("Selecione ao menos uma aba."); return; }
    setXlsxBusy(true);
    try {
      const blob = await exportToExcel(result, params, sheets);
      downloadBlob(blob, `${fileBase}_calculo.xlsx`);
      toast.success(`XLSX gerado com ${selectedCount} aba${selectedCount > 1 ? 's' : ''}.`);
    } catch (e) {
      toast.error("Erro ao gerar XLSX: " + (e as Error).message);
    } finally {
      setXlsxBusy(false);
    }
  };

  const handleCsv = () => {
    setCsvBusy(true);
    try {
      const csv = exportToCSV(result);
      downloadCSV(csv, `${fileBase}_verbas.csv`);
      toast.success("CSV gerado.");
    } catch (e) {
      toast.error("Erro ao gerar CSV: " + (e as Error).message);
    } finally {
      setCsvBusy(false);
    }
  };

  // ─── PJC XML (Reverso) ───
  const [pjcBusy, setPjcBusy] = useState(false);
  const [pjcPreview, setPjcPreview] = useState<string | null>(null);

  const buildPjcPayload = () => buildPJCRealFromCase({
    result,
    params: params!,
    verbas,
    dadosProcesso: {
      numero_cnj: dadosProc.processo,
      reclamante_nome: dadosProc.cliente,
      reclamado_nome: dadosProc.reclamado,
    },
    ...pjcExtras,
  });

  const handlePjcDownload = () => {
    if (!params) { toast.error("Parâmetros do caso ausentes."); return; }
    setPjcBusy(true);
    try {
      const payload = buildPjcPayload();
      const processoId = dadosProc.processo?.replace(/\D/g, '') || 'CALCULO';
      const reclamante = (dadosProc.cliente || 'RECLAMANTE').toUpperCase().replace(/\s+/g, '_');
      const nome = `PROCESSO_${processoId}_${reclamante}.PJC`;
      downloadPJCXml(payload, nome);
      toast.success("Arquivo .PJC gerado — formato nativo PJe-Calc.");
    } catch (e) {
      toast.error("Erro ao gerar .PJC: " + (e as Error).message);
    } finally {
      setPjcBusy(false);
    }
  };

  const handlePjcPreview = () => {
    if (!params) { toast.error("Parâmetros do caso ausentes."); return; }
    try {
      const payload = buildPjcPayload();
      const xml = exportPJCXml(payload);
      setPjcPreview(xml.slice(0, 5000));
    } catch (e) {
      toast.error("Erro ao visualizar: " + (e as Error).message);
    }
  };

  // ─── Render ───
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Exportação do Cálculo
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Três formatos disponíveis. Escolha a aba correspondente ao caso de uso.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pdf">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pdf" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF (Memória)
            </TabsTrigger>
            <TabsTrigger value="excel" className="text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel / CSV
            </TabsTrigger>
            <TabsTrigger value="pjc" className="text-xs">
              <FileCode2 className="h-3.5 w-3.5 mr-1.5" /> .PJC (XML)
            </TabsTrigger>
          </TabsList>

          {/* ═══ PDF ═══ */}
          <TabsContent value="pdf" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs font-semibold">Tipo de documento</Label>
              <RadioGroup value={pdfMode} onValueChange={v => setPdfMode(v as typeof pdfMode)} className="mt-2 space-y-2">
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="memoria" id="pdf-mem" className="mt-0.5" />
                  <Label htmlFor="pdf-mem" className="text-xs cursor-pointer leading-snug">
                    <span className="font-semibold">Memória de Cálculo Completa</span>
                    <br />
                    <span className="text-muted-foreground">
                      Relatório oficial para juntada em processo — identificação, resumo,
                      dados, critérios, todas as verbas com ocorrências, FGTS/INSS/IR
                      detalhados, totais consolidados. Múltiplas páginas.
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="resumo" id="pdf-res" className="mt-0.5" />
                  <Label htmlFor="pdf-res" className="text-xs cursor-pointer leading-snug">
                    <span className="font-semibold">Resumo Executivo</span>
                    <br />
                    <span className="text-muted-foreground">
                      1 página — identificação, resumo monetário, totais. Indicado para
                      envio ao cliente ou apresentações.
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handlePdfPrint} disabled={!!pdfBusy}>
                {pdfBusy === 'print' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Printer className="h-4 w-4 mr-1" />}
                Imprimir / Salvar como PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handlePdfDownload} disabled={!!pdfBusy}>
                {pdfBusy === 'download' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Baixar HTML
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                "Imprimir" abre a janela de impressão do navegador — escolha "Salvar como PDF"
                para gerar o arquivo final. "Baixar HTML" salva o documento em arquivo local que
                pode ser aberto depois e impresso com Ctrl+P.
              </span>
            </div>
          </TabsContent>

          {/* ═══ Excel / CSV ═══ */}
          <TabsContent value="excel" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs font-semibold">Abas a incluir no XLSX</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(SHEET_LABELS) as (keyof ExcelSheetSelection)[]).map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`sheet-${key}`}
                      checked={sheets[key]}
                      onCheckedChange={() => toggleSheet(key)}
                    />
                    <Label htmlFor={`sheet-${key}`} className="text-xs cursor-pointer">
                      {SHEET_LABELS[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleXlsx} disabled={xlsxBusy || selectedCount === 0}>
                {xlsxBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Exportar XLSX ({selectedCount})
              </Button>
              <Button size="sm" variant="outline" onClick={handleCsv} disabled={csvBusy}>
                {csvBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                Exportar CSV Simples
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                XLSX (Office Open XML nativo) abre no Excel/LibreOffice com múltiplas abas.
                CSV simples usa `;` como delimitador e formato pt-BR (vírgula decimal) —
                ideal para importar em outras ferramentas.
              </span>
            </div>
          </TabsContent>

          {/* ═══ PJC XML ═══ */}
          <TabsContent value="pjc" className="space-y-4 mt-4">
            <div className="p-3 border border-primary/30 rounded bg-primary/5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                <FileCode2 className="h-3.5 w-3.5" /> Formato Nativo PJe-Calc
              </div>
              <p className="text-muted-foreground leading-snug">
                Gera um arquivo `.PJC` no formato XML oficial do PJe-Calc Cidadão
                (TRT-8). Esse arquivo pode ser reimportado no PJe-Calc oficial,
                em outras ferramentas compatíveis, ou anexado ao processo como
                ground truth auditável.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Conteúdo incluído no export</Label>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                <li>Processo, partes e datas</li>
                <li>{verbas.length} verba{verbas.length !== 1 ? 's' : ''} (principais + reflexos)</li>
                <li>
                  {(pjcExtras?.historicos?.length ?? 0)} histórico{(pjcExtras?.historicos?.length ?? 0) !== 1 ? 's' : ''} salarial
                  {(pjcExtras?.historicos?.length ?? 0) !== 1 ? 'is' : ''} com ocorrências
                </li>
                <li>{(pjcExtras?.faltas?.length ?? 0)} falta(s) / afastamento(s)</li>
                <li>{(pjcExtras?.ferias?.length ?? 0)} período(s) de férias</li>
                <li>Configuração de atualização, FGTS, CS, IR</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handlePjcDownload} disabled={pjcBusy || !params}>
                {pjcBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Baixar .PJC
              </Button>
              <Button size="sm" variant="outline" onClick={handlePjcPreview} disabled={!params}>
                <Eye className="h-4 w-4 mr-1" /> Visualizar XML
              </Button>
            </div>

            {pjcPreview && (
              <Card className="bg-muted/20 border-dashed">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      Preview (primeiros 5.000 caracteres)
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setPjcPreview(null)}>Fechar</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-[10px] font-mono p-2 bg-background rounded max-h-64 overflow-auto border border-border/50 whitespace-pre-wrap break-all">
                    {pjcPreview}
                  </pre>
                </CardContent>
              </Card>
            )}

            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                O arquivo gerado segue a estrutura esperada pelo PJe-Calc Cidadão v2.15+.
                Valores corrigidos e taxas de juros são preservados para reprodução exata
                em outras ferramentas. Se houver divergência ao reimportar, confira se
                as séries de índice (IPCA-E, SELIC) estão atualizadas no ambiente destino.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
