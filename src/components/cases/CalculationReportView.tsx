// =====================================================
// COMPONENTE: RELATÓRIO COMPLETO DE CÁLCULO (LAUDO)
// Exibe o relatório passo-a-passo com drill-down
// =====================================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Scale,
  Calculator,
  TrendingDown,
  GitCompare,
  Download,
  Eye,
  ChevronRight,
  Info,
  Ban,
} from "lucide-react";
import type { RelatorioCompleto, SecaoRelatorio, DetalheRubrica } from "@/lib/calculation/_legacy/engine/ReportGenerator";
import type { AnaliseResult, SituacaoDetectada } from "@/lib/calculation/_legacy/engine/SituationAnalyzer";

// =====================================================
// PROPS
// =====================================================

interface CalculationReportViewProps {
  relatorio: RelatorioCompleto;
  analise: AnaliseResult;
  onExportPDF?: () => void;
  onCompareScenarios?: () => void;
}

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SeveridadeBadge({ severidade }: { severidade?: string }) {
  switch (severidade) {
    case 'critico':
      return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
    case 'atencao':
      return <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Atenção</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Info</Badge>;
  }
}

function SecaoIcon({ tipo }: { tipo: SecaoRelatorio['tipo'] }) {
  switch (tipo) {
    case 'premissas': return <FileText className="h-5 w-5 text-primary" />;
    case 'situacao': return <Shield className="h-5 w-5 text-amber-600" />;
    case 'rubrica': return <Calculator className="h-5 w-5 text-primary" />;
    case 'desconto': return <TrendingDown className="h-5 w-5 text-destructive" />;
    case 'ressalva': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'cenario': return <GitCompare className="h-5 w-5 text-blue-600" />;
    case 'conclusao': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    default: return <Info className="h-5 w-5" />;
  }
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function CalculationReportView({
  relatorio,
  analise,
  onExportPDF,
  onCompareScenarios,
}: CalculationReportViewProps) {
  const [selectedDetail, setSelectedDetail] = useState<DetalheRubrica | null>(null);
  const [expandedSituacao, setExpandedSituacao] = useState<SituacaoDetectada | null>(null);

  const confiancaColor = relatorio.nivel_confianca >= 85 
    ? 'text-green-600' 
    : relatorio.nivel_confianca >= 60 
    ? 'text-amber-600' 
    : 'text-destructive';

  const cenarios = analise.situacoes.filter(s => s.cenario_alternativo);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                Relatório de Cálculo
              </CardTitle>
              <CardDescription className="mt-1">
                {relatorio.titulo}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${confiancaColor}`}>
                {relatorio.nivel_confianca}%
              </div>
              <p className="text-xs text-muted-foreground">Nível de Confiança</p>
              <Progress 
                value={relatorio.nivel_confianca} 
                className="w-32 mt-1 h-2" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumo Financeiro */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm text-muted-foreground">Total Bruto</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(relatorio.resumo_financeiro.total_bruto)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-destructive/5 border border-destructive/10">
              <p className="text-sm text-muted-foreground">Descontos</p>
              <p className="text-2xl font-bold text-destructive">
                -{formatCurrency(relatorio.resumo_financeiro.total_descontos)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-muted-foreground">Total Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(relatorio.resumo_financeiro.total_liquido)}
              </p>
            </div>
          </div>

          {/* Resumo por Rubrica */}
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verba</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorio.resumo_financeiro.por_rubrica.map((r) => (
                  <TableRow key={r.codigo} className={!r.incluida ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.incluida ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <span className="font-medium text-sm">{r.nome}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.codigo}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.incluida ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Incluída
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                          Excluída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.incluida ? formatCurrency(r.valor) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Situações Detectadas */}
      {analise.situacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Situações Detectadas ({analise.situacoes.length})
            </CardTitle>
            <CardDescription>
              O sistema identificou as seguintes situações que afetam o cálculo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analise.situacoes.map((sit) => (
              <div
                key={sit.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  sit.severidade === 'critico' ? 'border-destructive/30 bg-destructive/5' :
                  sit.severidade === 'atencao' ? 'border-amber-200 bg-amber-50/50' :
                  'border-border'
                }`}
                onClick={() => setExpandedSituacao(sit)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <SeveridadeBadge severidade={sit.severidade} />
                      <Badge variant="outline" className="text-xs">{sit.tipo.replace(/_/g, ' ')}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm">{sit.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sit.descricao}</p>
                    {sit.rubricas_bloqueadas.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <XCircle className="h-3 w-3 text-destructive" />
                        <span className="text-xs text-destructive">
                          Verbas excluídas: {sit.rubricas_bloqueadas.join(', ')}
                        </span>
                      </div>
                    )}
                    {sit.cenario_alternativo && (
                      <div className="flex items-center gap-1 mt-1">
                        <GitCompare className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-600">
                          Cenário alternativo: {sit.cenario_alternativo.nome}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cenários Alternativos */}
      {cenarios.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
              <GitCompare className="h-5 w-5" />
              Cenários Alternativos ({cenarios.length})
            </CardTitle>
            <CardDescription>
              O cálculo pode mudar se determinada premissa for alterada judicialmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cenarios.map((sit) => (
              <div key={sit.id} className="p-4 rounded-lg border border-blue-100 bg-blue-50/30">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  {sit.cenario_alternativo!.nome}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {sit.cenario_alternativo!.descricao}
                </p>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium">Premissa divergente:</span>{' '}
                  {sit.cenario_alternativo!.premissa_divergente}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fundamentação: {sit.cenario_alternativo!.fundamentacao}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Seções do Relatório Completo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Relatório Passo a Passo
          </CardTitle>
          <CardDescription>
            Laudo completo com premissas, fórmulas, fundamentos e ressalvas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {relatorio.secoes.map((secao) => (
              <AccordionItem key={secao.id} value={secao.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full pr-4">
                    <SecaoIcon tipo={secao.tipo} />
                    <span className="font-medium text-sm text-left flex-1">{secao.titulo}</span>
                    {secao.severidade && <SeveridadeBadge severidade={secao.severidade} />}
                    {secao.detalhes && (
                      <span className="text-sm font-bold text-primary">
                        {secao.detalhes.incluida 
                          ? formatCurrency(secao.detalhes.valor_bruto) 
                          : '—'}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {/* Conteúdo textual */}
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed bg-muted/30 p-4 rounded-lg">
                      {secao.conteudo}
                    </pre>

                    {/* Detalhes da rubrica (se disponível) */}
                    {secao.detalhes && secao.detalhes.incluida && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedDetail(secao.detalhes!)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Memória Detalhada
                      </Button>
                    )}

                    {/* Fundamentos com links */}
                    {secao.detalhes?.fundamentos_legais && secao.detalhes.fundamentos_legais.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase">Fundamentos Legais</h5>
                        {secao.detalhes.fundamentos_legais.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/20">
                            <Scale className="h-3 w-3 shrink-0" />
                            <span className="font-medium">{f.dispositivo}</span>
                            <span className="text-muted-foreground">— {f.descricao}</span>
                            <Badge variant="outline" className="text-[10px] px-1">{f.status}</Badge>
                            {f.url && (
                              <a href={f.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Pendências */}
      {analise.pendencias.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Pendências ({analise.pendencias.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analise.pendencias.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm">{p}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        {onCompareScenarios && cenarios.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={onCompareScenarios}>
            <GitCompare className="h-4 w-4" />
            Calcular Cenários Alternativos
          </Button>
        )}
        {onExportPDF && (
          <Button className="gap-2" onClick={onExportPDF}>
            <Download className="h-4 w-4" />
            Exportar Relatório PDF
          </Button>
        )}
      </div>

      {/* Dialog: Memória Detalhada */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Memória de Cálculo — {selectedDetail?.nome}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedDetail && (
              <div className="space-y-4 p-1">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm"><strong>Código:</strong> {selectedDetail.codigo}</p>
                  <p className="text-sm"><strong>Valor total:</strong> {formatCurrency(selectedDetail.valor_bruto)}</p>
                  <p className="text-sm"><strong>Motivo:</strong> {selectedDetail.motivo_inclusao_exclusao}</p>
                </div>

                <Separator />

                <h4 className="text-sm font-semibold">Passos do Cálculo</h4>
                <div className="space-y-2">
                  {selectedDetail.passos.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">#{p.passo}</Badge>
                        <span className="text-sm font-medium">{p.descricao}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">{p.formula}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-bold text-foreground">{p.resultado}</span>
                      </div>
                      {p.fundamento && (
                        <p className="text-xs text-primary mt-1">📜 {p.fundamento}</p>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <h4 className="text-sm font-semibold">Fundamentos Legais</h4>
                <div className="space-y-1">
                  {selectedDetail.fundamentos_legais.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                      <Scale className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{f.dispositivo}</span>
                      <span className="text-muted-foreground flex-1">— {f.descricao}</span>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Situação Expandida */}
      <Dialog open={!!expandedSituacao} onOpenChange={() => setExpandedSituacao(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {expandedSituacao?.titulo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {expandedSituacao && (
              <div className="space-y-4 p-1">
                <div className="flex items-center gap-2">
                  <SeveridadeBadge severidade={expandedSituacao.severidade} />
                  <Badge variant="outline">{expandedSituacao.tipo.replace(/_/g, ' ')}</Badge>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm leading-relaxed">{expandedSituacao.descricao}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Fundamentação Legal</h4>
                  <p className="text-sm text-muted-foreground">{expandedSituacao.fundamentacao}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Impacto no Cálculo</h4>
                  <p className="text-sm text-muted-foreground">{expandedSituacao.impacto_calculo}</p>
                </div>

                {expandedSituacao.rubricas_bloqueadas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-destructive">Verbas Excluídas</h4>
                    <div className="flex flex-wrap gap-1">
                      {expandedSituacao.rubricas_bloqueadas.map(r => (
                        <Badge key={r} variant="outline" className="text-xs text-destructive border-destructive/30">
                          <XCircle className="h-3 w-3 mr-1" />{r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {expandedSituacao.ressalva && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">{expandedSituacao.ressalva}</p>
                  </div>
                )}

                {expandedSituacao.cenario_alternativo && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <GitCompare className="h-4 w-4" />
                      Cenário Alternativo: {expandedSituacao.cenario_alternativo.nome}
                    </h4>
                    <p className="text-sm text-blue-800">{expandedSituacao.cenario_alternativo.descricao}</p>
                    <div className="mt-2 p-2 bg-blue-100/50 rounded text-xs text-blue-700">
                      <strong>Premissa:</strong> {expandedSituacao.cenario_alternativo.premissa_divergente}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {expandedSituacao.cenario_alternativo.fundamentacao}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
