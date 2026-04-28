# Inventário Completo — Análise Profunda dos Gaps Pendentes

> **Data:** 2026-04-26
> **Método:** 6 agentes especializados em paralelo (Java + web + corpus PJCs)
> **Caso âncora:** antonio-harley + cruzamento com 13 outros PJCs

## Sumário executivo

Foram investigados **9 itens pendentes** declarados como "não feitos". A
análise revelou **1 BUG CRÍTICO** que explica os maiores gaps do calibrate
(tiago +19%, leandro +10%, joseli +8%, francisco +7%) — totalmente
corrigível. Os demais itens variam de "trivial" a "estrutural aceitável".

## Resultados por item

### 🔴 P0 — BUG CRÍTICO descoberto

#### **D5 — Juros mora: dupla contagem (double-counting)**
- **Sintoma:** engine reporta `juros_mora = 8 074,19` para antonio quando
  Java espera ≈ 4 964. Diff +62,6% no antonio. Em tiago essa multiplicação
  vira +62 427 = 19,45% overshoot do `total_reclamada`.
- **Causa raiz:** engine aplica juros sobre `diferenca_corrigida` (já
  multiplicada pelo IPCA-E) E acumula 1%/mês simples sobre o nominal —
  **duplica fatores**.
- **Java correto:** cada `<ApuracaoDeJuros>` tem `taxaDeJuros` própria; juros
  = `(valor_corrigido − cs_normal − cs_13) × taxaDeJuros/100`. Total Java
  para antonio ≈ 4 964.
- **Impacto:** explica TODOS os overshoots de `total_reclamada` no calibrate
  (tiago, leandro, joseli, francisco, rosicleia, leide, etc.)
- **Fix:** ~2–4h. Refatorar cálculo de juros em `engine-v3.ts` para aplicar
  taxa por competência sobre base pos-INSS, sem duplicar correção.
- **Ref Java:** `Calculo.java:2425-2434` (`getTotalDeJurosDaApuracaoDeJuros`),
  `ApuracaoDeJuros.java:252` (`getJuros()`)

### 🟠 P1 — Alta prioridade (fechamento real)

#### **E2 — Tabela SELIC INSS RFB hardcoded** (resolve D3 também)
- **Sintoma:** SELIC TS (overnight Bacen) é ~0,07pp/mês maior que SELIC INSS RFB
  (taxa específica para débitos previdenciários). Em 60–120 meses acumula
  ~3–6% de divergência → INSS gap de 1.84% médio (e residual −0,47% no antonio).
- **Java:** usa `JurosSelicInss.obterTodosPorPeriodo()` que consulta tabela RFB.
- **Engine:** usa `TABELA_SELIC_MENSAL` hardcoded (overnight Bacen) — comentado
  no próprio código como "substituir por dados reais".
- **Plano:** extrair tabela SELIC INSS RFB de fontes secundárias (CFC, Contábeis)
  + complementar 2005–2021 + integrar em `tabela-de-juros-de-inss.ts` com fallback.
- **Impacto:** redução estimada ~80% do gap INSS (1.84% → 0.1–0.3%).
- **Fix:** ~4–5h.

#### **D2.NF1 — `tipoCobrancaReclamante` (DESCONTAR_CREDITO / COBRAR)**
- **Sintoma:** 6 PJCs do corpus declaram `DESCONTAR_CREDITO` (atual comportamento
  default), 0 declaram `COBRAR`. Engine atual hardcoded para DESCONTAR_CREDITO
  via `devedor='reclamante' → contratuais → deduz líquido`.
- **Impacto:** se algum cliente futuro tiver `COBRAR`, engine calcula errado
  (descontaria do líquido em vez de cobrar à parte).
- **Fix:** trivial (~1–2h). Adicionar enum + mapper no parser/adapter,
  `Honorario.tipo_cobranca: 'DESCONTAR_CREDITO' | 'COBRAR'`. Engine: se COBRAR,
  não soma a `honorariosContratuais` (vai para totalizador "à parte").
- **Ref Java:** `TotalizadorDeHonorario.java:39-40`

#### **D2.NF3 — Correção do honorário (`dataVencimento → dataLiquidacao`)**
- **Sintoma:** **caso real existe** — izabela-cristina tem honorário com
  `dataVencimento` 14 meses anterior à `dataLiquidacao` (430 dias).
  IPCA-E acumulado nesse período ≈ 8–10%, ou seja R$ 5 000 → ~R$ 5 400.
  Engine atual NÃO aplica essa correção.
- **Java:** `MaquinaDeCalculoDeHonorarios.java:34-55` aplica
  `TabelaDeCorrecaoMonetaria` quando `dataVencimento < dataLiquidacao`.
- **Fix:** ~2–3h. Parser já lê `<dataVencimento>` e `<indiceCorrecaoHonorario>`.
  Engine: aplicar `valor × indice_correcao` no resumo.
- **Ref Java:** `Honorario.java:477-479` (`getValorCorrigido`)

### 🟡 P2 — Média prioridade

#### **E1 — FGTS port (parcial CRÍTICO+ALTO)**
- **Sintoma:** engine TS atual (132 linhas) calcula 8% × diferença + JAM 3%aa
  simplificado. Java original (~2 480 linhas em 15-18 classes).
