import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Parâmetros Gerais (Seção 2, paridade PJe-Calc v2.15.1).
 * Gate de persistência (preenche → salva → recarrega → persiste) + validação
 * bloqueante (admissão posterior à demissão é rejeitada — Calculo.java MSG0008).
 * Backend Supabase stubado; pjecalc_calculos mutável em memória.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d2';

async function seedCalculoMutavel(page: Page): Promise<void> {
  // Pré-popula Estado (uf) + Município (municipio_ibge): o combobox de município
  // busca a API externa do IBGE (sem rede no sandbox), então fixamos os valores
  // na linha pra exercitar a lógica de DATAS (objeto destes testes), não o IBGE.
  let current: Record<string, unknown> = {
    id: 'calc-e2e-2', case_id: CASE_ID, user_id: E2E_USER_ID,
    uf: 'SP', municipio_ibge: '3550308',
  };
  const handler = async (route: Route) => {
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
  await page.route(/\/rest\/v1\/pjecalc_calculos(\?|$)/, handler);
}

async function abrirParametros(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Parâmetros Gerais' }).click();
  await expect(page.getByText('Datas do Contrato e Cálculo')).toBeVisible({ timeout: 15_000 });
}

test('Parâmetros Gerais — preenche, salva, recarrega e persiste', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente PG', user_id: E2E_USER_ID });
  await seedCalculoMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirParametros(page);

  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill('2020-01-01'); // admissão
  await dates.nth(1).fill('2023-06-30'); // demissão (válida → admissão ≤ demissão)
  await dates.nth(2).fill('2023-08-01'); // ajuizamento

  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Parâmetros gerais salvos!')).toBeVisible({ timeout: 10_000 });

  // recarrega: o stub mutável devolve os valores gravados
  await page.reload();
  await abrirParametros(page);
  await expect(page.locator('input[type="date"]').nth(0)).toHaveValue('2020-01-01', { timeout: 15_000 });
  await expect(page.locator('input[type="date"]').nth(1)).toHaveValue('2023-06-30');
});

test('Parâmetros Gerais — bloqueia admissão posterior à demissão', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente PG', user_id: E2E_USER_ID });
  await seedCalculoMutavel(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirParametros(page);

  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill('2023-01-01'); // admissão
  await dates.nth(1).fill('2020-01-01'); // demissão (anterior → inválido, MSG0008)
  await dates.nth(2).fill('2023-08-01'); // ajuizamento (válido)

  await page.getByRole('button', { name: 'Salvar' }).click();
  // toast.error de validação aparece; e o save NÃO ocorre (sucesso nunca aparece)
  await expect(page.getByText('Demissão não pode ser anterior à Admissão.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Parâmetros gerais salvos!')).toHaveCount(0);
});
