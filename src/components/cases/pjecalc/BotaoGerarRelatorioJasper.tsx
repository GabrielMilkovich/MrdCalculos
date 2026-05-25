import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileBarChart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { PjeLiquidacaoResult } from "@/lib/pjecalc/engine-types";
import type { DadosProcesso } from "@/lib/pjecalc/pdf/types";
import { renderPdfViaJasper } from "@/lib/pjecalc/pdf/jasper-client";
import { mapToConsolidado } from "@/lib/pjecalc/pdf/jasper-mapper";

interface Props {
  result: PjeLiquidacaoResult;
  dadosProcesso: DadosProcesso;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function BotaoGerarRelatorioJasper({
  result,
  dadosProcesso,
  variant = "default",
  size = "sm",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleGerar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const opts = mapToConsolidado(result, dadosProcesso);
      const blob = await renderPdfViaJasper(opts);

      const url = URL.createObjectURL(blob);
      const processo = dadosProcesso.processo?.replace(/[^0-9.-]/g, "") || "relatorio";
      const a = document.createElement("a");
      a.href = url;
      a.download = `MRD_Calc_Relatorio_${processo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório PDF gerado com sucesso.");
    } catch (err) {
      logger.error("Jasper render error", { error: String(err) });
      toast.error("Erro ao gerar relatório. Verifique se o serviço Jasper está configurado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading}
      onClick={handleGerar}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <FileBarChart className="h-4 w-4 mr-1" />
      )}
      Gerar Relatório
    </Button>
  );
}
