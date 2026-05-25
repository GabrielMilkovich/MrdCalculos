import { useState, useMemo } from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import Decimal from 'decimal.js';
import { buildFichaFinanceiraZip } from '@/features/data-extraction/export/per-doc/ficha-financeira-zip';
import { triggerBlobDownload } from '@/features/data-extraction';
import { VerifyParityForenseButton } from './VerifyParityForenseButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ValidationBanner } from './ValidationBanner';
import { ClassificacaoCellEditor } from './ClassificacaoCellEditor';
import {
  useFichaFinanceiraReview,
  type RubricaEditavel,
} from './hooks/useFichaFinanceiraReview';
import {
  type FichaFinanceiraParsed,
  type FichaCategoriaSlug,
  CATEGORIA_LABELS,
  mapCategoriaPjeToSlug,
} from './ficha-financeira-types';

Decimal.set({ precision: 20 });

interface Props {
  documentId: string;
  parsed: FichaFinanceiraParsed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
}

function formatBR(val: number | Decimal): string {
  const n = val instanceof Decimal ? val.toNumber() : val;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mesLabel(comp: string): string {
  const MESES: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez', '13': '13º',
  };
  const parts = comp.split('-');
  return MESES[parts[1]] ?? parts[1];
}

export function FichaFinanceiraPreviewDialog({
  documentId,
  parsed,
  open,
  onOpenChange,
  filename,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const review = useFichaFinanceiraReview(parsed);

  const podeBaixar = review.podeConfirmar;

  const rubricasPGTO = useMemo(
    () => review.rubricas.filter((r) => r.classificacao?.toUpperCase() === 'PGTO'),
    [review.rubricas],
  );

  const rubricasOutras = useMemo(
    () => review.rubricas.filter((r) => r.classificacao?.toUpperCase() !== 'PGTO'),
    [review.rubricas],
  );

  const categoriasComValor = useMemo(() => {
    const entries = [...review.totaisPorCategoria.entries()]
      .filter(([cat]) => cat !== 'ignorar')
      .sort((a, b) => b[1].cmp(a[1]));
    return entries;
  }, [review.totaisPorCategoria]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const resultadoSalva = await review.salvarClassificacoes();
      if (resultadoSalva.erros.length > 0) {
        toast({
          title: 'Erro ao salvar classificações',
          description: resultadoSalva.erros[0],
          variant: 'destructive',
        });
      } else if (resultadoSalva.conflitos.length > 0) {
        toast({
          title: `${resultadoSalva.conflitos.length} código(s) não salvos`,
          description: 'Já revisados por admin. ZIP gerado mesmo assim.',
        });
      } else if (resultadoSalva.salvas > 0) {
        toast({
          title: `${resultadoSalva.salvas} classificação(ões) salva(s)`,
        });
      }

      const result = await buildFichaFinanceiraZip({
        ano: parsed.ano,
        empregador: parsed._meta?.empregador_detectado ?? 'GENERICO',
        empregado: parsed.empregado ?? 'desconhecido',
        rubricas: review.rubricas,
        validacao: parsed.validacao,
        parserMeta: {
          fonte: parsed._meta?.parser ? 'deterministic' : 'claude',
          duration_ms: parsed._meta?.duration_ms,
        },
      });

      triggerBlobDownload(result.blob, result.filename);
      toast({
        title: `ZIP baixado: ${result.filename}`,
        description: `${result.resumo.categorias.length} categorias, ${result.resumo.rubricas_incluidas} rubricas`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Falha ao gerar ZIP',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Ficha Financeira {parsed.ano}
            {parsed.empregado && ` — ${parsed.empregado}`}
            {parsed.empresa && ` / ${parsed.empresa}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {parsed._meta?.parser ?? parsed._meta?.model ?? 'parser desconhecido'} ·{' '}
            {review.rubricas.length} rubricas ·{' '}
            {review.mesesOrdenados.length} meses
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <ValidationBanner validacao={parsed.validacao} />
            <VerifyParityForenseButton
              documentId={documentId}
              builder="ficha_financeira"
              parsed={parsed}
              pdfDisponivel={true}
            />
          </div>

          {review.rubricasNaoClassificadas > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {review.rubricasNaoClassificadas}{' '}
                {review.rubricasNaoClassificadas === 1 ? 'código sem' : 'códigos sem'} catálogo.
                Classifique antes de baixar.
              </span>
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0 border rounded-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr>
                    <th className="p-1.5 text-left w-8">Inc.</th>
                    <th className="p-1.5 text-left">Cód</th>
                    <th className="p-1.5 text-left min-w-[140px]">Denominação</th>
                    <th className="p-1.5 text-left min-w-[140px]">Categoria</th>
                    {review.mesesOrdenados.map((m) => (
                      <th key={m} className="p-1.5 text-right min-w-[70px]">
                        {mesLabel(m)}
                      </th>
                    ))}
                    <th className="p-1.5 text-right min-w-[80px] font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rubricasPGTO.map((r) => (
                    <RubricaRow
                      key={r.codigo}
                      rubrica={r}
                      meses={review.mesesOrdenados}
                      onToggle={() => review.toggleIncluida(r.codigo)}
                      onSetCategoria={(cat, just) => review.setCategoria(r.codigo, cat, just)}
                    />
                  ))}

                  {rubricasOutras.length > 0 && (
                    <>
                      <tr className="border-t-2">
                        <td colSpan={4 + review.mesesOrdenados.length + 1} className="p-1.5 text-[10px] text-muted-foreground font-medium">
                          DESC / BASE / ENCAR (não entram no cálculo)
                        </td>
                      </tr>
                      {rubricasOutras.map((r) => (
                        <RubricaRow
                          key={r.codigo}
                          rubrica={r}
                          meses={review.mesesOrdenados}
                          onToggle={() => review.toggleIncluida(r.codigo)}
                          onSetCategoria={(cat, just) => review.setCategoria(r.codigo, cat, just)}
                          dimmed
                        />
                      ))}
                    </>
                  )}

                  <tr className="border-t-2 font-bold bg-muted/40">
                    <td className="p-1.5" />
                    <td className="p-1.5" />
                    <td className="p-1.5" colSpan={2}>
                      Total incluído
                    </td>
                    {review.mesesOrdenados.map((m) => {
                      const val = review.totaisPorMes.get(m);
                      return (
                        <td key={m} className="p-1.5 text-right font-mono">
                          {val ? formatBR(val) : '—'}
                        </td>
                      );
                    })}
                    <td className="p-1.5 text-right font-mono">
                      {formatBR(
                        [...review.totaisPorMes.values()].reduce(
                          (a, b) => a.plus(b),
                          new Decimal(0),
                        ),
                      )}
                    </td>
                  </tr>

                  {parsed.resumo_mensal && parsed.resumo_mensal.length > 0 && (
                    <tr className="bg-muted/20 text-muted-foreground">
                      <td className="p-1.5" />
                      <td className="p-1.5" />
                      <td className="p-1.5" colSpan={2}>
                        Total Vencimentos PDF
                      </td>
                      {review.mesesOrdenados.map((m) => {
                        const rm = parsed.resumo_mensal?.find((x) => x.competencia === m);
                        return (
                          <td key={m} className="p-1.5 text-right font-mono">
                            {rm ? formatBR(rm.total_vencimentos) : '—'}
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-right font-mono">
                        {formatBR(
                          (parsed.resumo_mensal ?? []).reduce(
                            (a, r) => a + r.total_vencimentos,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          {categoriasComValor.length > 0 && (
            <div className="text-xs space-y-1">
              <div className="font-medium text-muted-foreground">Total por categoria:</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {categoriasComValor.map(([cat, val]) => (
                  <span key={cat}>
                    <Badge variant="secondary" className="text-[10px] mr-1">
                      {CATEGORIA_LABELS[cat]}
                    </Badge>
                    <span className="font-mono">R$ {formatBR(val)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {review.conflitos > 0 && (
            <span className="text-xs text-amber-600 mr-auto">
              {review.conflitos} {review.conflitos === 1 ? 'reclassificação' : 'reclassificações'} do
              catálogo
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!podeBaixar || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Salvar classificações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RubricaRow({
  rubrica,
  meses,
  onToggle,
  onSetCategoria,
  dimmed,
}: {
  rubrica: RubricaEditavel;
  meses: string[];
  onToggle: () => void;
  onSetCategoria: (cat: FichaCategoriaSlug, justificativa?: string) => void;
  dimmed?: boolean;
}) {
  const valoresPorMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of rubrica.valores_mensais) {
      map.set(v.competencia, (map.get(v.competencia) ?? 0) + v.valor);
    }
    return map;
  }, [rubrica.valores_mensais]);

  const categoriaSugerida = mapCategoriaPjeToSlug(
    rubrica.categoria_catalogo ?? rubrica.categoria,
  );

  return (
    <tr className={`border-b hover:bg-muted/30 ${dimmed ? 'opacity-50' : ''}`}>
      <td className="p-1.5">
        <Checkbox
          checked={rubrica.incluida}
          onCheckedChange={() => onToggle()}
        />
      </td>
      <td className="p-1.5 font-mono text-[11px]">{rubrica.codigo}</td>
      <td className="p-1.5 truncate max-w-[180px]" title={rubrica.denominacao}>
        {rubrica.denominacao}
      </td>
      <td className="p-1.5">
        <ClassificacaoCellEditor
          codigo={rubrica.codigo}
          denominacao={rubrica.denominacao}
          categoriaAtual={rubrica.categoria_atual}
          categoriaSugerida={categoriaSugerida}
          origemSugestao={rubrica.origem_enriquecimento}
          onChange={onSetCategoria}
        />
      </td>
      {meses.map((m) => {
        const val = valoresPorMes.get(m);
        return (
          <td key={m} className="p-1.5 text-right font-mono text-[11px]">
            {val ? formatBR(val) : '—'}
          </td>
        );
      })}
      <td className="p-1.5 text-right font-mono font-bold text-[11px]">
        {formatBR(rubrica.total_ano)}
      </td>
    </tr>
  );
}
