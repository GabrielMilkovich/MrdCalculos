import { supabase } from '@/integrations/supabase/client';
import type { TipoExtracao } from '../types';

export type ExtractResult =
  | { ok: true; count: number; competencia?: string | null }
  | { ok: false; error: string };

/**
 * Invoca a Edge Function `extract-document-rubricas`. A função:
 *   - Marca documents.extracao_status = 'running'
 *   - Lê documents.ocr_text
 *   - Chama OpenAI gpt-4o-mini com prompt apropriado
 *   - Insere em rubricas_extraidas / ferias_extraidas / faltas_extraidas
 *   - Aplica memo + hints automaticamente (apenas holerite)
 *   - Marca extracao_status = 'done' ou 'failed' + extracao_error
 */
export async function extractDocument(
  documentId: string,
  tipoExtracao: Exclude<TipoExtracao, 'nao_extrair'>,
): Promise<ExtractResult> {
  const { data, error } = await supabase.functions.invoke<ExtractResult>(
    'extract-document-rubricas',
    { body: { document_id: documentId, tipo_extracao: tipoExtracao } },
  );

  if (error) {
    return { ok: false, error: error.message ?? 'Erro desconhecido' };
  }
  if (!data) {
    return { ok: false, error: 'Resposta vazia' };
  }
  return data;
}

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

export async function setCompetenciaReferencia(
  documentId: string,
  competencia: string,
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ competencia_referencia: competencia })
    .eq('id', documentId);
  if (error) throw error;
}

export async function markValidationStatus(
  documentId: string,
  status: 'pending' | 'validated' | 'rejected',
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ validation_status: status })
    .eq('id', documentId);
  if (error) throw error;
}
