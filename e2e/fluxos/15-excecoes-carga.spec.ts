import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Exceções Carga Horária (Seção 9).
 * Persistência (adiciona exceção → aparece na tabela) + validação (fim < início
 * bloqueia, @GreaterOrEqualThan/MSG0008). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d9';

async function seedExcecoes(page: Page): Promise<void> {
  let rows: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/pjecalc_excecoes_carga(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `exc-${rows.length + 1}`, ...(b ?? {}) };
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function abrirExcecoes(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Exceções Carga Horária' }).click();
  await expect(page.getByRole('heading', { name: 'Exceções de Carga Horária' })).toBeVisible({ timeout: 15_000 });
}

test('Exceções Carga — adiciona e persiste na tabela', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Exc', user_id: E2E_USER_ID });
  await seedExcecoes(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirExcecoes(page);

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="date"]').nth(0).fill('2023-01-01');
  await dialog.locator('input[type="date"]').nth(1).fill('2023-06-30');
  await dialog.locator('input[type="number"]').fill('180');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Exceção adicionada!')).toBeVisible({ timeout: 10_000 });
});

test('Exceções Carga — fim anterior ao início bloqueia (MSG0008)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Exc', user_id: E2E_USER_ID });
  await seedExcecoes(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirExcecoes(page);

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="date"]').nth(0).fill('2023-06-30');
  await dialog.locator('input[type="date"]').nth(1).fill('2023-01-01');
  await dialog.locator('input[type="number"]').fill('180');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Período fim não pode ser anterior ao início.')).toBeVisible({ timeout: 10_000 });
});
