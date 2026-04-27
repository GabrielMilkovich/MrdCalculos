# 08 — Pensão Alimentícia (CC art. 1.694 + CLT art. 734)

## O que é

A pensão alimentícia trabalhista é o desconto na fonte do crédito do
reclamante, em favor de credor de alimentos (cônjuge, ex-cônjuge, filho), por
determinação judicial específica (ofício do juízo da família) ou cláusula em
sentença trabalhista. Pode ser fixada como **percentual** sobre a remuneração
ou como **valor fixo** mensal.

## Fórmula

### Pensão por percentual sobre a base
```
Para cada competência:
  base = remuneração_devida (bruto)            quando base='bruto'
       | remuneração_devida - INSS - IR        quando base='liquido'
       | só_salario                             quando base='salario'
  pensao = base × percentual
```

### Pensão por valor fixo
```
pensao = valor_fixo × meses                   (valor mensal × n_meses_devidos)
```

### Dedução do crédito do reclamante (linha de líquido)
```
liquido_reclamante = principal + juros + correção
                   - INSS_segurado - IRPF
                   - PENSAO                   ← linha autônoma
                   - prev. privada - honorários contratuais
```

### Dedução da base de IR (Lei 7.713/88, art. 4º II)
Quando flag `deduzir_pensao=true` no módulo IR (vide doc 02):
```
base_IR = base_IR_original - pensao_alimenticia
```
Apenas pensões fixadas judicialmente são dedutíveis (RIR/2018, art. 71).

## Lei / súmula referência

- **CC, art. 1.694 e seguintes** — direito a alimentos (cônjuge, parentes)
- **Lei 5.478/1968** — Lei de Alimentos (rito especial)
- **CLT, art. 734** — desconto pelo empregador mediante ofício
- **Lei 11.804/2008** — alimentos gravídicos
- **Lei 7.713/1988, art. 4º II** — dedução IR de alimentos judiciais
- **RIR/2018, Decreto 9.580/18, art. 71** — limites e regras de dedução
- **Súmula 309 STJ** — prisão civil (3 últimas prestações)
- **Súmula 379 STJ** — incidência sobre 13° e férias

## Flags UI que controlam (módulo `ModuloPensao`)

| Flag | Status | Efeito |
|---|---|---|
| `apurar` | Conectada (Sprint 4.2-B2) | Liga cálculo de pensão |
| `tipo` | Conectada | `percentual` ou `valor_fixo` |
| `percentual` | Conectada | % da base (default 30%) |
| `valor_fixo` | Conectada | BRL/mês |
| `base` | Conectada | `bruto`, `liquido` ou `salario` |
| `incide_13_ferias` | Conectada | Aplicar sobre 13° e férias (Súm.STJ 379) |
| `deduzir_pensao` (IR) | Conectada | Deduz da base IRPF |
| `meses_pagamento` | Em estudo | Limitar a N meses (alimentos transitórios) |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:97` — campo
  `pensaoConfig: PjePensaoConfig`
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:150` —
  default `{ apurar: false, percentual: 0, base: 'liquido' }`
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts` (Sprint 4.2-B2) —
  bloco de cálculo da pensão e dedução do líquido
- `/home/user/MrdCalculos/src/lib/pjecalc/modulos/irpf-modulo-adapter.ts` —
  flag `deduzir_pensao`

## Casos especiais

1. **Sumula STJ 379 — 13° e férias:** entendimento majoritário é que
   alimentos incidem sobre 13° e adicional 1/3 de férias por integrarem
   remuneração. Engine respeita flag `incide_13_ferias` (default `true`).
2. **Base bruto vs líquido:** sentença geralmente fixa. **Bruto** é mais
   favorável ao alimentando; **líquido** mais favorável ao alimentante.
   Atenção: usar "líquido" pode reduzir a pensão se houver muito IR/INSS.
3. **Alimentos provisórios vs definitivos:** mesma fórmula; diferença é
   processual (cabimento de revisão).
4. **Limite ético:** doutrina e jurisprudência limitam a 30% da remuneração
   líquida (preserva mínimo existencial). UI permite override mas alerta
   visualmente quando supera.
5. **Atraso no pagamento e prisão (Súm.STJ 309):** as 3 últimas prestações
   admitem prisão civil. Não impacta cálculo, mas é registrado no relatório
   para o operador.
6. **Múltiplos credores:** se o reclamante deve a mais de um (ex-cônjuge +
   filhos de outro relacionamento), UI permite múltiplas linhas de pensão. O
   total não pode superar o líquido após INSS + IR (CPC art. 833 §2º).
7. **Alimentos transitórios (Súm.STJ 596):** flag `meses_pagamento` (em
   estudo) limitará a N meses para casos de fixação temporária.
