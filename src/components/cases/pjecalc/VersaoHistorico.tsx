/**
 * Histórico de versões de um cálculo.
 * Lista versões, permite comparar (diff) e fazer rollback.
 */
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, GitCompareArrows, Undo2 } from 'lucide-react';
import {
  listarVersoes,
  rollbackParaVersao,
  type CalculoVersao,
} from '@/lib/pjecalc/versioning';
import { compararVersoes, type DiffField } from '@/lib/pjecalc/version-diff';

interface Props {
  caseId: string;
}

const fmtMoney = (v: unknown): string => {
  if (typeof v !== 'number' || Number.isNaN(v)) return String(v ?? '—');
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

function renderVal(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'number') return fmtMoney(v);
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 40);
  return String(v);
}

export function VersaoHistorico({ caseId }: Props) {
  const qc = useQueryClient();
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  const { data: versoes = [], isLoading } = useQuery({
    queryKey: ['pjecalc_versoes', caseId],
    queryFn: () => listarVersoes(caseId),
  });

  const rollbackMut = useMutation({
    mutationFn: (versaoId: string) => rollbackParaVersao(caseId, versaoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pjecalc_versoes', caseId] }),
  });

  const vA = versoes.find((v) => v.id === selA) ?? null;
  const vB = versoes.find((v) => v.id === selB) ?? null;
  const diffs: DiffField[] = vA && vB ? compararVersoes(vA, vB) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        Histórico de Versões
        <Badge variant="secondary" className="text-xs ml-auto">
          {versoes.length} versões
        </Badge>
      </h2>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : versoes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            Nenhuma versão salva ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2.5 text-left font-medium">Versão</th>
                  <th className="p-2.5 text-left font-medium">Data</th>
                  <th className="p-2.5 text-left font-medium">Descrição</th>
                  <th className="p-2.5 text-right font-medium">Líquido</th>
                  <th className="p-2.5 text-center font-medium">Status</th>
                  <th className="p-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {versoes.map((v: CalculoVersao, idx: number) => {
                  const liquido = v.resultado_json?.resumo?.liquido_reclamante;
                  const isLatest = idx === 0;
                  return (
                    <tr key={v.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-2.5 font-mono">v{v.versao}</td>
                      <td className="p-2.5">{fmtDate(v.created_at)}</td>
                      <td className="p-2.5 text-muted-foreground">{v.descricao ?? '—'}</td>
                      <td className="p-2.5 text-right font-mono">{typeof liquido === 'number' ? fmtMoney(liquido) : '—'}</td>
                      <td className="p-2.5 text-center">
                        <Badge variant={isLatest ? 'default' : 'outline'} className="text-[10px]">{isLatest ? 'atual' : 'histórico'}</Badge>
                      </td>
                      <td className="p-2.5 text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={isLatest} onClick={() => { setSelA(versoes[0].id); setSelB(v.id); }}>
                          <GitCompareArrows className="h-3 w-3 mr-1" /> Diff
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={isLatest || rollbackMut.isPending} onClick={() => rollbackMut.mutate(v.id)}>
                          <Undo2 className="h-3 w-3 mr-1" /> Rollback
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {vA && vB && (
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b text-xs flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <span className="font-medium">Diff</span>
              <Badge variant="default">v{vA.versao}</Badge>
              <span>vs</span>
              <Badge variant="secondary">v{vB.versao}</Badge>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {diffs.length} mudanças
              </Badge>
            </div>
            <ScrollArea className="max-h-[400px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Campo</th>
                    <th className="p-2 text-right font-medium">Antes (v{vB.versao})</th>
                    <th className="p-2 text-right font-medium">Depois (v{vA.versao})</th>
                    <th className="p-2 text-right font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        Nenhuma diferença entre as versões.
                      </td>
                    </tr>
                  ) : (
                    diffs.map((d, i) => {
                      const isNum = typeof d.delta === 'number';
                      const color = isNum ? (d.delta! > 0 ? 'text-[hsl(var(--success))]' : d.delta! < 0 ? 'text-destructive' : '') : '';
                      return (
                        <tr key={`${d.path}-${i}`} className="border-b border-border/20">
                          <td className="p-2 font-mono text-[10px]">{d.path}</td>
                          <td className="p-2 text-right font-mono">{renderVal(d.antes)}</td>
                          <td className="p-2 text-right font-mono">{renderVal(d.depois)}</td>
                          <td className={`p-2 text-right font-mono font-medium ${color}`}>
                            {isNum ? `${d.delta! > 0 ? '+' : ''}${fmtMoney(d.delta)}` : (d.delta ?? '—')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
