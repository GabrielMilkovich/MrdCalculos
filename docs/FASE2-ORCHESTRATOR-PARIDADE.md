# FASE 2 — Paridade do caminho de produção (orchestrator) vs V3-puro

> Origem: missão "Fechar blockers de produção do MRD Calc", FASE 2.
> Teste: `src/lib/pjecalc/__tests__/orchestrator-paridade-rosicleia.test.ts`
> (fake-supabase em memória → persist real → views reais → service real →
> `executarLiquidacao` real).

## O que a FASE 2 revelou

O `orchestrator.executarLiquidacao` **não** reproduzia o V3-puro (o motor
rodado direto em `convertPjcToEngineInputs → PjeCalcEngineV3`, travado nos
GOLDEN da Fase 1). Para o caso rosicleia, o líquido saía **268.824,97** vs o
alvo **245.697,72** (+9,4%); casos com muitos reflexos desativados (joseli,
izabela) estavam **~4,5x inflados** no banco (joseli 2,3M, izabela 402k).

### Três cópias de liquidação (causa-raiz da classe inteira de bug)

| Caminho | Onde | Usa |
|---|---|---|
| **ModuloResumo-direto** (botão "Liquidar" da aba Resumo) | `ModuloResumo.tsx:118,911` | monta o engine inline (`engine.liquidar()`), **não** chama o orchestrator |
| **orchestrator** | `orchestrator.ts:executarLiquidacao` | Wizard/`LiquidationPipelineDialog` (`useIntelligentLiquidation`), `PjeCalcPage` (`usePjeCalculator`) |
| **V3-puro / conversor** | `pjc-to-engine.ts:convertPjcToEngineInputs` | parity test, seed |

Como divergem, cada cópia produz números diferentes para o mesmo caso. Os bugs
abaixo eram do **orchestrator**; o ModuloResumo-direto **não** os tem (alimenta
`ocorrencias_precomputadas` e não chama `gerarReflexosPadrao`).

> **Backlog P0 pós-go-live:** colapsar as três cópias numa só implementação de
> liquidação. É o fix que mata a classe inteira (não os tapa-buracos abaixo).
> Refator de escopo grande — **não** fazer antes do go-live.

## Fixes aplicados (FASE 2)

1. **Auto-reflexo fantasma** — `orchestrator.ts` (~1716).
   `gerarReflexosPadrao` fabricava 13º/Férias/Aviso/DSR por cima das ocorrências
   precomputadas quando os reflexos PJC vinham `ativa=false` (desativados) e eram
   pulados por `toEngineReflexos` (:377), deixando o principal "sem reflexo".
   Fix: **não auto-gerar quando o caso já tem reflexos persistidos** (import PJC).
   Auto-geração só para casos from-scratch (wizard) sem nenhum reflexo no banco.

2. **Verbas inativas** — `orchestrator.ts:toEngineVerbas`.
   O import grava TODAS as Calculadas (inclusive `ativa=false`); `toEngineVerbas`
   não filtrava → principal inflado. Fix: `verbas.filter(v => v.ativa !== false)`,
   espelhando o V3-puro (`pjc-to-engine.ts:154`).

3. **Split IPCA-E/SELIC perdido** — `orchestrator.ts:toEngineCorrecaoConfig`.
   `combinacoes_indice`/`combinacoes_juros` eram lidos só de `atualizacaoConfig`
   (populado pela UI), mas o import PJC grava em `pjecalc_correcao_config` (`cfg`).
   Fix: fallback para `cfg.combinacoes_*` (com `JSON.parse`). Sem isso o motor
   corrigia todo o período por um índice único → correção e juros inflados.

4. **Gate de jornada bloqueava PJC** — `canonical/{resolver,validator}.ts` +
   `orchestrator.ts`. `resolveCanonicalInput` rodava sem as ocorrências; o
   validador bloqueava verbas `depende_jornada` (HORAS EXTRAS, INTERVALO,
   FERIADOS) por cartão de ponto vazio — que o import PJC nunca grava →
   `E_VERBA_JORNADA_MISSING` em modo `manual`/`auto`. Fix: o orchestrator passa
   `caseData.ocorrencias`; verbas com ocorrências precomputadas não são bloqueadas.

## Resultado pós-fixes (medido no teste de integração)

| caso | orch (pós-fix) | V3-puro | Δ | nota |
|---|---:|---:|---:|---|
| rosicleia | 253.054,74 | 245.697,72 | +3,0% | — |
| joseli | 488.117,06 | 510.452,36 | −4,4% | era 2,3M no banco |
| izabela | 74.139,23 | 72.941,78 | +1,6% | **bruto + correção batem à vírgula** |

A inflação de **ordem de grandeza (4,5x / +9,4%) sumiu**. izabela bate
`principal_bruto` e `principal_corrigido` à vírgula com o V3-puro.

### Resíduo conhecido (ainda aberto)

Sobra um resíduo **< 8%**, de duas naturezas:
- **Juros sistematicamente maior** no orchestrator (izabela +3,1k, rosicleia
  +5,6k, joseli +15,5k) — mesmo quando a correção bate à vírgula (izabela).
- **`principal_bruto` (devido) caso-específico**: rosicleia +11k (sobra),
  joseli −23k (falta) — direção oposta entre casos.

Esse resíduo é sintoma da divergência das **três cópias** (acima), não de um
bug pontual a mais. Diagnóstico fino e fechamento ficam para o item de backlog
de colapso das cópias. **Não foi "ajustado" para o teste passar** — o teste
trava contra a regressão do bug perigoso (ordem de grandeza) e documenta o
resíduo explicitamente.

## Pendências de teste (Addendum do dono)

- [ ] **ModuloResumo-direto sem teste de paridade.** É o caminho que o advogado
  mais clica e está sem cobertura. Extrair a lógica de `executarLiquidacao`
  local (`ModuloResumo.tsx:118`) para uma função pura testável e rodar paridade.
