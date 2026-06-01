## Stack

- **Frontend:** React + Vite (SPA), TypeScript strict
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
- **Banco:** PostgreSQL via Supabase client SDK — sem ORM, queries via `.rpc()` ou SDK nativo
- **SQL customizado:** PLpgSQL (funções, triggers, migrations)
- **Cálculo financeiro/precisão:** Decimal.js com 20 dígitos — NUNCA usar `number` nativo para valores monetários ou cálculos sensíveis
- Testes: Vitest (2580+ testes — manter todos passando, exceto 2 testes de calibração marcados `.skip` por fixtures ausentes)

---

## Regras inegociáveis

- Nunca usar `number` para valores monetários — sempre `Decimal` do Decimal.js
- Nunca fazer `as any` — se precisar, justifique com comentário
- Nunca quebrar os 2580+ testes existentes — rode `!npx vitest run` antes de encerrar qualquer tarefa
- Nunca editar migrations já aplicadas — crie sempre uma nova migration
- Nunca usar `console.log` em produção — use o padrão de log do projeto
- Row Level Security (RLS) do Supabase deve ser respeitado — não sugerir desativar RLS como solução

---

## Fluxo de trabalho padrão

### Antes de implementar qualquer coisa
1. Entenda o escopo completo antes de escrever código
2. Liste os arquivos que serão modificados
3. Identifique se há impacto em RLS, types do Supabase ou testes existentes
4. Use `ultrathink` para decisões arquiteturais ou bugs difíceis

### Ao escrever features
- Componentes React: functional components + hooks — sem class components
- Estilização: Tailwind + shadcn/ui — não criar CSS customizado desnecessariamente
- Tipos: inferir do Supabase quando possível, declarar explicitamente quando não
- Mutations no Supabase: sempre tratar erro retornado (`const { data, error } = await supabase...`)

### Ao corrigir bugs
1. Reproduza o bug com um teste antes de corrigir
2. Corrija
3. Confirme que o teste passa
4. Rode a suite completa: `!npx vitest run`

### Ao refatorar
- Mantenha a interface pública dos componentes/funções estável
- Refatore em passos pequenos, rodando testes entre cada passo
- Não mude comportamento e estrutura ao mesmo tempo

### Ao revisar PRs
- Verifique: tipos corretos, sem `any`, Decimal.js para números, RLS respeitado, testes cobrindo o caminho feliz e o de erro

---

## Comandos úteis

```bash
# Testes
!npx vitest run              # suite completa (rode antes de encerrar qualquer tarefa)
!npx vitest run --reporter=verbose  # com detalhes
!npx vitest run src/path/to/file.test.ts  # arquivo específico

# Tipos Supabase (rode após mudar schema)
!npx supabase gen types typescript --local > src/types/supabase.ts

# Build
!npm run typecheck           # check de tipo REAL (tsconfig.app.json)
!npm run build               # build completo

# ⚠️ NÃO use `npx tsc --noEmit` para checar tipos: o tsconfig.json RAIZ tem
# `files: []` + `references`, então em modo não-build ele compila ZERO arquivos
# (sai "0 erros" enganoso). O gate de tipo é `npm run typecheck`. Ver "Gate de tipos".

# Supabase local
!npx supabase start
!npx supabase db reset       # reseta e roda migrations do zero
!npx supabase migration new nome_da_migration
```

---

## Estrutura esperada de arquivos

```
src/
  components/     # componentes React (shadcn/ui + custom)
  hooks/          # custom hooks
  lib/            # utilitários, supabase client, helpers Decimal.js
  types/          # tipos TypeScript (incluindo supabase.ts gerado)
  pages/          # páginas/rotas
supabase/
  migrations/     # migrations SQL — nunca editar as já aplicadas
  functions/      # Edge Functions (Deno/TypeScript)
```

---

## Padrões de código

### Decimal.js — use sempre para números sensíveis
```typescript
import Decimal from 'decimal.js'
Decimal.set({ precision: 20 })

// ✅ correto
const total = new Decimal(price).plus(tax).toFixed(2)

// ❌ errado
const total = price + tax
```

### Supabase — sempre tratar erro
```typescript
// ✅ correto
const { data, error } = await supabase.from('table').select('*')
if (error) throw error

// ❌ errado
const { data } = await supabase.from('table').select('*')
```

### Componente React padrão
```typescript
// ✅ correto — tipagem explícita nas props
interface Props {
  value: string
  onChange: (value: string) => void
}

export function MyComponent({ value, onChange }: Props) { ... }
```

---

## O que NÃO fazer

