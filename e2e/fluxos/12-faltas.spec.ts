import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Faltas (Seção 5, paridade PJe-Calc v2.15.1).
 * Persistência (adiciona falta → linha aparece) + validação (término < inicial
 * bloqueia, paridade @GreaterOrEqualThan/MSG0008). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d5';
const CALC_ID = 'calc-e2e-5';

async function seedFaltas(page: Page): Promise<void> {
  await page.route(/\/rest\/v1\/pjecalc_calculos(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      const single = accept.includes('vnd.pgrst.object');
      const row = { id: CALC_ID, case_id: CASE_ID, user_id: E2E_USER_ID, ativo: true, created_at: new Date().toISOString() };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  let rows: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/pjecalc_faltas(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `falta-${rows.length + 1}`, ...(b ?? {}) };
      rows = rows.concat(r);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([r]) });
      return;
    }
    if (m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      rows = rows.map((o) => ({ ...o, ...(b ?? {}) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'DELETE') { rows = []; await route.fulfill({ status: 204, body: '' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function abrirFaltas(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Faltas' }).click();
  await expect(page.getByText('Faltas', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
}

test('Faltas — adiciona e persiste linha', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Faltas', user_id: E2E_USER_ID });
  await seedFaltas(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirFaltas(page);

  await page.getByRole('button', { name: /Nova Falta|Adicionando/ }).click();
  // a nova falta aparece como linha com inputs de data
  await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 10_000 });
});

test('Faltas — término anterior ao inicial é bloqueado (MSG0008)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Faltas', user_id: E2E_USER_ID });
  await seedFaltas(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirFaltas(page);

  await page.getByRole('button', { name: /Nova Falta|Adicionando/ }).click();
  const dates = page.locator('input[type="date"]');
  await expect(dates.first()).toBeVisible({ timeout: 10_000 });
  // inicial = 2023-03-10, depois término = 2023-03-01 (anterior → bloqueia)
  await dates.nth(0).fill('2023-03-10');
  await dates.nth(0).blur();
  await dates.nth(1).fill('2023-03-01');
  await dates.nth(1).blur();
  await expect(page.getByText('Data final não pode ser anterior à data inicial.')).toBeVisible({ timeout: 10_000 });
});
