## Stack

- **Frontend:** React + Vite (SPA), TypeScript strict
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
- **Banco:** PostgreSQL via Supabase client SDK — sem ORM, queries via `.rpc()` ou SDK nativo
- **SQL customizado:** PLpgSQL (funções, triggers, migrations)
- **Cálculo financeiro/precisão:** Decimal.js com 20 dígitos — NUNCA usar `number` nativo para valores monetários ou cálculos sensíveis
- **Testes:** Vitest (190+ testes — manter todos passando)

---

## Regras inegociáveis

- Nunca usar `number` para valores monetários — sempre `Decimal` do Decimal.js
- Nunca fazer `as any` — se precisar, justifique com comentário
- Nunca quebrar os 190+ testes existentes — rode `!npx vitest run` antes de encerrar qualquer tarefa
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
!npx tsc --noEmit            # checa tipos sem buildar
!npm run build               # build completo

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
- Não duplicar lógica que já existe em hooks ou lib/
- Não propor soluções que contornem o RLS do Supabase
- Não usar `parseFloat` ou `parseInt` em valores monetários

---

## Comportamento esperado do Claude

- Ao terminar qualquer tarefa: rode `!npx vitest run` e confirme que está verde
- Ao criar SQL/migration: use PLpgSQL idiomático, com `BEGIN/EXCEPTION/END` para transações
- Ao propor mudanças grandes: liste o plano antes de executar e aguarde confirmação
- Em caso de dúvida sobre um tipo Supabase: consulte `src/types/supabase.ts`
- Se os testes falharem após uma mudança: pare, analise e corrija antes de continuar
