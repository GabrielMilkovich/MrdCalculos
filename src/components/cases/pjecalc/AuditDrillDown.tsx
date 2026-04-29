/**
 * Audit Drill-Down Panel — Competência × Verba detail view
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PjeLiquidacaoResult, PjeVerbaResult, PjeOcorrenciaResult } from '@/lib/pjecalc/engine-types';

interface AuditDrillDownProps {
  result: PjeLiquidacaoResult | null;
}

export function AuditDrillDown({ result }: AuditDrillDownProps) {
  const [search, setSearch] = useState('');
  const [expandedVerbas, setExpandedVerbas] = useState<Set<string>>(new Set());

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum resultado de liquidação disponível. Execute o cálculo primeiro.
        </CardContent>
      </Card>
    );
  }

  const toggleVerba = (id: string) => {
    setExpandedVerbas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredVerbas = result.verbas.filter(v =>
    !search || v.nome.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="verbas">
        <TabsList>
          <TabsTrigger value="verbas">Por Verba</TabsTrigger>
          <TabsTrigger value="competencia">Por Competência</TabsTrigger>
          <TabsTrigger value="resumo">Resumo Geral</TabsTrigger>
        </TabsList>

        {/* ── TAB: POR VERBA ── */}
        <TabsContent value="verbas" className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar verbas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <span className="text-xs text-muted-foreground">{filteredVerbas.length} verbas</span>
          </div>

          {filteredVerbas.map(verba => (
            <VerbaCard
              key={verba.verba_id}
              verba={verba}
              expanded={expandedVerbas.has(verba.verba_id)}
              onToggle={() => toggleVerba(verba.verba_id)}
              fmt={fmt}
            />
          ))}
        </TabsContent>

        {/* ── TAB: POR COMPETÊNCIA ── */}
        <TabsContent value="competencia" className="space-y-3">
          <CompetenciaView result={result} fmt={fmt} />
        </TabsContent>

        {/* ── TAB: RESUMO ── */}
        <TabsContent value="resumo">
          <ResumoCard result={result} fmt={fmt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerbaCard({ verba, expanded, onToggle, fmt }: {
  verba: PjeVerbaResult;
  expanded: boolean;
  onToggle: () => void;
  fmt: (n: number) => string;
}) {
  const totalDiferenca = verba.ocorrencias.reduce((s, o) => s + o.diferenca, 0);
  const totalCorrigido = verba.ocorrencias.reduce((s, o) => s + o.valor_corrigido, 0);
  const totalJuros = verba.ocorrencias.reduce((s, o) => s + o.juros, 0);

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-sm font-medium">{verba.nome}</CardTitle>
                <Badge variant={verba.tipo === 'principal' ? 'default' : 'secondary'} className="text-xs">
                  {verba.tipo}
                </Badge>
                <span className="text-xs text-muted-foreground">{verba.ocorrencias.length} comp.</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span>Dif: <strong className="text-foreground">R$ {fmt(totalDiferenca)}</strong></span>
                <span>Corr: <strong className="text-foreground">R$ {fmt(totalCorrigido)}</strong></span>
                <span>Juros: <strong className="text-foreground">R$ {fmt(totalJuros)}</strong></span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Comp.</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">÷ Div</TableHead>
                  <TableHead className="text-right">× Mult</TableHead>
                  <TableHead className="text-right">× Qtd</TableHead>
                  <TableHead className="text-right">Devido</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">Corrigido</TableHead>
                  <TableHead className="text-right">Juros</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verba.ocorrencias.map((oc, i) => (
                  <OcorrenciaRow key={i} oc={oc} fmt={fmt} />
                ))}
              </TableBody>
            </Table>

            {/* Audit Trail */}
            {verba.ocorrencias[0]?.formula && (
              <div className="mt-3 p-2 bg-muted/30 rounded text-xs font-mono">
                <span className="text-muted-foreground">Fórmula: </span>
                {verba.ocorrencias[0].formula}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function OcorrenciaRow({ oc, fmt }: { oc: PjeOcorrenciaResult; fmt: (n: number) => string }) {
  const isZero = oc.diferenca === 0;
  return (
    <TableRow className={isZero ? 'opacity-50' : ''}>
      <TableCell className="font-mono text-xs">{oc.competencia}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.base)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.divisor)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.multiplicador)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.quantidade)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.devido)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.pago)}</TableCell>
      <TableCell className="text-right text-xs font-medium">{fmt(oc.diferenca)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.valor_corrigido)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(oc.juros)}</TableCell>
      <TableCell className="text-right text-xs font-bold">{fmt(oc.valor_final)}</TableCell>
    </TableRow>
  );
}

