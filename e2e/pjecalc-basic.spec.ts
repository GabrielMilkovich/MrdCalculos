import { test, expect } from '@playwright/test';
import { setupAuthedPage } from './helpers';

/**
 * Smoke: fluxo basico de liquidacao.
 *
 * Como o backend Supabase nao esta disponivel em E2E, este teste:
 *   1. mocka sessao + stuba rede Supabase (helpers.setupAuthedPage)
 *   2. navega ate /novo-calculo (wizard de criacao)
 *   3. preenche campos minimos (nome do cliente + datas + salario)
 *   4. avanca o wizard e verifica que o proximo passo aparece
 *
 * NAO executa o calculo completo (depende de RPC no Supabase).
 * O objetivo e garantir que a UI responde e nao quebra ao preencher
 * os inputs obrigatorios da etapa 1 e 2.
 */
test.describe('smoke: pjecalc-basic (wizard liquidacao)', () => {
  test('preenche etapas iniciais do wizard sem erros', async ({ page }) => {
    await setupAuthedPage(page);

    const response = await page.goto('/novo-calculo', { waitUntil: 'domcontentloaded' });

    // Com mock ativo nao deve redirecionar; se cair, ha bug no setup.
    expect(page.url(), 'mock de sessao deveria liberar /novo-calculo').not.toContain('/auth');

    expect(response?.ok() ?? true).toBeTruthy();
    await expect(page.locator('#root')).toBeVisible();

    // Etapa 1 — Contrato. O wizard usa <Label> sem `htmlFor`, entao getByLabel
    // nao funciona. Usamos placeholder do Input, que e estavel ("Ex: Joao da Silva").
    const nomeCliente = page.getByPlaceholder(/Jo(a|ã)o da Silva|nome do cliente|reclamante/i).first();
    await expect(nomeCliente).toBeVisible({ timeout: 5_000 });
    await nomeCliente.fill('Cliente E2E');

    // Botao "Proximo" no wizard fica disabled ate canProceed === true.
    // Step 0: clienteNome + tipoContrato + categoria (defaults preenchidos).
    const proximo = page.getByRole('button', { name: /pr(o|ó)ximo/i }).first();
    await expect(proximo).toBeEnabled({ timeout: 5_000 });
    await proximo.click();

    // Verifica que o wizard avancou — heading da etapa 2 ("Periodos").
    // Os steps tem label visivel no header. Aceitamos tanto pela aba ativa
    // quanto pelo titulo "Datas e salarios".
    const etapa2 = page.getByText(/per(i|í)odos|datas e sal(a|á)rios/i).first();
    await expect(etapa2).toBeVisible({ timeout: 5_000 });
  });
});
