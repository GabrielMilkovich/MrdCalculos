import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Contribuição Social / INSS config (Seção 15).
 * Persistência (configura → salva) + validação (alíquota empresa > 100% bloqueia,
 * paridade Inss.validar / alíquotas 0–100). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000de';

async function seedCS(page: Page): Promise<void> {
  let config: Record<string, unknown> | null = null;
  await page.route(/\/rest\/v1\/pjecalc_cs_config(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      const single = accept.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? config : (config ? [config] : [])) });
      return;
    }
    if (m === 'POST' || m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      config = { id: 'cs-1', ...(config ?? {}), ...(b ?? {}) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([config]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  // grade CS ocorrências → vazia
  await page.route(/\/rest\/v1\/pjecalc_cs_ocorrencias(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

async function abrirCS(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: /Contribui|INSS/ }).first().click();
  await expect(page.getByText('Apurar Contribuição do Segurado')).toBeVisible({ timeout: 15_000 });
}

test('Contribuição Social — configura e salva', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente CS', user_id: E2E_USER_ID });
  await seedCS(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirCS(page);

  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Contribuição Social configurada!')).toBeVisible({ timeout: 10_000 });
});

test('Contribuição Social — alíquota empresa > 100% bloqueia', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente CS', user_id: E2E_USER_ID });
  await seedCS(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirCS(page);

  await page.getByPlaceholder('20%').fill('150');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Alíquota de empresa deve estar entre 0 e 100%.')).toBeVisible({ timeout: 10_000 });
});
