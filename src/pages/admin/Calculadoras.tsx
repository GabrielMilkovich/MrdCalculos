import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CalculatorVersionForm } from "@/components/admin/CalculatorVersionForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Calculator, History, Check, Clock, Loader2 } from "lucide-react";

interface CalculatorVersion {
  id: string;
  versao: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  regras: Record<string, unknown>;
  changelog: string | null;
  ativo: boolean;
}

interface CalculatorData {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  tags: string[];
  ativo: boolean;
  calculator_versions: CalculatorVersion[];
}

export default function Calculadoras() {
  const [selectedCalculator, setSelectedCalculator] = useState<CalculatorData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: calculators = [], isLoading } = useQuery({
    queryKey: ["calculators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculators")
        .select(`
          *,
          calculator_versions (*)
        `)
        .eq("ativo", true)
        .order("categoria", { ascending: true });

      if (error) throw error;
      return data as CalculatorData[];
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async ({
      calculatorId,
      data,
    }: {
      calculatorId: string;
      data: {
        versao: string;
        vigencia_inicio: string;
        vigencia_fim?: string;
        regras: object;
        changelog?: string;
        codigo_ref?: string;
        ativo: boolean;
      };
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from("calculator_versions").insert([{
        calculator_id: calculatorId,
        versao: data.versao,
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fim: data.vigencia_fim || null,
        regras: data.regras,
        changelog: data.changelog || null,
        codigo_ref: data.codigo_ref || null,
        ativo: data.ativo,
        criado_por: session?.session?.user.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculators"] });
      toast.success("Versão criada com sucesso!");
      setIsDialogOpen(false);
      setSelectedCalculator(null);
    },
    onError: (error) => {
      toast.error("Erro ao criar versão: " + error.message);
    },
  });

  const groupedCalculators = calculators.reduce((acc, calc) => {
    if (!acc[calc.categoria]) {
      acc[calc.categoria] = [];
    }
    acc[calc.categoria].push(calc);
    return acc;
  }, {} as Record<string, CalculatorData[]>);

  const categoryLabels: Record<string, string> = {
    jornada: "Jornada de Trabalho",
    reflexos: "Reflexos",
    descontos: "Descontos",
    atualizacao: "Atualização Monetária",
  };

  const getLatestVersion = (versions: CalculatorVersion[]) => {
    return versions
      .filter((v) => v.ativo)
      .sort((a, b) => new Date(b.vigencia_inicio).getTime() - new Date(a.vigencia_inicio).getTime())[0];
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Calculadoras</h1>
            <p className="text-muted-foreground">
              Configure regras e versões das calculadoras trabalhistas
            </p>
          </div>
        </div>

        {Object.entries(groupedCalculators).map(([categoria, calcs]) => (
          <div key={categoria} className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
              {categoryLabels[categoria] || categoria}
            </h2>

            <div className="grid gap-4">
              {calcs.map((calc) => {
                const latestVersion = getLatestVersion(calc.calculator_versions);
                
                return (
                  <Card key={calc.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calculator className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{calc.nome}</CardTitle>
                            <p className="text-sm text-muted-foreground">{calc.descricao}</p>
                          </div>
                        </div>
                        <Dialog open={isDialogOpen && selectedCalculator?.id === calc.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) setSelectedCalculator(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCalculator(calc)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Nova Versão
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Nova Versão - {calc.nome}</DialogTitle>
                            </DialogHeader>
                            <CalculatorVersionForm
                              calculatorId={calc.id}
                              calculatorName={calc.nome}
                              previousVersion={
                                latestVersion
                                  ? {
                                      versao: latestVersion.versao,
                                      regras: latestVersion.regras,
                                      vigencia_inicio: latestVersion.vigencia_inicio,
                                    }
                                  : undefined
                              }
                              onSubmit={async (data) => {
                                await createVersionMutation.mutateAsync({
                                  calculatorId: calc.id,
                                  data,
                                });
                              }}
                              isLoading={createVersionMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {calc.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="versions" className="border-none">
                          <AccordionTrigger className="text-sm py-2 hover:no-underline">
                            <span className="flex items-center gap-2">
                              <History className="h-4 w-4" />
                              {calc.calculator_versions.length} versão(ões) • Histórico de Regras
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {calc.calculator_versions
                                .sort((a, b) => 
                                  new Date(b.vigencia_inicio).getTime() - new Date(a.vigencia_inicio).getTime()
                                )
                                .map((version) => {
                                  const regras = version.regras as Record<string, unknown>;
                                  return (
                                    <div
                                      key={version.id}
                                      className={`p-4 rounded-lg border ${
                                        version.ativo && !version.vigencia_fim 
                                          ? "bg-green-50/50 border-green-200" 
                                          : "bg-muted/50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                          {version.ativo && !version.vigencia_fim ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                          )}
                                          <span className="font-semibold">v{version.versao}</span>
                                          <Badge variant={version.ativo && !version.vigencia_fim ? "default" : "secondary"}>
                                            {version.vigencia_inicio}
                                            {version.vigencia_fim && ` → ${version.vigencia_fim}`}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      {/* Resumo das regras */}
                                      {regras && (
                                        <div className="grid grid-cols-4 gap-2 text-xs mt-3">
                                          {regras.divisor && (
                                            <div className="p-2 rounded bg-background">
                                              <span className="text-muted-foreground">Divisor:</span>
                                              <span className="font-medium ml-1">{String(regras.divisor)}h</span>
                                            </div>
                                          )}
                                          {regras.adicional_50 && (
                                            <div className="p-2 rounded bg-background">
                                              <span className="text-muted-foreground">HE 50%:</span>
                                              <span className="font-medium ml-1">{String(regras.adicional_50)}x</span>
                                            </div>
                                          )}
                                          {typeof regras.incide_inss === 'boolean' && (
                                            <div className="p-2 rounded bg-background">
                                              <span className="text-muted-foreground">INSS:</span>
                                              <span className="font-medium ml-1">{regras.incide_inss ? "Sim" : "Não"}</span>
                                            </div>
                                          )}
                                          {typeof regras.incide_irrf === 'boolean' && (
                                            <div className="p-2 rounded bg-background">
                                              <span className="text-muted-foreground">IRRF:</span>
                                              <span className="font-medium ml-1">{regras.incide_irrf ? "Sim" : "Não"}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {version.changelog && (
                                        <p className="text-xs text-muted-foreground mt-2 italic">
                                          📝 {version.changelog}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {calculators.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma calculadora cadastrada.
                <br />
                Calculadoras são criadas via migrations do banco.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
