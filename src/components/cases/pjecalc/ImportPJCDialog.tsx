/**
 * ImportPJCDialog — importa dados de cálculo de um arquivo .PJC em um caso existente.
 *
 * Fluxo:
 *  1. Usuário seleciona arquivo .PJC (ou ZIP contendo .PJC)
 *  2. extractXmlFromPjc → XML
 *  3. analyzePJC(xml) → PJCAnalysis
 *  4. Exibe preview (beneficiário, período, nº verbas, líquido PJC)
 *  5. Se houver dados persistidos, pergunta confirmação de sobrescrita
 *  6. persistirPJCAnalysis(caseId, userId, analysis) popula pjecalc_* tables
 *  7. Mostra resultado com warnings
 *
 * Reusa 100% do backend existente — não implementa parsing novo.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractXmlFromPjc } from '@/lib/pjecalc/pjc-xml-extractor';
import { analyzePJC, type PJCAnalysis } from '@/lib/pjecalc/pjc-analyzer';
import { persistirPJCAnalysis, type PersistResult } from '@/lib/pjecalc/pjc-persist';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Props {
  caseId: string;
  userId: string;
  onImported?: () => void;
  trigger?: React.ReactNode;
}

type Phase = 'idle' | 'analyzing' | 'preview' | 'confirming-overwrite' | 'persisting' | 'done' | 'error';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ImportPJCDialog({ caseId, userId, onImported, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<PJCAnalysis | null>(null);
  const [existingCalc, setExistingCalc] = useState<{ id: string; total_verbas: number } | null>(null);
  const [persistResult, setPersistResult] = useState<PersistResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const reset = () => {
    setPhase('idle');
    setFileName('');
    setAnalysis(null);
    setExistingCalc(null);
    setPersistResult(null);
    setErrorMsg('');
  };

  const checkExisting = async (): Promise<{ id: string; total_verbas: number } | null> => {
    const { data: calc, error } = await supabase
      .from('pjecalc_calculos')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();
    if (error || !calc) return null;
    const { count } = await supabase
      .from('pjecalc_verba_base')
      .select('id', { count: 'exact', head: true })
      .eq('calculo_id', calc.id);
    return { id: calc.id, total_verbas: count ?? 0 };
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPhase('analyzing');
    setErrorMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const xml = await extractXmlFromPjc(buffer);
      const result = analyzePJC(xml);
      if (!result.parametros.beneficiario && result.verbas.length === 0) {
        throw new Error('Arquivo não parece ser um .PJC válido (sem beneficiário nem verbas).');
      }
      setAnalysis(result);
      const existing = await checkExisting();
      if (existing && existing.total_verbas > 0) {
        setExistingCalc(existing);
        setPhase('confirming-overwrite');
      } else {
        setPhase('preview');
      }
    } catch (err) {
      logger.error('ImportPJCDialog: erro ao analisar .PJC', err as Error);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setPhase('persisting');
    setErrorMsg('');
    try {
      const result = await persistirPJCAnalysis(caseId, userId, analysis);
      setPersistResult(result);
      setPhase('done');
      toast.success(
        `Importação concluída: ${result.verbas_inseridas} verbas, ${result.reflexos_inseridos} reflexos.`,
      );
      onImported?.();
    } catch (err) {
      logger.error('ImportPJCDialog: erro ao persistir .PJC', err as Error);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setTimeout(reset, 200);
    }
    setOpen(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Importar .PJC
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar arquivo .PJC</DialogTitle>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo <code>.PJC</code> (ou ZIP contendo o <code>.PJC</code>)
              exportado pelo PJe-Calc. Os dados de cálculo (verbas, parâmetros, histórico
              salarial, faltas, férias) serão importados para este caso.
            </p>
            <label className="block">
              <input
                type="file"
                accept=".PJC,.pjc,.xml,.zip"
                onChange={handleFile}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </label>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analisando {fileName}...</span>
          </div>
        )}

        {(phase === 'preview' || phase === 'confirming-overwrite') && analysis && (
          <div className="space-y-4">
            <div className="rounded border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Beneficiário:</span>{' '}
                  <strong>{analysis.parametros.beneficiario || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">CPF:</span>{' '}
                  <strong>{analysis.parametros.cpf || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Admissão:</span>{' '}
                  <strong>{analysis.parametros.admissao || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Demissão:</span>{' '}
                  <strong>{analysis.parametros.demissao || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Verbas:</span>{' '}
                  <Badge>{analysis.verbas.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Histórico salarial:</span>{' '}
                  <Badge>{analysis.historicos_salariais.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Faltas:</span>{' '}
                  <Badge>{analysis.faltas.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Férias:</span>{' '}
                  <Badge>{analysis.ferias.length}</Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Líquido exequente (PJC):</span>{' '}
                  <strong className="text-lg">{fmt(analysis.resultado.liquido_exequente)}</strong>
                </div>
              </div>
            </div>

            {phase === 'confirming-overwrite' && existingCalc && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este caso já possui um cálculo persistido com{' '}
                  <strong>{existingCalc.total_verbas} verbas</strong>. Importar o .PJC
                  irá <strong>sobrescrever</strong> todos os dados existentes.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmImport}>
                {phase === 'confirming-overwrite' ? 'Sobrescrever e Importar' : 'Confirmar Importação'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'persisting' && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Persistindo dados no banco...</span>
          </div>
        )}

        {phase === 'done' && persistResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Importação concluída com sucesso.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 text-sm rounded border p-4">
              <div><span className="text-muted-foreground">Verbas:</span> <strong>{persistResult.verbas_inseridas}</strong></div>
              <div><span className="text-muted-foreground">Reflexos:</span> <strong>{persistResult.reflexos_inseridos}</strong></div>
              <div><span className="text-muted-foreground">Históricos:</span> <strong>{persistResult.historicos_inseridos}</strong></div>
              <div><span className="text-muted-foreground">Ocorrências hist.:</span> <strong>{persistResult.ocorrencias_hist_inseridas}</strong></div>
              <div><span className="text-muted-foreground">Faltas:</span> <strong>{persistResult.faltas_inseridas}</strong></div>
              <div><span className="text-muted-foreground">Férias:</span> <strong>{persistResult.ferias_inseridas}</strong></div>
              <div className="col-span-2"><span className="text-muted-foreground">Ocorrências verba:</span> <strong>{persistResult.ocorrencias_verba_inseridas}</strong></div>
            </div>
            {persistResult.warnings.length > 0 && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Avisos ({persistResult.warnings.length}):</strong>
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    {persistResult.warnings.slice(0, 6).map((w, i) => <li key={i}>{w}</li>)}
                    {persistResult.warnings.length > 6 && <li>... e mais {persistResult.warnings.length - 6}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro na importação:</strong><br />
                {errorMsg}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Tentar outro arquivo</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
