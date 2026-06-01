# Spec — Histórico Salarial

> **Seção 4/16** — paridade de input PJe-Calc Cidadão **v2.15.1** (confirmado `_recursos-oficiais/messages.properties` versao=2.15.1).
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico p/ regra) | `pjecalc-fonte/negocio/.../dominio/historicosalarial/` | tipos, validação |
> | App PJe-Calc | screenshot | labels/ordem |

---

## 0. Domínio (Java)
Duas entidades em `negocio/.../dominio/historicosalarial/`:

| Papel | Classe | Tabela | Arquivo |
|---|---|---|---|
| **Header** (série nomeada) | `HistoricoSalarial` | `TBHISTORICOSALARIAL` | `HistoricoSalarial.java:87` |
| **Ocorrência** (1 por competência) | `OcorrenciaDoHistoricoSalarial` | `TBOCORRENCIAHISTORICOSALARIAL` | `OcorrenciaDoHistoricoSalarial.java:54` |

Um `Calculo` tem **N** séries nomeadas (`Calculo.historicosSalariais`, `@OneToMany`, `@OrderBy("nome")` — `Calculo.java:298-300`). Cada série tem N ocorrências mensais (`@OneToMany mappedBy=historicoSalarial` — `HistoricoSalarial.java:127-128`), ordenadas por data (`Comparable` — `OcorrenciaDoHistoricoSalarial.java:198-201`).

> **NÃO existe** (não inventar): "tipo de salário" mensalista/horista/diarista, "número de horas", "motivo/origem da alteração". O valor é um `BigDecimal` mensal flat. A "base" é o split **Informado/Calculado** (form de geração, transiente).

## 1. Campos — `OcorrenciaDoHistoricoSalarial` (a entrada de fato)
| # | Campo (label) | Tipo Java | Col. / precisão | Obrig. | Default | Origem |
|---|---|---|---|---|---|---|
| 1 | **Mês/Ano** (competência) | Date | `DDTOCORRENCIA` | **sim** (`@NotNull`) | null | `:69-72` |
| 2 | **Valor** | BigDecimal | `MVLOCORRENCIA` **(12,2)** | **sim** (`@NotNull`) | null | `:73-75` |
| 3 | Recolhido FGTS | Boolean | `SFLFGTSRECOLHIDO` | `@NotNull` | **false** | `:77-80` |
| 4 | Recolhido INSS | Boolean | `SFLINSSRECOLHIDO` | `@NotNull` | **false** | `:82-85` |
| 5 | Incidência FGTS | Boolean | `SFLBASEFGTS` | `@NotNull` | **false** | `:87-90` |
| 6 | Incidência INSS | Boolean | `SFLBASEINSS` | `@NotNull` | **false** | `:92-95` |

## 2. Campos — `HistoricoSalarial` (header da série)
| # | Campo | Tipo | Col. | Obrig. | Default | Origem |
|---|---|---|---|---|---|---|
| 7 | **Nome** (da série) | String(120) **unique** | `SNMHISTORICOSALARIAL` | **sim** (`@Required` MSG0003) | null | `:101-103` |
| 8 | Tipo de Variação | `TipoVariacaoDaParcelaEnum` | `STPVARIACAOPARCELA` | — | **FIXA** | `:104-106` |
| 9 | Incidência FGTS | Boolean `@NotNull` | `SFLBASEFGTS` | — | **false** | `:107-111` |
| 10 | Proporcionalizar FGTS | Boolean `@NotNull` | `SFLPROPORCIONALIZARFGTS` | — | **false** | `:112-116` |
| 11 | Incidência INSS | Boolean `@NotNull` | `SFLBASEINSS` | — | **false** | `:117-121` |
| 12 | Proporcionalizar INSS | Boolean `@NotNull` | `SFLPROPORCIONALIZARINSS` | — | **false** | `:122-126` |

### Form de geração (transiente — grupo validação `1`)
competenciaInicial (`@Required`+`@LimitedTo100Years`), competenciaFinal (idem + `@GreaterOrEqualThan(competenciaInicial)` MSG0008), valorParaBaseDeCalculo (`@Required` se tipoValor='I'), tipoValor (default INFORMADO), baseDeReferencia (`@Required` se 'C'), quantidade (default ONE, `@Required` se 'C'). `HistoricoSalarial.java:129-155`. Gera ocorrências em massa via `gerarOcorrencias()` (`:334`).

