# Jasper Renderer Service — Setup & Operations

Microserviço Java que renderiza PDFs usando os 122 templates JasperReports
oficiais do PJe-Calc 2.15.1 via engine JasperReports 6.21.3.

## Arquitetura

```
MRD Calc Frontend → Edge Function render-pdf → Jasper Renderer (Cloud Run)
                                                    ↓
                                              JasperReports 6.21.3
                                                    ↓
                                                 PDF bytes
```

## Localização do código

| Artefato | Caminho |
|----------|---------|
| Microserviço Java | `jasper-renderer/` (será extraído p/ repo próprio) |
| Edge Function | `supabase/functions/render-pdf/index.ts` |
| Cliente TS | `src/lib/pjecalc/pdf/jasper-client.ts` |
| Mapeadores | `src/lib/pjecalc/pdf/jasper-mapper.ts` |
| Templates .jrxml | `jasper-renderer/src/main/resources/templates/` (122 arquivos) |

## Feature flag

```env
VITE_USE_JASPER_RENDERER=true   # ativa o caminho Jasper
```

Quando `false` (default), o sistema usa a renderização HTML/CSS existente.

## Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Status + contagem de templates |
| `/render` | POST | Renderiza template → PDF |

### POST /render

```json
{
  "template": "calculo/calculo-demonstrativo",
  "params": { "chave": "valor" },
  "data": "[{...}]"
}
```

Retorna `application/pdf` em caso de sucesso.

Headers obrigatórios:
- `X-API-Key: <JASPER_API_KEY>`
- `Content-Type: application/json`

## Templates prioritários (Sprint 9)

| Template | Status |
|----------|--------|
| `calculo/calculo-demonstrativo` | Funcional |
| `calculo/resumo/calculo-resumo` | Funcional |
| `calculo/calculo-fgts` | Funcional |
| `calculo/consolidado/consolidado` | Funcional |
| `calculo/calculo-seguro-desemprego` | Funcional |

121 de 122 templates compilam. O único que falha é `calculo/calculo.jrxml`
(XML malformado no source oficial — investigue se necessário).

## Deploy — Cloud Run

### Pré-requisitos
- Google Cloud project com billing
- `gcloud` CLI configurado
- Docker

### Build & push

```bash
cd jasper-renderer
docker build -t gcr.io/<PROJECT_ID>/jasper-renderer:v1.0.0 .
docker push gcr.io/<PROJECT_ID>/jasper-renderer:v1.0.0
```

### Deploy

```bash
gcloud run deploy jasper-renderer \
  --image gcr.io/<PROJECT_ID>/jasper-renderer:v1.0.0 \
  --region us-central1 \
  --platform managed \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 10 \
  --max-instances 3 \
  --min-instances 0 \
  --timeout 60s \
  --port 8080 \
  --set-env-vars "API_KEY=$JASPER_API_KEY"
```

### Domínio customizado (opcional)

```bash
gcloud beta run domain-mappings create \
  --service jasper-renderer \
  --domain jasper.mrdcalc.com.br
```

DNS: CNAME `jasper` → `ghs.googlehosted.com`

## Secrets no Supabase

```bash
supabase secrets set JASPER_URL="https://jasper.mrdcalc.com.br"
supabase secrets set JASPER_API_KEY="<api-key-gerada>"
```

## Variáveis de ambiente do serviço Java

| Variável | Descrição | Default |
|----------|-----------|---------|
| `PORT` | Porta HTTP | `8080` |
| `API_KEY` | Chave de autenticação | (obrigatório) |
| `RATE_LIMIT_PER_MIN` | Rate limit por chave | `60` |
| `CORS_EXTRA_ORIGIN` | Origem CORS extra (dev) | (vazio) |
| `LOG_LEVEL` | Nível de log | `INFO` |

## Desenvolvimento local

```bash
cd jasper-renderer

# Compilar
mvn compile

# Testes
mvn test

# Rodar servidor
API_KEY=dev123 java -jar target/jasper-renderer-1.0.0.jar

# Testar
curl -X POST http://localhost:8080/render \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev123" \
  -d '{"template":"calculo/calculo-seguro-desemprego","params":{},"data":"{}"}'
```

## Custo estimado (Cloud Run pay-per-use)

- ~$0-5/mês com volume típico de escritório pequeno
- Escala a zero quando idle
- $5-10/mês extra se `min-instances=1` (elimina cold start)

## Próximos passos (Sprint 10)

- Extrair `jasper-renderer/` para repo próprio `mrdcalc-jasper-renderer`
- Completar mapeadores para os 117 templates restantes
- Substituir endpoints PDF legados via feature flag progressivo
- Comparação visual PDF-a-PDF com output do PJe-Calc desktop
- CI/CD com deploy automático no Cloud Run
