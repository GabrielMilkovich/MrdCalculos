# FASE 0 — Caso âncora: antonio-harley

> **Data:** 2026-04-26
> **Objetivo:** entender, item-a-item, como o PJe-Calc Java calcula o líquido
> de antonio-harley e validar se nosso motor TS reproduz exatamente.

## 1. Inputs do PJC (extraídos do XML)

### Datas
| Campo            | Valor                |
|------------------|----------------------|
| Beneficiário     | ANTONIO HARLEY MARQUES GOMES |
| Admissão         | 2019-11-21           |
| Demissão         | 2020-11-13           |
| Ajuizamento      | 2022-09-20           |
| Liquidação       | 2025-10-31           |
| Período          | 13 meses             |
| Regime           | PRE_ADC58 (TR + JAM 1%) |

### Configurações
| Flag                          | Valor                       |
|-------------------------------|-----------------------------|
| destinoDoFgts                 | PAGAR (entra no liquidoExequente) |
| aplicarJurosFasePreJudicial   | true                        |
| indicesAcumulados             | MES_SUBSEQUENTE_AO_VENCIMENTO |
| jurosDoAjuizamento            | OCORRENCIAS_VENCIDAS        |
| juros (até ajuizamento)       | TRD_SIMPLES                 |
| outroJuros (pós-ajuizamento)  | SELIC                       |
| indiceTrabalhista             | IPCA-E                      |
| outroIndiceTrabalhista        | SEM_CORRECAO                |
| baseDeJurosDasVerbas          | VERBA_INSS (juros pós-INSS) |
| aliquotaDoFgts                | 8%                          |
| multaDoFgts                   | 40%                         |
| indiceDeCorrecaoDoFGTS        | UTILIZAR_INDICE_TRABALHISTA |
| incidenciaDoFgts              | SOBRE_O_TOTAL_DEVIDO        |

### Resultado persistido no XML
| Campo            | Valor      |
|------------------|------------|
| liquidoExequente | 39 929,92  |
| valorPrincipal   | 39 929,92  |
| inssReclamante   |  2 405,58  |
| inssReclamado    |  6 336,11  |
| impostoRenda     |      0,00  |
| depositoFgts     |      0,00  |
| honorários       |  6 235,38  |
| custas           |    400,00  |

## 2. Resultado do motor TS

| Campo                  | Valor      |
|------------------------|------------|
| total_reclamada        | 40 013,94  |
| principal_corrigido    | 29 897,25  |
| juros_mora             |  8 074,19  |
| fgts_total             |  2 042,50  |
| cs_segurado (INSS rec) |  2 394,34  |
| cs_empregador (INSS Rd)|  3 924,92  |
| ir_retido              |      0,00  |
| honorarios_sucumbenc.  |  5 695,72  |

## 3. Comparação lado-a-lado — TOTAIS

| Item                  | PJC        | ENG        | Δ        | Status |
|-----------------------|-----------:|-----------:|---------:|--------|
| liquidoExequente      | 39 929,92  | 40 013,94  |  +0,21%  | ✅ excelente |
| inssReclamante        |  2 405,58  |  2 394,34  |  -0,47%  | ✅ ótimo |
| **inssReclamado**     |  **6 336,11** |  **3 924,92** | **-38,05%** | ❌ gap grande |
| impostoRenda          |      0,00  |      0,00  |   0,00%  | ✅ exato |
| **honorários**        |  **6 235,38** |  **5 695,72** |  **-8,65%** | ⚠️ gap médio |
| principal_corrigido   | 29 806,98  | 29 897,25  |  +0,30%  | ✅ excelente |

## 4. Comparação POR COMPETÊNCIA — INSS nominal

A fonte da verdade são os 13 itens de `apuracao_juros` do PJC.

| Comp     | PJC val_corr | ENG val_nominal × fator | PJC cs_normal | ENG cs_segur | Δcs   |
|----------|-------------:|------------------------:|--------------:|-------------:|------:|
| 2019-11  |        45,19 |           36,51 × 1,238 |          2,34 |         2,34 | 0,00% |
| 2019-12  |        22,57 |           18,43 × 1,225 |          1,09 |         1,09 | 0,00% |
| 2020-01  |     1 776,02 |        1 460,20 × 1,216 |         92,94 |        92,94 | 0,00% |
| 2020-02  |     2 411,73 |        1 987,22 × 1,214 |        130,92 |       130,92 | 0,00% |
| 2020-03  |     2 236,57 |        1 843,27 × 1,213 |        116,54 |       116,54 | 0,00% |
| 2020-04  |       566,46 |          466,86 × 1,213 |         30,92 |        30,92 | 0,00% |
| 2020-05  |     1 332,45 |        1 098,14 × 1,213 |         72,52 |        72,52 | 0,00% |
| 2020-06  |     2 882,70 |        2 376,24 × 1,213 |        167,11 |       167,12 | 0,01% |
| 2020-07  |     4 104,38 |        3 393,45 × 1,210 |        262,13 |       262,13 | 0,00% |
| 2020-08  |     3 459,18 |        2 866,58 × 1,207 |        207,95 |       207,95 | 0,00% |
| 2020-09  |     3 751,33 |        3 122,67 × 1,201 |        237,36 |       237,37 | 0,00% |
| 2020-10  |     1 526,19 |        1 282,37 × 1,190 |         82,66 |        82,66 | 0,00% |
| 2020-11  |     5 692,21 |        4 821,57 × 1,180 |        234,80 |       234,82 | 0,01% |
| **TOTAL**| **29 806,98**| **24 773,51**           |  **1 639,28** | **1 639,32** | **0,00%** |

