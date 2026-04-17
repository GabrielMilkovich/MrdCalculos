# E2E Tests — MRD Calc (Playwright)

Smoke tests E2E escritos em Playwright. Objetivo: detectar quebras grosseiras
(app nao carrega, wizard nao renderiza, seletor de relatorios nao abre) em
pipeline de CI/local antes de merge.

## Pre-requisitos

- Node >= 18
- Dependencias instaladas: `npm install`
- Chromium Playwright: `npx playwright install chromium`
  - Em Linux CI pode ser necessario: `npx playwright install --with-deps chromium`
- Dev server consegue subir via `npm run dev` (porta 8080 — ver
  `vite.config.ts`).

## Como rodar

```bash
# Executa toda a suite E2E (sobe o dev server automaticamente)
npm run test:e2e

# UI interativa (recomendado para debug)
npm run test:e2e:ui

# Apenas listar os testes (sem executar; sem browser necessario)
npx playwright test --list

# Rodar um arquivo especifico
npx playwright test e2e/app-loads.spec.ts

# Com trace e headed para debug
npx playwright test --headed --trace on
```

Relatorio HTML fica em `playwright-report/` apos uma execucao.

## Estrutura

```
e2e/
  helpers.ts              # mock de sessao Supabase + stub de rede
  app-loads.spec.ts       # smoke: app carrega sem erros de console
  pjecalc-basic.spec.ts   # smoke: wizard /novo-calculo preenche etapas
  relatorios.spec.ts      # smoke: seletor de templates abre e reage
```

## O que cada teste cobre

| Arquivo                  | Cobertura                                           |
|--------------------------|-----------------------------------------------------|
| `app-loads.spec.ts`      | `/` renderiza `#root`; header/nav presente; sem erros de console inesperados |
| `pjecalc-basic.spec.ts`  | `/novo-calculo` renderiza; campos de contrato/periodo aceitam input; wizard avanca |
| `relatorios.spec.ts`     | `/pjecalc/:id` renderiza; botao "Gerar Relatorios" abre dialog; clique em template dispara acao |

## Mock de autenticacao

O projeto usa Supabase Auth + `ProtectedRoute`. `helpers.ts` oferece:

- `mockSupabaseSession(page)` — injeta token fake no localStorage antes do app
  montar (`addInitScript`).
- `stubSupabaseNetwork(page)` — intercepta todas as chamadas para
  `*.supabase.co/*` e responde com stubs vazios.
- `setupAuthedPage(page)` — combina os dois (usar sempre antes de `page.goto`).

Se o mock nao for suficiente (ex: hook que depende de RPC especifica), o teste
usa `test.skip()` dinamico para nao falhar a suite. A estrutura fica pronta
para quando houver seed de dados reais.

## Como adicionar um teste novo

1. Crie `e2e/nome-do-teste.spec.ts`.
2. Importe `setupAuthedPage` de `./helpers` se a rota for protegida.
3. Use seletores acessiveis (`getByRole`, `getByLabel`) em vez de CSS fragil.
4. Para navegacoes: `await page.goto('/rota', { waitUntil: 'domcontentloaded' })`.
5. Rode localmente: `npx playwright test e2e/nome-do-teste.spec.ts --headed`.
6. Abra o trace em caso de falha: `npx playwright show-trace trace.zip`.

## Debug

- `--headed` — roda com browser visivel.
- `--debug` — abre o Playwright Inspector, pausa em cada `await`.
- `page.pause()` dentro do teste — pausa para inspecao manual.
- `--trace on` — grava trace completo (DOM snapshots, network, console).

## TODOs

- [ ] Seed de dados: criar fixture SQL com 1 Caso + 1 resultado de liquidacao
      persistido para habilitar o fluxo completo de `relatorios.spec.ts`.
- [ ] Auth real de teste: setup com usuario E2E no Supabase local
      (`npx supabase start` + `auth.users` seed) para remover os `test.skip()`.
- [ ] Integracao CI: adicionar job GitHub Actions que roda
      `npm run test:e2e` apos `npm run build`.
- [ ] Cobertura de `/casos` e `/tabelas` — listas e filtros.
- [ ] Visual regression: snapshots de paginas-chave com `toHaveScreenshot()`.
