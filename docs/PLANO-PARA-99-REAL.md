# Plano REAL para 99% — Recursos que JÁ Temos

**Data:** 2026-04-29
**Branch:** main em `c54729e`
**Princípio:** ZERO recursos externos. Sem JAR Java. Sem especialista contratado. Sem AI externa paga. Só o que está no repo + Claude.

---

## Inventário REAL do que temos

### Corpus de validação
- **61 PJCs** com `<gprec>` (oracle Java pré-computado):
  - 46 em `PJC-TESTES-IDENPENDET/`
  - 12 em `docs/`
  - 14 em `dist/reports/` (alguns duplicados — ver real count)
- **35 prints PJe-Calc oficial** em `PINTRS PJE CALC/` (UI reference)

### Código de referência (read-only)
- **Java decompilado completo** em `pjecalc-fonte/` (~802 arquivos `.java`)
  - Inclui `MaquinaDeCalculo*` de todos os módulos
  - `TabelaDeCorrecaoMonetaria.java` (correção monetária)
  - `TabelaDeJuros*.java` (juros SELIC etc.)
  - `Calculo.java` (3087 LOC orquestrador)
  - `Pagamento.java` (1643 LOC)

### Tooling existente
- **Vitest:** 1388 testes verde, 0 falhas
- **Scripts calibrate:**
  - `scripts/pjc-oracle-compare.ts` — compara 12 campos por PJC
  - `scripts/calibration-pipeline-v3.ts` — corpus inteiro
  - `scripts/calibrate-compare-v1-v3.ts` — comparativo v1/v3
- **Engine v3** + verba-modules já em 94% calibrate

### Limitações honestas
- **Sem JAR Java rodável** — diff testing automatizado em runtime impossível
- **fast-check não instalado** (pip install pendente, mas grátis)
- **Corpus fixo em 61 PJCs** — não dá pra "buscar mais" sem trabalho humano
- **Java decompilado tem `void var6_12`** (CFR decompiler issue) em alguns métodos

---

## Diagnóstico real do gap 94→99%

A diferença entre 94% e 99% calibrate é matematicamente:
- **94%** = 49/52 PJCs em ±5% (3 outliers fora)
- **99%** = 60/61 PJCs em ±5% (no máximo 1 outlier)

Para chegar a 99% **com o corpus que temos**:
- Resolver os 3 outliers já catalogados em `docs/CALIBRATE-OUTLIERS.md`
- Verificar os 14 PJCs em `dist/reports/` (não rodados no calibrate atual)
- Aceitar ±5% em até 1 outlier persistente

**Não é "expandir corpus de 52 para 200"** como o plano anterior sugeria.
É **trabalhar nos 61 que temos**.

---

## Plano realista — 4 sprints sequenciais

### Sprint 1 — Diagnóstico microscópico dos outliers (3-5 dias)
**Hoje:** 3 outliers conhecidos:
- PROCESSO_00004939 (+4.31%)
- PROCESSO_00008567 (-11.24%)
- PROCESSO_10004617 (-15.83%)

**Tasks executáveis com Claude:**
1. Para cada outlier, rodar `pjc-oracle-compare.ts` com 12 campos
2. Identificar campo dominante (já feito em `docs/CALIBRATE-OUTLIERS.md`)
3. **Para CADA campo discrepante**, abrir o método Java correspondente em `pjecalc-fonte/` e fazer **comparação linha-a-linha** com o engine TS
4. Listar diferenças concretas: ordem de operações, casos especiais, datas-corte

**Saída:** documento `docs/SPRINT1-DIFF-LINHA-A-LINHA.md` com 3 seções (uma por outlier) listando:
- Trecho Java exato
- Trecho TS correspondente
- Diferença identificada
- Hipótese de fix

**Métrica:** identificar causa raiz com **prova textual**, não suposição.

---

### Sprint 2 — Aplicar fixes guiados pelo diff (2-3 dias por outlier)
Para cada outlier do Sprint 1:
1. Aplicar fix mínimo (não refatorar — só ajustar)
2. Rodar calibrate inteiro depois de cada fix (NÃO regredir os outros 49)
3. Se regrediu: REVERTER e voltar ao Sprint 1 com hipótese refinada

**Critério de sucesso por outlier:**
- Delta vai de >5% para <2%
- 49 PJCs continuam OK (engine não regride)

**Se 1 outlier persistir após 2 tentativas:** documentar em `docs/CALIBRATE-OUTLIERS.md` como "caso atípico aceito" e seguir.

---

