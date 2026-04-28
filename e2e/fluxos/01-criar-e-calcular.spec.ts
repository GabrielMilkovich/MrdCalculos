import { test, expect } from '@playwright/test';
import { setupAuthedPage } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

/**
 * Fluxo 1 — Criar caso e calcular (wizard /novo-calculo).
 *
 * Cobre o caminho feliz do wizard:
 *  1. Etapa "Contrato": preenche nome cliente
 *  2. Etapa "Periodos": admissao/demissao + salario
 *  3. Avanca pelas etapas seguintes (Jornada/Adicionais/Teses) sem inputs
 *     extras (validacoes desses passos sao no-op)
 *  4. Etapa "Calcular": valida que o resumo aparece com algum valor monetario
 *
 * Nao chega a clicar em "Gerar Calculo" (pulamos a chamada Supabase real).
 * O objetivo e validar que toda a UI do wizard responde e renderiza o resumo
 * com os valores informados — incluindo a string formatada R$ XX,XX.
 */

const NOME_CLIENTE = 'Cliente E2E Sprint 3';
const SALARIO = '4500';

test.describe('fluxo 1: criar caso e calcular (wizard)', () => {
  test('wizard preenche todos os steps e mostra resumo com valor monetario', async ({ page }) => {
    await setupAuthedPage(page);
    // Necessario para o eventual POST/insert (caso o teste avance ate o Submit).
    await seedCaseFixture(page, {
      id: '00000000-0000-0000-0000-0000000000ff',
      cliente: NOME_CLIENTE,
    });

    await page.goto('/novo-calculo', { waitUntil: 'domcontentloaded' });

    // Mock de sessao deve liberar; se cair em /auth, ha bug no setup.
    expect(page.url(), 'mock de sessao deveria liberar /novo-calculo').not.toContain('/auth');
    await expect(page.locator('#root')).toBeVisible();

    // ---------- Step 1 — Contrato ----------
    // Nome do cliente: input com placeholder "Ex: Joao da Silva"
    const nomeCliente = page.getByPlaceholder(/Jo(a|ã)o da Silva/i).first();
    await expect(nomeCliente).toBeVisible({ timeout: 5_000 });
    await nomeCliente.fill(NOME_CLIENTE);

    const proximo = page.getByRole('button', { name: /pr(o|ó)ximo/i });
    await expect(proximo).toBeEnabled();
    await proximo.click();

    // ---------- Step 2 — Periodos ----------
    // Heading "Periodos" / subtitle "Datas e salarios" deve estar visivel.
    await expect(page.getByText(/datas e sal(a|á)rios/i).first()).toBeVisible();

    // Admissao + Demissao sao inputs type=date. Pegamos por proximidade do label.
    // Labels nao tem htmlFor, entao filtramos por contexto via placeholder/role.
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.nth(0)).toBeVisible();
    await dateInputs.nth(0).fill('2020-01-01');
    await dateInputs.nth(1).fill('2023-12-31');

    // Salario inicial — input number com placeholder "0,00"
    const salarioInput = page.locator('input[type="number"][placeholder="0,00"]').first();
    await expect(salarioInput).toBeVisible();
    await salarioInput.fill(SALARIO);

    await expect(proximo).toBeEnabled();
    await proximo.click();

    // ---------- Step 3 — Jornada (defaults validos) ----------
    await expect(page.getByText(/divisor.*horas|jornada/i).first()).toBeVisible();
    await expect(proximo).toBeEnabled();
    await proximo.click();

    // ---------- Step 4 — Adicionais (defaults: nenhum marcado) ----------
    await expect(page.getByText(/periculosidade|insalubridade/i).first()).toBeVisible();
    await expect(proximo).toBeEnabled();
    await proximo.click();

    // ---------- Step 5 — Teses (defaults validos) ----------
    await expect(page.getByText(/correc(a|ã)o|juros|multa/i).first()).toBeVisible();
    await expect(proximo).toBeEnabled();
    await proximo.click();

    // ---------- Step 6 — Resumo / Calcular ----------
    // O proximo botao some no ultimo step (a navegacao some quando currentStep === 5).
    // O resumo deve listar o nome do cliente e algum valor formatado em R$.
    await expect(page.getByText(NOME_CLIENTE).first()).toBeVisible({ timeout: 5_000 });

    // ASSERCAO PRINCIPAL — resumo renderiza algum valor monetario formatado em
    // pt-BR (`R$ 4500.00` no codigo do step 5: `R$ {parseFloat(salarioInicial).toFixed(2)}`).
    const valorMonetario = page.getByText(/R\$\s*\d/);
    await expect(valorMonetario.first()).toBeVisible({ timeout: 5_000 });

    // O salario informado (4500.00) deve aparecer em algum lugar do resumo.
    await expect(page.getByText(/4500\.00|4\.500,00/).first()).toBeVisible({ timeout: 5_000 });

    // Botao "Gerar Calculo" deve estar visivel (mas nao clicamos — depende
    // de Supabase real para criar a row e redirecionar).
    const gerarCalculo = page.getByRole('button', { name: /gerar c(a|á)lculo/i });
    await expect(gerarCalculo).toBeVisible();
  });
});
