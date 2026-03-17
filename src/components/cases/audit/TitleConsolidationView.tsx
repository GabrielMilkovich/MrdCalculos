/**
 * =====================================================
 * TITLE CONSOLIDATION VIEW — Título Executivo Consolidado
 * =====================================================
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { ResolvedTitleState, ResolvedJudicialRule } from '@/domain/judicial-title-resolver';

interface TitleConsolidationViewProps {
  title: ResolvedTitleState;
}

const tipoLabels: Record<string, string> = {
  deferimento: 'Deferido',
  indeferimento: 'Indeferido',
  parametro: 'Parâmetro',
  reflexo: 'Reflexo',
  abatimento: 'Abatimento',
  base: 'Base de Cálculo',
  periodo: 'Período',
  formula: 'Fórmula',
};

const sourceLabels: Record<string, string> = {
  sentenca: 'Sentença',
  acordao: 'Acórdão',
  embargos_declaracao: 'Embargos de Declaração',
  retificacao: 'Retificação',
  decisao_parcial: 'Decisão Parcial',
};

export function TitleConsolidationView({ title }: TitleConsolidationViewProps) {
  const allRubricEntries = Array.from(title.rules_by_rubric.entries());

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          {title.granted_rubrics.size} Deferidas
        </Badge>
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {title.denied_rubrics.size} Indeferidas
        </Badge>
        {title.conflicts.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {title.conflicts.length} Conflitos
          </Badge>
        )}
      </div>

      {/* Global rules */}
      {title.global_rules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" /> Regras Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RulesTable rules={title.global_rules} />
          </CardContent>
        </Card>
      )}

      {/* Per-rubric rules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Regras por Rubrica ({allRubricEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {allRubricEntries.map(([rubricCode, rules]) => (
              <div key={rubricCode} className="mb-4 border-b border-border pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={title.denied_rubrics.has(rubricCode) ? 'destructive' : 'default'}>
                    {rubricCode}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{rules.length} regra(s)</span>
                </div>
                <RulesTable rules={rules} />
              </div>
            ))}
            {allRubricEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma regra por rubrica.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Conflicts */}
      {title.conflicts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" /> Conflitos Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {title.conflicts.map((conflict, i) => (
                <div key={i} className="bg-muted/50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {conflict.rubric_code && <Badge variant="outline">{conflict.rubric_code}</Badge>}
                    <Badge variant="secondary">{conflict.resolution}</Badge>
                  </div>
                  <p className="text-xs">{conflict.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RulesTable({ rules }: { rules: ResolvedJudicialRule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Fonte</TableHead>
          <TableHead>Período</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Prioridade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r, i) => (
          <TableRow key={i}>
            <TableCell>
              <Badge variant={r.rule.tipo === 'indeferimento' ? 'destructive' : 'outline'}>
                {tipoLabels[r.rule.tipo] || r.rule.tipo}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {sourceLabels[r.rule.fonte] || r.rule.fonte}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {r.rule.periodo_inicio || '∞'} — {r.rule.periodo_fim || '∞'}
            </TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{r.rule.descricao}</TableCell>
            <TableCell className="text-right font-mono">{r.effective_priority}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
