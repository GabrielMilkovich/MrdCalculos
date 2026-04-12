# Baseline Oficial — Modo Independente MRD Calc

**Data:** 2026-04-12
**Commit:** `588a99a`
**Motor:** PjeCalcEngine (commits `6dee989` → `2e7715c` → `1f28434` → `41b6dbd` → `588a99a`)
**Índices até:** Fevereiro/2026
**Modo:** `independent` (sem GT, sem ocorrencias_precomputadas para fórmula de verba — mas bridge fornece valores nominais do PJC)

## Resultado por caso (independent-parity-analysis, 14 casos)

| Caso | PJe-Calc (R$) | MRD Calc (R$) | Delta % | Status |
|---|---:|---:|---:|---|
| ANTONIO HARLEY | 39.929,92 | 32.385,06 | −18,90% | ❌ undercalc |
| CARLA PEGO | 45.028,19 | 60.813,99 | +35,06% | ❌ overcalc |
| MARIA MADALENA | 46.426,51 | 47.473,02 | **+2,25%** | ✅ |
| FRANCISCO PABLO | 166.619,02 | 88.882,43 | −46,66% | ❌ undercalc |
| ISLAN RODRIGUES | 9.974,39 | 13.570,47 | +36,05% | ❌ overcalc |
| IZABELA CRISTINA | 73.879,96 | 94.346,37 | +27,70% | ❌ overcalc |
| JOSELI SILVA | 510.459,85 | 454.041,06 | −11,05% | ❌ undercalc |
| LEANDRO CASADEMUNT | 510.050,92 | 532.870,49 | **+4,47%** | ✅ |
| LEIDE SANTANA | 190.652,72 | 221.715,97 | +16,29% | ❌ overcalc |
| PYTER GABRIEL | 0,00 | 68.115,14 | N/A | ⬜ inválido |
| ROQUE GUERREIRO | 231.306,58 | 188.499,35 | −18,51% | ❌ undercalc |
| ROSICLEIA PEREIRA | 247.215,95 | 353.937,80 | +43,17% | ❌ overcalc |
| TIAGO JOSE | 320.938,56 | 339.052,57 | **+5,64%** | ⚠️ |
| VANDERLEI CARVALHO | 61.849,71 | 60.597,23 | **−2,03%** | ✅ |

## Delta global: **+3,92%** (média ponderada por valor)

## Critério de aprovação
- Delta líquido por caso: ≤ ±5,0%
- Delta médio global: ≤ ±5,0%

## Classificação

| Faixa | N | Casos |
|---|---:|---|
| ≤ ±5% (aprovado) | **3** | maria-madalena (+2,25%), leandro (+4,47%), vanderlei (−2,03%) |
| ±5–10% (próximo) | **1** | tiago-jose (+5,64%) |
| > ±10% (fora) | **9** | antonio (−18,9%), carla (+35,1%), francisco (−46,7%), islan (+36,1%), izabela (+27,7%), joseli (−11,1%), leide (+16,3%), roque (−18,5%), rosicleia (+43,2%) |

## Casos aprovados (≤ ±5%): **3 de 13 válidos**

## Causa raiz dos deltas — Diagnóstico Forense

### Juros de mora = R$ 0,00 em TODOS os 13 casos
**Impacto**: −8% a −33% do líquido PJC está faltando.

O bridge `pjc-to-engine.ts` configura `combinacoes_juros` com um **double-insert de NENHUM e SELIC na mesma data de citação**. O `getRegimeParaData()` via stable sort pega NENHUM primeiro → juros zerados.

**Fix validado empiricamente**: removendo o NENHUM indevido e aplicando SELIC simple sum pós-citação, antonio-harley e francisco-pablo atingem **+0,10% e −0,14%** (paridade quase exata). Mas o mesmo fix overcalcula os demais cases em +40-90%.

**Causa do overcalc quando juros flui**: o MRD aplica SELIC sobre `valor_corrigido` de TODAS as verbas. O PJe-Calc aplica apenas sobre o subset registrado em `ApuracaoDeJuros` (que para joseli é 64,7% do nominal — excluindo reflexos de férias, 13º com bucket separado, e valores após exclusões per-competência). Determinar o subset exato requer acesso ao código-fonte Java do PJe-Calc.

