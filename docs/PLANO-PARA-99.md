# Plano Honesto para 99% de Paridade — MRD Calc

**Data:** 2026-04-29
**Estado atual:** main em `2d23fe4` — calibrate 94%, código port 70-75%
**Meta:** 99% de paridade contra PJe-Calc Java v2.15.1

---

## 1. Diagnóstico honesto

Existem **DUAS paridades** independentes que precisam de plano separado:

### 1.1 Paridade NUMÉRICA (calibrate) — hoje 94%
Engine v3 produz resultado dentro de ±5% do PJe-Calc Java em **49 de 52 PJCs reais**.

**3 outliers persistentes:**
| PJC | Delta | Causa diagnosticada |
|---|---|---|
| 00004939 | +4.31% | inssReclamante -2.34% (gap ~R$ 40) |
| 00008567 | -11.24% | principal_corrigido + juros_mora pré-ADC58 (gap ~R$ 10k) |
| 10004617 | -15.83% | mesma causa do anterior (gap ~R$ 41k) |

A hipótese FGTS foi REFUTADA empiricamente por CEREBRO (Sprint 4).
Causa real é **correção monetária long-tail pré-ADC58 + composição de juros**.

### 1.2 Paridade de CÓDIGO (Java→TS line-by-line) — hoje ~72% médio
| Componente | Atual | Meta 99% | LOC para portar |
|---|---|---|---|
| Calculo.java | 70.2% | 99% | ~890 |
| Pagamento.java | 50% | 99% | ~800 |
| IRPF core | 24% | 99% | ~1500 |
| INSS core | 38% | 99% | ~1000 |
| CartaoPonto core | 17% | 99% | ~1200 |
| ApuracaoDeJuros | 0% | 99% | ~500 |
| **TOTAL** | — | — | **~5900 LOC** |

Importante: **paridade numérica ≠ paridade de código**. Engine v3 atinge 94%
calibrate sem ter port full do Java porque usa verba-modules paralelos. Para
ir de 94% → 99% calibrate, o caminho NÃO é (necessariamente) completar o
port — é resolver os 3 outliers específicos.

---

## 2. Estratégia em 3 frentes paralelas

### Frente A — Numérica 94% → 99% (3-4 semanas)
**Métrica:** PJCs no corpus dentro de ±5% / total

#### Sprint A1: Resolver outliers grandes (5-7 dias)
- **Foco:** PROCESSO_00008567 (-11.24%) e PROCESSO_10004617 (-15.83%)
- **Causa raiz:** principal_corrigido + juros_mora pré-ADC58
- **Tasks:**
  1. Comparar engine v3 vs Java em 12 períodos pré-ADC58 (2010-2014)
  2. Identificar drift na composição IPCA-E + TR + SELIC + JAM
  3. Investigar ordem de aplicação: correção primeiro vs juros primeiro
  4. Validar Súmula 381 TST (correção começa no mês subsequente)
  5. Aplicar fix mínimo + rodar calibrate inteiro (nada pode regredir)

#### Sprint A2: Resolver outlier menor (2-3 dias)
- **Foco:** PROCESSO_00004939 (+4.31% via inssReclamante -2.34%)
- **Tasks:**
  1. Diff INSS reclamante engine vs Java na mesma competência
  2. Ver se faixas progressivas estão alinhadas (provavelmente edge case)
  3. Fix isolado

#### Sprint A3: Expandir corpus 52 → 150 PJCs (3-5 dias)
- Buscar mais PJCs em decisões públicas TRT
- Casos famosos: Súmula 6 TST, Lei 13.467/17 transição, ADC 58/EC 113
- Pega 100 novos. Calibrate roda neles. Fix-bug iterativo.
- **Critério aceite:** 99% dos 150 PJCs em ±5%

---

### Frente B — Código 72% → 99% (5-6 semanas)
**Métrica:** LOC TS port / LOC Java por componente

#### Sprint B1: IRPF core completo (1.5-2 sem)
- 24% → 99% = ~1500 LOC port
- liquidar() regime competência (Java 1300+)
- liquidarAtualizacao com ProporcoesIrpf real
- aplicarPagamento + OcorrenciaDeIrpfPagamento
- aplicarPagamentoNoSaldo

#### Sprint B2: INSS core completo (1 sem)
- 38% → 99% = ~1000 LOC
- liquidarInssSobreSalariosPagos + Devidos full
- aplicarPagamento INSS
- OcorrenciaDeInssSobreSalariosDevidosAtualizacao (Lei 11.941)

#### Sprint B3: CartaoPonto core completo (1.5 sem)
- 17% → 99% = ~1200 LOC
- montarTurnos + aplicarTolerancias Lei 13.467/17
- HE primeiro/demais/descanso/feriado/sabadoDomingo blocos
- Adicional noturno hora reduzida 52'30"
- Supressão Art.253 CLT
- Banco de horas

