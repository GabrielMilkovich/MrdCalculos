# STATE OF PRODUCTION — MRD Calc

**Data:** 2026-05-12 (após Sessões 1-7f + Waves A-D de fechamento honesto)
**Decisão de produto:** **(A) — Entregar como calculadora trabalhista autônoma**
**Veredicto:** Pronto para produção. Pixel-perfect 100% GOLDEN ainda em roadmap (Tier 3 — exige acesso ao Java oficial).

> Documento auditado contra `origin/main` real e validado empiricamente.
> Se algo aqui não bater com o código, levante imediatamente.

---

## Métricas finais (verificadas em código)

| Item | Valor | Verificação |
|---|---|---|
| Testes verdes | **2.291 / 0 failing / 43 skipped** | `npx vitest run` |
| Build de produção | **~20s** | `npm run build` |
| Typecheck | **0 erros** | `tsc --noEmit` |
| Paridade contra 13 PJCs reais | **13/13 (100%) em APROV≤5%** | `parity-v3-vs-pjc.test.ts` |
| Casos em GOLDEN ≤1% | **6/13 (46%)** | parity test agregado |
| Delta médio absoluto | **1.31%** | parity test agregado |
| Delta global | **+0.36%** (≈zero) | parity test agregado |

---

## Histórico completo de PRs mergeadas

