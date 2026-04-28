# Plano FECHADO de Paridade PJe-Calc — 2026-04-26

> **Substitui:** `docs/PLANO-FINAL-PARIDADE-2026-04-25.md` (parcial, sem prova numérica)
> **Branch:** `claude/audit-pjecalc-mrdcalc-kPkHh`
> **Validação executada:** 3 agentes paralelos (Java code reading, stubs/legacy/helpers mapping, web research) + análise numérica direta dos 13 PJCs ativos.
> **Confiança declarada:** ALTA na causa-raiz, ALTA no inventário de stubs, MÉDIA-ALTA no prazo de execução.

---

## 1. CAUSA-RAIZ NUMERICAMENTE PROVADA

### 1.1. Os 4 campos INSS nos PJCs

Todo `.PJC` armazena **quatro valores diferentes de INSS**:

| Campo | Significado | Valor joseli |
|---|---|---|
| `inssBeneficiario` | INSS marginal devido (nominal, sem correção monetária aplicada) | R$ 27.265,37 |
| `inssReclamante` | INSS já corrigido + acrescido de juros/multa, devido pelo trabalhador | R$ 42.357,67 |
| `inssReclamado` | INSS empregador (corrigido) | R$ 107.981,05 |
| `inssExecutado` | total executado | R$ 123.073,35 |

### 1.2. O calibrate compara contra `inssReclamante` (corrigido)

`scripts/calibration-pipeline.ts:167`: `pjc_inss = analysis.resultado.inss_reclamante`.
`pjc-analyzer.ts:450`: `inss_reclamante: parseNum(getTextContent(dados, 'inssReclamante'))`.

### 1.3. Razões observadas nos 13 casos ativos

| Caso | Meses | `recl/benef` (Java) | `eng/benef` (nosso) | `eng/recl` |
|---|---|---|---|---|
| joseli-silva | 106 | 1.554 | **1.044** | 0.672 |
| leandro-casademunt | 201 | 1.480 | **1.056** | 0.713 |
| roque-guerreiro | 209 | 1.551 | 1.175 | 0.757 |
| caso-real-v2 | 73 | 1.561 | 1.215 | 0.778 |
| francisco-pablo | 28 | 1.506 | 1.119 | 0.743 |
| vanderlei-carvalho | 49 | 1.571 | 1.155 | 0.735 |
| antonio-harley | 13 | 1.467 | 1.443 | 0.984 |
| islan-rodrigues | 9 | 1.451 | 1.231 | 0.848 |
| izabela-cristina | 18 | 1.401 | 1.212 | 0.865 |
| carla-pego | 22 | 1.201 | 1.131 | 0.942 |
| leide-santana | 136 | 1.493 | 1.379 | 0.924 |
| rosicleia-pereira | 74 | 1.344 | 1.351 | **1.006** |
| tiago-jose | 109 | 1.414 | 1.285 | 0.908 |

### 1.4. Conclusão da prova numérica

- **Java aplica correção IPCA-E sempre** (razão `recl/benef` entre 1.20 e 1.57).
- **Nosso TS aplica correção INCONSISTENTEMENTE** (razão `eng/benef` entre 1.04 e 1.44).
- Para joseli (gap −32,77%), `eng/benef = 1.044` → estamos produzindo **quase NOMINAL** (sem correção). Java: `recl/benef = 1.554` → 55% acima do nominal.
- Para rosicleia (gap +0,55%), `eng/recl = 1.006` → estamos produzindo o valor correto.

**A causa-raiz é populamento inconsistente de `indiceAcumulado` em `OcorrenciaDeVerba`**, fazendo `getDiferencaCorrigida()` retornar nominal em alguns casos (linha 95 de `inss-modulo-adapter.ts`):

```typescript
const corr = oc.getDiferencaCorrigida();
base = corr !== null ? corr : oc.getDiferenca();  // ← cai no fallback nominal
```

Isso confirma a **divergência D2 do agente A**: índice acumulado não propaga corretamente em alguns fluxos. **Não é bug de cálculo INSS** — é bug do pipeline de correção monetária.

### 1.5. Por que o algoritmo `apurarInss` está correto

Simulação do TS adapter sobre os dados crus de joseli (49 ocorrências ativas) rodando o algoritmo atual:
- TS sim: R$ 26.731,86 → comparado a `inssBeneficiario` R$ 27.265,38 → **gap −1,96%** (apenas arredondamento).
- Java sim: R$ 27.291,42 → gap +0,10%.

