/**
 * Relatório Consolidado por Processo
 * Permite selecionar múltiplos cálculos do mesmo processo e gerar relatório unificado.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileBarChart, Loader2, Layers } from "lucide-react";
import { gerarRelatorioConsolidado, type CalculoConsolidado } from "@/lib/pjecalc/pdf-report-consolidado";
import type { PjeLiquidacaoResult } from "@/lib/pjecalc/engine";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

interface Props {
  processoNumero?: string;
  clienteNome?: string;
}

interface CalculoRow {
  id: string;
  case_id: string;
  resultado_json: any;
  data_liquidacao: string;
  created_at: string;
  cliente?: string;
}

export function RelatorioConsolidado({ processoNumero, clienteNome }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);

  // Query all calculations that have results (liquidated)
  const { data: calculos = [], isLoading } = useQuery({
    queryKey: ["calculos_consolidados", processoNumero],
    queryFn: async () => {
      // Get all cases for the same processo number
      let query = supabase.from("cases").select("id, cliente, numero_processo");
      if (processoNumero) {
        query = query.eq("numero_processo", processoNumero);
      }
      const { data: cases } = await query;
      if (!cases || cases.length === 0) return [];

      const caseIds = cases.map(c => c.id);

      // Get all liquidation results for those cases
      const { data: resultados } = await supabase
        .from("pjecalc_liquidacao_resultado" as any)
        .select("*")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });

      if (!resultados) return [];

      return (resultados as any[]).map((r: any) => ({
        id: r.id,
        case_id: r.case_id,
        resultado_json: r.resultado_json,
        data_liquidacao: r.data_liquidacao,
        created_at: r.created_at,
        cliente: cases.find(c => c.id === r.case_id)?.cliente,
      })) as CalculoRow[];
    },
    enabled: open,
  });

  const toggleCalculo = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const gerar = () => {
    if (selected.size < 2) {
      toast.error("Selecione pelo menos 2 cálculos para consolidar");
      return;
    }
    setGerando(true);
    try {
      const selecionados: CalculoConsolidado[] = calculos
        .filter(c => selected.has(c.id))
        .map((c, i) => ({
          id: c.id,
          nome: c.cliente || `Cálculo ${i + 1}`,
          resultado: c.resultado_json as PjeLiquidacaoResult,
          dataLiquidacao: c.data_liquidacao,
        }));

      gerarRelatorioConsolidado(selecionados, {
        processo: processoNumero,
        cliente: clienteNome,
        engineVersion: '3.0.0',
      });

      toast.success("Relatório consolidado gerado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Layers className="h-4 w-4 mr-1" /> Consolidado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" /> Relatório Consolidado por Processo
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Selecione 2 ou mais cálculos para gerar um relatório unificado com a soma dos valores.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : calculos.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum cálculo liquidado encontrado{processoNumero ? ` para o processo ${processoNumero}` : ''}.
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {calculos.map(c => {
                const res = c.resultado_json as PjeLiquidacaoResult | null;
                const isSelected = selected.has(c.id);
                return (
                  <Card
                    key={c.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                    onClick={() => toggleCalculo(c.id)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <Checkbox checked={isSelected} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.cliente || 'Cálculo'}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                        {res?.resumo && (
                          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>Líquido: <strong className="text-foreground">{fmt(res.resumo.liquido_reclamante)}</strong></span>
                            <span>Total Rda: {fmt(res.resumo.total_reclamada)}</span>
                            <span>{res.verbas?.length || 0} verbas</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {selected.size} selecionado(s)
              </span>
              <Button size="sm" disabled={selected.size < 2 || gerando} onClick={gerar}>
                {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileBarChart className="h-4 w-4 mr-1" />}
                Gerar Consolidado
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
