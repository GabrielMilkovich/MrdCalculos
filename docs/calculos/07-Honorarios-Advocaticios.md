# 07 — Honorários Advocatícios (Sucumbenciais e Contratuais)

## O que é

Os honorários remuneram o trabalho do advogado e podem ter duas naturezas:

- **Sucumbenciais** — devidos pela parte vencida ao advogado da parte vencedora
  (CLT art. 791-A, redação Lei 13.467/2017 — Reforma Trabalhista).
- **Contratuais** — pactuados em contrato escrito entre cliente e advogado;
  em geral 20-30% do crédito; podem ser deduzidos da base do IR (Lei 9.250/95
  art. 8º II "g").

## Fórmula

### Honorários sucumbenciais (CLT art. 791-A)
```
base_sucumbenciais = liquido_reclamante (ou principal_corrigido,
                                          conforme acordado em sentença)
honorarios = base × percentual          (entre 5% e 15%, fixado pelo juiz)
```
Mínimo 5%, máximo 15%, considerando: trabalho realizado, lugar da prestação,
natureza, importância da causa, tempo (CLT art. 791-A §2º).

### Honorários contratuais
```
honorarios_contratuais = credito_total × percentual_contratual
```
Não há limite legal mas há limite ético (OAB recomenda ≤ 30%).

### Dedução de honorários contratuais da base de IR
```
Quando deduzir_honorarios=true:
  base_IR = base_IR_original - honorarios_contratuais  (limite 20% do crédito)
```
Lei 9.250/95 art.8º II "g" — somente honorários **contratuais** são dedutíveis;
sucumbenciais não (renda do advogado, não despesa do reclamante).

## Lei / súmula referência

- **CLT, art. 791-A** (Lei 13.467/2017) — honorários de sucumbência na JT
- **CPC/2015, art. 85 §2º** — critérios gerais para fixação
- **Súmula 219 TST** — antes da Reforma, sucumbência só com OAB+pobreza
  (substituída por 791-A para casos pós 11/11/2017)
- **STF, ADI 5.766/2018** — honorários sucumbenciais de beneficiário da
  justiça gratuita: condição suspensiva de exigibilidade
- **Lei 9.250/1995, art. 8º II "g"** — dedução IR (contratuais)
- **OAB, Tabela de Honorários** — referência ética
- **Súmula 477 STJ** — base de cálculo: valor da condenação

## Flags UI que controlam (módulo `ModuloHonorarios` + `ModuloIR`)

| Flag | Status | Efeito |
|---|---|---|
| `apurar_sucumbenciais` | Conectada (Sprint 4.2-C1) | Liga cálculo |
| `percentual_sucumbenciais` | Conectada | Default 15% (máx CLT 791-A) |
| `base_sucumbenciais` | Conectada | `liquido` ou `principal_corrigido` |
| `apurar_contratuais` | Conectada | Liga honorários contratuais |
| `percentual_contratuais` | Conectada | Sem limite legal (ético ≤ 30%) |
| `deduzir_honorarios` (IR) | Conectada | Deduz contratuais da base IR |
| `juiz_arbitrou` | Em estudo | Fixar valor manual sobrepondo percentual |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/calculo/honorarios/honorario.ts` —
  porte da `Honorario.java`
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:44` — import
  `Honorario` e wiring no pipeline
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:478` —
  honorariosConfig passado ao Calculo
- `/home/user/MrdCalculos/src/lib/pjecalc/modulos/irpf-modulo-adapter.ts` —
  bloco `deduzir_honorarios` na base IR

## Casos especiais

1. **Justiça gratuita (ADI 5.766):** o reclamante beneficiário da gratuidade
   não pode ter honorários sucumbenciais retidos do crédito; ficam suspensos
   por até 2 anos sob condição de melhora econômica. UI/módulo de
   acompanhamento processual deve registrar — engine apenas calcula o valor.
2. **Reforma Trabalhista (11/11/2017):** ações ajuizadas antes seguem Súm.TST
   219 (só com OAB + miserabilidade); ações pós aplicam CLT art. 791-A.
   Sistema infere pela `data_ajuizamento` do processo.
3. **Sucumbência recíproca:** quando ambas as partes vencem e perdem em parte,
   há compensação proporcional (CPC art. 86 + CLT art. 791-A §3º). Engine
   permite informar percentual líquido após compensação.
4. **Base de cálculo:** **liquido** = após INSS+IR (mais protetivo ao
   reclamante); **principal_corrigido** = antes dos descontos (mais favorável
   ao advogado). UI permite escolha — sentença geralmente fixa.
5. **Dedução IR limitada:** Lei 9.250/95 limita dedução a 20% da renda
   tributável. Engine respeita o limite via min(honorarios_contratuais,
   0.20 × base_IR).
6. **Honorários sobre juros e correção:** controvertido — alguns juízos
   incluem (base ampla), outros excluem (base restrita ao principal). UI
   permite escolha via `base_sucumbenciais`.
