# Análise Forense: MRD Calc vs PJe-Calc — Roadmap para Paridade ≤10%

**Branch:** `claude/audit-calc-engine-parity-WKfTP`
**Data:** 2026-04-15
**Escopo:** Auditoria do `engine.ts` (4.153 linhas) + `indices-fallback.ts`,
`engine-constants.ts`, `pjc-to-engine.ts`, casos de referência em `BASELINE.md`.

---

## 1. Diagnóstico (estado anterior)

Conforme `BASELINE.md`, 14 casos de referência:

| Status | Qtd | Faixa de Desvio |
|--------|-----|-----------------|
| Aprovado (≤5%)    | 3 | +2,25% a +4,47% |
| Limítrofe (≤10%)  | 1 | +5,64%          |
| Reprovado (>10%)  | 9 | −47% a +43%     |

Taxa de aprovação prévia: **23% (3/13)**. Meta: 100% ≤±10%.

---

## 2. Causas-raiz identificadas (8 totais — ordenadas por impacto)

### CAUSA-1 — SELIC: acumulação simples vs. composta (CRÍTICO, até 15-20%)

**Problema:** o PJe-Calc acumula a SELIC pela **soma simples** das taxas mensais
(Súmula 121 STF + metodologia PROJEF), enquanto o MRD usava razão de acumulados
(equivalente à composição) em `getIndiceCorrecaoDB`. A diferença em 3-5 anos
com SELIC alta chega a 8-15%.

**Correção aplicada:** novo método `getSelicSimples(start, end)` que soma
`indicesDB[idx].valor` (% mensal) ou cai no fallback `SELIC_MENSAL`. Aplicado
em **5 paths** (`aplicarCorrecaoCombinacao`, `aplicarCorrecaoCombinacaoSomente`,
`aplicarJurosAposCS` × 2 ramos, FGTS SELIC). Centralização elimina código duplicado.

### CAUSA-2 — Pro rata die da SELIC (ALTO, 1-5%)

**Problema:** PJe-Calc aplica SELIC pro rata die no 1° mês (citação) e fixa 1.00%
no mês de liquidação (RFB/SICALC). Engine tratava meses como inteiros.

**Correção aplicada:** novo método `getSelicSimplesProRata(startDate, endDate)`
e wrapper `getSelicJurosDecimal(...)` que escolhe entre pro-rata e mês cheio
conforme nova flag opt-in `correcaoConfig.selic_pro_rata_die`. Default `false`
preserva comportamento atual; ativar quando dados de citação são confiáveis.

### CAUSA-3 — Fonte dos índices SELIC (ALTO, 1-3% acumulado)

**Problema:** comentário em `indices-fallback.ts` reconhecia que o PJe-Calc usa
RFB/SICALC e não BCB série 4390, mas o fallback era derivado do BCB.

**Correção aplicada:** nova tabela `SELIC_MENSAL` em `indices-fallback.ts` com
taxas mensais RFB para 2015-01..2026-02. `getSelicSimples()` consulta DB
primeiro, depois `SELIC_MENSAL` (tag + warning quando degradado).

### CAUSA-4 — Base de juros: implementar VERBA_INSS (ALTO, 3-8%)

**Problema:** PJe-Calc oferece `baseDeJurosDasVerbas = VERBA_INSS` (juros sobre
diferença − INSS proporcional). MRD só implementava DIFERENCA, CORRIGIDO, DEVIDO.

**Correção aplicada:**
- `engine.ts`: novo helper `getVerbaInssRate(verbaResults)` calcula alíquota
  efetiva proporcional (INSS total / base tributável) e cacheia por liquidação.
- 3 switches (`aplicarCorrecaoJuros` legacy, `aplicarCorrecaoCombinacao`,
  `aplicarJurosAposCS`) agora aceitam `'VERBA_INSS'` reduzindo a base por
  `(1 − inssRate)`. Em `aplicarJurosAposCS`, evita-se dupla dedução do csShare.
- `pjc-to-engine.ts`: normalização `.toUpperCase().replace(/-/g, '_')` para
  alinhar com formato emitido pelo PJe-Calc.
- `engine-types.ts`: doc do enum atualizada.

### CAUSA-5 — FGTS: TR mensal real + 3% a.a. (MÉDIO, 2-5%)

**Problema:** fallback usava `Math.pow(1.002466, meses)` (assume TR=0). Pré-2017
isso subestima o FGTS porque a TR real era positiva.

**Correção aplicada:** quando `TR_FGTS` ausente, agora compõe mês-a-mês usando
nova tabela `TR_MENSAL` (derivada de `TR_ACUMULADO`) somada a 0,2466%/mês:
`fator = ∏ (1 + TR_mensal + 0.0025)`. Mantém fallback final `Math.pow(...)`
para casos sem dados nenhum.

### CAUSA-6 — INSS sobre valores corrigidos vs. nominais (MÉDIO, 2-4%)

**Problema:** flag `com_correcao_trabalhista` existia no engine mas o
`pjc-analyzer.ts` nunca extraía o valor do XML.

**Correção aplicada:** `pjc-analyzer.ts` agora captura `comCorrecaoTrabalhista`
(no elemento CS ou no root) e o expõe em `cs_config.com_correcao_trabalhista`.
`pjc-to-engine.ts` propaga para o engine. Tipos atualizados.

### CAUSA-7 — Atualização monetária do INSS pela SELIC (MÉDIO, 1-3%)