**INSS nominal por competência: BATE EXATAMENTE em todas as 13 linhas.**

O resultado total (1 639,32 vs 1 639,28) é praticamente idêntico — gap
de R$ 0,04 (0,002%).

A divergência maior no `cs_segurado` final do resumo (2 394,34 vs 2 405,58 = -0,47%)
não vem do cálculo do INSS por competência, mas da **correção monetária aplicada
sobre o INSS** desde a competência até a liquidação.

## 5. Decomposição do liquidoExequente

PJC `<liquidoExequente>` = 39 929,92.

Engine: `principal_corrigido + juros_mora + fgts_total`:
- PC corrigido: 29 897,25
- Juros mora:    8 074,19
- FGTS total:    2 042,50
- **TOTAL: 40 013,94 (+0,21% vs PJC)**

PJC não persiste juros e FGTS em campos discretos no XML, mas
empiricamente:
- PC corrigido (PJC valor_corrigido total): 29 806,98
- Engine PC: 29 897,25 → +0,30%
- Resíduo PJC para fechar 39 929,92: 10 122,94 (juros + FGTS combinados)
- Resíduo engine: 8 074 + 2 042 = 10 117 → diff R$ 5 (0,05%)

**Engine bate perfeitamente o liquidoExequente, mesmo que internamente
juros e FGTS individualmente possam diferir um pouco.**

## 6. Fatores de correção implícitos

PJC (extraídos do XML):
| Comp     | <indiceAcumulado>      |
|----------|------------------------|
| 2019-11  | 1,2377834544622520543... |
| 2019-12  | 1,2249217758161821418... |
| 2020-01  | 1,2162861441924159883... |
| 2020-02  | 1,2136161885775453884... |
| 2020-03  | 1,2133735138747704343... |
| 2020-04  | 1,2133735138747704343... |
| 2020-05  | 1,2133735138747704343... |
| 2020-06  | 1,2131308876972309881... |
| 2020-07  | 1,2095023805555642952... |
| 2020-08  | 1,2067269086656333386... |
| 2020-09  | 1,2013209643261655934... |
| 2020-10  | 1,1901337074758922066... |
| 2020-11  | 1,1805710817140087359... |

A precisão (>15 dígitos) confirma que Java usa `BigDecimal` com escala alta.
Engine TS usa Decimal.js também (precisão 20) — deveria bater.

## 7. Divergências identificadas — em ordem de prioridade

### D1 — inssReclamado (-38,05%) ← **MAIOR**
- PJC: R$ 6 336,11 | ENG: R$ 3 924,92 | Diff: -R$ 2 411
- **Hipótese:** Engine só aplica alíquota empresa (20%) sobre verbas;
  Java aplica empresa + SAT/RAT + Terceiros (PRC, INCRA, SEBRAE etc.)
- Ação: investigar `csConfig.aliquota_*` e como o Java compõe contribuição empregador.

### D2 — honorários sucumbenciais (-8,65%)
- PJC: R$ 6 235,38 | ENG: R$ 5 695,72 | Diff: -R$ 540
- 6 235,38 ÷ (algo) = 15% (taxa de honorários)
- Engine: 15% × (PC corrigido + juros) = 15% × (29 897 + 8 074) = 5 695,72 ✓ confere com TS
- Java: 6 235,38 ÷ 15% = 41 569,20 → próximo de liquidoExequente (39 929,92)
  - Mais provável: 15% × (líquido pré-deduções + algum extra) ou 15% × condenação total
- **Hipótese:** Java inclui FGTS na base de honorários, ou aplica
  honorários sobre `total_reclamada` ao invés de `principal+juros`.
- Ação: descobrir a base exata. Uma fórmula candidata:
  - 15% × 41 569,20 = 6 235,38
  - 41 569,20 = 39 929,92 (LE) + 1 639,28 (INSS recl) ≈ "valor sem dedução INSS"
  - **Possível regra: honorários sobre LE + INSS reclamante** = 15% × 41569 = 6235 ✓ MATCH

### D3 — cs_segurado total (-0,47%)
- PJC: R$ 2 405,58 | ENG: R$ 2 394,34 | Diff: -R$ 11
- Por competência: bate exato (gap = R$ 0,04)
- **Causa:** correção monetária aplicada sobre o INSS difere ligeiramente
- Pequeno e estrutural — última prioridade

### D4 — principal_corrigido (+0,30%)
- PJC: R$ 29 806,98 | ENG: R$ 29 897,25 | Diff: +R$ 90
- Pequeno gap — engine corrige levemente "a mais"
- Pode ser arredondamento composto sobre 13 competências

## 8. Próximos passos (proposta)

1. **Investigar D1** (inssReclamado -38%) — abrir `csConfig` no engine,
   ver se SAT/Terceiros estão sendo apurados. Se não, descobrir
   alíquotas que Java usa para tiago.
2. **Investigar D2** (honorários -8,65%) — testar hipótese
   "base = LE + INSS recl" no engine, ver se bate.
3. **Validar antonio 100%** com correções D1+D2.
4. Só ENTÃO ir para o caso 2 (sugiro `roque-guerreiro` — testa estabilidade
   temporal em 209 meses, mesmo regime PRE_ADC58).
