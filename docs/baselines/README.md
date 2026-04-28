# Baselines — Port PJe-Calc

Snapshots congelados para validação de não-regressão.

## Arquivos

### `audit-port-baseline.json`

Snapshot da auditoria Java↔TS gerada por `scripts/audit-java-vs-ts.ts`. Usado por:

```bash
npm run audit:port:check
```

em CI. Falha se cobertura total ou de qualquer categoria regredir.

**Regenerar** (apenas quando cobertura **melhorar**, não antes):

```bash
npm run audit:port:baseline
git add docs/baselines/audit-port-baseline.json
git commit -m "chore(port): atualiza baseline de auditoria após port de X"
```

### `calibrate-fase0.json`

Snapshot do `npm run calibrate` ao final da Fase 0. Documento histórico
do ponto de partida antes das Fases 1-9 do port.

Formato: mesmo que `scripts/calibration-pipeline.ts` escreve (`calibration-YYYY-MM-DD.json`).

Resumo Fase 0:

| Métrica | Valor |
|---|---:|
| Casos totais | 14 |
| Casos válidos | 13 |
| Aprovados ±5% | 0/13 (0%) |
| Aprovados ±10% | 0/13 (0%) |
| Delta médio líquido | **-30,68%** |

Casos individuais (delta do líquido):

| Caso | Delta líquido | Regime |
|---|---:|---|
| antonio-harley | -30,77% | PRE_ADC58 |
| carla-pego | ver JSON | — |
| caso-real-v2 | ver JSON | — |
| francisco-pablo | ver JSON | — |
| islan-rodrigues | ver JSON | — |
| izabela-cristina | ver JSON | — |
| joseli-silva | ver JSON | — |
| leandro-casademunt | ver JSON | — |
| leide-santana | -28,64% | TRANSICAO |
| pyter-gabriel | SKIP (líquido=0) | — |
| roque-guerreiro | -36,89% | PRE_ADC58 |
| rosicleia-pereira-chaves | -19,06% | TRANSICAO |
| tiago-jose | -20,46% | TRANSICAO |
| vanderlei-carvalho | -37,70% | PRE_ADC58 |

Gate final da Fase 9: delta médio ≤ ±0,01%, zero crashes, todos em aprovado_5pct.
