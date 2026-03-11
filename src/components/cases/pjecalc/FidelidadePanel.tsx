/**
 * Fidelity & Parity Report Panel
 * Displays import fidelity warnings and parity comparison with PJe-Calc ground truth.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle, CheckCircle2, XCircle, Info,
  Shield, BarChart3, FileWarning,
} from "lucide-react";
import type { FidelityReport, FidelityEntry, FidelitySeverity } from "@/lib/pjecalc/domain/fidelity-report";
import type { ParityReport } from "@/lib/pjecalc/domain/fidelity-report";

interface Props {
  fidelityReport?: FidelityReport;
  parityReport?: ParityReport;
}

const severityIcon = {
  info: <Info className="h-4 w-4 text-muted-foreground" />,
  warning: <AlertTriangle className="h-4 w-4 text-accent-foreground" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  critical: <XCircle className="h-4 w-4 text-destructive" />,
};

const severityBadge = (s: FidelitySeverity) => {
  const variants: Record<FidelitySeverity, string> = {
    info: 'bg-muted text-muted-foreground',
    warning: 'bg-accent text-accent-foreground border-border',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
    critical: 'bg-destructive/20 text-destructive border-destructive/50',
  };
  return <Badge variant="outline" className={variants[s]}>{s.toUpperCase()}</Badge>;
};

function fmtR$(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FidelidadePanel({ fidelityReport, parityReport }: Props) {
  if (!fidelityReport && !parityReport) return null;

  return (
    <div className="space-y-4">
      {/* Fidelity Report */}
      {fidelityReport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Relatório de Fidelidade da Importação
              {fidelityReport.calculation_blocked ? (
                <Badge variant="destructive">BLOQUEADO</Badge>
              ) : fidelityReport.synthetic_fallbacks_used ? (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">FALLBACK</Badge>
              ) : (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">OK</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary badges */}
            <div className="flex gap-3 mb-4">
              {Object.entries(fidelityReport.by_severity).map(([sev, count]) => (
                count > 0 && (
                  <div key={sev} className="flex items-center gap-1 text-sm">
                    {severityIcon[sev as FidelitySeverity]}
                    <span>{count} {sev}</span>
                  </div>
                )
              ))}
            </div>

            {/* Blocking reasons */}
            {fidelityReport.blocking_reasons.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Cálculo bloqueado</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-1">
                    {fidelityReport.blocking_reasons.map((r, i) => (
                      <li key={i} className="text-sm">{r}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Entries accordion */}
            {fidelityReport.entries.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="entries">
                  <AccordionTrigger className="text-sm">
                    {fidelityReport.total_entries} registro(s) de fidelidade
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {fidelityReport.entries.map((entry, i) => (
                        <FidelityEntryRow key={i} entry={entry} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parity Report */}
      {parityReport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Paridade com PJe-Calc
              <Badge variant="outline" className={
                parityReport.score >= 95 ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                parityReport.score >= 80 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                'bg-destructive/10 text-destructive border-destructive/30'
              }>
                Score: {parityReport.score}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Totals table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead className="text-right">Motor</TableHead>
                  <TableHead className="text-right">PJe-Calc</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(parityReport.totais).map(([campo, vals]) => {
                  const ok = Math.abs(vals.delta_pct) <= 0.5;
                  return (
                    <TableRow key={campo}>
                      <TableCell className="font-mono text-xs">{campo}</TableCell>
                      <TableCell className="text-right text-sm">{fmtR$(vals.engine)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtR$(vals.pjc)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{fmtR$(vals.delta)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{vals.delta_pct.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">
                        {ok ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Divergências */}
            {parityReport.divergencias.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {parityReport.divergencias.length} divergência(s) por competência
                </h4>
                <div className="max-h-48 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comp.</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead className="text-right">Motor</TableHead>
                        <TableHead className="text-right">PJC</TableHead>
                        <TableHead className="text-right">Δ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parityReport.divergencias.slice(0, 20).map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{d.competencia.slice(0, 7)}</TableCell>
                          <TableCell className="text-xs">{d.campo}</TableCell>
                          <TableCell className="text-right text-xs">{fmtR$(d.valor_engine)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtR$(d.valor_pjc)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmtR$(d.diferenca_absoluta)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Tolerance policy */}
            <div className="mt-4 p-3 rounded bg-muted/50 text-xs text-muted-foreground flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <strong>Política de tolerância:</strong> Δ ≤ R$ {parityReport.tolerancia.monetaria_absoluta.toFixed(2)} e ≤ {parityReport.tolerancia.percentual_maximo}%.
                <br />{parityReport.tolerancia.justificativa}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FidelityEntryRow({ entry }: { entry: FidelityEntry }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded border bg-card">
      {severityIcon[entry.severity]}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-xs text-muted-foreground">{entry.code}</span>
          {severityBadge(entry.severity)}
          <span className="text-xs text-muted-foreground">{entry.module}</span>
        </div>
        <p className="text-sm">{entry.message_friendly}</p>
        {entry.action && (
          <p className="text-xs text-muted-foreground mt-1">→ {entry.action}</p>
        )}
      </div>
    </div>
  );
}
