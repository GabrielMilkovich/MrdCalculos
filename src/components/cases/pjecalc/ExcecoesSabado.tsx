import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays, Info } from "lucide-react";

// =====================================================
// EXCEÇÕES DE SÁBADO COMO DIA ÚTIL — POR PERÍODO
// No PJe-Calc, "Sábado como dia útil" pode variar por
// CCT/ACT ou por período do contrato. Esta UI permite
// configurar exceções ao toggle global.
// =====================================================

export interface SabadoExcecao {
  id: string;
  data_inicial: string;
  data_final: string;
  sabado_dia_util: boolean;
  observacao: string;
}

interface Props {
  caseId: string;
  globalSabadoDiaUtil: boolean;
}

export function ExcecoesSabado({ caseId, globalSabadoDiaUtil }: Props) {
  const qc = useQueryClient();

  const { data: excecoes = [] } = useQuery({
    queryKey: ["pjecalc_sabado_excecoes", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_parametros_extras")
        .select("*")
        .eq("case_id", caseId)
        .eq("tipo", "sabado_excecao")
        .order("data_inicial");
      return (data || []) as unknown[];
    },
  });

  const addExcecao = async () => {
    await fromUntyped("pjecalc_parametros_extras").insert({
      case_id: caseId,
      tipo: 'sabado_excecao',
      data_inicial: new Date().toISOString().slice(0, 10),
      data_final: new Date().toISOString().slice(0, 10),
      valor_booleano: !globalSabadoDiaUtil,
      observacao: '',
    });
    qc.invalidateQueries({ queryKey: ["pjecalc_sabado_excecoes", caseId] });
  };

  const updateField = async (id: string, field: string, value: any) => {
    await fromUntyped("pjecalc_parametros_extras").update({ [field]: value }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["pjecalc_sabado_excecoes", caseId] });
  };

  const removeExcecao = async (id: string) => {
    await fromUntyped("pjecalc_parametros_extras").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["pjecalc_sabado_excecoes", caseId] });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Exceções — Sábado como Dia Útil
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={addExcecao}>
            <Plus className="h-3 w-3 mr-1" /> Exceção
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <div>
            <span>Configuração global: <strong>{globalSabadoDiaUtil ? 'Sábado é dia útil' : 'Sábado NÃO é dia útil'}</strong>.</span>
            <br />
            <span>Adicione exceções para períodos onde a regra difere (ex: CCT de categoria diferente, alteração contratual).</span>
          </div>
        </div>

        {excecoes.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma exceção cadastrada. A configuração global será aplicada a todo o período.</p>
        ) : (
          <div className="space-y-2">
            {excecoes.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-card">
                <Input
                  type="date"
                  defaultValue={e.data_inicial}
                  className="h-7 text-xs w-32"
                  onBlur={ev => updateField(e.id, 'data_inicial', ev.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">a</span>
                <Input
                  type="date"
                  defaultValue={e.data_final}
                  className="h-7 text-xs w-32"
                  onBlur={ev => updateField(e.id, 'data_final', ev.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={e.valor_booleano ?? !globalSabadoDiaUtil}
                    onCheckedChange={v => updateField(e.id, 'valor_booleano', !!v)}
                  />
                  <Label className="text-[10px]">Sábado dia útil</Label>
                </div>
                <Badge variant={e.valor_booleano ? 'default' : 'secondary'} className="text-[9px]">
                  {e.valor_booleano ? 'Sim' : 'Não'}
                </Badge>
                <Input
                  defaultValue={e.observacao || ''}
                  placeholder="Observação (CCT, etc.)"
                  className="h-7 text-xs flex-1"
                  onBlur={ev => updateField(e.id, 'observacao', ev.target.value)}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeExcecao(e.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
