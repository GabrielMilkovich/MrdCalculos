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

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface Props { caseId: string; }

export function ModuloAdvogados({ caseId }: Props) {
  const qc = useQueryClient();
  const { data: advogados = [] } = useQuery({
    queryKey: ["pjecalc_advogados", caseId],
    queryFn: () => svc.getAdvogados(caseId),
  });

  const [adding, setAdding] = useState<'RECLAMANTE' | 'RECLAMADO' | null>(null);
  const [newAdv, setNewAdv] = useState({ nome: '', oab: '', oab_uf: 'SP' });

  const handleAdd = async (representa: 'RECLAMANTE' | 'RECLAMADO') => {
    if (!newAdv.nome.trim() || !newAdv.oab.trim()) {
      toast.error("Nome e OAB são obrigatórios");
      return;
    }
    try {
      await svc.insertAdvogado({ calculo_id: caseId, ...newAdv, representa });
      qc.invalidateQueries({ queryKey: ["pjecalc_advogados", caseId] });
      setNewAdv({ nome: '', oab: '', oab_uf: 'SP' });
      setAdding(null);
      toast.success("Advogado adicionado");
    } catch {
      toast.error("Erro ao adicionar");
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
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(representa)}>
            <Plus className="h-3 w-3" />Adicionar
          </Button>
        </div>
        {lista.length === 0 && adding !== representa && (
          <p className="text-xs text-muted-foreground p-3 text-center border rounded-md border-dashed">Nenhum advogado cadastrado</p>
        )}
        {lista.map(a => (
          <div key={a.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20 mb-1">
            <span className="text-xs flex-1 font-medium">{a.nome}</span>
            <span className="text-xs text-muted-foreground">OAB {a.oab}/{a.oab_uf}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(a.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        {adding === representa && (
          <div className="flex items-end gap-2 p-2 rounded border border-primary/30 bg-primary/5 mt-1">
            <div className="flex-1">
              <Label className="text-[10px]">Nome</Label>
              <Input className="h-7 text-xs" value={newAdv.nome} onChange={e => setNewAdv(p => ({ ...p, nome: e.target.value }))} placeholder="Dr. João Silva" />
            </div>
            <div className="w-24">
              <Label className="text-[10px]">OAB</Label>
              <Input className="h-7 text-xs" value={newAdv.oab} onChange={e => setNewAdv(p => ({ ...p, oab: e.target.value }))} placeholder="12345" />
            </div>
            <div className="w-16">
              <Label className="text-[10px]">UF</Label>
              <Select value={newAdv.oab_uf} onValueChange={v => setNewAdv(p => ({ ...p, oab_uf: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={() => handleAdd(representa)}>OK</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(null)}>×</Button>
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
