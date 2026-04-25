// =====================================================
// COMPONENTE: GERADOR DE PETIÇÃO INICIAL (MÓDULO 5B)
// Interface para gerar, visualizar e editar petições
// =====================================================

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  FileText,
  Sparkles,
  Download,
  Copy,
  Edit,
  Save,
  Eye,
  AlertCircle,
  CheckCircle,
  Scale,
  Calculator,
  BookOpen,
  ListChecks,
  FileWarning,
  Printer,
} from "lucide-react";

interface PetitionGeneratorProps {
  caseId: string;
  calculationRunId?: string;
  onPetitionGenerated?: (petitionId: string) => void;
}

interface Pedido {
  codigo: string;
  descricao: string;
  fundamentacao: string;
  valor_estimado: number;
  reflexos?: string[];
  observacao?: string;
}

interface Petition {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  narrativa_fatos: string;
  fundamentacao_juridica: string;
  pedidos: Pedido[];
  ressalvas: string;
  conteudo_completo: string;
  memoria_calculo_html: string;
  generation_time_ms: number;
  created_at: string;
}

// Teses trabalhistas comuns
const availableTheses = [
  { id: "horas_extras", label: "Horas Extras não pagas", fundamentacao: "Art. 59 da CLT" },
  { id: "intervalo", label: "Intervalo Intrajornada suprimido", fundamentacao: "Art. 71, §4º da CLT" },
  { id: "dsr", label: "Reflexos em DSR", fundamentacao: "Lei 605/49 e Súmula 172 TST" },
  { id: "fgts_40", label: "FGTS + Multa 40%", fundamentacao: "Art. 18, §1º da Lei 8.036/90" },
  { id: "ferias", label: "Férias não gozadas/pagas", fundamentacao: "Art. 137 da CLT" },
  { id: "13_salario", label: "13º Salário proporcional", fundamentacao: "Lei 4.090/62" },
  { id: "aviso_previo", label: "Aviso Prévio indenizado", fundamentacao: "Art. 487 da CLT" },
  { id: "insalubridade", label: "Adicional de Insalubridade", fundamentacao: "Art. 192 da CLT" },
  { id: "periculosidade", label: "Adicional de Periculosidade", fundamentacao: "Art. 193 da CLT" },
  { id: "dano_moral", label: "Danos Morais", fundamentacao: "Art. 223-B da CLT" },
];

