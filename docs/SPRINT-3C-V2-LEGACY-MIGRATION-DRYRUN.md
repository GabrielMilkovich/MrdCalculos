# Dry-run de `migrate-classificacoes-legacy.ts` — 2026-05-24

**Branch:** `claude/nice-goldberg-o6mzR`
**Projeto:** `xhvlhrgfoeahgofhljbs` (MRDCALCC)
**Modo:** SQL via MCP `execute_sql` (Plano B — sandbox bloqueia curl pra prod)

## Pré-checks

| Métrica | Valor |
|---|---|
| Documents com chave `metadata.classificacoes_manuais_holerite` | **0** |
| Total entries no JSONB legado (soma das chaves) | **0** |
| Documents legacy sem `case_id` | 0 |
| Documents legacy sem `owner_user_id` | 0 |
| Documents legacy com `owner_user_id` órfão (auth.users.id deletado) | 0 |
| Categorias distintas no legado | (nenhuma) |

## Resultado: **NO-OP**

Zero documents têm a chave legacy. Hipótese do user confirmada — pré-cliente, UI antiga nunca foi exercitada em prod com o fluxo de "Salvar classificações" do banner antigo. Ou se foi exercitada, operador clicou Cancelar antes de persistir.

## Implicação pra sequência de commits

- **Commit 4.3 (executar migração + cleanup JSONB) vira no-op trivial.** Não há dados pra escrever nem chave pra deletar.
- **Pode-se pular direto pro 4.4** (remover shim de leitura de `classificacoes_manuais_holerite` no `useClassificacoesTentativa`).

## Bug latente do script — corrigido neste commit

`scripts/migrate-classificacoes-legacy.ts` foi escrito no commit 3 (`3b60106`) assumindo que `documents` tinha coluna `criado_por`. **Não tem.** A coluna real é `owner_user_id`.

Erro só apareceria se alguém futuro rodasse o script — daria `ERROR: column d.criado_por does not exist`. Pré-check via SQL não dispararia o erro (não tem `JOIN documents`), por isso passou despercebido no commit 3.

Fix aplicado neste commit (4 referências):
- `interface DocRow.criado_por` → `owner_user_id`
- `SELECT 'id, case_id, criado_por, metadata'` → `SELECT 'id, case_id, owner_user_id, metadata'`
- `if (!doc.criado_por)` → `if (!doc.owner_user_id)`
- `criado_por: doc.criado_por` no upsert row → `criado_por: doc.owner_user_id` (preserva nome da coluna `criado_por` em `rubrica_aliases_tentativa`, só ajusta a SOURCE de `documents`)

## Plano B (SQL equivalente do dry-run) — não rodado

Como pré-checks já confirmaram zero, queries de Plano B (`WITH legacy_entries AS (...) SELECT count(DISTINCT (case_id, normalized_key))`) seriam redundantes — todas retornariam zero. Pulei.

## Decisão consolidada

- [x] Volume zero (esperado pré-cliente)
- [x] Sem categorias V1 órfãs (categoria_count = 0)
- [x] Sem documents legacy sem `case_id` ou `owner_user_id` (zero docs legacy no total)
- [x] Script com bug latente corrigido
- [x] **4.3 pulável — sequência: 4.4 direto**

## Estado da árvore de commits pós-4.2

```
<este>   chore(sprint-3c): dry-run no-op + fix de owner_user_id no migrate script
c41ce82  chore(prod): apply migrations V2 + smoke verde (parcial)
5c8d7a0  ci(deploy): pin prod a main + verify_jwt explícito
3b60106  feat(ontologia): UI redireciona persistência
ca948b3  fix(ontologia): restaura snapshot V1 + gerador
fbbb40b  refactor(ontologia): cutover V1→V2 + delete V1
16852bd  fix(validate-ontologia): assertion (3) observacao_juridica
3d063d4  fix(ontologia-v2): regenera seed
```
