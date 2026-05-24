# Hardening V2 — Pós Sprint 3c

**Status sprint:** 12 commits em `claude/nice-goldberg-o6mzR`, merge → main pendente de smoke (item 7).

**Última atualização:** 2026-05-24

## Como ler

Cada item tem:
- **Severidade**: P0 (bloqueia primeiro cliente) / P1 (escalar pra 5+/dia) / P2 (dívida documentada)
- **Custo estimado** em horas focadas
- **Critério de aceite** verificável
- **Trigger** (P2 só): condição que justifica atacar
- **Status**: `[ ]` pendente / `[x]` done (com SHA do commit que resolveu)

---

## P0 — Bloqueadores de primeiro cliente

### Item 7 — Smoke real do `holerite-classify-confirm` em prod

- `[ ]` Status: pendente — doc pronto em `docs/SMOKE-V2-PROD.md`
- Custo: 30min coordenados (eu via MCP + você curl/JWT)
- Critério de aceite:
  - Smoke 1 (sem token) → HTTP 401
  - Smoke 2 (payload inválido) → HTTP 400 `case_id_required`
  - Smoke 3 (payload válido com tentativa pré-inserida) → HTTP 200 `{"promovidos":1,"conflitos":[]}`
  - Smoke 4 (SELECTs verificadores 4.3+4.4+4.5) → todos verdes
  - Cleanup 4.6 confirmado (canônico, history, tentativa todos = 0 pós-DELETE)
  - Output documentado em `docs/SPRINT-3C-V2-APPLY.md` seção "Smoke executado"
- Bloqueador de: merge `claude/nice-goldberg-o6mzR` → `main`
- Refs: `fef28b8`, `194b49d`

### Item 2 — Conflict UX dialog

- `[ ]` Status: pendente
- Custo: 4-6h focadas
- Critério de aceite:
  - `HoleritePreviewDialog.handleConfirmar` (linha ~340) deixa de mostrar só `toast.warning(...)` quando `conflitos.length > 0`
  - Novo componente `ConflictReviewDialog.tsx` lista conflitos com:
    - `alias_original` da rubrica
    - `categoria_tentativa` vs `categoria_existente` (caso `conflict_existing`)
    - `obs_anterior` vs `obs_tentativa` (caso `observacao_juridica_changed`)
  - 2 ações: "Revisar" (volta pro grid sem prosseguir com ZIP) e "Prosseguir sem promover" (gera ZIP, deixa tentativas conflitantes em `rubrica_aliases_tentativa` pra revisão posterior)
  - Teste vitest com mock de `useConfirmClassificacoes` retornando conflitos
- Bloqueador de: operador classificar rubrica que conflita com decisão jurídica existente sem ter UX clara do que aconteceu
- Arquivos esperados a tocar:
  - `src/components/cases/data-extraction/HoleritePreviewDialog.tsx` (consome dialog novo)
  - `src/components/cases/data-extraction/ConflictReviewDialog.tsx` (NOVO)
  - `src/components/cases/data-extraction/__tests__/ConflictReviewDialog.test.tsx` (NOVO)

### Item 5 — Testes calibracao com PDFs ausentes

- `[ ]` Status: pendente
- Custo: 2-4h (depende de onde os PDFs originais moram)
- Sintoma atual: `src/features/data-extraction/__tests__/calibracao/holerite-ontologia-v2.calibracao.test.ts` falha 2 testes (Roque Guerreiro, Rosicleia até 06/2021) porque `scripts/calibracao/ocr-holerites/{roque,rosicleia-antigo}-pg*.txt` não estão no repo
- Critério de aceite (1 dos 2 caminhos):
  - **(A) Adicionar fixtures:** copiar PDFs OCR pra repo (provavelmente atrás de Git LFS dado tamanho), confirmar `total_holerites_processados > 0` nos 2 testes, `correcao_pct == 100`
  - **(B) `.skip` formal:** marcar `it.skip('skipped: requer fixtures roque-pg*.txt', ...)` em vez de falhar; adicionar TODO no header do arquivo + criar `docs/HARDENING-V2.md` entry citando esse skip
