# Insight Definitivo — Bruto/liquidoExequente

> **Data:** 2026-04-26 (continuação da investigação)
> **Status:** RESOLVIDO conceitualmente — ajuste no calibrate aplicado

## A pergunta original

Por que o "gap de bruto/líquido" persistia em ~5% mesmo com INSS e IR
em 1-2%? A resposta era em algo bobo, mas mascarado por uma definição
incorreta de calibrate.

## A resposta

O calibrate v3 comparava `r.liquido_reclamante` (engine, **PÓS-deduções**:
Principal+Juros+FGTS - INSS - IR - hono) contra `pjc_liq` (Java
`liquidoExequente`, **PRÉ-deduções**: Principal+Juros+FGTS).

Era apples-to-oranges. O delta sistemático ~5% não era erro de cálculo
— era a soma das deduções (INSS+IR+hono) que estavam sendo "esquecidas"
de um lado.

A correção semântica:

| Antes (errado) | Depois (correto) |
|---|---|
| `pjc_bruto = pjc_liq + pjc_inss + pjc_ir` | `pjc_bruto = pjc_liq` |
| `eng_bruto = liq_reclamante + cs + ir` | `eng_bruto = total_reclamada` |
| Compara LIQ_PÓS vs PJC_PRÉ | Compara TR (PRÉ) vs LE (PRÉ) |

`r.total_reclamada` no engine já é definido como
`principalCorrigido + jurosMora + fgts_total` (engine-v3.ts:762),
o equivalente direto ao Java `liquidoExequente`.

## O efeito da correção

Cases revistos com a definição correta (pre-deduções):

```
caso                       | pre   | pos   | INSS | IR
antonio-harley             |  0.21 | -5.79 | -0.5 |  0.0
caso-real-v2               |  1.07 | -6.03 | -0.0 |  0.0
carla-pego                 |  1.09 | -4.96 | -1.8 |  0.0
roque-guerreiro            | -1.58 | -10.29| -1.2 |  0.0
vanderlei-carvalho         | -0.46 | -6.05 | +2.2 |  0.0
islan-rodrigues            |  3.60 | -3.56 | +2.4 |  0.0
izabela-cristina           |  4.39 | -3.06 | -0.7 |  0.0
leide-santana              |  5.66 | -2.86 | +2.5 |  0.0
rosicleia-pereira-chaves   |  7.55 | -3.49 | -1.5 | -0.8
francisco-pablo            |  7.85 | -1.12 | -1.5 | +6.8
joseli-silva               |  8.15 | -9.83 | -0.5 | -0.7
leandro-casademunt         | 10.60 | -9.98 | -0.9 | +0.4
tiago-jose                 | 19.45 | -1.19 | +2.7 | +4.5
```

## A questão remanescente — `liquidoExequente` é INSTÁVEL

Diagnóstico componentes principal_corrigido (PC) + juros (J) + FGTS (F):

```
caso                      | PC alone | PC+J    | PC+J+F  | Match
antonio                   | -25.1%   | -4.9%   |  +0.2%  | PC+J+F
caso-real-v2              | -29.7%   | -5.1%   |  +1.1%  | PC+J+F
roque                     | -30.6%   | -7.6%   |  -1.6%  | PC+J+F
joseli                    | -23.5%   |  +1.4%  |  +8.2%  | PC+J
rosicleia                 |  -7.5%   |  +0.8%  |  +7.5%  | PC+J
leandro                   | -14.9%   |  +3.9%  | +10.6%  | PC+J
leide                     | -21.7%   |  -0.3%  |  +5.7%  | PC+J
tiago                     |  +0.2%   | +12.6%  | +19.5%  | PC alone
```

PJC's `<liquidoExequente>` field tem composição **variável**:
- 3 casos: matches PC+J+F (FGTS incluído)
- 4 casos: matches PC+J (FGTS excluído — destinoDoFgts=DEPOSITAR?)
- 1 caso: matches PC alone (juros não calculados/persistidos)

Isso é compatível com Java
`DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao.java:166-195`:

```java
liquidoExequente = SecaoVO.incrementar([
  Principal,
  Juros até ajuizamento,
  Juros DE+1 até liquidação,
  FGTS (se destinoDoFgts != DEPOSITAR && hasFGTS),
  Juros sobre FGTS
])
```

Mas o valor PERSISTIDO no XML pode ser stale (snapshot do último
recálculo). Não é um campo confiável como referência única.

## Conclusão

1. A definição do calibrate foi corrigida para semântica correta
   (pre vs pre, sem mistura de pos com pre).
2. INSS gap = 1.4%, IR gap = 1.0% permanecem as métricas confiáveis.
3. O "bruto" pode ter overshoots reais (tiago +19%, leandro +10%)
   que indicam:
   - juros sobre principal calculados além do esperado por Java, OU
   - Java pode ter destinoDoFgts=DEPOSITAR (FGTS fora do liquidoExequente)
   - **mas** o valor persistido pode estar desatualizado (snapshot de
     antes do recálculo final)
4. Não vale a pena perseguir os "20% overshoot" enquanto não houver
   ground-truth confiável (deveria ser uma RE-RUN do PJe-Calc Java
   sobre o mesmo input para gerar valores frescos).

## O que mudou no código

- `scripts/calibration-pipeline-v3.ts`:
  - `pjc_bruto` agora = `pjc_liq` (não soma INSS+IR em cima)
  - `eng_bruto` agora = `r.total_reclamada` (não soma cs+ir em cima)
  - Output mostra `pre=+X% | pos=-Y%` para visibilidade dos dois ângulos
  - Métrica primária = pre (semanticamente correta)

## Estado preservado

- INSS gap: **1,41%** (manter)
- IR gap: **1,02%** (manter)
- Bruto definição corrigida — ±5%: 7/13 casos
- Suite: 1035 passing
- tsc: limpo
- Motor 100% autônomo
