import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  BASES_TABELADAS,
  HIST_SALARIAL_NOMES,
  COMPORTAMENTOS_REFLEXO,
  FRACAO_MES_MODOS,
} from "@/lib/pjecalc/rubricas-oficiais";
import { CatalogoCombobox } from "./CatalogoCombobox";

// =====================================================
// MÓDULO VERBAS — CRUD de VerbaDeCalculo (PJe-Calc v2.15.1 / VerbaDeCalculo.java)
// Persiste em pjecalc_verba_base.
// hist_salarial_nome / base_tabelada: combobox sobre catálogo oficial,
// com fallback para digitação livre via "Outro (digitar manualmente)".
// =====================================================

interface Props { caseId: string; }

type VerbaForm = {
  id?: string;
  nome: string;
  codigo: string;
  caracteristica: string;
  periodo_inicio: string;
  periodo_fim: string;
  ocorrencia_pagamento: string;
  incide_inss: boolean;
  incide_fgts: boolean;
  incide_ir: boolean;
  tipo_variacao: string;
  multiplicador: string;
  divisor: string;
  quantidade_valor: string;
  base_tabelada: string;
  hist_salarial_nome: string;
  compor_principal: boolean;
  dobrar_valor_devido: boolean;
  ativa: boolean;
  excluir_falta_justificada: boolean;
  excluir_falta_nao_justificada: boolean;
  excluir_ferias_gozadas: boolean;
  comportamento_reflexo: string;
  periodo_media_reflexo: string;
  fracao_mes_modo: string;
  ordem: string;
  observacoes: string;
};

const emptyVerba = (): VerbaForm => ({
  nome: "",
  codigo: "",
  caracteristica: "COMUM",
  periodo_inicio: "",
  periodo_fim: "",
  ocorrencia_pagamento: "MENSAL",
  incide_inss: true,
  incide_fgts: true,
  incide_ir: true,
  tipo_variacao: "FIXA",
  multiplicador: "1",
  divisor: "1",
  quantidade_valor: "",
  base_tabelada: "",
  hist_salarial_nome: "",
  compor_principal: true,
  dobrar_valor_devido: false,
  ativa: true,
  excluir_falta_justificada: false,
  excluir_falta_nao_justificada: false,
  excluir_ferias_gozadas: false,
  comportamento_reflexo: "",
  periodo_media_reflexo: "",
  fracao_mes_modo: "",
  ordem: "0",
  observacoes: "",
});

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(n as number) ? (n as number) : 0);

