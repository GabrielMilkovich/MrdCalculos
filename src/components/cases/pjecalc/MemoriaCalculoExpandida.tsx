/**
 * Phase 4, Item 6: Memória de Cálculo Expandida e Explicável Linha a Linha
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, FileText, Scale } from "lucide-react";
import type { PjeLiquidacaoResult, PjeVerbaResult, PjeOcorrenciaResult } from "@/lib/pjecalc/engine-types";

interface Props {
  resultado: PjeLiquidacaoResult;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function MemoriaCalculoExpandida({ resultado }: Props) {
  const [expandedVerbas, setExpandedVerbas] = useState<Set<string>>(new Set());

  const toggleVerba = (id: string) => {
    setExpandedVerbas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedVerbas(new Set(resultado.verbas.map(v => v.verba_id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Memória de Cálculo Expandida
        </h2>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={expandAll}>
          Expandir Todas
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2 pr-3">
          {resultado.verbas.map(vr => {
            const isExpanded = expandedVerbas.has(vr.verba_id);

            return (
              <Card key={vr.verba_id} className="overflow-hidden">
                {/* Header */}
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => toggleVerba(vr.verba_id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Badge variant={vr.tipo === 'principal' ? 'default' : 'secondary'} className="text-[10px]">
                      {vr.tipo === 'principal' ? 'P' : 'R'}
                    </Badge>
                    <span className="text-sm font-medium">{vr.nome}</span>
                    <Badge variant="outline" className="text-[10px]">{vr.caracteristica}</Badge>
                    {(() => {
                      const hasOverpay = vr.ocorrencias.some(oc => oc.pago > oc.devido);
                      const naiveDif = vr.ocorrencias.reduce((s, oc) => s + Math.max(0, oc.devido - oc.pago), 0);
                      const oj415Applied = hasOverpay && Math.abs(naiveDif - vr.total_diferenca) > 0.01;
                      return oj415Applied ? (
                        <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600">OJ 415 — Abatimento Global</Badge>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-muted-foreground">Dif: {fmt(vr.total_diferenca)}</span>
                    <span className="text-muted-foreground">Corr: {fmt(vr.total_corrigido)}</span>
                    <span className="font-bold">{fmt(vr.total_final)}</span>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="p-1.5 text-left font-medium">Competência</th>
                            <th className="p-1.5 text-right font-medium">Base</th>
                            <th className="p-1.5 text-right font-medium">÷ Divisor</th>
                            <th className="p-1.5 text-right font-medium">× Mult.</th>
                            <th className="p-1.5 text-right font-medium">Qtd.</th>
                            <th className="p-1.5 text-right font-medium">Dobra</th>
                            <th className="p-1.5 text-right font-medium">Devido</th>
                            <th className="p-1.5 text-right font-medium">Pago</th>
                            <th className="p-1.5 text-right font-medium">Diferença</th>
                            <th className="p-1.5 text-right font-medium">Índice</th>
                            <th className="p-1.5 text-right font-medium">Corrigido</th>
                            <th className="p-1.5 text-right font-medium">Juros</th>
                            <th className="p-1.5 text-right font-bold">Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vr.ocorrencias.map(oc => (
                            <tr key={oc.competencia} className="border-b border-border/10 hover:bg-muted/10">
                              <td className="p-1.5 font-mono">{oc.competencia}</td>
                              <td className="p-1.5 text-right font-mono">{oc.base.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.divisor.toFixed(0)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.multiplicador.toFixed(4)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.quantidade.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.dobra}</td>
                              <td className="p-1.5 text-right font-mono">{oc.devido.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.pago.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono font-medium">{oc.diferenca.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono text-primary">{oc.indice_correcao.toFixed(6)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.valor_corrigido.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono">{oc.juros.toFixed(2)}</td>
                              <td className="p-1.5 text-right font-mono font-bold">{oc.valor_final.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30 font-bold">
                            <td className="p-1.5">TOTAIS</td>
                            <td colSpan={5} />
                            <td className="p-1.5 text-right font-mono">{vr.total_devido.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono">{vr.total_pago.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono">{vr.total_diferenca.toFixed(2)}</td>
                            <td />
                            <td className="p-1.5 text-right font-mono">{vr.total_corrigido.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono">{vr.total_juros.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono">{vr.total_final.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Formula explanation */}
                    {vr.ocorrencias[0] && (
                      <div className="mt-2 text-[10px] bg-muted/20 rounded p-2 font-mono text-muted-foreground">
                        <Scale className="h-3 w-3 inline mr-1" />
                        Fórmula: {vr.ocorrencias[0].formula}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
