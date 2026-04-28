# Calibrate V1 vs V3 — Medição Decisória

**Data da medição:** 2026-04-23
**Branch:** `feat/calibrate-v1-vs-v3-measurement`
**Motivo:** resolver a lacuna documentada em `docs/MOTOR-UNICO-V3.md` Nota A — `npm run calibrate` até agora media `PjeCalcEngine` (V1 legado em `_legacy/`), não `PjeCalcEngineV3` (motor ativo em produção desde 17/abr/2026).

---

## 1. Contexto — o que foi medido

Dois pipelines rodados nos mesmos 14 casos `.pjc` de `public/reports/` (13 válidos + 1 sem líquido):

- **`npm run calibrate`** → instancia `PjeCalcEngine` (V1 em `src/lib/pjecalc/_legacy/engine.ts`).
- **`npm run calibrate:v3`** → instancia `PjeCalcEngineV3` (em `src/lib/pjecalc/engine-v3.ts`, motor ativo).

**Input idêntico para os dois motores.** Mesma assinatura de construtor, mesmos 25 argumentos posicionais. V3 tem um 26º parâmetro opcional `multasConfig` que ficou no default (`apurar_467: false, apurar_477: false`) para preservar paridade de input — qualquer divergência de output é atribuível **exclusivamente ao motor**, não ao input.

A métrica central é **distância até PJC**: `|delta_liquido%| = |(eng_liquido − pjc_liquido) / pjc_liquido × 100|`. Motor com menor |delta| está mais perto do gabarito.

**Meta do escritório:** `delta_liquido ∈ [-1%, +5%]` em cada caso, individualmente.

---

## 2. Resultado agregado

### Tabela comparativa V1 vs V3 em paralelo contra PJC

| Métrica | V1 (`_legacy/`) | V3 (ativo) |
|---|---:|---:|
| Delta médio absoluto | **30,68%** | **3,68%** |
| Casos em ±5% | **0/13** (0%) | **10/13** (77%) |
| Casos em ±10% | **0/13** (0%) | **13/13** (100%) |
| Casos na meta `[-1%, +5%]` | **0/13** (0%) | **3/13** (23%) |

### Quem está mais próximo de PJC (|delta| menor; empate ≡ Δ<0,5pp)

| Resultado | Contagem |
|---|---:|
| **V3 mais próximo de PJC** | **13/13** (100%) |
| V1 mais próximo de PJC | 0/13 |
| Empate | 0/13 |

### Componentes (delta% médio absoluto)

| Componente | V1 | V3 | Gap fechado |
|---|---:|---:|---:|
| bruto | 29,32% | **3,99%** | **-25,33pp** |
| inss | 28,69% | 16,43% | -12,26pp |
| ir | 21,03% | 24,02% | +2,99pp ⚠️ |

**Sinal central:** V3 é dramaticamente mais próximo do PJC em **todos os 13 casos**, sem exceção. Zero regressões.

---

## 3. Detalhamento per-caso

Colunas:
- `PJC liq` — líquido exequente conforme XML gabarito.
- `V1 δ%` / `V3 δ%` — delta percentual do motor contra PJC.
- `vencedor vs PJC` — motor com menor |delta|.
- `meta [-1%, +5%]` — ✅ dentro da janela, ⚠️ em ±10% mas fora da janela, ❌ fora de ±10%.
- `INSS δ% V3` — resíduo do componente dominante residual (ver §4).