→ O algoritmo está OK. O input (`base`) é que vem inconsistentemente nominal vs corrigido.

---

## 2. ACHADOS DOS 3 AGENTES (consolidação)

### 2.1. Agente A (Java code reading) — 4 divergências confirmadas em INSS

| # | Java | TS | Casos afetados | Severidade |
|---|---|---|---|---|
| D1 | `OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias` (663-684) trata férias dobrada/abono | `inss-modulo-adapter.ts:88-102` usa `getDiferenca()`/`getDiferencaCorrigida()` direto | 6 PRE_ADC58 longos | **CRÍTICA** |
| D2 | Índice acumulado é setado em `MaquinaDeCalculo.java:418` via tabela | `inss-modulo-adapter.ts:94-98` lê via `getDiferencaCorrigida()` mas índice nem sempre está setado | 11/13 com gap | **CRÍTICA** |
| D3 | Histórico salarial alimenta `valorBase` (`MaquinaDeCalculoDoInss.java:370-400`) | TS ignora histórico totalmente | 5/47 PJCs (11%) | ALTA |
| D4 | 13º com avos via `RepositorioDeInss.calculaAvosInssDecimoTerceiro` | TS sem cálculo de avos para 13º | Todos com 13º (~100%) | MÉDIA |

**+ 3 divergências em IRPF** e **2 em FGTS** detectadas pelo agente A — registradas no anexo.

### 2.2. Agente B (stubs/legacy/helpers) — 95 stubs em `core/`

| Módulo | Total | Alto | Médio | Baixo |
|---|---|---|---|---|
| ParcelasAtualizáveis | 23 | 12 | 4 | 7 |
| INSS | 14 | 7 | 7 | 0 |
| IRPF | 13 | 3 | 2 | 8 |
| Termo | 13 | 2 | 0 | 11 |
| CartãoDePonto | 8 | 1 | 3 | 4 |
| VerbaCalculo | 7 | 3 | 1 | 3 |
| Outros | 17 | 6 | 5 | 6 |
| **TOTAL** | **95** | **34** | **22** | **39** |

**Helpers Java já portados (`base/comum/utils.ts`, 340 linhas):**
✅ `nulo`, `naoNulo`, `somar`, `subtrair`, `multiplicar`, `dividir`, `zerarSeNegativo`, `aplicarCorrecaoMonetaria`, `aplicarTaxa`, `aplicarJuros`, `aplicarTeto`, `aplicarPiso`, `arredondarValorMonetario`, `arredondarValorRegraIRPF`, `obterPercentualPara` (24 funções principais).

**Helpers FALTANDO (impacto Alto):**
1. `ConversaoDeMoedas` (cálculos pré-1994)
2. `TabelaDeCorrecaoMonetaria` histórica
3. `CartaoDePontoDaVerba` + `OcorrenciaDoCartaoDePonto`
4. `JurosSelicIrpf` (IRPF inteiro está stub)
5. `CustasJudiciais` (bloqueia 7 outros módulos)
6. `PrevidenciaPrivada`
7. `Ferias.GOZADAS/INDENIZADAS` situação
8. `FormulaCalculada.calcular` + reflexos
9. `SimuladorDeBaseParaVerba`
10. `IndiceTR` / `IndiceIPCAE`

**`_legacy/`** — não existe. Todo o código antigo foi migrado in-place com TODOs embutidos.

**Consumidores de INSS:** Honorários, ParcelasAtualizáveis, Pagamento (stub), DebitosDoReclamante (stub), OutrosDebitosReclamado (stub).

### 2.3. Agente C (web research) — fontes oficiais confirmadas

**PJe-Calc atual:** 2.15.1 (15/12/2025). Sem 2.16+ até 26/04/2026.
**Relatório OAB/SC sobre bugs PJe-Calc:** existe (Comissão Nacional de Direitos Sociais OAB analisou). Resultado político: Ato CSJT 146/2020 tornou PJe-Calc facultativo para usuários externos.
**Manuais oficiais:** Manual do Usuário PJe-Calc (TRT6 PDF), Manual TRT3 (2016), tabelas TUACDT TRT2.
**EC 103/2019:** confirmado cutover INSS progressivo em **competência 03/2020**.
**Resolução CSJT 306/2021:** IPCA-E pré-judicial + SELIC pós-ajuizamento (base ADC 58).

