/**
 * ExperimentalBanner — banner amarelo de "este módulo não impacta o
 * cálculo final ainda" para módulos que persistem dados mas o engine V3
 * ignora (fake frontend documentado em AUDIT #1).
 *
 * Lista de módulos com este banner (2026-05-12):
 *   - ModuloExcecoesCarga (carga horária reduzida)
 *   - ModuloExcecoesSabado (sábado não-útil)
 *   - ModuloSeguroDesemprego (faixas progressivas Lei 7.998/90)
 *   - ModuloSalarioFamilia (tabela de cotas históricas)
 *
 * Removê-lo de um módulo é uma decisão de produto: significa que o
 * código do engine V3 que consome aquele config foi escrito e está
 * testado.
 */
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  /** O que NÃO funciona ainda. */
  detalhe: string;
  /** Mensagem complementar (opcional). */
  workaround?: string;
}

export function ExperimentalBanner({ detalhe, workaround }: Props) {
  return (
    <Card className="border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/30">
      <CardContent className="p-3 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-amber-900 dark:text-amber-200">
            Módulo experimental — não impacta o cálculo final ainda
          </div>
          <div className="text-amber-800 dark:text-amber-200/90">{detalhe}</div>
          {workaround && (
            <div className="text-amber-700/80 dark:text-amber-300/70 italic">
              {workaround}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
