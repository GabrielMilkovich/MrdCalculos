import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Calculator, Loader2, Trash2 } from "lucide-react";

// Parser BR-aware: preserva centavos de "1.234,56". Undefined/null → null (não 0).
function parseCurrency(v: unknown): Decimal | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? new Decimal(v) : null;
  const raw = String(v).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,\-]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized = lastComma > lastDot
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");
  try {
    const d = new Decimal(normalized);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}
function or(val: Decimal | null, fallback: number): Decimal {
  return val ?? new Decimal(fallback);
}

interface Props {
  caseId: string;
  verbaId: string;
  verbaNome: string;
  periodoInicio: string;
  periodoFim: string;
  onClose: () => void;
}

export function ModuloOcorrencias({ caseId, verbaId, verbaNome, periodoInicio, periodoFim, onClose }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ["pjecalc_verba_ocorrencias", verbaId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_verba_ocorrencias" as any)
        .select("*").eq("verba_id", verbaId).order("competencia");
      return (data || []) as any[];
    },
  });

  const gerarOcorrencias = async () => {
    if (!periodoInicio || !periodoFim) { toast.error("Verba sem período definido."); return; }
    setGenerating(true);
    try {
      await supabase.from("pjecalc_verba_ocorrencias" as any).delete().eq("verba_id", verbaId);
      const start = new Date(periodoInicio + "T00:00:00");
      const end = new Date(periodoFim + "T00:00:00");
      const rows: any[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
        rows.push({
          verba_id: verbaId,
          case_id: caseId,
          competencia: comp,
          data_inicial: `${comp}-01`,
          data_final: `${comp}-${String(lastDay).padStart(2, '0')}`,
          ativa: true,
          valor_base: 0, divisor: 30, multiplicador: 1, quantidade: 1, dobra: 1,
          devido: 0, pago: 0, diferenca: 0,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      if (rows.length > 0) await supabase.from("pjecalc_verba_ocorrencias" as any).insert(rows);
      qc.invalidateQueries({ queryKey: ["pjecalc_verba_ocorrencias", verbaId] });
      toast.success(`${rows.length} ocorrências geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const updateField = async (id: string, field: string, value: unknown) => {
    const { error } = await supabase
      .from("pjecalc_verba_ocorrencias" as never)
      .update({ [field]: value })
      .eq("id", id);
    if (error) {
      logger.error("updateField falhou", error, { id, field });
      toast.error("Não foi possível salvar a alteração");
    }
  };

  const recalcRow = async (row: Record<string, unknown>) => {
    // Usa Decimal.js para preservar precisão monetária (valor_base pode conter "1.234,56").
    const base = or(parseCurrency(row.valor_base), 0);
    const div = or(parseCurrency(row.divisor), 30);
    const mult = or(parseCurrency(row.multiplicador), 1);
    const qtd = or(parseCurrency(row.quantidade), 1);
    const dobra = or(parseCurrency(row.dobra), 1);
    const pago = or(parseCurrency(row.pago), 0);
    if (div.isZero()) {
      logger.warn("recalcRow: divisor zero, abortando", { rowId: row.id });
      return;
    }
    const devido = base.times(mult).dividedBy(div).times(qtd).times(dobra);
    const diferenca = devido.minus(pago);
    const rowId = typeof row.id === "string" ? row.id : null;
    if (!rowId) return;
    const { error } = await supabase
      .from("pjecalc_verba_ocorrencias" as never)
      .update({
        devido: Number(devido.toDecimalPlaces(2).toString()),
        diferenca: Number(diferenca.toDecimalPlaces(2).toString()),
      })
      .eq("id", rowId);
    if (error) {
      logger.error("recalcRow update falhou", error, { rowId });
      toast.error("Falha ao recalcular ocorrência");
      return;
    }
    qc.invalidateQueries({ queryKey: ["pjecalc_verba_ocorrencias", verbaId] });
  };

  const totalDevido = ocorrencias.reduce((s: number, o: any) => s + (o.devido || 0), 0);
  const totalPago = ocorrencias.reduce((s: number, o: any) => s + (o.pago || 0), 0);
  const totalDif = ocorrencias.reduce((s: number, o: any) => s + (o.diferenca || 0), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grade de Ocorrências</h2>
          <p className="text-xs text-muted-foreground">{verbaNome}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={gerarOcorrencias} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
            Gerar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Voltar</Button>
        </div>
      </div>

      {ocorrencias.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Clique em "Gerar" para criar as ocorrências mensais com base no período da verba.
        </CardContent></Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Devido</div><div className="font-mono font-bold text-sm">{fmt(totalDevido)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Pago</div><div className="font-mono font-bold text-sm">{fmt(totalPago)}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Diferença</div><div className="font-mono font-bold text-sm text-primary">{fmt(totalDif)}</div></CardContent></Card>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-center font-medium w-6">✓</th>
                  <th className="p-2 text-left font-medium">Comp.</th>
                  <th className="p-2 text-center font-medium">Base</th>
                  <th className="p-2 text-center font-medium">÷ Div.</th>
                  <th className="p-2 text-center font-medium">× Mult.</th>
                  <th className="p-2 text-center font-medium">× Qtd.</th>
                  <th className="p-2 text-center font-medium">× Dobra</th>
                  <th className="p-2 text-right font-medium">Devido</th>
                  <th className="p-2 text-center font-medium">Pago</th>
                  <th className="p-2 text-right font-medium">Diferença</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {ocorrencias.map((o: any) => (
                  <tr key={o.id} className={`border-b border-border/30 hover:bg-muted/20 ${!o.ativa ? 'opacity-40' : ''}`}>
                    <td className="p-1 text-center">
                      <Checkbox
                        checked={o.ativa}
                        onCheckedChange={async (v) => {
                          await updateField(o.id, 'ativa', !!v);
                          qc.invalidateQueries({ queryKey: ["pjecalc_verba_ocorrencias", verbaId] });
                        }}
                      />
                    </td>
                    <td className="p-2 font-mono font-medium">{o.competencia}</td>
                    {['valor_base', 'divisor', 'multiplicador', 'quantidade', 'dobra'].map(field => (
                      <td key={field} className="p-1 text-center">
                        <Input
                          type="number" step="0.01"
                          defaultValue={o[field] || 0}
                          className="h-7 text-xs w-20 text-center mx-auto"
                          onBlur={async (e) => {
                            const parsed = parseCurrency(e.target.value);
                            const valorNum = parsed ? Number(parsed.toString()) : 0;
                            // Persist field, depois recalcula devido/diferenca com base no novo valor
                            await updateField(o.id, field, valorNum);
                            await recalcRow({ ...o, [field]: e.target.value });
                          }}
                        />
                      </td>
                    ))}
                    <td className="p-2 text-right font-mono">{(o.devido || 0).toFixed(2)}</td>
                    <td className="p-1 text-center">
                      <Input
                        type="number" step="0.01"
                        defaultValue={o.pago || 0}
                        className="h-7 text-xs w-20 text-center mx-auto"
                        onBlur={async (e) => {
                          const pago = or(parseCurrency(e.target.value), 0);
                          const devidoDec = or(parseCurrency(o.devido), 0);
                          const diferenca = devidoDec.minus(pago);
                          // Persist pago+diferenca atomicamente em um único UPDATE.
                          const { error } = await supabase
                            .from("pjecalc_verba_ocorrencias" as never)
                            .update({
                              pago: Number(pago.toDecimalPlaces(2).toString()),
                              diferenca: Number(diferenca.toDecimalPlaces(2).toString()),
                            })
                            .eq("id", o.id);
                          if (error) {
                            logger.error("Falha ao atualizar pago/diferenca", error, { id: o.id });
                            toast.error("Não foi possível salvar");
                            return;
                          }
                          qc.invalidateQueries({ queryKey: ["pjecalc_verba_ocorrencias", verbaId] });
                        }}
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-medium">{(o.diferenca || 0).toFixed(2)}</td>
                    <td className="p-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                        await supabase.from("pjecalc_verba_ocorrencias" as any).delete().eq("id", o.id);
                        qc.invalidateQueries({ queryKey: ["pjecalc_verba_ocorrencias", verbaId] });
                      }}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-bold">
                  <td colSpan={7} className="p-2 text-right">TOTAIS</td>
                  <td className="p-2 text-right font-mono">{totalDevido.toFixed(2)}</td>
                  <td className="p-2 text-center font-mono">{totalPago.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-primary">{totalDif.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}