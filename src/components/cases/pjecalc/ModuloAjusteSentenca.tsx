import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Wand2, Play, Eye, AlertTriangle, Plus, Trash2,
  ChevronDown, ChevronUp, Scale, FileText, Clock
} from "lucide-react";
import {
  adjustWorktime, parseSentencaRegex,
  type SentencaRuleset, type DailyRecord, type AdjustmentResult, type ParsedRuleset, type WorktimeRule,
} from "@/lib/pjecalc/worktime-adjuster";

interface Props {
  caseId: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  cargaHoraria?: number;
}

const DIAS_LABELS = [
  { code: 'seg', label: 'Seg' },
  { code: 'ter', label: 'Ter' },
  { code: 'qua', label: 'Qua' },
  { code: 'qui', label: 'Qui' },
  { code: 'sex', label: 'Sex' },
  { code: 'sab', label: 'Sáb' },
  { code: 'dom', label: 'Dom' },
];

export function ModuloAjusteSentenca({ caseId, dataAdmissao, dataDemissao, cargaHoraria = 220 }: Props) {
  const qc = useQueryClient();
  const jornadaDiaria = cargaHoraria / (cargaHoraria > 44 ? 30 : (cargaHoraria > 40 ? 6 : 5));

  // State
  const [textoSentenca, setTextoSentenca] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedRuleset | null>(null);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<AdjustmentResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingRules, setEditingRules] = useState<WorktimeRule>({});
  const [editingName, setEditingName] = useState("Regra da Sentença");
  const [editingDays, setEditingDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [dateStart, setDateStart] = useState(dataAdmissao || "");
  const [dateEnd, setDateEnd] = useState(dataDemissao || "");

  // Load existing rulesets
  const { data: rulesets = [], isLoading: loadingRulesets } = useQuery({
    queryKey: ["sentenca_rulesets", caseId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as Record<string, unknown>)("sentenca_rulesets")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SentencaRuleset[];
    },
  });

  // Load daily records for preview
  const loadDailyRecords = useCallback(async (): Promise<DailyRecord[]> => {
    const { data, error } = await (supabase.from as Record<string, unknown>)("pjecalc_ponto_diario")
      .select("*")
      .eq("case_id", caseId)
      .order("data", { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      data: r.data,
      entrada_1: r.entrada_1 || '',
      saida_1: r.saida_1 || '',
      entrada_2: r.entrada_2 || '',
      saida_2: r.saida_2 || '',
      entrada_3: r.entrada_3 || '',
      saida_3: r.saida_3 || '',
      dia_semana: r.dia_semana,
      observacoes: r.observacoes,
    }));
  }, [caseId]);

  // Parse sentence with regex first, then AI fallback
  const handleParseSentenca = async () => {
    if (!textoSentenca.trim()) { toast.error("Cole o trecho da sentença."); return; }
    setParsing(true);
    try {
      // Try regex first
      const regexResult = parseSentencaRegex(textoSentenca);
      if (regexResult.confidence >= 0.8 && regexResult.detected_clauses.length > 0) {
        setParseResult(regexResult);
        setEditingRules(regexResult.rules);
        toast.success(`${regexResult.detected_clauses.length} regra(s) detectada(s) (regex)`);
      } else {
        // Fallback to AI
        const { data, error } = await supabase.functions.invoke('parse-sentenca-jornada', {
          body: { texto: textoSentenca },
        });
        if (error) throw error;
        const aiResult = data as ParsedRuleset;
        setParseResult(aiResult);
        setEditingRules(aiResult.rules);
        toast.success(`${aiResult.detected_clauses?.length || 0} regra(s) detectada(s) (IA)`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  // Preview adjustment
  const handlePreview = async (rulesetOverride?: SentencaRuleset[]) => {
    setApplying(true);
    try {
      const records = await loadDailyRecords();
      if (records.length === 0) { toast.error("Nenhum registro de ponto diário encontrado."); return; }

      const rulesToUse = rulesetOverride || [{
        id: 'preview',
        case_id: caseId,
        nome: editingName,
        rules: editingRules,
        date_range_start: dateStart || null,
        date_range_end: dateEnd || null,
        apply_days: editingDays,
        ativo: true,
      } as SentencaRuleset];

      const result = adjustWorktime(records, rulesToUse, jornadaDiaria);
      setPreview(result);
      setShowPreview(true);
      toast.success(`Prévia: ${result.summary.total_dias_ajustados} dias ajustados, ${result.summary.total_extras_horas.toFixed(2)}h extras`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  // Save ruleset
  const handleSaveRuleset = async () => {
    try {
      const { error } = await (supabase.from as Record<string, unknown>)("sentenca_rulesets").insert({
        case_id: caseId,
        nome: editingName,
        texto_sentenca: textoSentenca || null,
        rules: editingRules,
        date_range_start: dateStart || null,
        date_range_end: dateEnd || null,
        apply_days: editingDays,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["sentenca_rulesets", caseId] });
      toast.success("Regra salva com sucesso!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Apply and persist adjustments
  const handleApplyAll = async () => {
    setApplying(true);
    try {
      const records = await loadDailyRecords();
      if (records.length === 0) { toast.error("Nenhum registro de ponto."); return; }

      const activeRulesets = rulesets.filter(r => r.ativo);
      if (activeRulesets.length === 0) { toast.error("Nenhuma regra ativa."); return; }

      const result = adjustWorktime(records, activeRulesets, jornadaDiaria);

      // Persist to worktime_adjustments (upsert by case_id + data)
      for (const rec of result.records) {
        await (supabase.from as Record<string, unknown>)("worktime_adjustments").upsert({
          case_id: caseId,
          ponto_diario_id: rec.ponto_diario_id,
          data: rec.data,
          original_json: rec.original,
          adjusted_json: rec.adjusted,
          applied_rules: rec.applied_rules,
          horas_trabalhadas_original: rec.horas_trabalhadas_original,
          horas_trabalhadas_ajustadas: rec.horas_trabalhadas_ajustadas,
          extras_diarias: rec.extras_diarias,
          flags: rec.flags,
        }, { onConflict: 'case_id,data' });
      }

      setPreview(result);
      setShowPreview(true);
      toast.success(`${result.summary.total_dias_ajustados} dias ajustados e persistidos. Total HE: ${result.summary.total_extras_horas.toFixed(2)}h`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const deleteRuleset = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    await (supabase.from as Record<string, unknown>)("sentenca_rulesets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sentenca_rulesets", caseId] });
    toast.success("Regra excluída.");
  };

  const toggleDay = (code: string) => {
    setEditingDays(prev => prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5" /> Ajustes por Sentença
        </h2>
        {rulesets.length > 0 && (
          <Button onClick={handleApplyAll} disabled={applying} size="sm">
            {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Aplicar Tudo ({rulesets.filter(r => r.ativo).length} regras)
          </Button>
        )}
      </div>

      {/* Parser de Sentença */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Interpretar Sentença com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Cole aqui o trecho da sentença que define jornada, intervalos, horas extras..."
            value={textoSentenca}
            onChange={e => setTextoSentenca(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleParseSentenca} disabled={parsing} size="sm" variant="outline">
              {parsing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
              Interpretar
            </Button>
          </div>

          {/* Parse Result */}
          {parseResult && (
            <div className="p-3 rounded-md bg-muted/50 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={parseResult.confidence >= 0.8 ? "default" : "secondary"}>
                  Confiança: {(parseResult.confidence * 100).toFixed(0)}%
                </Badge>
                <span className="text-muted-foreground">
                  {parseResult.detected_clauses.length} cláusula(s) detectada(s)
                </span>
              </div>
              {parseResult.detected_clauses.map((c, i) => (
                <div key={i} className="p-2 rounded bg-background border text-xs">
                  <Badge variant="outline" className="mr-2">{c.type}</Badge>
                  <span className="font-medium">{c.minutes} min</span>
                  <span className="text-muted-foreground ml-2">"{c.text_span}"</span>
                </div>
              ))
              }
              {parseResult.warnings.length > 0 && (
                <div className="text-amber-600 flex items-start gap-1">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>{parseResult.warnings.join("; ")}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Configurar Regra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Nome da Regra</Label>
            <Input value={editingName} onChange={e => setEditingName(e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">+ Antes entrada (min)</Label>
              <Input
                type="number" min={0} step={1}
                value={editingRules.add_before_minutes ?? ""}
                onChange={e => setEditingRules(r => ({ ...r, add_before_minutes: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">+ Após saída (min)</Label>
              <Input
                type="number" min={0} step={1}
                value={editingRules.add_after_minutes ?? ""}
                onChange={e => setEditingRules(r => ({ ...r, add_after_minutes: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Intervalo fixo (min)</Label>
              <Input
                type="number" min={0} step={1}
                value={editingRules.fixed_break_minutes ?? ""}
                onChange={e => setEditingRules(r => ({ ...r, fixed_break_minutes: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-xs">Reduzir intervalo (min)</Label>
              <Input
                type="number" min={0} step={1}
                value={editingRules.reduce_break_minutes ?? ""}
                onChange={e => setEditingRules(r => ({ ...r, reduce_break_minutes: e.target.value ? Number(e.target.value) : null }))}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Período início</Label>
              <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Período fim</Label>
              <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Dias aplicáveis</Label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_LABELS.map(d => (
                <label key={d.code} className="flex items-center gap-1 text-xs cursor-pointer">
                  <Checkbox checked={editingDays.includes(d.code)} onCheckedChange={() => toggleDay(d.code)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handlePreview()} disabled={applying} size="sm" variant="outline">
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Pré-visualizar
            </Button>
            <Button onClick={handleSaveRuleset} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Salvar Regra
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rulesets */}
      {rulesets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Regras Salvas ({rulesets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rulesets.map(rs => (
              <div key={rs.id} className="p-3 rounded border bg-muted/30 text-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    {rs.nome}
                    <Badge variant={rs.ativo ? "default" : "secondary"} className="text-xs">
                      {rs.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                    {(rs.rules as WorktimeRule).add_before_minutes ? <span>+{(rs.rules as WorktimeRule).add_before_minutes}min antes</span> : null}
                    {(rs.rules as WorktimeRule).add_after_minutes ? <span>+{(rs.rules as WorktimeRule).add_after_minutes}min depois</span> : null}
                    {(rs.rules as WorktimeRule).fixed_break_minutes != null ? <span>Intervalo={(rs.rules as WorktimeRule).fixed_break_minutes}min</span> : null}
                    {(rs.rules as WorktimeRule).reduce_break_minutes ? <span>-{(rs.rules as WorktimeRule).reduce_break_minutes}min intervalo</span> : null}
                    {rs.date_range_start && <span>De: {rs.date_range_start}</span>}
                    {rs.date_range_end && <span>Até: {rs.date_range_end}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRuleset(rs.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview Results */}
      {showPreview && preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Resultado do Ajuste
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div className="p-2 rounded bg-muted/50">
                <div className="text-lg font-bold">{preview.summary.total_dias}</div>
                <div className="text-xs text-muted-foreground">Total Dias</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="text-lg font-bold">{preview.summary.total_dias_ajustados}</div>
                <div className="text-xs text-muted-foreground">Dias Ajustados</div>
              </div>
              <div className="p-2 rounded bg-primary/10 text-primary">
                <div className="text-lg font-bold">{preview.summary.total_extras_horas.toFixed(2)}h</div>
                <div className="text-xs">Total HE</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="text-lg font-bold">{preview.summary.total_delta_minutos}min</div>
                <div className="text-xs text-muted-foreground">Delta Total</div>
              </div>
              <div className={`p-2 rounded ${preview.summary.dias_inconsistentes > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/50'}`}>
                <div className="text-lg font-bold">{preview.summary.dias_inconsistentes}</div>
                <div className="text-xs">Inconsistências</div>
              </div>
            </div>

            {/* Inconsistencies */}
            {preview.inconsistencies.length > 0 && (
              <div className="p-3 rounded border border-destructive/30 bg-destructive/5 space-y-1">
                <div className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Dias com inconsistência
                </div>
                {preview.inconsistencies.map((inc, i) => (
                  <div key={i} className="text-xs text-muted-foreground">{inc.data}: {inc.motivo}</div>
                ))}
              </div>
            )}

            {/* Detail table (first 20) */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr className="bg-muted/50">
                    <th className="p-1.5 text-left font-medium">Data</th>
                    <th className="p-1.5 text-center font-medium">Entrada Orig.</th>
                    <th className="p-1.5 text-center font-medium">Saída Orig.</th>
                    <th className="p-1.5 text-center font-medium">Int. Orig.</th>
                    <th className="p-1.5 text-center font-medium">→ Entrada</th>
                    <th className="p-1.5 text-center font-medium">→ Saída</th>
                    <th className="p-1.5 text-center font-medium">→ Int.</th>
                    <th className="p-1.5 text-center font-medium">HT Orig.</th>
                    <th className="p-1.5 text-center font-medium">HT Ajust.</th>
                    <th className="p-1.5 text-center font-medium">HE</th>
                    <th className="p-1.5 text-center font-medium">Δmin</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.records.slice(0, 50).map((r, i) => (
                    <tr key={i} className={`border-b border-border/30 ${r.flags.length > 0 ? 'bg-destructive/5' : r.extras_diarias > 0 ? 'bg-primary/5' : ''}`}>
                      <td className="p-1.5 font-mono">{r.data}</td>
                      <td className="p-1.5 text-center">{r.original.entrada}</td>
                      <td className="p-1.5 text-center">{r.original.saida}</td>
                      <td className="p-1.5 text-center">{r.original.intervalo_minutos}</td>
                      <td className="p-1.5 text-center font-medium">{r.adjusted.entrada}</td>
                      <td className="p-1.5 text-center font-medium">{r.adjusted.saida}</td>
                      <td className="p-1.5 text-center font-medium">{r.adjusted.intervalo_minutos}</td>
                      <td className="p-1.5 text-center">{r.horas_trabalhadas_original.toFixed(2)}</td>
                      <td className="p-1.5 text-center font-medium">{r.horas_trabalhadas_ajustadas.toFixed(2)}</td>
                      <td className="p-1.5 text-center font-bold text-primary">{r.extras_diarias > 0 ? r.extras_diarias.toFixed(2) : '—'}</td>
                      <td className="p-1.5 text-center">{r.delta_minutos > 0 ? `+${r.delta_minutos}` : r.delta_minutos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.records.length > 50 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Mostrando 50 de {preview.records.length} registros
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
