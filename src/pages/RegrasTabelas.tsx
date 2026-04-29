import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Scale, TableIcon, Search, ExternalLink, AlertTriangle, Plus } from "lucide-react";

export default function RegrasTabelas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterTabelaNome, setFilterTabelaNome] = useState('all');

  // Fetch legal sources
  const { data: sources = [] } = useQuery({
    queryKey: ['legal_sources'],
    queryFn: async () => {
      const { data } = await supabase
        .from('legal_sources')
        .select('*')
        .eq('ativo', true)
        .order('orgao');
      return data || [];
    },
  });

  // Fetch legal rules
  const { data: rules = [] } = useQuery({
    queryKey: ['legal_rules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('legal_rules')
        .select('*')
        .eq('ativo', true)
        .order('prioridade', { ascending: false });
      return data || [];
    },
  });

  // Fetch reference tables
  const { data: refTables = [] } = useQuery({
    queryKey: ['reference_tables'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reference_tables')
        .select('*')
        .eq('ativo', true)
        .order('competencia', { ascending: false });
      return data || [];
    },
  });

  const filteredRules = rules.filter((r: any) => {
    const matchSearch = !searchTerm || 
      r.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategoria === 'all' || r.categoria === filterCategoria;
    return matchSearch && matchCat;
  });

  const filteredTables = refTables.filter((t: any) => {
    return filterTabelaNome === 'all' || t.nome === filterTabelaNome;
  });

  const uniqueTableNames = [...new Set(refTables.map((t: any) => t.nome))];
  const uniqueCategories = [...new Set(rules.map((r: any) => r.categoria).filter(Boolean))];

  const formatFaixas = (dados: any) => {
    if (Array.isArray(dados)) {
      return dados;
    }
    if (typeof dados === 'object' && dados.valor) {
      return [{ label: 'Valor', valor: dados.valor }];
    }
    return [];
  };

  return (
    <MainLayoutPremium breadcrumbs={[{ label: 'Regras & Tabelas' }]}>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Regras & Tabelas</h1>
            <p className="text-muted-foreground">Base legal, regras de cálculo e tabelas oficiais versionadas</p>
          </div>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules" className="gap-2"><Scale className="h-4 w-4" /> Regras ({rules.length})</TabsTrigger>
            <TabsTrigger value="tables" className="gap-2"><TableIcon className="h-4 w-4" /> Tabelas ({refTables.length})</TabsTrigger>
            <TabsTrigger value="sources" className="gap-2"><BookOpen className="h-4 w-4" /> Fontes ({sources.length})</TabsTrigger>
          </TabsList>

          {/* RULES TAB */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar regra..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueCategories.map(c => <SelectItem key={c as string} value={c as string}>{(c as string).replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredRules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{rule.codigo}</code>
                          <h3 className="font-medium">{rule.titulo}</h3>
                          {rule.flag_controversia && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" /> Controvérsia
                            </Badge>
                          )}
                        </div>
                        {rule.descricao && <p className="text-sm text-muted-foreground mb-2">{rule.descricao}</p>}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {rule.referencia && (
                            <Badge variant="outline">📎 {rule.referencia}</Badge>
                          )}
                          <Badge variant="secondary">{rule.jurisdicao}</Badge>
                          {rule.categoria && <Badge variant="secondary">{rule.categoria}</Badge>}
                          <Badge variant="outline">v{rule.versao}</Badge>
                        </div>
                        {rule.formula_texto && (
                          <div className="mt-2 bg-muted/50 rounded-md p-2">
                            <code className="text-xs">{rule.formula_texto}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TABLES TAB */}
          <TabsContent value="tables" className="space-y-4">
            <Select value={filterTabelaNome} onValueChange={setFilterTabelaNome}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Tipo de tabela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueTableNames.map(n => <SelectItem key={n as string} value={n as string}>{n as string}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="space-y-4">
              {filteredTables.map((table: any) => {
                const faixas = formatFaixas(table.dados_json);
                const isINSS = table.nome === 'INSS_FAIXAS';
                const isIRRF = table.nome === 'IRRF_MENSAL';
                const isSM = table.nome === 'SALARIO_MINIMO';

                return (
                  <Card key={table.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{table.nome}</CardTitle>
                          <CardDescription>Competência: {table.competencia}</CardDescription>
                        </div>
                        {table.notas && <p className="text-xs text-muted-foreground max-w-md text-right">{table.notas}</p>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isSM ? (
                        <div className="text-2xl font-bold text-primary">
                          R$ {(table.dados_json as Record<string, unknown>)?.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>De</TableHead>
                              <TableHead>Até</TableHead>
                              <TableHead>Alíquota</TableHead>
                              {isIRRF && <TableHead>Dedução</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {faixas.map((f: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell>R$ {f.faixa_inicio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell>R$ {f.faixa_fim?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell>{(f.aliquota * 100).toFixed(1)}%</TableCell>
                                {isIRRF && <TableCell>R$ {f.deducao?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* SOURCES TAB */}
          <TabsContent value="sources" className="space-y-3">
            {sources.map((src: any) => (
              <Card key={src.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{src.tipo}</Badge>
                        <h3 className="font-medium">{src.nome}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{src.orgao}</p>
                      {src.notas && <p className="text-xs text-muted-foreground mt-1">{src.notas}</p>}
                    </div>
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayoutPremium>
  );
}
