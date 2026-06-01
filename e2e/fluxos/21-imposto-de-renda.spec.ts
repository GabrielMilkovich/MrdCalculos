import { test, expect, type Page, type Route } from '@playwright/test';
import { setupAuthedPage, E2E_USER_ID } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * E2E — Imposto de Renda (Seção 16, FINAL).
 * Persistência com Regime de Caixa ligado (corrige bug: antes o save falhava por
 * escrever coluna inexistente `aplicar_regime_caixa`). Backend stubado; valida que
 * o payload usa as colunas reais (regime_caixa/art_12a_rra) + extras.
 */
const CASE_ID = '00000000-0000-0000-0000-0000000000df';

async function seedIR(page: Page): Promise<{ getLastPayload: () => Record<string, unknown> | null }> {
  let config: Record<string, unknown> | null = null;
  let lastPayload: Record<string, unknown> | null = null;
  await page.route(/\/rest\/v1\/pjecalc_ir_config(\?|$)/, async (route: Route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') {
      const accept = route.request().headers()['accept'] || '';
      const single = accept.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? config : (config ? [config] : [])) });
      return;
    }
    if (m === 'POST' || m === 'PATCH') {
      const b = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      lastPayload = b ?? null;
      // Simula PostgREST: rejeita colunas que não existem (o bug original).
      const REAL_COLS = new Set([
        'case_id', 'apurar', 'incidir_sobre_juros', 'cobrar_reclamado',
        'tributacao_exclusiva_13', 'tributacao_separada_ferias', 'deduzir_cs',
        'deduzir_prev_privada', 'deduzir_pensao', 'deduzir_honorarios',
        'aposentado_65', 'dependentes', 'regime_caixa', 'art_12a_rra', 'extras',
      ]);
      const unknownCol = Object.keys(b ?? {}).find((k) => !REAL_COLS.has(k));
      if (unknownCol) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST204', message: `column ${unknownCol} does not exist` }) });
        return;
      }
      config = { id: 'ir-1', ...(config ?? {}), ...(b ?? {}) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([config]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return { getLastPayload: () => lastPayload };
}

async function abrirIR(page: Page): Promise<void> {
  await page.getByText('Cálculo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Imposto de Renda' }).click();
  await expect(page.getByText('Apurar Imposto de Renda')).toBeVisible({ timeout: 15_000 });
}

test('IR — salva com Regime de Caixa (colunas reais + extras, sem erro)', async ({ page }) => {
  await setupAuthedPage(page);
  await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente IR', user_id: E2E_USER_ID });
  const { getLastPayload } = await seedIR(page);

  await page.goto(`/casos/${CASE_ID}`);
  await abrirIR(page);

  // liga "Regime de Caixa" — o caso que ANTES quebrava o save. O Label não tem
  // htmlFor → mira o checkbox (shadcn = button[role=checkbox]) irmão do texto.
  await page.locator('div', { hasText: /^Regime de Caixa$/ }).getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('IR configurado!')).toBeVisible({ timeout: 10_000 });

  // payload deve usar a coluna REAL `regime_caixa` (não `aplicar_regime_caixa`)
  const p = getLastPayload();
  expect(p).not.toBeNull();
  expect(p).toHaveProperty('regime_caixa', true);
  expect(p).not.toHaveProperty('aplicar_regime_caixa');
  expect(p).toHaveProperty('extras');
});
