# Auditoria — URLs assinadas do Supabase Storage

**Data:** 2026-05-20
**Escopo:** Prompt 5 da auditoria de segurança
**Status:** Diagnóstico (sem alterações de código — correções em Prompt 6)

---

## TL;DR

| Item | Atual | Recomendado | Risco |
|---|---|---|---|
| TTL mínimo no frontend | 3600s (1h) | 900s (15min) | URL vazada continua válida por horas |
| TTL máximo no frontend | 7200s (2h) | 900s (15min) | Mesma coisa, 8× pior |
| Geração no mount | 5 de 6 callsites | Sob demanda (onClick) | URL gerada e nunca usada vaza por logs/devtools |
| getPublicUrl (sem expiração) | 1 callsite | createSignedUrl sempre | URL eterna, depende de RLS do bucket |
| URL persistida no DB | 1 callsite (TTL 1h) | Não persistir, regerar | URL expira mas fica no DB causando erro silencioso |

---

## 6 callsites no frontend com `createSignedUrl`

### 1. `src/components/cases/DocumentOcrValidation.tsx:99`
- **TTL:** 7200s (2h)
- **Padrão:** `getFreshSignedUrl(storagePath)` chamado em `useEffect` quando `selected.storage_path` muda
- **Quando gera:** no mount do componente / mudança de documento selecionado
- **Problema:** se o usuário abre a tela mas nunca clica no PDF, URL fica vazada na memória/devtools por 2h

### 2. `src/components/cases/shared/DocumentPreview.tsx:28`
- **TTL:** 7200s (2h)
- **Padrão:** mesmo de `DocumentOcrValidation` — `useEffect` com `storagePath`
- **Quando gera:** no mount
- **Problema:** mesmo

### 3. `src/components/cases/FactValidationView.tsx:664`
- **TTL:** 3600s (1h)
- **Padrão:** função `getFreshSignedUrlFromStorage` chamada por `getBestSignedUrl` — invocada em handler de click
- **Quando gera:** sob demanda (handler de UI)
- **Problema:** TTL ainda 4× acima do recomendado

### 4. `src/components/cases/DocumentValidation.tsx:71`
- **TTL:** 7200s (2h)
- **Padrão:** `getFreshSignedUrl` em `useEffect` quando `data.storage_path` aparece
- **Quando gera:** no mount
- **Problema:** mesmo padrão de #1 e #2

### 5. `src/components/cases/DocumentsManager.tsx:288`
- **TTL:** 3600s (1h)
- **Padrão:** dentro do handler de upload, após `.upload()` bem-sucedido — URL gerada para salvar em `documents.arquivo_url` no DB
- **Quando gera:** uma vez por upload, no servidor (frontend → Supabase Storage)
- **PROBLEMA GRAVE:** URL com TTL 1h é PERSISTIDA no DB. Depois de 1h, registro fica com URL quebrada. Componentes que leem `arquivo_url` direto (sem regerar) vão receber 403.

### 6. `src/components/cases/data-extraction/CartaoPontoReviewDialog.tsx:136`
- **TTL:** 7200s (2h)
- **Padrão:** IIFE async em `useEffect` quando dialog abre
- **Quando gera:** no mount do dialog
- **Problema:** mesmo de #1, #2, #4

---

## 1 callsite com `getPublicUrl` (sem expiração)

### `src/components/cases/DocumentProcessor.tsx:140`
- **Bucket:** `case-documents`
- **Sem TTL** — URL eterna
- **Risco:** se bucket é público no Supabase, qualquer pessoa com a URL acessa sem auth. RLS de Storage Buckets é por-bucket no Supabase, não por-arquivo. **Necessita verificação no Supabase Dashboard de qual modo o bucket `case-documents` está configurado.**

---

## 9 callsites em Edge Functions (backend Deno)

| Arquivo | TTL | Tipo |
|---|---|---|
| `ocr-document/index.ts:303` | 7200 | OCR longo |
| `upload-document/index.ts:105` | 3600 | Upload |
| `process-document/index.ts:236` | 3600 | Process |
| `extract-and-fill/index.ts:2208` | 7200 | Extração longa (comentário no código justifica) |
| `get-signed-document-url/index.ts:144` | configurável | Endpoint dedicado (boa fundação!) |
| `process-document-start/index.ts:224` | 3600 | Start |
| `process-document-mistral/index.ts:250` | 3600 | OCR Mistral |
| `reprocess-v6/index.ts:162` | 3600 | Reprocess |
| `process-document-async/index.ts:374` | 3600 | Async |

Backend é menos crítico porque a URL não fica no devtools do cliente — vai num response JSON. Mas TTLs continuam altos. **Existe `get-signed-document-url`** que parece ter sido feito para ser o ponto centralizado, mas os outros callers do frontend não usam.

---

## Storage path — uso de UUID do usuário

- `DocumentsManager.tsx:271`: `${user.id}/${caseId}/${timestamp}_${file}` ← **UUID do user no path**
- `CTPSUploader.tsx:56`: `${caseId}/ctps_${Date.now()}.pdf` ← só `caseId`
- `ImportadorFichaFinanceira.tsx:91`: `temp/ficha_${caseId}_${Date.now()}.pdf` ← só `caseId`, prefixo `temp/`

**Inconsistência:** dois padrões coexistem. RLS de Storage do Supabase tipicamente usa o primeiro segmento do path como discriminador de owner. Sem UUID no prefixo, RLS por `auth.uid()` no Storage não pode discriminar.

---

## Recomendações para Prompt 6 (correção)

1. **Reduzir TODOS os TTLs para 900s (15min)** — frontend e backend, exceto `extract-and-fill` que tem justificativa de processamento longo (avaliar caso a caso).
2. **Mover geração de URL no frontend de useEffect para handler de clique** — 5 callsites (#1, #2, #4, #6 e variantes do DocumentsManager).
3. **Parar de persistir URL em `documents.arquivo_url`** ou marcar como tratada como cache de TTL curto. Componentes consumidores devem sempre tentar regerar antes de usar.
4. **`getPublicUrl` em `DocumentProcessor.tsx:140`** — substituir por `createSignedUrl` se bucket não é público, ou confirmar deliberadamente que é público + público é OK pro contexto.
5. **Padronizar storage path com UUID do user no prefixo** em CTPS e Ficha — habilita RLS Storage por owner.

A recomendação #5 não está no escopo dos prompts e pode ser feita em PR separada.
