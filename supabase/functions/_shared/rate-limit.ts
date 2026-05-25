// =====================================================
// Audit-fix S3 — Rate limit global por (user_id, function_name).
// =====================================================
// Antes deste módulo, `ocr-document` (Mistral API paga) tinha rate-limit
// local in-memory por caso; `parse-ficha-financeira` (OpenAI paga) não
// tinha proteção alguma. Qualquer usuário autenticado podia farmar as
// APIs pagas indefinidamente.
//
// Implementação:
//   1. INSERT na tabela `function_rate_limit_buckets` (1 row por chamada)
//   2. SELECT count() das chamadas dentro da janela
//   3. Se count > limite → 429
//
// Janela deslizante (não fixa). Tabela cresce; GC fora deste escopo
// (trigger ou cron job apaga rows > 24h).
//
// Usage:
//   import { checkRateLimit } from "../_shared/rate-limit.ts";
//   const limit = await checkRateLimit(supabase, user.id, "ocr-document", 30, 3600);
//   if (!limit.allowed) return jsonResponse({ error: "Rate limit exceeded", retryAfterSec: limit.retryAfterSec }, 429);
// =====================================================

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfterSec: number;
}

/**
 * Verifica se a chamada pode prosseguir. Já registra a chamada
 * (incrementa o bucket) quando `allowed=true`.
 *
 * @param supabase  Cliente Supabase com SERVICE_ROLE (bypassa RLS)
 * @param userId    ID do usuário autenticado
 * @param functionName  Nome lógico da função (ex: "ocr-document")
 * @param limit     Quantas chamadas permitidas na janela
 * @param windowSec Janela em segundos (ex: 3600 = 1h)
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowSec * 1000).toISOString();

  // Count chamadas anteriores na janela.
  const { count, error: countError } = await supabase
    .from("function_rate_limit_buckets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gt("called_at", windowStart);

  if (countError) {
    // Fail-OPEN: se a tabela não existe ou houve erro de query, NÃO bloqueia
    // o usuário. Logamos no console. Defesa em profundidade quando a infra
    // estiver OK; sem fail-open, falha do supabase derrubaria toda OCR.
    console.error(`[rate-limit] count error: ${countError.message}`);
    return { allowed: true, used: 0, limit, retryAfterSec: 0 };
  }

  const used = count ?? 0;
  if (used >= limit) {
    return { allowed: false, used, limit, retryAfterSec: windowSec };
  }

  // Registra a chamada.
  const { error: insertError } = await supabase
    .from("function_rate_limit_buckets")
    .insert({ user_id: userId, function_name: functionName });
  if (insertError) {
    console.error(`[rate-limit] insert error: ${insertError.message}`);
    // Mesma política fail-open — se não consegue logar a chamada, deixa passar.
  }

  return { allowed: true, used: used + 1, limit, retryAfterSec: 0 };
}
