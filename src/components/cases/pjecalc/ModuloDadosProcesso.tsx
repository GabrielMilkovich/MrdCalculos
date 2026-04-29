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
import { Save, Loader2, AlertTriangle, Search } from "lucide-react";

interface Props { caseId: string; }

export function ModuloDadosProcesso({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ field: string; label: string; valorManual: string; valorImportado: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_dados_processo" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as unknown as Record<string, unknown> | null;
    },
  });

  // Load params to detect date conflicts with imported data
  const { data: paramsData } = useQuery({
    queryKey: ["pjecalc_parametros_conflict", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_parametros" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as unknown as Record<string, unknown> | null;
    },
  });

  const [citacaoEnabled, setCitacaoEnabled] = useState(false);

  // Persist citação toggle state via modo_calculo field
  useEffect(() => {
    if (data) {
      // Default is independent; only enable assisted when explicitly set
      setCitacaoEnabled(data.modo_calculo === 'assisted_from_pjc');
    }
  }, [data]);
  const [buscandoCitacao, setBuscandoCitacao] = useState(false);
  const [form, setForm] = useState({
    numero_processo: '', vara: '', comarca: '', uf: 'SP', tipo_acao: 'trabalhista',
    rito: 'ordinario', fase: 'conhecimento', data_distribuicao: '', data_citacao: '',
    data_transito: '', juiz: '', reclamante_nome: '', reclamante_cpf: '',
    reclamada_nome: '', reclamada_cnpj: '', objeto: '',
    dia_fechamento_mes: '31', prazo_ferias_proporcional: '30',
    inicio_ferias_coletivas: '', instancia: 'PRIMEIRA', tipo_calculo: 'LIQUIDACAO',
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

  const buscarCitacaoDatajud = async () => {
    const numeroProcesso = form.numero_processo?.trim();
    if (!numeroProcesso) {
      toast.error("Informe o número do processo antes de buscar no Datajud.");
      return;
    }
    setBuscandoCitacao(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke("buscar-citacao-datajud", {
        body: { numero_processo: numeroProcesso },
      });
      if (error) throw new Error(error.message);
      if (fnData?.erro) {
        toast.warning(`Datajud: ${fnData.erro}`);
        return;
      }
      if (fnData?.data_citacao) {
        setForm(p => ({ ...p, data_citacao: fnData.data_citacao }));
        setCitacaoEnabled(true);
        toast.success(`Data de citação encontrada no Datajud: ${fnData.data_citacao}`);
        if (fnData.aviso) toast.warning(fnData.aviso);
      } else {
        toast.warning(fnData?.aviso ?? "Data de citação não encontrada no Datajud para este processo.");
      }
    } catch (e) {
      toast.error(`Erro ao buscar no Datajud: ${(e as Error).message}`);
    } finally {
      setBuscandoCitacao(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        ...form,
        // Persist ADC 58 toggle: 'independent' means disabled, 'assisted_from_pjc' means enabled
        modo_calculo: citacaoEnabled ? 'assisted_from_pjc' : 'independent',
      };
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
        value={(form as Record<string, string>)[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className={cn("mt-1 h-8 text-xs", required && !(form as Record<string, string>)[key] && "border-destructive/50")}
      />
      {required && !(form as Record<string, string>)[key] && (
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
            <div className="flex gap-1.5">
              <Input
                type="date"
                disabled={!citacaoEnabled}
                value={form.data_citacao || ''}
                onChange={e => setForm(p => ({ ...p, data_citacao: e.target.value }))}
                className={cn("h-8 text-xs flex-1", !citacaoEnabled && "opacity-50", citacaoEnabled && !form.data_citacao && "border-destructive/50")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-[10px] shrink-0"
                disabled={!form.numero_processo || buscandoCitacao}
                onClick={buscarCitacaoDatajud}
                title="Buscar data de citação no Datajud (CNJ)"
              >
                {buscandoCitacao ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
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
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações do Cálculo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Dia fechamento mês</Label>
            <Input type="number" min={1} max={31} className="mt-1 h-8 text-xs" value={form.dia_fechamento_mes} onChange={e => setForm(p => ({ ...p, dia_fechamento_mes: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Prazo férias proporcional (Art. 130)</Label>
            <Select value={form.prazo_ferias_proporcional} onValueChange={v => setForm(p => ({ ...p, prazo_ferias_proporcional: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias (até 5 faltas)</SelectItem>
                <SelectItem value="24">24 dias (6-14 faltas)</SelectItem>
                <SelectItem value="18">18 dias (15-23 faltas)</SelectItem>
                <SelectItem value="12">12 dias (24-32 faltas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f("inicio_ferias_coletivas", "Férias coletivas (início)", "date")}
          <div>
            <Label className="text-xs">Instância</Label>
            <Select value={form.instancia} onValueChange={v => setForm(p => ({ ...p, instancia: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMEIRA">1ª Instância</SelectItem>
                <SelectItem value="SEGUNDA">2ª Instância</SelectItem>
                <SelectItem value="TST">TST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de cálculo</Label>
            <Select value={form.tipo_calculo} onValueChange={v => setForm(p => ({ ...p, tipo_calculo: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LIQUIDACAO">Liquidação</SelectItem>
                <SelectItem value="ATUALIZACAO">Atualização</SelectItem>
                <SelectItem value="PRECATORIO">Precatório</SelectItem>
                <SelectItem value="RPV">RPV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
