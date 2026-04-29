import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, Pencil, Eye } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

interface HonorarioItem {
  descricao: string; devedor: string; credor: string;
  tipo: 'percentual' | 'valor_fixo'; percentual: string; valor_fixo: string;
  base: string; apurar_ir: boolean;
  // Sprint 2: 9 campos novos
  tipo_honorario?: string;
  doc_fiscal_credor?: string;
  tipo_imposto_renda?: string;
  tipo_cobranca_reclamante?: string;
  aplicar_juros?: boolean;
  data_apartir_de_aplicar_juros?: string;
  data_vencimento?: string;
  tipo_indice_correcao?: string;
}

const EMPTY: HonorarioItem = {
  descricao: 'HONORÁRIOS DE SUCUMBÊNCIA', devedor: 'reclamado', credor: '',
  tipo: 'percentual', percentual: '15', valor_fixo: '', base: 'condenacao', apurar_ir: false,
  tipo_honorario: 'sucumbenciais',
  tipo_imposto_renda: 'pessoa_fisica',
  tipo_cobranca_reclamante: 'descontar_credito',
  aplicar_juros: false,
  tipo_indice_correcao: 'trabalhista',
};

export function ModuloHonorarios({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<HonorarioItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HonorarioItem>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_honorarios", caseId],
    queryFn: () => svc.getHonorarios(caseId),
  });

  useEffect(() => {
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      if (d.items && Array.isArray(d.items)) {
        setItems(d.items as HonorarioItem[]);
      } else if (d.apurar_sucumbenciais) {
        setItems([{
          descricao: 'HONORÁRIOS DE SUCUMBÊNCIA', devedor: 'reclamado', credor: '',
          tipo: 'percentual', percentual: (d.percentual_sucumbenciais as number)?.toString() || '15',
          valor_fixo: '', base: (d.base_sucumbenciais as string) || 'condenacao', apurar_ir: false,
        }]);
      }
    }
  }, [data]);

  const openNew = () => { setEditIdx(null); setEditForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditForm({ ...items[idx] }); setDialogOpen(true); };
  const saveItem = () => {
    if (editIdx !== null) setItems(p => p.map((m, i) => i === editIdx ? editForm : m));
    else setItems(p => [...p, editForm]);
    setDialogOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertHonorarios({
        case_id: caseId, apurar_sucumbenciais: items.length > 0,
        percentual_sucumbenciais: items[0]?.percentual ? parseFloat(items[0].percentual) : 15,
        base_sucumbenciais: items[0]?.base || 'condenacao', apurar_contratuais: false,
        percentual_contratuais: 20, valor_fixo: null, items,
      } as Record<string, unknown>);
      qc.invalidateQueries({ queryKey: ["pjecalc_honorarios", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_case_data", caseId] });
      toast.success("Honorários salvos!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Honorários</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Listar Honorários</CardTitle>
            <Button onClick={openNew} size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Novo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-4">Não existem resultados para a pesquisa solicitada.</p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground text-right mb-1">Registros encontrados: {items.length}</p>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border"><th className="p-2 text-left font-medium w-20">Ação</th><th className="p-2 text-left font-medium">Descrição</th><th className="p-2 text-left font-medium">Devedor</th><th className="p-2 text-left font-medium">Credor</th><th className="p-2 text-left font-medium">Apurar Imposto de Renda</th></tr></thead>
                  <tbody>
                    {items.map((m, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-2"><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(idx)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button></div></td>
                        <td className="p-2 uppercase font-medium">{m.descricao}</td>
                        <td className="p-2 capitalize">{m.devedor}</td>
                        <td className="p-2 uppercase">{m.credor || '—'}</td>
                        <td className="p-2">{m.apurar_ir ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">{editIdx !== null ? 'Editar' : 'Novo'} Honorário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Descrição</Label><Input value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div title="Devedor: quem paga o honorário. Reclamado=somado à condenação. Reclamante=deduzido do líquido.">
                <Label className="text-xs">Devedor</Label>
                <Select value={editForm.devedor} onValueChange={v => setEditForm(p => ({ ...p, devedor: v }))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reclamante">Reclamante</SelectItem><SelectItem value="reclamado">Reclamado</SelectItem></SelectContent></Select>
              </div>
              <div title="Java TipoHonorarioEnum: Sucumbenciais (CLT art. 791-A), Contratuais (advogado/cliente), Periciais (perito), Outros.">
                <Label className="text-xs">Tipo Honorário</Label>
                <Select value={editForm.tipo_honorario || 'sucumbenciais'} onValueChange={v => setEditForm(p => ({ ...p, tipo_honorario: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sucumbenciais">Sucumbenciais</SelectItem>
                    <SelectItem value="contratuais">Contratuais</SelectItem>
                    <SelectItem value="periciais_contador">Periciais (Contador)</SelectItem>
                    <SelectItem value="periciais_tecnico">Periciais (Técnico)</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Credor (nome)</Label><Input value={editForm.credor} onChange={e => setEditForm(p => ({ ...p, credor: e.target.value }))} className="h-8 text-xs mt-1" placeholder="Ex: MARCOS ROBERTO DIAS" /></div>
              <div title="CPF (PF) ou CNPJ (PJ) do credor."><Label className="text-xs">Doc. Fiscal Credor</Label><Input value={editForm.doc_fiscal_credor || ''} onChange={e => setEditForm(p => ({ ...p, doc_fiscal_credor: e.target.value }))} className="h-8 text-xs mt-1" placeholder="000.000.000-00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div title="Calculado: engine recalcula via percentual × base. Informado: valor fixo direto.">
                <Label className="text-xs">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v as 'percentual' | 'valor_fixo' }))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="valor_fixo">Valor Fixo</SelectItem></SelectContent></Select>
              </div>
              {editForm.tipo === 'percentual' ? (
                <div title="Percentual aplicado sobre a base. Sucumbenciais comumente 10-15%, contratuais até 30%."><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" value={editForm.percentual} onChange={e => setEditForm(p => ({ ...p, percentual: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              ) : (
                <div title="Valor fixo em reais."><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={editForm.valor_fixo} onChange={e => setEditForm(p => ({ ...p, valor_fixo: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              )}
            </div>
            <div title="Base de cálculo: BRUTO=PC+juros+FGTS pré-deduções; BC=BRUTO-INSS_segurado; BCP=BC-PrevPrivada; VNP=verbas que não compõem o principal (Java BaseParaApuracaoDeHonorarioEnum).">
              <Label className="text-xs">Base de Apuração</Label>
              <Select value={editForm.base} onValueChange={v => setEditForm(p => ({ ...p, base: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="condenacao">BRUTO (Condenação)</SelectItem>
                  <SelectItem value="bruto_menos_cs">BRUTO − Contribuição Social</SelectItem>
                  <SelectItem value="bruto_menos_cs_menos_pp">BRUTO − CS − Prev. Privada</SelectItem>
                  <SelectItem value="verbas_nao_principal">Verbas que não compõem o principal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Imposto de Renda</p>
              <p className="text-[10px] text-emerald-700 mb-2 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded border border-emerald-200 dark:border-emerald-900">✓ <strong>Engine implementado</strong> — orchestrator propaga <code>apurar_ir</code> para <code>incidencias.irpf</code>; <code>ParcelasAtualizaveisHonorario</code> aplica retenção PF (tabela progressiva) ou PJ (1,5%).</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2" title="Quando marcado, retém IRPF do honorário. PF=tabela progressiva (Lei 7.713/88). PJ=1,5% fixo (IN RFB).">
                  <Checkbox checked={editForm.apurar_ir} onCheckedChange={v => setEditForm(p => ({ ...p, apurar_ir: !!v }))} />
                  <Label className="text-xs">Apurar Imposto de Renda na Fonte</Label>
                </div>
                {editForm.apurar_ir && (
                  <>
                    <div title="Pessoa Física: tabela progressiva IRPF. Pessoa Jurídica: alíquota fixa 1,5% (serviços profissionais).">
                      <Label className="text-xs">Tipo IR</Label>
                      <Select value={editForm.tipo_imposto_renda || 'pessoa_fisica'} onValueChange={v => setEditForm(p => ({ ...p, tipo_imposto_renda: v }))}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pessoa_fisica">Pessoa Física (tabela progressiva)</SelectItem>
                          <SelectItem value="pessoa_juridica">Pessoa Jurídica (1,5% fixo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {editForm.devedor === 'reclamante' && (
              <div className="border-t pt-2 mt-2" title="Java TipoCobrancaReclamanteEnum: DESCONTAR_CREDITO (deduz do líquido) ou COBRAR (cobra à parte do reclamante). Default: descontar.">
                <p className="text-[10px] text-emerald-700 mb-1 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded">✓ Engine implementado — COBRAR não deduz do líquido, vai para totalizador separado.</p>
                <Label className="text-xs">Forma de Cobrança</Label>
                <Select value={editForm.tipo_cobranca_reclamante || 'descontar_credito'} onValueChange={v => setEditForm(p => ({ ...p, tipo_cobranca_reclamante: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descontar_credito">Descontar do Crédito (deduz do líquido)</SelectItem>
                    <SelectItem value="cobrar">Cobrar à Parte (não deduz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Correção monetária e juros</p>
              <p className="text-[10px] text-emerald-700 mb-2 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded">✓ <strong>Data Vencimento</strong> + Índice Trabalhista funcionam (engine aplica IPCA-E acumulado). ✓ Aplicar Juros (Sprint 4.2-C1, OJ-348 SDI-1): juros simples mensais a partir da data informada.</p>
              <div className="grid grid-cols-2 gap-3">
                <div title="Data em que o honorário foi fixado. Se anterior à liquidação, engine aplica IPCA-E acumulado.">
                  <Label className="text-xs">Data de Vencimento</Label>
                  <Input type="date" value={editForm.data_vencimento || ''} onChange={e => setEditForm(p => ({ ...p, data_vencimento: e.target.value }))} className="h-8 text-xs mt-1" />
                </div>
                <div title="Índice de correção monetária. Trabalhista (default) usa o mesmo índice do principal (IPCA-E em geral).">
                  <Label className="text-xs">Índice de Correção</Label>
                  <Select value={editForm.tipo_indice_correcao || 'trabalhista'} onValueChange={v => setEditForm(p => ({ ...p, tipo_indice_correcao: v }))}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabalhista">Trabalhista (mesmo do principal)</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2" title="Aplica juros mora sobre o honorário a partir da data informada. Útil quando o honorário foi devido em data anterior e não foi pago.">
                  <Checkbox checked={editForm.aplicar_juros || false} onCheckedChange={v => setEditForm(p => ({ ...p, aplicar_juros: !!v }))} />
                  <Label className="text-xs">Aplicar Juros Mora</Label>
                </div>
                {editForm.aplicar_juros && (
                  <div title="Data inicial dos juros mora.">
                    <Label className="text-xs">Juros a partir de</Label>
                    <Input type="date" value={editForm.data_apartir_de_aplicar_juros || ''} onChange={e => setEditForm(p => ({ ...p, data_apartir_de_aplicar_juros: e.target.value }))} className="h-8 text-xs mt-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter><Button size="sm" onClick={saveItem}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
