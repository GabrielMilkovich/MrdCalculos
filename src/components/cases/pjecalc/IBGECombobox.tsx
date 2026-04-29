import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ============================================================================
// IBGE Combobox — pesquisa municípios via API oficial IBGE (não autenticada).
// Endpoint: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
// Cache local em sessionStorage (chave por UF) para evitar refetch caro.
// Aceita opcionalmente uma UF para filtrar; sem UF traz todos.
// ============================================================================

interface IBGEMunicipioRaw {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string };
    };
  };
}

interface MunicipioOption {
  codigo: string; // Sempre como string (campo do banco é text/numérico em string).
  nome: string;
  uf: string;
}

const CACHE_PREFIX = "ibge-municipios-v1:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

interface CacheEntry {
  ts: number;
  data: MunicipioOption[];
}

function readCache(uf: string): MunicipioOption[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_PREFIX + uf);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(uf: string, data: MunicipioOption[]): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    window.sessionStorage.setItem(CACHE_PREFIX + uf, JSON.stringify(entry));
  } catch {
    // sessionStorage cheio ou indisponível — silencioso
  }
}

async function fetchMunicipios(uf?: string): Promise<MunicipioOption[]> {
  const cacheKey = uf || "BR";
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = uf
    ? `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
    : `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IBGE API ${res.status}`);
  const raw = (await res.json()) as IBGEMunicipioRaw[];
  const opts: MunicipioOption[] = raw.map((m) => ({
    codigo: String(m.id),
    nome: m.nome,
    uf: m.microrregiao?.mesorregiao?.UF?.sigla ?? uf ?? "",
  }));
  writeCache(cacheKey, opts);
  return opts;
}

interface Props {
  /** Código IBGE atual (string). */
  value: string;
  onChange: (codigo: string, nome?: string, uf?: string) => void;
  /** Filtra por UF, se presente. */
  uf?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function IBGECombobox({
  value,
  onChange,
  uf,
  disabled,
  placeholder = "Selecione o município...",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<MunicipioOption[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMunicipios(uf);
        if (!cancelled) setOptions(data);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [uf]);

  const selected = useMemo(
    () => options.find((o) => o.codigo === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter(
        (o) =>
          o.nome.toLowerCase().includes(q) ||
          o.codigo.includes(q) ||
          o.uf.toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
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
          <span className="truncate">
            {loading
              ? "Carregando IBGE..."
              : selected
                ? `${selected.nome}${selected.uf ? ` / ${selected.uf}` : ""} (${selected.codigo})`
                : value
                  ? value
                  : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Pesquisar município ou código..."
            value={search}
            onValueChange={setSearch}
            className="h-9 text-xs"
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && error && (
              <div className="px-3 py-4 text-xs text-destructive">
                Falha ao carregar IBGE: {error}
              </div>
            )}
            {!loading && !error && (
              <>
                <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((m) => (
                    <CommandItem
                      key={m.codigo}
                      value={m.codigo}
                      onSelect={() => {
                        onChange(m.codigo, m.nome, m.uf);
                        setOpen(false);
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === m.codigo ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {m.nome}
                        {m.uf ? ` / ${m.uf}` : ""}
                      </span>
                      <span className="ml-2 text-muted-foreground tabular-nums">
                        {m.codigo}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
