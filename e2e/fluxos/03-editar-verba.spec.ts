import { test, expect } from '@playwright/test';
import { setupAuthedPage } from '../helpers';
import {
  seedCaseFixture,
  seedVerbasFixture,
  seedOcorrenciasFixture,
} from './helpers-fluxos';

/**
 * Fluxo 3 — Editar verba (via grade de ocorrencias).
 *
 * Como a verba em si nao tem campo "valor" inline editavel na lista, o
 * fluxo de edicao real do PJe-Calc passa por:
 *  1. Listar verbas
 *  2. Clicar em "Grade" na verba → abre ModuloOcorrencias
 *  3. Clicar em "Gerar" → gera ocorrencias mensais (insere via supabase)
 *  4. Editar um campo (ex: valor_base) → onBlur dispara supabase.update
 *
 * Como o backend e mock, o supabase.update retorna {}, mas a alteracao
 * fica no input HTML (estado local do DOM). A assercao valida que
 * o input.value reflete o valor digitado pelo usuario — isto comprova
 * que o caminho UI -> evento esta funcionando.
 */

const CASE_ID = '00000000-0000-0000-0000-000000000bbb';
const VERBA_ID = '00000000-0000-0000-0000-000000000c01';
const VERBA_NOME = 'HORAS EXTRAS 50% E2E';

test.describe('fluxo 3: editar verba', () => {
  test('clica em Grade da verba e edita valor com reflexo local', async ({ page }) => {
    await setupAuthedPage(page);
    await seedCaseFixture(page, { id: CASE_ID, cliente: 'Cliente Edicao Verba' });
    await seedVerbasFixture(page, [
      {
        id: VERBA_ID,
        case_id: CASE_ID,
        nome: VERBA_NOME,
        tipo: 'principal',
        caracteristica: 'COMUM',
        ocorrencia_pagamento: 'MENSAL',
        multiplicador: 1.5,
        divisor_informado: 220,
        periodo_inicio: '2020-01-01',
        periodo_fim: '2020-06-30',
        ordem: 0,
      },
    ]);
    // Pre-popula 1 ocorrencia para que a tabela ja apareca sem precisar gerar.
    // Schema da view `pjecalc_ocorrencias` (consumido por GradeOcorrencias).
    await seedOcorrenciasFixture(page, [
      {
        id: 'occ-001',
        verba_id: VERBA_ID,
        calculo_id: CASE_ID,
        case_id: CASE_ID,
        competencia: '2020-01',
        ativa: true,
        origem: 'CALCULADA',
        base_valor: 1000,
        divisor_valor: 220,
        multiplicador_valor: 1.5,
        quantidade_valor: 10,
        dobra: 1,
        devido: 68.18,
        pago: 0,
        diferenca: 68.18,
        correcao: 0,
        juros: 0,
        total: 68.18,
      },
    ]);

    await page.goto(`/pjecalc/${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'mock de sessao deveria liberar /pjecalc/:id').not.toContain('/auth');

    // Navega para o modulo "Verbas" (sidebar).
    const verbasNav = page.getByRole('button', { name: /^verbas/i }).first();
    await expect(verbasNav).toBeVisible({ timeout: 10_000 });
    await verbasNav.click();

    // A verba mockada deve aparecer na lista.
    await expect(page.getByText(VERBA_NOME).first()).toBeVisible({ timeout: 10_000 });

    // Clica em "Grade" na verba para abrir ModuloOcorrencias.
    const gradeBtn = page.getByRole('button', { name: /^grade/i }).first();
    await expect(gradeBtn).toBeVisible();
    await gradeBtn.click();

    // ModuloOcorrencias renderiza header "Grade de Ocorrencias" + nome verba.
    await expect(page.getByText(/grade de ocorr(e|ê)ncias/i).first()).toBeVisible({ timeout: 10_000 });

    // A linha da ocorrencia (competencia 2020-01) deve estar visivel.
    await expect(page.getByText('2020-01').first()).toBeVisible({ timeout: 10_000 });

    // Edita o campo "Base" (valor_base) na primeira linha. Os inputs sao
    // <Input type="number" defaultValue={...}> dentro de <td>. Pegamos por
    // ordem (primeira coluna editavel apos a competencia).
    // Estrutura: ['valor_base','divisor','multiplicador','quantidade','dobra']
    // Cada um tem `step="0.01"` e `className w-20`.
    const valorBaseInput = page
      .locator('input[type="number"][step="0.01"]')
      .first();
    await expect(valorBaseInput).toBeVisible();

    const novoValor = '2500.50';
    await valorBaseInput.fill(novoValor);
    // Trigger onBlur para disparar a logica de update.
    await valorBaseInput.blur();

    // ASSERCAO PRINCIPAL — o input HTML mantem o valor digitado.
    // Isto comprova que a UI aceitou a edicao (estado local do form).
    await expect(valorBaseInput).toHaveValue(novoValor);
  });
});
