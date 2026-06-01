import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Cartão de Ponto (Seção 7, Model B / marcações diárias).
 * Persistência (dia com marcações aparece) + validação (turno sobreposto bloqueia,
 * OcorrenciaJornadaApuracaoCartao.validar / MSG0185). Backend stubado.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000d7';
const CALC_ID = 'calc-e2e-7';
const MES = new Date().toISOString().slice(0, 7);
const DIA = `${MES}-15`;

async function seedPonto(page: Page): Promise<void> {
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

  let dias: Record<string, unknown>[] = [{
    id: 'dia1', calculo_id: CALC_ID, case_id: CASE_ID, data: DIA, dia_semana: 'QUA',
    ocorrencia: 'NORMAL', entrada_1: '08:00', saida_1: '12:00', entrada_2: '13:00', saida_2: '17:00',
    origem: 'INFORMADA', competencia: `${MES}-01`,
  }];
  const handler = async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      if (accept.includes('vnd.pgrst.object')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dias[0] ?? null) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dias) });
      }
      return;
    }
    if (m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      dias = dias.map((d) => ({ ...d, ...(b ?? {}) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dias) });
      return;
    }
    if (m === 'POST') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'dia2', ...(b ?? {}) }]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  };
  await page.route(/\/rest\/v1\/pjecalc_ponto_diario(\?|$)/, handler);
  await page.route(/\/rest\/v1\/pjecalc_apuracao_diaria(\?|$)/, handler);
}

async function abrirCartao(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Cartão de Ponto' }).click();
}

test('Cartão de Ponto — dia com marcações é exibido', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Ponto', user_id: E2E_USER_ID });
  await seedPonto(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirCartao(page);

  // a marcação 08:00 do dia seedado deve aparecer
  await expect(page.locator('input[value="08:00"]').first()).toBeVisible({ timeout: 15_000 });
});

test('Cartão de Ponto — turno sobreposto bloqueia (MSG0185)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Ponto', user_id: E2E_USER_ID });
  await seedPonto(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirCartao(page);

  // entrada_2 atual = 13:00; muda p/ 11:00 (sobrepõe turno 1 que termina 12:00)
  const entrada2 = page.locator('input[value="13:00"]').first();
  await expect(entrada2).toBeVisible({ timeout: 15_000 });
  await entrada2.fill('11:00');
  await entrada2.blur();
  await expect(page.getByText(/sobrep/i)).toBeVisible({ timeout: 10_000 });
});