export function PetitionGenerator({
  caseId,
  calculationRunId,
  onPetitionGenerated,
}: PetitionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [petition, setPetition] = useState<Petition | null>(null);
  const [existingPetitions, setExistingPetitions] = useState<Petition[]>([]);
  const [selectedTheses, setSelectedTheses] = useState<string[]>([]);
  const [includeMemoria, setIncludeMemoria] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [activeTab, setActiveTab] = useState("generate");

  // Carregar petições existentes
  useEffect(() => {
    const loadPetitions = async () => {
      const { data } = await supabase
        .from("petitions")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setExistingPetitions(data as unknown as Petition[]);
        setPetition(data[0] as unknown as Petition);
        setActiveTab("view");
      }
    };

    loadPetitions();
  }, [caseId]);

  // Gerar nova petição
  const generatePetition = useCallback(async () => {
    setIsGenerating(true);
    toast.info("Gerando petição inicial...");

    try {
      const thesesLabels = availableTheses
        .filter((t) => selectedTheses.includes(t.id))
        .map((t) => `${t.label} (${t.fundamentacao})`);

      const { data, error } = await supabase.functions.invoke("generate-petition", {
        body: {
          case_id: caseId,
          calculation_run_id: calculationRunId,
          theses: thesesLabels,
          include_memoria: includeMemoria,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Petição gerada com sucesso!");
        
        // Recarregar petições
        const { data: petitions } = await supabase
          .from("petitions")
          .select("*")
          .eq("id", data.petition_id)
          .single();

        if (petitions) {
          setPetition(petitions as unknown as Petition);
          setExistingPetitions((prev) => [petitions as unknown as Petition, ...prev]);
          setActiveTab("view");
          onPetitionGenerated?.(data.petition_id);
        }
      } else {
        throw new Error(data?.error || "Erro ao gerar petição");
      }
    } catch (err) {
      logger.error("PetitionGenerator generation error", { error: String(err) });
      toast.error("Erro ao gerar petição: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [caseId, calculationRunId, selectedTheses, includeMemoria, onPetitionGenerated]);

  // Copiar para clipboard
  const copyToClipboard = useCallback(async () => {
    if (!petition?.conteudo_completo) return;

    try {
      await navigator.clipboard.writeText(petition.conteudo_completo);
      toast.success("Petição copiada para a área de transferência!");
    } catch {
      toast.error("Erro ao copiar");
    }
  }, [petition]);

  // Salvar edições
  const saveEdits = useCallback(async () => {
    if (!petition?.id || !editedContent) return;

    try {
      const { error } = await supabase
        .from("petitions")
        .update({ conteudo_completo: editedContent })
        .eq("id", petition.id);

      if (error) throw error;

      setPetition({ ...petition, conteudo_completo: editedContent });
      setIsEditing(false);
      toast.success("Alterações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err as Error).message);
    }
  }, [petition, editedContent]);

  // Exportar como texto/documento
  const exportPetition = useCallback(() => {
    if (!petition?.conteudo_completo) return;

    const blob = new Blob([petition.conteudo_completo], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peticao-inicial-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Petição exportada!");
  }, [petition]);

  // Formatar valor monetário
  const formatMoney = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Gerador de Petição Inicial
        </CardTitle>
        <CardDescription>
          Gere uma petição inicial completa baseada nos fatos extraídos e cálculos realizados
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Nova
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2" disabled={!petition}>
              <Eye className="h-4 w-4" />
              Visualizar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" disabled={existingPetitions.length === 0}>
              <FileText className="h-4 w-4" />
              Histórico ({existingPetitions.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Gerar Nova */}
          <TabsContent value="generate" className="space-y-6 mt-4">
            {/* Seleção de Teses */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Teses Jurídicas a Incluir
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {availableTheses.map((thesis) => (
                  <div
                    key={thesis.id}
                    className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedTheses((prev) =>
                        prev.includes(thesis.id)
                          ? prev.filter((t) => t !== thesis.id)
                          : [...prev, thesis.id]
                      );
                    }}
                  >
                    <Checkbox
                      id={thesis.id}
                      checked={selectedTheses.includes(thesis.id)}
                      onCheckedChange={() => {}}
                    />
                    <div className="flex flex-col">
                      <label
                        htmlFor={thesis.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {thesis.label}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {thesis.fundamentacao}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Opções */}
            <div className="space-y-3">
              <Label>Opções de Geração</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMemoria"
                  checked={includeMemoria}
                  onCheckedChange={(checked) => setIncludeMemoria(checked === true)}
                />
                <label htmlFor="includeMemoria" className="text-sm">
                  Incluir memória de cálculo como anexo
                </label>
              </div>
            </div>

            <Separator />

            {/* Botão de Geração */}
            <Button
              onClick={generatePetition}
              disabled={isGenerating}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando petição...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Petição Inicial
                </>
              )}
            </Button>

            {selectedTheses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Selecione ao menos uma tese para incluir na fundamentação
              </p>
            )}
          </TabsContent>

          {/* Tab: Visualizar */}
          <TabsContent value="view" className="space-y-4 mt-4">
            {petition && (
              <>
                {/* Header com ações */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{petition.titulo}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gerada em {new Date(petition.created_at).toLocaleString("pt-BR")}
                      {petition.generation_time_ms && (
                        <> • {(petition.generation_time_ms / 1000).toFixed(1)}s</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPetition}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        setEditedContent(petition.conteudo_completo);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Seções da Petição */}
                <Accordion type="multiple" defaultValue={["fatos", "direito", "pedidos"]}>
                  {/* Narrativa dos Fatos */}
                  <AccordionItem value="fatos">
                    <AccordionTrigger className="gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dos Fatos
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg">
                        {petition.narrativa_fatos || "Não gerado"}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Fundamentação */}
                  <AccordionItem value="direito">
                    <AccordionTrigger className="gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Do Direito
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg">
                        {petition.fundamentacao_juridica || "Não gerado"}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Pedidos */}
                  <AccordionItem value="pedidos">
                    <AccordionTrigger className="gap-2">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Dos Pedidos
                        {petition.pedidos && (
                          <Badge variant="secondary" className="ml-2">
                            {petition.pedidos.length} itens
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {petition.pedidos?.map((pedido, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{pedido.descricao}</p>
                                <p className="text-sm text-muted-foreground">
                                  {pedido.fundamentacao}
                                </p>
                                {pedido.reflexos && pedido.reflexos.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Reflexos: {pedido.reflexos.join(", ")}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="font-mono">
                                {formatMoney(pedido.valor_estimado)}
                              </Badge>
                            </div>
                            {pedido.observacao && (
                              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {pedido.observacao}
                              </p>
                            )}
                          </Card>
                        ))}

                        {petition.pedidos && petition.pedidos.length > 0 && (
                          <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                            <span className="font-semibold">Valor Total da Causa:</span>
                            <Badge variant="default" className="font-mono text-lg">
                              {formatMoney(
                                petition.pedidos.reduce((acc, p) => acc + (p.valor_estimado || 0), 0)
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Ressalvas */}
                  <AccordionItem value="ressalvas">
                    <AccordionTrigger className="gap-2">
                      <div className="flex items-center gap-2">
                        <FileWarning className="h-4 w-4" />
                        Das Ressalvas
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        {petition.ressalvas || "Sem ressalvas"}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Memória de Cálculo */}
                  {petition.memoria_calculo_html && (
                    <AccordionItem value="memoria">
                      <AccordionTrigger className="gap-2">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Memória de Cálculo
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="h-[400px]">
                          <div
                            className="p-4"
                            dangerouslySetInnerHTML={{ __html: petition.memoria_calculo_html }}
                          />
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                {/* Editor de Conteúdo Completo */}
                {isEditing && (
                  <div className="space-y-3">
                    <Label>Editar Petição Completa</Label>
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={saveEdits} className="gap-2">
                        <Save className="h-4 w-4" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                )}

                {/* Visualização do Markdown */}
                {!isEditing && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Eye className="h-4 w-4" />
                        Ver Petição Completa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>Petição Inicial Completa</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[70vh]">
                        <div className="prose prose-sm max-w-none p-4 whitespace-pre-wrap">
                          {petition.conteudo_completo}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-2">
              {existingPetitions.map((p) => (
                <Card
                  key={p.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    petition?.id === p.id ? "border-primary" : ""
                  }`}
                  onClick={() => {
                    setPetition(p);
                    setActiveTab("view");
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{p.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge
                      variant={p.status === "completed" ? "default" : "secondary"}
                    >
                      {p.status === "completed" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : null}
                      {p.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
