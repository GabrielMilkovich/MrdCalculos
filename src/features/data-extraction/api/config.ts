import { supabase } from '@/integrations/supabase/client';
import type { Categoria, CategoriaIncidenciaConfig } from '../types';

export async function loadCategoriaConfigs(
  caseId: string,
): Promise<CategoriaIncidenciaConfig[]> {
  const { data, error } = await supabase
    .from('case_categoria_config')
    .select(
      'case_id, categoria_id, incide_fgts, fgts_recolhido, incide_inss, inss_recolhido, natureza_indenizatoria',
    )
    .eq('case_id', caseId);
  if (error) throw error;
  return (data ?? []) as unknown as CategoriaIncidenciaConfig[];
}

/**
 * Garante que cada categoria do escritório tenha uma config persistida no
 * caso. Se faltar, cria com os defaults da categoria. Idempotente.
 */
export async function ensureCategoriaConfigs(
  caseId: string,
  categorias: Categoria[],
): Promise<CategoriaIncidenciaConfig[]> {
  const existing = await loadCategoriaConfigs(caseId);
  const existingByCat = new Map(existing.map((c) => [c.categoria_id, c]));

  const toInsert = categorias
    .filter((c) => !existingByCat.has(c.id))
    .map((c) => ({
      case_id: caseId,
      categoria_id: c.id,
      incide_fgts: c.default_incide_fgts,
      fgts_recolhido: c.default_fgts_recolhido,
      incide_inss: c.default_incide_inss,
      inss_recolhido: c.default_inss_recolhido,
      natureza_indenizatoria: false,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from('case_categoria_config').insert(toInsert);
    if (error) throw error;
    return loadCategoriaConfigs(caseId);
  }
  return existing;
}

export async function updateCategoriaConfig(
  caseId: string,
  categoriaId: string,
  patch: Partial<Omit<CategoriaIncidenciaConfig, 'case_id' | 'categoria_id'>>,
): Promise<void> {
  const { error } = await supabase
    .from('case_categoria_config')
    .update(patch)
    .eq('case_id', caseId)
    .eq('categoria_id', categoriaId);
  if (error) throw error;
}
