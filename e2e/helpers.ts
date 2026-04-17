import type { Page } from '@playwright/test';

/**
 * Mocka uma sessão Supabase no localStorage para permitir que ProtectedRoute
 * renderize sem depender de backend real. A chave segue o formato default do
 * supabase-js v2: `sb-<project-ref>-auth-token`.
 *
 * Como VITE_SUPABASE_URL pode não existir em ambiente de teste, o client
 * cai no placeholder `placeholder.supabase.co` (ver integrations/supabase/client.ts).
 * Mockamos ambas as chaves possíveis por segurança.
 */
export async function mockSupabaseSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    const fakeSession = {
      access_token: 'fake-access-token-e2e',
      refresh_token: 'fake-refresh-token-e2e',
      expires_in: 3600,
      expires_at: now + 3600,
      token_type: 'bearer',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'e2e@mrdcalc.test',
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'E2E Tester' },
        created_at: new Date().toISOString(),
      },
    };
    // Chaves possíveis usadas pelo supabase-js.
    const keys = [
      'sb-placeholder-auth-token',
      'supabase.auth.token',
    ];
    const payload = JSON.stringify(fakeSession);
    for (const k of keys) {
      try { window.localStorage.setItem(k, payload); } catch { /* noop */ }
    }
  });
}

/**
 * Intercepta chamadas para o backend Supabase e responde com stubs vazios.
 * Evita requisições de rede reais durante os smoke tests.
 */
export async function stubSupabaseNetwork(page: Page): Promise<void> {
  await page.route(/supabase\.co\/.*/, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null, session: null }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/**
 * Helper combinado: mocka sessão + stub de rede antes de navegar.
 */
export async function setupAuthedPage(page: Page): Promise<void> {
  await stubSupabaseNetwork(page);
  await mockSupabaseSession(page);
}
