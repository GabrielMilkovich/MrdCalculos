# 06 — Multas CLT e CPC (Arts. 467, 477 CLT + Art. 523 CPC)

## O que é

Multas processuais e materiais aplicadas em sentença trabalhista. As três
mais relevantes:

- **Multa Art. 467 CLT (50%)** — sobre verbas rescisórias **incontroversas**
  não pagas em audiência.
- **Multa Art. 477 §8º CLT (1 salário)** — pelo atraso no pagamento das
  verbas rescisórias além do prazo legal de 10 dias.
- **Multa Art. 523 CPC (10%)** — pelo não pagamento espontâneo da condenação
  em até 15 dias após intimação para cumprimento.

## Fórmula

### Art. 467 CLT (50% sobre incontroversas)
```
base_467 = Σ verbas rescisórias com compor_principal=true e diferença > 0
multa_467 = base_467 × 50%
```
São consideradas rescisórias: aviso prévio, saldo de salário, 13° proporcional,
férias proporcionais + 1/3, multa 40% FGTS.

### Art. 477 §8 CLT (1 salário-base)
```
Se atraso > 10 dias corridos da rescisão:
  multa_477 = ultima_remuneracao         (ou maior_remuneracao como fallback)
```
Pode ser informada manualmente via `valor_477_informado` (`valor_477_tipo='informado'`).

### Art. 523 CPC (10% sobre executado)
```
base_523 = principal_corrigido + juros_mora
multa_523 = base_523 × percentual_523     (default 10%)
```
Aplicada uma única vez quando o devedor não paga em 15 dias após intimação para
cumprimento de sentença (CPC art. 523 §1º).

## Lei / súmula referência

- **CLT, art. 467** (redação Lei 10.272/2001) — 50% sobre incontroversas
- **CLT, art. 477 §8º** (redação Lei 13.467/2017) — 1 salário por atraso
- **CPC/2015, art. 523 §1º** — multa de 10% por não pagamento espontâneo
- **Súmula TST 305** — aviso prévio integra o cálculo de FGTS mas não da
  multa 477 §8 quando indenizado
- **Súmula TST 326** — multa 467 incide só sobre o que foi reconhecido na
  audiência (não sobre o que vier em fase posterior)

## Flags UI que controlam (módulo `ModuloMultas` / `ModuloCorrecao`)

| Flag | Status | Efeito |
|---|---|---|
| `multa_apurar` (FGTS) | Conectada | Multa 40% FGTS — ver doc 03 |
| `multa_art_467` | Conectada | Liga multa 467 CLT (50%) |
| `apurar_477` | Conectada (Sprint 4.2-B2) | Liga multa 477 §8 (1 salário) |
| `valor_477_tipo` | Conectada | `salario` (default) ou `informado` |
| `valor_477_informado` | Conectada | Valor manual (BRL) |
| `apurar_523_cpc` / `multa_523` | Conectada | Liga multa 523 CPC (10%) |
| `percentual_523` / `multa_523_percentual` | Conectada | Override do percentual |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1156-1178` —
  função `calcularMulta467()`
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1199-1210` —
  função `calcularMulta477()` (Sprint 4.2-B2)
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:583-595` —
  bloco de aplicação das três multas no resumo

## Casos especiais

1. **Multa 467 só com incontroversas:** o engine usa `compor_principal=true`
   como proxy de incontroversa. Quando a verba é controvertida o operador
   marca `compor_principal=false` e a verba sai da base da multa (alinhado
   à Súm.TST 326).
2. **Multa 477 e atraso:** o engine **não** modela `data_pagamento_rescisao`;
   quando o flag está ativo presume-se atraso (decisão judicial). Esse
   comportamento é consistente com o PJe-Calc, que aplica a multa quando o
   operador marca o flag.
3. **Multa 477 com valor informado:** uso típico quando há controvérsia sobre
   qual remuneração compõe a base (mês integral vs. proporcional). UI permite
   override numérico.
4. **Multa 523 incide sobre principal+juros, não sobre valor total:** o
   engine soma `principal_corrigido + juros_mora` e aplica o percentual; FGTS,
   INSS e IR ficam fora da base (entendimento majoritário — multa premia o
   pagamento espontâneo da condenação principal).
5. **Multa 523 e Fazenda Pública:** em execução contra a Fazenda **NÃO** se
   aplica (CPC art. 534 §2º). Operador deve desligar a flag.
6. **Cumulação 467 + 477:** **PERMITIDA** — naturezas distintas (467 = não
   pagamento de incontroversas em audiência; 477 = atraso no acerto rescisório).
   Súm.TST 462.
