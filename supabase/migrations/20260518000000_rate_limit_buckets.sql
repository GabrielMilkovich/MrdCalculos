-- Audit-fix S3 — Rate limit global por usuário + função.
--
-- Antes: ocr-document tinha rate-limit local (in-memory counter) por caso;
-- parse-ficha-financeira (OpenAI) e ocr-document (Mistral API paga)
-- estavam SEM proteção alguma — qualquer usuário autenticado podia farmar
-- as APIs pagas até esgotar a cota da Anthropic/Mistral.
--
-- Esta migration cria a tabela `function_rate_limit_buckets` consumida
-- pelo helper `_shared/rate-limit.ts`. A janela é deslizante (não fixa)
-- via filtro `> now() - interval`. RLS owner-only: cada usuário só vê
-- (e bypass via SERVICE_ROLE nos edge functions) seus próprios buckets.

CREATE TABLE IF NOT EXISTS public.function_rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frlb_user_func_time
  ON public.function_rate_limit_buckets (user_id, function_name, called_at DESC);

-- Garbage collection: rows > 24h não servem mais para nenhuma janela.
-- Deletadas por trigger periódico (cron job fora deste escopo) ou ON
-- CONFLICT em insert pesado. Para já, índice acima já dá performance OK.

ALTER TABLE public.function_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- RLS owner-only: usuário só lê seus próprios buckets. SERVICE_ROLE
-- (usado pelos edge functions) bypassa via BYPASSRLS, então insere/conta
-- sem restrição. Sem policy para INSERT/DELETE do client — só backend.
CREATE POLICY "function_rate_limit_buckets_select_own"
  ON public.function_rate_limit_buckets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.function_rate_limit_buckets IS
  'Audit-fix S3: rate limit global de edge functions pagas. '
  'Usado por _shared/rate-limit.ts. GC manual (24h+) ou via cron.';