#### Sprint B4: Calculo + Pagamento finais (1 sem)
- Calculo 70 → 99% (~890 LOC)
- Pagamento 50 → 99% (~800 LOC)
- ApuracaoDeJuros entidade do zero (~500 LOC)

---

### Frente C — Validação Contínua (paralelo desde dia 1)
**Métrica:** zero regressão a cada commit

#### Diário
- CI roda calibrate em cada PR — falha se cair de 94%
- Bot publica diff de % delta por commit no Slack/equivalente
- Vitest 1388+ obrigatório

#### Semanal
- Diff numérico engine v3 ↔ Java decompilado em **1000 cenários sintéticos**
  (gerados por property-based testing com fast-check)
- Reportar % bate em <0.01

#### Quinzenal
- 5 casos públicos famosos (decisões TST publicadas) rodados manualmente
- Comparar com decisões transitadas em julgado

---

## 3. Reforços fora da caixa

### 3.1 Differential testing automatizado (alta alavancagem)
- Decompilar PJe-Calc Java oficial em JAR rodável
- Wrapper Node `child_process.execSync('java -jar pjecalc.jar caso.json')`
- 1000 cenários sintéticos aleatórios → comparar engine TS × engine Java
- Bug-fix dirigido por divergência numérica > 0.1%
- **Custo:** 2-3 dias setup. **ROI:** descobre bugs sutis em minutos.

### 3.2 AI-assisted port (Claude + revisão humana)
- Gerar primeiro draft do port Java→TS método a método via Claude API
- Tempo médio Java→TS manual: ~30min/método. Com AI: ~10min (revisão).
- Aplicar nas Sprints B1-B4 (5900 LOC restantes)
- **Estimativa:** corta cronograma de 6→3 semanas

### 3.3 Property-based testing com fast-check
- Invariantes que SEMPRE devem valer:
  - `total_devido = principal + juros + correcao - deducoes`
  - `liquido_reclamante <= bruto_reclamante`
  - `inss_segurado <= teto_inss`
  - `ir_retido >= 0`
- 100 props × 1000 cenários cada = 100k testes automáticos
- Falha = bug imediato

### 3.4 Tela de diff visual no produto (UX premium)
- Usuário vê "Engine MRD: R$ 32.156 | PJe-Calc oficial: R$ 32.198 (Δ +0.13%)"
- Cada divergência > 0.5% gera ticket automático
- Comunidade ajuda a achar bugs (crowdsourced QA)

### 3.5 Bug bounty interno
- R$ 100-500 por divergência > 1% achada
- Times comerciais e jurídicos da empresa testam ativamente
- Casos pré-ADC58, transição EC 113, RRA: alvos prioritários

### 3.6 Especialista PJe-Calc contratado (1-2 sprints)
- Profissional com 10+ anos de PJe-Calc Java
- Revisa Sprints A1 (correção monetária) e B1 (IRPF)
- **Custo:** R$ 8-15k. **Ganho:** evita meses de bug hunting

### 3.7 PJe-Calc Cidadão (TRT8) como referência
- Aplicação web oficial pública: https://pje-calc.cidadao.trt8.jus.br
- Comparar resultados em casos test
- Dataset adicional para calibrate

### 3.8 Casos com decisão transitada em julgado
- 30 ações trabalhistas com sentença + cálculo PJe-Calc juntados
- Pegar via portal TRT (decisões públicas)
- Peso jurídico forte: se MRD bate sentença, defesa em juízo é trivial

---

## 4. Cronograma realista (2 cenários)

### Cenário X — equipe atual + Claude (8-10 semanas)
| Semana | Frente A | Frente B | Frente C |
|---|---|---|---|
| 1 | Sprint A1 outliers grandes | Setup AI port + B1 IRPF início | CI calibrate + property testing |
| 2 | Sprint A1 fix + validação | B1 IRPF — liquidarAtualizacao | Diff testing setup |
| 3 | Sprint A2 outlier menor | B1 IRPF — aplicarPagamento | 1000 cenários sintéticos |
| 4 | Sprint A3 expandir corpus | B2 INSS core | Bug bounty interno start |
| 5 | A3 corpus 100 PJCs novos | B2 + B3 CartaoPonto setup | 5 casos públicos |
| 6 | A3 calibrate 99% | B3 CartaoPonto turnos+HE | |
| 7 | — | B3 CartaoPonto Art.253 + DSR | |
| 8 | — | B4 Calculo+Pagamento finais | |
| 9 | Validação geral | ApuracaoDeJuros entidade | |
| 10 | Lançamento 99% | Polish + tela de diff visual | |

