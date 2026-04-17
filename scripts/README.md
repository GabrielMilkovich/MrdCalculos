# Scripts

Scripts utilitários para manutenção do MrdCalculos.

## `seed-indices-oficiais.ts`

Carrega índices oficiais (IPCA-E, SELIC, TR, INPC) no Supabase a partir das APIs
do IBGE (SIDRA) e do BCB (SGS). Faz `upsert` na tabela
`pjecalc_correcao_monetaria` (colunas: `indice`, `competencia`, `valor`,
`acumulado`, `fonte`), respeitando RLS via service key.

### Requisitos

```bash
export SUPABASE_URL="https://<projeto>.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ...service_role..."
```

> Nunca comite a `service_role` key; use apenas localmente ou em CI com secrets.

### Execução

```bash
# Mostrar ajuda (sem efeito)
npx tsx scripts/seed-indices-oficiais.ts --help

# Carga completa (padrão: 2015-01 → mês corrente)
npx tsx scripts/seed-indices-oficiais.ts

# Somente IPCA-E e SELIC em janela específica
npx tsx scripts/seed-indices-oficiais.ts \
  --indice=IPCA-E,SELIC \
  --from=2023-01 --to=2024-12

# Dry-run: baixa e valida, mas não grava
npx tsx scripts/seed-indices-oficiais.ts --dry-run
```

### Índices cobertos

| Índice  | Fonte | Endpoint                                                                          |
|---------|-------|-----------------------------------------------------------------------------------|
| IPCA-E  | IBGE  | `https://apisidra.ibge.gov.br/values/t/1736/n1/all/v/44/p/all`                    |
| SELIC   | BCB   | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json` (diária)    |
| TR      | BCB   | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados?formato=json`            |
| INPC    | IBGE  | `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/44/p/all`                    |

A SELIC é baixada diariamente e consolidada para o valor do fim do mês
(compatível com o uso do PJe-Calc — RFB/SICALC). Para cálculos de exatidão
tributária, prefira validar contra a série mensal publicada pela RFB.

### Frequência sugerida

- **Mensal** — rode nos primeiros dias de cada mês, após publicação do IPCA-E
  (entre o 8º e o 12º dia útil) e da SELIC do mês anterior.
- Idealmente agendado via CI (ex.: GitHub Actions cron) com os secrets
  `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`.
- Após a carga, o módulo `src/lib/pjecalc/indices-loader.ts` passa a servir os
  valores diretamente do Supabase; o fallback hardcoded em `indices-fallback.ts`
  continua disponível como rede de segurança.

## Outros scripts

- `update-indices.ts` — atualiza o arquivo `indices-fallback.ts` a partir do
  BCB/SGS (`npm run update-indices`).
- `calibration-pipeline.ts` — pipeline de calibração contra corpus PJC.
- `gen-*.mjs` / `debug-*.mjs` — utilitários pontuais de geração/depuração.
