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

const ERROR_MESSAGES: Record<string, string> = {
  'Failed to send a request to the Edge Function': 'Serviço de conferência indisponível. Tente novamente em alguns minutos.',
  'FunctionsFetchError': 'Não foi possível conectar ao serviço de conferência. Verifique sua conexão.',
  'Authorization required': 'Sessão expirada. Faça login novamente.',
  'Token inválido': 'Sessão expirada. Faça login novamente.',
  'Rate limit excedido': 'Limite de análises atingido. Aguarde alguns minutos.',
  'Rate limit Anthropic': 'Serviço de IA temporariamente sobrecarregado. Tente em alguns minutos.',
  'PDF original não disponível para este documento': 'PDF original não encontrado. O documento precisa ter o arquivo PDF anexado.',
  'Documento não encontrado': 'Documento não encontrado no sistema.',
  'ANTHROPIC_API_KEY não configurada': 'Serviço de IA não configurado. Contate o suporte.',
};

function humanizeError(raw: string): string {
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (raw.includes(key)) return msg;
  }
  if (/timeout|abort|ETIMEDOUT/i.test(raw)) {
    return 'A análise demorou demais. O documento pode ser muito grande. Tente novamente.';
  }
  if (/fetch|network|ECONNREFUSED/i.test(raw)) {
    return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível completar a análise. Tente novamente.';
}

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
    return { ok: false, error: humanizeError(error.message) };
  }

  if (data?.error) {
    return { ok: false, error: humanizeError(data.error), status: data.status };
  }

  return { ok: true, result: data as ParidadeForenseResult };
}
