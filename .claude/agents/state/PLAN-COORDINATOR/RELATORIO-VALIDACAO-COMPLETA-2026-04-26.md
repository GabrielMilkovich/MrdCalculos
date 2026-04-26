# Relatório Consolidado — Fase de Validação P0-P9

> **Data:** 2026-04-26
> **Método:** validação pessoal (não confiar cegamente em agentes)
> **Caso âncora:** antonio-harley + matriz com 13 outros PJCs

## Resumo executivo

Após validar pessoalmente todos os achados, descobri que **vários relatórios
de agentes estavam imprecisos**. A realidade é mais simples e mais
gerenciável do que o cenário pintado:

- **Engine atual já está mais próximo da paridade Java do que aparentava**
- O "calibrate +5,20% médio" é parcialmente **artefato de comparação errada**
- Tem 1 bug real no cálculo de juros + 1 limitação estrutural no FGTS
- Outros gaps são pequenos ou inexistentes

## Achados-chave por validação

### P0 — Critério de aceitação
Tolerâncias definidas: INSS por comp ±0,1%, INSS total ±0,5%, juros ±2%,
FGTS ±2%, IR ±1%, LE/total_reclamada ±0,5%. Documentado em
`P0-CRITERIO-ACEITACAO.md`.

### P1 — Triagem dos 14 PJCs
Resultado:
- **8 confiáveis**: antonio, carla, caso-real-v2, islan, izabela, leide,
  roque, vanderlei (LE = PC + juros + FGTS, FGTS implícito positivo)
- **6 INDETERM**: francisco, joseli, leandro, rosicleia, tiago, pyter
  (FGTS implícito NEGATIVO — significa LE < PC + juros, possivelmente
  snapshot intermediário)
- **0 STALE puros** (LE = val_corr exato)

→ Para validar fixes, usar os 8 confiáveis como ground-truth.

### P2 — Teste de juros (BUG REAL identificado)

Comparação por competência antonio: Java espera `juros = (val_corr − cs) × taxa`,
engine usa `juros = dif_NOMINAL × (1 − INSS_eff) × pctJurosCombinado`.

| Aspecto | Java | Engine |
|---------|------|--------|
| Base | val_corrigido (com IPCA-E) | dif nominal (sem IPCA-E) |
| Taxa | unificada (SELIC do período juros) | segmentada (TR-Simples + SELIC) |
| Resultado antonio | 9 741,87 | 8 074,19 (**−17,12%**) |

**Causa raiz**: `engine-v3.ts:507` usa `oc.getDiferenca()` (nominal) em vez
de `oc.getDiferencaCorrigida()` (com IPCA-E aplicado).

Validação matemática: se engine usar Java exato:
`29 897 × 0,9338 × 0,3458 = 9 657 → diff vs Java −0,87% ✓`

**Fix proposto**: 1 linha — trocar `diferenca` por `valorCorrigido` na linha 507.
Estimativa: 30 min + testes (2-3h total).

### P3 — IPCA-E TS vs oficial

`IPCA_E_ACUMULADO` no `indices-fallback.ts` está **adequado** para o uso
atual (combinacoes_indice = IPCA-E até ajuizamento + SEM_CORRECAO depois).
Gap +0,30% no PC corrigido vem de precisão Decimal.js × 20 vs Java
BigDecimal × 25 — estrutural, não-bloqueante.

### P4 — Auditoria do parser

O parser **NÃO lê** vários campos do XML:

**Campos críticos faltantes:**
| Campo | Antonio | Default engine | Risco |
|-------|---------|---------------|-------|
| `<limitarTeto>` | false | true (assume) | Casos com salário > teto INSS calc errado |
| `<aliquotaSeguradoFixa>` | null | progressivo (ok) | Casos contribuinte avulso/individual |
| `<aplicarJuros>` (Honorário) | false | nada | Honorários antigos com juros podem estar errados |
| `<deduzirDoFGTS>` | false | false (ok) | Casos com saldo prévio não deduzido |
| `<recolhidoFGTS>` | false | false (ok) | OK em antonio |
| `<apartirDeLei11941>` | timestamp | sempre Lei 11941 | OK p/ PJCs modernos |
| `<aliquotaDoFgtsEnum>` | OITO_POR_CENTO | 8% (ok) | Casos aprendiz (2%) calc errado |
| `<incidirSobreJurosDeMora>` (IR) | false | false (ok) | OK |

→ Para casos atuais (PJCs modernos), os defaults coincidem. Mas há
risco em edge cases. Fix: estender parser, ~2-3h.

### P5 + P6 — FGTS via `<OcorrenciaDeFgts>`

**Achado crucial**: o XML do PJC **persiste FGTS por competência** com:
- `<baseVerba>` — valor sobre o qual incide FGTS no mês
- `<aliquota>OITO_POR_CENTO</aliquota>` — alíquota aplicada
- `<indiceAcumulado>` — fator de correção (IPCA-E + JAM combinados)
- `<taxaDeJuros>` — juros sobre FGTS

Para antonio, calculado direto do XML:
```
FGTS Java = Σ (baseVerba × 0,08 × indiceAcumulado × (1 + taxaDeJuros/100))
          = 2 020,36
Engine reporta = 2 042,50
Diff = +1,10% ← DENTRO da tolerância!
```

**Implicação**: o engine atual de FGTS (132 linhas) está **mais próximo
do Java do que pensávamos**. Para antonio bate em +1,10%.

A estimativa de 14-18h do agente E1 era **superestimada**. Para casos
similares ao antonio, o port atual basta. Refinamentos podem ser
incrementais.

**Plano alternativo para FGTS**: extrair `<OcorrenciaDeFgts>` do XML (quando
disponível) e usar como ground-truth. Quando não disponível, usar fórmula
atual. Esforço: 3-5h vs 14-18h do port completo.

