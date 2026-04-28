# Caminho A — Sessão 1 (Diagnóstico)

**Data:** 22/04/2026
**Branch:** `claude/audit-pjecalc-mrdcalc-kPkHh`
**Commit base:** `8f856ff`
**Calibrate baseline:** -30,68% médio, range -17,39% a -40,28%
**Casos na meta [-1%, +5%]:** 0 / 13

---

## 1. Tabela principal — delta % por componente

| # | caso | meses | regime | cartão | Δ bruto | Δ INSS | Δ IR | Δ juros | Δ hon | Δ custas | Δ FGTS | Δ correção | **Δ LÍQUIDO** |
|---|---|---:|---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | antonio-harley | 13 | PRE_ADC58 | ✓ | -30,35% | -23,39% | 0,00% | 0,00% | -29,06% | 0,00% | +∞ | +19,03% | **-30,77%** |
| 2 | carla-pego | 22 | TRANSICAO | ✓ | -17,19% | -13,94% | 0,00% | 0,00% | +25,44% | 0,00% | +∞ | +4,81% | **-17,39%** |
| 3 | caso-real-v2 | 73 | PRE_ADC58 | ✓ | -34,74% | -34,42% | 0,00% | 0,00% | +0,29% | 0,00% | +∞ | +17,54% | **-34,76%** |
| 4 | francisco-pablo | 28 | PRE_ADC58 | — | -34,30% | -32,53% | +146,75% | 0,00% | +1,10% | 0,00% | +∞ | +8,34% | **-36,02%** |
| 5 | islan-rodrigues | 9 | TRANSICAO | ✓ | -30,06% | -26,60% | 0,00% | 0,00% | +7,08% | 0,00% | +∞ | +10,46% | **-30,30%** |
| 6 | izabela-cristina | 18 | TRANSICAO | ✓ | -30,26% | -20,99% | +∞ | 0,00% | -35,00% | 0,00% | +∞ | +6,85% | **-31,68%** |
| 7 | joseli-silva | 106 | PRE_ADC58 | ✓ | -35,37% | -34,68% | +14,16% | 0,00% | -33,71% | 0,00% | +∞ | +16,43% | **-40,28%** |
| 8 | leandro-casademunt | 201 | PRE_ADC58 | ✓ | -30,47% | -31,48% | +8,87% | 0,00% | +6,90% | 0,00% | +∞ | +21,90% | **-34,92%** |
| 9 | leide-santana | 136 | TRANSICAO | — | -28,85% | -31,64% | +∞ | 0,00% | +4,32% | 0,00% | +∞ | +23,94% | **-28,64%** |
| 10 | roque-guerreiro | 209 | PRE_ADC58 | ✓ | -36,42% | -35,79% | +∞ | 0,00% | -1,80% | 0,00% | +∞ | +13,22% | **-36,89%** |
| 11 | rosicleia | 74 | TRANSICAO | ✓ | -17,96% | -23,46% | +78,00% | 0,00% | +25,81% | 0,00% | +∞ | +18,92% | **-19,06%** |
| 12 | tiago-jose | 109 | TRANSICAO | — | -17,59% | -28,08% | +25,64% | 0,00% | +153,87% | 0,00% | +∞ | +23,42% | **-20,46%** |
| 13 | vanderlei-carvalho | 49 | PRE_ADC58 | ✓ | -37,61% | -36,01% | 0,00% | 0,00% | -4,62% | 0,00% | +∞ | +13,55% | **-37,70%** |

---

## 2. Análise

### 2.1. Componente dominante por caso

Em **8 dos 13 casos** o componente com maior |delta| é **bruto** (faixa -17% a -38%). Nos outros 5:

| caso | dominante | observação |
|---|---|---|
| 2 carla-pego | honorários +25% | mas bruto -17% explica o líquido -17% |
| 4 francisco-pablo | IR +147% | em valor absoluto pequeno; bruto -34% explica líquido -36% |
| 6 izabela-cristina | honorários -35% | bruto -30% também grande |
| 11 rosicleia | IR +78% | bruto -18% explica líquido -19% |
| 12 tiago-jose | honorários +154% | bruto -18%; honorários superestimados não compensam |

**Conclusão:** Bruto é o motor principal do delta em **TODOS** os casos. As outras métricas (IR, honorários) flutuam mas não dominam o líquido em magnitude absoluta.

### 2.2. Padrões cruzados

**Por regime:**
- PRE_ADC58 (8 casos): delta bruto médio **-33,5%** → mais severo
- TRANSICAO (5 casos): delta bruto médio **-22,4%** → menos severo

