/**
 * Comparador de Paridade MRDcalc × PJe-Calc
 * Enhanced: Uses Golden Snapshot as ground truth and compares against live engine results
 */

import React, { useState, useMemo } from 'react';
import type { PJCAnalysis } from '@/lib/pjecalc/pjc-analyzer';
import type { PjeLiquidacaoResult, PjeVerbaResult } from '@/lib/pjecalc/engine-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, ArrowUpDown, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ═══ Types ═══

interface VerbaComparison {
  nome: string;
  tipo: string;
  pjecalc_corrigido: number;
  pjecalc_juros: number;
  pjecalc_total: number;
  mrdcalc_corrigido: number;
  mrdcalc_juros: number;
  mrdcalc_total: number;
  delta_corrigido: number;
  delta_juros: number;
  delta_total: number;
  pct_total: number;
  causa_provavel: string;
  status: 'ok' | 'warning' | 'error' | 'pending';
}

export interface ParityData {
  verbas: VerbaComparison[];
  totals: {
    pjecalc_liquido: number;
    pjecalc_inss_reclamante: number;
    pjecalc_inss_reclamado: number;
    pjecalc_ir: number;
    pjecalc_honorarios: number;
    pjecalc_bruto: number;
    pjecalc_total_reclamado: number;
    mrdcalc_liquido: number | null;
    mrdcalc_inss_reclamante: number | null;
    mrdcalc_bruto: number | null;
    mrdcalc_total_reclamado: number | null;
  };
  rootCauses: string[];
}

interface ComparadorParidadeProps {
  parityData: ParityData | null;
  loading?: boolean;
}

// ═══ Helpers ═══

