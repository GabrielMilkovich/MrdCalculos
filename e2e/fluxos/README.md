# E2E — 5 Fluxos Criticos (Sprint 3)

Specs Playwright que cobrem os 5 fluxos criticos do PJe-Calc com mocks
Supabase, sem necessidade de backend real.

## Specs

| # | Arquivo | Cobertura |
|---|---------|-----------|
| 1 | `01-criar-e-calcular.spec.ts` | wizard `/novo-calculo` ate o resumo com valor monetario |
| 2 | `02-importar-pjc.spec.ts` | upload de XML PJC mostra preview com >= 1 verba |
| 3 | `03-editar-verba.spec.ts` | abre Grade de Ocorrencias, edita valor_base, valor refletido no input |
| 4 | `04-trocar-indice.spec.ts` | troca indice de IPCA-E para IPCA no Modulo Correcao, salva e volta ao Resumo |
| 5 | `05-trocar-juros.spec.ts` | marca "Combinar Juros", adiciona row SELIC e valida que aparece na UI |

## Helpers

`helpers-fluxos.ts` registra `page.route` mais especificas que sobrepoem o
fallback `[]` de `helpers.stubSupabaseNetwork`:

- `seedCaseFixture(page, caseData)` — stub para `/rest/v1/cases?...` (suporta
  `single()` via header `Accept: vnd.pgrst.object+json`).
- `seedVerbasFixture(page, verbas[])` — stub para `pjecalc_verbas` e a tabela
  base `pjecalc_verba_base`.
- `seedHistoricoFixture(page, historicos[])` — stub para
  `pjecalc_historico_salarial`.
- `seedCorrecaoConfig(page, config)` — stub para `pjecalc_correcao_config`
  com state mutavel (POST/PATCH atualiza o get subsequente).
- `seedOcorrenciasFixture(page, ocorrencias[])` — stub para
  `pjecalc_ocorrencias` (consumido pelo GradeOcorrencias) e fallback para
  `pjecalc_verba_ocorrencias`.

Use SEMPRE depois de `setupAuthedPage(page)` — Playwright resolve as rotas em
ordem inversa de registro, e os stubs especificos precisam ter prioridade.

## Como rodar

```bash
# Roda apenas os 5 fluxos
npx playwright test e2e/fluxos --reporter=list

# Roda toda a suite (smoke + fluxos)
npx playwright test --reporter=list

# Forca trace gravado mesmo em sucesso (gera trace.zip por spec)
npx playwright test e2e/fluxos --trace on
```

Em ambientes sem internet, exporte `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ou
mantenha o binario em `/opt/pw-browsers/chromium` (autodetectado pelo
`playwright.config.ts`).

## Trace e debugging

`playwright.config.ts` tem `trace: 'retain-on-failure'`. Ao rodar com
`--trace on` o trace.zip e gerado para todas as execucoes em
`test-results/<spec-folder>/trace.zip`.

Para visualizar:

```bash
npx playwright show-trace test-results/fluxos-01-criar-e-calcular-c24d4--resumo-com-valor-monetario-chromium/trace.zip
```

A interface mostra:
- Snapshot do DOM antes/depois de cada acao
- Network requests interceptadas pelos stubs
- Console logs do app
- Video de execucao (mp4/webm)

## Limitacoes conhecidas

Os 5 fluxos validam a UI e o caminho de evento — nao validam:
- Resultados numericos do engine (depende de Liquidar contra Supabase)
- Persistencia real (POST/PATCH retornam echo do body, sem reload do banco)
- Edge Functions (stub retorna `{}`)

Para cobertura de calculos reais, ver `src/lib/pjecalc/__tests__/` (Vitest,
1161+ testes).