### Enums
| Enum | Valores (label / DB) | Arquivo |
|---|---|---|
| `TipoVariacaoDaParcelaEnum` | FIXA "Fixa"/"F"; VARIAVEL "Variável"/"V" | `TipoVariacaoDaParcelaEnum.java:6-8` |
| `TipoValorEnum` | INFORMADO "Informado"/"I"; CALCULADO "Calculado"/"C" | `TipoValorEnum.java:6-8` |
| `BaseDeCalculoDoPrincipalEnum` | UR/MR/HS/SC(Piso)/SM/VT | `BaseDeCalculoDoPrincipalEnum.java:17-23` |

## 3. Validação imperativa
- **`HistoricoSalarial.validar()`** (`:392-399`): annotations + **≥1 ocorrência** senão `MSG0047 "Ocorrências"`.
- **`Calculo.validarUsoCorretoDoHistoricoSalarial()`** (`:2043-2060`): verba com base `HISTORICO_SALARIAL` exige ≥1 série vinculada senão `MSG0032`.
- **NÃO há** validação de overlap/gap entre ocorrências (MSG0024 é p/ exceções de carga/sábado/cartão, não p/ histórico). Unicidade de competência é estrutural (`equals/hashCode` por `dataOcorrencia`; `gerarOcorrencias` deduplica).

## 4. Estado atual no MRD (verificado contra prod)
Modelo equivalente em 2 tabelas + view:
- **`pjecalc_hist_salarial`** (tabela, header): id, calculo_id, case_id, nome, tipo_variacao, incide_inss, incide_fgts, incide_ir, valor_fixo, observacoes.
- **`pjecalc_hist_salarial_mes`** (tabela, ocorrência): id, calculo_id, case_id, hist_salarial_id, competencia (DATE), valor, origem, documento_id.
- **`pjecalc_historico_salarial`** (VIEW): header + `periodo_inicio/fim` (min/max das competências).
- Módulo ativo: `ModuloHistoricoSalarial.tsx` (grid 1 linha por ocorrência, OCR-integrado). `GradeHistorico.tsx` = dead code.

### Wiring (JÁ existe — confirmado)
`loadCaseData → getHistoricoSalarial` (view) + `getHistoricoOcorrencias` → `resolver.ts:184` mapeia para `SalaryHistoryInput` (periodo_inicio **required**, valor_informado, incidência fgts/cs, ocorrências). `validator.ts:139/153` tem blockers: "sem histórico mas há verbas", "histórico sem valores → base zero". **Histórico chega ao engine.**

### Gap / divergências de paridade
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| Mês/Ano competência | obrigatório | `competencia` (input month) | manter; validar não-vazio |
| Valor | `@NotNull`, BigDecimal(12,2) | `valor` numeric, **editado via `parseFloat`** | **🐞 corrigir: usar Decimal** (CLAUDE.md proíbe parseFloat em $) |
| Recolhido FGTS/INSS | 2 flags na ocorrência | **ausentes** na grid (só incidência via header) | extras de paridade — fora do MVP da grid; registrar dívida |
| tipo_variacao | FIXA/VARIAVEL | grid tem FIXA/VARIAVEL/**INFORMADA** | INFORMADA é extra MRD; manter (não quebra) |
| incide_ir | (não há IR na ocorrência Java; há FGTS/INSS) | grid tem INSS/FGTS/IR | IR é extra MRD; manter |

> **Decisão (autonomia):** escopo desta seção = (1) corrigir `parseFloat`→Decimal no valor; (2) schema zod validando competência + valor obrigatórios/Decimal/não-negativo; (3) testes + e2e. Os flags "Recolhido FGTS/INSS" por ocorrência ficam como **dívida de paridade registrada** (baixa prioridade; o engine usa incidência da série, e o MRD já resolve incidências no resolver). Não altero a estrutura de 2 tabelas (contida).

## 5. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3213 passed | 45 skipped | 0 failed** (era 3205 → +8, zero regressão)
- [x] testes da seção: `historico-salarial-schema.test.ts` = **8 verdes** (schema + money helper)
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — competência obrigatória/formato; valor obrigatório/Decimal/≥0
- [x] **parseFloat→Decimal corrigido** — `ModuloHistoricoSalarial.tsx` usa `toMoneyNumber`/`isValidMoney` (novo `src/lib/pjecalc/money.ts`); bloqueia valor inválido na célula
- [x] persistência via MCP — round-trip header+ocorrência pela view `pjecalc_historico_salarial` (nome, tipo_variacao, incide_fgts, valor=1500.00, periodo); rows removidas
- [x] Playwright e2e → **1 passed (6.4s), exit 0** — `e2e/fluxos/11-historico-salarial.spec.ts`
- [x] spec commitada / commit isolado da seção
