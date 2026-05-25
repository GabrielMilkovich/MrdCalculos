import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TipoExtracao } from '@/features/data-extraction';

interface Props {
  value: TipoExtracao;
  onChange: (v: TipoExtracao) => void;
  disabled?: boolean;
}

const LABELS: Record<TipoExtracao, string> = {
  nao_extrair: 'Ignorar',
  holerite: 'Holerite / Contracheque',
  ficha_financeira: 'Ficha Financeira (anual)',
  cartao_ponto: 'Cartão de Ponto / Jornada',
  ctps: 'Documento de Férias e/ou Faltas (CTPS, recibo, espelho)',
};

export function ExtractionTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as TipoExtracao)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 text-xs min-w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LABELS) as TipoExtracao[]).map((k) => (
          <SelectItem key={k} value={k}>
            {LABELS[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
