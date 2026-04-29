import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calculator,
  GitBranch,
  Clock,
  User,
  ChevronRight,
  ArrowRight,
  Hash,
  AlertTriangle,
  CheckCircle,
  Eye,
  GitCompare,
  Scale,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const safeFormatDate = (dateStr: string | null | undefined, fmt = "dd/MM/yyyy HH:mm"): string => {
  if (!dateStr) return "—";
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, fmt, { locale: ptBR }) : "—";
  } catch {
    return "—";
  }
};
import { SnapshotDiff } from "./pericial/SnapshotDiff";
import { ImpugnationPackage } from "./pericial/ImpugnationPackage";

interface Snapshot {
  id: string;
  case_id: string;
  profile_id: string | null;
  engine_version: string;
  ruleset_hash: string | null;
  versao: number;
  status: "gerado" | "revisao" | "aprovado";
  total_bruto: number | null;
  total_liquido: number | null;
  total_descontos: number | null;
  warnings: any[];
  alertas_consistencia: any[];
  created_at: string;
  created_by: string;
}

interface ResultItem {
  id: string;
  rubrica_codigo: string;
  rubrica_nome: string | null;
  competencia: string | null;
  base_calculo: number | null;
  quantidade: number | null;
  percentual: number | null;
  fator: number | null;
  valor_bruto: number;
  valor_liquido: number | null;
  memoria_detalhada: any;
  dependencias: any;
}

interface Lineage {
  id: string;
  rule_codigo: string | null;
  rule_versao: string | null;
  inputs: any;
  parametros: any;
  formula_aplicada: string | null;
  output_valor: number | null;
  hash_reproducao: string | null;
}

interface SnapshotViewerProps {
  caseId: string;
  onExecuteCalc?: () => void;
}

const statusLabels = {
  gerado: { label: "Gerado", className: "status-analysis" },
  revisao: { label: "Em Revisão", className: "status-calculated" },
  aprovado: { label: "Aprovado", className: "status-reviewed" },
};

