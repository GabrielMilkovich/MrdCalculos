import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Pagamentos (Seção 13).
 * Persistência (cria pagamento → aparece na tabela) + validação (valor vazio
 * bloqueia; data futura bloqueia, Pagamento.validar/MSG0128). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000dc';
const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function seedPagamentos(page: Page): Promise<void> {
  let rows: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/pjecalc_pagamentos(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `pg-${rows.length + 1}`, ...(b ?? {}) };
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
  // selects de verbas-base e documentos → vazios
  await page.route(/\/rest\/v1\/pjecalc_verba_base(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(/\/rest\/v1\/documents(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

async function abrirPagamentos(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Pagamentos' }).click();
  await expect(page.getByText('Pagamentos / Abatimentos')).toBeVisible({ timeout: 15_000 });
}

test('Pagamentos — cria pagamento e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Pag', user_id: E2E_USER_ID });
  await seedPagamentos(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirPagamentos(page);

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="number"]').first().fill('1500.00');
  await dialog.locator('input[type="date"]').nth(1).fill('2023-05-10');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Pagamento adicionado!')).toBeVisible({ timeout: 10_000 });
});

test('Pagamentos — data futura bloqueia (MSG0128)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Pag', user_id: E2E_USER_ID });
  await seedPagamentos(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirPagamentos(page);

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="number"]').first().fill('1500.00');
  await dialog.locator('input[type="date"]').nth(1).fill(AMANHA);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Data do pagamento não pode ser futura.')).toBeVisible({ timeout: 10_000 });
});
