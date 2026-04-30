/**
 * Cliente da Edge Function `extract-document-data`. Valida resposta
 * com zod antes de retornar para a UI (defesa contra LLM mal-comportado
 * mesmo que o servidor já tenha persistido).
 */

import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentExtractedData,
  ExtractionCategory,
  FaltasRow,
  FeriasRow,
  HistoricoSalarialRow,
} from './types';

// =====================================================
// Zod schemas (defesa secundária — server já validou)
// =====================================================

const SourceRefSchema = z.object({
  documentId: z.string(),
  documentName: z.string(),
  page: z.number().optional(),
}).optional();

const HistoricoSalarialRowSchema = z.object({
  competencia: z.string(),
  valor: z.number(),
  incideFgts: z.boolean(),
  fgtsRecolhido: z.boolean(),
  incideInss: z.boolean(),
  inssRecolhido: z.boolean(),
  _source: SourceRefSchema,
});

const GozoPeriodoSchema = z.object({
  inicio: z.string(),
  fim: z.string(),
  dobra: z.boolean(),
}).nullable().optional();

const FeriasRowSchema = z.object({
  relativa: z.string(),
  prazo: z.number(),
  situacao: z.enum(['G', 'GP', 'NG', 'I', 'P']),
  dobraGeral: z.boolean(),
  abono: z.boolean(),
  diasAbono: z.number(),
  gozo1: GozoPeriodoSchema,
  gozo2: GozoPeriodoSchema,
  gozo3: GozoPeriodoSchema,
  _source: SourceRefSchema,
});

const FaltasRowSchema = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
  justificada: z.boolean(),
  reiniciarPeriodoAquisitivo: z.boolean(),
  justificativa: z.string().optional(),
  _source: SourceRefSchema,
});

// =====================================================
// API
// =====================================================

export interface ExtractResult {
  ok: boolean;
  document_id: string;
  category: ExtractionCategory;
  rows_extracted: number;
  error?: string;
}

/**
 * Dispara extração estruturada de UM documento. Persiste em
 * document_extracted_data via Edge Function. Retorna resumo.
 */
export async function extractDocument(
  document_id: string,
  category: ExtractionCategory,
): Promise<ExtractResult> {
  const { data, error } = await supabase.functions.invoke('extract-document-data', {
    body: { document_id, category },
  });

  if (error) {
    return {
      ok: false,
      document_id,
      category,
      rows_extracted: 0,
      error: error.message ?? 'Erro desconhecido',
    };
  }

  return {
    ok: data?.ok === true,
    document_id,
    category,
    rows_extracted: data?.rows_extracted ?? 0,
    error: data?.error,
  };
}

/**
 * Lê linhas extraídas de um documento. Filtra inválidas via zod.
 * Retorna array tipado conforme a categoria.
 */
export async function loadExtractedRows(
  document_id: string,
): Promise<{
  data: DocumentExtractedData | null;
  validRows: HistoricoSalarialRow[] | FeriasRow[] | FaltasRow[];
  invalidCount: number;
}> {
  const { data, error } = await supabase
    .from('document_extracted_data')
    .select('*')
    .eq('document_id', document_id)
    .maybeSingle();

  if (error || !data) return { data: null, validRows: [], invalidCount: 0 };

  const row = data as unknown as DocumentExtractedData;
  const rawRows = Array.isArray(row.rows) ? row.rows : [];
  const schema = schemaFor(row.category);

  const valid: unknown[] = [];
  let invalid = 0;
  for (const r of rawRows) {
    const parsed = schema.safeParse(r);
    if (parsed.success) valid.push(parsed.data);
    else invalid += 1;
  }

  return {
    data: row,
    validRows: valid as HistoricoSalarialRow[] | FeriasRow[] | FaltasRow[],
    invalidCount: invalid,
  };
}

function schemaFor(category: ExtractionCategory) {
  switch (category) {
    case 'historico_salarial': return HistoricoSalarialRowSchema;
    case 'ferias': return FeriasRowSchema;
    case 'faltas': return FaltasRowSchema;
  }
}

/**
 * Atualiza linhas após edição manual do usuário. Não muda
 * extraction_status, mas permite re-validar conteúdo via zod.
 */
export async function saveExtractedRows(
  document_id: string,
  rows: HistoricoSalarialRow[] | FeriasRow[] | FaltasRow[],
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('document_extracted_data')
    .update({ rows })
    .eq('document_id', document_id);
  return { ok: !error, error: error?.message };
}

/**
 * Marca documento como validado pelo humano. Usuário só pode validar
 * quando rows não está vazia.
 */
export async function markValidated(
  document_id: string,
  status: 'validated' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada' };

  const { error } = await supabase
    .from('document_extracted_data')
    .update({
      validation_status: status,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq('document_id', document_id);
  return { ok: !error, error: error?.message };
}
