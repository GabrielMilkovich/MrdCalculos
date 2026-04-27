# 01 — INSS (Contribuição Previdenciária)

## O que é

A contribuição previdenciária ao INSS é a parcela retida das verbas trabalhistas
salariais e recolhida ao Regime Geral de Previdência Social. Em liquidação
trabalhista o sistema calcula DUAS partes: a **cota do segurado** (descontada do
crédito do reclamante) e a **cota do empregador** (devida pela reclamada,
incluindo SAT e Terceiros). Sobre as parcelas atrasadas incidem juros SELIC e,
quando aplicável, multa moratória e correção pelo IPCA-E (Lei 11.941/09).

## Fórmula

### Cota do segurado (faixas marginais — EC 103/2019)
```
Para cada competência:
  base = soma das verbas com incidência previdenciária
  desconto = Σ min(base, teto_faixa) × alíquota_marginal
```
Faixas progressivas conforme tabela vigente em cada competência (ver
`tabela-irpf.ts` e migrations `20251005000200_inss_2025.sql`).

### Cota do empregador
```
Empresa  = base × 20%
SAT/RAT  = base × (1% | 2% | 3%) × FAP
Terceiros = base × (~5,8%)  // S/Sistema, INCRA, SENAI, SEBRAE etc.
```

### Atualização monetária + juros (Lei 11.941/09)
```
INSS_atualizado = INSS_nominal × (1 + taxaSELIC_acumulada/100 + multa%/100)
```
Após Lei 11.941/2009 (vigência 04/12/2009, conforme tabela SELIC INSS oficial
03/2009), a SELIC engloba juros e correção em parcela única.

## Lei / súmula referência

- **CF/88, art. 195, I** — financiamento da seguridade social
- **Lei 8.212/1991** — Plano de Custeio (arts. 22, 28, 35)
- **EC 103/2019** — alíquotas progressivas (faixas marginais) a partir de 03/2020
- **Lei 11.941/2009, art. 43 + Resolução RFB 1.117/2010** — SELIC sobre débitos
  previdenciários (substitui IPCA-E + 1% trabalhista)
- **Súmula TST 200** — juros de mora 1%/m simples (componente trabalhista,
  desativado por padrão pós-Lei 11.941)
- **Lei 8.212/91, art. 35** — multa moratória previdenciária

## Flags UI que controlam (módulo `ModuloCS`)

| Flag | Status | Efeito |
|---|---|---|
| `apurar_segurado` | Conectada | Liga/desliga cálculo da cota do segurado |
| `cobrar_reclamante` | Conectada | Inclui INSS segurado nos descontos do líquido |
| `cs_sobre_salarios_pagos` | Conectada | Calcula INSS também sobre verbas já pagas (Súm.TST 368) |
| `apurar_empresa` | Conectada (Sprint 4.2-B1) | Inclui cota patronal de 20% |
| `apurar_sat` | Conectada (Sprint 4.2-B1) | Inclui SAT/RAT (1/2/3% × FAP) |
| `apurar_terceiros` | Conectada (Sprint 4.2-B1) | Inclui terceiros (~5,8%) |
| `cs_dev_correcao_prev` | Conectada | Aplica fator SELIC INSS (Lei 11.941/09) |
| `cs_dev_juros_prev` | Conectada | SELIC já contém juros — branch padrão |
| `cs_dev_correcao_trab` | Em estudo | Aplicar IPCA-E sobre INSS (rara — pré-2009) |
| `cs_dev_juros_trab` | Em estudo | Adicionar 1%/m Súm.TST 200 (rara) |
| `cs_dev_multa_prev_aplicar` | Em estudo | Multa Lei 8.212/91 art.35 |
| `simples_nacional` | Conectada (Sprint 4.2-B2) | Desativa cota patronal (LC 123/2006) |

## Como o engine implementa

Arquivos principais (paths absolutos):

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:611-731` —
  cálculo de `csSegurado` e `csEmpregador` com fator SELIC INSS
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1579-1678` —
  `csCorrecaoFator()` (Súm.TST 200 + Lei 11.941/09 + multa art.35)
- `/home/user/MrdCalculos/src/lib/pjecalc/modulos/inss-modulo-adapter.ts` —
  bridge UI → core
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/inss/faixas/faixa-previdenciaria.ts` —
  faixas marginais EC 103/2019
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/calculo/inss/inss.ts` —
  porte 1:1 da `Inss.java` (PJe-Calc v2.15.1)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/selicinss/juros-selic-inss.ts` —
  tabela SELIC INSS

## Casos especiais

1. **Pré-Lei 11.941/2009 (anterior a 03/2009):** correção via IPCA-E + juros
   1%/m Súm.TST 200 (branch trabalhista). Engine aplica via flags
   `cs_dev_correcao_trab` e `cs_dev_juros_trab`.
2. **Simples Nacional:** quando `simples_nacional=true`, a cota patronal
   (empresa + SAT + terceiros) é zerada. Apenas o segurado (cota do trabalhador)
   é mantida (LC 123/2006).
3. **Verbas isentas:** férias indenizadas (Súm.TST 171 + Lei 8.212/91 art.28
   §9 "d"), aviso prévio indenizado, FGTS, multa 40% — não compõem base.
4. **Override por PJC:** quando importado de `.PJC` real, taxa de juros INSS por
   competência pode vir do XML (`inssTaxaJurosPorCompetencia`) e tem precedência
   sobre o cálculo autônomo — garante paridade exata com o cálculo do CNJ.
5. **Teto INSS:** verbas acima do teto da última faixa têm a alíquota máxima
   aplicada apenas até o teto; o excedente não recolhe INSS.
