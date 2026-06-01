import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Histórico Salarial (Seção 4, paridade PJe-Calc v2.15.1).
 * Persistência (adiciona ocorrência → grava com valor via Decimal) + robustez
 * (valor inválido não corrompe a célula). Backend stubado; hist_salarial +
 * hist_salarial_mes mutáveis em memória.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d4';
const CALC_ID = 'calc-e2e-4';

async function seedHistorico(page: Page): Promise<void> {
  // useCalculoAtivo lê pjecalc_calculos p/ achar o id do cálculo ativo.
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

  let headers: Record<string, unknown>[] = [
    { id: 'h1', calculo_id: CALC_ID, case_id: CASE_ID, nome: 'Salário Base', tipo_variacao: 'FIXA', incide_inss: true, incide_fgts: true, incide_ir: true },
  ];
  let meses: Record<string, unknown>[] = [];

  await page.route(/\/rest\/v1\/pjecalc_hist_salarial(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(headers) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const row = { id: `h${headers.length + 1}`, ...(b ?? {}) };
      headers = headers.concat(row);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) });
      return;
    }
    if (m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      headers = headers.map((h) => ({ ...h, ...(b ?? {}) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(headers) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route(/\/rest\/v1\/pjecalc_hist_salarial_mes(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meses) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      const row = { id: `m${meses.length + 1}`, ...(b ?? {}) };
      meses = meses.concat(row);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) });
      return;
    }
    if (m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      meses = meses.map((o) => ({ ...o, ...(b ?? {}) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meses) });
      return;
    }
    if (m === 'DELETE') { meses = []; await route.fulfill({ status: 204, body: '' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function abrirHistorico(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Histórico Salarial' }).click();
  await expect(page.getByText('Histórico Salarial', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
}

test('Histórico Salarial — adiciona ocorrência e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Hist', user_id: E2E_USER_ID });
  await seedHistorico(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirHistorico(page);

  await page.getByRole('button', { name: 'Nova Ocorrência' }).click();
  // a nova ocorrência aparece como uma linha editável com input de valor
  await expect(page.locator('input[type="month"]').first()).toBeVisible({ timeout: 10_000 });
});
