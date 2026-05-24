# Sprint 3c — Apply de migrations V2 em prod

**Data:** 2026-05-24
**Branch:** `claude/nice-goldberg-o6mzR`
**Projeto:** `xhvlhrgfoeahgofhljbs` (MRDCALCC)
**Modo:** MCP `apply_migration` granular (1 por vez, verificações entre)

## Pré-checks (todos verdes antes do apply)

| Check | Resultado |
|---|---|
| Tabelas V2 não existiam (`rubrica_aliases*`) | ✓ (zero) |
| View `rubrica_aliases_ativos` não existia | ✓ (zero) |
| `cases.criado_por` existe (FK das tentativas) | ✓ |
| Última migration prod | `20260523015615` |
| Documents com categorias V1 órfãs no JSONB | **1 doc** (será migrado na #2) |

## Migration #1 — `rubrica_aliases_v2`

```
MCP apply_migration: rubrica_aliases_v2
SQL: supabase/migrations/20260524000000_rubrica_aliases_v2.sql
Resultado: {"success": true}
```

Verificações pós-apply (todas ok):

| Check | Resultado |
|---|---|
| 3 tabelas criadas (`rubrica_aliases`, `_tentativa`, `_history`) | ✓ |
| Coluna `criado_por` (não `created_by`) em `rubrica_aliases` e `_tentativa` | ✓ |
| Coluna `observacao_juridica` em ambas tabelas com criador | ✓ |
| CHECK constraints (`chk_categoria_valida`, `chk_observacao_nao_vazia`, `chk_source_valido`, `chk_tipo_pjecalc_valido`) | ✓ |
| RLS habilitada nas 3 tabelas | ✓ |
| 4 policies `tentativa_case_owner_{select,insert,update,delete}` via `EXISTS cases.criado_por` | ✓ |
| View `rubrica_aliases_ativos` com `security_invoker=true` | ✓ |
| Função `gc_rubrica_aliases_tentativa` criada | ✓ |
| Counts iniciais (rubrica_aliases, tentativa, history) | `0, 0, 0` |

## Migration #2 — `migrate_categorias_v1_v2` (hard cut)

```
MCP apply_migration: migrate_categorias_v1_v2
SQL: supabase/migrations/20260524000001_migrate_categorias_v1_v2.sql
Resultado: {"success": true}
```

`DO $$ ... RAISE EXCEPTION` no final não disparou — migration completa.

Verificações pós-apply:

| Check | Resultado |
|---|---|
| Documents com nomes V1 remanescentes | `0` |
| CHECK `chk_categoria_valida` atualizado (só V2 + NAO_CLASSIFICADO) | ✓ (8 slugs V2, zero V1) |
| `documents.parsed.rubricas_classificadas` migrado (1 doc com 572 itens → 7 categorias V2) | ✓ |

## Alinhamento de versions

MCP `apply_migration` registra versions com timestamp do apply, não do filename:

```
Aplicado pelo MCP:        20260524011941:rubrica_aliases_v2
                          20260524012036:migrate_categorias_v1_v2

Esperado pelo filename:   20260524000000:rubrica_aliases_v2
                          20260524000001:migrate_categorias_v1_v2
```

Reconciliado via `UPDATE supabase_migrations.schema_migrations SET version = ...`
pra usar timestamp do filename. Sem isso, futuro `db push` detecta mismatch
e tenta reaplicar (falharia porque tabelas já existem).

Estado final em `supabase_migrations.schema_migrations`:

```
20260524000000 | rubrica_aliases_v2
20260524000001 | migrate_categorias_v1_v2
```

## Smoke test do edge function

Edge function `holerite-classify-confirm` v3 já estava deployada em prod
(via workflow auto entre commits 1-3 do branch). Confirmado via
`list_edge_functions`:
- `verify_jwt: true` ✓
- `status: ACTIVE` ✓
- `version: 3` ✓

Smoke real via curl **não foi executado deste sandbox** — network policy
bloqueia hosts não-allowlist (`HTTP 403 Host not in allowlist`). Logs do
edge-function via MCP (`get_logs`) confirmam **zero chamadas a
`holerite-classify-confirm` nas últimas 24h** (esperado — UI Vercel ainda
não deployada com código novo).

**Smoke manual recomendado pelo time** (a fazer fora do sandbox):

```bash
curl -sS -X POST \
  -H "Authorization: Bearer <JWT_VALIDO>" \
  -H "Content-Type: application/json" \
  -d '{"case_id": "<CASE_ID_EXISTENTE>"}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm

# Esperado: HTTP 200 com body {"promovidos": 0, "conflitos": []}
# (Case sem tentativas. Response vazia mas function alcançou schema.)
```

Cenários de erro a investigar se aparecerem:

| Resposta | Diagnóstico |
|---|---|
| 401 | JWT inválido ou expirado |
| 500 `column "criado_por" does not exist` | Migration #1 não aplicou — re-verificar `\d rubrica_aliases` |
| 500 `column "created_by" does not exist` | Function deployada espera coluna velha — verificar v3 deployada |
| 500 `relation "rubrica_aliases_tentativa" does not exist` | Migration #1 falhou silenciosamente |
| 200 com body diferente | Investigar shape retornado |

## Estado consolidado prod (pós-4.1)

| Camada | Estado |
|---|---|
| Edge Functions Sprint 3c (5 funções) | em prod, v3-v49, em sync com schema novo |
| Schema (rubrica_aliases*) | criado, RLS ativa, CHECKs ativos |
| JSONB legacy V1 em `documents.parsed` | zero (hard cut completo) |
| Workflow auto-deploy | pinado a `main` (commit `5c8d7a0`) |
| UI (Vercel) | não verificado — deployment Vercel é independente do workflow |

## Próximos commits

- **4.2** — dry-run de `scripts/migrate-classificacoes-legacy.ts` em prod
  (relatório do volume de classificações legacy a migrar de
  `documents.metadata.classificacoes_manuais_holerite` →
  `rubrica_aliases_tentativa`)
- **4.3** — executar migração de dados + cleanup do JSONB legacy
- **4.4** — remover shim de leitura do `useClassificacoesTentativa`

## Pendência não-bloqueante (registrada)

- Apply de migration #2 foi imediato (no plano original era +1 sprint de
  coexistência). Foi seguro porque hard cut tinha SÓ 1 doc com 1 doc com V1
  no JSONB (mesmo doc da análise inicial de 572 itens). Sem volume real,
  sem motivo pra esperar.
- Migration #2 dropou todos os slugs V1 do CHECK. Código frontend ainda tem
  shim `CATEGORIA_V1_TO_V2` como defesa de leitura. Pode ser removido em
  futuro próximo (não bloqueia nada hoje).