### P7 — `data_ajuizamento` vs `data_citacao`

Java usa `dataAjuizamento` como base de juros (`TabelaDeJuros.java:60, 354, 361`).
Engine TS também (com fallback `data_citacao` opcional). Antonio só tem
`<dataAjuizamento>`. Sem caso de divergência no corpus.

**Não é problema crítico.**

### P8 — Versão Java

Source decompilado é v2.15.1 (`pjecalc-base-2.15.1.jar`). Corpus PJCs
2025-06 a 2025-10. Pode haver versão mais recente (CSJT publica
periodicamente), mas sem source para verificar mudanças. Aceitar v2.15.1.

### P9 — Matriz de cobertura

Features exercitadas pelos 14 PJCs:

| Feature | Cobertura | Casos |
|---------|-----------|-------|
| Regime PRE_ADC58 | ✓ 7 casos | antonio, caso-real, francisco, joseli, leandro, roque, vanderlei |
| Regime POS_ADC58 | **× 0 casos** | NÃO TESTADO |
| Regime TRANSICAO | ✓ 6 casos | carla, islan, izabela, leide, pyter, rosicleia, tiago |
| `destinoDoFgts=PAGAR` | ✓ 14 casos | TODOS |
| `destinoDoFgts=DEPOSITAR` | **× 0 casos** | NÃO TESTADO |
| `multa FGTS 40%` | ✓ 8 casos | carla, caso-real, joseli, leandro, pyter, roque, rosicleia, tiago, vanderlei |
| Sem multa FGTS | ✓ 5 casos | antonio, francisco, islan, izabela, leide |
| RRA (>12 meses) | **× 0 casos** | NÃO TESTADO |
| IR > 0 | ✓ 5 casos | francisco, joseli, leandro, rosicleia, tiago |
| IR = 0 | ✓ 9 casos | demais |
| Honorários ≠ 0 | ✓ 14 casos | TODOS |
| Multa 523 CLT | **× 0 casos** | NÃO TESTADO |
| Multa 467 CLT | ✓ 1 caso | carla |
| INSS reclamante | ✓ 13 casos (pyter sem) | quase todos |
| Pensão alimentícia | **× 0 casos** | NÃO TESTADO |
| Prev. privada | **× 0 casos** | NÃO TESTADO |
| Justiça gratuita | **× 0 casos** (não verificado) | INDETERMINADO |

**Gaps de cobertura**:
- **POS_ADC58** (regime puro pós ADC 58/59) — todos pré ou transição
- **destinoDoFgts=DEPOSITAR** — todos PAGAR
- **RRA art. 12-A** — nenhum caso > 12 meses
- **Multa 523 / Pensão / Prev. privada** — nenhum

→ Sugestão: pedir ao usuário PJCs reais que cubram essas features, ou
gerar manualmente para os 4 cenários faltantes.

## Plano de fix REVISADO (baseado em validações pessoais)

### Imediato (alta certeza, baixo risco) — ~6h

1. **D5-real** (juros base nominal → corrigida) — 30 min código + 1h testes
2. **D2.NF1** (tipoCobrancaReclamante) — 1h
3. **D2.NF3** (correção honorário izabela 430 dias) — 2h
4. **Calibrate**: trocar comparação para `total_reclamada eng vs (LE PJC +
   INSS_seg_nominal + IR)` para ser semanticamente correto — 30 min
5. **Parser**: estender para ler `<limitarTeto>`, `<aliquotaSeguradoFixa>`,
   `<aliquotaDoFgtsEnum>`, `<deduzirDoFGTS>` etc. — 1-2h

### Médio prazo (média certeza, média complexidade) — ~6-10h

6. **FGTS via `<OcorrenciaDeFgts>` direto** (alternativa ao port completo)
   — extrair quando disponível no XML, usar como input ao adapter para
   override por competência. Engine recalcula a partir disso. — 3-5h
7. **E2-SELIC INSS hardcoded** (extrair tabela RFB de fontes secundárias) — 4-5h

### Longo prazo (estrutural) — ~15-25h

8. **Port completo FGTS** (se cases sem `<OcorrenciaDeFgts>` precisarem) —
   apenas se o passo 6 não cobrir todos os casos
9. **Cobertura faltante** (POS_ADC58, DEPOSITAR, RRA, multa 523, pensão,
   prev privada) — gerar/buscar PJCs e validar

## Recomendação

Executar os passos 1-5 (imediatos, ~6h) **primeiro**. Após cada um, rodar
calibrate para ver evolução real. Os achados dessas execuções vão informar
se passos 6-8 são realmente necessários, ou se já chegamos no ±1% médio.

**Importante**: cada fix será feito com a metodologia "ler Java exato →
implementar → validar com planilha antonio → rodar 8 confiáveis". Sem
agentes para essa fase — validação direta minha.

## Sinceridade final

Esse plano de 6h **não promete 100%**. Promete:
- Calibrate sair de +5,20% médio para algo provavelmente entre +1% e +2%
- Engine reportar componentes individuais corretamente (juros, FGTS) —
  hoje as compensações entre erros mascaram problemas
- Comparação semanticamente correta no calibrate (atual compara peras com
  laranjas)
- Parser cobrindo features importantes que hoje passam batido

Para 100% real, precisará dos passos 6-9 + cobertura dos gaps de feature.
Estimativa total realista: **~30-40h** (revisada de 65-106h).

A revisão para baixo vem do achado P5: o engine FGTS já está mais próximo
do que pensávamos (+1,10% antonio). Não precisa port completo de
274+870+441+225 linhas. Pode ser refinamento incremental + uso de XML
como fonte.
