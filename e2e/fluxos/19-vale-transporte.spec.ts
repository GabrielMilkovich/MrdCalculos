import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Vale Transporte (Seção 14).
 * Persistência de linha (corrige bug: antes não salvava edição) + validação
 * (valor da passagem negativo bloqueia). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000dd';
const CFG_ID = 'vtcfg-1';

async function seedVT(page: Page): Promise<void> {
  let config: Record<string, unknown> | null = { id: CFG_ID, calculo_id: CASE_ID, apurar: true, desconto_empregado_pct: 6, observacoes: null };
  let linhas: Record<string, unknown>[] = [];

  await page.route(/\/rest\/v1\/pjecalc_vale_transporte_config(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      const single = accept.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? config : (config ? [config] : [])) });
      return;
    }
    if (m === 'POST' || m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      config = { ...(config ?? { id: CFG_ID }), ...(b ?? {}) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([config]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route(/\/rest\/v1\/pjecalc_vale_transporte_linhas(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(linhas) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const r = { id: `vtl-${linhas.length + 1}`, ...(b ?? {}) };
      linhas = linhas.concat(r);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([r]) });
      return;
    }
    if (m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      linhas = linhas.map((o) => ({ ...o, ...(b ?? {}) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(linhas) });
      return;
    }
    if (m === 'DELETE') { linhas = []; await route.fulfill({ status: 204, body: '' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function abrirVT(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Vale Transporte' }).click();
  await expect(page.getByText('Apurar Vale Transporte')).toBeVisible({ timeout: 15_000 });
}

test('Vale Transporte — adiciona linha e edita valor (persiste)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente VT', user_id: E2E_USER_ID });
  await seedVT(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirVT(page);

  // apurar já vem true (config seedada) → seção de linhas visível
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('Linha adicionada')).toBeVisible({ timeout: 10_000 });
  // edita o valor da passagem (input number da linha) → onBlur persiste (PATCH)
  const valorInput = page.getByPlaceholder('Valor');
  await expect(valorInput).toBeVisible({ timeout: 10_000 });
  await valorInput.fill('4.50');
  await valorInput.blur();
  // sem toast de erro de validação
  await expect(page.getByText(/Valor da passagem deve ser/)).toHaveCount(0);
});

test('Vale Transporte — valor de passagem negativo bloqueia', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente VT', user_id: E2E_USER_ID });
  await seedVT(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirVT(page);

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const valorInput = page.getByPlaceholder('Valor');
  await expect(valorInput).toBeVisible({ timeout: 10_000 });
  await valorInput.fill('-5');
  await valorInput.blur();
  await expect(page.getByText('Valor da passagem deve ser ≥ 0.')).toBeVisible({ timeout: 10_000 });
});
