// =====================================================
// COMPONENTE: ASSISTENTE DE EXTRAÇÃO POR TEMA
// Wizard com etapas temáticas para extração de fatos
// Mapeamento para tabela facts + fact_evidences
// =====================================================

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Edit,
  Check,
  X,
  Quote,
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  Building,
  Gift,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logger } from "@/lib/logger";

interface ExtractionWizardProps {
  caseId: string;
  onFactsExtracted: () => void;
}

// Novo formato de fonte
interface FactSource {
  chunk_id: string;
  document_id: string;
  page_number: number;
  quote: string;
}

// Novo formato de fato extraído
interface ExtractedFact {
  key: string;
  label: string;
  value: string | number | boolean;
  value_type: "text" | "money" | "date" | "time" | "hours" | "percent" | "boolean";
  confidence: number;
  conflict: boolean;
  sources: FactSource[];
  notes?: string;
  // UI state
  isEditing?: boolean;
  editValue?: string;
}

interface NotFoundItem {
  expected_key: string;
  why: string;
}

interface ReviewIssue {
  fact_key: string;
  issue_type: string;
  severity: "error" | "warning" | "info";
  description: string;
  suggestion?: string;
}

interface ReviewResult {
  valid: boolean;
  total_facts: number;
  issues: ReviewIssue[];
  approved_facts: string[];
  rejected_facts: string[];
  warnings: string[];
}

interface ExtractionResult {
  task_type: string;
  facts: ExtractedFact[];
  not_found: NotFoundItem[];
  warnings: string[];
  chunks_searched?: number;
  review?: ReviewResult;
  extracted_at?: string;
  reviewed_at?: string;
}

interface TaskTheme {
  id: string;
  label: string;
  icon: typeof Calendar;
  description: string;
  query: string;
  doc_types: string[];
  expectedKeys: string[];
}

const taskThemes: TaskTheme[] = [
  {
    id: "vinculo_datas",
    label: "Vínculo e Datas",
    icon: Calendar,
    description: "Data de admissão, demissão, cargo, empregador",
    query: "Encontre informações sobre vínculo empregatício: data de admissão, data de demissão ou término, cargo exercido, nome do empregador, CNPJ, tipo de contrato, motivo da rescisão",
    doc_types: ["ctps", "contrato", "trct", "peticao"],
    expectedKeys: ["data_admissao", "data_demissao", "cargo", "empregador", "cnpj_empregador", "tipo_contrato", "motivo_rescisao"],
  },
  {
    id: "remuneracao",
    label: "Remuneração",
    icon: DollarSign,
    description: "Salário base, adicionais, comissões, gratificações",
    query: "Encontre informações sobre remuneração: salário base mensal, último salário, salário inicial, adicional de periculosidade (%), adicional de insalubridade (%), adicional noturno, comissões médias, gratificações, horas extras habituais",
    doc_types: ["holerite", "contrato", "trct", "cct"],
    expectedKeys: ["salario_base", "salario_inicial", "ultimo_salario", "adicional_periculosidade", "adicional_insalubridade", "adicional_noturno", "comissoes_media"],
  },
  {
    id: "jornada",
    label: "Jornada e Ponto",
    icon: Clock,
    description: "Horário de trabalho, horas extras, intervalo",
    query: "Encontre informações sobre jornada de trabalho: horário de entrada, horário de saída, intervalo para refeição em minutos, dias trabalhados por semana, média de horas extras diárias, trabalho noturno, escala de trabalho, banco de horas",
    doc_types: ["ponto", "contrato", "cct", "peticao"],
    expectedKeys: ["horario_entrada", "horario_saida", "intervalo_refeicao", "dias_semana", "horas_extras_media_diaria", "trabalho_noturno", "escala_trabalho"],
  },
  {
    id: "fgts",
    label: "FGTS",
    icon: Building,
    description: "Saldo, depósitos, multa 40%",
    query: "Encontre informações sobre FGTS: saldo total da conta, depósitos regulares, multa de 40% paga, valor da multa rescisória, extrato disponível",
    doc_types: ["fgts", "trct"],
    expectedKeys: ["saldo_fgts", "depositos_regulares", "multa_40_paga", "valor_multa_40"],
  },
  {
    id: "beneficios",
    label: "Benefícios",
    icon: Gift,
    description: "Vale transporte, alimentação, plano de saúde",
    query: "Encontre informações sobre benefícios: vale transporte, vale alimentação, vale refeição, plano de saúde, seguro de vida, outros benefícios",
    doc_types: ["holerite", "contrato", "cct"],
    expectedKeys: ["vale_transporte", "vale_alimentacao", "vale_refeicao", "plano_saude", "seguro_vida", "outros_beneficios"],
  },
];