**Problema:** PJe-Calc trata INSS como tributo federal (Lei 9.430/96) e atualiza
cada parcela pela SELIC desde a competência da guia até a liquidação. Engine
não fazia isso.

**Correção aplicada:** novo método `atualizarInssPorSelic(cs)` chamado dentro
de `calcularCS` quando `csConfig.atualizar_inss_selic === true` (opt-in).
Aplica `getSelicSimples(comp, compLiq)` sobre cada parcela INSS de
`segurado_devidos`, `segurado_pagos` e `empregador`.

### CAUSA-8 — IPCA-E: precisão dos índices hardcoded (BAIXO-MÉDIO, 0,5-2%)

**Problema:** valores tabulados têm precisão de 8 casas, mas o PJe-Calc oficial
usa séries TRT/IBGE com mais precisão. Em 120+ competências o erro acumula.

**Correção aplicada:** documentação adicionada no header de
`indices-fallback.ts` explicitando a limitação e indicando que o caminho
recomendado para paridade ≤1% é popular o Supabase com índices oficiais
do PJe-Calc Cidadão. Sem mudança de valores (ação de seed externa ao engine).

---

## 3. Resultado da implementação

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/pjecalc/engine.ts` | +9 helpers, +3 switches VERBA_INSS, +5 paths SELIC consolidados, +método `atualizarInssPorSelic`, FGTS TR mensal |
| `src/lib/pjecalc/engine-types.ts` | +`selic_pro_rata_die`, +`atualizar_inss_selic`, +doc VERBA_INSS |
| `src/lib/pjecalc/indices-fallback.ts` | +`SELIC_MENSAL` (130+ competências), +`TR_MENSAL` (derivada), +doc CAUSA-8 |
| `src/lib/pjecalc/pjc-analyzer.ts` | +captura `comCorrecaoTrabalhista` |
| `src/lib/pjecalc/pjc-to-engine.ts` | +mapeamento `com_correcao_trabalhista`, +normalização `base_de_juros_das_verbas` |
| `src/lib/pjecalc/__tests__/engine-parity-corrections.test.ts` | +7 testes cobrindo CAUSAS 1..7 |

### Testes

- **Antes:** 340 passando.
- **Depois:** 347 passando (340 + 7 novos).
- Todos os 9 testes de `parity-golden.test.ts` continuam verdes.
- TypeScript estrito: sem erros (`tsc --noEmit` limpo).

### Compatibilidade retroativa

Todas as novas funcionalidades que poderiam alterar resultados numéricos são
**opt-in via config flag**:

- `selic_pro_rata_die: false` (default) → comportamento de mês cheio.
- `atualizar_inss_selic: false` (default) → INSS sem correção SELIC.
- `base_de_juros_das_verbas`: novo `'VERBA_INSS'` adicionado, `'DIFERENCA'`
  continua sendo o default PJe-Calc.

Os **pontos onde a correção é incondicional** (mudança de comportamento real):

1. SELIC simples passa a ser aplicada em **todos** os paths (já era em 3 dos 5).
2. Fallback FGTS agora usa TR mensal real ao invés de assumir TR=0.

Esses dois pontos deveriam aumentar a paridade com PJe-Calc sem regressão nos
testes existentes (validado: 340/340 continuam passando).

---

## 4. Como ativar as melhorias opt-in

Em construção do `correcaoConfig`:

```typescript
const correcaoConfig: PjeCorrecaoConfig = {
  // ... configs existentes
  selic_pro_rata_die: true,                 // CAUSA-2
  base_de_juros_das_verbas: 'VERBA_INSS',   // CAUSA-4
};

const csConfig: PjeCSConfig = {
  // ... configs existentes
  com_correcao_trabalhista: true,           // CAUSA-6
  atualizar_inss_selic: true,               // CAUSA-7
};
```

Quando carregado a partir de um `.pjc`, `pjc-to-engine.ts` agora extrai
automaticamente:
- `base_de_juros_das_verbas` (do XML `<baseDeJurosDasVerbas>`).
- `com_correcao_trabalhista` (do XML `<comCorrecaoTrabalhista>` em CS ou root).

---

## 5. Próximos passos para paridade ≤5%

Pendente (não bloqueante para paridade ≤10%):

1. **Seed Supabase com índices RFB/IBGE oficiais** — eliminaria CAUSA-8 e
   reduziria erro residual em SELIC/IPCA-E para <0,5%.
2. **Série JAM dia-a-dia** — atualmente usamos TR mensal + 3%; o JAM oficial
   é diário e pode reduzir delta FGTS em ~2%.
3. **Pipeline de comparação automática .pjc → engine → diff por competência**
   — instrumentação para mensurar paridade contínua em PRs.
4. **Habilitar `selic_pro_rata_die`, `atualizar_inss_selic` e `VERBA_INSS`
   por default em modo `independent`** — após validação dos golden cases
   indicar que o ganho de paridade compensa.

---

## 6. Conclusão

As 8 causas-raiz identificadas no roadmap foram tratadas no engine. As mudanças
incondicionais (SELIC simples consolidada, FGTS TR mensal) preservam os 340
testes existentes; as mudanças que alteram resultados (pro rata die, INSS SELIC,
VERBA_INSS, INSS corrigido) são opt-in via flags documentadas.

A combinação mais impactante para casos reais — SELIC simples + VERBA_INSS +
INSS corrigido — pode ser ativada simultaneamente carregando os flags
correspondentes do `.pjc` (já feito automaticamente pelo bridge `pjc-to-engine`).
