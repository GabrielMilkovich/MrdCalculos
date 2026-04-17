# Baseline Fase 0 — Início da Migração 1:1 para Paridade PJe-Calc

**Data:** 2026-04-17
**Branch:** `claude/analyze-pje-calc-migration-ORJxJ`
**Motor avaliado:** `PjeCalcEngineV3` (modo independent, adapter sobre Core portado)
**Corpus:** 18 arquivos `.pjc` reais em `Arquivos PJC/`

## Resultado `parity-v3-vs-pjc.test.ts`

| # | Cálculo | PJe-Calc (R$) | MRD V3 (R$) | Delta % | Status |
|---|---|---:|---:|---:|---|
| 1 | 4463 | 9.974,39 | 8.645,90 | -13,32% | REPROV |
| 2 | 4259 | 97.403,88 | 54.691,49 | -43,85% | REPROV |
| 3 | 4483 | 88.486,94 | 45.224,82 | -48,89% | REPROV |
| 4 | 4465 | 190.652,72 | 97.598,06 | -48,81% | REPROV |
| 5 | 4495 | 61.849,71 | 41.083,99 | -33,57% | REPROV |
| 6 | 4418 | 160.735,54 | 75.501,70 | -53,03% | REPROV |
| 7 | 4461 | 45.028,19 | 37.192,59 | -17,40% | REPROV |
| 8 | 4770 | 184.806,38 | 89.935,90 | -51,34% | REPROV |
| 9 | 4866 | 510.050,92 | 238.888,12 | -53,16% | REPROV |
| 10 | 4494 | 166.619,02 | 72.820,75 | -56,30% | REPROV |
| 11 | 4326 | 168.062,81 | 84.083,89 | -49,97% | REPROV |
| 12 | 4435 | 124.770,28 | 57.103,59 | -54,23% | REPROV |
| 13 | 4131 | 78.021,72 | 38.709,08 | -50,39% | REPROV |
| 14 | 4462 | 317.482,10 | 223.481,21 | -29,61% | REPROV |
| 15 | 4546 | 42.081,15 | 22.289,00 | -47,03% | REPROV |
| 16 | 4464 | N/A | (erro) | -- | ERRO |
| 17 | 4493 | 320.938,56 | 149.805,91 | -53,32% | REPROV |
| 18 | 4325 | 58.820,58 | 37.260,36 | -36,65% | REPROV |

## Métricas agregadas

- **Aprovados ≤1%:** 0/17
- **Aprovados ≤5%:** 0/17
- **Aprovados ≤10%:** 0/17
- **Delta médio absoluto:** 43,58%
- **Delta global:** -47,66%
- **PJe-Calc total:** R$ 2.625.784,89
- **MRD V3 total:** R$ 1.374.316,36

## Suite completa

- **Test files:** 17 passed
- **Tests:** 362 passed, 1 skipped (todos passando tolerantes a grandes deltas)
- **Duração:** 53,63s

## Diagnóstico inicial

Delta médio ~-48% indica que blocos inteiros de valor estão faltando. Candidatos:
1. Correção monetária acumulada insuficiente (IPCA-E histórico + SELIC pós-citação)
2. Juros de mora não acumulados dia-a-dia
3. Alguma verba/reflexo estrutural ausente (13º proporcional, férias+1/3, aviso)
4. FGTS+40% não sendo computado integralmente em todos os casos

A Fase 1 começa pela raiz: `MaquinaDeCalculo.java` (617 LOC) que define a fórmula
oficial `Devido = TRUNC₂(TRUNC₂(TRUNC₂(Base/Div)×Mult)×Qtd)×Dobra`, seguida de
`VerbaDeCalculo.java` (1.598 LOC) e `TabelaDeJuros.java` (637 LOC).

## Meta final

- **Fase 3 gate:** ≥8/17 ≤10%, delta médio absoluto ≤25%
- **Fase 6 gate:** ≥15/17 ≤5%, todos ≤10%, delta médio absoluto ≤3%
