/**
 * Rate limiting simples baseado em banco de dados.
 *
 * Uso em edge function:
 *   await checkRateLimit(supabase, {
 *     userId: auth.user.id,
 *     bucket: "llm-extract",
 *     maxRequests: 30,
 *     windowSeconds: 60,
 *   });
 *
 * Joga AuthError(429) se excedido.
 *
 * Implementação: tabela `rate_limit_log` com (user_id, bucket, created_at).
 * COUNT(*) WHERE created_at > now() - windowSeconds.
 *
 * Nota: para produção de alto volume usar Redis / Upstash Ratelimit.
 * Esta versão cobre o caso: proteger LLM calls caros contra abuso de um
 * único user (ex.: loop de frontend que gera N chamadas por segundo).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthError } from "./auth.ts";

export interface RateLimitParams {
  userId: string;
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  p: RateLimitParams,
): Promise<void> {
  const cutoff = new Date(Date.now() - p.windowSeconds * 1000).toISOString();

  // Contabiliza requests recentes. Se a tabela não existir ainda (migration
  // pendente), logamos e continuamos — rate limit é defensa em profundidade.
  const { count, error } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", p.userId)
    .eq("bucket", p.bucket)
    .gte("created_at", cutoff);

  if (error) {
    // Tabela pode não existir ainda; não bloqueia a request
    console.warn("[rate-limit] Falha ao consultar:", error.message);
    return;
  }

  if ((count ?? 0) >= p.maxRequests) {
    throw new AuthError(
      `Limite de ${p.maxRequests} chamadas/${p.windowSeconds}s atingido. Tente novamente em breve.`,
      429,
    );
  }

  // Registra a request ANTES de executar — evita burst paralelo
  const { error: insertError } = await supabase
    .from("rate_limit_log")
    .insert({ user_id: p.userId, bucket: p.bucket });

  if (insertError) {
    console.warn("[rate-limit] Falha ao registrar:", insertError.message);
    // Não aborta — preferimos passar do que bloquear por falha infra
  }
}
