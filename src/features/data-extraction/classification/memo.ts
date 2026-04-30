import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lookup de memo per-case: dada uma rubrica (codigo, nome_normalizado),
 * retorna a categoria_id memorizada — ou null se nunca foi classificada
 * neste caso.
 *
 * Prioridade:
 *   1. Match exato (case_id, codigo, nome_normalizado) — quando rubrica tem
 *      código numérico (ex: "0620").
 *   2. Fallback (case_id, codigo IS NULL, nome_normalizado) — quando o doc
 *      não traz código.
 */
export async function lookupMemo(
  caseId: string,
  codigo: string | null,
  nomeNormalizado: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  if (codigo) {
    const { data } = await supabase
      .from('classificacoes_rubrica_memo')
      .select('categoria_id')
      .eq('case_id', caseId)
      .eq('codigo', codigo)
      .eq('nome_normalizado', nomeNormalizado)
      .maybeSingle();
    if (data) return (data as { categoria_id: string }).categoria_id;
  }
  const { data } = await supabase
    .from('classificacoes_rubrica_memo')
    .select('categoria_id')
    .eq('case_id', caseId)
    .is('codigo', null)
    .eq('nome_normalizado', nomeNormalizado)
    .maybeSingle();
  return data ? (data as { categoria_id: string }).categoria_id : null;
}

/**
 * Carrega todos os memos do caso de uma vez. Útil para aplicação em lote
 * após extração — evita N+1 queries.
 */
export async function loadCaseMemos(
  caseId: string,
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('classificacoes_rubrica_memo')
    .select('codigo, nome_normalizado, categoria_id')
    .eq('case_id', caseId);

  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const row of data as Array<{
    codigo: string | null;
    nome_normalizado: string;
    categoria_id: string;
  }>) {
    map.set(memoKey(row.codigo, row.nome_normalizado), row.categoria_id);
  }
  return map;
}

/** Chave canônica para lookup em memória. `codigo` null → string vazia. */
export function memoKey(codigo: string | null, nomeNormalizado: string): string {
  return `${codigo ?? ''}::${nomeNormalizado}`;
}
