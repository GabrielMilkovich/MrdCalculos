import { Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type {
  Categoria,
  CategoriaSlug,
  ClassificacaoOrigem,
} from '@/features/data-extraction';

export type CategoryValue = string | '__ignorar__' | '__none__';

interface Props {
  /** UUID da categoria, '__ignorar__' (categoria_id=null mas decisão consciente) ou '__none__' (não classificado). */
  value: CategoryValue;
  onChange: (v: CategoryValue) => void;
  categorias: Categoria[];
  origem: ClassificacaoOrigem;
  hintMotivo?: string | null;
  /** Quando origem é 'memo', a categoria que originou a memorização (visual). */
  memoSourceLabel?: string | null;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

const SLUG_ORDER: CategoriaSlug[] = ['salario_fixo', 'comissao', 'dsr', 'premiacao'];

export function RubricaCategorySelect({
  value,
  onChange,
  categorias,
  origem,
  hintMotivo,
  memoSourceLabel,
  disabled,
  size = 'sm',
}: Props) {
  const ordered = [...categorias].sort(
    (a, b) => SLUG_ORDER.indexOf(a.slug) - SLUG_ORDER.indexOf(b.slug),
  );

  const showInfo = origem === 'hint' || origem === 'memo';
  const tooltip =
    origem === 'memo'
      ? `Classificação memorizada neste caso${memoSourceLabel ? ` (de ${memoSourceLabel})` : ''}.`
      : origem === 'hint'
        ? hintMotivo ?? 'Sugestão automática (heurística).'
        : '';

  return (
    <div className="flex items-center gap-1.5">
      <Select value={value} onValueChange={(v) => onChange(v as CategoryValue)} disabled={disabled}>
        <SelectTrigger className={size === 'sm' ? 'h-8 text-xs min-w-[140px]' : ''}>
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          {ordered.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome_exibicao}
            </SelectItem>
          ))}
          <SelectItem value="__ignorar__">Ignorar</SelectItem>
        </SelectContent>
      </Select>

      {showInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Origem da classificação"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