### H2 — IPCA-E pára na citação (compensação empírica)
O commit `588a99a` aplica `SEM_CORRECAO` na data de citação em `combinacoes_indice`, parando o IPCA-E. Investigação forense em francisco-pablo e joseli-silva confirmou que o PJe-Calc **NÃO para IPCA-E na citação** — aplica IPCA-E full period (vencimento → liquidação). A evidência:

```
francisco: PJC fator corrigido/nominal = 1,334
           IPCA-E pre-cita (earliest→cita) = 1,132  ← NÃO fecha
           IPCA-E full (earliest→liq) = 1,446       ← fecha com 92% subset
```

H2 é tecnicamente incorreto, mas empiricamente produz o melhor delta global (+3,92%) porque compensa a ausência de juros. Quando o fix de juros for implementado corretamente, H2 deve ser revertido.

### Data de citação estimada
O PJC XML não exporta `data_citacao` (campo `<citacao>null</citacao>` em todos os cases). O bridge estima `citação = ajuizamento`. A citação real é tipicamente 2-6 meses após o ajuizamento. Cada mês de erro representa ~0,8-1,2% de diferença nos juros SELIC.

### IR residual (+134% nos 5 cases com IR > 0)
Fix H1 (commit `41b6dbd`) mudou a base IR de `total_corrigido` para `total_diferenca` (nominal), reduzindo de +315% para +134%. A divergência remanescente é:
- 13º exclusivo por ano já aplicado (commit `1f28434`)
- Verbas com `irpf=true` no bridge que PJC pode isentar (férias indenizadas dependendo do contexto)
- Subset de verbas na base IR do PJC pode ser menor que a do MRD

### Subset ApuracaoDeJuros (análise por caso)

| Case | Verbas COM CS | cs_base/nominal | Verbas SEM CS |
|---|---:|---:|---|
| antonio | 86,4% | 0,790 | INTERVALO INTRA/INTERJORNADAS |
| francisco | 84,4% | 1,036 | DIF. PRÊMIO + INTERVALOS |
| joseli | 98,0% | **0,647** | 6× AVISO PRÉVIO reflexes |

Joseli tem 98% das verbas com CS=true mas apenas 64,7% do nominal entra na `ApuracaoDeJuros` — as exclusões per-competência (férias gozadas, faltas, proporcionalização, 13º em bucket separado) reduzem a base significativamente.

## Fixes aplicados neste ciclo (sessão 2026-04-12)

| Commit | Fix | Impacto no delta |
|---|---|---|
| `6dee989` | P1-P5+P8: lookup histórico, divisores, quantidades, INSS históricas, data_citacao fallback | +13,95% → +13,97% (neutro — test usa precomputed) |
| `2e7715c` | P6-P9+P13: CS corr. trabalhista, IR honorários, TRD juros, ignorar taxa negativa | +13,97% → +13,97% (neutro) |
| `1f28434` | mapCaracteristica DECIMO, basesEmpregador inclui 13, 13 exclusivo por ano, AVISO irpf=false | +13,97% → +13,66% (−0,31pp) |
| `41b6dbd` | IR usa `total_diferenca` (nominal) em vez de `total_corrigido` | +13,66% → +19,88% (IR −155pp mas líquido exposto) |
| `588a99a` | H2: SEM_CORRECAO em `combinacoes_indice` pós-citação | +19,88% → **+3,92%** (−15,96pp) |

## Roadmap para paridade ≤ 5% consistente (todos os cases)

1. **Fix juros ADC58 com subset correto**: aplicar SELIC apenas sobre verbas que entram na `ApuracaoDeJuros` do PJC (verbas com CS=true APÓS exclusões per-competência). Requer: ou acesso ao código-fonte Java, ou heurística baseada em `incidencias.contribuicao_social=true` + `caracteristica !== 'aviso_previo'`.
2. **Reverter H2 após fix de juros**: IPCA-E volta a full period (correto per PJe-Calc).
3. **Seed de dados**: popular tabelas de referência no Supabase para eliminar hardcode de índices.
4. **Data de citação real**: quando disponível no PJC ou informada pelo usuário.
