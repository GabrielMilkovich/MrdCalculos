# Deploy Supabase via GitHub Actions

Workflow configurado em `.github/workflows/deploy-supabase.yml` que faz deploy
automático de Edge Functions e migrations **sem precisar de CLI local**.

## Setup (uma única vez)

### 1. Gere um Personal Access Token do Supabase

Acesse https://supabase.com/dashboard/account/tokens e clique em
**Generate new token**. Dê um nome descritivo (ex: `github-actions-deploy`)
e copie o token.

### 2. Adicione os secrets no GitHub

No repositório `gabrielmilkovich/mrdcalculos`, vá em:
**Settings → Secrets and variables → Actions → New repository secret**

Adicione os 3 secrets:

| Secret | Valor |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token gerado no passo 1 |
| `SUPABASE_PROJECT_REF` | `xhvlhrgfoeahgofhljbs` (o ref do projeto) |
| `SUPABASE_DB_PASSWORD` | Senha do banco (pegue em Project Settings → Database) |

## Como disparar o deploy

### Opção A — automático no push

Toda vez que você der `git push` em `main` ou em uma branch `claude/**`, se
houver mudanças em `supabase/functions/**` ou `supabase/migrations/**`,
o workflow roda sozinho.

### Opção B — manual pelo GitHub

1. Vá em https://github.com/gabrielmilkovich/mrdcalculos/actions
2. Selecione **Deploy Supabase (Functions + DB)** na coluna esquerda
3. Clique em **Run workflow** → escolha a branch → **Run workflow**

Escolha `tudo`, `somente-functions` ou `somente-migrations`.

## O que o workflow faz

1. **Link project** — conecta o CLI ao seu projeto Supabase
2. **Deploy functions** — loop por `supabase/functions/*/` e roda
   `supabase functions deploy <nome>` em cada uma. Se alguma falhar, as
   outras continuam (reporta total de ok/falhas no final).
3. **Apply migrations** — `supabase db push` aplica migrations pendentes.
4. **List functions** — imprime status final (ACTIVE/ERROR).

## Verificação pós-deploy

Veja o log do job no GitHub Actions:
https://github.com/gabrielmilkovich/mrdcalculos/actions

No final do log, a seção **Post-deploy — list functions** mostra todas as
functions com status. Expectativa: ~33 functions ACTIVE.

## Troubleshooting

**"link project failed"** → token errado ou sem permissão. Regere em
`supabase.com/dashboard/account/tokens`.

**"db push failed: password"** → senha do DB incorreta. Pegue em
Supabase Dashboard → Project Settings → Database → Reset database password.

**Function individual falha** → veja o log específico da função. Causas
comuns: erro de sintaxe em TypeScript da function, dependência faltando,
imports de `_shared/` quebrados.

**Workflow não dispara automaticamente** → confirme que o push tocou em
`supabase/functions/**`, `supabase/migrations/**` ou o próprio workflow
(triggers definidos em `on.push.paths`).

## Deploy manual alternativo (se precisar)

Se você tem a CLI instalada localmente, pode usar o mesmo loop:

```bash
for fn in supabase/functions/*/; do
  name=$(basename "$fn")
  [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name"
done
supabase db push
```
