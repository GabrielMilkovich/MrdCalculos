import { useState, useEffect } from "react";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Upload, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { analyzePJC, type PJCAnalysis, type VerbaAnalysis } from "@/lib/pjecalc/pjc-analyzer";
import JSZip from "jszip";

async function extractXmlFromPjc(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  // Check for ZIP signature (PK\x03\x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    const zip = await JSZip.loadAsync(data);
    // Find the .PJC or .xml file inside
    const files = Object.keys(zip.files);
    const pjcFile = files.find(f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml')) || files[0];
    if (!pjcFile) throw new Error('Nenhum arquivo encontrado dentro do ZIP');
    const content = await zip.files[pjcFile].async('string');
    return content;
  }
  // Already plain XML
  const decoder = new TextDecoder('iso-8859-1');
  return decoder.decode(data);
}

export default function PJCAnalyzerPage() {
  const [analysis, setAnalysis] = useState<PJCAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const xml = await extractXmlFromPjc(buffer);
      const result = analyzePJC(xml);
      setAnalysis(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromPublic = async (filename: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/reports/${filename}`);
      const buffer = await resp.arrayBuffer();
      const xml = await extractXmlFromPjc(buffer);
      const result = analyzePJC(xml);
      setAnalysis(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <MainLayoutPremium
      breadcrumbs={[{ label: "Análise PJC Real" }]}
      title="Análise PJC — Caso Real"
    >
      <div className="space-y-6">
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Carregar Arquivo .PJC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input type="file" accept=".PJC,.pjc,.xml" onChange={handleFile} className="block" />
            {loading && <p className="mt-2 text-muted-foreground">Analisando...</p>}
            {error && <p className="mt-2 text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {analysis && (
          <Tabs defaultValue="resumo">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="verbas">Verbas ({analysis.verbas.length})</TabsTrigger>
              <TabsTrigger value="dag">DAG</TabsTrigger>
              <TabsTrigger value="historico">Hist. Salarial ({analysis.historicos_salariais.length})</TabsTrigger>
              <TabsTrigger value="ferias">Férias/Faltas</TabsTrigger>
              <TabsTrigger value="atualizacao">Correção/Juros</TabsTrigger>
              <TabsTrigger value="apuracao">Apuração Diária ({analysis.apuracao_diaria_count})</TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="resumo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Parâmetros</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Beneficiário:</strong> {analysis.parametros.beneficiario}</p>
                    <p><strong>CPF:</strong> {analysis.parametros.cpf}</p>
                    <p><strong>Reclamado:</strong> {analysis.parametros.reclamado}</p>
                    <p><strong>CNPJ:</strong> {analysis.parametros.cnpj}</p>
                    <p><strong>Admissão:</strong> {analysis.parametros.admissao}</p>
                    <p><strong>Demissão:</strong> {analysis.parametros.demissao}</p>
                    <p><strong>Ajuizamento:</strong> {analysis.parametros.ajuizamento}</p>
                    <p><strong>Início Cálculo:</strong> {analysis.parametros.inicio_calculo}</p>
                    <p><strong>Término Cálculo:</strong> {analysis.parametros.termino_calculo}</p>
                    <p><strong>Carga Horária:</strong> {analysis.parametros.carga_horaria}h</p>
                    <p><strong>Regime:</strong> {analysis.parametros.regime}</p>
                    <p><strong>Sábado Dia Útil:</strong> {analysis.parametros.sabado_dia_util ? 'Sim' : 'Não'}</p>
                    <p><strong>Projeta Aviso:</strong> {analysis.parametros.projeta_aviso ? 'Sim' : 'Não'}</p>
                    <p><strong>Feriado Estadual:</strong> {analysis.parametros.feriado_estadual ? 'Sim' : 'Não'}</p>
                    <p><strong>Feriado Municipal:</strong> {analysis.parametros.feriado_municipal ? 'Sim' : 'Não'}</p>
                    <p><strong>Índices:</strong> {analysis.parametros.indices_acumulados}</p>
                    <p><strong>Dia Fechamento:</strong> {analysis.parametros.dia_fechamento}</p>
                    <p><strong>Versão PJe-Calc:</strong> {analysis.parametros.versao_sistema}</p>
                    <p><strong>Zera Negativo:</strong> {analysis.parametros.zera_negativo ? 'Sim' : 'Não'}</p>
                    <p><strong>Prescrição Quinquenal:</strong> {analysis.parametros.prescricao_quinquenal ? 'Sim' : 'Não'}</p>
                    <p><strong>Limitar Avos:</strong> {analysis.parametros.limitar_avos ? 'Sim' : 'Não'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Resultado Final</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-lg font-bold">Líquido Exequente: R$ {fmt(analysis.resultado.liquido_exequente)}</p>
                    </div>
                    <p><strong>INSS Reclamante:</strong> R$ {fmt(analysis.resultado.inss_reclamante)}</p>
                    <p><strong>INSS Reclamado:</strong> R$ {fmt(analysis.resultado.inss_reclamado)}</p>
                    <p><strong>IR:</strong> R$ {fmt(analysis.resultado.imposto_renda)}</p>
                    <p><strong>FGTS:</strong> R$ {fmt(analysis.resultado.fgts_deposito)}</p>
                    <p><strong>Custas:</strong> R$ {fmt(analysis.resultado.custas)}</p>
                    {analysis.resultado.honorarios.map((h, i) => (
                      <p key={i}><strong>Honorário {h.nome}:</strong> R$ {fmt(h.valor)}</p>
                    ))}
                    <hr className="my-2" />
                    <p><strong>Verbas:</strong> {analysis.verbas.length} ({analysis.verbas.filter(v => v.tipo === 'Calculada').length} calculadas + {analysis.verbas.filter(v => v.tipo === 'Reflexo').length} reflexos)</p>
                    <p><strong>Históricos Salariais:</strong> {analysis.historicos_salariais.length} rubricas</p>
                    <p><strong>Apuração Diária:</strong> {analysis.apuracao_diaria_count} dias</p>
                    <p><strong>Faltas:</strong> {analysis.faltas.length}</p>
                    <p><strong>Férias:</strong> {analysis.ferias.length} períodos</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* VERBAS */}
            <TabsContent value="verbas">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[70vh]">
                    <div className="space-y-2">
                      {analysis.verbas.map((v) => (
                        <VerbaCard key={v.id} verba={v} fmt={fmt} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DAG */}
            <TabsContent value="dag">
              <Card>
                <CardHeader><CardTitle>Grafo de Dependências (DAG)</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Verba</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Depende de</TableHead>
                        <TableHead>Alimenta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.dag.map((node) => {
                        const v = analysis.verbas.find(vv => vv.id === node.id);
                        return (
                          <TableRow key={node.id}>
                            <TableCell>{v?.ordem}</TableCell>
                            <TableCell className="font-medium">{node.nome}</TableCell>
                            <TableCell>
                              <Badge variant={v?.tipo === 'Reflexo' ? 'secondary' : 'default'}>
                                {v?.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {node.depende_de.length === 0 ? <span className="text-muted-foreground">—</span> :
                                node.depende_de.map(d => {
                                  const dep = analysis.verbas.find(vv => vv.id === d);
                                  return <Badge key={d} variant="outline" className="mr-1 mb-1">{dep?.nome || d}</Badge>;
                                })
                              }
                            </TableCell>
                            <TableCell className="text-xs">
                              {node.dependentes.length === 0 ? <span className="text-muted-foreground">—</span> :
                                node.dependentes.map(d => {
                                  const dep = analysis.verbas.find(vv => vv.id === d);
                                  return <Badge key={d} variant="outline" className="mr-1 mb-1">{dep?.nome || d}</Badge>;
                                })
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* HISTORICO */}
            <TabsContent value="historico">
              <div className="space-y-4">
                {analysis.historicos_salariais.map((h, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {h.nome}
                        <Badge variant="outline">{h.tipo_variacao}</Badge>
                        <Badge variant="outline">{h.ocorrencias_count} meses</Badge>
                        {h.incide_inss && <Badge>INSS</Badge>}
                        {h.incide_fgts && <Badge>FGTS</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Competência</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {h.competencias.map((c, j) => (
                              <TableRow key={j}>
                                <TableCell>{c.comp}</TableCell>
                                <TableCell className="text-right">{fmt(c.valor)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* FERIAS/FALTAS */}
            <TabsContent value="ferias">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Férias ({analysis.ferias.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aquisitivo</TableHead>
                          <TableHead>Dias</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Dobra</TableHead>
                          <TableHead>Abono</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.ferias.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{f.aquisitivo_inicio} a {f.aquisitivo_fim}</TableCell>
                            <TableCell>{f.dias}</TableCell>
                            <TableCell><Badge variant="outline">{f.situacao}</Badge></TableCell>
                            <TableCell>{f.dobra ? '✓' : '—'}</TableCell>
                            <TableCell>{f.abono ? `✓ (${f.dias_abono}d)` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Faltas/Afastamentos ({analysis.faltas.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Início</TableHead>
                          <TableHead>Fim</TableHead>
                          <TableHead>Justificada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.faltas.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell><Badge variant="outline">{f.tipo}</Badge></TableCell>
                            <TableCell>{f.data_inicio}</TableCell>
                            <TableCell>{f.data_fim}</TableCell>
                            <TableCell>{f.justificada ? '✓' : '✗'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ATUALIZACAO */}
            <TabsContent value="atualizacao">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Combinações de Índice</CardTitle></CardHeader>
                  <CardContent>
                    {analysis.atualizacao.combinacoes_indice.length === 0 ? (
                      <p className="text-muted-foreground">Nenhuma combinação de índice encontrada</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>A partir de</TableHead>
                            <TableHead>Índice</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.atualizacao.combinacoes_indice.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell>{c.a_partir_de}</TableCell>
                              <TableCell><Badge>{c.indice}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Combinações de Juros</CardTitle></CardHeader>
                  <CardContent>
                    {analysis.atualizacao.combinacoes_juros.length === 0 ? (
                      <p className="text-muted-foreground">Nenhuma combinação de juros encontrada</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>A partir de</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Taxa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.atualizacao.combinacoes_juros.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell>{c.a_partir_de}</TableCell>
                              <TableCell><Badge>{c.tipo}</Badge></TableCell>
                              <TableCell>{c.taxa ? `${c.taxa}%` : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* APURACAO */}
            <TabsContent value="apuracao">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    {analysis.apuracao_diaria_count} registros de apuração diária encontrados no PJC.
                    Para visualização completa, use a aba de Cartão de Ponto no módulo do cálculo.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayoutPremium>
  );
}

function VerbaCard({ verba: v, fmt }: { verba: VerbaAnalysis; fmt: (n: number) => string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={!v.ativo ? 'opacity-50' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Badge variant={v.tipo === 'Reflexo' ? 'secondary' : 'default'}>{v.tipo}</Badge>
              <span className="font-semibold text-sm">{v.nome}</span>
              <Badge variant="outline" className="ml-auto">{v.ocorrencia_pagamento}</Badge>
              <Badge variant="outline">{v.variacao}</Badge>
              <Badge variant="outline">{v.caracteristica}</Badge>
              <span className="text-xs text-muted-foreground">Ordem: {v.ordem}</span>
              <span className="text-xs text-muted-foreground">{v.ocorrencias_count} ocorrências</span>
              {v.incidencias.inss && <Badge className="text-[10px] h-5">INSS</Badge>}
              {v.incidencias.irpf && <Badge className="text-[10px] h-5">IRPF</Badge>}
              {v.incidencias.fgts && <Badge className="text-[10px] h-5">FGTS</Badge>}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 text-sm space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><strong>Período:</strong> {v.periodo_inicio} a {v.periodo_fim}</div>
              <div><strong>Gerar Principal:</strong> {v.gerar_principal}</div>
              <div><strong>Gerar Reflexo:</strong> {v.gerar_reflexo}</div>
              <div><strong>Compor Principal:</strong> {v.compor_principal}</div>
            </div>

            {/* Formula */}
            <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
              <p className="font-semibold">Fórmula:</p>
              {v.formula.base_tabelada && <p>Base Tabelada: <Badge variant="outline">{v.formula.base_tabelada}</Badge></p>}
              {v.formula.base_verbas.length > 0 && (
                <p>Base Verbas: {v.formula.base_verbas.map((b, i) => (
                  <Badge key={i} variant="outline" className="mr-1">
                    {b.nome} {b.integralizar === 'SIM' ? '(integralizar)' : ''}
                  </Badge>
                ))}</p>
              )}
              <p>Divisor: {v.formula.divisor.tipo} = {v.formula.divisor.valor}</p>
              <p>Multiplicador: {v.formula.multiplicador.valor}</p>
              <p>Quantidade: {v.formula.quantidade.tipo} = {v.formula.quantidade.valor}</p>
              <p>Dobra: {v.formula.dobra ? 'SIM' : 'NÃO'}</p>
              {v.formula.valor_pago && <p>Valor Pago: {v.formula.valor_pago.tipo} = {v.formula.valor_pago.valor}</p>}
            </div>

            {/* Reflexo info */}
            {v.tipo === 'Reflexo' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded text-xs space-y-1">
                <p className="font-semibold">Parâmetros Reflexo:</p>
                <p>Comportamento: <Badge>{v.comportamento_reflexo}</Badge></p>
                <p>Período Média: <Badge variant="outline">{v.periodo_media}</Badge></p>
                <p>Tratamento Fração: <Badge variant="outline">{v.tratamento_fracao}</Badge></p>
              </div>
            )}

            {/* Flags */}
            <div className="flex gap-2 text-xs">
              {v.excluir_falta_justificada && <Badge variant="destructive">Exclui Falta Just.</Badge>}
              {v.excluir_falta_nao_justificada && <Badge variant="destructive">Exclui Falta Não Just.</Badge>}
              {v.excluir_ferias_gozadas && <Badge variant="destructive">Exclui Férias Gozadas</Badge>}
            </div>

            {/* Ocorrências */}
            {v.ocorrencias_count > 0 && (
              <div>
                <p className="font-semibold text-xs mb-1">Amostra de Ocorrências ({v.ocorrencias_count} total):</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Divisor</TableHead>
                      <TableHead className="text-right">Mult</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Dobra</TableHead>
                      <TableHead className="text-right">Devido</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Índice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v.ocorrencias_sample.map((oc, i) => (
                      <TableRow key={i}>
                        <TableCell>{oc.competencia}</TableCell>
                        <TableCell className="text-right">{fmt(oc.base)}</TableCell>
                        <TableCell className="text-right">{fmt(oc.divisor)}</TableCell>
                        <TableCell className="text-right">{fmt(oc.multiplicador)}</TableCell>
                        <TableCell className="text-right">{fmt(oc.quantidade)}</TableCell>
                        <TableCell>{oc.dobra ? '2x' : '—'}</TableCell>
                        <TableCell className="text-right">{fmt(oc.devido)}</TableCell>
                        <TableCell className="text-right">{fmt(oc.pago)}</TableCell>
                        <TableCell className="text-right">{oc.indice_acumulado?.toFixed(6) || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
