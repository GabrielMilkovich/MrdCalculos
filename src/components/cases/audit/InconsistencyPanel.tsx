/**
 * =====================================================
 * INCONSISTENCY PANEL — Painel de Inconsistências
 * =====================================================
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { InconsistencyFlag } from '@/domain/types';

interface InconsistencyPanelProps {
  flags: InconsistencyFlag[];
  onResolve?: (id: string) => void;
}

const severityConfig = {
  bloqueante: { icon: AlertCircle, color: 'text-destructive', badge: 'destructive' as const },
  alerta: { icon: AlertTriangle, color: 'text-yellow-500', badge: 'secondary' as const },
  informativa: { icon: Info, color: 'text-blue-500', badge: 'outline' as const },
};

const categoryLabels: Record<string, string> = {
  documento_faltante: 'Documento Faltante',
  conflito_titulo: 'Conflito no Título',
  rubrica_sem_classificacao: 'Rubrica sem Classificação',
  base_ambigua: 'Base Ambígua',
  periodo_lacuna: 'Lacuna de Período',
  divergencia_pjc: 'Divergência PJC',
  hipotese_pendente: 'Hipótese Pendente',
  salario_ausente: 'Salário Ausente',
  jornada_invalida: 'Jornada Inválida',
  reflexo_inconsistente: 'Reflexo Inconsistente',
};

export function InconsistencyPanel({ flags, onResolve }: InconsistencyPanelProps) {
  const bloqueantes = flags.filter(f => f.severidade === 'bloqueante' && !f.resolvido);
  const alertas = flags.filter(f => f.severidade === 'alerta' && !f.resolvido);
  const resolvidos = flags.filter(f => f.resolvido);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
            <div className="text-2xl font-bold">{bloqueantes.length}</div>
            <div className="text-xs text-muted-foreground">Bloqueantes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{alertas.length}</div>
            <div className="text-xs text-muted-foreground">Alertas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{resolvidos.length}</div>
            <div className="text-xs text-muted-foreground">Resolvidos</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inconsistências Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Rubrica</TableHead>
                <TableHead className="max-w-[300px]">Descrição</TableHead>
                <TableHead>Sugestão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags
                .filter(f => !f.resolvido)
                .sort((a, b) => {
                  const order = { bloqueante: 0, alerta: 1, informativa: 2 };
                  return (order[a.severidade] ?? 2) - (order[b.severidade] ?? 2);
                })
                .map(flag => {
                  const config = severityConfig[flag.severidade];
                  const Icon = config.icon;
                  return (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.badge}>
                          {categoryLabels[flag.categoria] || flag.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{flag.competencia || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{flag.rubric_code || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{flag.descricao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{flag.sugestao || '—'}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {flags.filter(f => !f.resolvido).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma inconsistência pendente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
