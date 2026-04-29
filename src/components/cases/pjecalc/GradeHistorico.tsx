import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Calculator, Loader2, ArrowLeft, Trash2 } from "lucide-react";

interface Props {
  caseId: string;
  historicoId: string;
  historicoNome: string;
  periodoInicio: string;
  periodoFim: string;
  valorInformado?: number;
  onClose: () => void;
}

export function GradeHistorico({ caseId, historicoId, historicoNome, periodoInicio, periodoFim, valorInformado, onClose }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ["pjecalc_historico_ocorrencias", historicoId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_historico_ocorrencias")
        .select("*").eq("historico_id", historicoId).order("competencia");
      return (data || []) as unknown[];
    },
  });

  const gerarOcorrencias = async () => {
    if (!periodoInicio || !periodoFim) { toast.error("Histórico sem período definido."); return; }
    setGenerating(true);
    try {
      await fromUntyped("pjecalc_historico_ocorrencias").delete().eq("historico_id", historicoId);
      const start = new Date(periodoInicio + "T00:00:00");
      const end = new Date(periodoFim + "T00:00:00");
      const rows: any[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        rows.push({
          historico_id: historicoId,
          case_id: caseId,
          competencia: comp,
          valor: valorInformado || 0,
          tipo: 'calculado',
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      if (rows.length > 0) await fromUntyped("pjecalc_historico_ocorrencias").insert(rows);
      qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias", historicoId] });
      toast.success(`${rows.length} ocorrências geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const updateVal = async (id: string, valor: number) => {
    await fromUntyped("pjecalc_historico_ocorrencias").update({ valor }).eq("id", id);
  };

  const total = ocorrencias.reduce((s: number, o: any) => s + (o.valor || 0), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grade de Ocorrências — Histórico</h2>
          <p className="text-xs text-muted-foreground">{historicoNome}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={gerarOcorrencias} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
            Gerar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>

      {ocorrencias.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Clique em "Gerar" para criar as ocorrências mensais com o valor do histórico.
        </CardContent></Card>
      ) : (
        <>
          <Card><CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground">Total</div>
            <div className="font-mono font-bold text-sm">{fmt(total)}</div>
          </CardContent></Card>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left font-medium">Competência</th>
                  <th className="p-2 text-center font-medium">Valor (R$)</th>
                  <th className="p-2 text-center font-medium">Tipo</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {ocorrencias.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="p-2 font-mono font-medium">{o.competencia}</td>
                    <td className="p-1 text-center">
                      <Input type="number" step="0.01" defaultValue={o.valor || 0} className="h-7 text-xs w-28 text-center mx-auto"
                        onBlur={e => { updateVal(o.id, parseFloat(e.target.value) || 0); qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias", historicoId] }); }} />
                    </td>
                    <td className="p-2 text-center text-muted-foreground">{o.tipo}</td>
                    <td className="p-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                        await fromUntyped("pjecalc_historico_ocorrencias").delete().eq("id", o.id);
                        qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias", historicoId] });
                      }}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