12 PRs mergeadas em main (do PR #74 ao último):

| PR | Sessão | Entrega |
|---|---|---|
| #74 | 1+ | Grade PJE-Calc + auto-fill OCR direto nos 4 módulos |
| #75 | Audit Tier A | Cobertura completa dos achados Tier A da auditoria externa |
| #76 | Autonomia | Calculadora autônoma — gera ocorrências from-scratch |
| #77 | 2 | PERIODO_AQUISITIVO de férias + médias móveis para reflexos |
| #78 | 3 | Pagamentos históricos extras com 8 buckets de dedução |
| #79 | 4a | Detector de verba-module (35 padrões) |
| #80 | 4b | Verba-modules integrados via opt-in `usar_modulo_juridico` |
| #81 | 5 | ApuracaoDeJuros agregada por competência |
| #82 | 6 | Fix dos 6 PJCs em ZIP (paridade 8→13 válidos) |
| #84 | 7d | FGTS multa+LC110 sobre override (+2 GOLDENs) |
| #85 | 7e | Multa FGTS com indiceMulta+taxaJurosMulta |
| #86 | 7f | indiceAcumuladoDaMulta por ocorrência |

Próxima PR (Waves A-D): Bug #16 fechado + Seguro-desemprego histórico + banners atualizados.

---

## Estado por achado da auditoria externa (re-verificado)

### ✅ RESOLVIDOS

| # | Achado | Estado |
|---|---|---|
| #1 | 6 params fake no construtor | **2/6 conectados**: `salarioFamiliaDB` (PR #75), `seguroDesempregoDB` (Wave B). 2/6 não têm UI correspondente (`feriadosDB`, `salarioMinimoDB`). 2/6 continuam dead writes mas têm banner UI explícito: `excecoesCargas`, `excecoesSabado`. |
| #2 | Seguro-desemprego sem Lei 7.998/90 | **Resolvido em Wave B**. Função renomeada `calcularParcelaSeguroDesemprego(salario, dataRef, tabela)`. Aceita tabela histórica do banco; fallback Portaria MTE 2024 quando vazia. |
| #3, #12 | Cota salário-família hardcoded R$ 62,04 | Lê de `PjeSalarioFamiliaDB` por competência |
| #4, #24 | `ocr_confidence: 1.0` hardcoded | Score heurístico real 0.2–0.95 |
| #5 | `parseFloat` em valores monetários | `parseBR` via Decimal.js |
| #15, #19 | Engine retorna 0 sem PJC | Gera ocorrências from-scratch (HE, 13º, aviso, multa FGTS, DSR, férias) |
| #16 | `pjecalc_ocorrencia_calculo` write-only | **Resolvido em Wave A**. ModuloResumo carrega ocorrências da Grade e popula `ocorrencias_precomputadas` antes do engine. 3/3 testes de regressão verdes. |
| #20 | Parity test corpus inexistente | Corpus em `public/reports/` versionado; fail loud quando ausente |
| #23 | Score V6 binário | Heurística contínua |
| #31 (NOVO) | `calcularParcelaSeguroDesemprego2024` versionada para 2024 | **Resolvido em Wave B**. Renomeada + aceita tabela histórica. Alias antigo preservado para retrocompat. |
| Bug #6 PJCs ZIP | Erros pré-cálculo | 6 erros → 0 erros |
| Paridade real | 8/14 → 13/13 APROV5%, 4 → 6 GOLDEN |

### ⚠️ PARCIAIS

| # | Achado | Estado |
|---|---|---|
| #14 | Dois engines paralelos | Coexistem. PR #80 adicionou opt-in `usar_modulo_juridico` permitindo verba-modules dentro do gerador. `domain-orchestrator` ainda usado por `CasoDetalhe.tsx`. Decisão de unificar é refator arquitetural (1-2 meses). |
| #7 | Auto-detect duplicado client/edge | Teste de paridade detecta divergência (`auto-detect-tipo-paridade.test.ts`). Refator para `_shared/` segue pendente. |

### ❌ TIER 2 (não bloqueante)

| # | Achado | Observação |
|---|---|---|
| #1 (resíduo) | `excecoesCargas` e `excecoesSabado` continuam dead writes | Banners `ExperimentalBanner` explícitos nos dois módulos. |
| #6 | 5 pipelines OCR coexistindo | Funcionalmente compensável; refator é 1-2 semanas. |
| #8 | Magalu bloqueado pós-OCR | Custa Mistral. Pré-detecção via V6 é refator. |
| #11 | Só 2 layouts holerite | Adicionar layouts por demanda. |
| #18 | `Calculo.java` 41% portado | Inventário real: 1.951 LOC TS, 84% dos métodos. Auditoria estava errada. |

### 🟡 PIXEL-PERFECT Tier 3 (exige Java oficial)

7 casos APROV5% ainda não-GOLDEN: tiago/vanderlei (+2%), carla/roque (-2.5%), francisco/leide/izabela. Gap concentrado em componentes do FGTS implícito do PJC que o XML não decompõe explicitamente. **Para fechar, exigiria rodar o JAR oficial do PJe-Calc para reference.** Não bloqueante: 100% APROV≤5% já é margem para 1ª instância.

---

## O que está em produção

- **Pipeline OCR → 4 grades** com layout PJE-Calc (6 pares E/S no cartão de ponto)
- **Motor autônomo**: mensal, dezembro/13º, desligamento, período_aquisitivo
- **5 modos de reflexo** com média móvel
- **Faixas progressivas Lei 7.998/90** + tabela histórica seguroDesempregoDB
- **8 buckets de dedução** para pagamentos extras
- **ApuracaoDeJuros agregada** por competência
- **35 verba-modules** invocáveis via opt-in
- **Validação contra 14 PJCs reais** (versionados em `public/reports/`)
- **Bug #16 fechado**: Grade respeitada pelo engine (não regenera)
- **Bug #31 fechado**: Seguro-desemprego usa tabela histórica do banco

---

## Recomendação ao dono

**Pode entregar.** Margens:
- Liquidações em 1ª instância: margem 5% é aceitável (todos os 13 PJCs estão dentro).
- Liquidações > R$ 500k: continuar com **revisão manual cruzada** com PJe-Calc Cidadão oficial até pixel-perfect estar entregue.
- UI: ainda há 2 módulos fake-frontend com banner amarelo explícito (`ExcecoesCarga`, `ExcecoesSabado`). Operador é avisado.

Roadmap Tier 3 (pixel-perfect) está documentado e não bloqueante.

---

*Documento mantido honesto. Os 12 PRs mergeados estão verificáveis no histórico. O número 2.291 testes é executável. O 13/13 APROV≤5% é reproduzível com `npx vitest run parity-v3-vs-pjc.test.ts`.*

---

## Sprint 2 — Ontologia de Rubricas para DSR sobre Comissões (2026-05-21)

Mergeada via PR `feat/ontologia-rubricas-sprint-2`. Codifica a planilha
oficial do escritório como ontologia consultável; mappers de holerite
agora populam `rubricas_classificadas[]` + `resumo_classificacao` no
`documents.parsed`. UI exibe banner amarelo + dialog manual quando há
rubricas `NAO_CLASSIFICADO`, com persistência em
`documents.metadata.classificacoes_manuais_holerite`.

**Métricas E2E em holerite Via Varejo real (572 linhas, doc 585b6cdf):**

| Recorte | Taxa final | Critério (≥85%) |
|---|---|---|
| **(A)** Todas as linhas (vencimentos + descontos) | 66.8% | ⚠️ — ver nota abaixo |
| **(B)** Linhas com `valor_vencimento` (relevantes pra base de DSR) | **91.6%** | ✅ |
| **(C)** Soma R$ classificada / total | **94.7%** | ✅ |

**Nota sobre o recorte (A) — 66.8%:** o número baixo NÃO é bug — é
**escopo deliberado**. O recorte (A) inclui ~155 linhas de DESCONTO
(INSS, IRRF, Vale Transporte, Empréstimos consignados, etc.) que a
planilha do escritório **não cobre por design**, porque a planilha é
sobre VENCIMENTOS pra base de DSR sobre comissões. Descontos não entram
nessa base — então deixá-los como `NAO_CLASSIFICADO` é o comportamento
correto.

Se em iteração futura o MRD Calc precisar processar descontos pra outro
tipo de cálculo (ex.: líquido a receber, base IRRF, cálculo previdenciário),
considerar **Sprint 3 de expansão** — uma segunda ontologia de descontos
com sua própria taxonomia (INSS, IRRF, Convencional, Empréstimo, etc.)
e seu próprio classificador, mantida separada da ontologia de vencimentos
pra não misturar contextos jurídicos.

A juridicamente relevante pra DSR é **(C) — 94.7% por valor monetário**,
e em segundo lugar **(B) — 91.6% por linhas com vencimento**.

### Pendências do escritório (Sprint 2.5)

5 rubricas observadas em produção que **não constam na planilha** e
foram deliberadamente deixadas como `NAO_CLASSIFICADO` (não inventamos
categoria sem validação jurídica do escritório):

| Rubrica | Hipótese técnica | Decisão pendente |
|---|---|---|
| `Salário Família` | Verba previdenciária INSS; geralmente não integra base trabalhista | Validar com escritório (depende de CCT) |
| `Licença por Atestado Médico` | Afastamento — integra DSR sim/não conforme súmula | Validar com escritório |
| `1/3 Adic Const Fer` + `Difer 1/3 Adic Const` | Verba de férias (1/3 constitucional) | Validar (sumária trat. DSR) |
| `Restituição Provis. Férias` | Verba contábil de férias | Validar |
| `Diferença Média Férias` | Ajuste de média de férias | Validar |
| `Horas Extras Com 70%` (+ variantes Intervalo, Noturna, 100%) | HE — análoga a `DSR H. Extra` (já em DESCONSIDERAR via Súmula 172) | Provavelmente DESCONSIDERAR, mas confirmar com escritório se inclui HE base ou só DSR-sobre-HE |
| `Insuf Saldo no Mês` | **Ambígua** (R$ 191 — natureza não clara) | Esclarecer com escritório |

**Próxima iteração:** depois do escritório validar essas 7 verbas
(via planilha v2), adicionar como canônicas/sinônimos na ontologia e
re-rodar E2E. Expectativa: taxa salta pra >97% no recorte B.

### Limpeza pendente no GitHub

Branch órfão `claude/determined-lovelace-7mb5h` (auto-gerado, renomeado
pra `feat/ontologia-rubricas-sprint-2`). Tentativa de delete via push
HTTP retornou 403 do proxy git do ambiente managed — **precisa ser
deletado manual via UI do GitHub** depois do merge da Sprint 2.

---

## Sprint 3 — Cobertura 99%+ dos 2 layouts Via Varejo (2026-05-22)

Mergeada via PR `feat/sprint-3-layouts-via-varejo`. Resolve cobertura
parcial do layout NOVO "Espelho de Ponto Minha" (pós-2018) e melhora
o layout ANTIGO com 5 marcadores semânticos novos + camada 2.5
(totalizador FERIADO/DSR) + fix camada 2 (batidas reais coincidem com
escala). Dispatcher novo `escolherEMapear` roda AMBOS mappers em PDFs
híbridos e mescla por data.

### Versões dos mappers
- `cartao_via_varejo_v1`: **v7.2 → v7.3** (5 marcadores novos + 2 camadas novas + delegação SÓ-ESPELHO)
- `cartao_via_varejo_minha_v1`: **v1** (novo — consome `paginas[].tabelas` direto)

### Métricas de calibração contra PDFs reais (linha-por-linha vs ground truth)

Calibração via `scripts/calibracao/calibrar.py` (pdfplumber) + validador
alternativo `scripts/validar-completo.py` que cobre AMBOS layouts page-by-page:

| PDF | Páginas | Mappers executados | Apurações CSV | Coerência | Meta |
|---|---|---|---|---|---|
| Jefferson ANTIGO (até 15/06/2021) | 72 | `cartao_via_varejo_v1` | 744 | **100.00%** (744/744 perfeitos) | ≥99% ✅ |
| Jefferson NOVO (16/06/2021+) | 26 | `cartao_via_varejo_minha_v1` | 596 | **99.33%** (592/596 perfeitos, 4 diverg.) | ≥99% ✅ |
| **Híbrido Izabela** | 37 | **`minha_v1` + `v1` (MERGE)** | 463 | **99.14%** (459/463 perfeitos, 4 diverg.) | ≥98% ✅ |

Divergências residuais (sub-1%, não-bloqueantes — registradas como Sprint 3.5):
- 2 casos de 5 batidas reais (sábado longo) onde minha heurística "len==5
  sem palavra-chave → descarta 5ª" perde batida válida — caso raro
- 4 casos de `00:00` ou `07:20` vazando como batida de totalizadores
  específicos não cobertos (Hora Extra Feriado 0%, HE-Comiss 50% Intervalo)

Período coberto pelos 3 PDFs: 2018-08-13 → 2023-02-05 (4.5 anos contínuos).

Ocorrências detectadas no PDF Híbrido: NORMAL 321, DSR 40, LICENCA_MEDICA
24, FERIADO 5, AFASTAMENTO 2. **Merge real funcionou** — datas pré-
e pós-transição (16/06/2021) processadas pelos mappers corretos e
combinadas sem conflito.

### Marcadores novos no mapper antigo (Fase 1)

Adicionados ao `RE_MARCADOR_COLUNA_DUPLA`:
- `ABONO AUTORIZADO` (CAPS — distingue do "Abono Autorizado" do layout novo)
- `AFAST` standalone (CAPS — prefixa "Férias Férias" e "Atestado Médico")
- `Falta Injustificada` (i)

Movidos pra camada 0 (`RE_MARCADOR_PRE_BATIDAS`, só dispara se sem HH:MM antes):
- `Treinamento` (i) — defesa contra palavra em contexto histórico
- `Problemas Relogio` (sem acento, i)

### Decisões de design

**Opção (b) — mapeamento dos 6 slugs novos pros 10 do enum existente**
(sem migration, granularidade em `apuracao.observacao`):

| Slug spec | Mapeio pra | Observação |
|---|---|---|
| Licença falecimento | AFASTAMENTO | "Licença falecimento" |
| Acompanhamento Medico | ATESTADO | "Acompanhamento médico" |
| Abono Autorizado | AFASTAMENTO | "Abono autorizado" |
| Dia do Comerciario | FOLGA | "Dia do Comerciário" |
| DSR Descontado | FALTA | "DSR descontado" |
| Problemas Relogio (com batidas) | NORMAL | "Problemas relogio" |
| Problemas Relogio (sem batidas, `--`) | AFASTAMENTO | "Problemas relogio" |

**Modo merge no dispatcher**: regra de precedência por data é "prevalece
quem tem mais batidas reais". Empate de contagem mantém o mapper de
maior score (já vem primeiro na lista). Competência predominante
RECALCULADA das apurações pós-merge (evita dupla-contagem).

**Fallback hierárquico no `escolherMappersCartaoPonto`**: se algum
mapper ESPECÍFICO (Via Varejo) aplica, fallback `cartao_generico_v1` fica
de fora. Garante que PDFs Via Varejo híbridos rodem só os 2 Via Varejo
(sem ruído do genérico) E que PDFs de outro empregador caiam pro
genérico sem competição.

### Pendências Sprint 3.5 (não-bloqueantes)

1. **Coincidência "4 batidas = escala" — NÃO-MENSURÁVEL na calibração
   atual** (achado da Fase 1 que persiste). O `calibrar.py` usa a MESMA
   heurística do mapper antigo (extraída do código), então ambos
   descartam os mesmos dias e dão 100% tautológico. Pra medir de verdade
   precisa ground truth INDEPENDENTE. Opções (sugestão Gabriel):
   - (a) Pedir 10-20 cartões com confirmação humana de "jornada exata"
   - (b) Modo "agressivo" no calibrar.py (sem heurística da escala),
     mede delta. Se delta ≈ 0, padrão raro → fica como está
   - (c) Aceitar como decisão de produto: "operador valida na revisão"

   Recomendação: começar com (b) — custo zero, dá número real pra decidir.

2. **Reconciliação flag false** nos PDFs Jefferson antigo (35 períodos
   divergentes) e Híbrido (9 períodos). Preexistente. Não regressão
   da Sprint 3 — Fase 4 v7 já documentou como dívida técnica.

3. **Mapper antigo: 0 ocorrências não-NORMAL no Jefferson antigo**
   apesar de 75 AFASTAMENTOS detectados (foram pra `diasDescartados`).
   Design intencional (CSV PJe-Calc não precisa de DSR/feriado vazio),
   mas pode confundir UI que mostra só `apuracoes`. Considerar expor
   `diasDescartados` no preview.

4. **Divergências residuais < 1% da calibração** (8 casos totais nos 3 PDFs):
   - `05/02/2022` Jefferson novo: 5 batidas reais legítimas (sábado
     longo) onde heurística `len==5 sem palavra-chave → descarta 5ª`
     perde a 5ª. Caso raro. Reformular heurística (Sprint 3.5).
   - `00:00` vazando como batida em dias FERIADO (3 ocorrências) — o
     totalizador `Hora Extra Feriado 0% : 00:00` vem da TABELA (não do
     texto plano), então a expansão do `RE_INICIO_RESULTADO` não pegou.
     Fix: aplicar `RE_INICIO_RESULTADO` também no AJUSTES da tabela.
   - `00:10` extra em 15/03/2022 Izabela — o separador `|` no texto
     do PDF (`HE-Comiss-|50% Intervalo`) quebra a regex `HE\s*[-–]\s*Comiss`.
     Fix: regex tolerante a `|` entre tokens.

### Lição metodológica registrada (Gabriel, Sprint 3 Fase 4)

**Counting ≠ Calibração.** O primeiro relatório da Fase 4 reportou 440
apurações extraídas com "0 warnings" como aceitação — passou no smoke
test mas tinha dezenas de bugs invisíveis (4ª batida vazando pra AJUSTES,
páginas inteiras perdidas por clustering, totalizadores virando batidas).
A calibração real linha-por-linha contra ground truth revelou **7 bugs
distintos** que foram fixados.

**Regra pra futuras sprints**: nunca aceitar smoke test (contagem de
saídas, presença de warnings, distribuição de ocorrências) como aceitação
final. Calibração contra ground truth independente é obrigatória pra
features que produzem dados pra cálculo trabalhista — o custo de errar
em escala é alto demais. Quando o autor do código também escreve o
ground truth (tautologia), buscar fonte externa (revisão humana, parser
alternativo, dados de produção pareados manualmente).

---

## Sprint 3c — Holerite ↔ Ontologia (2026-05-22)

**Entrega:** a ontologia de 96 rubricas validadas pelo escritório
(Sprint 2) agora **chega no CSV final** exportado pra PJe-Calc Cidadão.
Antes da 3c a ontologia ficava inerte: o operador via a classificação
no banner `OntologiaClassificacaoBanner` mas o CSV usava categorização
do `hints.ts` legado. **A Sprint 2 estava funcionalmente fechada mas
sem entrega — a 3c liga os dois mundos.**

### O que mudou

`classifyHolerite` ganhou uma **camada nova (camada 2)** entre as
defesas existentes (totalizador, desconto) e o `hints.ts` legado:

```
Camada 1: defesa em profundidade  (flag_suspeita, totalizador, isDesconto)
Camada 2: ontologia (Sprint 3c)   ← NOVO
Camada 3: hints.ts legado         (HE, INSS, comissão por regex)
Camada 4: fallback                (salario_fixo)
```

Quando `parsed.rubricas_classificadas` (populado pelos mappers Deno)
classifica uma rubrica em categoria válida da ontologia, o classifier
promove pra `CategoriaSlug` correspondente via tabela
`ONTOLOGIA_PARA_CATEGORIA_SLUG`. Origens novas: `'ontologia'` (mapeado
pra slug, vai pro CSV) e `'ontologia_desconsiderar'` (catalogado como
"fora do CSV", não inclui).

### Hidratação do JSONB no callsite

`per-doc/index.ts` agora lê `rubricas_classificadas` de
`documents.parsed` JSONB (campo `v6Parsed`, populado em produção pelos
mappers Deno) e injeta no `classifyHolerite`. Helper
`extrairRubricasClassificadasDoV6` faz narrowing seguro de `unknown`
com validação mínima de shape — quando JSONB vier malformado/ausente,
retorna `undefined` e classifier opera só com hints + fallback
(não-regressão garantida).

Drift warning via `logger.warn` quando
`parsed.rubricas.length !== rubricasClassificadas.length` — sinaliza
discordância entre parser frontend e mapper Deno sobre quantas rubricas
existem no holerite.

### Calibração contra 3 PDFs reais (Fase 4 + 4.1)

Pipeline replica o caminho V6 de produção:
`docTabularSintetico(ocrText) → escolherMapper(doc, 'holerite') →
mapper.mapear() → classifyHolerite`.

| PDF | Mapper | Holerites OK | Total rubricas | Cob. todas | **Cob. efetiva** | **Correção** |
|---|---|---|---|---|---|---|
| Roque (VV antigo, 73p)         | `holerite_via_varejo_v1` | 52/73 | 1072 | 35.4% | **80.1%** ✅ | **100%** (155/155) |
| Rosicleia antigo (VV, 44p)     | `holerite_via_varejo_v1` | 38/44 |  693 | 59.3% | **95.6%** ✅ | **100%** (196/196) |
| Rosicleia novo (Casas Bahia SAP) | — (não detectado)      |  0/35 |    0 |   n/a |   n/a       | n/a (0/0)         |

**Total auditável: 351 linhas, ZERO divergências.** Meta ≥80% efetiva
+ 100% correção batida nos PDFs Via Varejo antigo.

**Cobertura efetiva** = `(ontologia + ontologia_desconsiderar) / (total
- descontos - totalizadores - ignorar_hint)`. Exclui linhas que jamais
seriam ontologia (defesa em profundidade da camada 1.5), pra não
diluir a métrica artificialmente.

### Metodologia anti-tautologia

Ground truth = **lookup literal direto no catálogo `ONTOLOGIA`**
(`texto_canonico` ou string em `sinonimos[]`, com normalização mínima:
`trim + toLowerCase`). Observado = saída do `classifyHolerite` (interno
usa `enriquecerComClassificacao` com NFD + sinônimo + fuzzy Levenshtein
@ 0.85). Diferença real:

- Concordância → ok
- Literal não acha (fuzzy do classifier foi mais agressivo) → `fuzzy_only`,
  não conta (439 casos: variações tipo `DSR(Comissão)`, `COM. GARANTIA`)
- Literal acha e diverge → BUG REAL (zero ocorrências nos 3 PDFs)

### JSONB round-trip (Fase 4.1 — fechamento do gap)

Fase 4 inicial chamou `mapper.mapear(doc)` e injetou direto no
classifier — mesmo runtime, sem serialização. Em produção, V6 passa
por `documents.parsed` JSONB no PostgreSQL: mapper Deno persiste,
frontend lê via cliente Supabase. Serialização JSON quebra referências
de objeto, pode normalizar tipos e expõe o type guard.

4 testes E2E em `__tests__/calibracao/holerite-jsonb-roundtrip.test.ts`
validam:

1. Round-trip preserva shape (extrair → array de length correto,
   categorias e score_match preservados)
2. Match por referência QUEBRA após JSONB, fallback `(codigo, nome)`
   salva — com pré-assertion `Object.is(...) === false` ANTES da
   chamada (pega regressão se o teste passar por acidente)
3. E2E pipeline real (`parsed → jsonRoundtrip → extrair → classify`)
   preserva metadados pós-serialização
4. Type guard resiste a JSONB malformado em 9 cenários, **+1 cenário
   documenta fragilidade conhecida** (`{ rubrica: null, categoria:
   'STRING_QUALQUER' }` passa porque `'rubrica' in rc` checa só
   presença) — gate intencional pra Sprint 3c.1 endurecer.

### Métricas técnicas

| Item | Valor |
|---|---|
| Testes verdes | **2612 / 0 failing / 43 skipped** (baseline 2590 + 22 novos Sprint 3c) |
| Typecheck | exit 0 |
| Arquivos modificados | 5 produção + 2 teste + 1 script Python + .gitignore |
| Linhas adicionadas | ~860 |
| Correção em rubricas reais | 100% (351/351 auditáveis) |
| Cobertura efetiva Via Varejo antigo | 80–96% |

### Lição metodológica (Fase 4 → 4.1)

**A Fase 4 inicial omitiu o caminho de produção real.** Calibrei contra
`mapper.mapear(doc) → classifyHolerite` no MESMO runtime, sem
serialização. Produção V6 passa por `documents.parsed` JSONB no
PostgreSQL — serialização quebra referências de objeto. Sem a Fase 4.1,
o teste teria assumido que o caminho `Object.is` funciona em prod (NÃO
funciona — sempre cai no fallback `(codigo, nome)`).

**Regra pra próximas sprints**: calibração precisa validar o caminho
de produção REAL, não pipeline simulado em laboratório. Pra features
que envolvem persistência (JSONB, fila, cache), incluir round-trip
no critério de aceite da calibração. Idealmente um teste E2E que faça
o caminho completo do dado, mesmo que sintético — pegar serialização
e narrowing antes de aparecer em prod.

### Pendências Sprint 3c.1 (não-bloqueantes)

1. **Mapper `holerite-casas-bahia-sap-v1`** + expansão da ontologia
   pra layout SAP (Rosicleia novo: 0/35 detectados — header usa
   `"Proventos Descontos"` e competência `"Período : MM.YYYY"`,
   `detectCompetencia` retorna null). **Alta prioridade** — é o futuro
   próximo do empregador.

2. **Páginas puladas em PDFs com transição mid-PDF** (Roque 21/73,
   Rosicleia antigo 6/44). Provavelmente últimas competências viraram
   layout SAP no meio do PDF. Resolvido junto com (1).

3. **UI** mostrando origem da classificação: verde pra `origem='ontologia'`
   (validada pelo escritório), azul pra `'ontologia_desconsiderar'`,
   badge "Validado pelo escritório", tooltip com `metodo_match`,
   `score_match`, `divergencia_juridica`. Metadados já preservados em
   `LinhaClassificada.classificacao_ontologia` — só falta o componente.

4. **Endurecer type guard** de `extrairRubricasClassificadasDoV6`
   adicionando `typeof rubrica === 'object' && rubrica !== null &&
   CATEGORIAS_VALIDAS.has(categoria)`. O teste 4 cenário 9 da Fase 4.1
   está com assertion intencional `expect(...).toBeDefined()` — quando
   o guard for apertado, esse teste falha de propósito e força revisão
   consciente.

5. **Parser frontend `parseHolerite` cobrir pipes ADP** (regex
   `RE_LINHA_RUBRICA` não aceita `|`). Baixa prioridade — caminho V6
   (mapper Deno) cobre. Relevante só no fluxo legado
   `ocr_provider ≠ pdfjs_geometric`.
