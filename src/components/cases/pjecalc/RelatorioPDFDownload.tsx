/**
 * RelatorioPDFDownload - PDF Report Download Button Component
 *
 * Provides a button (or dropdown) to generate and download/print PDF reports
 * using the modular PDF report engine.
 *
 * Props:
 * - result: PjeLiquidacaoResult from the calculation engine
 * - params: PjeParametros (optional, for criteria section)
 * - dadosProcesso: DadosProcesso metadata from the case
 * - reportType: which report to generate
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileBarChart, Download, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { PjeLiquidacaoResult, PjeParametros } from "@/lib/pjecalc/engine-types";
import type { DadosProcesso } from "@/lib/pjecalc/pdf/types";
import {
  buildMemoriaDeCalculo,
  buildResumo,
  openAndPrint,
  downloadHTML,
  generateFilename,
} from "@/lib/pjecalc/pdf";

export type ReportType = 'memoria' | 'resumo';

interface RelatorioPDFDownloadProps {
  result: PjeLiquidacaoResult;
  params?: PjeParametros | null;
  dadosProcesso: DadosProcesso;
  /** Which report to generate. Default: 'memoria' */
  reportType?: ReportType;
  /** Show as a dropdown with multiple options */
  showDropdown?: boolean;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'default' | 'lg';
  /** Custom button label */
  label?: string;
  className?: string;
}

/**
 * Build HTML for the specified report type.
 */
function buildReport(
  type: ReportType,
  result: PjeLiquidacaoResult,
  params: PjeParametros | null | undefined,
  dadosProcesso: DadosProcesso
): string {
  switch (type) {
    case 'resumo':
      return buildResumo(result, params, dadosProcesso);
    case 'memoria':
    default:
      return buildMemoriaDeCalculo(result, params, dadosProcesso);
  }
}

function reportLabel(type: ReportType): string {
  switch (type) {
    case 'resumo': return 'Resumo';
    case 'memoria': return 'Memória de Cálculo';
    default: return 'Relatório';
  }
}

export function RelatorioPDFDownload({
  result,
  params,
  dadosProcesso,
  reportType = 'memoria',
  showDropdown = false,
  variant = 'default',
  size = 'sm',
  label,
  className,
}: RelatorioPDFDownloadProps) {
  const [loading, setLoading] = useState(false);

  const handlePrint = useCallback(async (type: ReportType) => {
    if (loading) return; // prevent double-click
    setLoading(true);
    try {
      const html = buildReport(type, result, params, dadosProcesso);
      openAndPrint(html);
    } catch (err) {
      logger.error('PDF generation error', { error: String(err) });
      toast.error('Erro ao gerar relatório PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [result, params, dadosProcesso, loading]);

  const handleDownload = useCallback(async (type: ReportType) => {
    if (loading) return;
    setLoading(true);
    try {
      const html = buildReport(type, result, params, dadosProcesso);
      const filename = generateFilename(
        reportLabel(type),
        dadosProcesso.processo,
        dadosProcesso.dataLiquidacao
      );
      downloadHTML(html, filename);
      toast.success('Relatório baixado com sucesso.');
    } catch (err) {
      logger.error('PDF download error', { error: String(err) });
      toast.error('Erro ao baixar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [result, params, dadosProcesso, loading]);

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={loading} className={className}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileBarChart className="h-4 w-4 mr-1" />}
            {label || 'Relatório PDF'}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handlePrint('memoria')}>
            <FileBarChart className="h-4 w-4 mr-2" /> Imprimir Memória de Cálculo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePrint('resumo')}>
            <FileBarChart className="h-4 w-4 mr-2" /> Imprimir Resumo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDownload('memoria')}>
            <Download className="h-4 w-4 mr-2" /> Baixar Memória de Cálculo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('resumo')}>
            <Download className="h-4 w-4 mr-2" /> Baixar Resumo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading}
      onClick={() => handlePrint(reportType)}
      className={className}
    >
      {loading
        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        : <FileBarChart className="h-4 w-4 mr-1" />
      }
      {label || `Baixar ${reportLabel(reportType)}`}
    </Button>
  );
}