// Mapear value_type do agente para fact_type do banco
function mapValueTypeToFactType(valueType: string): "data" | "moeda" | "numero" | "texto" | "boolean" {
  const mapping: Record<string, "data" | "moeda" | "numero" | "texto" | "boolean"> = {
    date: "data",
    money: "moeda",
    percent: "numero",
    hours: "numero",
    time: "texto",
    text: "texto",
    boolean: "boolean",
  };
  return mapping[valueType] || "texto";
}

export function ExtractionWizard({ caseId, onFactsExtracted }: ExtractionWizardProps) {
  const [activeTheme, setActiveTheme] = useState<string>("vinculo_datas");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [results, setResults] = useState<Record<string, ExtractionResult>>({});
  const [editingFact, setEditingFact] = useState<{theme: string; index: number} | null>(null);

  // Executar extração para um tema
  const runExtraction = useCallback(async (themeId: string) => {
    const theme = taskThemes.find(t => t.id === themeId);
    if (!theme) return;

    setIsExtracting(true);
    toast.info(`Executando extração: ${theme.label}...`);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Não autenticado");

      // Criar tarefa de extração com configurações de performance
      // top_k limitado entre 20-40 para balance custo/precisão
      // doc_types filtrado para reduzir volume de chunks
      const { data: task, error: taskError } = await supabase
        .from("extraction_tasks")
        .insert({
          case_id: caseId,
          owner_user_id: session.session.user.id,
          task_type: themeId,
          query: theme.query,
          filters: { doc_types: theme.doc_types },
          top_k: 30, // Balance entre precisão e custo
          similarity_threshold: 0.7,
          status: "pending",
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Executar tarefa
      const { error } = await supabase.functions.invoke("run-extraction-task", {
        body: { task_id: task.id },
      });

      if (error) throw error;

      // Buscar resultado atualizado
      const { data: updatedTask } = await supabase
        .from("extraction_tasks")
        .select("result_json")
        .eq("id", task.id)
        .single();

      if (updatedTask?.result_json) {
        const resultJson = updatedTask.result_json as unknown as ExtractionResult;
        setResults(prev => ({
          ...prev,
          [themeId]: resultJson,
        }));
        toast.success(`${resultJson.facts?.length || 0} fatos encontrados!`);
      }

    } catch (err) {
      logger.error("Extraction error", err);
      toast.error("Erro na extração: " + (err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  }, [caseId]);

  // Executar revisão dos fatos extraídos
  const runReview = useCallback(async (themeId: string) => {
    const result = results[themeId];
    if (!result || result.facts.length === 0) return;

    setIsReviewing(true);
    toast.info("Validando fatos extraídos...");

    try {
      // Buscar a task mais recente do tema
      const { data: tasks } = await supabase
        .from("extraction_tasks")
        .select("id")
        .eq("case_id", caseId)
        .eq("task_type", themeId)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!tasks || tasks.length === 0) {
        throw new Error("Tarefa de extração não encontrada");
      }

      const { data, error } = await supabase.functions.invoke("review-extraction", {
        body: { task_id: tasks[0].id },
      });

      if (error) throw error;

      // Atualizar resultado com revisão
      if (data?.review) {
        setResults(prev => ({
          ...prev,
          [themeId]: {
            ...prev[themeId],
            review: data.review,
            reviewed_at: new Date().toISOString(),
          },
        }));
        
        if (data.review.valid) {
          toast.success("Todos os fatos passaram na validação!");
        } else {
          const errorCount = data.review.issues.filter((i: ReviewIssue) => i.severity === "error").length;
          toast.warning(`${errorCount} problemas encontrados na validação`);
        }
      }

    } catch (err) {
      logger.error("Review error", err);
      toast.error("Erro na revisão: " + (err as Error).message);
    } finally {
      setIsReviewing(false);
    }
  }, [caseId, results]);

  // Confirmar um fato e salvar no banco
  const confirmFact = useCallback(async (themeId: string, fact: ExtractedFact) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Não autenticado");

      // Mapear para o schema da tabela facts
      const factData = {
        case_id: caseId,
        chave: fact.key,
        valor: String(fact.value),
        tipo: mapValueTypeToFactType(fact.value_type),
        origem: "ia_extracao" as const,
        confianca: fact.confidence,
        confirmado: true,
        confirmado_por: session.session.user.id,
        confirmado_em: new Date().toISOString(),
        // Usar a primeira source para citacao e pagina
        citacao: fact.sources[0]?.quote || null,
        pagina: fact.sources[0]?.page_number || null,
        chunk_id: fact.sources[0]?.chunk_id || null,
      };

      // Inserir fato confirmado
      const { data: insertedFact, error: factError } = await supabase
        .from("facts")
        .insert(factData)
        .select()
        .single();

      if (factError) throw factError;

      // Inserir todas as evidências (uma para cada source)
      if (insertedFact && fact.sources.length > 0) {
        const evidences = fact.sources
          .filter(s => s.chunk_id && s.document_id)
          .map(source => ({
            case_id: caseId,
            fact_id: insertedFact.id,
            document_id: source.document_id,
            chunk_id: source.chunk_id,
            page_number: source.page_number,
            quote: source.quote,
            confidence: fact.confidence,
          }));

        if (evidences.length > 0) {
          const { error: evidenceError } = await supabase
            .from("fact_evidences")
            .insert(evidences);

          if (evidenceError) {
            logger.warn("Error inserting evidences", { error: evidenceError });
          }
        }
      }

      // Remover fato da lista de resultados
      setResults(prev => ({
        ...prev,
        [themeId]: {
          ...prev[themeId],
          facts: prev[themeId].facts.filter(f => f.key !== fact.key),
        },
      }));

      toast.success(`Fato "${fact.label || fact.key}" confirmado!`);
      onFactsExtracted();

    } catch (err) {
      logger.error("Confirm fact error", err);
      toast.error("Erro ao confirmar fato: " + (err as Error).message);
    }
  }, [caseId, onFactsExtracted]);

  // Rejeitar um fato
  const rejectFact = useCallback((themeId: string, factIndex: number) => {
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.filter((_, i) => i !== factIndex),
      },
    }));
    toast.info("Fato rejeitado");
  }, []);

  // Editar valor do fato
  const startEditFact = useCallback((themeId: string, index: number) => {
    setEditingFact({ theme: themeId, index });
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: true, editValue: String(f.value) } : f
        ),
      },
    }));
  }, []);

  const saveEditFact = useCallback((themeId: string, index: number, newValue: string) => {
    setEditingFact(null);
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: false, value: newValue, editValue: undefined } : f
        ),
      },
    }));
    toast.success("Valor atualizado");
  }, []);

  const cancelEditFact = useCallback((themeId: string, index: number) => {
    setEditingFact(null);
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: false, editValue: undefined } : f
        ),
      },
    }));
  }, []);

  // Confirmar todos os fatos de um tema
  const confirmAllFacts = useCallback(async (themeId: string) => {
    const themeFacts = results[themeId]?.facts || [];
    if (themeFacts.length === 0) return;

    toast.info(`Confirmando ${themeFacts.length} fatos...`);
    
    for (const fact of themeFacts) {
      await confirmFact(themeId, fact);
    }
  }, [results, confirmFact]);

  // Verificar se um fato tem issues na revisão
  const getFactIssues = (themeId: string, factKey: string): ReviewIssue[] => {
    const review = results[themeId]?.review;
    if (!review) return [];
    return review.issues.filter(i => i.fact_key === factKey);
  };

  // Verificar se um fato foi rejeitado na revisão
  const isFactRejected = (themeId: string, factKey: string): boolean => {
    const review = results[themeId]?.review;
    if (!review) return false;
    return review.rejected_facts.includes(factKey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente de Extração de Fatos
          </CardTitle>
          <CardDescription>
            Execute a extração por tema para encontrar fatos nos documentos indexados.
            A IA buscará apenas nos trechos relevantes e sempre citará a origem literal.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Theme Tabs */}
      <Tabs value={activeTheme} onValueChange={setActiveTheme}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-2 p-2">
          {taskThemes.map((theme) => {
            const ThemeIcon = theme.icon;
            const themeResult = results[theme.id];
            const factCount = themeResult?.facts?.length || 0;
            
            return (
              <TabsTrigger
                key={theme.id}
                value={theme.id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ThemeIcon className="h-4 w-4" />
                {theme.label}
                {factCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {factCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {taskThemes.map((theme) => (
          <TabsContent key={theme.id} value={theme.id} className="space-y-4">
            {/* Theme Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <theme.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{theme.label}</h3>
                      <p className="text-muted-foreground">{theme.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {theme.doc_types.map(dt => (
                          <Badge key={dt} variant="outline" className="text-xs">
                            {dt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {results[theme.id]?.facts?.length > 0 && !results[theme.id]?.review && (
                      <Button
                        variant="outline"
                        onClick={() => runReview(theme.id)}
                        disabled={isReviewing}
                        className="gap-2"
                      >
                        {isReviewing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Validar Fatos
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => runExtraction(theme.id)}
                      disabled={isExtracting}
                      className="gap-2"
                    >
                      {isExtracting && activeTheme === theme.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extraindo...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Executar Extração
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results[theme.id] && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4">
                  <Card className="flex-1">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{results[theme.id].facts.length}</p>
                          <p className="text-sm text-muted-foreground">Fatos encontrados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="flex-1">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{results[theme.id].chunks_searched || 0}</p>
                          <p className="text-sm text-muted-foreground">Trechos analisados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {results[theme.id].not_found.length > 0 && (
                    <Card className="flex-1">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-2xl font-bold">{results[theme.id].not_found.length}</p>
                            <p className="text-sm text-muted-foreground">Não encontrados</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {results[theme.id].review && (
                    <Card className={`flex-1 ${results[theme.id].review?.valid ? 'border-green-200' : 'border-yellow-200'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          {results[theme.id].review?.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="text-2xl font-bold">
                              {results[theme.id].review?.issues.filter(i => i.severity === "error").length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Problemas críticos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Warnings */}
                {results[theme.id].warnings.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Avisos</p>
                          <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                            {results[theme.id].warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Not Found */}
                {results[theme.id].not_found.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="not-found">
                      <AccordionTrigger className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Dados não encontrados ({results[theme.id].not_found.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {results[theme.id].not_found.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Badge variant="outline" className="text-muted-foreground flex-shrink-0">
                                {item.expected_key}
                              </Badge>
                              <span className="text-muted-foreground">{item.why}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Facts Table */}
                {results[theme.id].facts.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">Fatos Extraídos</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => confirmAllFacts(theme.id)}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Confirmar Todos
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chave / Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-center">Tipo</TableHead>
                            <TableHead className="text-center">Confiança</TableHead>
                            <TableHead>Citação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results[theme.id].facts.map((fact, index) => {
                            const issues = getFactIssues(theme.id, fact.key);
                            const rejected = isFactRejected(theme.id, fact.key);
                            
                            return (
                              <TableRow 
                                key={index}
                                className={rejected ? "bg-destructive/5" : fact.conflict ? "bg-yellow-50" : ""}
                              >
                                <TableCell>
                                  <div className="space-y-1">
                                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                      {fact.key}
                                    </code>
                                    {fact.label && fact.label !== fact.key && (
                                      <p className="text-xs text-muted-foreground">{fact.label}</p>
                                    )}
                                    {fact.conflict && (
                                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                                        Conflito
                                      </Badge>
                                    )}
                                    {issues.length > 0 && (
                                      <div className="space-y-1">
                                        {issues.map((issue, i) => (
                                          <Badge 
                                            key={i}
                                            variant="outline" 
                                            className={
                                              issue.severity === "error" 
                                                ? "text-destructive border-destructive/30 text-xs" 
                                                : "text-yellow-600 border-yellow-300 text-xs"
                                            }
                                          >
                                            {issue.description}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {fact.isEditing ? (
                                    <div className="flex gap-2">
                                      <Input
                                        value={fact.editValue || String(fact.value)}
                                        onChange={(e) => {
                                          setResults(prev => ({
                                            ...prev,
                                            [theme.id]: {
                                              ...prev[theme.id],
                                              facts: prev[theme.id].facts.map((f, i) => 
                                                i === index ? { ...f, editValue: e.target.value } : f
                                              ),
                                            },
                                          }));
                                        }}
                                        className="h-8 w-[200px]"
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => saveEditFact(theme.id, index, fact.editValue || String(fact.value))}
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => cancelEditFact(theme.id, index)}
                                      >
                                        <X className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="font-medium">{String(fact.value)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {fact.value_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={
                                      fact.confidence >= 0.9 ? "text-green-600 border-green-200 bg-green-50" :
                                      fact.confidence >= 0.7 ? "text-yellow-600 border-yellow-200 bg-yellow-50" :
                                      "text-destructive border-destructive/20 bg-destructive/5"
                                    }
                                  >
                                    {Math.round(fact.confidence * 100)}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {fact.sources.length > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-pointer hover:text-primary">
                                          <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                            {fact.sources[0].quote}
                                          </span>
                                          <div className="flex gap-1">
                                            {fact.sources[0].page_number && (
                                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                                p.{fact.sources[0].page_number}
                                              </Badge>
                                            )}
                                            {fact.sources.length > 1 && (
                                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                +{fact.sources.length - 1}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-[400px]">
                                        <div className="space-y-2">
                                          {fact.sources.map((source, si) => (
                                            <div key={si} className="text-sm">
                                              <p className="font-medium">Página {source.page_number}</p>
                                              <p className="text-muted-foreground">{source.quote}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Sem citação</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {!fact.isEditing && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => startEditFact(theme.id, index)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Editar valor</TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                          onClick={() => confirmFact(theme.id, fact)}
                                          disabled={rejected}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Confirmar</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => rejectFact(theme.id, index)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Rejeitar</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {results[theme.id].facts.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum fato encontrado para este tema nos documentos indexados.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Verifique se os documentos foram processados corretamente.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty state */}
            {!results[theme.id] && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <theme.icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Extração não executada</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Executar Extração" para buscar fatos nos documentos
                  </p>
                  <Button onClick={() => runExtraction(theme.id)} disabled={isExtracting}>
                    <Play className="h-4 w-4 mr-2" />
                    Executar Extração
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