- **Componentes faltantes** (ordem de impacto):
  - **CRÍTICO**: ocorrências mês-a-mês via histórico salarial (~6-8h)
  - **CRÍTICO**: IPCA-E + JAM combinados (não só JAM) (~4-5h)
  - **ALTO**: deduzir operações pré-existentes (`deduzirDoFGTS`) (~3-4h)
  - **MÉDIO**: juros FGTS (`TabelaDeJurosDeFgts`) (~2-3h)
  - **MÉDIO**: Multa Art. 477 CLT (~1-2h)
  - **BAIXO**: Indenização Art. 9º Lei 7.238/84 (~1h)
- **STF Tema 1107**: a partir 1/2025, FGTS por **IPCA mínimo** (não TR) —
  precisa contemplar
- **Estimativa total** (só CRÍTICO+ALTO+MÉDIO): **~14–18h** dos 23–31h totais
- **Impacto:** subavaliação 15–25% em casos com FGTS complexo (joseli 50k gap)
- **NÃO IGNORAR**: LC 110 0,5% (extinto 2020) — pode remover quando refatorar

#### **D2.NF4 — IRPF sobre honorário (`apurarIRRF`)**
- **Sintoma:** 0/14 PJCs ativam IRRF (todos `apurarIRRF=false`). Mas o engine
  parseia mas não calcula — se algum cliente marcar a opção, engine ignora.
- **Java:** `MaquinaDeCalculoDeHonorarios.java:89-115` faz tabela progressiva
  (PF) ou 1,5% fixo (PJ).
- **Recomendação:** implementar UI + cálculo (~2-3h) por consistência mesmo
  com 0% no corpus, pois é legalmente obrigatório.
- **Impacto monetário:** zero hoje (nenhum PJC dispara), mas evita risco
  futuro.

### 🟢 P3 — Estrutural / aceitar

#### **D3 — INSS residual −0,47%** ← resolvido por E2
- Será fechado quando E2 for aplicado (mesma raiz: SELIC INSS RFB)
- Agente confirmou: viés sistemático de ~0,78pp na taxa acumulada → 0,47%
  no INSS final

#### **D4 — `principal_corrigido` +0,30%**
- **Causa:** índices IPCA-E hardcoded em `indices-fallback.ts` com 8 casas
  decimais; Java usa BigDecimal com escala 25
- **Fix possível:** migrar `IPCA_E_ACUMULADO` para série oficial TRT/IBGE
  com 10+ casas (CAUSA 8 do roadmap original)
- **Decisão:** ACEITAR como estrutural por enquanto. +0,30% está dentro
  de qualquer tolerância prática. Foco maior está em D5.

#### **D2.NF2 — VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL (VNP)**
- 0/14 PJCs usam essa base. Caso obscuro (verbas indenizatórias selecionadas
  manualmente). Adiar.

## Plano de execução proposto

### Fase 1 — BUG fix (P0)
1. **D5** — Juros mora double-counting (~2-4h) ← **MAIOR IMPACTO**
   - Resolve overshoots de tiago/leandro/joseli/francisco
   - Calibrate cai de ~+5% médio para ~+1-2% médio (estimado)

### Fase 2 — Fechamento alto-impacto (P1)
2. **E2** — Tabela SELIC INSS RFB (~4-5h)
   - INSS gap 1.84% → 0.1–0.3%
   - Fecha automaticamente D3
3. **D2.NF1** — `tipoCobrancaReclamante` (~1-2h)
   - Paridade total com Java
4. **D2.NF3** — Correção honorário (~2-3h)
   - Resolve izabela-cristina (430 dias defasagem)

### Fase 3 — FGTS estrutural (P2)
5. **E1** — Port parcial FGTS (~14-18h)
   - Subdividir em sub-fases:
     - 5a: ocorrências mês-a-mês (~6-8h)
     - 5b: IPCA-E + JAM (~4-5h)
     - 5c: operações deduzir (~3-4h)
6. **D2.NF4** — IRPF honorário (~2-3h)

### Fase 4 — Aceitar/adiar (P3)
- D3: resolvido por E2 ✓
- D4: aceitar (~0,30%, estrutural)
- D2.NF2: adiar (0% no corpus)

## Estimativa total

| Fase | Itens | Horas | Impacto esperado |
|------|-------|-------|------------------|
| 1 | D5 | 2–4h | Calibrate +5% → +1-2%, fecha tiago/joseli/francisco |
| 2 | E2 + D2.NF1 + D2.NF3 | 7–10h | INSS 1.84% → 0.2%, paridade honorários |
| 3 | E1 (parcial) + D2.NF4 | 16–21h | FGTS preciso, IRPF cobrindo edge cases |
| **Total** | **6 itens** | **25–35h** | **Calibrate ≤1% médio** |

D2.NF2 e D4 ficam como dívida técnica documentada.

## Recomendação imediata

**Começar pelo D5 (bug crítico) AGORA.** É o item de maior impacto-por-hora
e resolve o problema mais visível do calibrate. Aplicar fix, validar com
planilha antonio (deve manter +0,2%) e rodar calibrate completo para
confirmar que tiago/joseli/francisco baixam para ±2%.

Após D5 fechado, escolher se segue com E2 (SELIC INSS) ou D2.NF1
(tipoCobrancaReclamante) — ambos são quick wins.
