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

### Smoke 3 — payload válido (esperado 200)

**IMPORTANTE:** rode esse curl APÓS eu ter executado o passo 4.2 (insert da tentativa de teste). Sem isso, retorna `{"promovidos":0,"conflitos":[]}` (que prova só ~60% dos invariantes — veja Passo 4 abaixo).

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"'"$CASE_ID"'"}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm
```

Esperado (com tentativa de teste pré-inserida via 4.2):
```
{"promovidos":1,"conflitos":[]}
HTTP 200
```

Esse shape prova:
- Auth funcionou (JWT válido aceito pelo gateway)
- Function carregou (deploy ok)
- SELECT em `rubrica_aliases_tentativa` funcionou (schema novo OK)
- UPSERT em `rubrica_aliases` funcionou (RLS via service_role bypass, CHECK constraints aceitaram payload, `criado_por` populado)
- INSERT em `rubrica_aliases_history` funcionou (audit trail)
- DELETE da tentativa pós-promoção funcionou (cleanup)
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

## Passo 4 — Smoke end-to-end (fluxo completo via SQL + curl)

Smoke 1+2+3 com case vazio prova ~60% dos invariantes:
- ✅ Auth funciona (JWT aceito)
- ✅ CORS funciona
- ✅ Function alcançou tabela `rubrica_aliases_tentativa` sem erro de schema
- ❌ NÃO prova INSERT no upsert da promoção
- ❌ NÃO prova `conflict_rejected`
- ❌ NÃO prova `criado_por` populado corretamente
- ❌ NÃO prova audit trail
- ❌ NÃO prova cleanup da tentativa pós-promoção

Smoke 4 adiciona ~5min meus (SQL via MCP) e cobre ~95% dos invariantes.

### Sequência

**Antes do curl (eu rodo via MCP — você só me passa o email do user teste):**

```sql
-- 4.1 — Confirma case_id existente do user teste
SELECT id FROM cases
WHERE criado_por = (SELECT id FROM auth.users WHERE email = '<EMAIL_TESTE>')
LIMIT 1;
-- Anota o case_id.

-- 4.2 — Insere tentativa de teste (simula classificação via banner)
INSERT INTO rubrica_aliases_tentativa (
  case_id, alias_original, normalized_key, categoria, tipo_pjecalc,
  base_dsr, base_13, base_ferias, incluido, criado_por
) VALUES (
  '<CASE_ID>',
  'SMOKE TEST RUBRICA',
  'smoke test rubrica',
  'DESCONSIDERADAS',
  'DESCONSIDERAR',
  false, false, false, false,
  (SELECT id FROM auth.users WHERE email = '<EMAIL_TESTE>')
);
-- Esperado: INSERT 0 1
```

**Curl smoke 3 atualizado (você roda):**

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"'"$CASE_ID"'"}' \
  https://xhvlhrgfoeahgofhljbs.supabase.co/functions/v1/holerite-classify-confirm
```

Esperado **agora** (com 1 tentativa pra promover):
```
{"promovidos":1,"conflitos":[]}
HTTP 200
```

**Pós-curl (eu rodo via MCP):**

```sql
-- 4.3 — Confirma promoção: tentativa virou linha canônica em rubrica_aliases
SELECT alias_original, normalized_key, categoria, source, reviewed,
       criado_por, confidence
FROM rubrica_aliases
WHERE normalized_key = 'smoke test rubrica';
-- Esperado: 1 row, source='user_classification', reviewed=true,
--           criado_por = user_id do JWT, confidence=0.80

-- 4.4 — Confirma audit trail: action='promoted_from_tentativa'
SELECT action, payload->>'alias_original' AS alias, actor, case_id
FROM rubrica_aliases_history
WHERE payload->>'normalized_key' = 'smoke test rubrica'
ORDER BY created_at DESC LIMIT 1;
-- Esperado: 1 row, action='promoted_from_tentativa', actor = user_id,
--           case_id = CASE_ID

-- 4.5 — Confirma cleanup: tentativa foi apagada pós-promoção
SELECT count(*) FROM rubrica_aliases_tentativa
WHERE normalized_key = 'smoke test rubrica';
-- Esperado: 0
```

**Cleanup obrigatório (eu rodo via MCP — não deixa lixo em prod):**

```sql
-- 4.6 — Ordem importa: history primeiro (FK), depois canônico
DELETE FROM rubrica_aliases_history
WHERE payload->>'normalized_key' = 'smoke test rubrica';

DELETE FROM rubrica_aliases
WHERE normalized_key = 'smoke test rubrica';

-- Confirma cleanup
SELECT
  (SELECT count(*) FROM rubrica_aliases WHERE normalized_key = 'smoke test rubrica') AS canonico_remanescente,
  (SELECT count(*) FROM rubrica_aliases_history WHERE payload->>'normalized_key' = 'smoke test rubrica') AS history_remanescente,
  (SELECT count(*) FROM rubrica_aliases_tentativa WHERE normalized_key = 'smoke test rubrica') AS tentativa_remanescente;
-- Esperado: 0, 0, 0
```

### Decisão ajustada

| Cenário | Significado | Ação |
|---|---|---|
| Smoke 1, 2, 3, 4 verdes | V2 funciona end-to-end | Autorizo merge |
| Smoke 1, 2, 3 verdes + 4 vermelho (200 mas `promovidos`≠1) | Bug no UPSERT/handler de promoção | PARA, investiga |
| Smoke 1, 2, 3 verdes + 4 vermelho (500 no curl com tentativa real) | Bug no path de promoção que case vazio não exercitava | PARA, investiga |
| Smoke 1, 2 ou 3 vermelho | Bloqueador estrutural | PARA, investiga (categoria 3) |

---

## Como reportar / fluxo coordenado (~30min)

| Etapa | Quem | Tempo |
|---|---|---|
| Criar usuário teste em prod (Dashboard) + me passar email | você | 10min |
| Rodar 4.1 + 4.2 (case_id + insert tentativa) via MCP | eu | 5min |
| Gerar JWT via script Node local | você | 5min |
| Rodar 3 curls (smoke 1, 2, 3-com-tentativa) e colar output | você | 2min |
| Rodar 4.3, 4.4, 4.5 (verificadores) + 4.6 (cleanup) via MCP | eu | 5min |
| Confirmar verde geral → "merge ok" | você | 1min |

Cola aqui:
1. Output do Smoke 1 (esperado 401)
2. Output do Smoke 2 (esperado 400)
3. Output do Smoke 3 (esperado 200 com `promovidos:1` — porque eu inseri tentativa em 4.2)

Se Smoke 1+2+3 verdes E 4.3+4.4+4.5 verdes → você manda "merge ok" e eu executo:
```bash
git checkout main
git merge --ff-only claude/nice-goldberg-o6mzR
git push origin main
```

Se qualquer smoke vermelho → **paro pra investigar, não merge.**

---

## Limpeza pós-teste (opcional)

```bash
rm -rf /tmp/smoke-v2 /tmp/get-jwt.mjs
unset JWT SUPA_EMAIL SUPA_PASSWORD CASE_ID
```