- Bloqueador de: CI verde permanente (hoje é vermelho como "esperado pré-existente" — não detecta regressão nova nesses 2 testes)
- Trade-off:
  - (A) preserva calibração contínua mas adiciona ~MB ao repo
  - (B) mais barato, mas perde sinal anti-regressão até alguém reativar

---

## P1 — Antes de escalar pra 5+ casos/dia

### Item 1 — Auditoria de naming `criado_por` vs `owner_user_id`

- `[ ]` Status: pendente — descoberto em `5fa3a14` (bug latente do `migrate-classificacoes-legacy.ts`)
- Custo: 3-5h
- Critério de aceite:
  - Audit completo das tabelas com coluna de criador documentado em `docs/SCHEMA-NAMING-AUDIT.md`
    - Conhecido: `cases.criado_por`, `documents.owner_user_id`, `rubrica_aliases.criado_por`, `rubrica_aliases_tentativa.criado_por`
    - `rubrica_aliases_history.actor` permanece (semântica distinta: "ator da ação", não "criador da linha")
  - Decisão: padronizar tudo pra `criado_por` (convenção pt-BR do projeto)
  - Migration `ALTER TABLE documents RENAME COLUMN owner_user_id TO criado_por` testada em dry-run via MCP
  - `grep -rn "owner_user_id" src/ supabase/` atualizado pra `criado_por` nos consumers
  - RLS policies de tabelas que dependem de `documents.criado_por` validadas
- Trigger pra atacar: próximo script novo que faz JOIN entre tabelas, OU descoberta de bug similar ao de `5fa3a14`

### Item 3 — TTL cache de aliases edge

- `[ ]` Status: 5min hardcoded em `supabase/functions/_shared/holerite-mapper-v2/sync-mode.ts` (commit `fbbb40b`)
- Custo: 1h validação OU 2h push-invalidation
- Critério opções:
  - **(A) Confirma 5min basta** após primeiro mês com volume real — análise de delay observado vs TTL configurado, sem reclamação de "aprendizado não funciona"
  - **(B) Migra pra push-invalidation** via Supabase Realtime (tabela `cache_invalidations` ou broadcast do `rubrica_aliases` INSERT/UPDATE)
- Trigger: relato de "aprendizado não funciona" entre operadores na mesma worker, OU volume > 50 classificações/dia onde 5min de delay vira percebível

---

## P2 — Dívida documentada

### Item 4 — `Mapper.mapear` sync vs async

- `[ ]` Status: aceito como dívida no commit `fbbb40b`
- Custo migrar: 6-8h (cascateia em 9 arquivos — interface + 7 mappers + dispatcher)
- Trigger pra atacar: cold-start ou memory pressure mensurável em workers (logs MCP `get_logs` mostrando OOM ou tempo de boot > 2s)

### Item 6 — `workflow_dispatch` input `skip_migrations`

- `[ ]` Status: TODO anotado em `5c8d7a0`
- Custo: 30min
- Critério: `workflow_dispatch.inputs.skip_migrations` boolean adicionado em `.github/workflows/deploy-supabase.yml`, job de `Apply database migrations` checa `if: github.event.inputs.skip_migrations != 'true'`
- Trigger: próximo redeploy manual sem mexer em schema

### Item 8 — `CLAUDE.md` documentar fluxo V2