- Não sugerir Express, Next.js ou qualquer backend Node — o backend é Supabase
- Não criar arquivos `.js` — apenas `.ts` e `.tsx`
- Não instalar bibliotecas de data pesadas (ex: moment.js) — usar date-fns ou nativo
- Não criar dependência nova sem justificativa explícita registrada na seção "Exceções autorizadas" abaixo
- Não duplicar lógica que já existe em hooks ou lib/
- Não propor soluções que contornem o RLS do Supabase
- Não usar `parseFloat` ou `parseInt` em valores monetários

---

## Exceções autorizadas a "Não criar dependência nova"

Cada entrada documenta: data + sessão + dependência + justificativa.
Próximo agente que ler esta seção: presença de uma dependência aqui ≠
licença para adicionar outras "porque parecem legais". Cada nova
adição precisa de exceção explicitamente autorizada pelo dono.

- `@testing-library/react@^16.3.2` + `@testing-library/jest-dom@^6.9.1`
  — 2026-05-18, sessão hotfix OCR/CSV (Gate 2). devDependencies.
  Justificativa: testes unitários de componente React (banner do
  score-bloqueador). Padrão da indústria desde 2018. Alternativas
  (Playwright e2e com mocking de Supabase, ou Storybook) tinham custo
  desproporcional ao escopo. Setup em `tests/setup.ts` + `vitest.config.ts`.

---

## Comportamento esperado do Claude

- Ao terminar qualquer tarefa: rode `!npx vitest run` e confirme que está verde
- Ao criar SQL/migration: use PLpgSQL idiomático, com `BEGIN/EXCEPTION/END` para transações
- Ao propor mudanças grandes: liste o plano antes de executar e aguarde confirmação
- Em caso de dúvida sobre um tipo Supabase: consulte `src/types/supabase.ts`
- Se os testes falharem após uma mudança: pare, analise e corrija antes de continuar
- **Antes de propor schema ou refactor que toca código existente:** peça grep ou SELECT específico contra prod/repo. Diagnóstico custa minutos, retrabalho custa rodadas.
- **Se mudança afeta o que/onde vai ser persistido em prod:** pare e confirme antes. Implementação e UI são decisão autônoma; dados persistidos são decisão compartilhada.

---

## Ontologia de Rubricas V2 (Sprint 3c, 2026-05-24)

Sistema de classificação de rubricas trabalhistas com aprendizado contínuo.

### Onde mora cada coisa

| Artefato | Path | Escopo |
|---|---|---|
| **Snapshot V1** (curadoria do escritório, congelado) | `scripts/ontologia-v1-snapshot.ts` | build-time only — NÃO importar em runtime |
| **Gerador V2** | `scripts/gen-ontologia-v2-from-snapshot.ts` | regenera seed V2 a partir do snapshot + overrides |
| **Overrides** (renames, regras, aliases extras) | `scripts/ontologia-v2-overrides.json` | renames V1→V2, `categoria_rules`, `extra_aliases` |
| **Seed V2** (runtime) | `supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json` | 96 rubricas, 258 aliases |
| **Mapper V2** (edge, sync) | `supabase/functions/_shared/holerite-mapper-v2/sync-mode.ts` | classificação via seed + cache de aliases aprendidos (TTL 5min) |
| **Adapter V1-compat** | `supabase/functions/_shared/holerite-mapper-v2/v1-compat.ts` | converte `ClassificacaoRubrica` V2 → `RubricaClassificadaDominio` V1 |
| **Mapper async** (edge) | `supabase/functions/_shared/holerite-mapper-v2/index.ts` | versão async com supabase client (pra scripts/batch, não pra mapper sync) |
| **Tipos compartilhados** | `src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts` | `CategoriaOntologiaRubricaV2`, `ClassificacaoRubrica`, `CATEGORIA_V1_TO_V2` |
| **Edge function confirm** | `supabase/functions/holerite-classify-confirm/index.ts` | promove tentativa → canônico, com conflict_rejected |
| **Tabelas banco** | `rubrica_aliases` (canônico) + `rubrica_aliases_tentativa` (staging) + `rubrica_aliases_history` (audit) | migration `20260524000000` |
| **Hook frontend** | `src/hooks/useClassificacoesTentativa.ts` | debounce 800ms, 2 fontes (tentativa > seed) |
| **Validador** | `scripts/validate-ontologia-v2.ts` | gate de CI (categoria, tipo, normalized_key único, cross-categoria) |

### Fluxo de aprendizado contínuo

```
UPLOAD PDF → mapper edge (holerite-via-varejo/generico)
  → enriquecerComClassificacaoV2 (sync-mode) → JSONB parsed

USER ABRE DIALOG → banner mostra NAO_CLASSIFICADO
  → operador classifica via dropdown → UPSERT em tentativa (debounce 800ms)

USER CLICA "CONFIRMAR E BAIXAR ZIP"
  → holerite-classify-confirm promove tentativa → canônico (rubrica_aliases)
  → conflito de categoria ou observação jurídica → conflict_rejected no audit
  → build ZIP com state local do grid
```

