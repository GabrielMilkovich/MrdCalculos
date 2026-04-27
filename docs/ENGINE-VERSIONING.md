# Engine Versioning — PJe-Calc

Este documento descreve o ciclo de vida das engines de cálculo presentes em `src/lib/pjecalc/`.

## Estado atual

| Engine | Arquivo | Linhas | Status | Em produção? |
|---|---|---|---|---|
| **V1** | `engine.ts` | ~4540 | `@deprecated` | Não |
| **V3** | `engine-v3.ts` | ~1484 | **PRODUÇÃO** | Sim (21 imports) |
| **V4** | `engine-v4.ts` | ~221 | Experimental | Não (apenas 1 teste de parity) |

## V3 — Produção atual

`PjeCalcEngineV3` (em `src/lib/pjecalc/engine-v3.ts`) é a engine oficialmente
utilizada na UI e no orchestrator. Toda nova feature, bugfix ou ajuste de
paridade deve ser implementado aqui.

- Importada por: `usePjeCalculator` hook (via orchestrator)
- Cobertura: 1161 testes Vitest verdes
- Calibração: 96% +/-5% contra fixtures `*.PJC` reais

## V1 — Deprecated (removal Sprint 6 / 2026-Q3)

`PjeCalcEngine` (em `src/lib/pjecalc/engine.ts`) é a engine legada original.
Foi mantida exclusivamente para compatibilidade com testes antigos que ainda
não foram portados para V3.

- Status: `@deprecated` (anotação JSDoc)
- Sem call sites em UI/produção
- **Não adicionar features novas aqui**
- Plano de remoção: Sprint 6 (Q3/2026), após migração completa dos testes

## V4 — Experimental (promoção condicional)

`PjeCalcEngineV4` (em `src/lib/pjecalc/engine-v4.ts`) estende V3 com INSS
proporcionalizado (base marginal por competência). É um pipeline refinado
ainda em validação.

- **Não usar em produção**
- Coberta apenas por `parity-v4-vs-pjc.test.ts`
- Promoção a produção condicionada a:
  - Validação completa em Sprint 7+
  - Manter ou melhorar a métrica de calibração de V3
  - Aprovação explícita após auditoria

## Política de mudanças

1. Bugfix de paridade: aplicar em **V3**
2. Feature nova: aplicar em **V3**
3. Experimentos arquiteturais: aplicar em **V4** (sem impactar V3)
4. **Não tocar em V1** — está congelado, aguardando remoção
