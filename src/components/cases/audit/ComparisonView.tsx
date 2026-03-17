/**
 * =====================================================
 * COMPARISON VIEW — Comparação com PJe-Calc importado
 * =====================================================
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowDown, ArrowUp, Minus, GitCompare } from 'lucide-react';

export interface ComparisonRow {
  verba: string;
  competencia: string;
  valorMRD: number;
  valorPJC: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number;
  explicacao?: string;
}

interface ComparisonViewProps {
  rows: ComparisonRow[];
  totalMRD: number;
  totalPJC: number;
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ComparisonView({ rows, totalMRD, totalPJC }: ComparisonViewProps) {
  const deltaTotal = totalMRD - totalPJC;
  const deltaPct = totalPJC !== 0 ? (deltaTotal / totalPJC) * 100 : 0;
  const parityScore = Math.max(0, 100 - Math.abs(deltaPct));

  const sorted = [...rows].sort((a, b) => Math.abs(b.diferencaAbsoluta) - Math.abs(a.diferencaAbsoluta));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">MRDcalc</div>
            <div className="text-lg font-bold font-mono">{formatBRL(totalMRD)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">PJe-Calc</div>
            <div className="text-lg font-bold font-mono">{formatBRL(totalPJC)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Diferença</div>
            <div className={`text-lg font-bold font-mono ${deltaTotal > 0 ? 'text-green-600' : deltaTotal < 0 ? 'text-destructive' : ''}`}>
              {formatBRL(deltaTotal)} ({deltaPct.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Score de Paridade</div>
            <div className="text-lg font-bold">{parityScore.toFixed(1)}%</div>
            <Progress value={parityScore} className="mt-1 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompare className="h-4 w-4" /> Comparação por Verba/Competência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Verba</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead className="text-right">MRDcalc</TableHead>
                <TableHead className="text-right">PJe-Calc</TableHead>
                <TableHead className="text-right">Δ Absoluto</TableHead>
                <TableHead className="text-right">Δ %</TableHead>
                <TableHead>Explicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => {
                const DeltaIcon = row.diferencaAbsoluta > 0.01 
                  ? ArrowUp 
                  : row.diferencaAbsoluta < -0.01 
                    ? ArrowDown 
                    : Minus;
                const deltaColor = Math.abs(row.diferencaAbsoluta) < 0.02
                  ? 'text-green-600'
                  : Math.abs(row.diferencaPercentual) < 1
                    ? 'text-yellow-600'
                    : 'text-destructive';

                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{row.verba}</TableCell>
                    <TableCell className="font-mono text-xs">{row.competencia}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(row.valorMRD)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(row.valorPJC)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${deltaColor}`}>
                      <div className="flex items-center justify-end gap-1">
                        <DeltaIcon className="h-3 w-3" />
                        {formatBRL(Math.abs(row.diferencaAbsoluta))}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${deltaColor}`}>
                      {row.diferencaPercentual.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {row.explicacao || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Importe um cálculo PJe-Calc (.pjc) para comparar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
