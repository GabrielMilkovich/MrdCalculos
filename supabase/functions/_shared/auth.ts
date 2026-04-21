/**
 * Helpers de autenticação e ownership para Edge Functions.
 *
 * Padrão de uso:
 *   const auth = await requireAuthedUser(req, supabase);
 *   await requireCaseOwnership(supabase, auth.user.id, caseId);
 *
 * Falhas retornam Error com código HTTP adequado via { httpStatus }.
 */

import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthedContext {
  user: User;
  token: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Verifica Authorization: Bearer <jwt> e retorna o usuário autenticado.
 * Exige SUPABASE_URL + ANON/PUBLISHABLE key já aplicado no client.
 */
export async function requireAuthedUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthedContext> {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AuthError("Authorization header obrigatório", 401);
  }
  const token = match[1].trim();
  if (!token) {
    throw new AuthError("Token vazio", 401);
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new AuthError("Token inválido", 401);
  }
  return { user: data.user, token };
}

/**
 * Verifica que userId possui o caso caseId.
 * Busca uma única coluna para eficiência; RLS garante que outros caseId's
 * retornem null em vez de vazar dados.
 */
export async function requireCaseOwnership(
  supabase: SupabaseClient,
  userId: string,
  caseId: unknown,
): Promise<string> {
  if (typeof caseId !== "string" || !isUuid(caseId)) {
    throw new AuthError("case_id inválido", 400);
  }
  // Usar service_role para bypass de RLS e fazer a verificação real.
  const { data, error } = await supabase
    .from("cases")
    .select("criado_por")
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    throw new AuthError("Falha ao verificar ownership do caso", 500);
  }
  if (!data || data.criado_por !== userId) {
    // Mesmo erro para "não existe" e "não é dono" — evita enumeration.
    throw new AuthError("Caso não encontrado", 404);
  }
  return caseId;
}

/**
 * Verifica ownership de um documento via documents.owner_user_id ou
 * encadeamento documents.case_id → cases.criado_por.
 */
export async function requireDocumentOwnership(
  supabase: SupabaseClient,
  userId: string,
  documentId: unknown,
): Promise<{ documentId: string; caseId: string | null }> {
  if (typeof documentId !== "string" || !isUuid(documentId)) {
    throw new AuthError("document_id inválido", 400);
  }
  const { data, error } = await supabase
    .from("documents")
    .select("id, case_id, owner_user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new AuthError("Falha ao verificar ownership do documento", 500);
  }
  if (!data) {
    throw new AuthError("Documento não encontrado", 404);
  }
  // Owner direto tem acesso
  if (data.owner_user_id === userId) {
    return { documentId, caseId: data.case_id ?? null };
  }
  // Se há case_id, verificar via cases
  if (data.case_id) {
    const { data: caseData } = await supabase
      .from("cases")
      .select("criado_por")
      .eq("id", data.case_id)
      .maybeSingle();
    if (caseData?.criado_por === userId) {
      return { documentId, caseId: data.case_id };
    }
  }
  throw new AuthError("Documento não encontrado", 404);
}

export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Converte AuthError em Response apropriada. Outros erros devem ser
 * tratados pelo caller (retornar 500 genérico).
 */
export function authErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response | null {
  if (err instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: err.httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  return null;
}
