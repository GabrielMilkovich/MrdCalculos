# 04 — Correção Monetária (IPCA-E + SELIC) — ADC 58 + EC 113 + Lei 14.905/2024

## O que é

A correção monetária trabalhista atualiza valores da data de exigibilidade
até a data da liquidação, preservando o poder de compra. Após o julgamento
das **ADCs 58 e 59** pelo STF (Tema 1.191), o regime aplicável foi
unificado em DOIS períodos:

- **Pré-citação:** IPCA-E (mantido) + juros TR (adicional)
- **Pós-citação:** SELIC (engloba correção + juros, sem cumulação)

A **EC 113/2021** (vigência 09/12/2021) e a **Lei 14.905/2024** (vigência
30/08/2024) reformularam o regime para a Fazenda Pública e o CC art. 406,
respectivamente.

## Fórmula

### Pré-citação (até a data da citação)
```
valor_corrigido = valor_nominal × IPCA-E_acumulado(competência → citação)
juros_pre = valor_nominal × TR_mensal × meses  (componente trabalhista)
```
A flag `juros_pre_judicial` controla se há juros antes da citação. Em geral
TRD_SIMPLES = TR + 0,15%/m (Tabela Única JT empírica).

### Pós-citação (até a liquidação)
```
valor_atualizado = valor_corrigido × (1 + SELIC_acumulada%/100)
```
A SELIC já contém juros e correção (não cumular IPCA-E com SELIC).

### Combinações de índices (`combinar_indice`)
Permite múltiplos índices em sequência (ex: IPCA-E até X, IPCA até Y, SELIC).
Para cada `CombinacaoDeIndice` o engine aplica o respectivo índice no
intervalo `[de, próximo de)`.

### Combinações de juros (`combinar_juros`)
Análogo para juros (TRD, SELIC, TAXA_LEGAL, FAZENDA_PUBLICA, etc.).

### Lei 14.905/2024 (taxa legal pós 30/08/2024)
```
TAXA_LEGAL_mensal = SELIC_mensal - IPCA-E_mensal     (CC art. 406 nova redação)
```
Antes de 30/08/2024: cai no fallback 1%/m simples (legado CC art. 406 antiga).

### Fazenda Pública (EC 113/2021, vigência 09/12/2021)
```
Antes de 09/12/2021: 0,5%/m simples (caderneta poupança sem rendimento real)
A partir de 09/12/2021: SELIC pura (substitui correção + juros)
```

## Lei / súmula referência

- **STF, ADC 58 e 59 (julgadas em 18/12/2020, Tema 1.191)** — IPCA-E pré e
  SELIC pós-citação para a Justiça do Trabalho
- **EC 113/2021** — SELIC para a Fazenda Pública
- **Lei 14.905/2024** — nova redação CC art. 406 (taxa legal = SELIC - IPCA)
- **Lei 11.960/2009** — TR + 0,5% para Fazenda (declarada inconstitucional na
  ADI 4.357 e ADI 4.425; substituída pela EC 113)
- **Súmula 381 TST** — IPCA-E como índice da JT (anterior à ADC 58, mantida
  para regime pré-citação)
- **CLT art. 883** — juros de mora 1%/m simples (componente trabalhista)
- **Súmula Vinculante 17 STF** — não incidência de juros no precatório (período
  graça)
- **CC art. 406** — taxa legal de juros

## Flags UI que controlam (módulo `ModuloCorrecao` — 19 flags)

| Flag | Status | Efeito |
|---|---|---|
| `multa_523` | Conectada | Multa 10% CPC art. 523 (não pago em 15d) |
| `multa_523_percentual` | Conectada | Override do percentual (default 10%) |
| `ignorar_taxa_negativa` | Conectada | Substitui SELIC negativa por zero |
| `combinar_indice` | Conectada (Sprint 4.2-A2) | Aplica `combinacoes_indice[]` |
| `combinar_juros` | Conectada (Sprint 4.2-A2) | Aplica `combinacoes_juros[]` |
| `juros_pre_judicial` | Conectada (Sprint 4.2-A2) | TR/TRD antes da citação |
| `cs_lc11941` | Conectada | Lei 11.941/09 (SELIC INSS pós 03/2009) |
| `cs_dev_correcao_trab` | Em estudo | IPCA-E sobre INSS (raríssimo, pré-2009) |
| `cs_dev_juros_trab` | Em estudo | 1%/m Súm.TST 200 sobre INSS |
| `fgts_juros` | Conectada | Regime de juros do FGTS (`trabalhista`/`nenhum`) |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:372-399` —
  gates `combinar_indice` e `combinar_juros` (Sprint 4.2-A2)
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1414-1500` —
  juros pré-judicial + TAXA_LEGAL Lei 14.905/2024
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1656-1720` —
  Súm.TST 200 + IPCA-E acumulado
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/indices/` —
  carregamento de índices históricos (IPCA, IPCA-E, INPC, TR, SELIC)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/taxalegal/juros-taxa-legal.ts` —
  branch Lei 14.905/2024

## Casos especiais

1. **Transição ADC 58:** o STF estabeleceu data de eficácia em 18/12/2020 mas
   permitiu ao juiz fixar marco diferente. UI permite combinar índices manualmente.
2. **SELIC negativa:** se o acumulado SELIC ficar negativo em algum período,
   flag `ignorar_taxa_negativa` substitui por zero (impede atualização regressiva).
3. **Multa 523 CPC:** 10% sobre o total não pago em 15 dias após intimação para
   pagamento espontâneo (CPC art. 523 §1º). Aplicada uma única vez sobre
   `principal_corrigido + juros_mora`. Aceita flag em `correcaoConfig` (legacy)
   e em `multasConfig` (Phase 2).
4. **Combinações por segmento:** o engine respeita `combinacoes_indice` e
   `combinacoes_juros` mesmo quando `combinar_*=false` for explícito → flag age
   como gate; default `undefined ≈ true` para preservar paridade calibrate de 96%.
5. **Aplicação por verba (não por totais):** correção é segmentada por verba e
   por mês de competência → ADC 58/59 fica precisa. Engine **NÃO** aplica
   índice "geral" sobre o total bruto (procedimento legado vedado).
6. **Período graça (precatório):** durante a janela de pagamento (até 30/06 do
   exercício seguinte) **não** incidem juros (Súm.Vinc. 17 STF). UI/módulo de
   precatório trata separadamente.
