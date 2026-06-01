# Spec — Exceções Carga Horária

> **Seção 9/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/calculo/ExcecaoDaCargaHorariaDoCalculo.java` + `Calculo.java:2062-2072` | tipos, validação |
> | App PJe-Calc | aba "Exceções Carga Horária" | labels |

---

## 0. Domínio (Java)
Entidade `ExcecaoDaCargaHorariaDoCalculo` (`:52`, `@Entity TBEXCECAOCARGAHORARIACALCULO`, seq `SQEXCECAOCARGAHORARIACALCULO`). `@ManyToOne` → `Calculo` (`IIDCALCULO`, `:62-64`). Coleção em `Calculo`: `Set<ExcecaoDaCargaHorariaDoCalculo> excecoesDaCargaHoraria = new HashSet<>()` (`Calculo.java:313`).

## 1. Campos canônicos
| # | Campo (label) | Tipo Java | Col. JPA | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|---|
| 1 | **Período Início** | Date | `DDTINICIOEXCECAO` (not null) | **sim** (`@Required`) | null | `@LimitedTo100Years` | `:65-69` |
| 2 | **Período Fim** | Date | `DDTTERMINOEXCECAO` (not null) | **sim** (`@Required`) | null | **término ≥ início** (`@GreaterOrEqualThan`); `@LimitedTo100Years` | `:70-75` |
| 3 | **Carga Horária** | BigDecimal | `RVLCARGAHORARIA` **(precision 7, scale 4)** | **sim** (`@Required`) | null | — (≥0 implícito) | `:76-78` |

> Carga horária aqui é a **mensal** (mesmo domínio de `Calculo.valorCargaHorariaPadrao` default 220, precision 7/4). No MRD a coluna é `carga_horaria_mensal`.

## 2. Validação imperativa
- **`validar()`** (`:154-158`): Bean-Validation (required + término≥início + 100 anos).
- **`Calculo.adicionar(...)`** (`:2062-2072`): chama `validar()` e então, p/ cada exceção existente, se `isPeriodoCoincidenteCom` (período coincide, inclusivo) → **MSG0024** "datas coincidentes" (`:2067`).
- **Regra cruzada (`Calculo.consistirCamposObrigatorios:487`):** se há exceções e `valorCargaHorariaPadrao` é null → **MSG0033** (carga padrão obrigatória). (No MRD a carga padrão vem de Parâmetros Gerais — Seção 2.)
- Sem enums. Ordenação: coleção `HashSet` (sem `@OrderBy`); UI ordena por início.

## 3. Estado atual no MRD (verificado contra prod)
- **`pjecalc_excecoes_carga`** (tabela): `id, case_id, periodo_inicio:date, periodo_fim:date, carga_horaria_mensal:numeric, created_at`.
- Módulo `ModuloExcecoesCarga.tsx` (dialog: Período Início/Fim + Carga Mensal). Valida só "campos preenchidos" — **sem** término≥início, **sem** overlap.
- **Wiring (confirmado):** `orchestrator.loadExcecoesCarga` (`:909-929`) lê `periodo_inicio/periodo_fim/carga_horaria_mensal` e mapeia → `PjeExcecaoCargaHoraria {data_inicial, data_final, carga_horaria}`; passado ao `PjeCalcEngineV3` (arg 17, `:1835`) → `this.excecoesCargas` (engine-v3:281).
  - **⚠️ Engine V3 armazena mas NÃO aplica** carga diferenciada no cálculo (só atribuição no construtor; nenhuma leitura em lógica de cálculo). O `ExperimentalBanner` do módulo é **correto** ao avisar isso. **Motor fora de escopo** — não altero; o campo chega ao INPUT do engine (DoD satisfeita), a aplicação é dívida do motor.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| início/fim/carga obrigatórios | @Required | parcial (já checa) | manter + schema |
| término ≥ início | @GreaterOrEqualThan | ausente | **+schema (MSG0008-like)** |
| overlap entre exceções | MSG0024 | ausente | **+detecção (reusa periodosCoincidem de falta-schema)** |
| carga ≥ 0 | (implícito) | ausente | **+schema** |
| 100 anos | @LimitedTo100Years | ausente | best-effort (baixa prio) |

> **Decisão (autonomia):** `excecao-carga-schema.ts` (zod: required + término≥início + carga≥0) + `detectarOverlapExcecao` (reusa `periodosCoincidem`/lógica de `falta-schema.ts`). Fiar validação no `saveExc` do `ModuloExcecoesCarga`, bloqueando overlap/ordem. Banner mantido (verídico). Tabela mantida.

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3262 passed | 45 skipped | 0 failed** (era 3253 → +9, zero regressão)
- [x] testes da seção: `excecao-carga-schema.test.ts` = **9 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — required; término≥início (MSG0008); carga≥0; overlap inclusivo (MSG0024)
- [x] campo→engine — confirmado por inspeção: `loadExcecoesCarga` (orchestrator:909-929) mapeia `periodo_inicio/periodo_fim/carga_horaria_mensal` → `PjeExcecaoCargaHoraria` e passa ao engine (arg 17, :1835). (Engine V3 recebe mas não aplica — dívida do motor, banner avisa.)
- [x] persistência via MCP — round-trip (carga_horaria_mensal=180.0000, scale 4); row removida
- [x] Playwright e2e → **2 passed (10.9s), exit 0** — `e2e/fluxos/15-excecoes-carga.spec.ts` (adiciona→persiste; fim<início→bloqueia)
- [x] spec commitada / commit isolado da seção

## 5. Dívidas
- Engine V3 não aplica carga horária diferenciada (só recebe no input) — dívida do motor (fora de escopo). Banner do módulo já avisa.
- `@LimitedTo100Years` não replicado (baixa prioridade).
