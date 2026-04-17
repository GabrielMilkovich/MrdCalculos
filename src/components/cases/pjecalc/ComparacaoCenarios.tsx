/**
 * Phase 4, Item 4: Comparação de Cenários lado a lado
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as svc from "@/lib/pjecalc/service";
import { GitCompareArrows, TrendingUp, TrendingDown, Equal } from "lucide-react";
import type { PjeLiquidacaoResult } from "@/lib/pjecalc/engine-types";

interface Props { caseId: string; }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b) * 100).toFixed(1) : '—';

export function ComparacaoCenarios({ caseId }: Props) {
  const { data: liquidacoes = [] } = useQuery({
    queryKey: ["pjecalc_liquidacoes_all", caseId],
    queryFn: () => svc.getLiquidacoes(caseId, 10),
  });

  if (liquidacoes.length < 2) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          <GitCompareArrows className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          Execute pelo menos 2 liquidações para comparar cenários.
          <br />
          <span className="text-[10px]">Altere parâmetros e liquide novamente para criar cenários alternativos.</span>
        </CardContent>
      </Card>
    );
  }

  const a = liquidacoes[0]; // mais recente
  const b = liquidacoes[1]; // anterior
  const resA = a?.resultado as unknown as PjeLiquidacaoResult | null;
  const resB = b?.resultado as unknown as PjeLiquidacaoResult | null;

  if (!resA || !resB) return null;

  const campos = [
    { label: 'Principal Bruto', a: resA.resumo.principal_bruto, b: resB.resumo.principal_bruto },
    { label: 'Correção Monetária', a: resA.resumo.principal_corrigido - resA.resumo.principal_bruto, b: resB.resumo.principal_corrigido - resB.resumo.principal_bruto },
    { label: 'Juros de Mora', a: resA.resumo.juros_mora, b: resB.resumo.juros_mora },
    { label: 'FGTS Total', a: resA.resumo.fgts_total, b: resB.resumo.fgts_total },
    { label: 'CS Segurado', a: resA.resumo.cs_segurado, b: resB.resumo.cs_segurado },
    { label: 'CS Empregador', a: resA.resumo.cs_empregador, b: resB.resumo.cs_empregador },
    { label: 'IRRF', a: resA.resumo.ir_retido, b: resB.resumo.ir_retido },
    { label: 'Líquido Reclamante', a: resA.resumo.liquido_reclamante, b: resB.resumo.liquido_reclamante },
    { label: 'Total Reclamada', a: resA.resumo.total_reclamada, b: resB.resumo.total_reclamada },
  ];

  const DiffIcon = ({ a: va, b: vb }: { a: number; b: number }) => {
    const diff = va - vb;
    if (Math.abs(diff) < 0.01) return <Equal className="h-3 w-3 text-muted-foreground" />;
    if (diff > 0) return <TrendingUp className="h-3 w-3 text-[hsl(var(--success))]" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <GitCompareArrows className="h-5 w-5 text-primary" />
        Comparação de Cenários
      </h2>

      <div className="flex gap-2 text-xs mb-2">
        <Badge variant="default">Cenário A (atual)</Badge>
        <span className="text-muted-foreground">
          {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="mx-2">vs</span>
        <Badge variant="secondary">Cenário B (anterior)</Badge>
        <span className="text-muted-foreground">
          {new Date(b.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2.5 text-left font-medium">Componente</th>
                <th className="p-2.5 text-right font-medium">Cenário A</th>
                <th className="p-2.5 text-right font-medium">Cenário B</th>
                <th className="p-2.5 text-right font-medium">Δ Diferença</th>
                <th className="p-2.5 text-right font-medium">Δ %</th>
                <th className="p-2.5 text-center font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {campos.map(c => {
                const diff = c.a - c.b;
                const isHighlight = c.label === 'Líquido Reclamante' || c.label === 'Total Reclamada';
                return (
                  <tr key={c.label} className={`border-b border-border/30 ${isHighlight ? 'font-bold bg-muted/20' : ''}`}>
                    <td className="p-2.5">{c.label}</td>
                    <td className="p-2.5 text-right font-mono">{fmt(c.a)}</td>
                    <td className="p-2.5 text-right font-mono">{fmt(c.b)}</td>
                    <td className={`p-2.5 text-right font-mono ${diff > 0 ? 'text-[hsl(var(--success))]' : diff < 0 ? 'text-destructive' : ''}`}>
                      {diff > 0 ? '+' : ''}{fmt(diff)}
                    </td>
                    <td className={`p-2.5 text-right font-mono ${diff > 0 ? 'text-[hsl(var(--success))]' : diff < 0 ? 'text-destructive' : ''}`}>
                      {pct(c.a, c.b)}%
                    </td>
                    <td className="p-2.5 text-center"><DiffIcon a={c.a} b={c.b} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Verbas comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Verbas — Diferenças</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-1.5 text-left">Verba</th>
                <th className="p-1.5 text-right">A (Final)</th>
                <th className="p-1.5 text-right">B (Final)</th>
                <th className="p-1.5 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {resA.verbas.map(va => {
                const vb = resB.verbas.find(v => v.nome === va.nome);
                const diff = va.total_final - (vb?.total_final || 0);
                if (Math.abs(diff) < 0.01 && vb) return null;
                return (
                  <tr key={va.verba_id} className="border-b border-border/10">
                    <td className="p-1.5">{va.nome}</td>
                    <td className="p-1.5 text-right font-mono">{fmt(va.total_final)}</td>
                    <td className="p-1.5 text-right font-mono">{vb ? fmt(vb.total_final) : '—'}</td>
                    <td className={`p-1.5 text-right font-mono font-medium ${diff > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                      {diff > 0 ? '+' : ''}{fmt(diff)}
                    </td>
                  </tr>
                );
              }).filter(Boolean)}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