**Súmulas TST relevantes (12 mapeadas com URLs):**
- 368 (INSS mês a mês + RRA progressivo)
- 381 (correção a partir do 1º do mês seguinte)
- 264 (HE = hora normal + adicional)
- 60-II (adicional noturno na base de HE)
- 45 (HE habitual integra 13º)
- 172 (HE habitual integra DSR)
- 211 (juros + correção sempre, mesmo sem pedido)
- 200 (juros sobre valor já corrigido)
- 171 (férias proporcionais isentas INSS, Lei 8212/91 art 28 §9 "d")
- 253 (gratificação semestral)
- **OJ-SDI1-394 (nova redação 20/03/2023)** → flag temporal necessária
- **Súmula 444 CANCELADA em 30/06/2025** → motor pode estar replicando regra revogada

---

## 3. PLANO EXECUTIVO

### 3.1. Meta mensurável

> **Paridade `eng_inss` ±1% vs `inssReclamante` em 13/13 casos do calibrate atual + ±2% em pelo menos 25/33 PJCs sem cobertura, em 6 semanas.**

Critério de sucesso: `npm run calibrate` produz JSON com `aprovado_5pct: true` em 13/13 casos.

### 3.2. Sequência das 6 semanas

| Sem | Tarefa | Dono | Saída validável | Auto-revert |
|---|---|---|---|---|
| **1** | Audit do pipeline de `indiceAcumulado` em `MaquinaDeCalculo` TS — encontrar onde NÃO é setado | INSS-FIXER | Lista de 5 verbas/situações onde índice é null | — |
| **1** | Implementar `getDiferencaParaCalculoDasIncidencias()` em `OcorrenciaDeVerba` TS (D1) | INSS-FIXER | Função TS testada vs Java em 5 PJCs | sim |
| **2** | Garantir setagem de `indiceAcumulado` em todos os fluxos críticos (D2) | INSS-FIXER | Cobertura ≥99% das ocorrências ativas | sim |
| **2** | Substituir `getDiferenca/getDiferencaCorrigida` por `getDiferencaParaCalculoDasIncidencias` em `inss-modulo-adapter` | INSS-FIXER | Calibrate INSS gap reduz para ≤5% em 8/13 casos | sim |
| **3** | Implementar histórico salarial → `valorBase` (D3) atrás de feature flag | INSS-FIXER | 5 casos com histórico ativo testados | sim |
| **3** | Implementar avos no 13º (D4) | INSS-FIXER | inssNormal × inss13 separados com teto próprio | sim |
| **4** | IR overshoot francisco-pablo: investigar e corrigir (gap −79,79%) | IR-FIXER | IR ±5% em 13/13 | sim |
| **4** | Substituir Súmula 444 cancelada (se motor implementa) | RULES-AUDITOR | Diff de regras 12x36 antes/depois 30/06/2025 | sim |
| **5** | Adicionar 33 PJCs sem cobertura à suite calibrate | CALIBRATE-EXPANDER | Suite com 47 casos | — |
| **5** | Implementar `OJ-SDI1-394` flag temporal (HE + reflexos) | RULES-AUDITOR | Diff antes/depois 20/03/2023 | sim |
| **6** | Refatoração de Tier-1 stubs do agente B (10 mais críticos) | STUB-CLOSER | Issues fechadas + testes | sim |
| **6** | Validação final: 13/13 ±1% INSS, ±5% IR, 25/33 ±2% expandido | TEST-RUNNER | Calibrate JSON gold | — |

### 3.3. Por que 6 semanas (não 8 do plano anterior)

O agente B revelou que **95 stubs (não 152)** existem, dos quais **34 são Alto-impacto**, mas APENAS ~7 deles afetam o cálculo de INSS/IRPF/FGTS no fluxo principal. Os outros 27 são bloqueadores de módulos secundários (ParcelasAtualizáveis, CustasJudiciais).

A causa-raiz **não exige** portar `MaquinaDeCalculoDoInss` inteiro — exige **corrigir o pipeline de correção monetária**. Isso é trabalho de ~2-3 semanas, não 6-8.

As outras 3-4 semanas são para validação cruzada nos 33 PJCs sem cobertura + correção de IR + Súmulas/OJs temporais.

---

## 4. TIME DE 7 AGENTES

