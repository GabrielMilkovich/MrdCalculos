import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

// =====================================================
// MÓDULO PAGAMENTOS — baseado em Pagamento.java (PJe-Calc v2.15.1)
// Persiste em pjecalc_pagamentos.
// verba_base_id: select carregado de pjecalc_verba_base para o caso.
// documento_id: select carregado de documents para o caso.
// =====================================================

interface Props { caseId: string; }

type PagForm = {
  id?: string;
  competencia: string; // YYYY-MM-01
  valor: string;
  data_pagamento: string;
  tipo: string;
  descricao: string;
  documento_id: string;
  abatimento_global: boolean;
  verba_base_id: string;
};

const emptyPag = (): PagForm => ({
  competencia: "",
  valor: "",
  data_pagamento: "",
  tipo: "EMPREGADOR",
  descricao: "",
  documento_id: "",
  abatimento_global: false,
  verba_base_id: "",
});

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(n) ? n : 0);

export function ModuloPagamentos({ caseId }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PagForm>(emptyPag());
  const [saving, setSaving] = useState(false);

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ["pjecalc_pagamentos", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_pagamentos" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("competencia", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Opções para selects: verbas-base do caso e documentos do caso.
  const { data: verbasBase = [] } = useQuery({
    queryKey: ["pjecalc_verba_base_options", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_verba_base" as any)
        .select("id, nome, codigo")
        .eq("case_id", caseId)
        .order("ordem", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string | null; codigo: string | null }[];
    },
  });

  const { data: docOptions = [] } = useQuery({
    queryKey: ["case_documents_options", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, tipo")
        .eq("case_id", caseId)
        .order("uploaded_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as { id: string; file_name: string | null; tipo: string | null }[];
    },
  });

  const total = useMemo(() => {
    return pagamentos.reduce((acc: Decimal, p: any) => acc.plus(new Decimal(p.valor ?? 0)), new Decimal(0)).toDecimalPlaces(2).toNumber();
  }, [pagamentos]);

  const openNew = () => {
    setEditing(emptyPag());
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing({
      id: p.id,
      competencia: p.competencia ?? "",
      valor: p.valor?.toString() ?? "",
      data_pagamento: p.data_pagamento ?? "",
      tipo: p.tipo ?? "EMPREGADOR",
      descricao: p.descricao ?? "",
      documento_id: p.documento_id ?? "",
      abatimento_global: p.abatimento_global ?? false,
      verba_base_id: p.verba_base_id ?? "",
    });
    setDialogOpen(true);
  };

  const savePag = async () => {
    if (!editing.valor.trim()) {
      toast.error("Informe o valor do pagamento.");
      return;
    }
    setSaving(true);
    try {
      const valorN = new Decimal(editing.valor.replace(",", "."));
      const payload = {
        case_id: caseId,
        competencia: editing.competencia || null,
        valor: valorN.toNumber(),
        data_pagamento: editing.data_pagamento || null,
        tipo: editing.tipo,
        descricao: editing.descricao || null,
        documento_id: editing.documento_id || null,
        abatimento_global: editing.abatimento_global,
        verba_base_id: editing.verba_base_id || null,
      };
      if (editing.id) {
        const { error } = await supabase
          .from("pjecalc_pagamentos" as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pjecalc_pagamentos" as any)
          .insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_pagamentos", caseId] });
      toast.success(editing.id ? "Pagamento atualizado!" : "Pagamento adicionado!");
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deletePag = async (id: string) => {
    if (!confirm("Excluir este pagamento?")) return;
    try {
      const { error } = await fromUntyped("pjecalc_pagamentos").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_pagamentos", caseId] });
      toast.success("Pagamento excluído!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pagamentos / Abatimentos</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pagamentos Registrados ({pagamentos.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && pagamentos.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">Nenhum pagamento registrado.</p>
          )}
          {pagamentos.length > 0 && (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-1.5 text-left w-28">Competência</th>
                    <th className="p-1.5 text-left w-28">Data Pag.</th>
                    <th className="p-1.5 text-left">Descrição</th>
                    <th className="p-1.5 text-left w-24">Tipo</th>
                    <th className="p-1.5 text-center w-16">Global</th>
                    <th className="p-1.5 text-right w-28">Valor</th>
                    <th className="p-1.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-1.5">{p.competencia ?? "—"}</td>
                      <td className="p-1.5">{p.data_pagamento ?? "—"}</td>
                      <td className="p-1.5">{p.descricao ?? ""}</td>
                      <td className="p-1.5">{p.tipo}</td>
                      <td className="p-1.5 text-center">{p.abatimento_global ? "✓" : "—"}</td>
                      <td className="p-1.5 text-right font-mono">{fmtBRL(Number(p.valor ?? 0))}</td>
                      <td className="p-1.5 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePag(p.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-semibold">
                    <td className="p-1.5" colSpan={5}>Total</td>
                    <td className="p-1.5 text-right font-mono">{fmtBRL(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editing.id ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Competência (YYYY-MM-01)</Label>
              <Input type="date" value={editing.competencia} onChange={(e) => setEditing((p) => ({ ...p, competencia: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Data do Pagamento</Label>
              <Input type="date" value={editing.data_pagamento} onChange={(e) => setEditing((p) => ({ ...p, data_pagamento: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={editing.valor} onChange={(e) => setEditing((p) => ({ ...p, valor: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={editing.tipo} onValueChange={(v) => setEditing((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPREGADOR">Empregador</SelectItem>
                  <SelectItem value="PJE_PRECATORIO">PJe Precatório</SelectItem>
                  <SelectItem value="RPV">RPV</SelectItem>
                  <SelectItem value="ACORDO">Acordo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input value={editing.descricao} onChange={(e) => setEditing((p) => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Documento</Label>
              <Select
                value={editing.documento_id || "__none__"}
                onValueChange={(v) =>
                  setEditing((p) => ({ ...p, documento_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— sem documento —</SelectItem>
                  {docOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.file_name ?? d.id.slice(0, 8)}
                      {d.tipo ? ` (${d.tipo})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Verba Base</Label>
              <Select
                value={editing.verba_base_id || "__none__"}
                onValueChange={(v) =>
                  setEditing((p) => ({ ...p, verba_base_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— sem verba —</SelectItem>
                  {verbasBase.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.codigo ? `[${v.codigo}] ` : ""}{v.nome ?? v.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox checked={editing.abatimento_global} onCheckedChange={(v) => setEditing((p) => ({ ...p, abatimento_global: !!v }))} />
              <Label className="text-xs">Abatimento global (aplica ao total líquido)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={savePag} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