### Como adicionar rubrica nova

1. Editar `scripts/ontologia-v1-snapshot.ts` — adicionar entry no formato V1:
   ```ts
   { texto_canonico: 'Nome Real', categoria: 'COMISSAO_PRODUTOS', sinonimos: ['Variante 1', 'Var. 2'] }
   ```
2. Se a rubrica veio de OCR com typo vs forma corrigida, manter typo como sinônimo
3. `npm run gen:ontologia` — regenera `ontologia-v2.json`
4. `npm run validate:ontologia` — confirma 0 conflitos
5. Commit + push

### Comandos

```bash
npm run gen:ontologia       # regenera seed V2 a partir do snapshot + overrides
npm run validate:ontologia  # valida seed (categoria, tipo, keys, colisão)
```

### Convenções de naming

- Coluna de criador: `criado_por` (padrão pt-BR). **Exceção:** `documents.owner_user_id` (dívida P1 — auditar e padronizar)
- `rubrica_aliases_history.actor` ≠ `criado_por` (semântica de "ator da ação")
- Categorias V2: `COMISSOES_PRODUTOS`, `COMISSOES_SERVICOS`, `PREMIOS`, `DSR_S_COMISSOES`, `DESCONSIDERADAS`, `MINIMO_GARANTIDO`, `SALARIO_SUBSTITUICAO`, `NAO_CLASSIFICADO`
- Shim V1→V2: `CATEGORIA_V1_TO_V2` em `ontologia-rubricas-v2.ts` — defesa de leitura pra JSONB antigo

### Dívidas técnicas registradas

Detalhes em `docs/HARDENING-V2.md`. Principais:
- `Mapper.mapear` sync via cache module-init (TTL 5min) — migrar pra async quando volume justificar
- Conflict UX dialog inexistente (só toast.warning)
- `documents.owner_user_id` vs `criado_por` inconsistência

---

## Auto-fix de CI — escopo de auto-correção por categoria

Quando o Claude GitHub App (ou qualquer agente automatizado) corrigir falhas de CI, seguir estas regras de escopo:

### ✅ PODE auto-corrigir (sem pedir aprovação)
- Erros de lint (`eslint`, `prettier`)
- Erros de tipo (`tsc --noEmit`) — imports faltando, tipos incorretos
- Testes falhando por causa de mudança na interface pública (atualizar `expect`)
- Imports não usados / variáveis mortas
- Formatação de código

### ⚠️ PODE corrigir com cautela (documentar no commit)
- Testes falhando por lógica de negócio — SOMENTE se o fix é óbvio e localizado
- Migration SQL com erro de sintaxe — corrigir em nova migration, nunca editar a existente
- Edge function deploy falhando por import quebrado

### ❌ NÃO pode auto-corrigir (pedir aprovação humana)
- Testes de calibração / paridade falhando — pode ser regressão real
- Mudanças em lógica de cálculo (`orchestrator.ts`, `engine-v3.ts`, módulos PJe-Calc)
- Alterações em RLS policies ou schema de banco
- Rebaixar thresholds de gates (cobertura, paridade, score mínimo)
- Adicionar dependências novas
- Desabilitar testes ou marcar como `.skip`

### Loop de execução obrigatório
1. `npm run typecheck` — NÃO pode AUMENTAR a contagem de erros vs a base (ver "Gate de tipos")
2. `npx vitest run` — todos os testes passando (exceto calibração `.skip`)
3. Se algum falhar após o fix: **pare e reporte**, não tente workaround

### Gate de tipos (IMPORTANTE — 2026-06 Addendum 2)
- O check de tipo do projeto é **`npm run typecheck`** (`tsc -p tsconfig.app.json`).
  **NUNCA** confie em `npx tsc --noEmit`: o `tsconfig.json` raiz tem `files: []` +
  `references` → compila ZERO arquivos (sai "0 erros" mesmo com o código quebrado).
  `vite build` usa esbuild → também não type-checa. Foi esse ponto cego que deixou
  bugs de coluna-fantasma (ex.: `upsertResultado` com `inss_segurado`, férias com
  `dias`/`dobra`) chegarem em caminho vivo.
- **Baseline atual: ~627 erros reais** (tipos hand-written em `lib/pjecalc/types.ts`
  driftados do schema). É backlog conhecido. O CI roda o typecheck **non-blocking**.
- **Regra de ouro:** um PR **não pode AUMENTAR** a contagem vs a base. Mede com
  `npm run typecheck 2>&1 | grep -c "error TS"` antes e depois. Quando o baseline
  zerar (ver plano de derivar tipos do schema), o gate vira **blocking** em 0.
