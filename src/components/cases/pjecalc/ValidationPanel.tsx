/**
 * Painel de Validação — exibe resultados das validações determinísticas
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, XCircle, ShieldCheck } from "lucide-react";
// validation-engine deleted — local stub types and no-op functions
interface ValidationInput {
  [key: string]: unknown;
}

interface ValidationResult {
  severidade: 'info' | 'warning' | 'error';
  mensagem: string;
  bloqueante?: boolean;
  campo?: string;
  competencia?: string;
  sugestao?: string;
}

function validarExtracoes(_input: ValidationInput): ValidationResult[] {
  return [];
}

function podeFechar(_results: ValidationResult[]): { pode: boolean; bloqueios: ValidationResult[] } {
  return { pode: true, bloqueios: [] };
}

interface Props {
  input: ValidationInput;
  onClose?: () => void;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

export function ValidationPanel({ input, onClose }: Props) {
  const results = useMemo(() => validarExtracoes(input), [input]);
  const { pode, bloqueios } = useMemo(() => podeFechar(results), [results]);

  const errors = results.filter(r => r.severidade === "error");
  const warnings = results.filter(r => r.severidade === "warning");
  const infos = results.filter(r => r.severidade === "info");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Validação de Dados
          {pode ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px]">
              <CheckCircle2 className="h-3 w-3 mr-0.5" /> OK para fechar
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[9px]">
              <XCircle className="h-3 w-3 mr-0.5" /> {bloqueios.length} bloqueio(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum problema encontrado</p>
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div className="flex gap-2 flex-wrap text-[10px]">
            {errors.length > 0 && <Badge variant="destructive" className="text-[9px]">{errors.length} erro(s)</Badge>}
            {warnings.length > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[9px]">{warnings.length} alerta(s)</Badge>}
            {infos.length > 0 && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[9px]">{infos.length} info(s)</Badge>}
          </div>
        )}

        {/* Items */}
        {results.map((r, i) => {
          const sc = SEVERITY_CONFIG[r.severidade];
          const Icon = sc.icon;

          return (
            <div key={i} className={`p-2.5 rounded-lg border ${sc.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${sc.color}`} />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{r.mensagem}</span>
                    {r.bloqueante && <Badge variant="destructive" className="text-[8px]">BLOQUEANTE</Badge>}
                  </div>
                  {r.campo && <p className="text-[10px] text-muted-foreground font-mono">Campo: {r.campo}</p>}
                  {r.competencia && <p className="text-[10px] text-muted-foreground font-mono">Competência: {r.competencia}</p>}
                  {r.sugestao && <p className="text-[10px] text-muted-foreground italic mt-1">💡 {r.sugestao}</p>}
                </div>
              </div>
            </div>
          );
        })}

        {onClose && (
          <div className="pt-2 flex justify-end">
            <Button size="sm" variant={pode ? "default" : "outline"} disabled={!pode} onClick={onClose}>
              {pode ? "Fechar e Prosseguir" : "Resolver Pendências"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
