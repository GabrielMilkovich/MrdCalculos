/**
 * =====================================================
 * TIMELINE VIEW — Linha do tempo mensal do contrato
 * =====================================================
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CalculationCompetency } from '@/domain/types';

interface TimelineViewProps {
  timeline: CalculationCompetency[];
}

export function TimelineView({ timeline }: TimelineViewProps) {
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const selected = timeline.find(c => c.competencia === selectedComp);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Timeline list */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Competências ({timeline.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-1 p-2">
              {timeline.map(comp => (
                <button
                  key={comp.competencia}
                  onClick={() => setSelectedComp(comp.competencia)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedComp === comp.competencia
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{comp.competencia}</span>
                    <div className="flex items-center gap-1">
                      {comp.vinculo_ativo ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {comp.funcao} · R$ {comp.salario_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Detail */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {selected ? `Detalhes — ${selected.competencia}` : 'Selecione uma competência'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="space-y-4">
              {/* Contract state */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard label="Vínculo" value={selected.vinculo_ativo ? 'Ativo' : 'Inativo'} />
                <InfoCard label="Função" value={selected.funcao} />
                <InfoCard label="Salário Base" value={`R$ ${selected.salario_base.toFixed(2)}`} />
                <InfoCard label="CCT" value={selected.cct_vigente || '—'} />
              </div>

              {/* Calendar */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Calendário</h4>
                <div className="grid grid-cols-5 gap-2">
                  <InfoCard label="Dias no Mês" value={String(selected.calendario.dias_no_mes)} />
                  <InfoCard label="Dias Úteis" value={String(selected.calendario.dias_uteis)} />
                  <InfoCard label="Domingos" value={String(selected.calendario.domingos)} />
                  <InfoCard label="Sábados" value={String(selected.calendario.sabados)} />
                  <InfoCard label="Feriados" value={String(selected.calendario.feriados)} />
                </div>
              </div>

              {/* Events */}
              {selected.eventos.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Eventos Contratuais</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.eventos.map((ev, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline">{ev.tipo}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ev.data_inicio}</TableCell>
                          <TableCell className="font-mono text-xs">{ev.data_fim || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Variable rubrics */}
              {selected.rubricas_variaveis.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Rubricas Variáveis</h4>
                  {selected.rubricas_variaveis.map((rv, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span>{rv.rubric_id}</span>
                      <span className="font-mono">R$ {rv.valor.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sources */}
              {selected.fontes.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Fontes Documentais</h4>
                  <div className="flex flex-wrap gap-1">
                    {selected.fontes.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {f.tipo} ({(f.confidence * 100).toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Clique em uma competência para ver os detalhes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}
