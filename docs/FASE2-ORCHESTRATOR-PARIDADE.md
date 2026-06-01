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

## Addendum 1 (dono) — ModuloResumo-direto: o caminho mais clicado estava QUEBRADO

O botão "Liquidar" da aba Resumo (`ModuloResumo.tsx`) era a 3ª cópia, sem teste.
A suposição "provavelmente já dá número certo" estava **errada**. Extraída a
lógica para `src/lib/pjecalc/modulo-resumo-liquidacao.ts` (núcleo testável; o
componente agora delega) e medida contra o V3-puro nos golden:

| bug | efeito | status |
|---|---|---|
| combinações IPCA-E/SELIC lidas só de `atualizacao_config` | correção/juros inflados | **corrigido** |
| verbas inativas não filtradas | principal inflado | **corrigido** (espelha V3-puro) |
| Grade lida por `case_id` (tabela só tem `calculo_id` → vazio → FROM SCRATCH) | inflação até **+120%** (leide-santana 424k vs 193k) | **corrigido** (busca por `calculo_id`) |
| **reflexos do PJC nunca carregados** (lê só `getVerbas`/verba_base; reflexos vivem em `pjecalc_reflexo`) | **sub-conta ~30%** (sem 13º/férias/aviso/DSR) | **ABERTO (arquitetural)** |

Estado pós-3-fixes (medido): ainda **−19% a −29%** vs V3-puro porque os reflexos
do PJC não são lidos:

| caso | ModuloResumo | V3-puro |
|---|---:|---:|
| rosicleia | 180.693 | 245.698 |
| tiago-jose | 232.404 | 327.643 |
| leide-santana | 140.170 | 192.678 |
| francisco-pablo | 137.788 | 170.908 |

### Decisão do dono: opção 2 — delegar o botão ao orchestrator (IMPLEMENTADO)

O botão "Liquidar" do `ModuloResumo` agora chama `executarLiquidacao` do
orchestrator (`ModuloResumo.tsx:136`), eliminando a 3ª cópia divergente. O
núcleo extraído (`modulo-resumo-liquidacao.ts`) foi **removido** — serviu só
para revelar os bugs sob teste. Motivo de NÃO escolher a via A (portar reflexos):
seria manter 3 cópias sincronizadas à mão — o whack-a-mole que causou esta
classe inteira de bug.

#### A fiação persist→display — CORREÇÃO de um claim errado meu (verificado no banco)

Eu havia afirmado "duas tabelas separadas, sem sync, o botão antigo gravava em
tabela morta". **ERRADO** — li o `CREATE TABLE` ANTIGO e não vi que ele foi
dropado e recriado como VIEW depois. O dono pegou; verifiquei contra o banco
real (projeto MRDCALCC):

- `pjecalc_liquidacao_resultado` é **VIEW** (`relkind=v`) sobre a TABELA
  `pjecalc_resultado` (`relkind=r`), com `resumo_verbas AS resultado`. O botão
  antigo gravava `resumo_verbas` na tabela → o display LIA via a view. **Era
  visível.** Não havia "tabela morta".

##### O bug REAL (que o mock flat-table escondeu — false-green)

O `upsertResultado` do orchestrator (`orchestrator.ts:1939`) mandava
`inss_segurado` / `irrf` / `inss_patronal` — nomes da TABELA ANTIGA (dropada na
migration `20260304124329`). A view tem `desconto_inss_reclamante` /
`desconto_ir` / `desconto_inss_reclamado`. Os tipos hand-written em `types.ts`
estavam **stale** (nomes antigos) → o tsc "validava" o payload errado.

Verificado contra o banco real (tx + rollback, nada commitado):
- `INSERT` com colunas antigas → `ERROR 42703: column "inss_segurado" does not
  exist` (PostgREST: PGRST204) → `upsertResultado` lança → `executarLiquidacao`
  lança → o botão delegado **quebra ao salvar**.
- `INSERT` com `desconto_*` → **sucesso**, e o JSONB volta: `readback=95.5`.
- Corroboração empírica: **0 registros `engine_version` 3.x** em
  `pjecalc_resultado` (só 2 de `2.1.0`, do botão antigo). O orchestrator NUNCA
  persistiu — confirma que o `.insert` sempre errou.

Ou seja: o swap (Addendum 1, opção 2) tinha roteado o botão para um caminho cujo
**persist estava quebrado**, e meu round-trip deu **false-green** porque o mock
flat-table aceita qualquer chave. Exatamente o padrão da sessão: mock que aceita
tudo = caminho não-testado disfarçado de testado.

##### Fix (validado no banco real)

`inss_segurado`→`desconto_inss_reclamante`, `irrf`→`desconto_ir`,
`inss_patronal`→`desconto_inss_reclamado`, em 3 lugares: tipos `Insert`+`Row`
(`types.ts`), payload do orchestrator (`orchestrator.ts:1939`), e o leitor de
colunas escalares (`usePjeCalculator.ts:320`). O harness do teste passou a
**rejeitar coluna inexistente** (allow-list = colunas reais da view) + teste de
regressão que prova a rejeição — senão volta a ser false-green.

`insertOcorrencia` (Grade) NÃO tem o bug: `pjecalc_ocorrencias` é view com
trigger `INSTEAD OF INSERT` (1300 CALCULADA + 828 PJC_IMPORT no banco). Verificado.

#### Teste

`orchestrator-paridade-rosicleia.test.ts` →
"botão Liquidar → orchestrator (round-trip persist→display)" trava o gate:
- **Cálculo** (item 1): botão == orchestrator por construção; paridade
  orchestrator↔V3-puro coberta pelo describe F2 (joseli 488k, izabela à vírgula).
- **Persist→display** (item 2): `getResultado` lê EXATAMENTE o que
  `upsertResultado` gravou (joseli 488117,06 == 488117,06) e a Grade
  (ocorrências CALCULADA) não some (574/235 ocorrências).

> Nota: `mode` no orchestrator afeta só o gate de insumos
> (`orchestrator.ts:1613`) e a tag do fingerprint — não o cálculo nem a
> persistência. O teste usa `seed` p/ pular o gate de "Faixas IR" (que o harness
> não seeda; em produção a tabela existe e o `manual` passa), com número
> representativo (IR embutido).

### Backlog (prioridade ALTA — pós-go-live)

1. **Resíduo de juros do orchestrator (−4,4% joseli).** O caminho de produção
   ainda NÃO bate o gabarito à vírgula; o V3-puro é o único que bate. Enquanto
   não convergir, "−4,4%" é dívida ativa.
2. **Colapso final das 3 cópias numa só** (incluir o V3-puro). A opção 2
   colapsou a pior (ModuloResumo) na do orchestrator — restam duas
   (orchestrator + V3-puro). Unificar é o fix de raiz definitivo.