const formatCurrency = (value: number | null) => {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SnapshotViewer({ caseId, onExecuteCalc }: SnapshotViewerProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResultItem | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "diff" | "impugnation">("details");

  // Fetch snapshots
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ["calc_snapshots", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calc_snapshots")
        .select("*")
        .eq("case_id", caseId)
        .order("versao", { ascending: false });
      if (error) throw error;
      return data as Snapshot[];
    },
  });

  // Fetch result items for selected snapshot
  const { data: resultItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["calc_result_items", selectedSnapshot],
    queryFn: async () => {
      if (!selectedSnapshot) return [];
      const { data, error } = await supabase
        .from("calc_result_items")
        .select("*")
        .eq("snapshot_id", selectedSnapshot)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as ResultItem[];
    },
    enabled: !!selectedSnapshot,
  });

  // Fetch lineage for selected item
  const { data: lineageData = [], isLoading: lineageLoading } = useQuery({
    queryKey: ["calc_lineage", selectedSnapshot, selectedItem?.id],
    queryFn: async () => {
      if (!selectedSnapshot || !selectedItem) return [];
      const { data, error } = await supabase
        .from("calc_lineage")
        .select("*")
        .eq("snapshot_id", selectedSnapshot)
        .eq("result_item_id", selectedItem.id);
      if (error) throw error;
      return data as Lineage[];
    },
    enabled: !!selectedSnapshot && !!selectedItem,
  });

  // Fetch comparison snapshot items
  const { data: compareItems = [] } = useQuery({
    queryKey: ["calc_result_items", compareSnapshot],
    queryFn: async () => {
      if (!compareSnapshot) return [];
      const { data, error } = await supabase
        .from("calc_result_items")
        .select("*")
        .eq("snapshot_id", compareSnapshot)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as ResultItem[];
    },
    enabled: !!compareSnapshot,
  });

  // Group results by rubrica
  const groupedByRubrica = resultItems.reduce((acc, item) => {
    const key = item.rubrica_codigo;
    if (!acc[key]) {
      acc[key] = {
        codigo: key,
        nome: item.rubrica_nome || key,
        items: [],
        total: 0,
      };
    }
    acc[key].items.push(item);
    acc[key].total += item.valor_bruto;
    return acc;
  }, {} as Record<string, { codigo: string; nome: string; items: ResultItem[]; total: number }>);

  const selectedSnapshotData = snapshots.find((s) => s.id === selectedSnapshot);
  const compareSnapshotData = snapshots.find((s) => s.id === compareSnapshot);

  if (snapshotsLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-shimmer h-32 rounded-xl" />
        <div className="skeleton-shimmer h-64 rounded-xl" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="empty-state">
        <Calculator className="empty-state-icon" />
        <h3 className="empty-state-title">Nenhum snapshot gerado</h3>
        <p className="empty-state-description">
          Execute um cálculo para gerar o primeiro snapshot com memória de cálculo auditável.
        </p>
        {onExecuteCalc && (
          <Button onClick={onExecuteCalc} className="mt-4" size="lg">
            <Calculator className="mr-2 h-4 w-4" />
            Executar Cálculo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Snapshots List */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Histórico de Snapshots
        </h3>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {snapshots.map((snapshot) => (
              <Card
                key={snapshot.id}
                className={`cursor-pointer transition-all ${
                  selectedSnapshot === snapshot.id
                    ? "ring-2 ring-primary"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedSnapshot(snapshot.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono">
                      v{snapshot.versao}
                    </Badge>
                    <Badge className={`status-badge ${statusLabels[snapshot.status].className}`}>
                      {statusLabels[snapshot.status].label}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(snapshot.total_bruto)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {safeFormatDate(snapshot.created_at)}
                  </div>
                  {snapshot.warnings && (snapshot.warnings as unknown[]).length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {(snapshot.warnings as unknown[]).length} avisos
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Snapshot Detail */}
      <div className="lg:col-span-2 space-y-6">
        {selectedSnapshotData ? (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Snapshot v{selectedSnapshotData.versao}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Engine {selectedSnapshotData.engine_version}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    {selectedSnapshotData.ruleset_hash?.slice(0, 8) || "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card">
                    <div className="stat-card-value text-primary">
                      {formatCurrency(selectedSnapshotData.total_bruto)}
                    </div>
                    <div className="stat-card-label">Total Bruto</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-value text-destructive">
                      {formatCurrency(selectedSnapshotData.total_descontos)}
                    </div>
                    <div className="stat-card-label">Descontos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-value text-green-600">
                      {formatCurrency(selectedSnapshotData.total_liquido)}
                    </div>
                    <div className="stat-card-label">Total Líquido</div>
                  </div>
                </div>

                {/* Warnings */}
                {selectedSnapshotData.warnings && (selectedSnapshotData.warnings as unknown[]).length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Avisos ({(selectedSnapshotData.warnings as unknown[]).length})
                    </div>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {(selectedSnapshotData.warnings as unknown[]).slice(0, 3).map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                          {typeof w === "string" ? w : w.message || JSON.stringify(w)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Details / Diff / Impugnation */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Record<string, unknown>)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="details" className="gap-2">
                    <Calculator className="h-4 w-4" />
                    Memória
                  </TabsTrigger>
                  <TabsTrigger value="diff" className="gap-2" disabled={snapshots.length < 2}>
                    <GitCompare className="h-4 w-4" />
                    Comparar
                  </TabsTrigger>
                  <TabsTrigger value="impugnation" className="gap-2">
                    <Scale className="h-4 w-4" />
                    Impugnação
                  </TabsTrigger>
                </TabsList>

                {activeTab === "diff" && snapshots.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Comparar com:</span>
                    <Select
                      value={compareSnapshot || ""}
                      onValueChange={setCompareSnapshot}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {snapshots
                          .filter((s) => s.id !== selectedSnapshot)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              v{s.versao}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <TabsContent value="details">
                {/* Results by Rubrica */}
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Memória de Cálculo por Rubrica
                </CardTitle>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton-shimmer h-12 rounded-lg" />
                    <div className="skeleton-shimmer h-12 rounded-lg" />
                    <div className="skeleton-shimmer h-12 rounded-lg" />
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {Object.values(groupedByRubrica).map((group) => (
                      <AccordionItem key={group.codigo} value={group.codigo} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">
                                {group.codigo}
                              </Badge>
                              <span className="font-medium">{group.nome}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary">
                                {group.items.length} item(s)
                              </Badge>
                              <span className="font-bold text-primary">
                                {formatCurrency(group.total)}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Competência</TableHead>
                                <TableHead className="text-right">Base</TableHead>
                                <TableHead className="text-right">Qtd</TableHead>
                                <TableHead className="text-right">%</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center">Lineage</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-sm">
                                    {item.competencia || "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.base_calculo)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantidade ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.percentual ? `${(item.percentual * 100).toFixed(1)}%` : "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(item.valor_bruto)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Sheet open={lineageOpen && selectedItem?.id === item.id} onOpenChange={setLineageOpen}>
                                      <SheetTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setLineageOpen(true);
                                          }}
                                        >
                                          <GitBranch className="h-4 w-4" />
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent className="w-[500px] sm:w-[600px]">
                                        <SheetHeader>
                                          <SheetTitle className="flex items-center gap-2">
                                            <GitBranch className="h-5 w-5" />
                                            Rastreabilidade (Lineage)
                                          </SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6 space-y-6">
                                          {/* Lineage Tree */}
                                          {lineageLoading ? (
                                            <div className="skeleton-shimmer h-32 rounded-lg" />
                                          ) : lineageData.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                              Sem dados de lineage disponíveis
                                            </div>
                                          ) : (
                                            lineageData.map((lin) => (
                                              <div key={lin.id} className="space-y-4">
                                                {/* Rule Info */}
                                                <div className="p-4 rounded-lg border bg-muted/50">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline">{lin.rule_codigo}</Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                      v{lin.rule_versao}
                                                    </span>
                                                  </div>
                                                  {lin.formula_aplicada && (
                                                    <div className="font-mono text-sm bg-background p-2 rounded mt-2">
                                                      {lin.formula_aplicada}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Inputs */}
                                                <div>
                                                  <h4 className="text-sm font-semibold mb-2">Inputs</h4>
                                                  <div className="space-y-2">
                                                    {Object.entries(lin.inputs || {}).map(([key, val]) => (
                                                      <div
                                                        key={key}
                                                        className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                                                      >
                                                        <span className="text-muted-foreground">{key}</span>
                                                        <span className="font-mono">
                                                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>

                                                {/* Parameters */}
                                                {lin.parametros && Object.keys(lin.parametros).length > 0 && (
                                                  <div>
                                                    <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
                                                    <div className="space-y-2">
                                                      {Object.entries(lin.parametros).map(([key, val]) => (
                                                        <div
                                                          key={key}
                                                          className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                                                        >
                                                          <span className="text-muted-foreground">{key}</span>
                                                          <span className="font-mono">{String(val)}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Output */}
                                                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                                                  <div className="flex items-center gap-2">
                                                    <ArrowRight className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">Output</span>
                                                  </div>
                                                  <span className="text-xl font-bold text-primary">
                                                    {formatCurrency(lin.output_valor)}
                                                  </span>
                                                </div>

                                                {/* Hash */}
                                                {lin.hash_reproducao && (
                                                  <div className="text-xs text-muted-foreground font-mono">
                                                    Hash: {lin.hash_reproducao}
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </SheetContent>
                                    </Sheet>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="diff">
                {compareSnapshot && compareSnapshotData ? (
                  <SnapshotDiff
                    snapshotA={compareSnapshotData as any}
                    snapshotB={selectedSnapshotData as any}
                    itemsA={compareItems}
                    itemsB={resultItems}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Selecione um snapshot para comparar</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="impugnation">
                <ImpugnationPackage
                  caseId={caseId}
                  snapshot={selectedSnapshotData as any}
                  resultItems={resultItems}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Selecione um snapshot para visualizar os detalhes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
