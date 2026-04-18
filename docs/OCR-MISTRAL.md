# Pipeline OCR com Mistral (chunking inteligente)

Este documento descreve o pipeline de OCR do MRD Calc baseado em **Mistral OCR**
com divisão (split) automática de PDFs grandes — endereçado principalmente a
cartões de ponto, mas aplicável a qualquer documento trabalhista.

## Visão geral

```
Frontend (DocumentsManager)
   │
   ▼  supabase.functions.invoke("process-document-mistral", { document_id })
[ process-document-mistral ]          (orquestrador; 1 chamada, 2 etapas)
   │
   ├─▶ [ ocr-document ]                (Mistral OCR com chunking de PDF)
   │     │
   │     ├─ inspectPdf()                detecta nº páginas, encryption, MIME
   │     ├─ decidePagesPerChunk()       8 pg se ≤ 30 pg, 10 pg se > 30 pg
   │     ├─ splitPdfIntoChunks()        pdf-lib em memória, sem Storage
   │     ├─ runInParallel(4x)           4 chunks simultâneos (respeita rate limit)
   │     │     └─ ocrBytes() = upload → /v1/ocr → delete (limpeza best-effort)
   │     └─ merge                       markdown com `--- PÁGINA N ---` preservado
   │
   └─▶ [ chunk-and-embed ]              (OpenAI text-embedding-3-small)
         │
         ├─ splitTextIntoChunks         800 chars / overlap 150
         └─ upsert → document_chunks    (vetores pgvector)
```

## Arquivos-chave

| Arquivo | Responsabilidade |
|---|---|
| `supabase/functions/_shared/pdf-utils.ts` | Split/inspect PDF via pdf-lib |
| `supabase/functions/_shared/mistral-ocr.ts` | Cliente Mistral OCR (upload, ocr, delete, paralelismo, retries) |
| `supabase/functions/_shared/cors.ts` | CORS helpers |
| `supabase/functions/ocr-document/index.ts` | OCR completo (Mistral + split/merge) |
| `supabase/functions/process-document-mistral/index.ts` | Orquestra OCR + chunking + embeddings |
| `supabase/functions/chunk-and-embed/index.ts` | Chunking + embeddings (pipeline existente) |
| `src/components/cases/DocumentsManager.tsx` | UI — chama `process-document-mistral` |
| `supabase/migrations/20260418010001_ocr_chunk_progress_columns.sql` | Colunas de progresso |

## Configuração — variável de ambiente

Adicione `MISTRAL_API_KEY` nos Secrets das Edge Functions:

```bash
# Via CLI
supabase secrets set MISTRAL_API_KEY=your_key_here

# Ou via Dashboard
# Supabase Dashboard > Project Settings > Edge Functions > Secrets
# Key:   MISTRAL_API_KEY
# Value: sua chave do https://console.mistral.ai/api-keys
```

## Detecção automática de split

| Tamanho do PDF | Estratégia |
|---|---|
| ≤ 8 páginas e ≤ 12 MB | 1 chamada única ao Mistral OCR (sem split) |
| 9-30 páginas ou > 12 MB | Split em chunks de **8 páginas** |
| 31-500 páginas | Split em chunks de **10 páginas** |
| > 500 páginas | Rejeitado (limite de custo). Erro claro retornado. |
| > 100 MB | Rejeitado. Usuário deve pré-processar (compress/split). |

Imagens (PNG/JPG/WEBP/TIFF) vão direto para OCR como `image_url` data-URL —
sem split.

## Tratamento de erros antecipado

| Cenário | Tratamento |
|---|---|
| Rate limit 429 | Backoff exponencial + jitter (4 tentativas) em `mistral-ocr.ts` |
| Timeout | AbortController por request; OCR 180s, upload 120s |
| Erro 5xx | Retry com backoff exponencial |
| Erro 4xx não-retriable | Erro imediato com status propagado |
| PDF criptografado | `ignoreEncryption: true` tenta abrir; falha só se DRM forte |
| PDF corrupto | Erro com mensagem clara; documento marcado `failed` |
| Chunk falha (1 de N) | Outros chunks continuam; placeholder `[OCR FALHOU pg X-Y]`; status=`ocr_partial` |
| Rede transitória | Retry download do arquivo (3 tentativas) |
| Resposta vazia | Validado; placeholder `[vazia]` preservando numeração |
| Sem `MISTRAL_API_KEY` | Erro 500 com mensagem indicando como configurar |
| Documento não existe / sem permissão | 404 / 403 respectivamente |
| Execução dupla (cliques) | Status `ocr_running` bloqueia reprocessamento idempotente |
| Arquivo > 100 MB | Rejeitado (custo + memória Edge Function) |
| Arquivo > 500 páginas | Rejeitado (custo) |

## Rastreamento de progresso

Durante o OCR, a tabela `documents` é atualizada em tempo real:

```sql
SELECT id, status, ocr_chunks_done, ocr_chunks_total, ocr_chunks_failed
FROM documents
WHERE id = '<doc_id>';
```

Status possíveis:

- `ocr_running` — em processamento
- `ocr_done` — concluído sem falhas
- `ocr_partial` — alguns chunks falharam (ver `error_message`)
- `failed` — falha total

UI pode renderizar barra:
```tsx
const pct = total > 0 ? ((done + failed) / total) * 100 : 0;
```

## Modelo Mistral

Default: `mistral-ocr-latest`. Para fixar uma versão específica, edite
`mistral-ocr.ts::runOcr` ou passe via options.

## Custos estimados

- Mistral OCR: pricing por página. Consulte
  [console.mistral.ai/pricing](https://console.mistral.ai/pricing).
- Cap absoluto: 500 páginas/documento (hardcode em `ocr-document/index.ts`).

## Fallback — pipeline legado

O `process-document` (OpenAI Vision) continua no repositório como fallback para
diagnóstico, mas **não é chamado pela UI nova**. Para usar o legado, chame
diretamente:

```ts
supabase.functions.invoke("process-document", { body: { document_id } });
```

## Testando localmente

```bash
# Suba as Edge Functions
supabase functions serve ocr-document process-document-mistral

# Exporte a chave Mistral
export MISTRAL_API_KEY=your_key

# Teste com curl (precisa de um document_id válido + JWT do usuário)
curl -X POST http://localhost:54321/functions/v1/process-document-mistral \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<uuid>"}'
```

## Troubleshooting

**"MISTRAL_API_KEY não configurado"** → configure o Secret (ver seção Configuração).

**Documento travado em `ocr_running`** → a função pode ter sido killed mid-process.
Execute o reprocessamento; idempotente. Considere adicionar um cron de limpeza:

```sql
-- Reseta documentos travados há > 10 min
UPDATE documents
SET status = 'failed', error_message = 'timeout'
WHERE status = 'ocr_running'
  AND processing_started_at < now() - interval '10 minutes';
```

**Texto incompleto para cartão de ponto grande** → cheque `ocr_chunks_failed`.
Se > 0, reprocesse — chunks bem-sucedidos serão recalculados, mas o custo é
baixo (Mistral cobra por página).
