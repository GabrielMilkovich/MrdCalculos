# E2E Tests — MRD Calc (Playwright)

Smoke tests E2E escritos em Playwright. Objetivo: detectar quebras grosseiras
(app nao carrega, wizard nao renderiza, seletor de relatorios nao abre) em
pipeline de CI/local antes de merge.

## Pre-requisitos

- Node >= 18
- Dependencias instaladas: `npm install`
- Chromium Playwright. Em ordem de preferencia:
  1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/caminho/para/chrome` — usa um
     binario existente (sandbox sem internet, ambientes air-gapped).
  2. `/opt/pw-browsers/chromium` se existir — autodetectado por
     `playwright.config.ts`.
  3. Padrao: `npx playwright install chromium` baixa a versao oficial.
     Em Linux CI use `npx playwright install --with-deps chromium`.
- Dev server consegue subir via `npm run dev` (porta 8080 — ver
  `vite.config.ts`).

## Configuracao de ambiente

Os specs precisam que o app monte sem erros fatais de Supabase. Para isso:

1. Crie `.env.test` na raiz (ja gitignored) — use `.env.example` como base.
   Os valores podem ser stubs (URL local + anon key publica do supabase-cli).
   Exemplo minimo:
   ```
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. O `playwright.config.ts` ja sobe o dev server com `--mode test`, o que
   faz o Vite carregar `.env.test` automaticamente.

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

# Apontando um chrome custom (sandbox sem internet)
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Relatorio HTML fica em `playwright-report/` apos uma execucao.

## Estrutura

```
e2e/
  helpers.ts              # mock de sessao Supabase + stub de rede
  fixtures/               # arquivos JSON/XML de exemplo
    case-minimo.json      # caso PJe-Calc minimo (cliente + contrato + verbas)
    pjc-sample.xml        # XML PJe-Calc sanitizado (derivado de antonio-harley.pjc)
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

## Mock de autenticacao (helpers.ts)

O projeto usa Supabase Auth + `ProtectedRoute`. `helpers.ts` oferece tres APIs:

- **`mockSupabaseSession(page)`** — injeta uma sessao fake no localStorage
  *antes* de qualquer script da pagina rodar (`addInitScript`). Grava em
  multiplas chaves (`sb-localhost-auth-token`, `sb-placeholder-auth-token`)
  porque o supabase-js deriva o storageKey do hostname configurado.

- **`stubSupabaseNetwork(page)`** — intercepta TODAS as requests para
  endpoints Supabase, independente do host:
  - `**/auth/v1/token*` → sessao fake
  - `**/auth/v1/user*`  → usuario fake
  - `**/auth/v1/logout` → 204
  - `**/auth/v1/**`     → fallback `{ user: null, session: null }`
  - `**/rest/v1/**`     → array vazio
  - `**/storage/v1/**`  → array vazio (uploads → `{ Key, Id }`)
  - `**/functions/v1/**`→ `{}`
  - `**/realtime/v1/**` → 204

- **`setupAuthedPage(page)`** — combina os dois acima. Use SEMPRE antes de
  `page.goto()` em rotas protegidas.

Constantes exportadas (uteis em asserts):
`E2E_USER_ID`, `E2E_USER_EMAIL`, `E2E_ACCESS_TOKEN`, `E2E_REFRESH_TOKEN`.

### Sobrescrevendo stubs por teste

Para um teste que precisa de dados especificos (ex: um caso real), registre
uma rota *depois* de `setupAuthedPage`:

```ts
import caseMinimo from './fixtures/case-minimo.json';

await setupAuthedPage(page);
await page.route(/\/rest\/v1\/cases/, (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([caseMinimo]),
  }),
);
await page.goto('/casos');
```

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

## Limitacoes do mock atual

O stub cobre o caminho feliz "rota carrega + lista vazia", mas:

- **Sem Postgres real** — qualquer hook que dependa de dados especificos
  (ex: liquidacao calculada) precisa de `page.route` adicional.
- **Sem Edge Functions** — `supabase.functions.invoke()` retorna `{}`.
  Smoke tests nao devem dispara-las.
- **Sem Realtime** — websockets sao 204; subscriptions falham silenciosamente.
- **JWT nao e assinado** — `access_token: 'fake-access-token-e2e'` nao passa
  por validacao de Edge Functions reais. So funciona porque `getSession()`
  apenas le o localStorage.

## TODOs

- [ ] Seed de dados: criar fixture SQL com 1 Caso + 1 resultado de liquidacao
      persistido para habilitar o fluxo completo de `relatorios.spec.ts`.
- [ ] Auth real de teste: setup com usuario E2E no Supabase local
      (`npx supabase start` + `auth.users` seed) para remover os `test.skip()`.
- [ ] Integracao CI: adicionar job GitHub Actions que roda
      `npm run test:e2e` apos `npm run build`.
- [ ] Cobertura de `/casos` e `/tabelas` — listas e filtros.
- [ ] Visual regression: snapshots de paginas-chave com `toHaveScreenshot()`.