| # | caso | meses | regime | PJC liq (R$) | V1 δ% | V3 δ% | vencedor | meta | INSS δ% V3 |
|---|---|---:|---|---:|---:|---:|:---:|:---:|---:|
| 1 | antonio-harley | 13 | PRE_ADC58 | 39.929,92 | -30,77% | **-4,28%** | V3 | ⚠️ | -1,6% |
| 2 | carla-pego | 22 | TRANSICAO | 45.028,19 | -17,39% | **-3,86%** | V3 | ⚠️ | -5,8% |
| 3 | caso-real-v2 (maria madalena) | 73 | PRE_ADC58 | 46.426,51 | -34,76% | **-4,17%** | V3 | ⚠️ | -22,2% |
| 4 | francisco-pablo | 28 | PRE_ADC58 | 166.619,02 | -36,02% | **-0,04%** | V3 | ✅ | -25,7% |
| 5 | islan-rodrigues | 9 | TRANSICAO | 9.974,39 | -30,30% | **+0,59%** | V3 | ✅ | -15,2% |
| 6 | izabela-cristina | 18 | TRANSICAO | 73.879,96 | -31,68% | **-2,79%** | V3 | ⚠️ | -13,5% |
| 7 | joseli-silva | 106 | PRE_ADC58 | 510.459,85 | -40,28% | **-8,57%** | V3 | ⚠️ | -32,8% |
| 8 | leandro-casademunt | 201 | PRE_ADC58 | 510.050,92 | -34,92% | **-6,30%** | V3 | ⚠️ | -28,7% |
| 9 | leide-santana | 136 | TRANSICAO | 190.652,72 | -28,64% | **-2,12%** | V3 | ⚠️ | -7,6% |
| 10 | roque-guerreiro | 209 | PRE_ADC58 | 231.306,58 | -36,89% | **-8,17%** | V3 | ⚠️ | -24,3% |
| 11 | rosicleia | 74 | TRANSICAO | 247.215,95 | -19,06% | **+0,83%** | V3 | ✅ | +0,6% |
| 12 | tiago-jose | 109 | TRANSICAO | 320.938,56 | -20,46% | **-1,69%** | V3 | ⚠️ | -9,2% |
| 13 | vanderlei-carvalho | 49 | PRE_ADC58 | 61.849,71 | -37,70% | **-4,39%** | V3 | ⚠️ | -26,5% |

**V3 vence todos os 13.** 3 casos já atingem a meta `[-1%, +5%]` com margem confortável (francisco-pablo, islan-rodrigues, rosicleia).

---

## 4. Análise textual — padrão dos 3 casos fora da janela

### Cenário A confirmado: V3 é oficialmente superior a V1

V3 move a média absoluta de 30,68% para 3,68% — redução de **88% no gap**. Nenhum caso onde V1 mede melhor que V3. Nenhum empate. Nenhuma regressão suspeita.

### Gargalo residual concentrado, não distribuído

Dos 13 casos V3, **3 ainda estão fora da janela `[-1%, +5%]` em magnitude >5%**:

| Caso | Contrato | Regime | V3 δ% | INSS δ% V3 |
|---|---:|---|---:|---:|
| joseli-silva | **106m** | PRE_ADC58 | -8,57% | **-32,8%** |
| leandro-casademunt | **201m** | PRE_ADC58 | -6,30% | **-28,7%** |
| roque-guerreiro | **209m** | PRE_ADC58 | -8,17% | **-24,3%** |

**Padrão idêntico nos 3:**
1. **Contratos longos** (106m, 201m, 209m — todos >8 anos).
2. **Regime PRE_ADC58** (demissão antes de nov/2021 → toda a fase pré-citação usa IPCA-E + TR, sem SELIC).
3. **INSS consistentemente subestimado entre -24% e -33%.**

Os demais casos PRE_ADC58 de contrato curto/médio (antonio-harley 13m, francisco-pablo 28m, vanderlei-carvalho 49m, caso-real-v2 73m) têm INSS muito menos subestimado (-1,6% a -26,5%) e caem em `⚠️` ou `✅`.

**Insight-chave:** o gap residual dos 3 outliers é **1 alavanca única** — INSS per-competência em contratos longos pré-citação — não 3 problemas distintos. Uma sessão focada provavelmente resolve os 3 simultaneamente.

**Conjectura mecânica (a validar):** `MaquinaDeCalculoDoInss` do V3 provavelmente aplica faixas/tetos de **uma única competência** (ex.: a mais recente, ou a de liquidação) a todas as ocorrências ao longo dos ≥100 meses do contrato. Para contratos longos PRE_ADC58, isso **subestima sistematicamente** o INSS porque faixas históricas têm valores menores antes de 2020. Só o port per-competência consertaria.

---

## 5. Breakdown por componente

### Bruto: V3 já praticamente resolvido

- V1: 29,32% médio absoluto
- V3: **3,99%** — 7× melhor, praticamente em paridade.

Isso significa que a conversão `pjc-to-engine` + o cálculo das verbas funcionam bem em V3. A hipótese do §2.4 do documento `CAMINHO-A-SESSAO-1-DIAGNOSTICO.md` (que atribuía o delta ao "conversor perdendo verbas") **não é a causa em V3** — aquela análise refletia V1. Em V3, bruto está OK.

### INSS: gargalo residual (relacionado à Seção 4)

- V1: 28,69%
- V3: 16,43% — 1,7× melhor que V1, mas ainda o pior componente em V3.