**Resultado:** calibrate 99% + código port ~95-99%

### Cenário Y — equipe atual + especialista contratado (5-6 semanas)
- Especialista pega Sprint A1 (correção monetária) — sai em 1 semana
- Time + Claude paralelo nas Frentes B+C
- Especialista revisa Sprint B1 IRPF na semana 3
- **Custo extra:** ~R$ 10-15k
- **Ganho:** corta 4 semanas

---

## 5. Riscos honestos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Outlier 00008567/10004617 ser bug profundo (não fix simples) | ALTA | Atrasa Frente A em 2 sem | Ter especialista PJe-Calc backup |
| AI port Java→TS gerar código sutil errado | MÉDIA | Bug oculto em produção | Revisão humana 100% + property testing |
| Calibrate caindo de 94% durante port | MÉDIA | Regressão | CI bloqueia merge se cair |
| PJe-Calc Java não ter JAR rodável extraível | MÉDIA | Frente C 3.1 falha | Fallback: 5 casos manuais por sprint |
| Equipe distrair em features novas | ALTA | Cronograma estoura | Lock no roadmap até 99% |
| Casos novos do corpus quebrarem assumptions | ALTA | A3 demora mais | Aceitar 95-97% intermediário |

---

## 6. Critérios de "99%" rigorosos

Para declarar **99% de paridade**:

### Numérica
- ✅ 99% dos PJCs no corpus dentro de ±2% (não ±5%)
- ✅ Em diff testing 1000 cenários sintéticos, diff médio < 0.01%
- ✅ 5 casos públicos famosos batem 100%

### Código
- ✅ ≥99% LOC TS coverage vs Java por componente crítico
- ✅ Cada `MaquinaDeCalculo*` core tem `liquidar`/`aplicarPagamento` real (sem TODO)
- ✅ Phase 9 Pagamento + ApuracaoDeJuros 100% portados

### Qualidade
- ✅ 0 `as any` em arquivos de cálculo financeiro (51 → 0 hoje 51 são em UI)
- ✅ Vitest 100% pass + coverage > 85% nos engines core
- ✅ TypeScript strict + ESLint 0 warnings em src/lib/pjecalc/

---

## 7. Próximos passos imediatos (esta semana)

**Se quer começar HOJE:**

1. **Disparar Sprint A1** (correção monetária pré-ADC58)
   - Agente CEREBRO investiga PROCESSO_00008567/10004617 em profundidade
   - Hipóteses: ordem aplicação correção/juros, Súmula 381, fator JAM
   - Output: 1 commit com fix + calibrate 96-97% (vs 94% hoje)

2. **Setup property-based testing** (paralelo)
   - Adicionar fast-check
   - 20 properties em src/lib/pjecalc/__tests__/properties.test.ts
   - Output: 20 testes que rodam 1000 cenários cada

3. **Setup CI calibrate gate**
   - GitHub Action que roda `npx tsx scripts/calibration-pipeline-v3.ts`
   - Bloqueia merge se média cair de 94%

**Se quer cenário Y (especialista):**
- Buscar pessoa via LinkedIn/freelance: "PJe-Calc TRT8 v2.15 BigDecimal correção monetária"
- Orçamento R$ 10-15k para 2 sprints

---

## 8. O que eu **não vou prometer**

- **99% absoluto não é exato.** Será 99.0-99.5%. Pode ter 1 caso atípico (espólio + insalubridade + morte por acidente — combinação rara) que persistirá em 0.5%.
- **Cronograma 8-10 semanas é COM foco total.** Se o time fizer outras features em paralelo, será 12-14.
- **AI port pode introduzir bugs.** Property testing pega o grosso, mas algum bug em edge case pode passar 1-2 sprints até ser detectado.
- **Sprint A1 pode falhar como Sprint 4 falhou.** Hipóteses precisam ser testadas. CEREBRO pode refutar hipótese e exigir nova investigação.

---

## 9. Decisão a tomar agora

Escolha um:

**(a) Cenário X — equipe + Claude, 8-10 sem, R$ 0 extra**
**(b) Cenário Y — equipe + Claude + especialista contratado, 5-6 sem, R$ 10-15k**
**(c) Híbrido — começar X, contratar especialista se Sprint A1 trancar**

Recomendação honesta: **(c)** — começar X já. Se em 1 semana Sprint A1 não destravar correção monetária, contratar especialista para esse ponto específico (R$ 5k focal).

A diferença entre 94% e 99% calibrate é **5 pontos**, mas representa **resolver 3 casos específicos + ampliar corpus**. Não é trabalho impossível — é trabalho focal e pode ser feito.