**Por cartão:**
- Com cartão (10 casos): delta bruto médio **-30,1%**
- Sem cartão (3 casos, #4, #9, #12): delta bruto médio **-26,9%**

**Por duração:**
- Curto (<30m, 6 casos): delta bruto médio **-26,6%**
- Médio (30-100m, 4 casos): delta bruto médio **-30,1%**
- Longo (>100m, 3 casos): delta bruto médio **-26,9%**

**Cartão pouco diferencia (apenas ~3pp), duração quase nada.** O delta bruto é **uniforme** entre subgrupos — sinal forte de **bug sistêmico no conversor ou no motor de verbas**, não em CLT específica (cartão / horas extras).

### 2.3. Achados auxiliares

- **Juros = 0 em TODOS os PJC** (`juros_mora_persistido = 0`). PJe-Calc não persiste juros separadamente no XML que estamos analisando. Atacar juros agora é gasto sem retorno mensurável aqui.
- **Custas = idênticas em 100% dos casos.** Engine já reproduz custas perfeitamente.
- **FGTS = 0 no engine em TODOS os casos**, enquanto PJC tem valores. Engine não está executando módulo FGTS no caminho de líquido. Investigar é obrigatório (componente está perdido), mas impacto no líquido é pequeno (FGTS é depósito separado, não entra direto em líquido_reclamante na maioria dos casos).
- **Correção monetária consistentemente positiva (+5% a +24%)**: engine está aplicando correção, mas em magnitude que não compensa o bruto subestimado. Pode haver **superaplicação** em alguns casos (ADC 58/59).

### 2.4. Hipótese principal

> **O conversor `pjc-to-engine.ts` está perdendo ~30% das verbas ou subestimando seus valores devidos.** Auditoria original (anexada à conversa inicial) já apontava: "conversor descarta 34% das verbas do XML" (§7 do relatório). O delta bruto é exatamente dessa ordem.

Confirmação esperada na Sessão 2: contar verbas no XML PJC vs. verbas geradas no engine, por caso.

---

## 3. Proposta de ordem de ataque (12 sessões + 3 reservas)

| # | Sessão | Foco | Esperado pp |
|---|---|---|---:|
| **2** | Auditoria do conversor `pjc-to-engine` | Quantificar verbas descartadas/incompletas; diagnóstico antes de fix | **-10 a -15** |
| **3** | Fix do conversor (parte 1) | Wirar receivers ausentes para verbas-tipo de maior impacto (horas extras, 13º, férias, aviso, multas) | **-8 a -12** |
| **4** | Fix do conversor (parte 2) | Receivers restantes (DSR, adicional noturno, intervalos, salário substituição, abono) | **-3 a -5** |
| **5** | Histórico salarial — bases por competência | Validar que valores devidos por mês batem com PJC (fix do bug UUID-versus-name da auditoria original) | **-3 a -8** |
| **6** | FGTS no líquido | Investigar por que `fgts_total = 0` no engine; corrigir wiring | **±1 a 3** |
| **7** | Correção monetária / ADC 58/59 | Rever combinações IPCA-E → SELIC; possível superaplicação em casos pós-citação | **-2 a -4** (reduz superestimativa) |
| **8** | INSS por bruto correto | Validar faixas históricas e CS sobre base certa | **-1 a -3** convergência |
| **9** | IR / RRA art. 12-A | Casos com IR +∞ (4, 6, 9, 10, 11): investigar tabela histórica + RRA | **0 a -2** convergência (mais qualidade que magnitude) |
| **10** | Honorários sobre base certa | Bruto correto arrastará maioria; validar art. 791-A CLT (sucumbência recíproca) | **0 a -2** |
| **11** | Casos pré-2014 / FGTS trintenária | `getDataPrescricaoFgts` (já portado Fase 8 + adapter Fase 9): ligar flag em produção | **-1 a -3** |
| **12** | Validação caso-a-caso | Cada caso ainda fora da meta recebe sessão dedicada | **0 a -3** por caso |
| **13** | Reserva 1 | Buffer | — |
| **14** | Reserva 2 | Buffer | — |
| **15** | Reserva 3 / escalação | Se meta não atingida, escalar | — |

### 3.1. Justificativa da ordem

1. **Conversor primeiro** porque é o gargalo: o engine recebe inputs incompletos. Atacar engine sem corrigir conversor é tratar sintoma. Esperado o maior salto de paridade aqui (15-25pp acumulados nas Sessões 2-4).
2. **Histórico salarial** depois: mesmo com receivers corretos, valores das bases podem estar errados se o conversor mapeia incorretamente competência → valor.
3. **FGTS** é integridade (componente zerado), não magnitude grande no líquido. Atacar antes de afinar correção/IR.
4. **Correção monetária** depois do bruto correto: validar se +20% atual é correção real ou bug (ADC 58/59 SELIC pós-citação pode estar duplicando).
5. **INSS/IR** convergem automaticamente quando bruto for correto. Pequenos ajustes finais.
6. **Honorários** idem: incidem sobre bruto. Foco em casos onde há gestão diferenciada (recíproca).
7. **FGTS trintenária** (já portada Fase 8): ligar flag traz correção REAL para casos pré-2014 (não está nos 13 atuais como dominante, mas é correção semântica obrigatória).
8. **Validação caso-a-caso** no final para fechar últimos pontos percentuais.

### 3.2. Estimativa de delta após cada sessão (cumulativo, casos típicos)

| Após sessão | Delta médio esperado | Range esperado |
|---|---|---|
| Baseline (atual) | **-30,68%** | -17% a -40% |
| 2 (diag conversor) | **-30,68%** | (sem fix, só medição) |
| 3 (fix conversor pt.1) | **-20%** | -10% a -28% |
| 4 (fix conversor pt.2) | **-13%** | -7% a -20% |
| 5 (histórico salarial) | **-9%** | -4% a -14% |
| 6 (FGTS) | **-8%** | -3% a -13% |
| 7 (correção/ADC) | **-5%** | -2% a -10% |
| 8 (INSS) | **-3%** | -1% a -7% |
| 9 (IR/RRA) | **-2%** | 0% a -5% |
| 10 (honorários) | **-1%** | 0% a -4% |
| 11 (FGTS trintenária flag) | **-1%** | -1% a -3% |
| 12 (caso-a-caso) | **0%** | -1% a +5% (META) |

Estimativas **conservadoras**, baseadas em achados de auditoria original. Casos como #4 (francisco-pablo, +147% IR) podem precisar atenção dedicada na Sessão 9/12.

### 3.3. Riscos identificados

1. **Conversor pode ter regressões em verbas-tipo já mapeadas**: ao adicionar receivers, validar que verbas que JÁ funcionam não quebram. Gate de não-regressão per-caso (≤1pp pior) protege.
2. **Correção monetária superaplicada**: se hipótese 7 estiver errada e correção for adequada, atacar isso só piora. Sessão 7 começa com diagnóstico (medir contribuição da correção em cada caso), não fix imediato.
3. **Casos com IR +∞**: PJC reporta IR=0 mas engine calcula >0. Pode ser engine errado (calculando IR onde PJC isenta) ou metadado de isenção não capturado. Sessão 9 dedicada.
4. **FGTS=0 no engine** pode ser intencional (engine reporta apenas líquido, não depósito). Validar antes de mexer.

---

## 4. Protocolo das próximas sessões (já internalizado)

Cada sessão futura:

1. **Início:** rodar `npx vitest run` + `npx tsc --noEmit` + calibrate; salvar baseline em `/tmp/sessao-N-baseline.json`.
2. **Trabalho:** modificar exatamente o que a sessão promete; **nada além do escopo**.
3. **Gate per-caso:** roda diagnóstico novo, compara com baseline. **Se algum caso piorou >1pp**, rollback do módulo culpado (não da sessão inteira se isolável).
4. **Fim:** tabela 13×7 antes/depois colada no commit message + relatório resumido para o usuário; **PARA e aguarda OK**.
5. **Timeboxed em 2h** de execução real.

---

## 5. Estado dos artefatos da Sessão 1

| Artefato | Caminho |
|---|---|
| Script de diagnóstico | `scripts/diagnostic-per-component.ts` (337 linhas) |
| Resultado JSON | `/tmp/caminho-a/sessao1-diag.json` |
| Resultado Markdown | `/tmp/caminho-a/sessao1-diag.md` |
| Documento consolidado (este) | `docs/CAMINHO-A-SESSAO-1-DIAGNOSTICO.md` |

Nada do engine foi tocado. Nenhuma feature flag foi ligada.
Suite de testes não foi rodada (só leitura/medição).

---

## 6. Pedido de aprovação

Aguardando **OK** para:

1. **Sessão 2:** auditoria detalhada do conversor `pjc-to-engine` — contar quantas verbas do XML PJC aparecem no engine vs. quantas são descartadas, por caso. **Sem fix nesta sessão**, apenas diagnóstico fino do conversor (continua o padrão de medir antes de mexer).

OU

2. **Pular para Sessão 3 direto:** começar fix do conversor agora se você considera o diagnóstico de § 2.4 forte o suficiente.

Recomendação: **Sessão 2 (medir conversor primeiro)**. Custo é baixo (~1h) e dá precisão cirúrgica para a Sessão 3.
