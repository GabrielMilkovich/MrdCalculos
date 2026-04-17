import { test, expect, type ConsoleMessage } from '@playwright/test';
import { setupAuthedPage } from './helpers';

test.describe('smoke: app-loads', () => {
  test('carrega a página inicial sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignora erros esperados de rede/Supabase em ambiente E2E.
        if (/VITE_SUPABASE|Failed to fetch|NetworkError/i.test(text)) return;
        consoleErrors.push(text);
      }
    });

    await setupAuthedPage(page);
    await page.goto('/');

    // Deve renderizar algum chrome de app (body presente + root React montado).
    await expect(page.locator('#root')).toBeVisible();

    // Checa se existe alguma navegação/header comum ao app autenticado.
    // Aceita qualquer header, nav ou link para rotas internas conhecidas.
    const hasChrome = await page
      .locator('header, nav, [role="navigation"], a[href="/casos"], a[href="/novo-calculo"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Se o ProtectedRoute redirecionou para /auth, ainda consideramos OK desde
    // que a página tenha carregado (smoke apenas).
    const onAuth = page.url().includes('/auth');
    expect(hasChrome || onAuth).toBeTruthy();

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
