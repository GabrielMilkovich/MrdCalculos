import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
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
    await hook.iniciar();
    if (hook.estado === 'error') {
      toast({
        title: 'Erro na análise',
        description: hook.erro ?? 'Erro desconhecido',
        variant: 'destructive',
      });
    } else {
      setSheetOpen(true);
    }
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
          {hook.resultado && (
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
