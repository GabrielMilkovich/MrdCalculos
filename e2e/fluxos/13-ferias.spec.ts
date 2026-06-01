import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Férias (Seção 6, paridade PJe-Calc v2.15.1).
 * Persistência (adiciona período → linha aparece) + validação (dias de abono >
 * 1/3 do prazo bloqueia — DiasDeAbonoValidRule/MSG0175). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d6';
const CALC_ID = 'calc-e2e-6';

async function seedFerias(page: Page): Promise<void> {
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
  await page.route(/\/rest\/v1\/pjecalc_ferias(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `fer-${rows.length + 1}`, prazo_dias: 30, abono: false, abono_dias: 0, ...(b ?? {}) };
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

async function abrirFerias(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Férias' }).click();
  await expect(page.getByText('Períodos aquisitivos, concessivos e gozos parciais.')).toBeVisible({ timeout: 15_000 });
}

test('Férias — adiciona período e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Ferias', user_id: E2E_USER_ID });
  await seedFerias(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirFerias(page);

  await page.getByRole('button', { name: 'Novo Período' }).click();
  await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 10_000 });
});

test('Férias — dias de abono > 1/3 do prazo bloqueia (MSG0175)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Ferias', user_id: E2E_USER_ID });
  await seedFerias(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirFerias(page);

  await page.getByRole('button', { name: 'Novo Período' }).click();
  await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 10_000 });

  // liga abono (shadcn Checkbox = button[role=checkbox] → click), prazo=30
  // (default), dias de abono = 11 (>10 = 30/3) → bloqueia.
  const row = page.locator('table tbody tr').first();
  await row.getByRole('checkbox').nth(1).click(); // 0=Dobra, 1=Abono
  const abonoDiasInput = row.locator('input[type="number"]').nth(1); // 0=Prazo, 1=Dias Abono
  await abonoDiasInput.fill('11');
  await abonoDiasInput.blur();
  await expect(page.getByText('Dias de abono não podem exceder 1/3 do prazo.')).toBeVisible({ timeout: 10_000 });
});
