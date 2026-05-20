# Auditoria — JWT em cookie HttpOnly (viabilidade)

**Data:** 2026-05-20
**Escopo:** Prompt 7 da auditoria de segurança
**Status:** Diagnóstico de viabilidade — **não aplicado**, conforme orientação do próprio Prompt 7

---

## Conclusão direta

**Não é possível** migrar o JWT do Supabase Auth para cookie HttpOnly **neste projeto, no estado atual**, sem mudança arquitetural significativa.

A própria spec do Prompt 7 antecipa esse cenário: *"Se for uma SPA pura sem backend (apenas Vercel static), diga claramente que cookies HttpOnly verdadeiros não são possíveis sem um servidor intermediário."*

---

## Por que não é possível hoje

### Stack confirmada
- **Frontend:** Vite 5.4 SPA pura — `package.json` linha `"dev": "vite"`
- **Sem framework SSR:** zero `next`, `remix`, `@sveltejs/kit` em `package.json`
- **Auth client:** `@supabase/supabase-js@^2.91.0` apenas — **`@supabase/ssr` NÃO instalado**
- **Backend próprio:** nenhum — sem `server/`, `api/`, ou `backend/` na raiz
- **Edge functions:** existem em `supabase/functions/` (28+), mas rodam em **Deno na infraestrutura do Supabase**, não no caminho HTTP da Vercel. Não interceptam a request do browser pra atribuir/ler cookie HttpOnly.

### O bloqueador técnico
O fluxo de auth do Supabase em SPA funciona assim hoje:

```
Browser → POST https://<projeto>.supabase.co/auth/v1/token
       ← JSON { access_token, refresh_token, expires_at, user, ... }
       (SDK do supabase-js salva em localStorage)

Browser → GET https://<projeto>.supabase.co/rest/v1/<tabela>
       (SDK lê access_token do localStorage e anexa em Authorization header)
```

Para o JWT virar HttpOnly:
1. Algum servidor que NÓS controlamos teria que receber o response de auth.
2. Esse servidor seta `Set-Cookie: sb-access=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/`.
3. Subsequente: **toda** chamada Supabase precisa passar por esse servidor (porque o cookie só vai pro domínio dele, não pra `<projeto>.supabase.co`).

**Hoje não existe esse servidor.** Vercel static deployment serve arquivos `.html`/`.js`/`.css` — não roda código em request time.

---

## Alternativas reais (com custo honesto)

### 1. Aceitar o status quo (recomendado para esta fase)
**Mitigação:** CSP restritiva (já aplicada em Prompt 8) + TTLs curtos de signed URLs (Prompt 6) + zero `eval` ou `unsafe-inline` em scripts. **Custo:** zero. **Trade-off:** JWT continua acessível via JS — risco depende inteiramente da ausência de XSS no código.

[opinião técnica, confiança média-alta] Para um SaaS jurídico hoje com base de usuários controlada (sócios + advogados internos), localStorage com CSP forte é o padrão aceitável da indústria. Twitter, Notion, Linear, Vercel Dashboard — todos fazem isso. A linha vermelha é XSS no código próprio; se não houver, o vetor de roubo é remoto.

### 2. Adicionar Vercel Functions como proxy de auth
**Como funcionaria:**
- `/api/auth/login` — Vercel Function recebe credenciais, repassa para Supabase, seta cookie HttpOnly no response
- `/api/supabase/[...path]` — proxy genérico que lê o cookie, valida, repassa pra Supabase com `Authorization: Bearer <jwt>`
- Browser sempre conversa com `/api/*` (mesmo domínio), nunca com `<projeto>.supabase.co`

**Custo:**
- Escrever e manter ~2-4 Vercel Functions
- Latência: +50-150ms por chamada (round-trip Vercel → Supabase)
- Billing Vercel: cada chamada gasta invocation
- Realtime via WebSocket fica complicado: WebSocket através de proxy é não-trivial
- Tempo de implementação realista: 2-4 semanas com testes

**Trade-off:** sólido em segurança, mas é uma decisão de arquitetura de produto, não de hardening.

### 3. Migrar para Next.js + `@supabase/ssr`
**Como funcionaria:** Next.js SSR/RSC com helpers `@supabase/ssr` que sabem como ler/escrever cookie HttpOnly automaticamente.