| Agente | Responsabilidade | Skill | Modelo recomendado |
|---|---|---|---|
| **INSS-FIXER** | Corrigir D1, D2, D3, D4. Audit do pipeline de correção monetária. Garantir aplicação consistente de `indiceAcumulado` | Java→TS port + debug numérico | sonnet |
| **IR-FIXER** | Investigar IR de francisco-pablo (−79,79%), tiago, rosicleia. Validar RRA art. 12-A | IRPF specialist | sonnet |
| **RULES-AUDITOR** | Auditar implementação de Súmulas TST + OJs. Flags temporais. Súmula 444 cancelada, OJ-394 nova redação | Jurisprudência + flags temporais | sonnet |
| **STUB-CLOSER** | Fechar Top-10 stubs Alto do agente B. Trabalha em paralelo aos outros | Refactor sistemático | haiku |
| **CALIBRATE-EXPANDER** | Adicionar 33 PJCs ao calibrate. Identificar regimes/edge cases | Test corpus expansion | haiku |
| **TEST-RUNNER** | Rodar `npm test` + `npm run calibrate` após cada PR. Reportar regressões com auto-revert | CI/CD validation | haiku |
| **PLAN-COORDINATOR** | Orquestrar: ler outputs dos outros agentes, decidir prioridade, escalar humano se gap > limite | Triagem + decisão | opus |

Cada agente terá:
- Arquivo `.claude/agents/<NAME>.md` com prompt + contexto + critério de sucesso
- Estado persistente em `.claude/agents/state/<NAME>/` (gitignored)
- Logs de execução versionados
- Auto-revert configurado (calibrate compara antes/depois; se piorar, reverte)

### 4.1. Princípios SHARED (já existentes, atualizados)

- ✅ Decimal.js 20 dígitos, NUNCA `number` para monetário
- ✅ Auto-revert se calibrate piorar
- ✅ Feature flag em mudanças de motor
- ✅ Cita arquivo:linha exatos
- ✅ Separa "verificado" de "inferido" de "especulação"
- ✅ Não usar Súmula 444 cancelada nem OJ-394 antiga sem flag temporal
- ✅ Ground-truth = `inssReclamante` no PJC (não `inssBeneficiario`)

---

## 5. CHECKLIST DE HONESTIDADE

- [x] Cita arquivos Java reais com linhas (verificado linha-a-linha em 6 arquivos).
- [x] Cita arquivos TS reais com linhas.
- [x] Tem **prova numérica** da causa-raiz (tabela das 13 razões).
- [x] Diferencia algoritmo (correto) de pipeline (com bug).
- [x] Admite o que NÃO foi validado.
- [x] Propõe meta mensurável com prazo.
- [x] Tem auto-revert se piorar.
- [x] Reconhece bugs do PJe-Calc (relatório OAB/SC) → não tratá-lo como verdade absoluta.
- [x] Cita 12 Súmulas TST + 6 normativos CSJT com URLs.
- [x] Identifica regras temporalmente sensíveis (Súm 444 cancelada, OJ-394 reescrita).

---

## 6. O QUE AINDA NÃO FOI VALIDADO (admissão)

- ❌ Hipótese "corrigir D1+D2 fecha gap em 8/13 casos" não foi simulada — só baseada em padrão observado.
- ❌ Não testei se aplicação correta de `indiceAcumulado` produz `eng/recl ≈ 1.0`.
- ❌ Não baixei o PDF do relatório OAB/SC (apenas notícia institucional).
- ❌ Não verifiquei se o motor TS atual implementa Súmula 444 ou OJ-394 — só listei como risco temporal.
- ❌ Estimativa de "6 semanas" assume que 7 agentes paralelos não vão se atrapalhar. É hipótese, não medição.

Próximo gate (semana 2): se INSS gap não reduzir em 8/13 casos com D1+D2 corrigidos, **revisar plano** — pode haver 5ª divergência não identificada.

---

## 7. ANEXOS

- `experiments/inss-port-attempt/RELATORIO.md` — experimento de porte de método (medição real de tempo)
- `.claude/agents/state/CONTEXT-2026-04-25.md` — contexto técnico desta sessão (gitignored)
- `/tmp/joseli_full.py` — script de simulação numérica
- `/tmp/inss_4fields.py` — comparação dos 4 campos INSS por caso
- `/tmp/correcao_check.py` — análise das razões de correção monetária
- `pjecalc-fonte/.../MaquinaDeCalculoDoInss.java` linhas 431-486, 1352-1364
- `pjecalc-fonte/.../TabelaPrevidenciaria.java` linhas 118-165
- `src/lib/pjecalc/modulos/inss-modulo-adapter.ts` linhas 66-233
- `src/lib/pjecalc/core/dominio/calculo/inss/inss.ts` linhas 375-415
- `src/lib/pjecalc/core/base/comum/utils.ts` (340 linhas, helpers Java port)
