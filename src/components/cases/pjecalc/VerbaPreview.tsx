/**
 * Phase 4, Item 2: Preview parcial de verba individual
 * Permite inspecionar uma verba sem liquidação completa
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { PjeCalcEngineV3 } from "@/lib/pjecalc/engine-v3";
import type { PjeVerba, PjeOcorrenciaResult } from "@/lib/pjecalc/engine-types";

interface Props {
  verba: PjeVerba;
  engine: PjeCalcEngineV3 | null;
  onClose: () => void;
}

export function VerbaPreview({ verba, engine, onClose }: Props) {
  if (!engine) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Configure os parâmetros e histórico salarial para visualizar o preview.
        </CardContent>
      </Card>
    );
  }

  const result = engine.calcularVerba(verba);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <Card className="border-primary/30 animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Preview: {verba.nome}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-muted-foreground">Devido</div>
            <div className="font-mono font-bold">{fmt(result.total_devido)}</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-muted-foreground">Pago</div>
            <div className="font-mono font-bold">{fmt(result.total_pago)}</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-muted-foreground">Diferença</div>
            <div className="font-mono font-bold text-primary">{fmt(result.total_diferenca)}</div>
          </div>
        </div>

        {/* Detail Table */}
        {result.ocorrencias.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-card">
                <tr className="bg-muted/50">
                  <th className="p-1.5 text-left">Comp.</th>
                  <th className="p-1.5 text-right">Base</th>
                  <th className="p-1.5 text-right">÷Div</th>
                  <th className="p-1.5 text-right">×Mult</th>
                  <th className="p-1.5 text-right">Qtd</th>
                  <th className="p-1.5 text-right">Devido</th>
                  <th className="p-1.5 text-right">Pago</th>
                  <th className="p-1.5 text-right font-bold">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {result.ocorrencias.slice(0, 24).map((oc) => (
                  <tr key={oc.competencia} className="border-b border-border/20">
                    <td className="p-1.5 font-mono">{oc.competencia}</td>
                    <td className="p-1.5 text-right font-mono">{oc.base.toFixed(2)}</td>
                    <td className="p-1.5 text-right font-mono">{oc.divisor.toFixed(0)}</td>
                    <td className="p-1.5 text-right font-mono">{oc.multiplicador.toFixed(4)}</td>
                    <td className="p-1.5 text-right font-mono">{oc.quantidade.toFixed(2)}</td>
                    <td className="p-1.5 text-right font-mono">{oc.devido.toFixed(2)}</td>
                    <td className="p-1.5 text-right font-mono">{oc.pago.toFixed(2)}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{oc.diferenca.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.ocorrencias.length > 24 && (
              <div className="text-[10px] text-muted-foreground text-center py-1">
                ... +{result.ocorrencias.length - 24} competências
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        {result.ocorrencias[0] && (
          <div className="text-[10px] bg-muted/30 rounded p-2 font-mono text-muted-foreground">
            Fórmula: {result.ocorrencias[0].formula}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