export function ModuloVerbasCadastro({ caseId }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VerbaForm>(emptyVerba());
  const [saving, setSaving] = useState(false);

  const { data: verbas = [], isLoading } = useQuery({
    queryKey: ["pjecalc_verba_base", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_verba_base")
        .select("*")
        .eq("case_id", caseId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown[];
    },
  });

  const openNew = () => {
    setEditing(emptyVerba());
    setDialogOpen(true);
  };

  const openEdit = (v: any) => {
    setEditing({
      id: v.id,
      nome: v.nome ?? "",
      codigo: v.codigo ?? "",
      caracteristica: v.caracteristica ?? "COMUM",
      periodo_inicio: v.periodo_inicio ?? "",
      periodo_fim: v.periodo_fim ?? "",
      ocorrencia_pagamento: v.ocorrencia_pagamento ?? "MENSAL",
      incide_inss: v.incide_inss ?? true,
      incide_fgts: v.incide_fgts ?? true,
      incide_ir: v.incide_ir ?? true,
      tipo_variacao: v.tipo_variacao ?? "FIXA",
      multiplicador: v.multiplicador?.toString() ?? "1",
      divisor: v.divisor?.toString() ?? "1",
      quantidade_valor: v.quantidade_valor?.toString() ?? "",
      base_tabelada: v.base_tabelada ?? "",
      hist_salarial_nome: v.hist_salarial_nome ?? "",
      compor_principal: v.compor_principal ?? true,
      dobrar_valor_devido: v.dobrar_valor_devido ?? false,
      ativa: v.ativa ?? true,
      excluir_falta_justificada: v.excluir_falta_justificada ?? false,
      excluir_falta_nao_justificada: v.excluir_falta_nao_justificada ?? false,
      excluir_ferias_gozadas: v.excluir_ferias_gozadas ?? false,
      comportamento_reflexo: v.comportamento_reflexo ?? "",
      periodo_media_reflexo: v.periodo_media_reflexo ?? "",
      fracao_mes_modo: v.fracao_mes_modo ?? "",
      ordem: v.ordem?.toString() ?? "0",
      observacoes: v.observacoes ?? "",
    });
    setDialogOpen(true);
  };

  const toNumOrNull = (v: string) => {
    if (!v || v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const toIntOrNull = (v: string) => {
    if (!v || v.trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const saveVerba = async () => {
    if (!editing.nome.trim()) {
      toast.error("Informe o nome da verba.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        nome: editing.nome,
        codigo: editing.codigo || null,
        caracteristica: editing.caracteristica,
        periodo_inicio: editing.periodo_inicio || null,
        periodo_fim: editing.periodo_fim || null,
        ocorrencia_pagamento: editing.ocorrencia_pagamento,
        incide_inss: editing.incide_inss,
        incide_fgts: editing.incide_fgts,
        incide_ir: editing.incide_ir,
        tipo_variacao: editing.tipo_variacao,
        multiplicador: toNumOrNull(editing.multiplicador),
        divisor: toNumOrNull(editing.divisor),
        quantidade_valor: toNumOrNull(editing.quantidade_valor),
        base_tabelada: editing.base_tabelada || null,
        hist_salarial_nome: editing.hist_salarial_nome || null,
        compor_principal: editing.compor_principal,
        dobrar_valor_devido: editing.dobrar_valor_devido,
        ativa: editing.ativa,
        excluir_falta_justificada: editing.excluir_falta_justificada,
        excluir_falta_nao_justificada: editing.excluir_falta_nao_justificada,
        excluir_ferias_gozadas: editing.excluir_ferias_gozadas,
        comportamento_reflexo: editing.comportamento_reflexo || null,
        periodo_media_reflexo: editing.periodo_media_reflexo || null,
        fracao_mes_modo: editing.fracao_mes_modo || null,
        ordem: toIntOrNull(editing.ordem) ?? 0,
        observacoes: editing.observacoes || null,
      };
      if (editing.id) {
        const { error } = await fromUntyped("pjecalc_verba_base")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await fromUntyped("pjecalc_verba_base")
          .insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_verba_base", caseId] });
      toast.success(editing.id ? "Verba atualizada!" : "Verba criada!");
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVerba = async (id: string) => {
    if (!confirm("Excluir esta verba?")) return;
    try {
      const { error } = await fromUntyped("pjecalc_verba_base").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_verba_base", caseId] });
      toast.success("Verba excluída!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verbas (Cadastro)</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Verba
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Verbas Cadastradas ({verbas.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && verbas.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">Nenhuma verba cadastrada. Clique em "Nova Verba" para incluir.</p>
          )}
          {verbas.length > 0 && (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-1.5 text-left w-10">Ordem</th>
                    <th className="p-1.5 text-left">Nome</th>
                    <th className="p-1.5 text-left">Característica</th>
                    <th className="p-1.5 text-left">Ocorrência</th>
                    <th className="p-1.5 text-left w-24">Período</th>
                    <th className="p-1.5 text-right w-28">Valor</th>
                    <th className="p-1.5 text-center w-16">Ativa</th>
                    <th className="p-1.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {verbas.map((v: any) => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-1.5">{v.ordem ?? 0}</td>
                      <td className="p-1.5 font-medium">{v.nome}</td>
                      <td className="p-1.5">{v.caracteristica}</td>
                      <td className="p-1.5">{v.ocorrencia_pagamento}</td>
                      <td className="p-1.5">{v.periodo_inicio ?? "—"} → {v.periodo_fim ?? "—"}</td>
                      <td className="p-1.5 text-right font-mono">{fmtBRL(v.quantidade_valor)}</td>
                      <td className="p-1.5 text-center">{v.ativa ? "✓" : "—"}</td>
                      <td className="p-1.5 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(v)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteVerba(v.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editing.id ? "Editar Verba" : "Nova Verba"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input value={editing.nome} onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Código</Label>
                <Input value={editing.codigo} onChange={(e) => setEditing((p) => ({ ...p, codigo: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Característica</Label>
                <Select value={editing.caracteristica} onValueChange={(v) => setEditing((p) => ({ ...p, caracteristica: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMUM">Comum</SelectItem>
                    <SelectItem value="DECIMO_TERCEIRO_SALARIO">13º Salário</SelectItem>
                    <SelectItem value="FERIAS">Férias</SelectItem>
                    <SelectItem value="AVISO_PREVIO">Aviso Prévio</SelectItem>
                    <SelectItem value="SALARIO">Salário</SelectItem>
                    <SelectItem value="HORAS_EXTRAS">Horas Extras</SelectItem>
                    <SelectItem value="ADICIONAL">Adicional</SelectItem>
                    <SelectItem value="REFLEXO">Reflexo</SelectItem>
                    <SelectItem value="INDENIZACAO">Indenização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ocorrência Pagamento</Label>
                <Select value={editing.ocorrencia_pagamento} onValueChange={(v) => setEditing((p) => ({ ...p, ocorrencia_pagamento: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="DEZEMBRO">Dezembro</SelectItem>
                    <SelectItem value="DESLIGAMENTO">Desligamento</SelectItem>
                    <SelectItem value="PERIODO_AQUISITIVO">Período Aquisitivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de Variação</Label>
                <Select value={editing.tipo_variacao} onValueChange={(v) => setEditing((p) => ({ ...p, tipo_variacao: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXA">Fixa</SelectItem>
                    <SelectItem value="VARIAVEL">Variável</SelectItem>
                    <SelectItem value="INFORMADA">Informada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Período Início</Label>
                <Input type="date" value={editing.periodo_inicio} onChange={(e) => setEditing((p) => ({ ...p, periodo_inicio: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Período Fim</Label>
                <Input type="date" value={editing.periodo_fim} onChange={(e) => setEditing((p) => ({ ...p, periodo_fim: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editing.ordem} onChange={(e) => setEditing((p) => ({ ...p, ordem: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Multiplicador</Label>
                <Input type="number" step="0.0001" value={editing.multiplicador} onChange={(e) => setEditing((p) => ({ ...p, multiplicador: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Divisor</Label>
                <Input type="number" step="0.0001" value={editing.divisor} onChange={(e) => setEditing((p) => ({ ...p, divisor: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Quantidade / Valor</Label>
                <Input type="number" step="0.01" value={editing.quantidade_valor} onChange={(e) => setEditing((p) => ({ ...p, quantidade_valor: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Base Tabelada</Label>
                <CatalogoCombobox
                  value={editing.base_tabelada}
                  onChange={(v) => setEditing((p) => ({ ...p, base_tabelada: v }))}
                  options={BASES_TABELADAS}
                  placeholder="Selecione a base..."
                />
              </div>
              <div>
                <Label className="text-xs">Histórico Salarial</Label>
                <CatalogoCombobox
                  value={editing.hist_salarial_nome}
                  onChange={(v) => setEditing((p) => ({ ...p, hist_salarial_nome: v }))}
                  options={HIST_SALARIAL_NOMES}
                  placeholder="Selecione a rubrica..."
                />
              </div>
              <div>
                <Label className="text-xs">Comportamento Reflexo</Label>
                <CatalogoCombobox
                  value={editing.comportamento_reflexo}
                  onChange={(v) => setEditing((p) => ({ ...p, comportamento_reflexo: v }))}
                  options={COMPORTAMENTOS_REFLEXO}
                  placeholder="Comum (default)"
                />
              </div>
              <div>
                <Label className="text-xs">Período Média Reflexo</Label>
                <Input value={editing.periodo_media_reflexo} onChange={(e) => setEditing((p) => ({ ...p, periodo_media_reflexo: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 12m" />
              </div>
              <div>
                <Label className="text-xs">Fração Mês Modo</Label>
                <CatalogoCombobox
                  value={editing.fracao_mes_modo}
                  onChange={(v) => setEditing((p) => ({ ...p, fracao_mes_modo: v }))}
                  options={FRACAO_MES_MODOS}
                  placeholder="30 dias (default)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border-t pt-3">
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.incide_inss} onCheckedChange={(v) => setEditing((p) => ({ ...p, incide_inss: !!v }))} /> Incide INSS</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.incide_fgts} onCheckedChange={(v) => setEditing((p) => ({ ...p, incide_fgts: !!v }))} /> Incide FGTS</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.incide_ir} onCheckedChange={(v) => setEditing((p) => ({ ...p, incide_ir: !!v }))} /> Incide IR</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.compor_principal} onCheckedChange={(v) => setEditing((p) => ({ ...p, compor_principal: !!v }))} /> Compor principal</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.dobrar_valor_devido} onCheckedChange={(v) => setEditing((p) => ({ ...p, dobrar_valor_devido: !!v }))} /> Dobrar valor devido</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.ativa} onCheckedChange={(v) => setEditing((p) => ({ ...p, ativa: !!v }))} /> Ativa</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.excluir_falta_justificada} onCheckedChange={(v) => setEditing((p) => ({ ...p, excluir_falta_justificada: !!v }))} /> Excluir falta justificada</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.excluir_falta_nao_justificada} onCheckedChange={(v) => setEditing((p) => ({ ...p, excluir_falta_nao_justificada: !!v }))} /> Excluir falta não justificada</label>
              <label className="flex items-center gap-2 text-xs"><Checkbox checked={editing.excluir_ferias_gozadas} onCheckedChange={(v) => setEditing((p) => ({ ...p, excluir_ferias_gozadas: !!v }))} /> Excluir férias gozadas</label>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={editing.observacoes} onChange={(e) => setEditing((p) => ({ ...p, observacoes: e.target.value }))} className="text-xs min-h-[60px]" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={saveVerba} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
