import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Loader2,
  Filter,
  BarChart3,
  History,
  Tag,
  Users,
} from "lucide-react";
import {
  allScenarios,
  scenariosByCategory,
  runTestScenario,
  type TestScenario,
  type TestResult,
} from "@/lib/calculation/_legacy/engine/TestScenarios";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const categoryLabels: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  simples: { label: "Simples", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: FileText },
  complexo: { label: "Complexo", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: BarChart3 },
  sem_ponto: { label: "Sem Ponto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  rescisao: { label: "Rescisão", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: FileText },
  real_anonimizado: { label: "Caso Real", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400", icon: Users },
};

export function RegressionTestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [testHistory, setTestHistory] = useState<Array<{
    runAt: string;
    passed: number;
    failed: number;
    total: number;
  }>>([]);

  // Mock engine executor for demonstration
  const mockEngineExecutor = async (inputs: TestScenario["inputs"]) => {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const scenario = allScenarios.find(
      (s) => s.inputs.contrato.data_admissao.getTime() === inputs.contrato.data_admissao.getTime()
    );

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    const variance = (Math.random() - 0.5) * (scenario.expectedResults.tolerance || 1);
    const totalBruto = scenario.expectedResults.totalBruto + variance;

    const byRubrica: Record<string, number> = {};
    for (const [key, value] of Object.entries(scenario.expectedResults.byRubrica)) {
      byRubrica[key] = value + (Math.random() - 0.5) * 0.5;
    }

    return {
      totalBruto,
      byRubrica,
      warnings: Math.random() > 0.8 ? ["Aviso de exemplo: verificar dados"] : [],
    };
  };

  const getFilteredScenarios = () => {
    if (selectedCategory === "all") return allScenarios;
    return scenariosByCategory[selectedCategory as keyof typeof scenariosByCategory] || allScenarios;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const scenarios = getFilteredScenarios();
    const newResults: TestResult[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      setCurrentScenario(scenario.id);
      setProgress(((i + 1) / scenarios.length) * 100);

      const result = await runTestScenario(scenario, mockEngineExecutor);
      newResults.push(result);
      setResults([...newResults]);
    }

    // Add to history
    const passed = newResults.filter((r) => r.passed).length;
    const failed = newResults.filter((r) => !r.passed).length;
    setTestHistory((prev) => [
      {
        runAt: new Date().toISOString(),
        passed,
        failed,
        total: newResults.length,
      },
      ...prev.slice(0, 9),
    ]);

    setIsRunning(false);
    setCurrentScenario(null);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold">Suíte de Testes de Regressão</h2>
          <p className="text-sm text-muted-foreground">
            {allScenarios.length} cenários de teste configurados (
            {scenariosByCategory.real_anonimizado.length} casos reais anonimizados)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Tag className="h-3 w-3" />
            Engine v2.0.0
          </Badge>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "Executando..." : "Executar Todos"}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por:</span>
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
            >
              Todos ({allScenarios.length})
            </Button>
            {Object.entries(categoryLabels).map(([key, { label }]) => {
              const count = scenariosByCategory[key as keyof typeof scenariosByCategory]?.length || 0;
              if (count === 0) return null;
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={selectedCategory === key ? "default" : "outline"}
                  onClick={() => setSelectedCategory(key)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {isRunning && (
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Executando: <span className="font-medium text-foreground">{currentScenario}</span>
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{results.length}</div>
                  <div className="text-sm text-muted-foreground">Executados</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                  <div className="text-sm text-muted-foreground">Aprovados</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-sm text-muted-foreground">Falharam</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  passRate >= 90 ? "bg-green-100 dark:bg-green-900/30" :
                  passRate >= 70 ? "bg-amber-100 dark:bg-amber-900/30" :
                  "bg-red-100 dark:bg-red-900/30"
                )}>
                  <BarChart3 className={cn(
                    "h-6 w-6",
                    passRate >= 90 ? "text-green-600" :
                    passRate >= 70 ? "text-amber-600" :
                    "text-red-600"
                  )} />
                </div>
                <div>
                  <div className={cn(
                    "text-2xl font-bold",
                    passRate >= 90 ? "text-green-600" :
                    passRate >= 70 ? "text-amber-600" :
                    "text-red-600"
                  )}>
                    {passRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Cenários</TabsTrigger>
          <TabsTrigger value="history" disabled={testHistory.length === 0}>
            Histórico ({testHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Cenários de Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {getFilteredScenarios().map((scenario) => {
                  const result = results.find((r) => r.scenarioId === scenario.id);
                  const isCurrentlyRunning = currentScenario === scenario.id;
                  const catConfig = categoryLabels[scenario.category];

                  return (
                    <AccordionItem
                      key={scenario.id}
                      value={scenario.id}
                      className="border rounded-lg px-4 bg-background/50"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 w-full pr-4">
                          {/* Status Icon */}
                          <div className="w-8">
                            {isCurrentlyRunning ? (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : result ? (
                              result.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          {/* Scenario Info */}
                          <div className="flex-1 text-left">
                            <div className="font-medium flex items-center gap-2">
                              {scenario.name}
                              {scenario.metadata?.source === "real_anonimizado" && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Users className="h-3 w-3" />
                                  Real
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {scenario.description}
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="hidden md:flex gap-1 flex-wrap max-w-[200px]">
                            {scenario.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Category */}
                          <Badge className={catConfig.color}>
                            {catConfig.label}
                          </Badge>

                          {/* Expected Total */}
                          <div className="text-right min-w-[120px]">
                            <div className="text-sm text-muted-foreground">Esperado</div>
                            <div className="font-mono font-medium">
                              {formatCurrency(scenario.expectedResults.totalBruto)}
                            </div>
                          </div>

                          {/* Actual Total (if run) */}
                          {result && (
                            <div className="text-right min-w-[120px]">
                              <div className="text-sm text-muted-foreground">Resultado</div>
                              <div
                                className={cn(
                                  "font-mono font-medium",
                                  result.passed ? "text-green-600" : "text-red-600"
                                )}
                              >
                                {formatCurrency(result.results.totalBruto.actual)}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4 space-y-4">
                          {/* Inputs Summary */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Inputs do Cenário</h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-muted-foreground">Período</div>
                                <div className="font-medium">
                                  {scenario.inputs.contrato.data_admissao.toLocaleDateString("pt-BR")} -{" "}
                                  {scenario.inputs.contrato.data_demissao.toLocaleDateString("pt-BR")}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-muted-foreground">Salário Base</div>
                                <div className="font-medium">
                                  {formatCurrency(scenario.inputs.contrato.salario_base.toNumber())}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-muted-foreground">Meses de Dados</div>
                                <div className="font-medium">
                                  {scenario.inputs.dadosMensais.length} meses
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-muted-foreground">Tolerância</div>
                                <div className="font-medium">
                                  {formatCurrency(scenario.expectedResults.tolerance || 0.01)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          {scenario.metadata && (
                            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                              <span className="font-medium">Fonte:</span> {scenario.metadata.source === "real_anonimizado" ? "Caso Real Anonimizado" : "Sintético"} 
                              {scenario.metadata.lastVerified && (
                                <> | <span className="font-medium">Verificado:</span> {scenario.metadata.lastVerified}</>
                              )}
                              {scenario.metadata.verifiedBy && (
                                <> por {scenario.metadata.verifiedBy}</>
                              )}
                              {scenario.metadata.notes && (
                                <> | <span className="font-medium">Notas:</span> {scenario.metadata.notes}</>
                              )}
                            </div>
                          )}

                          {/* Results by Rubrica */}
                          {result && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Resultados por Rubrica</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Rubrica</TableHead>
                                    <TableHead className="text-right">Esperado</TableHead>
                                    <TableHead className="text-right">Calculado</TableHead>
                                    <TableHead className="text-right">Diferença</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(scenario.expectedResults.byRubrica).map(
                                    ([rubrica, expected]) => {
                                      const rubricaResult = result.results.byRubrica[rubrica];
                                      return (
                                        <TableRow key={rubrica}>
                                          <TableCell className="font-mono">{rubrica}</TableCell>
                                          <TableCell className="text-right">
                                            {formatCurrency(expected)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {rubricaResult
                                              ? formatCurrency(rubricaResult.actual)
                                              : "—"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {rubricaResult
                                              ? formatCurrency(rubricaResult.diff)
                                              : "—"}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {rubricaResult?.passed ? (
                                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }
                                  )}
                                  {/* Total Row */}
                                  <TableRow className="font-medium bg-muted/30">
                                    <TableCell>TOTAL</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(scenario.expectedResults.totalBruto)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(result.results.totalBruto.actual)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                      {formatCurrency(result.results.totalBruto.diff)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {result.results.totalBruto.passed ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* Warnings & Errors */}
                          {result && (result.warnings.length > 0 || result.errors.length > 0) && (
                            <div className="space-y-2">
                              {result.warnings.length > 0 && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-medium mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Avisos
                                  </div>
                                  <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                                    {result.warnings.map((w, i) => (
                                      <li key={i}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {result.errors.length > 0 && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
                                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-medium mb-1">
                                    <XCircle className="h-4 w-4" />
                                    Erros
                                  </div>
                                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                                    {result.errors.map((e, i) => (
                                      <li key={i}>{e}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Execution Info */}
                          {result && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                              <span>Executado em: {new Date(result.executedAt).toLocaleString("pt-BR")}</span>
                              <span>•</span>
                              <span>Tempo: {result.executionTimeMs}ms</span>
                              <span>•</span>
                              <span>Engine: {result.engineVersion}</span>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Execuções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Aprovados</TableHead>
                    <TableHead className="text-right">Falharam</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testHistory.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(run.runAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-medium">{run.total}</TableCell>
                      <TableCell className="text-right text-green-600">{run.passed}</TableCell>
                      <TableCell className="text-right text-red-600">{run.failed}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={cn(
                            (run.passed / run.total) * 100 >= 90
                              ? "bg-green-100 text-green-800"
                              : (run.passed / run.total) * 100 >= 70
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {((run.passed / run.total) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
