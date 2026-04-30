import { supabase } from '@/integrations/supabase/client';
import type { FaltaExtraida, FeriasExtraida } from '../types';

export async function loadFeriasByCase(
  caseId: string,
): Promise<FeriasExtraida[]> {
  const { data, error } = await supabase
    .from('ferias_extraidas')
    .select('*')
    .eq('case_id', caseId)
    .order('relativa', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FeriasExtraida[];
}

export async function loadFaltasByCase(
  caseId: string,
): Promise<FaltaExtraida[]> {
  const { data, error } = await supabase
    .from('faltas_extraidas')
    .select('*')
    .eq('case_id', caseId)
    .order('data_inicio', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FaltaExtraida[];
}

export async function loadFeriasByDocument(
  documentId: string,
): Promise<FeriasExtraida[]> {
  const { data, error } = await supabase
    .from('ferias_extraidas')
    .select('*')
    .eq('document_id', documentId);
  if (error) throw error;
  return (data ?? []) as unknown as FeriasExtraida[];
}

export async function loadFaltasByDocument(
  documentId: string,
): Promise<FaltaExtraida[]> {
  const { data, error } = await supabase
    .from('faltas_extraidas')
    .select('*')
    .eq('document_id', documentId);
  if (error) throw error;
  return (data ?? []) as unknown as FaltaExtraida[];
}

export async function deleteFeriasByDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('ferias_extraidas')
    .delete()
    .eq('document_id', documentId);
  if (error) throw error;
}

export async function deleteFaltasByDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('faltas_extraidas')
    .delete()
    .eq('document_id', documentId);
  if (error) throw error;
}

export async function toggleFeriasIncluir(id: string, incluir: boolean): Promise<void> {
  const { error } = await supabase
    .from('ferias_extraidas')
    .update({ incluir })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleFaltasIncluir(id: string, incluir: boolean): Promise<void> {
  const { error } = await supabase
    .from('faltas_extraidas')
    .update({ incluir })
    .eq('id', id);
  if (error) throw error;
}
