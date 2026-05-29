import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FichaFinanceiraParsed } from './ficha-financeira-types';

interface Props {
  validacao: FichaFinanceiraParsed['validacao'];
}

export function ValidationBanner({ validacao }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Fichas extraídas pelo pipeline V6 geométrico não trazem dados de
  // validação (comparação total extraído vs total impresso no PDF). Sem
  // esses dados não há banner a renderizar — degrada graciosamente em vez
  // de quebrar a tela (TypeError: Cannot destructure property 'resumo').
  if (!validacao) return null;

  const { resumo, competencias } = validacao;

  let variant: 'ok' | 'warn' | 'error';
  let icon: React.ReactNode;
  let message: string;

  if (validacao.ok && resumo.competencias_sem_total === 0) {
    variant = 'ok';
    icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
    message = `Validado (${resumo.competencias_ok} ${resumo.competencias_ok === 1 ? 'mês' : 'meses'} OK)`;
  } else if (validacao.ok && resumo.competencias_sem_total > 0) {
    variant = 'warn';
    icon = <AlertTriangle className="h-4 w-4 text-amber-600" />;
    message = `${resumo.competencias_ok} ${resumo.competencias_ok === 1 ? 'mês' : 'meses'} OK, ${resumo.competencias_sem_total} sem total no PDF`;
  } else {
    variant = 'error';
    icon = <XCircle className="h-4 w-4 text-red-600" />;
    message = `${resumo.competencias_fora} ${resumo.competencias_fora === 1 ? 'mês fora' : 'meses fora'} de tolerância (pior: ${resumo.pior_delta_pct.toFixed(1)}%)`;
  }

  const bgClass =
    variant === 'ok'
      ? 'bg-green-50 border-green-200'
      : variant === 'warn'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200';

  return (
    <div className={`rounded-md border p-3 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{message}</span>
        </div>
        {competencias.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {expanded ? 'Ocultar' : 'Detalhes'}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-3">Competência</th>
                <th className="py-1 pr-3 text-right">Extraído</th>
                <th className="py-1 pr-3 text-right">PDF</th>
                <th className="py-1 pr-3 text-right">Delta %</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {competencias.map((c) => (
                <tr key={c.competencia} className="border-b border-dashed">
                  <td className="py-1 pr-3 font-mono">{c.competencia}</td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.total_extraido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.total_pdf != null
                      ? c.total_pdf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono">
                    {c.status === 'total_pdf_ausente' ? '—' : `${c.delta_pct.toFixed(2)}%`}
                  </td>
                  <td className="py-1">
                    <Badge
                      variant={
                        c.status === 'ok'
                          ? 'secondary'
                          : c.status === 'total_pdf_ausente'
                            ? 'outline'
                            : 'destructive'
                      }
                      className="text-[10px]"
                    >
                      {c.status === 'ok'
                        ? 'OK'
                        : c.status === 'total_pdf_ausente'
                          ? 'Sem total'
                          : 'Fora'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
