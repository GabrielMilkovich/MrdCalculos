import { test, expect } from '@playwright/test';
import { setupAuthedPage } from '../helpers';
import {
  seedCaseFixture,
  seedCorrecaoConfig,
} from './helpers-fluxos';

/**
 * Sprint 4.2-A2 — Fluxo 7: flag combinar_indice (ADC 58 STF + Súm.TST 381)
 *
 * Cobre o gate UI da flag "Combinar com Outro Índice":
 *  1. Carrega /pjecalc/:id com correcao_config seedado COM combinacoes
 *     (cenario ADC 58: IPCA-E + SELIC após 2021-11-11).
 *  2. Vai p/ tela Correcao/Juros — flag deve estar LIGADA (combinacoes
 *     já existem) e a CombTable visivel.
 *  3. Captura presence da CombTable.
 *  4. DESLIGA o checkbox "Combinar com Outro Índice".
 *  5. ASSERCAO: a CombTable some — flag tem efeito visual e (via save)
 *     o engine ignora as combinações.
 *
 * Não validamos o valor numérico (não há Liquidar real), validamos o
 * efeito UI da flag — junto com correcao-flags.test.ts (Vitest)
 * que prova que o engine respeita o gate quando combinar_indice=false.
 */

const CASE_ID = '00000000-0000-0000-0000-000000000777';

test.describe('fluxo 7: flag combinar_indice (ADC 58)', () => {
  test('desliga combinar_indice — CombTable some e flag tem efeito UI', async ({ page }) => {
    await setupAuthedPage(page);
    await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente ADC58 E2E' });
    // Seed COM combinacoes_indice ADC 58 (IPCA-E base + SELIC pos-citacao)
    await seedCorrecaoConfig(page, {
      case_id: CASE_ID,
      indice: 'IPCA-E',
      tabela_juros: 'TRD_SIMPLES',
      combinacoes_indice: JSON.stringify([
        { indice: 'IPCA-E', a_partir_de: '' },
        { indice: 'SELIC', a_partir_de: '2021-11-11' },
      ]),
      combinacoes_juros: JSON.stringify([
        { indice: 'TRD_SIMPLES', a_partir_de: '' },
        { indice: 'SEM_JUROS', a_partir_de: '2021-11-11' },
      ]),
      transicao_adc58: true,
      aplicar_juros_fase_pre_judicial: true,
    });

    await page.goto(`/pjecalc/${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'mock de sessao deveria liberar /pjecalc/:id').not.toContain('/auth');

    // Sidebar — Correção/Juros
    const correcaoNav = page.locator('button').filter({ hasText: /Correção\/Juros/ }).first();
    await expect(correcaoNav).toBeVisible({ timeout: 10_000 });
    await correcaoNav.click();

    // Header
    await expect(page.getByText('Correção, Juros e Multa').first()).toBeVisible({ timeout: 10_000 });

    // Aba "Dados Especificos" — default. O label "Combinar com Outro Índice"
    // existe somente nesta aba.
    const combinarLabel = page.getByText('Combinar com Outro Índice').first();
    await expect(combinarLabel).toBeVisible({ timeout: 10_000 });

    // Checkbox "Combinar com Outro Índice" — irmao do Label dentro do flex.
    const combinarCheckbox = combinarLabel.locator('..').getByRole('checkbox');
    await expect(combinarCheckbox).toBeVisible();
    // Como o seed traz combinacoes_indice populado, o useEffect liga a flag.
    await expect(combinarCheckbox).toBeChecked();

    // CombTable de indice deve estar visivel (label "Outro Índice Trabalhista")
    const combTableLabel = page.getByText(/Outro Índice Trabalhista/).first();
    await expect(combTableLabel).toBeVisible({ timeout: 5_000 });

    // CAPTURA: rows na CombTable de indice ANTES do toggle off.
    const combTableSection = combTableLabel.locator('xpath=ancestor::div[contains(@class, "space-y-2")][1]');
    const rowsBefore = await combTableSection.locator('table tbody tr').count();
    expect(rowsBefore, 'esperava combinacoes seedadas (>=2 rows)').toBeGreaterThanOrEqual(2);

    // ── ACAO PRINCIPAL: desliga a flag ──
    await combinarCheckbox.uncheck();
    await expect(combinarCheckbox).not.toBeChecked();

    // ASSERCAO: a CombTable some quando flag=OFF (gate UI funciona)
    await expect(combTableLabel).not.toBeVisible({ timeout: 5_000 });

    // Salva — confirma que mutation aceita o estado off (gate persiste)
    const salvarBtn = page.getByRole('button', { name: /^salvar/i }).first();
    await expect(salvarBtn).toBeEnabled();
    await salvarBtn.click();

    // Toast de sucesso — confirma que o save propaga combinar_indice=false
    // até o engine (via service.upsertCorrecaoConfig com combinacoes_indice
    // omitida quando flag=false; ver ModuloCorrecao.tsx linha 153).
    // O teste Vitest correcao-flags.test.ts garante que o engine respeita
    // o gate (corrigido difere quando combinar_indice=false).
    await expect(page.getByText(/Correção.*configurados/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
