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
| Todas as linhas (vencimentos + descontos) | 66.8% | ❌ — descontos fora do escopo da planilha |
| Linhas com `valor_vencimento` (relevantes pra base de DSR) | **91.6%** | ✅ |
| Soma R$ classificada / total | **94.7%** | ✅ |

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
