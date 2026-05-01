/**
 * Atualiza `documents.tipo_extracao` quando o usuário muda o dropdown.
 *
 * Único survivor da pasta `api/` após o cleanup v3 → v4. Substitui o
 * antigo módulo `extract.ts` (que também invocava a Edge Function de
 * extração estruturada — feature eliminada).
 */
import { supabase } from '@/integrations/supabase/client';
import type { TipoExtracao } from '../types';

export async function setTipoExtracao(
  documentId: string,
  tipoExtracao: TipoExtracao,
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ tipo_extracao: tipoExtracao })
    .eq('id', documentId);
  if (error) throw error;
}