function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function deltaColor(delta: number): string {
  if (Math.abs(delta) <= 0.01) return 'text-green-600 dark:text-green-400';
  if (Math.abs(delta) <= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function statusIcon(status: string) {
  switch (status) {
    case 'ok': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Badge variant="outline" className="text-xs">○</Badge>;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; label: string }> = {
    ok: { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: '✓ Paridade' },
    warning: { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: '⚠ Divergência' },
    error: { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: '✗ Erro' },
    pending: { bg: 'bg-muted text-muted-foreground', label: '○ Pendente' },
  };
  const { bg, label } = map[status] || map.pending;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{label}</span>;
}

// ═══ Component ═══

export function ComparadorParidade({ parityData, loading }: ComparadorParidadeProps) {
  const [sortBy, setSortBy] = useState<'nome' | 'divergencia'>('divergencia');
  const [showRootCauses, setShowRootCauses] = useState(true);

  const sortedVerbas = useMemo(() => {
    if (!parityData) return [];
    const list = [...parityData.verbas];
    if (sortBy === 'divergencia') {
      list.sort((a, b) => Math.abs(b.delta_total) - Math.abs(a.delta_total));
    } else {
      list.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return list;
  }, [parityData, sortBy]);

  const stats = useMemo(() => {
    if (!parityData) return { ok: 0, warning: 0, error: 0, pending: 0, total: 0, parityPct: 0 };
    const ok = parityData.verbas.filter(v => v.status === 'ok').length;
    const warning = parityData.verbas.filter(v => v.status === 'warning').length;
    const error = parityData.verbas.filter(v => v.status === 'error').length;
    const pending = parityData.verbas.filter(v => v.status === 'pending').length;
    const total = parityData.verbas.length;
    const parityPct = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { ok, warning, error, pending, total, parityPct };
  }, [parityData]);

  if (loading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando dados de paridade...</CardContent></Card>;
  }

  if (!parityData) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium mb-2">Comparador de Paridade</p>
        <p className="text-sm">Execute a liquidação para comparar com o PJe-Calc (Ground Truth).</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
          <p className="text-xs text-muted-foreground">Paridade OK</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
          <p className="text-xs text-muted-foreground">Divergências</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.error}</p>
          <p className="text-xs text-muted-foreground">Erros</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.parityPct}%</p>
          <Progress value={stats.parityPct} className="mt-1 h-2" />
          <p className="text-xs text-muted-foreground mt-1">Índice de Paridade</p>
        </CardContent></Card>
      </div>

      {/* Totals Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" /> Fechamento — PJe-Calc × MRDcalc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Rubrica</p>
              {['Bruto Reclamante', 'INSS Segurado', 'IRPF', 'Líquido Reclamante', 'Honorários', 'CS Reclamado', 'Total Reclamado'].map(r => (
                <p key={r} className="text-sm py-1 border-b border-border/50">{r}</p>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 text-right">PJe-Calc</p>
              {[
                parityData.totals.pjecalc_bruto,
                parityData.totals.pjecalc_inss_reclamante,
                parityData.totals.pjecalc_ir,
                parityData.totals.pjecalc_liquido,
                parityData.totals.pjecalc_honorarios,
                parityData.totals.pjecalc_inss_reclamado,
                parityData.totals.pjecalc_total_reclamado,
              ].map((v, i) => (
                <p key={i} className="text-sm font-mono text-right py-1 border-b border-border/50">{formatBRL(v)}</p>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 text-right">MRDcalc</p>
              {[
                parityData.totals.mrdcalc_bruto,
                parityData.totals.mrdcalc_inss_reclamante,
                null, // IR not tracked separately yet
                parityData.totals.mrdcalc_liquido,
                null,
                null,
                parityData.totals.mrdcalc_total_reclamado,
              ].map((v, i) => {
                const pjeVal = [
                  parityData.totals.pjecalc_bruto,
                  parityData.totals.pjecalc_inss_reclamante,
                  parityData.totals.pjecalc_ir,
                  parityData.totals.pjecalc_liquido,
                  parityData.totals.pjecalc_honorarios,
                  parityData.totals.pjecalc_inss_reclamado,
                  parityData.totals.pjecalc_total_reclamado,
                ][i];
                const delta = v !== null && pjeVal !== null ? v - pjeVal : null;
                return (
                  <p key={i} className={`text-sm font-mono text-right py-1 border-b border-border/50 ${delta !== null ? deltaColor(delta) : ''}`}>
                    {formatBRL(v)}
                    {delta !== null && Math.abs(delta) > 0.01 && (
                      <span className="text-[10px] ml-1">
                        {delta > 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                        {formatBRL(delta)}
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root Causes */}
      {parityData.rootCauses.length > 0 && (
        <Collapsible open={showRootCauses} onOpenChange={setShowRootCauses}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Diagnóstico ({parityData.rootCauses.length} causas raiz)
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-1">
                  {parityData.rootCauses.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-yellow-500 font-bold">•</span> {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Per-Verba Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Verbas — Corrigido + Juros + Total</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSortBy(s => s === 'nome' ? 'divergencia' : 'nome')}>
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {sortBy === 'nome' ? 'Ordenar por Δ' : 'Ordenar A-Z'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Verba</TableHead>
                  <TableHead className="text-right">PJe Corr.</TableHead>
                  <TableHead className="text-right">MRD Corr.</TableHead>
                  <TableHead className="text-right">PJe Juros</TableHead>
                  <TableHead className="text-right">MRD Juros</TableHead>
                  <TableHead className="text-right">PJe Total</TableHead>
                  <TableHead className="text-right">MRD Total</TableHead>
                  <TableHead className="text-right">Δ Total</TableHead>
                  <TableHead>Causa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVerbas.map((v, i) => (
                  <TableRow key={i} className={v.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : v.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                    <TableCell>{statusIcon(v.status)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-xs">{v.nome}</span>
                      <Badge variant="outline" className="ml-1 text-[9px]">{v.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(v.pjecalc_corrigido)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${deltaColor(v.delta_corrigido)}`}>{formatBRL(v.mrdcalc_corrigido)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBRL(v.pjecalc_juros)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${deltaColor(v.delta_juros)}`}>{formatBRL(v.mrdcalc_juros)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{formatBRL(v.pjecalc_total)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${deltaColor(v.delta_total)}`}>{formatBRL(v.mrdcalc_total)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${deltaColor(v.delta_total)}`}>{formatBRL(v.delta_total)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-[150px] truncate">{v.causa_provavel || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ Builder functions ═══

/**
 * @deprecated Use buildParityData with live PJCAnalysis instead.
 * This function was removed in production cleanup.
 */
export function buildParityDataFromGolden(
  engineResult: PjeLiquidacaoResult | null,
): ParityData {
  // Golden snapshot removed — return empty parity data
  const snap = { rubricas: [] as any[], resumo: { bruto_devido_reclamante: 0, liquido_reclamante: 0, deducao_contribuicao_social: 0, contribuicao_social_salarios: 0, irpf_reclamante: 0, honorarios_liquidos: 0, total_reclamado: 0, fgts_total: 0 } };
  const verbas: VerbaComparison[] = [];

  const normalize = (s: string) => s.toUpperCase()
    .replace(/REPOUSO SEMANAL REMUNERADO E FERIADO/g, 'RSR')
    .replace(/RSR E FERIADO/g, 'RSR')
    .replace(/\(COMISSIONISTA\)/g, 'COMISSIONISTA')
    .replace(/ DA CLT/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pje of snap.rubricas) {
    const pjeNorm = normalize(pje.descricao);
    
    // Find matching MRDcalc verba
    let mrd: PjeVerbaResult | undefined;
    if (engineResult) {
      mrd = engineResult.verbas.find(v => {
        const mNorm = normalize(v.nome);
        return mNorm === pjeNorm || mNorm.includes(pjeNorm) || pjeNorm.includes(mNorm);
      });
    }

    const mrdCorr = mrd?.total_corrigido ?? 0;
    const mrdJuros = mrd?.total_juros ?? 0;
    const mrdTotal = mrd?.total_final ?? 0;
    const hasMrd = !!mrd;

    const deltaCorr = mrdCorr - pje.valor_corrigido;
    const deltaJuros = mrdJuros - pje.juros;
    const deltaTotal = mrdTotal - pje.total;

    let status: VerbaComparison['status'] = 'pending';
    if (hasMrd) {
      if (Math.abs(deltaTotal) <= 0.05) status = 'ok';
      else if (Math.abs(deltaTotal) <= 10) status = 'warning';
      else status = 'error';
    }

    let causa = '';
    if (!hasMrd) {
      causa = 'Rubrica ausente no MRDcalc';
    } else {
      const pctCorr = pje.valor_corrigido > 0 ? (deltaCorr / pje.valor_corrigido) * 100 : 0;
      const pctJuros = pje.juros > 0 ? (deltaJuros / pje.juros) * 100 : 0;
      if (Math.abs(pctCorr) > 5 && Math.abs(pctJuros) > 20) causa = 'Índice e juros incorretos (fallback)';
      else if (Math.abs(pctCorr) > 5) causa = pctCorr < 0 ? 'Correção baixa (índice fallback)' : 'Correção alta';
      else if (Math.abs(pctJuros) > 20) causa = pctJuros > 0 ? 'Juros inflados (taxa fallback)' : 'Juros insuficientes';
      else if (Math.abs(deltaTotal) > 1) causa = 'Diferença nominal (base/qtd)';
    }

    verbas.push({
      nome: pje.descricao,
      tipo: pje.tipo,
      pjecalc_corrigido: pje.valor_corrigido,
      pjecalc_juros: pje.juros,
      pjecalc_total: pje.total,
      mrdcalc_corrigido: mrdCorr,
      mrdcalc_juros: mrdJuros,
      mrdcalc_total: mrdTotal,
      delta_corrigido: Number(deltaCorr.toFixed(2)),
      delta_juros: Number(deltaJuros.toFixed(2)),
      delta_total: Number(deltaTotal.toFixed(2)),
      pct_total: pje.total > 0 ? Number(((deltaTotal / pje.total) * 100).toFixed(2)) : 0,
      causa_provavel: causa,
      status,
    });
  }

  // Root causes analysis
  const rootCauses: string[] = [];
  const errCount = verbas.filter(v => v.status === 'error').length;
  if (errCount > 0) {
    const avgPctCorr = verbas.filter(v => v.status !== 'pending' && v.pjecalc_corrigido > 0)
      .reduce((s, v) => s + Math.abs(v.delta_corrigido / v.pjecalc_corrigido * 100), 0) / Math.max(verbas.length, 1);
    const avgPctJuros = verbas.filter(v => v.status !== 'pending' && v.pjecalc_juros > 0)
      .reduce((s, v) => s + Math.abs(v.delta_juros / v.pjecalc_juros * 100), 0) / Math.max(verbas.length, 1);
    
    if (avgPctCorr > 5) rootCauses.push(`Correção monetária desviando ~${avgPctCorr.toFixed(1)}% em média — verificar séries de índices no banco`);
    if (avgPctJuros > 15) rootCauses.push(`Juros desviando ~${avgPctJuros.toFixed(1)}% em média — verificar faixas TRD/SELIC/Taxa Legal`);
  }
  if (!engineResult) rootCauses.push('Motor não executado — execute a liquidação primeiro');
  else {
    const bruto = engineResult.resumo.principal_corrigido + engineResult.resumo.juros_mora + engineResult.resumo.fgts_total;
    if (engineResult.resumo.liquido_reclamante > bruto + 0.01) {
      rootCauses.push('BUG: Líquido > Bruto — erro de consolidação no fechamento');
    }
    if (engineResult.resumo.fgts_total === 0 && snap.resumo.fgts_total > 0) {
      rootCauses.push('FGTS não materializado no MRDcalc (PJe: ' + formatBRL(snap.resumo.fgts_total) + ')');
    }
    if (engineResult.resumo.cs_segurado === 0 && snap.resumo.deducao_contribuicao_social > 0) {
      rootCauses.push('CS segurado = R$ 0 no MRDcalc (PJe: ' + formatBRL(snap.resumo.deducao_contribuicao_social) + ')');
    }
  }

  return {
    verbas,
    totals: {
      pjecalc_bruto: snap.resumo.bruto_devido_reclamante,
      pjecalc_liquido: snap.resumo.liquido_reclamante,
      pjecalc_inss_reclamante: snap.resumo.deducao_contribuicao_social,
      pjecalc_inss_reclamado: snap.resumo.contribuicao_social_salarios,
      pjecalc_ir: snap.resumo.irpf_reclamante,
      pjecalc_honorarios: snap.resumo.honorarios_liquidos,
      pjecalc_total_reclamado: snap.resumo.total_reclamado,
      mrdcalc_bruto: engineResult ? (engineResult.resumo.principal_corrigido + engineResult.resumo.juros_mora + engineResult.resumo.fgts_total) : null,
      mrdcalc_liquido: engineResult?.resumo.liquido_reclamante ?? null,
      mrdcalc_inss_reclamante: engineResult?.resumo.cs_segurado ?? null,
      mrdcalc_total_reclamado: engineResult?.resumo.total_reclamada ?? null,
    },
    rootCauses,
  };
}

/**
 * Legacy builder from PJCAnalysis
 */
export function buildParityData(
  pjcAnalysis: PJCAnalysis,
  mrdResults?: Map<string, number>,
): ParityData {
  const verbas: VerbaComparison[] = pjcAnalysis.verbas.map(v => {
    const mrdDif = mrdResults?.get(v.nome) ?? null;
    const pjcDif = v.total_diferenca ?? 0;
    const divAbs = mrdDif !== null ? mrdDif - pjcDif : 0;

    let status: 'ok' | 'warning' | 'error' | 'pending' = 'pending';
    if (mrdDif !== null) {
      if (Math.abs(divAbs) <= 0.01) status = 'ok';
      else if (Math.abs(divAbs) <= 1.0) status = 'warning';
      else status = 'error';
    }

    return {
      nome: v.nome,
      tipo: v.tipo,
      pjecalc_corrigido: 0,
      pjecalc_juros: 0,
      pjecalc_total: pjcDif,
      mrdcalc_corrigido: 0,
      mrdcalc_juros: 0,
      mrdcalc_total: mrdDif ?? 0,
      delta_corrigido: 0,
      delta_juros: 0,
      delta_total: divAbs,
      pct_total: pjcDif !== 0 && mrdDif !== null ? ((mrdDif - pjcDif) / Math.abs(pjcDif)) * 100 : 0,
      causa_provavel: mrdDif === null ? 'Motor não executado' : (Math.abs(divAbs) <= 0.01 ? '' : 'Verificar parâmetros'),
      status,
    };
  });

  return {
    verbas,
    totals: {
      pjecalc_bruto: 0,
      pjecalc_liquido: pjcAnalysis.resultado.liquido_exequente,
      pjecalc_inss_reclamante: pjcAnalysis.resultado.inss_reclamante,
      pjecalc_inss_reclamado: pjcAnalysis.resultado.inss_reclamado,
      pjecalc_ir: pjcAnalysis.resultado.imposto_renda,
      pjecalc_honorarios: pjcAnalysis.resultado.honorarios.reduce((s, h) => s + h.valor, 0),
      pjecalc_total_reclamado: 0,
      mrdcalc_bruto: null,
      mrdcalc_liquido: null,
      mrdcalc_inss_reclamante: null,
      mrdcalc_total_reclamado: null,
    },
    rootCauses: [],
  };
}
