import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Loader2, Search, Building2 } from "lucide-react";
import { GradeCSOcorrencias } from "./GradeCSOcorrencias";
import { CNAE_ALIQUOTAS_COMUNS } from "@/lib/pjecalc/engine-constants";
import type { PjeCNAEAliquotas } from "@/lib/pjecalc/engine-types";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloCS({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showCNAE, setShowCNAE] = useState(false);
  const [cnaeSearch, setCnaeSearch] = useState('');

  const { data } = useQuery({
    queryKey: ["pjecalc_cs_config", caseId],
    queryFn: () => svc.getCsConfig(caseId),
  });

  const [form, setForm] = useState({
    apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado', aliquota_segurado_fixa: '',
    limitar_teto: true, apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
    aliquota_empresa_fixa: '20', aliquota_sat_fixa: '2', aliquota_terceiros_fixa: '5.8',
    simples_nacional: false, simples_inicio: '', simples_fim: '',
    cnae: '',
    contribuicao_sindical: false,
    contribuicao_sindical_pos2017: false,
    // PJe-Calc oficial: 3 períodos avançados (opcionais — sobrescrevem SIMPLES)
    cs_devidos_data_inicial: '',
    cs_devidos_data_final: '',
    cs_pagos_data_inicial: '',
    cs_pagos_data_final: '',
    cs_mes_reclamacao: '',
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      const periodos = (d.periodos_simples as Array<{inicio: string; fim: string}>) || [];
      setForm({
        apurar_segurado: (d.apurar_segurado as boolean) ?? true, cobrar_reclamante: (d.cobrar_reclamante as boolean) ?? true,
        cs_sobre_salarios_pagos: (d.cs_sobre_salarios_pagos as boolean) ?? false,
        aliquota_segurado_tipo: (d.aliquota_segurado_tipo as string) || 'empregado',
        aliquota_segurado_fixa: d.aliquota_segurado_fixa?.toString() || '',
        limitar_teto: (d.limitar_teto as boolean) ?? true, apurar_empresa: (d.apurar_empresa as boolean) ?? true,
        apurar_sat: (d.apurar_sat as boolean) ?? true, apurar_terceiros: (d.apurar_terceiros as boolean) ?? true,
        aliquota_empresa_fixa: d.aliquota_empresa_fixa?.toString() || '20',
        aliquota_sat_fixa: d.aliquota_sat_fixa?.toString() || '2',
        aliquota_terceiros_fixa: d.aliquota_terceiros_fixa?.toString() || '5.8',
        simples_nacional: periodos.length > 0,
        simples_inicio: periodos[0]?.inicio || '',
        simples_fim: periodos[0]?.fim || '',
        cnae: (d.cnae as string) || '',
        contribuicao_sindical: (d.contribuicao_sindical as boolean) ?? false,
        contribuicao_sindical_pos2017: (d.contribuicao_sindical_pos2017 as boolean) ?? false,
        cs_devidos_data_inicial: (d.cs_devidos_data_inicial as string) || '',
        cs_devidos_data_final: (d.cs_devidos_data_final as string) || '',
        cs_pagos_data_inicial: (d.cs_pagos_data_inicial as string) || '',
        cs_pagos_data_final: (d.cs_pagos_data_final as string) || '',
        cs_mes_reclamacao: (d.cs_mes_reclamacao as string) || '',
      });
    }
  }, [data]);

  const filteredCNAE = useMemo(() => {
    if (!cnaeSearch) return CNAE_ALIQUOTAS_COMUNS;
    const s = cnaeSearch.toLowerCase();
    return CNAE_ALIQUOTAS_COMUNS.filter(c => c.cnae.includes(s) || c.descricao.toLowerCase().includes(s));
  }, [cnaeSearch]);

  const applyCNAE = (cnae: PjeCNAEAliquotas) => {
    setForm(p => ({ ...p, cnae: cnae.cnae, aliquota_sat_fixa: cnae.sat_rat.toString(), aliquota_terceiros_fixa: cnae.terceiros.toString() }));
    setShowCNAE(false);
    toast.success(`CNAE ${cnae.cnae} aplicado — SAT/RAT: ${cnae.sat_rat}%, Terceiros: ${cnae.terceiros}%`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const periodos_simples = form.simples_nacional && form.simples_inicio && form.simples_fim
        ? [{ inicio: form.simples_inicio, fim: form.simples_fim }] : [];
      await svc.upsertCsConfig({
        case_id: caseId, apurar_segurado: form.apurar_segurado, cobrar_reclamante: form.cobrar_reclamante,
        cs_sobre_salarios_pagos: form.cs_sobre_salarios_pagos, aliquota_segurado_tipo: form.aliquota_segurado_tipo,
        aliquota_segurado_fixa: form.aliquota_segurado_fixa ? parseFloat(form.aliquota_segurado_fixa) : null,
        limitar_teto: form.limitar_teto, apurar_empresa: form.apurar_empresa,
        apurar_sat: form.apurar_sat, apurar_terceiros: form.apurar_terceiros,
        aliquota_empresa_fixa: parseFloat(form.aliquota_empresa_fixa) || 20,
        aliquota_sat_fixa: parseFloat(form.aliquota_sat_fixa) || 2,
        aliquota_terceiros_fixa: parseFloat(form.aliquota_terceiros_fixa) || 5.8,
        periodos_simples, cnae: form.cnae || null,
        contribuicao_sindical: form.contribuicao_sindical,
        contribuicao_sindical_pos2017: form.contribuicao_sindical_pos2017,
        // PJe-Calc oficial: 3 períodos (Devidos, Pagos, Mês Reclamação) — opcionais
        cs_devidos_data_inicial: form.cs_devidos_data_inicial || null,
        cs_devidos_data_final: form.cs_devidos_data_final || null,
        cs_pagos_data_inicial: form.cs_pagos_data_inicial || null,
        cs_pagos_data_final: form.cs_pagos_data_final || null,
        cs_mes_reclamacao: form.cs_mes_reclamacao || null,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_cs_config", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Contribuição Social configurada!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contribuição Social</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Segurado (Empregado)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar_segurado} onCheckedChange={v => setForm(p => ({ ...p, apurar_segurado: !!v }))} /><Label className="text-xs">Apurar Contribuição do Segurado</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.cobrar_reclamante} onCheckedChange={v => setForm(p => ({ ...p, cobrar_reclamante: !!v }))} /><Label className="text-xs">Cobrar do Reclamante</Label></div>
          <div>
            <Label className="text-xs">Tipo Alíquota</Label>
            <Select value={form.aliquota_segurado_tipo} onValueChange={v => setForm(p => ({ ...p, aliquota_segurado_tipo: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empregado">Empregado (Progressiva EC 103/2019)</SelectItem>
                <SelectItem value="domestico">Doméstico</SelectItem>
                <SelectItem value="fixa">Fixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.aliquota_segurado_tipo === 'fixa' && (
            <div><Label className="text-xs">Alíquota Fixa (%)</Label><Input type="number" step="0.01" value={form.aliquota_segurado_fixa} onChange={e => setForm(p => ({ ...p, aliquota_segurado_fixa: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          )}
          <div className="flex items-center gap-2"><Checkbox checked={form.limitar_teto} onCheckedChange={v => setForm(p => ({ ...p, limitar_teto: !!v }))} /><Label className="text-xs">Limitar ao Teto do INSS</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.cs_sobre_salarios_pagos} onCheckedChange={v => setForm(p => ({ ...p, cs_sobre_salarios_pagos: !!v }))} /><Label className="text-xs">CS sobre Salários Pagos</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Empregador</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCNAE(true)}>
              <Building2 className="h-3.5 w-3.5 mr-1" /> Buscar CNAE
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.cnae && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              CNAE aplicado: <span className="font-mono font-medium">{form.cnae}</span>
              {' — '}{CNAE_ALIQUOTAS_COMUNS.find(c => c.cnae === form.cnae)?.descricao || ''}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2"><Checkbox checked={form.apurar_empresa} onCheckedChange={v => setForm(p => ({ ...p, apurar_empresa: !!v }))} /><Label className="text-xs">Empresa</Label></div>
              <Input type="number" step="0.01" value={form.aliquota_empresa_fixa} onChange={e => setForm(p => ({ ...p, aliquota_empresa_fixa: e.target.value }))} className="h-8 text-xs" placeholder="20%" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Checkbox checked={form.apurar_sat} onCheckedChange={v => setForm(p => ({ ...p, apurar_sat: !!v }))} /><Label className="text-xs">SAT/RAT</Label></div>
              <Input type="number" step="0.01" value={form.aliquota_sat_fixa} onChange={e => setForm(p => ({ ...p, aliquota_sat_fixa: e.target.value }))} className="h-8 text-xs" placeholder="2%" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Checkbox checked={form.apurar_terceiros} onCheckedChange={v => setForm(p => ({ ...p, apurar_terceiros: !!v }))} /><Label className="text-xs">Terceiros</Label></div>
              <Input type="number" step="0.01" value={form.aliquota_terceiros_fixa} onChange={e => setForm(p => ({ ...p, aliquota_terceiros_fixa: e.target.value }))} className="h-8 text-xs" placeholder="5.8%" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Simples Nacional</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.simples_nacional} onCheckedChange={v => setForm(p => ({ ...p, simples_nacional: !!v }))} /><Label className="text-xs">Empresa optante do Simples Nacional (isenta CS patronal)</Label></div>
          {form.simples_nacional && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Início do Simples</Label><Input type="date" value={form.simples_inicio} onChange={e => setForm(p => ({ ...p, simples_inicio: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Fim do Simples</Label><Input type="date" value={form.simples_fim} onChange={e => setForm(p => ({ ...p, simples_fim: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Contribuição Sindical (Art. 578-579 CLT)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.contribuicao_sindical} onCheckedChange={v => setForm(p => ({ ...p, contribuicao_sindical: !!v }))} /><Label className="text-xs">Apurar Contribuição Sindical (pré-Nov/2017 — obrigatória, 1 dia de salário por ano em março)</Label></div>
          {form.contribuicao_sindical && (
            <div className="flex items-center gap-2 ml-5"><Checkbox checked={form.contribuicao_sindical_pos2017} onCheckedChange={v => setForm(p => ({ ...p, contribuicao_sindical_pos2017: !!v }))} /><Label className="text-xs">Incluir também anos pós-Nov/2017 (facultativa — Lei 13.467/2017 — requer autorização do empregado)</Label></div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="periodos-avancados" className="border-none">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                Períodos avançados (PJe-Calc oficial)
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Campos opcionais conforme tela oficial do PJe-Calc. Quando preenchidos, sobrescrevem o intervalo
                  simples Início/Fim usado para retrocompatibilidade.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Sobre Salários Devidos</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data inicial</Label>
                      <Input
                        type="date"
                        value={form.cs_devidos_data_inicial}
                        onChange={e => setForm(p => ({ ...p, cs_devidos_data_inicial: e.target.value }))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Data final</Label>
                      <Input
                        type="date"
                        value={form.cs_devidos_data_final}
                        onChange={e => setForm(p => ({ ...p, cs_devidos_data_final: e.target.value }))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Sobre Salários Pagos</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data inicial</Label>
                      <Input
                        type="date"
                        value={form.cs_pagos_data_inicial}
                        onChange={e => setForm(p => ({ ...p, cs_pagos_data_inicial: e.target.value }))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Data final</Label>
                      <Input
                        type="date"
                        value={form.cs_pagos_data_final}
                        onChange={e => setForm(p => ({ ...p, cs_pagos_data_final: e.target.value }))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Mês da Reclamação</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={form.cs_mes_reclamacao}
                        onChange={e => setForm(p => ({ ...p, cs_mes_reclamacao: e.target.value }))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      <GradeCSOcorrencias caseId={caseId} />

      <Dialog open={showCNAE} onOpenChange={setShowCNAE}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Buscar CNAE — Atividade Econômica</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código ou descrição..." value={cnaeSearch} onChange={e => setCnaeSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredCNAE.map(c => (
              <button key={c.cnae} onClick={() => applyCNAE(c)}
                className="w-full text-left p-2 rounded hover:bg-muted/50 flex items-center justify-between text-xs border border-transparent hover:border-border transition-colors">
                <div>
                  <span className="font-mono font-medium">{c.cnae}</span>
                  <span className="ml-2 text-muted-foreground">{c.descricao}</span>
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                  <span>SAT: {c.sat_rat}%</span>
                  <span>Terc: {c.terceiros}%</span>
                </div>
              </button>
            ))}
            {filteredCNAE.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-4">Nenhum CNAE encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
