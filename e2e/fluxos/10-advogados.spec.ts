import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Advogados (Seção 3, paridade PJe-Calc v2.15.1).
 * Persistência (adiciona → aparece na lista) + validação (Nome vazio bloqueia,
 * Advogado.validar MSG0003). Backend stubado; pjecalc_advogados mutável.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d3';

async function seedAdvogadosMutavel(page: Page): Promise<void> {
  let rows: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/pjecalc_advogados(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      return;
    }
    if (m === 'POST') {
      const body = route.request().postDataJSON?.() as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const arr = Array.isArray(body) ? body : body ? [body] : [];
      rows = rows.concat(arr.map((r, i) => ({ id: `adv-${rows.length + i}`, created_at: new Date().toISOString(), ...r })));
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(arr) });
      return;
    }
    if (m === 'DELETE') { rows = []; await route.fulfill({ status: 204, body: '' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function abrirAdvogados(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Advogados' }).click();
  await expect(page.getByText('Advogados do Reclamante')).toBeVisible({ timeout: 15_000 });
}

test('Advogados — adiciona e persiste na lista', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Adv', user_id: E2E_USER_ID });
  await seedAdvogadosMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirAdvogados(page);

  // abre o formulário de "Advogados do Reclamante"
  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await page.getByPlaceholder('Dr. João Silva').fill('Dra. Maria Souza');
  await page.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByText('Advogado adicionado')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Dra. Maria Souza')).toBeVisible();
});

test('Advogados — Nome vazio bloqueia (MSG0003)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Adv', user_id: E2E_USER_ID });
  await seedAdvogadosMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirAdvogados(page);

  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  // sem preencher nome → OK
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByText('Nome do advogado é obrigatório.')).toBeVisible({ timeout: 10_000 });
});
