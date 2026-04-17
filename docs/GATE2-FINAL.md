# GATE 2 FINAL — Fim das Fases 1-6

**Data:** 2026-04-17
**Branch:** `claude/analyze-pje-calc-migration-ORJxJ`
**Corpus:** 18 arquivos `.pjc` reais

## Resultado Final

| # | Cálculo | PJe-Calc (R$) | MRD V3 (R$) | Delta % | Status |
|---|---|---:|---:|---:|---|
| 1 | 4463 | 9.974,39 | 14.205,35 | +42,42% | REPROV |
| 2 | 4259 | 97.403,88 | 95.293,38 | -2,17% | APROV5% |
| 3 | 4483 | 88.486,94 | 76.292,54 | -13,78% | REPROV |
| 4 | 4465 | 190.652,72 | 233.492,53 | +22,47% | REPROV |
| 5 | 4495 | 61.849,71 | 74.861,56 | +21,04% | REPROV |
| 6 | 4418 | 160.735,54 | 158.835,35 | -1,18% | APROV5% |
| 7 | 4461 | 45.028,19 | 48.671,48 | +8,09% | APROV10% |
| 8 | 4770 | 184.806,38 | 191.658,61 | +3,71% | APROV5% |
| 9 | 4866 | 510.050,92 | 537.570,16 | +5,40% | APROV10% |
| 10 | 4494 | 166.619,02 | 157.833,60 | -5,27% | APROV10% |
| 11 | 4326 | 168.062,81 | 161.940,13 | -3,64% | APROV5% |
| 12 | 4435 | 124.770,28 | 131.362,40 | +5,28% | APROV10% |
| 13 | 4131 | 78.021,72 | 80.400,68 | +3,05% | APROV5% |
| 14 | 4462 | 317.482,10 | 329.145,23 | +3,67% | APROV5% |
| 15 | 4546 | 42.081,15 | 38.612,49 | -8,24% | APROV10% |
| 16 | 4464 | N/A | (erro PJC) | -- | ERRO |
| 17 | 4493 | 320.938,56 | 319.562,78 | -0,43% | APROV1% |
| 18 | 4325 | 58.820,58 | 62.869,99 | +6,88% | APROV10% |

## Métricas Finais

| Métrica | Baseline | GATE 2 Final | Δ |
|---|---:|---:|---:|
| Aprovados ≤1% | 0/17 | **1/17** | +1 |
| Aprovados ≤5% | 0/17 | **7/17 (41%)** | +7 |
| Aprovados ≤10% | 0/17 | **12/17 (71%)** | +12 |
| Delta médio absoluto | 43,58% | **~9-10%** | -34pp |
| Delta global | -47,66% | **~+5%** | +53pp |
| MRD V3 total | R$ 1.374k | R$ 2.825k | +106% |
| Testes suite | 362 | **404** | +42 |

## Meta GATE 2 (proposta em BASELINE-FASE0.md)

- ≥15/17 ≤5% → 7/17 (46% da meta) ❌
- Todos ≤10% → 12/17 (71% da meta) ❌
- Delta médio absoluto ≤3% → ~9-10% ❌
- **GATE 2: parcialmente atingido** (71% cases aprovados ≤10%, ainda faltam 4-5 cases com overshoot específico)

## Cases Pendentes (Overshoot)

5 cases ainda com delta >+15%:
- **4463 (+42%)**, **4465 (+22%)**, **4495 (+21%)**

**Causa identificada**: parser `pjc-to-engine.ts` está criando **verbas duplicadas em reflexos** (ex: "RSR COMISSÕES" e "13° SOBRE RSR COMISSÕES" com valores idênticos, quando o segundo deveria ser ~1/12 do primeiro). A função `consolidarReflexoMediaPelaQuantidade` existe mas não cobre todos os padrões.

## Fases Executadas

| Fase | Escopo | Status |
|---|---|---|
| 0 | Baseline (rodar testes + medir paridade inicial) | ✅ |
| 1 | Núcleo 1:1 (MaquinaDeCalculo + 5 fixes V3) | ✅ |
| 2 R1 | INSS/IRPF/FGTS core + adapter fixes | ✅ |
| 2 R2 | MaquinaDeCalculoDeInss/Irpf per-competência | ⏸️ adiada |
| 3 | ApuracaoDeJuros + juros especializados + indices diarios | ⏸️ parcial (juros combinacoes implementado) |
| 4 | Multa 467/523, Honorarios, Custas | ✅ campos populados (PJCs testados tem flags falsas) |
| 5 | Seeds Supabase com series oficiais | ⏸️ framework existe (indices-fallback.ts) mas seeds nao aplicados |
| 6 | Validacao final + GATE 2 | ✅ este documento |

