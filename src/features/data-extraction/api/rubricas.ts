import { supabase } from '@/integrations/supabase/client';
import type { ClassificacaoOrigem, RubricaExtraida } from '../types';
import { normalizeNomeRubrica } from '../classification/normalize';

export async function loadRubricasByCase(
  caseId: string,
): Promise<RubricaExtraida[]> {
  const { data, error } = await supabase
    .from('rubricas_extraidas')
    .select('*')
    .eq('case_id', caseId)
    .order('ordem_no_documento', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RubricaExtraida[];
}

export async function loadRubricasByDocument(
  documentId: string,
): Promise<RubricaExtraida[]> {
  const { data, error } = await supabase
    .from('rubricas_extraidas')
    .select('*')
    .eq('document_id', documentId)
    .order('ordem_no_documento', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RubricaExtraida[];
}

export async function deleteRubricasByDocument(
  documentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('rubricas_extraidas')
    .delete()
    .eq('document_id', documentId);
  if (error) throw error;
}

export type ManualRubricaInput = {
  document_id: string;
  case_id: string;
  competencia: string;
  codigo: string | null;
  nome: string;
  valor: number;
  categoria_id: string | null;
  ordem_no_documento?: number;
};

export async function insertManualRubrica(
  r: ManualRubricaInput,
): Promise<RubricaExtraida> {
  const payload = {
    document_id: r.document_id,
    case_id: r.case_id,
    competencia: r.competencia,
    codigo: r.codigo,
    nome: r.nome,
    nome_normalizado: normalizeNomeRubrica(r.nome),
    valor: r.valor,
    categoria_id: r.categoria_id,
    classificacao_origem: (r.categoria_id ? 'manual' : 'none') as ClassificacaoOrigem,
    origem: 'manual' as const,
    ordem_no_documento: r.ordem_no_documento ?? 9999,
  };
  const { data, error } = await supabase
    .from('rubricas_extraidas')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as RubricaExtraida;
}

export async function updateRubricaValor(
  id: string,
  valor: number,
): Promise<void> {
  const { error } = await supabase
    .from('rubricas_extraidas')
    .update({ valor })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRubrica(id: string): Promise<void> {
  const { error } = await supabase.from('rubricas_extraidas').delete().eq('id', id);
  if (error) throw error;
}
