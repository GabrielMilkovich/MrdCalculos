/**
 * DivergenceReportButton — usuario reporta divergencia engine vs PJe-Calc oficial.
 *
 * Coleta produzida no DivergenceReportButton vai para tabela
 * engine_divergence_reports. Apos 30+ casos, dev recalibra engine
 * (opcao D do PLANO-PARA-99).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CAMPOS = [
  { value: 'liquido_reclamante', label: 'Líquido Reclamante' },
  { value: 'principal_corrigido', label: 'Principal Corrigido' },
  { value: 'juros_mora', label: 'Juros de Mora' },
  { value: 'cs_segurado', label: 'INSS Segurado' },
  { value: 'cs_empregador', label: 'INSS Empregador' },
  { value: 'ir_retido', label: 'IR Retido' },
  { value: 'fgts_total', label: 'FGTS Total' },
  { value: 'multa_523', label: 'Multa Art. 523 CPC' },
  { value: 'multa_467', label: 'Multa Art. 467 CLT' },
  { value: 'multa_477', label: 'Multa Art. 477 CLT' },
  { value: 'honorarios_sucumbenciais', label: 'Honorários Sucumbenciais' },
  { value: 'honorarios_contratuais', label: 'Honorários Contratuais' },
  { value: 'custas', label: 'Custas Judiciais' },
  { value: 'pensao_total', label: 'Pensão Alimentícia' },
  { value: 'previdencia_privada', label: 'Previdência Privada' },
  { value: 'salario_familia', label: 'Salário Família' },
  { value: 'seguro_desemprego', label: 'Seguro Desemprego' },
  { value: 'outro', label: 'Outro (especifique)' },
];

interface Props {
  caseId: string;
}

export function DivergenceReportButton({ caseId }: Props) {
  const [open, setOpen] = useState(false);
  const [campo, setCampo] = useState<string>('');
  const [campoOutro, setCampoOutro] = useState('');
  const [valorEngine, setValorEngine] = useState('');
  const [valorPjecalc, setValorPjecalc] = useState('');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!campo || !valorEngine || !valorPjecalc) {
      toast.error('Preencha campo, valor engine e valor PJe-Calc');
      return;
    }
    if (campo === 'outro' && !campoOutro) {
      toast.error('Especifique o campo (outro)');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sessão expirada');
        return;
      }
      const { error } = await supabase.from('engine_divergence_reports').insert({
        case_id: caseId,
        user_id: user.id,
        campo,
        campo_outro: campo === 'outro' ? campoOutro : null,
        valor_engine: parseFloat(valorEngine),
        valor_pjecalc_oficial: parseFloat(valorPjecalc),
        observacao: observacao || null,
        status: 'aberto',
      });
      if (error) {
        toast.error('Erro ao reportar: ' + error.message);
        return;
      }
      toast.success('Divergência reportada. Equipe analisará e responderá.');
      setOpen(false);
      // reset
      setCampo(''); setCampoOutro(''); setValorEngine(''); setValorPjecalc(''); setObservacao('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline" size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
      >
        <AlertCircle className="h-4 w-4" />
        Reportar divergência vs PJe-Calc oficial
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar divergência</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Compare o valor calculado pelo MRD Calc com o valor que o
              PJe-Calc oficial gerou. Cada divergência reportada ajuda a
              calibrar o engine para 99%+ de paridade.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Campo divergente *</Label>
              <Select value={campo} onValueChange={setCampo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CAMPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {campo === 'outro' && (
              <div>
                <Label className="text-xs">Especifique o campo *</Label>
                <Input value={campoOutro} onChange={e => setCampoOutro(e.target.value)} className="mt-1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor MRD Calc *</Label>
                <Input
                  type="number" step="0.01"
                  value={valorEngine} onChange={e => setValorEngine(e.target.value)}
                  placeholder="0,00" className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Valor PJe-Calc oficial *</Label>
                <Input
                  type="number" step="0.01"
                  value={valorPjecalc} onChange={e => setValorPjecalc(e.target.value)}
                  placeholder="0,00" className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea
                value={observacao} onChange={e => setObservacao(e.target.value)}
                rows={3} placeholder="Detalhes do caso, premissas usadas, etc."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Reportar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
