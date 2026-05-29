import { test, expect, type Page } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Dados do Processo (Seção 1, paridade PJe-Calc v2.15.1).
 *
 * Cobre o gate de persistência da DoD: preenche → salva → recarrega → persiste.
 * Backend Supabase é stubado (rede interceptada — ver e2e/helpers.ts). O stub de
 * `pjecalc_calculos` é MUTÁVEL: o PATCH/POST do upsert atualiza o estado em
 * memória e o GET pós-reload devolve o valor salvo, provando a persistência ao
 * nível de UI sem backend real.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d1';

async function seedCalculoMutavel(page: Page): Promise<void> {
  let current: Record<string, unknown> = { id: 'calc-e2e-1', case_id: CASE_ID, user_id: E2E_USER_ID };
  const handler = async (route: import('@playwright/test').Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      const single = accept.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? current : [current]) });
      return;
    }
    if (m === 'POST' || m === 'PATCH') {
      const body = route.request().postDataJSON?.() as unknown;
      const merged = Array.isArray(body) ? body[0] : body;
      current = { ...current, ...((merged as Record<string, unknown>) ?? {}) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([current]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  };
  // base table (writes do form) + view (leituras do serviço)
  await page.route(/\/rest\/v1\/pjecalc_calculos(\?|$)/, handler);
  await page.route(/\/rest\/v1\/pjecalc_dados_processo(\?|$)/, handler);
}

async function abrirAbaCalculo(page: Page): Promise<void> {
  // A aba "Cálculo" monta o PjeCalcInline (módulo default = Dados do Processo).
  const tab = page.getByText('Cálculo', { exact: true }).first();
  await tab.click();
}

test('Dados do Processo — preenche, salva, recarrega e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente E2E', user_id: E2E_USER_ID });
  await seedCalculoMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirAbaCalculo(page);

  const valor = page.getByLabel('Valor da Causa (R$)');
  await expect(valor).toBeVisible({ timeout: 15_000 });
  await valor.fill('1.234,56');
  await page.getByLabel('Nome').first().fill('Reclamante E2E');

  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Dados do processo salvos!')).toBeVisible({ timeout: 10_000 });

  // Recarrega: o stub mutável deve devolver o valor salvo (normalizado p/ Decimal).
  await page.reload();
  await abrirAbaCalculo(page);
  await expect(page.getByLabel('Valor da Causa (R$)')).toHaveValue('1234.56', { timeout: 15_000 });
});

test('Dados do Processo — bloqueia CNJ com dígito verificador inválido', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente E2E', user_id: E2E_USER_ID });
  await seedCalculoMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirAbaCalculo(page);

  const cnj = page.getByLabel('Nº do Processo (CNJ)');
  await expect(cnj).toBeVisible({ timeout: 15_000 });
  await cnj.fill('0001327-26.2010.8.26.0100'); // dígito errado (correto = 25)
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(/CNJ inválido/i)).toBeVisible({ timeout: 10_000 });
});
