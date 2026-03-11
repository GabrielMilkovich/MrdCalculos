import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Save, Loader2, AlertTriangle } from "lucide-react";

interface Props { caseId: string; }

export function ModuloDadosProcesso({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ field: string; label: string; valorManual: string; valorImportado: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_dados_processo" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  // Load params to detect date conflicts with imported data
  const { data: paramsData } = useQuery({
    queryKey: ["pjecalc_parametros_conflict", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_parametros" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [citacaoEnabled, setCitacaoEnabled] = useState(true);
  const [form, setForm] = useState({
    numero_processo: '', vara: '', comarca: '', uf: 'SP', tipo_acao: 'trabalhista',
    rito: 'ordinario', fase: 'conhecimento', data_distribuicao: '', data_citacao: '',
    data_transito: '', juiz: '', reclamante_nome: '', reclamante_cpf: '',
    reclamada_nome: '', reclamada_cnpj: '', objeto: '',
  });

  useEffect(() => {
    if (data) setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in prev && v != null)) }));
  }, [data]);

  // Detect date conflicts when data loads from both sources
  useEffect(() => {
    if (!data || !paramsData) return;
    const conflictFields = [
      { field: 'data_citacao', dpField: 'data_citacao', paramField: 'data_ajuizamento', label: 'Data de Ajuizamento' },
    ];
    // Check if imported documento has a different date than manually entered params
    if (data.data_citacao && paramsData.data_ajuizamento && data.data_citacao !== paramsData.data_ajuizamento) {
      // Only show if both are non-empty and different
      setConflictModal({
        field: 'data_ajuizamento',
        label: 'Data de Ajuizamento',
        valorManual: paramsData.data_ajuizamento,
        valorImportado: data.data_citacao,
      });
    }
  }, [data, paramsData]);

  const resolveConflict = async (useImported: boolean) => {
    if (!conflictModal) return;
    if (useImported) {
      // Update params with imported value
      await supabase.from("pjecalc_parametros" as any)
        .update({ [conflictModal.field]: conflictModal.valorImportado })
        .eq("case_id", caseId);
      qc.invalidateQueries({ queryKey: ["pjecalc_parametros_conflict", caseId] });
      toast.success(`${conflictModal.label} atualizada com o valor do documento importado.`);
    } else {
      toast.info(`Mantido o valor digitado manualmente para ${conflictModal.label}.`);
    }
    setConflictModal(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { case_id: caseId, ...form };
      if (data?.id) {
        await supabase.from("pjecalc_dados_processo" as any).update(payload).eq("id", data.id);
      } else {
        await supabase.from("pjecalc_dados_processo" as any).insert(payload);
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_dados_processo", caseId] });
      toast.success("Dados do processo salvos!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const f = (key: string, label: string, type = "text", required = false) => (
    <div>
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        type={type}
        value={(form as any)[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className={cn("mt-1 h-8 text-xs", required && !(form as any)[key] && "border-destructive/50")}
      />
      {required && !(form as any)[key] && (
        <p className="text-[10px] text-destructive mt-0.5">Obrigatório para liquidação</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Date Conflict Modal */}
      <Dialog open={!!conflictModal} onOpenChange={() => setConflictModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Conflito de Datas Detectado
            </DialogTitle>
          </DialogHeader>
          {conflictModal && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A <strong>{conflictModal.label}</strong> do documento importado é diferente da digitada manualmente. Qual deve prevalecer?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => resolveConflict(false)}>
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">Digitado Manualmente</div>
                    <div className="font-mono font-bold text-sm">{conflictModal.valorManual}</div>
                    <Button variant="outline" size="sm" className="mt-2 w-full">Manter</Button>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => resolveConflict(true)}>
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">Documento Importado</div>
                    <div className="font-mono font-bold text-sm">{conflictModal.valorImportado}</div>
                    <Button variant="default" size="sm" className="mt-2 w-full">Usar Este</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dados do Processo</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {f("numero_processo", "Nº Processo")}
          {f("vara", "Vara")}
          {f("comarca", "Comarca")}
          <div>
            <Label className="text-xs">UF</Label>
            <Select value={form.uf} onValueChange={v => setForm(p => ({ ...p, uf: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Rito</Label>
            <Select value={form.rito} onValueChange={v => setForm(p => ({ ...p, rito: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinario">Ordinário</SelectItem>
                <SelectItem value="sumarissimo">Sumaríssimo</SelectItem>
                <SelectItem value="sumario">Sumário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fase</Label>
            <Select value={form.fase} onValueChange={v => setForm(p => ({ ...p, fase: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conhecimento">Conhecimento</SelectItem>
                <SelectItem value="liquidacao">Liquidação</SelectItem>
                <SelectItem value="execucao">Execução</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datas Processuais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {f("data_distribuicao", "Distribuição", "date")}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">
                Citação (ADC 58)
                {citacaoEnabled && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{citacaoEnabled ? "Ativo" : "Inativo"}</span>
                <Switch checked={citacaoEnabled} onCheckedChange={setCitacaoEnabled} className="scale-75" />
              </div>
            </div>
            <Input
              type="date"
              disabled={!citacaoEnabled}
              value={form.data_citacao || ''}
              onChange={e => setForm(p => ({ ...p, data_citacao: e.target.value }))}
              className={cn("h-8 text-xs", !citacaoEnabled && "opacity-50", citacaoEnabled && !form.data_citacao && "border-destructive/50")}
            />
            {citacaoEnabled && !form.data_citacao && (
              <p className="text-[10px] text-destructive mt-0.5">Obrigatório para liquidação</p>
            )}
            {!citacaoEnabled && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Citação desabilitada para este cálculo</p>
            )}
          </div>
          {f("data_transito", "Trânsito em Julgado", "date")}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Partes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {f("reclamante_nome", "Reclamante")}
          {f("reclamante_cpf", "CPF Reclamante")}
          {f("reclamada_nome", "Reclamada")}
          {f("reclamada_cnpj", "CNPJ Reclamada")}
          {f("juiz", "Juiz")}
        </CardContent>
      </Card>
    </div>
  );
}
