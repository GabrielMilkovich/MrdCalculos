import type { SupabaseClient } from '@supabase/supabase-js';
import type { RubricaExtraida } from '../types';

/**
 * Reclassificação manual de uma rubrica pela UI:
 *   1. UPDATE na rubrica clicada (categoria_id + classificacao_origem='manual').
 *   2. UPSERT no memo do caso.
 *   3. Propaga em LOTE para outras rubricas do mesmo caso com mesmo
 *      (codigo, nome_normalizado), MAS NUNCA sobrescreve rubricas que já
 *      têm classificacao_origem='manual' (decisão humana é soberana).
 *
 * @returns número de rubricas afetadas pela propagação (excluindo a clicada).
 */
export async function reclassificarRubrica(
  rubrica: Pick<
    RubricaExtraida,
    'id' | 'case_id' | 'codigo' | 'nome_normalizado'
  >,
  novaCategoriaId: string | null,
  supabase: SupabaseClient,
): Promise<{ ok: true; afetadas: number } | { ok: false; error: string }> {
  // 1. Atualiza a rubrica clicada
  const { error: e1 } = await supabase
    .from('rubricas_extraidas')
    .update({
      categoria_id: novaCategoriaId,
      classificacao_origem: 'manual',
    })
    .eq('id', rubrica.id);
  if (e1) return { ok: false, error: e1.message };

  // 2. Memo: UPSERT se nova categoria; DELETE se "ignorar"
  if (novaCategoriaId !== null) {
    const { error: e2 } = await supabase
      .from('classificacoes_rubrica_memo')
      .upsert(
        {
          case_id: rubrica.case_id,
          codigo: rubrica.codigo,
          nome_normalizado: rubrica.nome_normalizado,
          categoria_id: novaCategoriaId,
        },
        { onConflict: 'case_id,codigo,nome_normalizado' },
      );
    if (e2) return { ok: false, error: e2.message };
  } else {
    let q = supabase
      .from('classificacoes_rubrica_memo')
      .delete()
      .eq('case_id', rubrica.case_id)
      .eq('nome_normalizado', rubrica.nome_normalizado);
    if (rubrica.codigo === null) q = q.is('codigo', null);
    else q = q.eq('codigo', rubrica.codigo);
    const { error: e3 } = await q;
    if (e3) return { ok: false, error: e3.message };
  }

  // 3. Propaga em lote para outras rubricas do mesmo caso com mesma chave
  //    (não toca em manual)
  let upd = supabase
    .from('rubricas_extraidas')
    .update({
      categoria_id: novaCategoriaId,
      classificacao_origem: 'memo',
    })
    .eq('case_id', rubrica.case_id)
    .eq('nome_normalizado', rubrica.nome_normalizado)
    .neq('id', rubrica.id)
    .neq('classificacao_origem', 'manual');
  if (rubrica.codigo === null) upd = upd.is('codigo', null);
  else upd = upd.eq('codigo', rubrica.codigo);

  const { data: afetadas, error: e4 } = await upd.select('id');
  if (e4) return { ok: false, error: e4.message };

  return { ok: true, afetadas: afetadas?.length ?? 0 };
}
