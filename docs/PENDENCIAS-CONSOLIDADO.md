# Pendências consolidadas — 25/05/2026

## Prioridade 1 — Validar Holerite V2 end-to-end

Doc candidato: `f9a67e48` (ROSICLEIA "Contracheques ate 06.2021", case `5d9782f0-d404-4d52-a6ab-b6241fdbefb9`)

Banco confirma: 572 rubricas classificadas, 190 não-classificadas em `documents.parsed.resumo_classificacao`. Mapper V2 (`holerite_via_varejo_v1`) rodou, JSONB populado.

Procedimento do smoke:
1. Abrir `HoleritePreviewDialog` deste doc em prod (Vercel)
2. Confirmar banner V2 monta com "190 de 572 não-classificadas"
3. Classificar 1 rubrica via dropdown no banner → verificar UPSERT em `rubrica_aliases_tentativa` (debounce 800ms)
4. Clicar "Confirmar e baixar ZIP" → observar promoção pra `rubrica_aliases` + toast de sucesso
5. Reabrir outro holerite do mesmo case com mesma rubrica → confirmar pré-classificação (cache TTL 5min)
6. Verificar `rubrica_aliases_history` tem entry `promoted_from_tentativa`

Se falhar no passo 2: investigar `src/features/data-extraction/export/per-doc/index.ts` — fix `dda555c4` (propagação `resumo_classificacao`) pode não ter sido deployado em Vercel (confirmar bundle hash).

Se falhar no passo 4: investigar edge function `holerite-classify-confirm` — smoke SQL em `c41ce82` foi parcial (sandbox não podia curl).

## Prioridade 2 — Ficha Financeira: pipeline completo

**Escopo real: 30-60h. NÃO é refinamento — é construção.**

Trabalho necessário:
1. Migration: adicionar `ficha_financeira` no enum `tipo_extracao` (ou manter como tipo separado fora do enum, vide decisão arquitetural)
2. Classificador: `auto-detect-tipo.ts` ganha heurística "Ficha Financeira" (sinais: "Ficha Financeira" no texto + tabela com meses + classificação PGTO/DESC)
3. Pipeline: trigger que chama `parse-ficha-financeira` quando tipo=ficha_financeira (ou route no `generateExportForDocument`)
4. UI: tela de preview específica (ou adaptação do HoleritePreviewDialog pra mostrar tabela anual multi-mês)
5. Exporter: ZIP no formato PJe-Calc com histórico salarial mensal (12+ linhas por ano, não 1 linha com data de impressão)

Código pré-existente reusável (mergeado mas sem trigger):
- `supabase/functions/parse-ficha-financeira/index.ts` — Claude Sonnet + PDF + parser determinístico ADP (`db73c7a7` + `66665605`)
- `supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts` — parser de tabela markdown ADP com blocklist 6xxx/8xxx/9920-9961 e code→category mapping
- Ontologia V2 (96 rubricas, 258 aliases) — já em prod

Hipótese A confirmada pelo escritório: schema dos ZIPs atuais (`historico_salarial_<categoria>.csv` + `auditoria_completa.csv`) é o formato correto. Conteúdo está errado, schema mantém.

PJe-Calc 2.15.1 desktop disponível no escritório — usar pra validar import real.

## Prioridade 3 — CTPS

Schema indefinido. Fix `19918a40` (férias↔faltas inversão de bloco) mergeado mas não validado em smoke real.

Próximos passos:
- Export PJe-Calc 2.15.1 desktop de CTPS dummy pra derivar schema esperado
- Smoke real: upload CTPS PDF → confirmar férias vão pra CSV de férias (não de faltas)
- Validar que 18 períodos de férias do caso ROQUE são extraídos (hoje zero)

## Pendências menores

- [ ] **Trocar senha `gabriel.wrldd@gmail.com`** — exposta em chat, Supabase Dashboard → Auth → Users (URGENTE)
- [ ] Item 2 hardening: Conflict UX dialog — `HoleritePreviewDialog.handleConfirmar` mostra só `toast.warning` quando `conflitos.length > 0`. Dialog secundário necessário (4-6h)
- [ ] Bug #6 orchestrator — `deleteOcorrencias` sem filtro origem. Sessão dedicada com diagnóstico fresco
- [ ] `mrdcalc.com.br` custom domain (DNS)

## Código morto em main (documentado, não revert)

| Commit | Arquivo | Status |
|---|---|---|
| `db73c7a7` | `_shared/parsers/ficha-financeira-deterministic.ts` | Parser ADP funciona como módulo, sem trigger no pipeline |
| `66665605` | `parse-ficha-financeira/index.ts` (Claude + PDF path) | Edge function funciona quando chamada diretamente, mas pipeline automático não a invoca pra docs classificados como `holerite` |

Esses commits viram úteis quando Prioridade 2 for implementada (pipeline completo de Ficha Financeira). Não reverter — não atrapalham, só confundem se lidos sem contexto.

## Aprendizado de processo

- **Padrão "3 frentes abertas, 0 fechada"** diagnosticado nesta sessão. Próximas sessões: fechar 1 frente totalmente antes de abrir outra.
- **Smoke real (não MCP, não scripts) obrigatório** antes de declarar feature pronta. MCP verifica schema, smoke verifica UX.
- **Diagnóstico antes de código**: pedir grep/SELECT contra prod/repo real antes de propor refactor. Sprint V2 teve pelo menos 4 catches por esse reflexo; sprints seguintes sem ele geraram código morto.
- **Validar premissas contra pipeline real**: "componente React que chama edge function" ≠ "pipeline de processamento automático". Distinguir na análise.

## Docs relacionados

- `docs/HARDENING-V2.md` — 8 items P0/P1/P2 da Sprint V2
- `docs/SPRINT-3C-V2-APPLY.md` — log do apply de migrations
- `docs/SMOKE-V2-PROD.md` — instruções do smoke real (holerite-classify-confirm)
- `CLAUDE.md` seção "Ontologia de Rubricas V2" — fluxo + como adicionar rubrica
