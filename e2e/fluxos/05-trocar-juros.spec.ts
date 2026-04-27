import { test, expect } from '@playwright/test';
import { setupAuthedPage } from '../helpers';
import {
  seedCaseFixture,
  seedCorrecaoConfig,
} from './helpers-fluxos';

/**
 * Fluxo 5 — Trocar combinacao de juros.
 *
 * Cobre:
 *  1. Carrega /pjecalc/:id (caso mockado)
 *  2. Navega para Correcao/Juros
 *  3. Marca checkbox "Combinar com Outra Tabela de Juros"
 *  4. Adiciona uma combinacao SELIC com data "a partir de"
 *  5. Asserta que a tabela de combinacoes contem a row nova
 *
 * Foco: validar a UI de combinacao de juros (CombTable). O salvamento
 * dispara supabase.upsert que e absorvido pelo stub.
 */

const CASE_ID = '00000000-0000-0000-0000-000000000ddd';

test.describe('fluxo 5: trocar combinacao de juros', () => {
  test('marca combinar juros, adiciona SELIC e a row aparece na UI', async ({ page }) => {
    await setupAuthedPage(page);
    await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Juros E2E' });
    // Sem combinacoes pre-existentes — checkbox comeca desmarcada.
    await seedCorrecaoConfig(page, {
      case_id: CASE_ID,
      indice: 'IPCA-E',
      tabela_juros: 'TRD_SIMPLES',
      combinacoes_juros: null,
    });

    await page.goto(`/pjecalc/${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'mock de sessao deveria liberar /pjecalc/:id').not.toContain('/auth');

    // Sidebar — Correção/Juros
    const correcaoNav = page.locator('button').filter({ hasText: /Correção\/Juros/ }).first();
    await expect(correcaoNav).toBeVisible({ timeout: 10_000 });
    await correcaoNav.click();

    // Header
    await expect(page.getByText('Correção, Juros e Multa').first()).toBeVisible({ timeout: 10_000 });

    // Aba "Dados Especificos" e default — mostra a coluna Juros.
    await expect(page.getByText('Tabela de Juros').first()).toBeVisible({ timeout: 10_000 });

    // Checkbox "Combinar com Outra Tabela de Juros".
    // Pegamos o Label "Combinar com Outra Tabela de Juros" e o checkbox
    // imediatamente antes (sibling).
    const combinarLabel = page.getByText('Combinar com Outra Tabela de Juros').first();
    await expect(combinarLabel).toBeVisible();

    // O Checkbox e o irmao anterior do Label dentro do `flex items-center gap-2`.
    // shadcn-ui Checkbox renderiza role=checkbox.
    const combinarCheckbox = combinarLabel.locator('..').getByRole('checkbox');
    await expect(combinarCheckbox).toBeVisible();
    await combinarCheckbox.check();

    // Apos marcar, a CombTable de juros aparece. Ela contem o label
    // "Tabela Juros *  /  A partir de *".
    const labelJuros = page.getByText(/Tabela Juros.*A partir de/).first();
    await expect(labelJuros).toBeVisible({ timeout: 5_000 });

    // A CombTable e o wrapper que contem o label + botao + tabela.
    // DOM: <div space-y-2> { <div flex>{Label}{ButtonAdd}</div>, <div border>{table}</div> }
    // O Label esta dentro de um <div flex>, que esta dentro do wrapper.
    // Subimos 2 niveis para alcancar o wrapper.
    const combTableSection = labelJuros.locator('xpath=ancestor::div[contains(@class, "space-y-2")][1]');

    // CombTable inicia com 2 rows default: SELIC_RF e TAXA_LEGAL (definidos
    // no useEffect quando combinacoes_juros estava vazia).
    const rowsBefore = await combTableSection.locator('table tbody tr').count();
    expect(rowsBefore, `Esperava pelo menos 2 rows defaults; recebeu ${rowsBefore}`).toBeGreaterThanOrEqual(2);

    // Clica no botao "+" para adicionar nova combinacao.
    // O botao + esta dentro do mesmo flex container do label.
    // Pegamos o primeiro button do wrapper (o +); a ordem dos botoes Trash
    // dentro da tabela vem depois deles.
    const addBtn = combTableSection.locator('button').first();
    await addBtn.click();

    // Agora deve ter rowsBefore + 1.
    await expect(combTableSection.locator('table tbody tr')).toHaveCount(rowsBefore + 1, {
      timeout: 5_000,
    });

    // Define o indice da nova row (ultima) como SELIC.
    const lastRow = combTableSection.locator('table tbody tr').last();
    const selectTrigger = lastRow.getByRole('combobox').first();
    await expect(selectTrigger).toBeVisible();
    await selectTrigger.click();

    // Procura uma opcao que contenha SELIC (qualquer variante, nao restrito
    // a SELIC exato — a CombTable de juros aceita SELIC entre as opcoes).
    const selicOption = page.getByRole('option').filter({ hasText: /SELIC/i }).first();
    await expect(selicOption).toBeVisible({ timeout: 5_000 });
    await selicOption.click();

    // Define data "a partir de" — input type="date" na ultima row.
    const dateInput = lastRow.locator('input[type="date"]').first();
    await dateInput.fill('2021-12-01');
    await expect(dateInput).toHaveValue('2021-12-01');

    // ASSERCAO PRINCIPAL — a row nova com indice SELIC e data esta visivel.
    // Tabela tem rowsBefore + 1 rows, ultima com SELIC selecionado.
    const finalCount = await combTableSection.locator('table tbody tr').count();
    expect(finalCount).toBe(rowsBefore + 1);

    // O combobox da ultima row deve mostrar texto contendo SELIC.
    await expect(lastRow.getByRole('combobox').first()).toContainText(/SELIC/i);
  });
});
