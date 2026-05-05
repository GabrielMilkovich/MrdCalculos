/**
 * Cliente do edge function `sugerir-bucket-rubrica` — único uso de IA
 * no fluxo de extração após V7.
 *
 * Uso típico (HoleritePreviewDialog):
 *   const { sugestao } = await sugerirBucketRubrica(supabase, {
 *     rubrica: 'PREMIO PRODUTIVIDADE LOJA',
 *     layout: 'via_varejo',
 *   });
 *   // operador clica "Aceitar e salvar para próximas" → insert em rubrica_mapping.
 *
 * Falhas (rede, OpenAI, validação) viram `SugerirBucketError` com payload
 * estruturado para a UI escolher como tratar (toast, retry, fallback).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BucketPjeCalc, RubricaLayout } from './classificar';

export interface SugestaoBucket {
  bucket: BucketPjeCalc;
  justificativa: string;
  confianca: 'alta' | 'media' | 'baixa';
}

export interface SugerirBucketResponse {
  sugestao: SugestaoBucket;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
}

export interface SugerirBucketRequest {
  rubrica: string;
  layout?: RubricaLayout;
}

export class SugerirBucketError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SugerirBucketError';
  }
}

const BUCKETS_VALIDOS: readonly BucketPjeCalc[] = [
  'minimo_garantido',
  'salario_substituicao',
  'comissoes_produtos',
  'dsr_comissoes',
  'comissoes_servicos',
  'premios',
  'desconsiderar',
];

function isBucketValido(s: unknown): s is BucketPjeCalc {
  return typeof s === 'string' && (BUCKETS_VALIDOS as readonly string[]).includes(s);
}

function isConfiancaValida(s: unknown): s is SugestaoBucket['confianca'] {
  return s === 'alta' || s === 'media' || s === 'baixa';
}

/**
 * Valida a resposta do edge function antes de devolver pra UI.
 * Edge function já valida — esta função é defesa em profundidade caso
 * o contrato mude sem migration coordenada.
 */
export function validarSugestao(payload: unknown): SugestaoBucket {
  if (!payload || typeof payload !== 'object') {
    throw new SugerirBucketError('Resposta vazia ou não-objeto.');
  }
  const obj = payload as Record<string, unknown>;
  if (!isBucketValido(obj.bucket)) {
    throw new SugerirBucketError(
      `Bucket inválido na resposta: ${String(obj.bucket)}`,
    );
  }
  if (!isConfiancaValida(obj.confianca)) {
    throw new SugerirBucketError(
      `Confianca inválida na resposta: ${String(obj.confianca)}`,
    );
  }
  const justificativa =
    typeof obj.justificativa === 'string' ? obj.justificativa : '';
  return {
    bucket: obj.bucket,
    confianca: obj.confianca,
    justificativa,
  };
}

export async function sugerirBucketRubrica(
  supabase: SupabaseClient,
  req: SugerirBucketRequest,
): Promise<SugerirBucketResponse> {
  const rubrica = req.rubrica?.trim();
  if (!rubrica) {
    throw new SugerirBucketError("Campo 'rubrica' é obrigatório.");
  }
  if (rubrica.length > 200) {
    throw new SugerirBucketError("Campo 'rubrica' excede 200 caracteres.");
  }

  const { data, error } = await supabase.functions.invoke(
    'sugerir-bucket-rubrica',
    {
      body: { rubrica, layout: req.layout ?? 'generico' },
    },
  );

  if (error) {
    throw new SugerirBucketError(
      `Falha ao invocar edge function: ${error.message}`,
      error,
    );
  }

  if (!data || typeof data !== 'object') {
    throw new SugerirBucketError('Edge function retornou payload vazio.');
  }

  const obj = data as Record<string, unknown>;
  if ('error' in obj && typeof obj.error === 'string') {
    throw new SugerirBucketError(obj.error);
  }

  const sugestao = validarSugestao(obj.sugestao);
  const usage = (obj.usage ?? null) as SugerirBucketResponse['usage'];

  return { sugestao, usage };
}
