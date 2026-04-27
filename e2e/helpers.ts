import type { Page, Route } from '@playwright/test';

/**
 * IDs e tokens fake usados pelos helpers E2E.
 * Centralizados aqui para que os specs possam fazer asserts sobre eles.
 */
export const E2E_USER_ID = '00000000-0000-0000-0000-000000000001';
export const E2E_USER_EMAIL = 'e2e@mrdcalc.test';
export const E2E_ACCESS_TOKEN = 'fake-access-token-e2e';
export const E2E_REFRESH_TOKEN = 'fake-refresh-token-e2e';

/**
 * Chaves de localStorage que o supabase-js v2 procura por sessão.
 * O formato real é `sb-<hostname-first-segment>-auth-token`.
 *
 * - `sb-localhost-auth-token` cobre o caso `VITE_SUPABASE_URL=http://localhost:54321`
 *   (usado em `.env.test`).
 * - `sb-placeholder-auth-token` cobre o fallback do client.ts quando nenhum
 *   env var foi resolvido.
 */
const SESSION_STORAGE_KEYS = [
  'sb-localhost-auth-token',
  'sb-placeholder-auth-token',
];

/** Constrói o objeto de sessão Supabase mínimo válido. */
function buildFakeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: E2E_ACCESS_TOKEN,
    refresh_token: E2E_REFRESH_TOKEN,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: E2E_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: E2E_USER_EMAIL,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'E2E Tester' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
    },
  };
}

/**
 * Injeta uma sessão Supabase fake no `localStorage` *antes* do app montar
 * (`addInitScript` roda antes de qualquer script da página).
 *
 * Por que múltiplas chaves: o supabase-js deriva o storageKey a partir do
 * primeiro segmento do hostname da URL (ver SupabaseClient: `sb-${host}-auth-token`).
 * Como a URL pode mudar entre `localhost`, `placeholder` ou outro, gravamos
 * a sessão em todas as chaves prováveis.
 *
 * @param page Page do Playwright.
 */
export async function mockSupabaseSession(page: Page): Promise<void> {
  const session = buildFakeSession();
  await page.addInitScript(
    ({ keys, payload }) => {
      const json = JSON.stringify(payload);
      for (const k of keys) {
        try {
          window.localStorage.setItem(k, json);
        } catch {
          /* noop */
        }
      }
    },
    { keys: SESSION_STORAGE_KEYS, payload: session },
  );
}

/**
 * Resposta JSON helper.
 */
async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Intercepta TODAS as requests para endpoints Supabase (auth + rest + storage
 * + functions + realtime), independentemente do host configurado.
 *
 * Comportamento:
 *  - `**\/auth\/v1\/token*` → retorna a sessão fake (refresh, password grant, etc).
 *  - `**\/auth\/v1\/user*`  → retorna o usuário fake.
 *  - `**\/auth\/v1\/logout` → 204.
 *  - `**\/auth\/v1\/**`     → fallback `{ user: null, session: null }`.
 *  - `**\/rest\/v1\/**`     → array vazio (compatível com `.select()`).
 *  - `**\/storage\/v1\/**`  → array vazio.
 *  - `**\/functions\/v1\/**`→ `{}` (Edge Function não deve ser chamada em smoke).
 *  - `**\/realtime\/v1\/**` → 204 (websocket cai para erro silencioso).
 *
 * @param page Page do Playwright.
 */
export async function stubSupabaseNetwork(page: Page): Promise<void> {
  const session = buildFakeSession();

  // auth/v1/token (login, refresh, password grant)
  await page.route(/\/auth\/v1\/token(\?|$)/, async (route) => {
    await fulfillJson(route, session);
  });

  // auth/v1/user (getUser)
  await page.route(/\/auth\/v1\/user(\?|$)/, async (route) => {
    await fulfillJson(route, session.user);
  });

  // auth/v1/logout
  await page.route(/\/auth\/v1\/logout/, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  // Demais auth/v1/** → resposta neutra
  await page.route(/\/auth\/v1\//, async (route) => {
    await fulfillJson(route, { user: null, session: null });
  });

  // rest/v1/** → array vazio (compatível com queries SELECT/insert sem retorno)
  await page.route(/\/rest\/v1\//, async (route) => {
    const method = route.request().method();
    // Para HEAD (count) o supabase-js só lê headers; OK retornar array vazio.
    if (method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await fulfillJson(route, []);
  });

  // storage/v1/** → array vazio (listagens) ou 204 (uploads)
  await page.route(/\/storage\/v1\//, async (route) => {
    const method = route.request().method();
    if (method === 'POST' || method === 'PUT') {
      await fulfillJson(route, { Key: 'stub', Id: 'stub' });
      return;
    }
    await fulfillJson(route, []);
  });

  // functions/v1/** → resposta vazia. Smoke tests não devem disparar Edge Functions.
  await page.route(/\/functions\/v1\//, async (route) => {
    await fulfillJson(route, {});
  });

  // realtime/v1/** → 204 (Playwright não intercepta WS, mas pega o handshake HTTP).
  await page.route(/\/realtime\/v1\//, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}

/**
 * Helper combinado: stuba rede Supabase + mocka sessão no localStorage.
 *
 * Uso:
 * ```ts
 * test('minha rota protegida', async ({ page }) => {
 *   await setupAuthedPage(page);
 *   await page.goto('/casos');
 *   // ProtectedRoute deve liberar a navegação porque getSession() agora resolve.
 * });
 * ```
 *
 * Limitações conhecidas:
 *  - Não simula Postgres real — qualquer hook que dependa de dados específicos
 *    em `data` precisa ser stubado caso a caso (use `page.route` específico
 *    *depois* desta chamada para sobrescrever a rota relevante).
 *  - Não roda Edge Functions — `supabase.functions.invoke()` retorna `{}`.
 *
 * @param page Page do Playwright.
 */
export async function setupAuthedPage(page: Page): Promise<void> {
  await stubSupabaseNetwork(page);
  await mockSupabaseSession(page);
}