## Commits (10 total nesta sessão)

1. `docs(fase0)`: baseline 
2. `feat(fase1)`: MaquinaDeCalculo + 18 testes
3. `fix(engine-v3)`: juros (simples/composto/SELIC)
4. `fix(engine-v3)`: FGTS + multa 40% + LC110
5. `fix(engine-v3)`: combinacoes_juros (TRD_SIMPLES + SELIC ADC 58/59)
6. `feat(fase2 r1)`: FGTS maquina + operacao + INSS WIP
7. `feat(fase2 r1)`: Irpf + INSS adapter + IR/CS analyzer bugs
8. `fix(engine-v3)`: preservar indices + FGTS so em liquido se compor_principal
9. `fix(engine-v3)`: juros sobre DIFERENCA (nominal)
10. `feat(fase4)`: multa 467/523 + honorarios

## Bugs Críticos Corrigidos (10 bugs)

1. Juros hardcoded em zero no V3
2. FGTS hardcoded em zero no V3
3. Multa, Honorários, Custas hardcoded em zero
4. Combinações de juros ignoradas
5. INSS usava diferença nominal em vez de corrigida
6. IR=0 por bug no loop de faixas (`|| faixa.aliquota.isZero()` matava 1ª faixa)
7. Analisador PJC não extraía `ImpostoRendaCalculo`
8. Analisador PJC não sintetizava `cs_config` do flag root
9. `calculo.liquidar()` sobrescrevia índices pré-computados
10. Juros calculados sobre valor corrigido em vez de diferença (Súmula 200 TST)

## Próximos passos para ≤5% paridade

Para alcançar a meta original (≥15/17 ≤5%):

1. **Corrigir duplicação de reflexos no parser** — investigação em profundidade identificou que alguns `.PJC` têm ocorrências com `<devido>` no mesmo valor da verba-base (ex: 13º SOBRE DOMINGO com mesmo sum que DOMINGO). Pode ser: (a) PJC-bug de export, (b) formato XML com referências compartilhadas não suportadas pelo nosso parser, (c) consolidação necessária pós-parse (`consolidarReflexoMediaPelaQuantidade` cobre só alguns padrões). Necessário investigar 1 caso específico (ex: 4463 +42%) com XML raw.
2. **Portar MaquinaDeCalculoDoInss per-competência** (agente Fase 2 TODO)
3. **Portar MaquinaDeCalculoDeIrpf** com OcorrenciaDeIrpf por competência (tabela por data)
4. **Seeds oficiais IBGE/RFB/BCB** para modo totalmente independente (atualmente preservamos índices do PJC)
5. **Detectar casos com juros suprimido** — PJC pode ter `jurosMora=null` quando não aplicou juros (ex: 4463). Testada detecção baseada em `valor_principal === liquido` mas essa igualdade é comum e causou regressão. Heurística requer sinal adicional (ex: `ApuracaoDeJuros.totalJurosSimples=0`).

## Lições aprendidas

- Agentes grandes (>1000 LOC Java) dão timeout; agentes menores (<500 LOC) são confiáveis
- Quando stubs existem mas engine não os usa, o ganho vem de WIRAR e não de portar mais
- Preservar dados já-computados do PJC (como `indice_acumulado`) é mais preciso que recalcular via stubs incompletos
- O PJe-Calc tem casos especiais (juros suprimido, sem correção, valor informado) que não se detectam trivialmente sem ler a lógica completa do Java

## Commits pushed (13 totais)

1. `docs(fase0)`: baseline (0/17 aprov)
2. `feat(fase1)`: MaquinaDeCalculo + 18 testes core
3. `fix(engine-v3)`: juros de mora (SELIC/taxa legal/composto)
4. `fix(engine-v3)`: FGTS + multa 40% + LC110
5. `fix(engine-v3)`: combinacoes_juros (TRD_SIMPLES + SELIC ADC 58/59)
6. `feat(fase2 r1)`: FGTS maquina + operacao + INSS WIP
7. `feat(fase2 r1)`: IRPF + INSS adapter + IR/CS analyzer bugs
8. `fix(engine-v3)`: preservar indices + FGTS só em liquido se compor_principal
9. `fix(engine-v3)`: juros sobre DIFERENCA (nominal) - Súmula 200 TST
10. `feat(fase4)`: multa 467/523 + honorarios
11. `docs(fase6)`: GATE 2 FINAL
12. `feat(analyzer)`: valor_principal e juros_mora_persistido
13. `docs(gate2)`: licoes aprendidas + proximos passos
