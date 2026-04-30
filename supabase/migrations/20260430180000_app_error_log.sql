-- ============================================================================
-- app_error_log — captura de erros de UI vindos do frontend.
--
-- Objetivo:
--   Persistir erros não-tratados (ErrorBoundary, unhandledrejection, queries do
--   react-query) para diagnóstico via painel admin /admin/erros.
--
-- Modelo de acesso (RLS):
--   - INSERT: usuário autenticado pode inserir SOMENTE com user_id = auth.uid().
--   - SELECT: usuário lê os próprios erros; admin (has_role) lê todos.
--   - UPDATE/DELETE: somente admin (has_role).
--
-- Notas:
--   - case_id é opcional (NULL) — nem todo erro está atrelado a um caso.
--   - context é JSONB para queryKey/mutationKey/extras serializáveis.
--   - Sem cascata via FK em case_id para preservar histórico mesmo após delete
--     do caso (ON DELETE SET NULL).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_error_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  case_id     UUID NULL,
  source      TEXT NULL,
  message     TEXT NULL,
  stack       TEXT NULL,
  route       TEXT NULL,
  context     JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_app_error_log_created_at
  ON public.app_error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_log_user_id
  ON public.app_error_log (user_id);

ALTER TABLE public.app_error_log ENABLE ROW LEVEL SECURITY;

-- INSERT: o próprio usuário (NÃO pode forjar user_id de terceiro).
DROP POLICY IF EXISTS "insert_own_error_log" ON public.app_error_log;
CREATE POLICY "insert_own_error_log" ON public.app_error_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: dono OU admin.
DROP POLICY IF EXISTS "select_own_or_admin_error_log" ON public.app_error_log;
CREATE POLICY "select_own_or_admin_error_log" ON public.app_error_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- UPDATE: somente admin (caso queira anotar/triar).
DROP POLICY IF EXISTS "update_admin_error_log" ON public.app_error_log;
CREATE POLICY "update_admin_error_log" ON public.app_error_log
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DELETE: somente admin (limpeza/retention).
DROP POLICY IF EXISTS "delete_admin_error_log" ON public.app_error_log;
CREATE POLICY "delete_admin_error_log" ON public.app_error_log
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON TABLE public.app_error_log IS
  'Log de erros de UI capturados pelo error-reporter do frontend (ErrorBoundary, '
  'window error/unhandledrejection, react-query). Read: dono ou admin.';
