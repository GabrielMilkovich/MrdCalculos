import * as React from 'react';

import { Input } from '@/components/ui/input';
import {
  formatarCPF,
  formatarCNPJ,
  formatarPIS,
  formatarProcessoCNJ,
  validarCPF,
  validarCNPJ,
  validarPIS,
  validarProcessoCNJ,
} from '@/lib/validadores';

export type MaskType = 'cpf' | 'cnpj' | 'pis' | 'processo';

/** Tabela de máscaras: formatter + validator + tamanho máximo de dígitos. */
const MASK_TABLE: Record<
  MaskType,
  {
    format: (v: string) => string;
    validate: (v: string) => boolean;
    maxDigits: number;
  }
> = {
  cpf:      { format: formatarCPF,          validate: validarCPF,          maxDigits: 11 },
  cnpj:     { format: formatarCNPJ,         validate: validarCNPJ,         maxDigits: 14 },
  pis:      { format: formatarPIS,          validate: validarPIS,          maxDigits: 11 },
  processo: { format: formatarProcessoCNJ,  validate: validarProcessoCNJ,  maxDigits: 20 },
};

function digitsOnly(v: string): string {
  return v.replace(/\D+/g, '');
}

export interface MaskedInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'defaultValue'> {
  mask: MaskType;
  /** Valor controlado (pode vir formatado ou só dígitos — internamente re-formatamos). */
  value?: string;
  defaultValue?: string;
  /** Callback ao mudar — recebe string formatada. */
  onChange?: (value: string) => void;
  /** Callback disparado quando a validade muda. */
  onValidChange?: (valid: boolean) => void;
}

/**
 * Input com máscara e validação de documentos brasileiros.
 *
 *  - Formata a cada mudança (mantendo o cursor simples no fim).
 *  - Re-formata no blur para garantir padrão visual consistente.
 *  - Dispara `onValidChange` sempre que a validade do campo mudar.
 *  - Aceita todas as props de `<Input>` do shadcn (className, placeholder, etc.).
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, defaultValue, onChange, onValidChange, onBlur, ...rest }, ref) => {
    const spec = MASK_TABLE[mask];
    const isControlled = value !== undefined;

    // Estado interno só é usado quando não é controlado.
    const [internal, setInternal] = React.useState<string>(() =>
      spec.format(defaultValue ?? ''),
    );
    const lastValidRef = React.useRef<boolean | null>(null);

    const displayValue = isControlled ? spec.format(value ?? '') : internal;

    // Notifica mudança de validade (sem acionar no primeiro render idêntico).
    React.useEffect(() => {
      if (!onValidChange) return;
      const raw = digitsOnly(displayValue);
      const valid = raw.length === 0 ? false : spec.validate(displayValue);
      if (lastValidRef.current !== valid) {
        lastValidRef.current = valid;
        onValidChange(valid);
      }
    }, [displayValue, onValidChange, spec]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const raw = digitsOnly(e.target.value).slice(0, spec.maxDigits);
      const formatted = spec.format(raw);
      if (!isControlled) setInternal(formatted);
      onChange?.(formatted);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
      // No blur re-aplicamos a máscara para normalizar.
      const formatted = spec.format(digitsOnly(e.target.value));
      if (!isControlled && formatted !== internal) setInternal(formatted);
      if (isControlled && formatted !== displayValue) onChange?.(formatted);
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        {...rest}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        inputMode="numeric"
        autoComplete="off"
      />
    );
  },
);
MaskedInput.displayName = 'MaskedInput';
