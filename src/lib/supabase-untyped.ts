/**
 * Helper para acessar tabelas customizadas do Supabase que ainda não estão
 * em `src/integrations/supabase/types.ts`.
 *
 * Em vez de espalhar `supabase.from("minha_tabela" as any)` em dezenas de arquivos,
 * use `supabaseUntyped.from("minha_tabela")` — o cast `as any` fica isolado aqui.
 *
 * Quando os tipos forem gerados, basta migrar gradualmente para `supabase` direto.
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any;

/**
 * Cliente Supabase sem tipagem para uso com tabelas customizadas.
 * O `as` duplo concentra a perda de tipagem em um único lugar do projeto.
 */
export const supabaseUntyped = supabase as unknown as UntypedClient;

/**
 * Helper conveniente: `fromUntyped("tabela").select("*")` — equivalente a
 * `supabase.from("tabela" as any)` mas sem o cast inline.
 */
export function fromUntyped(table: string) {
  return supabaseUntyped.from(table);
}
