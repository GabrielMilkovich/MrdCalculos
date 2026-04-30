import { supabase } from '@/integrations/supabase/client';
import type { Categoria, CategoriaSlug } from '../types';

export async function loadCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias_rubrica')
    .select(
      'id, slug, nome_exibicao, nome_pjecalc, ordem, default_incide_fgts, default_fgts_recolhido, default_incide_inss, default_inss_recolhido',
    )
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Categoria[]).filter(
    (c): c is Categoria => isCategoriaSlug(c.slug),
  );
}

function isCategoriaSlug(s: string): s is CategoriaSlug {
  return s === 'salario_fixo' || s === 'comissao' || s === 'dsr' || s === 'premiacao';
}
