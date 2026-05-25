import { CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ParidadeForenseResult, DiscrepanciaForense } from '@/features/data-extraction/paridade-forense/types';
import {
  mapConfidenceToCheckboxState,
  BADGE_STYLES,
  BADGE_LABELS,
  SEVERIDADE_STYLES,
  SEVERIDADE_LABELS,
} from '@/features/data-extraction/paridade-forense/confidence';

interface Props {
  resultado: ParidadeForenseResult;
  itensSelecionados: Map<number, boolean>;
  onToggle: (idx: number) => void;
  onSelecionarTodos: () => void;
  onDesselecionarTodos: () => void;
  countSelecionados: number;
  onAplicar: () => Promise<void>;
}

export function RelatorioParidadeForense({
  resultado,
  itensSelecionados,
  onToggle,
  onSelecionarTodos,
  onDesselecionarTodos,
  countSelecionados,
  onAplicar,
}: Props) {
  const { resumo, discrepancias, totais_por_competencia, discarded_hallucinations } = resultado;

  const statusIcon =
    resultado.paridade_geral === 'completa' ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : resultado.paridade_geral === 'parcial' ? (
      <AlertTriangle className="h-5 w-5 text-amber-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );

  const statusLabel =
    resultado.paridade_geral === 'completa'
      ? 'Paridade completa'
      : resultado.paridade_geral === 'parcial'
        ? 'Paridade parcial'
        : 'Paridade falhou';

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="font-medium">{statusLabel}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          Confiança: {resultado.ai_confidence_geral}/100
        </Badge>
      </div>

      {resultado.resumo_executivo && (
        <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground italic">
          {resultado.resumo_executivo}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Linhas com evidência: <strong>{resumo.com_evidencia_pdf}</strong></div>
        <div>Ausentes no CSV: <strong>{resumo.ausentes_no_csv}</strong></div>
        <div className="text-red-600">Críticas: <strong>{resumo.discrepancias_criticas}</strong></div>
        <div className="text-orange-600">Altas: <strong>{resumo.discrepancias_altas}</strong></div>
        <div className="text-yellow-600">Médias: <strong>{resumo.discrepancias_medias}</strong></div>
        <div className="text-slate-400">Baixas: <strong>{resumo.discrepancias_baixas}</strong></div>
      </div>

      <Tabs defaultValue="discrepancias">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="discrepancias" className="text-xs">
            Discrepâncias ({discrepancias.length})
          </TabsTrigger>
          <TabsTrigger value="totais" className="text-xs">
            Totais ({(totais_por_competencia ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="descartadas" className="text-xs">
            Descartadas ({discarded_hallucinations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancias" className="space-y-2 mt-2">
          {discrepancias.map((d, idx) => (
            <DiscrepanciaCard
              key={idx}
              d={d}
              idx={idx}
              checked={itensSelecionados.get(idx) ?? false}
              onToggle={() => onToggle(idx)}
            />
          ))}
          {discrepancias.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Nenhuma discrepância encontrada.
            </div>
          )}
        </TabsContent>

        <TabsContent value="totais" className="mt-2">
          {(totais_por_competencia ?? []).length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1 text-left">Competência</th>
                  <th className="py-1 text-right">CSV</th>
                  <th className="py-1 text-right">PDF</th>
                  <th className="py-1 text-right">Delta %</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {(totais_por_competencia ?? []).map((t) => (
                  <tr key={t.competencia} className="border-b border-dashed">
                    <td className="py-1 font-mono">{t.competencia}</td>
                    <td className="py-1 text-right font-mono">{t.soma_csv.toFixed(2)}</td>
                    <td className="py-1 text-right font-mono">
                      {t.total_pdf != null ? t.total_pdf.toFixed(2) : '—'}
                    </td>
                    <td className="py-1 text-right font-mono">{t.delta_pct.toFixed(2)}%</td>
                    <td className="py-1">
                      <Badge
                        variant={t.status === 'ok' ? 'secondary' : 'destructive'}
                        className="text-[10px]"
                      >
                        {t.status === 'ok' ? 'OK' : t.status === 'divergente' ? 'Divergente' : 'Ausente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              Sem dados de totais por competência.
            </div>
          )}
        </TabsContent>

        <TabsContent value="descartadas" className="space-y-2 mt-2">
          {discarded_hallucinations.map((h, idx) => (
            <div key={idx} className="border rounded-md p-2 text-xs bg-slate-50">
              <div className="font-mono text-[10px] text-muted-foreground">{h.field_path}</div>
              <div>Sugerido: {h.suggested}</div>
              <div className="text-red-500">Motivo: {h.reason}</div>
            </div>
          ))}
          {discarded_hallucinations.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Nenhuma alucinação descartada.
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between border-t pt-3 mt-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onSelecionarTodos}>
            Selecionar todos
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onDesselecionarTodos}>
            Limpar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {countSelecionados} de {discrepancias.length}
          </span>
          <Button
            size="sm"
            className="text-xs h-8"
            disabled={countSelecionados === 0}
            onClick={onAplicar}
          >
            Aplicar {countSelecionados} selecionada(s)
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiscrepanciaCard({
  d,
  idx,
  checked,
  onToggle,
}: {
  d: DiscrepanciaForense;
  idx: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const confMapping = mapConfidenceToCheckboxState(d.ai_confidence);

  return (
    <div className="border rounded-md p-2 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={confMapping.aplicar_disabled}
          onCheckedChange={() => onToggle()}
        />
        <span className={`font-medium ${SEVERIDADE_STYLES[d.severidade]}`}>
          {SEVERIDADE_LABELS[d.severidade]}
        </span>
        {d.competencia && (
          <span className="text-muted-foreground">{d.competencia}</span>
        )}
        <Badge className={`ml-auto text-[10px] ${BADGE_STYLES[confMapping.badge]}`}>
          {BADGE_LABELS[confMapping.badge]} ({d.ai_confidence})
        </Badge>
      </div>

      <div className="pl-6 space-y-0.5">
        {d.current != null && d.suggested != null && (
          <div className="font-mono">
            <span className="text-red-500 line-through">{String(d.current)}</span>
            {' → '}
            <span className="text-green-600">{String(d.suggested)}</span>
            {d.delta_pct != null && (
              <span className="text-muted-foreground ml-1">({d.delta_pct > 0 ? '+' : ''}{d.delta_pct.toFixed(1)}%)</span>
            )}
          </div>
        )}
        <div className="text-muted-foreground">{d.motivo}</div>
        {d.evidencia_pdf && (
          <div className="flex items-start gap-1 text-[10px] text-muted-foreground/80 mt-1">
            <FileText className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="italic">&quot;{d.evidencia_pdf}&quot;</span>
          </div>
        )}
        <div className="font-mono text-[10px] text-muted-foreground/50">{d.field_path}</div>
      </div>
    </div>
  );
}