**Custo:**
- Migração de framework inteiro: rotas → app/pages, build pipeline, deploy
- Tempo realista: 1-3 meses dependendo do tamanho do app
- Adiciona Next.js como dependência permanente

**Trade-off:** ganho de segurança + SSR + SEO. Mas é refactor maior, fora do escopo de "hotfix de segurança".

### 4. Mudar para sessionStorage
**Como funcionaria:** trocar `storage: localStorage` por `storage: sessionStorage` no `supabase.client.ts`.

**Ganho:** sessão termina ao fechar a aba. Reduz janela de uso de JWT roubado se a vítima fechou a aba antes do atacante usar.

**Trade-off:** o usuário precisa fazer login a cada nova aba/janela. UX ruim. **NÃO mitiga XSS no mesmo tab** — `sessionStorage` é tão acessível via JS quanto `localStorage`.

### 5. Encriptar JWT no localStorage com chave em código
**NÃO é solução.** Se a chave de descrypto está no JS, o atacante via XSS rouba a chave + o ciphertext + descrypta. Teatro de segurança. Não fazer.

### 6. Refresh token rotation + access token TTL curto
**Como funcionaria:** Supabase já faz isso por padrão (`autoRefreshToken: true`), com access_token TTL ~1h. Reduzir o access_token TTL para 5-15min via Supabase Dashboard reduz a janela útil de um JWT roubado.

**Ganho:** janela do atacante diminui drasticamente.

**Trade-off:** zero, exceto mais chamadas de refresh token. **Recomendado independentemente da decisão de cookie HttpOnly.** É config no Supabase Dashboard, não código.

---

## O que **foi aplicado** nesta sessão como mitigação real

- **CSP restritiva** (Prompt 8): `script-src 'self'` sem `unsafe-inline`, sem `eval` — impede a maioria dos vetores de XSS que rouba JWT
- **`X-XSS-Protection: 1; mode=block`** (Prompt 2): aciona filtro XSS de browser legado
- **`X-Frame-Options: DENY`** + **`frame-ancestors 'none'`**: impede clickjacking
- **`Referrer-Policy: strict-origin-when-cross-origin`** (Prompt 2): não vaza tokens em URL via Referer
- **Signed URLs com TTL 15min** (Prompt 6): URL roubada vive minutos, não horas
- **`target="_blank"` com `noopener noreferrer`** (Prompt 3): nova aba não tem acesso à window opener

**Esses 5 itens reduzem materialmente a superfície de ataque que justificaria HttpOnly cookies.** Eles não tornam o sistema impenetrável, mas movem a barra.

---

## Recomendação para o sócio / dono

[opinião técnica] Em ordem de custo/benefício:

1. **Curto prazo (esta semana):** aceitar status quo, fechar Prompts 1-9 com CSP + TTL curto. Reduzir access_token TTL no Supabase Dashboard para 15min.
2. **Médio prazo (próximo trimestre):** se a base de usuários crescer ou se aparecer requisito de compliance jurídico forte, avaliar Opção 2 (Vercel Functions proxy). Não Opção 3 (migração Next.js) só por causa de cookie — não vale o custo.
3. **Longo prazo:** se Next.js entrar por outra razão (SEO, SSR, performance), `@supabase/ssr` vem de brinde.

---

## Arquivos que precisariam mudar SE Opção 2 (Vercel Functions) for adotada

- **Novo:** `api/auth/login.ts`, `api/auth/logout.ts`, `api/auth/refresh.ts`, `api/supabase/[...path].ts` (Vercel Functions)
- **`src/integrations/supabase/client.ts`**: trocar `createClient` direto pra wrapper que aponta para `/api/supabase`
- **`vercel.json`**: adicionar rotas pra `/api/*`
- **Todos os arquivos que fazem `supabase.from(...).select()` ou `supabase.auth.*`**: continuariam funcionando se o wrapper preservar a API do supabase-js (é o que `@supabase/auth-helpers-*` fazia antes de virar `@supabase/ssr`)
- **`.env.example` e Vercel env**: adicionar `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Edge functions** (Deno): zero impacto — continuam usando service role key no servidor Supabase

Não implementado nesta sessão. Decisão arquitetural fica com você.
