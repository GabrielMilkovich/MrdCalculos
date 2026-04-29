import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CatalogoOption } from "@/lib/pjecalc/rubricas-oficiais";

// ============================================================================
// CatalogoCombobox — Select pesquisável a partir de um catálogo oficial
// (rubricas, bases tabeladas, comportamentos de reflexo, etc) com fallback
// para entrada manual ("Outro (digitar manualmente)") preservando a regra
// "UI honesta": campo sempre persiste, mas usuário sabe quando está fora
// do catálogo padrão.
// ============================================================================

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: CatalogoOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Permite digitação livre de um valor fora do catálogo. Default: true. */
  allowCustom?: boolean;
}

const CUSTOM_SENTINEL = "__custom__";

export function CatalogoCombobox({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className,
  disabled,
  allowCustom = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [search, setSearch] = useState("");

  const matched = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // Se o valor atual não está no catálogo e é não vazio, modo custom.
  const isCustomValue = value && !matched;

  if (customMode || isCustomValue) {
    return (
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-8 text-xs flex-1", className)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Voltar ao catálogo"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
          disabled={disabled}
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 text-xs justify-between w-full font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{matched ? matched.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px]" align="start">
        <Command>
          <CommandInput
            placeholder="Pesquisar..."
            value={search}
            onValueChange={setSearch}
            className="h-9 text-xs"
          />
          <CommandList>
            <CommandEmpty>Nenhum item.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="ml-2 text-muted-foreground truncate max-w-[120px]">
                      {o.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {allowCustom && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={CUSTOM_SENTINEL}
                    onSelect={() => {
                      setCustomMode(true);
                      setOpen(false);
                    }}
                    className="text-xs text-accent-foreground"
                  >
                    <PencilLine className="mr-2 h-3.5 w-3.5" />
                    Outro (digitar manualmente)
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
