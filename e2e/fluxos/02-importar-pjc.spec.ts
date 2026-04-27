import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupAuthedPage } from '../helpers';
import { seedCaseFixture } from './helpers-fluxos';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fluxo 2 — Importar PJC (XML PJe-Calc).
 *
 * Cobre:
 *  1. Carrega /casos/:id (com mock de caso)
 *  2. Abre o ImportPJCDialog via botao "Importar .PJC" no header
 *  3. Faz upload de um arquivo .pjc/.xml com 1 verba (fixture pjc-com-verbas.xml)
 *  4. Asserta que o preview do dialog mostra:
 *     - Beneficiario do XML (RECLAMANTE FIXTURE E2E)
 *     - Badge com numero de verbas >= 1
 *
 * NAO clica em "Confirmar Importacao" (a persistencia depende de upsert
 * em pjecalc_calculos com retorno do id, que nosso stub nao consegue simular
 * sem complexidade adicional). O escopo do smoke e validar o caminho:
 * arquivo -> parser -> preview com verbas.
 */

const CASE_ID = '00000000-0000-0000-0000-000000000aaa';
const CLIENTE = 'Reclamante Importacao E2E';

test.describe('fluxo 2: importar PJC', () => {
  test('upload de XML mostra preview com >= 1 verba', async ({ page }) => {
    await setupAuthedPage(page);
    await seedCaseFixture(page, { id: CASE_ID, cliente: CLIENTE });

    await page.goto(`/casos/${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'mock de sessao deveria liberar /casos/:id').not.toContain('/auth');

    await expect(page.locator('#root')).toBeVisible();

    // Header do CaseWorkspace deve mostrar nome do cliente em algum lugar.
    await expect(page.getByText(CLIENTE).first()).toBeVisible({ timeout: 10_000 });

    // Abre o dialog de importacao. O trigger e `<Button>Importar .PJC</Button>`.
    const importBtn = page.getByRole('button', { name: /importar .*\.PJC/i });
    await expect(importBtn).toBeVisible({ timeout: 10_000 });
    await importBtn.click();

    // Dialog visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/importar arquivo \.pjc/i)).toBeVisible();

    // Faz upload — input type=file invisivel ate selecao.
    const fixturePath = path.resolve(__dirname, '../fixtures/pjc-com-verbas.xml');
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    // Apos analise, dialog mostra "Beneficiario: <nome>" e "Verbas: <count>".
    // O parser processa em background — esperamos o nome do beneficiario aparecer.
    await expect(dialog.getByText('RECLAMANTE FIXTURE E2E')).toBeVisible({ timeout: 10_000 });

    // ASSERCAO PRINCIPAL — preview deve listar verbas.
    // No dialog renderiza: `<div><span>Verbas:</span> <Badge>{count}</Badge></div>`.
    // O Badge do shadcn ui e um <div className="...">{count}</div>.
    await expect(dialog.getByText('Verbas:').first()).toBeVisible();

    // Procura pelo bloco que contem o label e extrai o conteudo do irmao.
    // Estrategia robusta: pegar todo o texto do dialog e validar com regex.
    const dialogText = await dialog.innerText();
    const match = dialogText.match(/Verbas:\s*(\d+)/i);
    expect(match, `nao encontrou "Verbas: <num>" no dialog. Texto:\n${dialogText.slice(0, 800)}`).not.toBeNull();
    const count = parseInt(match![1], 10);
    expect(count, `esperava >= 1 verba; recebeu ${count}`).toBeGreaterThanOrEqual(1);

    // Botao "Confirmar Importacao" deve estar habilitado (mas nao clicamos).
    const confirmar = dialog.getByRole('button', { name: /confirmar importa(c|ç)(a|ã)o|sobrescrever e importar/i });
    await expect(confirmar).toBeVisible();
  });
});
