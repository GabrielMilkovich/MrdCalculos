/**
 * Setup compartilhado para testes de componente Vitest + React Testing Library.
 *
 * - Importa matchers `@testing-library/jest-dom/vitest` (`.toBeVisible()`,
 *   `.toBeDisabled()`, `.toHaveTextContent()`, etc.) — sem isso a sintaxe
 *   limpa não fica disponível.
 * - Roda apenas em testes que precisam de DOM (controlado por diretiva
 *   `// @vitest-environment jsdom` no topo do arquivo de teste, OU pelo
 *   `environmentMatchGlobs` no vitest.config.ts).
 *
 * Exceção autorizada do CLAUDE.md (2026-05-18, sessão hotfix OCR/CSV) —
 * ver entrada "Exceções autorizadas" no CLAUDE.md para justificativa.
 */
import "@testing-library/jest-dom/vitest";
