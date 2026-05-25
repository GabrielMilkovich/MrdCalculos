import { supabase } from '@/integrations/supabase/client';
import type { ParidadeForenseResult, ParidadeBuilder } from '../types';

export interface InvokeParidadeInput {
  document_id: string;
  builder: ParidadeBuilder;
  parsed: unknown;
  csv_content?: string;
}

export type InvokeResult =
  | { ok: true; result: ParidadeForenseResult }
  | { ok: false; error: string; status?: number };

export async function invokeParidadeForense(
  input: InvokeParidadeInput,
): Promise<InvokeResult> {
  const { data, error } = await supabase.functions.invoke('verify-csv-parity-ai', {
    body: {
      document_id: input.document_id,
      builder: input.builder,
      parsed: input.parsed,
      csv_content: input.csv_content,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data?.error) {
    return { ok: false, error: data.error, status: data.status };
  }

  return { ok: true, result: data as ParidadeForenseResult };
}