### Sprint 3 — Rodar PJCs de `dist/reports/` (1-2 dias)
14 PJCs em `dist/reports/` que **não estão no calibrate-pipeline-v3 atual**.
Tasks:
1. Rodar `pjc-oracle-compare.ts` em cada um
2. Catalogar quais estão em ±5% e quais não
3. Adicionar ao corpus principal os que têm `<gprec>` válido

**Saída esperada:**
- Corpus passa de 52 → 60-65 PJCs
- Calibrate roda com mais cobertura
- Eventuais novos outliers descobertos viram Sprint 1-2 lite

---

### Sprint 4 — Property-based testing + CI gate (3-4 dias)
**Sem JAR Java**, validação contínua é via:
1. Instalar `fast-check` (npm install fast-check)
2. Definir 20 propriedades invariantes:
   - `liquido <= bruto`
   - `inss_segurado <= teto_inss_da_competencia`
   - `ir_retido >= 0`
   - `total_corrigido >= total_devido` (correção positiva)
   - `principal + juros + correcao - deducoes == liquido`
3. Cada propriedade roda 100-1000 cenários sintéticos
4. Falha = bug

**CI Gate:**
- GitHub Action que roda `npx tsx scripts/calibration-pipeline-v3.ts`
- Falha se média cair de 94%
- PR não merga sem passar

**Saída:**
- 20+ properties × 1000 = 20.000 testes automáticos
- Gate impede regressão futura

---

## O que NÃO está no plano (conscientemente)

- **Diff testing engine TS × Java JAR** — impossível sem JAR rodável
- **Corpus 200 PJCs** — só temos 61. Trabalhar com eles.
- **Especialista contratado** — não temos orçamento autorizado
- **AI port assistido** — Claude já está sendo usado, sem 3rd party
- **Tela de diff visual** — feature de UX, não move a agulha de paridade

---

## Frente B paralela — Code port (sem cronograma rígido)

Enquanto Frente A roda, código port avança em background:
- IRPF core 24% → 99%
- INSS core 38% → 99%
- CartaoPonto core 17% → 99%
- Calculo 70% → 99%
- Pagamento 50% → 99%
- ApuracaoDeJuros 0% → 99%

**Importante:** code port **NÃO move calibrate**. Engine v3 já bate 94% sem
ele. Code port é qualidade arquitetural, não numérica.

Prioridade de port (pelo impacto no caso de bugs futuros):
1. ApuracaoDeJuros entidade (afeta diff PROCESSO_00008567/10004617)
2. IRPF core (RRA + Atualizacao real)
3. Calculo 70→99 (orquestrador completo)
4. INSS core
5. CartaoPonto core
6. Pagamento 50→99

Cada um é 1 sprint de 3-5 dias com Claude.

---

## Cronograma realista — 4-5 semanas

| Semana | Sprint | Output esperado |
|---|---|---|
| 1 | Sprint 1 — diagnóstico | `docs/SPRINT1-DIFF-LINHA-A-LINHA.md` |
| 2 | Sprint 2 — fixes outliers | calibrate 96-98% |
| 3 | Sprint 3 — corpus 65 PJCs | calibrate 98-99% |
| 3-4 | Sprint 4 — property + CI | 20k testes + gate |
| 4-5 | Frente B port | IRPF + ApuracaoDeJuros |

---

## Critérios de "99%" honestos com nosso corpus

Para declarar 99% **com 61 PJCs**:
- ✅ ≥60/61 PJCs em ±5% (1 outlier aceito como caso atípico)
- ✅ Diff médio do corpus < 2%
- ✅ 0 regressão vs estado atual (todos os 49 que batem hoje continuam batendo)
- ✅ CI gate ativo bloqueando regressão futura
- ✅ Property tests verificando invariantes

**Sem reivindicar:**
- Diff testing JAR Java automatizado (impossível)
- Cobertura de casos NÃO no corpus (só posso afirmar sobre 61 PJCs)

---

## Decisão imediata

**Posso começar AGORA:**

1. **Sprint 1** — disparar agente CEREBRO para fazer o diff linha-a-linha dos 3 outliers (4-6 horas trabalho focado)
2. **Sprint 4 setup paralelo** — instalar fast-check + criar 5 properties iniciais (1-2 horas)
3. **Sprint 3 paralelo** — rodar `pjc-oracle-compare.ts` nos 14 PJCs de `dist/reports/` (15 min)

**Resposta esperada do user:** "vai" ou "ajuste X".

Se for "vai" — disparo as 3 frentes agora em paralelo.
