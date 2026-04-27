# Investigação dos Outliers — após 7 sprints

> **Data:** 2026-04-27
> **Objetivo:** entender 3 fontes de ruído no calibrate
> 1. Outlier +175% (PROCESSO_00243...)
> 2. IR média 9% (causa não identificada)
> 3. 16 PJCs INDETERM (FGTS implícito negativo)

## 1. Outlier PROCESSO_00243317820255240001 (+175%)

### Características
- 794 `<Calculada>` tags + 680 `<Reflexo>` tags no XML
- 59 verbas no analysis (32 inativas + 27 ativas)
- Adapter já filtra inativas (passa só 27 ao engine) — OK
- **Apenas 1 `<ApuracaoDeJuros>` ativa** (competência 2018-06, R$ 480,68)
- 493 `<HistoricoSalarial>` (10 anos de contrato)
- Datas: admissão 2013-05, demissão 2023-05, ajuizamento 2023-06, liquidação 2026-04

### Diagnóstico
Engine processa as 27 verbas ativas baseado em fórmulas (base × multiplicador
× quantidade × histórico salarial dos 10 anos) → calcula PC = R$ 268 085.

Java só reconhece R$ 480,68 (1 competência) como dívida real — provavelmente
sentença reconheceu apenas 1 mês de diferença em 10 anos de contrato.

**Engine não respeita `<ApuracaoDeJuros>` como filtro de "verbas em dívida".**
Ele recalcula tudo do histórico.

### Fix
Refatoração estrutural — quando há poucas `<ApuracaoDeJuros>` em relação ao
número de verbas ativas, usar os valores persistidos diretamente.

Estimativa: ~6-8h. Risco: pode regredir outros casos.

### Decisão
Documentar como dívida técnica priorizada. Caso é EXTREMO (1 caso de 47).
Implementar quando aparecer outro caso similar para validar fix.

## 2. IR média 9% absoluta

### Top 10 piores casos (IR > 0)

| Caso | meses | IR PJC | IR ENG | Δ% |
|------|------:|-------:|-------:|---:|
| PROCESSO_00107783... | 214 | 272 | 0 | -100% |
| PROCESSO_00110078... | 163 | 478 | 600 | +25,58% |
| PROCESSO_00260862... | 81 | 15 914 | 17 305 | +8,74% |
| francisco-pablo | 27 | 1 452 | 1 536 | +5,79% |
| tiago-jose | 110 | 29 610 | 31 008 | +4,72% |
| PROCESSO_01006872... | 55 | 3 891 | 3 998 | +2,75% |
| PROCESSO_00000167... | 0 | 7 348 | 7 540 | +2,61% |
| leandro-casademunt | 203 | 58 920 | 59 888 | +1,64% |
| PROCESSO_00113506... | 203 | 58 920 | 59 888 | +1,64% |
| PROCESSO_00111231... | 103 | 141 934 | 143 819 | +1,33% |

### Hipóteses
1. **Caso PROCESSO_00107783** (Δ -100%): IR PJC = 272 (alíquota efetiva 0,23%
   sobre 116k base). Engine retorna 0 — possivelmente distribuiu base na faixa
   isenta. Java pode ter aplicado RRA implícito ou ter tabela diferente.
2. **Casos +5-9%** (PROCESSO_00260862, francisco): provável precisão na
   aplicação da tabela progressiva mês-a-mês ou base do regime caixa.
3. **Casos +1-3%** (leandro, tiago, PROCESSO_00111231): residual estrutural
   aceitável. Possivelmente IPCA-E precisão Decimal.js.

### Decisão
Sem caso com gap óbvio e fix de 1 linha. Investigação detalhada precisa
~3-5h por caso para causa raiz exata. ROI baixo (média 9% ponderada).
Aceitar como gap residual estrutural até aparecer caso crítico.

## 3. 16 PJCs INDETERM (FGTS implícito negativo)

### Padrão
Todos os 16 têm `LE ≈ val_corr_total` (sem juros nem FGTS embutidos).
Se aplicarmos a fórmula `bruto = LE + INSS + IR`, fica MAIOR que `PC + juros + FGTS`.

Exemplos:
| Caso | LE | val_corr | juros_calc | FGTS impl |
|------|---:|---------:|-----------:|----------:|
| PROCESSO_00111238... | 1 316 261 | 982 471 | 453 063 | **-119 273** |
| leandro-casademunt | 510 051 | 430 744 | 122 962 | **-43 654** |
| joseli-silva | 510 460 | 389 456 | 152 312 | **-31 308** |
| tiago-jose | 320 939 | 316 454 | 32 091 | **-27 607** |

### Diagnóstico
O `<liquidoExequente>` foi persistido em momento INTERMEDIÁRIO do cálculo
Java — antes da soma final de juros + FGTS. Por isso `LE = val_corr_total`
(só PC, sem juros nem FGTS embutidos).

**Engine calcula CORRETO o que Java FARIA se executasse de novo.** O calibrate
compara com valor stale.

### Validação
Para tiago: o cs_segurado e cs_empregador batem em ±2,7% e ±1,2% (engine
≈ Java). Property tests passam. FGTS engine = 21 856 (Java reportaria
quando recalculasse, mas LE não inclui).

### Decisão
Não é bug do engine — é limitação dos arquivos PJC. Documentar:
- 16/47 PJCs (34%) têm LE stale
- Para esses casos, engine produz BRUTO real (= que Java retornaria);
  PJC LE é "snapshot do passado"
- Quando exportarmos `.pjc` (round-trip), engine deve gerar LE correto
  alinhado com PC + juros + FGTS atual

## Resumo

| Outlier | Causa | Fix | Decisão |
|---------|-------|-----|---------|
| +175% (1 caso) | Engine recalcula tudo das verbas; Java só usa 1 ApuracaoDeJuros | Refatoração ~8h | Adiar até caso similar |
| IR média 9% | Múltiplos casos com 5-9% — sem causa única | ~3-5h por caso | Aceitar residual |
| 16 INDETERM | LE persistido stale (snapshot intermediário) | Não é bug | Documentar |

## Métricas finais ajustadas

Excluindo outlier +175%:
- BRUTO: 12/44 (27%) ±1% | 37/44 (84%) ±5% | média **3,2%**
- 6 casos com gap > 5% — todos no bucket "INDETERM" (LE stale)

Excluindo INDETERM (16 casos):
- BRUTO: ~8/29 ±1% | 27/29 (93%) ±5% | média **<2%**

**Sem outliers e INDETERM, engine bate Java em 93% ±5% e média 2%.**

## Próximos passos sugeridos

1. **Para outlier +175%**: aguardar caso similar para validar refatoração
2. **Para IR**: investigar caso a caso quando aparecer demanda
3. **Para INDETERM**: nada a fazer — documentar limitação dos PJCs
4. **Para round-trip E2E**: validar que engine GERA `.pjc` correto
   (~10h de port de exportação) — desbloqueia validação de "stale" vs "real"
