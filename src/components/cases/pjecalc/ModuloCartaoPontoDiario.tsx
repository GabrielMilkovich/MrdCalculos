import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Calculator, Calendar, ChevronLeft, ChevronRight, Copy, Clock, AlertTriangle } from "lucide-react";

// Limite de amostragem aplicado pelo extract-and-fill (cartao de ponto).
// Refs: supabase/functions/extract-and-fill/index.ts:1058 (prompt) e :1393 (loop).
const OCR_CARTAO_PONTO_SAMPLE_LIMIT = 60;

interface Props {
  caseId: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  cargaHoraria?: number;
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function calcHorasEntre(h1: string, h2: string): number {
  if (!h1 || !h2) return 0;
  const [h1h, h1m] = h1.split(':').map(Number);
  const [h2h, h2m] = h2.split(':').map(Number);
  const min1 = h1h * 60 + h1m;
  let min2 = h2h * 60 + h2m;
  if (min2 < min1) min2 += 1440; // meia-noite
  return (min2 - min1) / 60;
}

function calcHorasTrabalhadas(r: any): number {
  let total = 0;
  total += calcHorasEntre(r.entrada_1, r.saida_1);
  total += calcHorasEntre(r.entrada_2, r.saida_2);
  total += calcHorasEntre(r.entrada_3, r.saida_3);
  return Math.round(total * 100) / 100;
}

export function ModuloCartaoPontoDiario({ caseId, dataAdmissao, dataDemissao, cargaHoraria = 220 }: Props) {
  const qc = useQueryClient();
  const [mesAtual, setMesAtual] = useState(() => {
    if (dataDemissao) return dataDemissao.slice(0, 7);
    return new Date().toISOString().slice(0, 7);
  });
  const [generating, setGenerating] = useState(false);
  const [showFixar, setShowFixar] = useState(false);
  const [jornadaFixa, setJornadaFixa] = useState({
    entrada_1: '08:00', saida_1: '12:00',
    entrada_2: '13:00', saida_2: '17:00',
    sabado: false,
  });

  const [ano, mes] = mesAtual.split('-').map(Number);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["pjecalc_ponto_diario", caseId, mesAtual],
    queryFn: async () => {
      const inicioMes = `${mesAtual}-01`;
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const fimMes = `${mesAtual}-${String(diasNoMes).padStart(2, '0')}`;
      const { data } = await supabase
        .from("pjecalc_ponto_diario" as any)
        .select("*")
        .eq("case_id", caseId)
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data");
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  // Detecta truncamento OCR: extract-and-fill capa o cartao de ponto em 60 dias
  // como amostra (vide prompt em extract-and-fill/index.ts:1058). Se a apuracao
  // diaria do caso tem >= 60 registros com origem='OCR', alertamos que HE
  // pode estar subestimada por falta de amostra completa.
  const { data: ocrSampleInfo } = useQuery({
    queryKey: ["cartao_ponto_ocr_sample", caseId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pjecalc_apuracao_diaria" as any)
        .select("*", { count: "exact", head: true })
        .eq("origem", "OCR")
        // calculo_id e o link real, mas nao temos aqui — filtra por presenca
        // de qualquer linha OCR (pjecalc_apuracao_diaria nao tem case_id direto).
        // Como aproximacao usamos calculo_id via subquery por case.
        .in(
          "calculo_id",
          (await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId)).data?.map((r: { id: string }) => r.id) || ["__none__"],
        );
      if (error) return { ocrCount: 0, truncated: false };
      const ocrCount = count || 0;
      return { ocrCount, truncated: ocrCount >= OCR_CARTAO_PONTO_SAMPLE_LIMIT };
    },
    staleTime: 60_000,
  });

  // Resumo do mês
  const resumoMes = useMemo(() => {
    let ht = 0, hed = 0, hes = 0, hedsr = 0, hn = 0, is = 0;
    for (const r of registros) {
      const row = r as Record<string, number | undefined>;
      ht += row.horas_trabalhadas || 0;
      hed += row.horas_extras_diarias || 0;
      hes += row.horas_extras_semanais || 0;
      hedsr += row.horas_extras_dsr || 0;
      hn += row.horas_noturnas || 0;
      is += row.intervalo_suprimido || 0;
    }
    return { ht: ht.toFixed(2), hed: hed.toFixed(2), hes: hes.toFixed(2), hedsr: hedsr.toFixed(2), hn: hn.toFixed(2), is: is.toFixed(2) };
  }, [registros]);

  const gerarDiasMes = async () => {
    if (!dataAdmissao) { toast.error("Preencha a data de admissão."); return; }
    setGenerating(true);
    try {
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(dataAdmissao);
      const demDate = dataDemissao ? new Date(dataDemissao) : null;
      
      // Deletar dias existentes do mês
      const inicioMes = `${mesAtual}-01`;
      const fimMes = `${mesAtual}-${String(diasNoMes).padStart(2, '0')}`;
      await supabase.from("pjecalc_ponto_diario" as any).delete()
        .eq("case_id", caseId).gte("data", inicioMes).lte("data", fimMes);

      const rows: Record<string, unknown>[] = [];
      for (let d = 1; d <= diasNoMes; d++) {
        const date = new Date(ano, mes - 1, d);
        if (date < admDate) continue;
        if (demDate && date > demDate) continue;
        const dow = date.getDay();
        const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        rows.push({
          case_id: caseId,
          data: dataStr,
          dia_semana: DIAS_SEMANA[dow],
          tipo: dow === 0 ? 'folga' : 'normal',
          origem: 'INFORMADA',
          horas_trabalhadas: 0,
        });
      }
      if (rows.length > 0) await supabase.from("pjecalc_ponto_diario" as any).insert(rows);
      qc.invalidateQueries({ queryKey: ["pjecalc_ponto_diario", caseId, mesAtual] });
      toast.success(`${rows.length} dias gerados para ${mesAtual}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const gerarTodosPeriodo = async () => {
    if (!dataAdmissao || !dataDemissao) { toast.error("Preencha admissão e demissão."); return; }
    setGenerating(true);
    try {
      await supabase.from("pjecalc_ponto_diario" as any).delete().eq("case_id", caseId);
      const admDate = new Date(dataAdmissao);
      const demDate = new Date(dataDemissao);
      const rows: Record<string, unknown>[] = [];
      const cur = new Date(admDate);
      while (cur <= demDate) {
        const dow = cur.getDay();
        const dataStr = cur.toISOString().slice(0, 10);
        rows.push({
          case_id: caseId,
          data: dataStr,
          dia_semana: DIAS_SEMANA[dow],
          tipo: dow === 0 ? 'folga' : 'normal',
          origem: 'INFORMADA',
          horas_trabalhadas: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
      // Insert em lotes de 500
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("pjecalc_ponto_diario" as any).insert(rows.slice(i, i + 500));
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_ponto_diario", caseId, mesAtual] });
      toast.success(`${rows.length} dias gerados para todo o período`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const fixarJornada = async () => {
    setGenerating(true);
    try {
      // Aplicar jornada fixa em todos os dias normais do mês
      for (const r of registros) {
        if (r.tipo === 'folga' || r.tipo === 'feriado' || r.tipo === 'ferias') continue;
        const dow = new Date(r.data).getDay();
        if (dow === 0) continue;
        if (dow === 6 && !jornadaFixa.sabado) continue;
        
        const ht = calcHorasEntre(jornadaFixa.entrada_1, jornadaFixa.saida_1) +
                    calcHorasEntre(jornadaFixa.entrada_2, jornadaFixa.saida_2);
        const jornadadiaria = cargaHoraria / (jornadaFixa.sabado ? 26 : 22);
        const he = Math.max(0, ht - jornadadiaria);
        
        await supabase.from("pjecalc_ponto_diario" as any).update({
          entrada_1: jornadaFixa.entrada_1,
          saida_1: jornadaFixa.saida_1,
          entrada_2: jornadaFixa.entrada_2,
          saida_2: jornadaFixa.saida_2,
          horas_trabalhadas: Math.round(ht * 100) / 100,
          horas_extras_diarias: Math.round(he * 100) / 100,
          frequencia: `${jornadaFixa.entrada_1}-${jornadaFixa.saida_1} / ${jornadaFixa.entrada_2}-${jornadaFixa.saida_2}`,
          origem: 'FIXADA',
        }).eq("id", r.id);
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_ponto_diario", caseId, mesAtual] });
      toast.success("Jornada fixada aplicada");
      setShowFixar(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const updateField = useCallback(async (id: string, field: string, value: string | number) => {
    const row = registros.find(r => r.id === id);
    if (!row) return;
    
    const updated = { ...row, [field]: value };
    
    // Recalcular horas se alterou horários
    if (['entrada_1', 'saida_1', 'entrada_2', 'saida_2', 'entrada_3', 'saida_3'].includes(field)) {
      updated[field] = value;
      const ht = calcHorasTrabalhadas(updated);
      const freq = [
        updated.entrada_1 && updated.saida_1 ? `${updated.entrada_1}-${updated.saida_1}` : '',
        updated.entrada_2 && updated.saida_2 ? `${updated.entrada_2}-${updated.saida_2}` : '',
        updated.entrada_3 && updated.saida_3 ? `${updated.entrada_3}-${updated.saida_3}` : '',
      ].filter(Boolean).join(' / ');
      
      await supabase.from("pjecalc_ponto_diario" as any).update({
        [field]: value,
        horas_trabalhadas: ht,
        frequencia: freq,
        origem: 'INFORMADA',
      }).eq("id", id);
    } else {
      await supabase.from("pjecalc_ponto_diario" as any).update({
        [field]: value,
        origem: 'INFORMADA',
      }).eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["pjecalc_ponto_diario", caseId, mesAtual] });
  }, [registros, caseId, mesAtual, qc]);

  const navMes = (dir: number) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const mesesLabel = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Sincronizar com tabela de totais por competência (pjecalc_cartao_ponto)
  const sincronizarTotais = async () => {
    try {
      // Buscar todos os meses com dados
      const res = await supabase.from("pjecalc_ponto_diario" as any)
        .select("*").eq("case_id", caseId).order("data");
      type PontoRow = Record<string, unknown> & { data: string; tipo?: string; horas_trabalhadas?: number };
      const todos = ((res as unknown as { data: PontoRow[] | null }).data ?? []);
      if (todos.length === 0) return;

      // Agrupar por competência
      const porComp: Record<string, PontoRow[]> = {};
      for (const r of todos) {
        const comp = r.data.slice(0, 7);
        if (!porComp[comp]) porComp[comp] = [];
        porComp[comp].push(r);
      }

      // Deletar totais existentes e inserir novos
      await supabase.from("pjecalc_cartao_ponto" as any).delete().eq("case_id", caseId);
      type CartaoPontoRow = Record<string, unknown>;
      const rows: CartaoPontoRow[] = [];
      for (const [comp, dias] of Object.entries(porComp)) {
        const diasUteis = dias.filter(d => d.tipo === 'normal' && new Date(d.data).getDay() !== 0).length;
        const diasTrabalhados = dias.filter(d => (d.horas_trabalhadas || 0) > 0).length;
        rows.push({
          case_id: caseId,
          competencia: comp,
          dias_uteis: diasUteis,
          dias_trabalhados: diasTrabalhados,
          horas_extras_50: dias.reduce((s: number, d: any) => s + (d.horas_extras_diarias || 0), 0),
          horas_extras_100: dias.reduce((s: number, d: any) => s + (d.horas_extras_semanais || 0), 0),
          horas_noturnas: dias.reduce((s: number, d: any) => s + (d.horas_noturnas || 0), 0),
          intervalo_suprimido: dias.reduce((s: number, d: any) => s + (d.intervalo_suprimido || 0), 0),
          dsr_horas: dias.reduce((s: number, d: any) => s + (d.horas_extras_dsr || 0), 0),
        });
      }
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 500) {
          await supabase.from("pjecalc_cartao_ponto" as any).insert(rows.slice(i, i + 500));
        }
      }
      toast.success(`${rows.length} competências sincronizadas com o motor de cálculo`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Cartão de Ponto — Ocorrências Diárias</h2>
          <p className="text-xs text-muted-foreground">Lançamento de horários por dia (como no PJe-Calc)</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={gerarDiasMes} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
            Gerar Mês
          </Button>
          <Button size="sm" variant="outline" onClick={gerarTodosPeriodo} disabled={generating}>
            <Calendar className="h-3 w-3 mr-1" /> Gerar Todo Período
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowFixar(true)}>
            <Clock className="h-3 w-3 mr-1" /> Fixar Jornada
          </Button>
          <Button size="sm" variant="default" onClick={sincronizarTotais}>
            <Calculator className="h-3 w-3 mr-1" /> Sincronizar Totais
          </Button>
        </div>
      </div>

      {/* Navegação por mês */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
        <Button variant="ghost" size="sm" onClick={() => navMes(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm capitalize">{mesesLabel}</span>
        <Button variant="ghost" size="sm" onClick={() => navMes(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Warning de amostra OCR truncada */}
      {ocrSampleInfo?.truncated && (
        <Card className="border-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-200">
                Amostra de {OCR_CARTAO_PONTO_SAMPLE_LIMIT} dias detectada
              </div>
              <div className="text-amber-700 dark:text-amber-300/80">
                A extração via OCR limitou-se aos primeiros {OCR_CARTAO_PONTO_SAMPLE_LIMIT} registros diários. Horas Extras
                podem estar subestimadas. Verifique e complete os meses faltantes manualmente
                ou via importação de CSV antes da liquidação.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo do mês */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: 'Hs Trab.', val: resumoMes.ht },
          { label: 'HE Diárias', val: resumoMes.hed },
          { label: 'HE Semanais', val: resumoMes.hes },
          { label: 'HE DSR', val: resumoMes.hedsr },
          { label: 'H. Noturnas', val: resumoMes.hn },
          { label: 'Int. Supr.', val: resumoMes.is },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-2 text-center">
              <div className="text-[9px] text-muted-foreground uppercase">{item.label}</div>
              <div className="font-mono font-bold text-xs">{item.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grade diária */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : registros.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Clique em "Gerar Mês" para criar os dias do mês selecionado.
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b">
                <th className="p-1.5 text-left font-semibold w-20">Data</th>
                <th className="p-1.5 text-left font-semibold w-16">Dia</th>
                <th className="p-1.5 text-center font-semibold" colSpan={2}>Turno 1</th>
                <th className="p-1.5 text-center font-semibold" colSpan={2}>Turno 2</th>
                <th className="p-1.5 text-center font-semibold w-12">Hs Trab</th>
                <th className="p-1.5 text-center font-semibold w-12">HE Diária</th>
                <th className="p-1.5 text-center font-semibold w-12">HE Sem.</th>
                <th className="p-1.5 text-center font-semibold w-12">HE DSR</th>
                <th className="p-1.5 text-center font-semibold w-12">H.Not.</th>
                <th className="p-1.5 text-center font-semibold w-12">Int.Sup.</th>
                <th className="p-1.5 text-center font-semibold w-16">Tipo</th>
              </tr>
              <tr className="bg-muted/30 border-b text-[9px]">
                <th></th><th></th>
                <th className="p-1 text-center">Entrada</th>
                <th className="p-1 text-center">Saída</th>
                <th className="p-1 text-center">Entrada</th>
                <th className="p-1 text-center">Saída</th>
                <th colSpan={7}></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r: any) => {
                const dow = new Date(r.data).getDay();
                const isDomingo = dow === 0;
                const isSabado = dow === 6;
                const isFolga = r.tipo === 'folga' || r.tipo === 'feriado';
                const rowBg = isDomingo ? 'bg-red-50 dark:bg-red-950/20' :
                              isSabado ? 'bg-blue-50 dark:bg-blue-950/20' :
                              isFolga ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                              r.origem === 'FIXADA' ? 'bg-green-50 dark:bg-green-950/10' : '';
                
                return (
                  <tr key={r.id} className={`border-b border-border/30 hover:bg-muted/20 ${rowBg}`}>
                    <td className="p-1 font-mono text-[10px]">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="p-1 text-[10px]">{r.dia_semana?.slice(0, 3) || DIAS_SEMANA[dow]?.slice(0, 3)}</td>
                    {/* Horários */}
                    {['entrada_1', 'saida_1', 'entrada_2', 'saida_2'].map(field => (
                      <td key={field} className="p-0.5">
                        <Input type="time" defaultValue={r[field] || ''}
                          className="h-6 text-[10px] w-[72px] text-center px-1"
                          onBlur={e => updateField(r.id, field, e.target.value)}
                        />
                      </td>
                    ))}
                    {/* Totais */}
                    <td className="p-1 text-center font-mono">{(r.horas_trabalhadas || 0).toFixed(2)}</td>
                    {['horas_extras_diarias', 'horas_extras_semanais', 'horas_extras_dsr', 'horas_noturnas', 'intervalo_suprimido'].map(field => (
                      <td key={field} className="p-0.5">
                        <Input type="number" step="0.01" defaultValue={r[field] || 0}
                          className="h-6 text-[10px] w-14 text-center mx-auto px-1"
                          onBlur={e => updateField(r.id, field, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                    <td className="p-0.5">
                      <Select defaultValue={r.tipo || 'normal'} onValueChange={v => updateField(r.id, 'tipo', v)}>
                        <SelectTrigger className="h-6 text-[9px] w-16 px-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="falta">Falta</SelectItem>
                          <SelectItem value="folga">Folga</SelectItem>
                          <SelectItem value="feriado">Feriado</SelectItem>
                          <SelectItem value="atestado">Atestado</SelectItem>
                          <SelectItem value="ferias">Férias</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Fixar Jornada */}
      <Dialog open={showFixar} onOpenChange={setShowFixar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixar Jornada no Mês</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Quando o juiz fixa a jornada, os horários são aplicados uniformemente a todos os dias úteis do mês.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Entrada 1</Label><Input type="time" value={jornadaFixa.entrada_1} onChange={e => setJornadaFixa(p => ({ ...p, entrada_1: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">Saída 1</Label><Input type="time" value={jornadaFixa.saida_1} onChange={e => setJornadaFixa(p => ({ ...p, saida_1: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">Entrada 2 (Intervalo)</Label><Input type="time" value={jornadaFixa.entrada_2} onChange={e => setJornadaFixa(p => ({ ...p, entrada_2: e.target.value }))} className="mt-1 h-8" /></div>
            <div><Label className="text-xs">Saída 2</Label><Input type="time" value={jornadaFixa.saida_2} onChange={e => setJornadaFixa(p => ({ ...p, saida_2: e.target.value }))} className="mt-1 h-8" /></div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Checkbox checked={jornadaFixa.sabado} onCheckedChange={v => setJornadaFixa(p => ({ ...p, sabado: !!v }))} />
            <Label className="text-xs">Incluir sábados</Label>
          </div>
          <DialogFooter>
            <Button onClick={fixarJornada} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Aplicar no Mês
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
