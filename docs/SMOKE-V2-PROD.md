# Smoke test V2 em prod — `holerite-classify-confirm`

**Objetivo:** validar end-to-end que migration #1 + Edge Function deployada + auth flow + CORS estão coerentes em prod. **Pré-requisito do item 7 do hardening V2 — bloqueia merge `claude/nice-goldberg-o6mzR` → `main`.**

**Tempo estimado:** 15-30min do seu lado, sem dependência de UI deployada.

---

## Pré-requisitos

- Node 20+ instalado
- Acesso a um **email/senha de usuário de teste em prod** (`auth.users`). Se não tem, criar via Supabase Dashboard → Authentication → Add user, marcando "Auto Confirm User"
- Acesso ao terminal local com curl

---

## Passo 1 — obter JWT via supabase-js local

Salve isso como `/tmp/get-jwt.mjs` (fora do repo — não commitar):

```javascript
// /tmp/get-jwt.mjs
// Roda: SUPA_EMAIL=... SUPA_PASSWORD=... node /tmp/get-jwt.mjs
// Imprime o access_token (JWT) no stdout. Cole no smoke curl.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhvlhrgfoeahgofhljbs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZpLD-u98Lh1koe5NAoY-Mg_BdQaHa2j';

const email = process.env.SUPA_EMAIL;
const password = process.env.SUPA_PASSWORD;
if (!email || !password) {
  console.error('Set SUPA_EMAIL e SUPA_PASSWORD no env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error('Login falhou:', error.message);
  process.exit(1);
}
console.log(data.session.access_token);
```

Executar:

```bash
# Instala o sdk numa pasta temporária pra não poluir o repo
mkdir -p /tmp/smoke-v2 && cd /tmp/smoke-v2
npm init -y >/dev/null 2>&1
npm install @supabase/supabase-js@2 >/dev/null 2>&1

# Pega o JWT
export SUPA_EMAIL='seu-usuario-de-teste@exemplo.com'
export SUPA_PASSWORD='sua-senha'
export JWT=$(SUPA_EMAIL="$SUPA_EMAIL" SUPA_PASSWORD="$SUPA_PASSWORD" \
  node --input-type=module -e "$(cat /tmp/get-jwt.mjs)")

echo "JWT obtido (primeiros 40 chars): ${JWT:0:40}..."
# Se imprimir só os 40 chars, deu certo. Se imprimir erro, login falhou.
```

---

## Passo 2 — obter `case_id` de um case existente do seu user

**Opção A (rápida):** colar aqui o output que eu pego via MCP `execute_sql`. Me peça e eu rodo:
```sql
SELECT id, numero_processo, criado_em FROM cases
WHERE criado_por = (SELECT id FROM auth.users WHERE email = 'seu-usuario@exemplo.com')
ORDER BY criado_em DESC LIMIT 3;
```

**Opção B (autônoma):** Supabase Dashboard → Table Editor → `cases`, filtra `criado_por = <teu user id>`, copia 1 `id` (uuid).

Exporta:
```bash
export CASE_ID='<cole-aqui-o-uuid>'
```

---

## Passo 3 — 3 smoke curls

### Smoke 1 — sem token (esperado 401)

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"case_id":"'"$CASE_ID"'"}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm
```

Esperado:
```
{"error":"unauthorized"}
HTTP 401
```
(Ou 401 do gateway Supabase antes de chegar à function — qualquer 4xx confirma que function exige auth.)

### Smoke 2 — payload faltando case_id (esperado 400)

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm
```

Esperado:
```
{"error":"case_id_required"}
HTTP 400
```
Confirma que function alcançou parser de body e validação responde.

### Smoke 3 — payload válido (esperado 200, **o smoke principal**)

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"'"$CASE_ID"'"}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm
```

Esperado:
```
{"promovidos":0,"conflitos":[]}
HTTP 200
```

`promovidos: 0` porque o case não tem tentativas registradas em `rubrica_aliases_tentativa` (banner nunca foi exercitado nesse case). O fato de **chegar a `200` com esse shape** prova que:
- Auth funcionou (JWT válido aceito pelo gateway)
- Function carregou (deploy ok)
- Query no schema novo funcionou (`SELECT * FROM rubrica_aliases_tentativa WHERE case_id = $1`)
- Retorno serializou corretamente

---

## Tabela de interpretação

| HTTP | Body | Diagnóstico | Ação |
|---|---|---|---|
| **200** | `{"promovidos":0,"conflitos":[]}` | **✓ SMOKE VERDE.** Cola aqui, autorizo merge. | — |
| 200 | `{"promovidos":N,"conflitos":[...]}` com N>0 | Function rodou e achou tentativas que você não esperava. Não bloqueia smoke, mas vale entender. Cola tudo. | Investigar antes de merge |
| 401 | qualquer | JWT inválido/expirado, ou anon key errada | Refaz Passo 1 |
| 400 | `case_id_required` | Variable `$CASE_ID` vazia/não exportada | Refaz Passo 2 |
| 500 | `column "criado_por" does not exist` | Migration #1 não aplicou corretamente em prod | **PARA, reporta — categoria 3** |
| 500 | `column "created_by" does not exist` | Function v3 deployada espera coluna velha | **PARA, reporta — function dessincronizada** |
| 500 | `relation "rubrica_aliases_tentativa" does not exist` | Migration #1 não criou tabela | **PARA, reporta** |
| 500 | outro | Erro inesperado | Cola body completo, eu investigo |
| 403 | `Host not in allowlist` ou CORS | Allowlist do `corsHeaders` não cobre origem do curl | Investigar `holerite-classify-confirm:36-52` |
| 404 | qualquer | URL errada (provavelmente path do project_ref) | Verifica URL |

---

## Passo 4 — SQL pós-smoke (eu rodo via MCP quando você reportar)

Independente do resultado, vou rodar (não precisa fazer nada):

```sql
-- Confirma que função NÃO criou lixo (case sem tentativas → nenhum insert em history)
SELECT count(*) FROM rubrica_aliases_history
WHERE case_id = '<CASE_ID>' AND created_at > now() - interval '5 minutes';
-- Esperado: 0

-- Confirma que case_id existe e pertence ao user que loggou
SELECT id, criado_por FROM cases WHERE id = '<CASE_ID>';
-- Esperado: 1 row com criado_por batendo no auth.uid() do JWT
```

---

## Como reportar

Cola aqui:
1. Output do Smoke 1 (deve ser 401)
2. Output do Smoke 2 (deve ser 400)
3. Output do Smoke 3 (deve ser 200 — é o que importa)
4. Se quiser, valor de `$CASE_ID` pra eu rodar SQL pós-smoke

Se Smoke 3 verde, **autorizo merge** = você manda "merge ok" e eu executo:
```bash
git checkout main
git merge --ff-only claude/nice-goldberg-o6mzR
git push origin main
```

Se Smoke 3 vermelho, **paro pra investigar** — não merge antes.

---

## Limpeza pós-teste (opcional)

```bash
rm -rf /tmp/smoke-v2 /tmp/get-jwt.mjs
unset JWT SUPA_EMAIL SUPA_PASSWORD CASE_ID
```
