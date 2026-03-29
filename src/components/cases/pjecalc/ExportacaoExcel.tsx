/**
 * ExportacaoExcel — Excel/CSV export UI component for PJe-Calc liquidation results.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import type { PjeLiquidacaoResult, PjeParametros } from "@/lib/pjecalc/engine-types";
import {
  exportToExcel,
  exportToCSV,
  downloadBlob,
  downloadCSV,
  DEFAULT_SHEETS,
  type ExcelSheetSelection,
} from "@/lib/pjecalc/excel-export";

interface Props {
  result: PjeLiquidacaoResult;
  params?: PjeParametros;
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

export function ExportacaoExcel({ result, params, processo }: Props) {
  const [sheets, setSheets] = useState<ExcelSheetSelection>({ ...DEFAULT_SHEETS });
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const toggleSheet = (key: keyof ExcelSheetSelection) => {
    setSheets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(sheets).filter(Boolean).length;
  const filePrefix = processo ? processo.replace(/[^0-9.-]/g, '') : 'pjecalc';

  const handleExportZip = async () => {
    if (selectedCount === 0) {
      toast.error("Selecione pelo menos uma planilha para exportar.");
      return;
    }
    setExportingZip(true);
    try {
      const blob = await exportToExcel(result, params, sheets);
      downloadBlob(blob, `${filePrefix}_planilhas.xlsx`);
      toast.success(`${selectedCount} planilha(s) exportada(s) com sucesso!`);
    } catch (e) {
      toast.error("Erro ao gerar exportação: " + (e as Error).message);
    } finally {
      setExportingZip(false);
    }
  };

  const handleExportCSV = () => {
    setExportingCsv(true);
    try {
      const csv = exportToCSV(result);
      downloadCSV(csv, `${filePrefix}_verbas.csv`);
      toast.success("CSV exportado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar CSV: " + (e as Error).message);
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportação para Excel / CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sheet selection */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Selecione as planilhas a incluir no arquivo XLSX:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

        {/* Export buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleExportZip} disabled={exportingZip || selectedCount === 0}>
            {exportingZip
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <Download className="h-4 w-4 mr-1" />
            }
            Exportar XLSX ({selectedCount} planilha{selectedCount !== 1 ? 's' : ''})
          </Button>

          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={exportingCsv}>
            {exportingCsv
              ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
              : <FileText className="h-4 w-4 mr-1" />
            }
            Exportar CSV Simples
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          XLSX é um arquivo Excel nativo com múltiplas abas.
          O CSV simples exporta todas as verbas em um único arquivo (delimitador ponto-e-vírgula, pt-BR).
        </p>
      </CardContent>
    </Card>
  );
}
