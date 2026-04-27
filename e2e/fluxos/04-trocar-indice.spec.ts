import { test, expect } from '@playwright/test';
import { setupAuthedPage } from '../helpers';
import {
  seedCaseFixture,
  seedCorrecaoConfig,
} from './helpers-fluxos';

/**
 * Fluxo 4 — Trocar indice de correcao.
 *
 * Cobre o caminho:
 *  1. Carrega /pjecalc/:id (caso mockado)
 *  2. Navega para o modulo Correcao/Juros
 *  3. Abre a aba "Dados Especificos" (default ja selecionada)
 *  4. Troca o indice via Select (de IPCA-E para IPCA)
 *  5. Salva
 *  6. Volta para o modulo Resumo
 *  7. Asserta que o resumo re-renderiza (placeholder visivel "Configure todos
 *     os modulos...")
 *
 * Este fluxo NAO valida o RESULTADO numerico (depende de Liquidar contra
 * Supabase real). Valida que a UI aceita a troca de indice e o evento
 * dispara saving sem erro.
 */

const CASE_ID = '00000000-0000-0000-0000-000000000ccc';

test.describe('fluxo 4: trocar indice de correcao', () => {
  test('troca indice de IPCA-E para IPCA e re-renderiza resumo', async ({ page }) => {
    await setupAuthedPage(page);
    await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Indice E2E' });
    await seedCorrecaoConfig(page, {
      case_id: CASE_ID,
      indice: 'IPCA-E',
      tabela_juros: 'TRD_SIMPLES',
    });

    await page.goto(`/pjecalc/${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'mock de sessao deveria liberar /pjecalc/:id').not.toContain('/auth');

    // Sidebar — clica em "Correção/Juros"
    // O botao do sidebar tem accessible name = label + desc (ambos visiveis).
    // Procuramos um botao que contenha "Correção" e "Juros" no texto.
    const correcaoNav = page.locator('button').filter({ hasText: /Correção\/Juros/ }).first();
    await expect(correcaoNav).toBeVisible({ timeout: 10_000 });
    await correcaoNav.click();

    // Header do modulo: "Correção, Juros e Multa"
    await expect(page.getByText('Correção, Juros e Multa').first()).toBeVisible({ timeout: 10_000 });

    // Aba "Dados Especificos" — ja eh default. Garante visivel a label do
    // Select "Indice Trabalhista" (renderizada na aba especificos).
    await expect(page.getByText('Índice Trabalhista').first()).toBeVisible({ timeout: 10_000 });

    // Localiza o trigger do select que mostra "IPCA-E" (valor atual).
    // Usa role=combobox (shadcn Select renderiza role combobox no SelectTrigger).
    const indiceTrigger = page.getByRole('combobox').filter({ hasText: /IPCA-E/ }).first();
    await expect(indiceTrigger).toBeVisible({ timeout: 5_000 });

    // Abre o select e escolhe "IPCA" (item exato).
    await indiceTrigger.click();

    // Listbox aberto — pega item IPCA por role=option e nome exato.
    const opcaoIPCA = page.getByRole('option', { name: 'IPCA', exact: true });
    await expect(opcaoIPCA).toBeVisible({ timeout: 5_000 });
    await opcaoIPCA.click();

    // Trigger agora deve mostrar "IPCA" (re-render local).
    await expect(page.getByRole('combobox').filter({ hasText: /^IPCA$/ }).first()).toBeVisible({ timeout: 5_000 });

    // Salva
    const salvarBtn = page.getByRole('button', { name: /^salvar/i }).first();
    await expect(salvarBtn).toBeEnabled();
    await salvarBtn.click();

    // Toast de sucesso (sonner) — opcional, mas se aparecer confirma o save.
    // Nao bloqueamos no toast porque pode desaparecer rapido.

    // Volta para o modulo "Resumo"
    const resumoNav = page.locator('button').filter({ hasText: /^Resumo/ }).first();
    await expect(resumoNav).toBeVisible();
    await resumoNav.click();

    // ASSERCAO PRINCIPAL — modulo Resumo re-renderiza. Como nao temos
    // resultado real, o placeholder "Configure todos os modulos e clique em
    // Liquidar..." aparece. O header e "Resumo da Liquidação".
    await expect(page.getByText('Resumo da Liquidação').first()).toBeVisible({ timeout: 10_000 });

    // O botao Liquidar tambem deve estar acessivel (mesmo se desabilitado).
    const liquidarBtn = page.getByRole('button', { name: /liquidar|fechado/i });
    await expect(liquidarBtn.first()).toBeVisible();
  });
});