- `[ ]` Status: **pendente, escrever pós-merge** (não antes — doc citaria estado de prod que ainda não é canônico)
- Custo: 1-2h
- Critério de aceite: nova seção em `CLAUDE.md` explicando:
  - **Onde mora ontologia:**
    - `scripts/ontologia-v1-snapshot.ts` (snapshot histórico, build-time, NÃO importar em runtime)
    - `supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json` (seed canônico, runtime)
    - `rubrica_aliases` (canônico aprendido em prod, runtime)
    - `rubrica_aliases_tentativa` (staging por case, runtime)
    - `rubrica_aliases_history` (audit trail, runtime)
  - **Fluxo de aprendizado:** banner → tentativa → confirm → canônico → próximo holerite no mesmo case pega via cache
  - **Como adicionar rubrica nova:**
    1. Editar `scripts/ontologia-v1-snapshot.ts` adicionando entry no formato V1
    2. `npm run gen:ontologia` regenera `ontologia-v2.json`
    3. `npm run validate:ontologia` confirma
    4. Commit + deploy
  - **Comandos:** `gen:ontologia`, `validate:ontologia`
  - **Convenções de naming:** `criado_por` é o padrão; `documents.owner_user_id` é dívida P1 (item 1)
  - **Mapper sync vs async:** sync é dívida intencional (item 4)
- Trigger: imediato pós-merge `claude/nice-goldberg-o6mzR` → `main`

---

## Histórico de commits da Sprint 3c V2

| # | SHA | Mensagem |
|---|---|---|
| 12 | `194b49d` | docs(smoke): adiciona Smoke 4 end-to-end + cleanup obrigatório |
| 11 | `fef28b8` | docs(smoke): instruções pra smoke real do holerite-classify-confirm em prod |
| 10 | `942c9e3` | chore(ontologia): remove shim de leitura legacy do hook |
| 9 | `5fa3a14` | chore(sprint-3c): dry-run no-op + fix de owner_user_id no migrate script |
| 8 | `c41ce82` | chore(prod): apply migrations V2 + smoke verde (parcial) |
| 7 | `5c8d7a0` | ci(deploy): pin prod a main + verify_jwt explícito em holerite-classify-confirm |
| 6 | `3b60106` | feat(ontologia): UI redireciona persistência pra rubrica_aliases_tentativa |
| 5 | `ca948b3` | fix(ontologia): restaura snapshot V1 + gerador como build-time tooling |
| 4 | `fbbb40b` | refactor(ontologia): cutover V1→V2 + delete V1 + sync-mode mapper |
| 3 | `16852bd` | fix(validate-ontologia): assertion (3) checa observacao_juridica preservada |
| 2 | `3d063d4` | fix(ontologia-v2): regenera seed absorvendo V1 + observacao_juridica + 3 aliases fuzzy |
| 1 | `5d5e8f8` | feat(ontologia): bundle V2 com aprendizado contínuo via rubrica_aliases |

## Refs adicionais

- `docs/SPRINT-3C-V2-APPLY.md` — log do apply de migrations em prod (4.1)
- `docs/SPRINT-3C-V2-LEGACY-MIGRATION-DRYRUN.md` — dry-run no-op da migração legacy (4.2)
- `docs/SMOKE-V2-PROD.md` — instruções do smoke real (item 7 deste hardening)
- `scripts/migrate-classificacoes-legacy.ts` — script de migração legacy (executável, mas no-op atualmente)
- `scripts/ontologia-v1-snapshot.ts` — snapshot histórico da curadoria V1 (build-time only)
- `scripts/gen-ontologia-v2-from-snapshot.ts` — regenerador do seed V2
- `scripts/ontologia-v2-overrides.json` — overrides do gerador (renames, regras, extra_aliases)
- `scripts/validate-ontologia-v2.ts` — validador do seed JSON

---

## Como atualizar este doc

Quando fechar um item:
1. Marca `[x]` no checkbox de status
2. Adiciona "Resolvido em: `<SHA>`" na linha do status
3. Move pra seção "## Histórico de itens fechados" no final (criar quando primeiro item fechar)
4. Commit isolado: `docs(hardening): fecha item N — <descrição curta>`

Quando descobrir item novo:
1. Adiciona na seção da severidade certa (P0/P1/P2)
2. Numera próximo (atual max = 8)
3. Commit isolado com referência à descoberta (ex.: SHA do commit ou conversa)