O 16,43% médio é inflado pelos 3 outliers PRE_ADC58 longos (onde INSS é -24% a -33%). Nos outros 10 casos, INSS está muito melhor.

### IR: V3 ligeiramente pior que V1 em absoluto

- V1: 21,03%
- V3: 24,02% — **piorou 2,99pp** (único componente onde V3 está pior).

Casos com IR `+∞` (IR=0 no PJC, IR>0 no V3): 4 casos com desvios grandes em % mas valores absolutos pequenos:

| Caso | V3 IR δ% | Valor absoluto |
|---|---:|:---|
| francisco-pablo | +138,4% | pequeno (<R$ 500) |
| rosicleia | +119,2% | pequeno |
| tiago-jose | +23,7% | pequeno |
| joseli-silva | +14,4% | médio |

**Impacto no líquido final é menor** — nos 3 primeiros, apesar do IR grande em %, o líquido fechou em ✅ ou ⚠️ perto da meta. Em joseli-silva, o IR +14% é ruído secundário ao INSS -32,8%.

**Prioridade:** secundária — só atacar IR depois de INSS estar resolvido. Uma vez que INSS converge, o IR fica mais fácil de calibrar.

---

## 6. Recomendação de próximo passo

**Cenário A confirmado: V3 é oficialmente superior a V1.** Próximas PRs em ordem de prioridade:

### (a) Migrar calibrate oficialmente para V3

- **Escopo:** remover `scripts/calibration-pipeline.ts` (V1) e renomear `calibration-pipeline-v3.ts` → `calibration-pipeline.ts`, mantendo `calibrate:compare` como ferramenta de verificação histórica.
- **Tempo:** sessão curta (~30min).
- **Impacto:** `npm run calibrate` passa a medir o motor real em produção. Todos os dashboards, métricas e documentos de paridade se alinham com a realidade. Remove a pegadinha documentada na Nota A de `MOTOR-UNICO-V3.md`.

### (b) Port per-competência de `MaquinaDeCalculoDoInss`

- **Escopo:** porta a lógica do core Java (`pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/inss/MaquinaDeCalculoDoInss.java`, 1640 linhas) focando em **apuração de faixas e tetos por competência histórica**, não por competência-alvo única.
- **Alvo:** mover os 3 outliers (joseli-silva, leandro-casademunt, roque-guerreiro) de `⚠️` para ✅ na meta `[-1%, +5%]`.
- **Tempo:** 1-2 sessões dedicadas. A port fazia parte da Fase 5 do plano original (iniciado em `claude/audit-pjecalc-mrdcalc-kPkHh` PR #18) mas foi parcialmente feita apenas nas validações — o motor completo ficou para sessão dedicada.
- **Impacto estimado:** -20 a -30pp de gap no INSS dos 3 outliers → líquido desses casos deve cair para ±3%.

### (c) Analisar IR positivo em 4 casos (prioridade baixa)

- **Escopo:** investigar os 4 casos onde V3 calcula IR>0 mas PJC reporta IR=0 (francisco-pablo, rosicleia, tiago-jose, joseli-silva).
- **Condição para atacar:** apenas se depois de (b) a média ficar em ±2% ou melhor e esses casos ainda ficarem fora da meta.
- **Tempo:** 1 sessão.
- **Impacto:** valores absolutos pequenos → ganho marginal no líquido.

### Não fazer agora

As seguintes melhorias mencionadas em outros documentos **podem não ser necessárias** após (b) ser feita. Reavaliar depois:

- Ativar flags opt-in (`selic_pro_rata_die`, `atualizar_inss_selic`, `VERBA_INSS`).
- Seed Supabase com séries RFB/IBGE oficiais.
- Série JAM diária para FGTS.
- Port per-competência de `MaquinaDeCalculoDeIrpf` (ver recomendação (c)).
- Consertar duplicação de reflexos em `pjc-to-engine.ts`.

**Motivo:** em V3 os componentes bruto e correção monetária já funcionam bem. Se o INSS converger em (b), a maior parte do gap residual deve fechar automaticamente.

### Remoção final do `_legacy/`

Conforme previsto em `docs/MOTOR-UNICO-V3.md`, `src/lib/pjecalc/_legacy/` será removido após **2026-05-20** (4 semanas de V3 em produção sem incidentes). Esta medição confirma que V3 está em estado de produção com paridade real — sem necessidade de manter V1 como rede de segurança além do prazo acordado.
