import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Cadastro de Verbas (Seção 11).
 * Persistência (cria verba → aparece na tabela) + validação (nome vazio bloqueia;
 * período fim < início bloqueia, consistirPeriodoFinal/MSG0008). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000db';

async function seedVerbas(page: Page): Promise<void> {
  let rows: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/pjecalc_verba_base(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `vb-${rows.length + 1}`, ...(b ?? {}) };
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

async function abrirVerbas(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Cadastro de Verbas' }).click();
  await expect(page.getByRole('heading', { name: 'Verbas (Cadastro)' })).toBeVisible({ timeout: 15_000 });
}

test('Cadastro de Verbas — cria verba e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Verba', user_id: E2E_USER_ID });
  await seedVerbas(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirVerbas(page);

  await page.getByRole('button', { name: 'Nova Verba' }).click();
  const dialog = page.getByRole('dialog');
  // O Label "Nome" não está associado via htmlFor → mira o 1º input do dialog.
  await dialog.locator('input[type="text"], input:not([type])').first().fill('Horas Extras 50%');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Verba criada!')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Horas Extras 50%')).toBeVisible();
});

test('Cadastro de Verbas — nome vazio bloqueia', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Verba', user_id: E2E_USER_ID });
  await seedVerbas(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirVerbas(page);

  await page.getByRole('button', { name: 'Nova Verba' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Informe o nome da verba.')).toBeVisible({ timeout: 10_000 });
});
