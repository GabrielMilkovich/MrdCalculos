import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useParidadeForense } from './hooks/useParidadeForense';
import { RelatorioParidadeForense } from './RelatorioParidadeForense';
import type { ParidadeBuilder } from '@/features/data-extraction/paridade-forense/types';

interface Props {
  documentId: string;
  builder: ParidadeBuilder;
  parsed: unknown;
  pdfDisponivel: boolean;
  onApply?: (parsedAtualizado: unknown) => void;
}

const BUILDER_LABELS: Record<ParidadeBuilder, string> = {
  ficha_financeira: 'Ficha Financeira',
  holerite: 'Holerite',
  ctps: 'CTPS',
  cartao_ponto: 'Cartão de Ponto',
};

export function VerifyParityForenseButton({
  documentId,
  builder,
  parsed,
  pdfDisponivel,
  onApply,
}: Props) {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hook = useParidadeForense({ documentId, builder, parsed });

  const handleClick = async () => {
    const result = await hook.iniciar();
    if (!result.ok) {
      toast({
        title: 'Erro na análise',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    setSheetOpen(true);
  };

  const handleApply = async () => {
    const result = await hook.aplicarSelecionados();
    if (result.erros.length > 0) {
      toast({
        title: `${result.aplicadas} aplicada(s), ${result.erros.length} erro(s)`,
        description: result.erros[0],
        variant: 'destructive',
      });
    } else if (result.aplicadas > 0) {
      toast({
        title: `${result.aplicadas} correção(ões) aplicada(s)`,
        description: 'Registradas no audit log.',
      });
    }
    setSheetOpen(false);
    onApply?.(parsed);
  };

  const handleRetry = async () => {
    const result = await hook.iniciar();
    if (result.ok) return;
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs"
              disabled={!pdfDisponivel || hook.estado === 'running'}
              onClick={handleClick}
            >
              {hook.estado === 'running' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {hook.estado === 'running' ? 'Analisando...' : 'Paridade IA'}
            </Button>
          </TooltipTrigger>
          {!pdfDisponivel && (
            <TooltipContent side="top" className="text-xs">
              PDF original não disponível
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              Paridade Forense IA · {BUILDER_LABELS[builder]}
            </SheetTitle>
          </SheetHeader>
          {hook.estado === 'running' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analisando com IA — pode levar até 2 minutos</p>
            </div>
          )}
          {hook.estado === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium">Não foi possível analisar</p>
              <p className="text-xs text-muted-foreground text-center max-w-sm">{hook.erro ?? 'Erro desconhecido'}</p>
              <Button size="sm" variant="outline" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </div>
          )}
          {hook.estado === 'success' && hook.resultado && (
            <RelatorioParidadeForense
              resultado={hook.resultado}
              itensSelecionados={hook.itensSelecionados}
              onToggle={hook.toggleItem}
              onSelecionarTodos={hook.selecionarTodos}
              onDesselecionarTodos={hook.desselecionarTodos}
              countSelecionados={hook.countSelecionados}
              onAplicar={handleApply}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
