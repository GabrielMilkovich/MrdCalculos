import { test, expect, type ConsoleMessage } from '@playwright/test';
import { setupAuthedPage } from './helpers';

test.describe('smoke: app-loads', () => {
  test('carrega a página inicial sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignora erros esperados de rede/Supabase em ambiente E2E.
        // - VITE_SUPABASE / fetch / NetworkError: mock pode nao cobrir todos os endpoints.
        // - ERR_CERT_AUTHORITY_INVALID: pode vir de telemetria/3rd-party em sandbox.
        // - Failed to load resource: tipico de assets remotos (fonts, analytics).
        if (/VITE_SUPABASE|Failed to fetch|NetworkError|ERR_CERT_AUTHORITY_INVALID|Failed to load resource/i.test(text)) return;
        consoleErrors.push(text);
      }
    });

    await setupAuthedPage(page);
    await page.goto('/');

    // Deve renderizar algum chrome de app (body presente + root React montado).
    await expect(page.locator('#root')).toBeVisible();

    // Com mock de sessao ativo, ProtectedRoute NAO deve redirecionar para /auth.
    // (Se cair em /auth, ha bug no mock — ver e2e/helpers.ts.)
    expect(page.url(), 'mock de sessao deveria liberar ProtectedRoute').not.toContain('/auth');

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