function CompetenciaView({ result, fmt }: { result: PjeLiquidacaoResult; fmt: (n: number) => string }) {
  // Build competência map
  const compMap = new Map<string, { verba: string; diferenca: number; corrigido: number; juros: number; final: number }[]>();

  for (const verba of result.verbas) {
    for (const oc of verba.ocorrencias) {
      if (!compMap.has(oc.competencia)) compMap.set(oc.competencia, []);
      compMap.get(oc.competencia)!.push({
        verba: verba.nome,
        diferenca: oc.diferenca,
        corrigido: oc.valor_corrigido,
        juros: oc.juros,
        final: oc.valor_final,
      });
    }
  }

  const sortedComps = Array.from(compMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-2">
      {sortedComps.map(([comp, items]) => {
        const totalDif = items.reduce((s, i) => s + i.diferenca, 0);
        const totalFinal = items.reduce((s, i) => s + i.final, 0);
        return (
          <Card key={comp}>
            <CardHeader className="py-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-mono">{comp}</CardTitle>
                <div className="flex gap-3 text-xs">
                  <span>Dif: <strong>R$ {fmt(totalDif)}</strong></span>
                  <span>Total: <strong>R$ {fmt(totalFinal)}</strong></span>
                  <Badge variant="outline" className="text-xs">{items.length} verbas</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableBody>
                  {items.filter(i => i.diferenca !== 0).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{item.verba}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(item.diferenca)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(item.corrigido)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(item.juros)}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{fmt(item.final)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ResumoCard({ result, fmt }: { result: PjeLiquidacaoResult; fmt: (n: number) => string }) {
  const r = result.resumo;
  const rows = [
    { label: 'Principal Bruto', value: r.principal_bruto },
    { label: 'Principal Corrigido', value: r.principal_corrigido },
    { label: 'Juros de Mora', value: r.juros_mora },
    { label: 'CS Segurado', value: r.cs_segurado, negative: true },
    { label: 'CS Empregador', value: r.cs_empregador },
    { label: 'IR Retido', value: r.ir_retido, negative: true },
    { label: 'FGTS Total', value: r.fgts_total },
    { label: 'Honorários', value: r.honorarios_sucumbenciais },
    { label: 'Custas', value: r.custas },
    { label: 'Líquido Reclamante', value: r.liquido_reclamante, highlight: true },
    { label: 'Total Reclamada', value: r.total_reclamada, highlight: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Resumo da Liquidação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label} className={row.highlight ? 'bg-muted/50 font-bold' : ''}>
                <TableCell>{row.label}</TableCell>
                <TableCell className={`text-right ${row.negative ? 'text-destructive' : ''}`}>
                  {row.negative ? '(-)' : ''} R$ {fmt(row.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Warnings */}
        {(result as Record<string, unknown>).warnings && (result as Record<string, unknown>).warnings.length > 0 && (
          <div className="mt-4 space-y-1">
            <h4 className="text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Alertas ({(result as Record<string, unknown>).warnings.length})
            </h4>
            {(result as Record<string, unknown>).warnings.map((w: any, i: number) => (
              <div key={i} className="text-xs text-muted-foreground p-1 bg-amber-50 dark:bg-amber-950/20 rounded">
                [{w.code}] {w.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
