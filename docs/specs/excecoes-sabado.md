# Spec — Exceções Sábado

> **Seção 10/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/calculo/ExcecaoDoSabadoDoCalculo.java` + `Calculo.java:2098-2108` + `base/.../LogicoFuzzy.java:30-40` | tipos, validação, semântica |

---

## 0. Domínio (Java) + DIVERGÊNCIA de modelagem (importante)
Entidade `ExcecaoDoSabadoDoCalculo` (`:52`, `@Entity TBEXCECAOSABADODIAUTILCALCULO`, seq `SQEXCECAOSABADODIAUTILCALCULO`). `@ManyToOne` → `Calculo` (`IIDCALCULO`, `:63-65`). Coleção `Set<ExcecaoDoSabadoDoCalculo> excecoesDoSabado = new HashSet<>()` (`Calculo.java:314-315`).

**No Java a entidade é um PERÍODO PURO — NÃO tem flag booleana de sábado.** Cada período **inverte** o default global `Calculo.sabadoDiaUtil` (default true = "sábado é dia útil") para datas contidas nele (`LogicoFuzzy.isValido` `:30-40`: `resultado = resultado == false` na primeira interseção, com `break`).

**O MRD diverge (modelagem explícita, funcionalmente equivalente):** a tabela/UI/engine-type guardam `sabado_dia_util` **por período** (o valor resultante para aquele período), em vez de inverter implicitamente o global. É uma escolha de design defensável e internamente consistente no MRD; o engine V3 consome esse flag explícito. **Mantida** (fonte-da-verdade = Java p/ regra, mas não altero o motor nem o modelo de consumo do MRD). Divergência registrada.

## 1. Campos canônicos (Java)
| # | Campo | Tipo Java | Col. JPA | Obrig. | Validação | Origem |
|---|---|---|---|---|---|---|
| 1 | **Data Início** | Date | `DDTINICIOEXCECAO` (not null) | **sim** (`@Required`) | `@LimitedTo100Years` | `ExcecaoDoSabadoDoCalculo.java:66-70` |
| 2 | **Data Fim** | Date | `DDTTERMINOEXCECAO` (not null) | **sim** (`@Required`) | **término ≥ início** (`@GreaterOrEqualThan`); `@LimitedTo100Years` | `:71-76` |
| — | (sem flag no Java) | — | — | — | inversão no consumo (`LogicoFuzzy`) | — |

### Campo extra do MRD
| Campo MRD | Tipo | Default | Semântica |
|---|---|---|---|
| `sabado_dia_util` | boolean | false (no form) | "Sábado é dia útil neste período" — flag explícito do resultado (vs inversão implícita Java) |

## 2. Validação imperativa
- **`validar()`** (`:143-147`): Bean-Validation (required + término≥início + 100 anos).
- **`Calculo.adicionar(ExcecaoDoSabadoDoCalculo)`** (`Calculo.java:2098-2108`): chama `validar()` e, p/ cada exceção existente, se `isPeriodoCoincidenteCom` → **MSG0024** (overlap inclusivo). Sem enums; `HashSet` sem `@OrderBy`.

## 3. Estado atual no MRD (verificado contra prod)
- **`pjecalc_excecoes_sabado`** (tabela): `id, case_id, data_inicio:date, data_fim:date, sabado_dia_util:boolean, created_at`.
- Módulo `ModuloExcecoesSabado.tsx` (dialog: Data Início/Fim + checkbox "Sábado é dia útil"). Valida só "campos preenchidos" — **sem** término≥início, **sem** overlap.
- **Wiring (confirmado):** `orchestrator.loadExcecoesSabado` (`:931-950`) lê `data_inicio/data_fim/sabado_dia_util` → `PjeExcecaoSabado {data_inicial, data_final, sabado_dia_util}`; passado ao engine (arg 24, `:1842`).
  - **⚠️ Engine V3 recebe mas NÃO aplica** sábado não-útil diferenciado (banner do módulo avisa, corretamente). **Motor fora de escopo.** Campo chega ao INPUT (DoD satisfeita).
- **NB:** há também `ExcecoesSabado.tsx` (componente não roteado/legado; o roteado é `ModuloExcecoesSabado`).

### Gap (escopo desta seção)
required + término≥início (MSG0008) + overlap (MSG0024). Reusa `periodosCoincidem` (§5).

> **Decisão (autonomia):** `excecao-sabado-schema.ts` (zod: required + término≥início) + `detectarOverlapExcecaoSabado` (reusa helper). Fiar no `saveExc` do `ModuloExcecoesSabado`. Mantém `sabado_dia_util` (divergência registrada). Banner mantido (verídico).

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3271 passed | 45 skipped | 0 failed** (era 3262 → +9, zero regressão)
- [x] testes da seção: `excecao-sabado-schema.test.ts` = **9 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — required; término≥início (MSG0008); overlap inclusivo (MSG0024)
- [x] campo→engine — confirmado por inspeção: `loadExcecoesSabado` (orchestrator:931-950) mapeia `data_inicio/data_fim/sabado_dia_util` → `PjeExcecaoSabado` e passa ao engine (arg 24, :1842). (Engine V3 recebe mas não aplica — banner avisa.)
- [x] persistência via MCP — round-trip (data_inicio/data_fim/sabado_dia_util); row removida
- [x] Playwright e2e → **2 passed (10.4s), exit 0** — `e2e/fluxos/16-excecoes-sabado.spec.ts` (adiciona→persiste; fim<início→bloqueia)
- [x] spec commitada / commit isolado da seção

## 5. Dívidas
- **Divergência de modelagem:** Java = período puro que inverte global; MRD = flag explícito por período. Funcionalmente equivalente; mantido.
- Engine V3 não aplica sábado diferenciado (motor — fora de escopo; banner avisa).
- `@LimitedTo100Years` não replicado (baixa prio).
- `ExcecoesSabado.tsx` legado não-roteado (limpeza futura).
