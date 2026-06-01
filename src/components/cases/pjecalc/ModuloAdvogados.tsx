import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";
import { formatarCPF, formatarCNPJ } from "@/lib/validadores";
import {
  advogadoSchema, TIPO_DOC_ADVOGADO, type TipoDocAdvogado,
} from "./advogado-schema";

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface Props { caseId: string; }

type NewAdv = {
  nome: string;
  oab: string;
  oab_uf: string;
  tipo_documento: TipoDocAdvogado;
  numero_documento: string;
};

const emptyAdv: NewAdv = { nome: '', oab: '', oab_uf: 'SP', tipo_documento: 'CPF', numero_documento: '' };

function mascararDoc(valor: string, tipo: TipoDocAdvogado): string {
  if (tipo === "CPF") return formatarCPF(valor);
  if (tipo === "CNPJ") return formatarCNPJ(valor);
  return valor.replace(/\D+/g, "").slice(0, 14);
}

export function ModuloAdvogados({ caseId }: Props) {
  const qc = useQueryClient();
  const { data: advogados = [] } = useQuery({
    queryKey: ["pjecalc_advogados", caseId],
    queryFn: () => svc.getAdvogados(caseId),
  });

  const [adding, setAdding] = useState<'RECLAMANTE' | 'RECLAMADO' | null>(null);
  const [newAdv, setNewAdv] = useState<NewAdv>(emptyAdv);

  const handleAdd = async (representa: 'RECLAMANTE' | 'RECLAMADO') => {
    // Validação de paridade (Advogado.validar): Nome obrigatório; doc por tipo se
    // preenchido; OAB nunca valida.
    const parsed = advogadoSchema.safeParse({ ...newAdv, representa });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Advogado inválido.");
      return;
    }
    try {
      await svc.insertAdvogado({
        calculo_id: caseId,
        nome: newAdv.nome.trim(),
        oab: newAdv.oab.trim(),
        oab_uf: newAdv.oab_uf,
        tipo_documento: newAdv.tipo_documento,
        numero_documento: newAdv.numero_documento.trim() || null,
        representa,
      });
      qc.invalidateQueries({ queryKey: ["pjecalc_advogados", caseId] });
      setNewAdv(emptyAdv);
      setAdding(null);
      toast.success("Advogado adicionado");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao adicionar");
    }
  };

  const handleDelete = async (id: string) => {
    await svc.deleteAdvogado(id);
    qc.invalidateQueries({ queryKey: ["pjecalc_advogados", caseId] });
    toast.success("Advogado removido");
  };

  const renderLista = (titulo: string, representa: 'RECLAMANTE' | 'RECLAMADO') => {
    const lista = advogados.filter(a => a.representa === representa);
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">{titulo}</Label>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setNewAdv(emptyAdv); setAdding(representa); }}>
            <Plus className="h-3 w-3" />Adicionar
          </Button>
        </div>
        {lista.length === 0 && adding !== representa && (
          <p className="text-xs text-muted-foreground p-3 text-center border rounded-md border-dashed">Nenhum advogado cadastrado</p>
        )}
        {lista.map(a => (
          <div key={a.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20 mb-1">
            <span className="text-xs flex-1 font-medium">{a.nome}</span>
            {a.numero_documento && <span className="text-xs text-muted-foreground">{a.tipo_documento ?? 'CPF'} {a.numero_documento}</span>}
            {a.oab && <span className="text-xs text-muted-foreground">OAB {a.oab}{a.oab_uf ? `/${a.oab_uf}` : ''}</span>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(a.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        {adding === representa && (
          <div className="space-y-2 p-2 rounded border border-primary/30 bg-primary/5 mt-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px]">Nome *</Label>
                <Input className="h-7 text-xs" value={newAdv.nome} onChange={e => setNewAdv(p => ({ ...p, nome: e.target.value }))} placeholder="Dr. João Silva" />
              </div>
              <div>
                <Label className="text-[10px]">OAB</Label>
                <Input className="h-7 text-xs" value={newAdv.oab} onChange={e => setNewAdv(p => ({ ...p, oab: e.target.value }))} placeholder="12345" />
              </div>
              <div>
                <Label className="text-[10px]">UF (OAB)</Label>
                <Select value={newAdv.oab_uf} onValueChange={v => setNewAdv(p => ({ ...p, oab_uf: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Documento</Label>
                <Select value={newAdv.tipo_documento} onValueChange={v => setNewAdv(p => ({ ...p, tipo_documento: v as TipoDocAdvogado, numero_documento: '' }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPO_DOC_ADVOGADO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Número</Label>
                <Input className="h-7 text-xs" value={newAdv.numero_documento}
                  onChange={e => setNewAdv(p => ({ ...p, numero_documento: mascararDoc(e.target.value, p.tipo_documento) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => handleAdd(representa)}>OK</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Advogados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderLista("Advogados do Reclamante", "RECLAMANTE")}
        {renderLista("Advogados do Reclamado", "RECLAMADO")}
      </CardContent>
    </Card>
  );
}
