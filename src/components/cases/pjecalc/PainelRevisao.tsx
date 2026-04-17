/**
 * Phase 4, Item 7: Painel de Revisão Técnica
 * Consolidação para conferência antes de concluir o cálculo
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, CheckCircle2, XCircle, Info, ClipboardCheck,
  FileText, Scale, Shield, Clock,
} from "lucide-react";
import type { PjeValidationResult, PjeLiquidacaoResult } from "@/lib/pjecalc/engine-types";

interface ReviewItem {
  id: string;
  modulo: string;
  descricao: string;
  tipo: 'erro' | 'alerta' | 'info' | 'sugestao';
  status: 'pendente' | 'revisado' | 'aprovado' | 'requer_validacao';
  nota?: string;
}

interface Props {
  caseId: string;
  validacao: PjeValidationResult | null;
  resultado: PjeLiquidacaoResult | null;
  modulosStatus: Record<string, string>;
}

export function PainelRevisao({ caseId, validacao, resultado, modulosStatus }: Props) {
  const [items, setItems] = useState<ReviewItem[]>(() => {
    const all: ReviewItem[] = [];

    // From validation
    if (validacao) {
      validacao.itens.forEach((v, i) => {
        all.push({
          id: `val-${i}`,
          modulo: v.modulo,
          descricao: v.mensagem,
          tipo: v.tipo === 'erro' ? 'erro' : v.tipo === 'alerta' ? 'alerta' : 'info',
          status: 'pendente',
        });
      });
    }

    // From incomplete modules
    Object.entries(modulosStatus).forEach(([mod, status]) => {
      if (status === 'nao_iniciado' || status === 'incompleto') {
        all.push({
          id: `mod-${mod}`,
          modulo: mod,
          descricao: `Módulo ${mod} está ${status === 'nao_iniciado' ? 'não iniciado' : 'incompleto'}`,
          tipo: 'alerta',
          status: 'pendente',
        });
      }
    });

    // From results
    if (resultado) {
      if (resultado.resumo.principal_bruto === 0) {
        all.push({ id: 'res-zero', modulo: 'Resumo', descricao: 'Principal bruto é R$ 0,00 — verificar base de cálculo', tipo: 'alerta', status: 'pendente' });
      }
      const verbasZero = resultado.verbas.filter(v => v.total_diferenca === 0);
      if (verbasZero.length > 0) {
        all.push({ id: 'res-verbas-zero', modulo: 'Verbas', descricao: `${verbasZero.length} verba(s) com diferença zero`, tipo: 'info', status: 'pendente' });
      }
    }

    return all;
  });

  const updateItemStatus = (id: string, status: ReviewItem['status']) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const updateItemNota = (id: string, nota: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, nota } : item));
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'erro': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'alerta': return <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />;
      case 'sugestao': return <Scale className="h-3.5 w-3.5 text-primary" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      revisado: { label: 'Revisado', variant: 'outline' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      requer_validacao: { label: 'Validação', variant: 'destructive' },
    };
    const m = map[s] || map.pendente;
    return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
  };

  const totalPendente = items.filter(i => i.status === 'pendente').length;
  const totalRevisado = items.filter(i => i.status !== 'pendente').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Painel de Revisão Técnica
        </h2>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">{totalPendente} pendentes</Badge>
          <Badge variant="default" className="text-xs">{totalRevisado} revisados</Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--success))]" />
            Nenhum item de revisão pendente. Execute a liquidação para gerar itens de revisão.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(item.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.modulo}</span>
                      {statusBadge(item.status)}
                    </div>
                    <div className="text-xs">{item.descricao}</div>
                    {item.nota && (
                      <div className="text-[10px] text-muted-foreground mt-1 italic">Nota: {item.nota}</div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => updateItemStatus(item.id, 'revisado')}
                    >Revisado</Button>
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => updateItemStatus(item.id, 'aprovado')}
                    >OK</Button>
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive"
                      onClick={() => updateItemStatus(item.id, 'requer_validacao')}
                    >!</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metadata de Transparência */}
      {resultado?.resumo.meta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Parâmetros de Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">Arredondamento</Badge>
              <span className="text-muted-foreground">{resultado.resumo.meta.arredondamento}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">Tipo Mês</Badge>
              <span className="text-muted-foreground">{resultado.resumo.meta.tipo_mes}</span>
            </div>
            {resultado.resumo.meta.selic_referencia && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">SELIC</Badge>
                <span className="text-muted-foreground">
                  Acumulada até {resultado.resumo.meta.selic_referencia.data}: {resultado.resumo.meta.selic_referencia.acumulado.toFixed(6)}
                </span>
              </div>
            )}
            {resultado.resumo.meta.oj415_aplicada && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600">OJ 415</Badge>
                <span className="text-muted-foreground">Abatimento global aplicado em uma ou mais verbas</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guia de Check-up de Erros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Guia de Check-up — Divergências Comuns com PJe-Calc
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-2 text-left font-semibold">Se a diferença for em...</th>
                <th className="p-2 text-left font-semibold">Provável Causa</th>
                <th className="p-2 text-left font-semibold">O que conferir no PJe-Calc</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="p-2">Centavos (R$ 0,01 a R$ 0,99)</td>
                <td className="p-2">Arredondamento de rubricas</td>
                <td className="p-2">Critério: Truncar vs Arredondar (ROUND_HALF_UP)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2">INSS / Previdência</td>
                <td className="p-2">Tabela progressiva ou Teto</td>
                <td className="p-2">Tabela de salários de contribuição atualizada</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2">Juros / Correção</td>
                <td className="p-2">Data da Citação ou SELIC</td>
                <td className="p-2">Data de citação idêntica; versão da tabela SELIC</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2">Reflexos de HE</td>
                <td className="p-2">OJ 394 (DSR sobre Reflexos)</td>
                <td className="p-2">Trava temporal 20/03/2023 ativada</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2">Saldo de Salário / Faltas</td>
                <td className="p-2">Mês Comercial vs Civil</td>
                <td className="p-2">Divisor 30 fixo (Art. 64 CLT) ou dias reais do mês</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2">FGTS (pequena)</td>
                <td className="p-2">LC 110/01 (0,5% ou 0,8%)</td>
                <td className="p-2">Flag de Contribuição Social LC 110 ativada/desativada</td>
              </tr>
              <tr>
                <td className="p-2">Intervalo / Horas In Itinere</td>
                <td className="p-2">Reforma Trabalhista (11/11/2017)</td>
                <td className="p-2">Data de corte da reforma e modo de cálculo (integral vs proporcional)</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
