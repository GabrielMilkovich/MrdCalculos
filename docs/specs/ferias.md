# Spec — Férias

> **Seção 6/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/calculo/ferias/Ferias.java` + `regras/*ValidRule.java` + `constantes/SituacaoDaFeriasEnum.java` | tipos, validação |
> | App PJe-Calc | screenshot | labels/ordem |

---

## 0. Domínio (Java)
Entidade `Ferias` (`Ferias.java:67`, `@Entity TBFERIASCALCULO`, seq `SQFERIASCALCULO`). `@ManyToOne` → `Calculo` (`IIDCALCULO`, L79-81). Coleção em `Calculo`.

## 1. Campos canônicos
| # | Campo | Tipo Java | Col. JPA | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|---|
| 1 | **Relativa** (rótulo período) | String | `SNMPERIODOFERIAS` | **sim** (`@Required`) | null | — | `Ferias.java:82-84` |
| 2 | Aquisitivo Início | Date | `DDTINICIOPERIODOAQUISITIVO` | **sim** | null | — | `:85-88` |
| 3 | Aquisitivo Fim | Date | `DDTTERMINOPERIODOAQUISITIVO` | **sim** | null | — | `:89-92` |
| 4 | Concessivo Início | Date | `DDTINICIOPERIODOCONCESSIVO` | **sim** | null | — | `:93-96` |
| 5 | Concessivo Fim | Date | `DDTTERMINOPERIODOCONCESSIVO` | **sim** | null | — | `:97-100` |
| 6 | **Prazo (dias)** | Integer | `IQTDIASFERIAS` | **sim** | **30** | `PrazoDeFeriasValidRule`: ≥ 0 (MSG0004) | `:101-104`, `PrazoDeFeriasValidRule.java:18-22` |
| 7 | **Situação** | `SituacaoDaFeriasEnum` | `STPSITUACAOFERIAS` | **sim** (`@NotNull`) | **GOZADAS** | — | `:105-108` |
| 8 | **Dobra Geral** | Boolean | `SFLDOBRAGERAL` | **sim** | **false** | — | `:109-112` |
| 9 | **Abono** (pecuniário) | Boolean | `SFLABONOFERIAS` | **sim** | **false** | `AbonoDeFeriasValidRule` | `:113-117` |
| 10 | **Dias Abono** | Integer | `IQTDIASABONO` | **sim** | **10** | `DiasDeAbonoValidRule`: se abono, dias ≤ prazo/3 (MSG0175) | `:118-121`, `DiasDeAbonoValidRule.java:23-31` |
| 11-13 | Gozo 1 início/fim/dobra | Date/Date/Bool | `DDTINICIOPRIMEIROPERIODO`/`...TERMINO...`/`SFLDOBRAPRIMEIROPERIODO` | — | dobra false | `PeriodoDeGozoValidRule` flags 0/1 | `:122-133` |
| 14-16 | Gozo 2 início/fim/dobra | idem | `...SEGUNDO...` | — | dobra false | flags 2/3 | `:134-145` |
| 17-19 | Gozo 3 início/fim/dobra | idem | `...TERCEIRO...` | — | dobra false | flags 4/5 | `:146-157` |

### Enum `SituacaoDaFeriasEnum` (`SituacaoDaFeriasEnum.java:6-11`)
| Constante | Label | DB |
|---|---|---|
| GOZADAS | "Gozadas" | "G" |
| GOZADAS_PARCIALMENTE | "Gozadas Parcialmente" | "GP" |
| NAO_GOZADAS | "Não Gozadas" | "NG" |
| INDENIZADAS | "Indenizadas" | "I" |
| PERDIDAS | "Perdidas" | "P" |

### Regras de validação (confirmadas via Java)
- **PrazoDeFeriasValidRule** (`:18-22`): prazo ≥ 0 → MSG0004.
- **DiasDeAbonoValidRule** (`:23-31`): se `abono==true`, `diasAbono ≤ prazo/3` → MSG0175 (1/3 constitucional, Art. 143 CLT).
- **AbonoDeFeriasValidRule**: abono só permitido se situação ∈ {GOZADAS, GOZADAS_PARCIALMENTE} → MSG0004.
- **PeriodoDeGozoValidRule** (4 sub-checks): (1) gozo fim ≥ início → MSG0008; (2) gozo2.ini > gozo1.fim e gozo3.ini > gozo2.fim (sem sobreposição **entre as 3 frações da MESMA linha**) → MSG0007; (3) cada gozo contido em [aquisitivo.ini, demissão/hoje] → MSG0039; (4) soma dos gozos == prazo (sem abono) / == prazo−diasAbono (com abono) / < prazo (parcial) → MSG0036/0037/0040.
- **SEM validação de overlap ENTRE linhas de férias** (diferente de Faltas — MSG0024 não se aplica a Ferias). Não adicionar detecção inter-linha.
- **prazo auto-sugerido** por Art.130 CLT (faltas no aquisitivo); situação auto-atribuída na geração. No MRD isso é responsabilidade de outras rotinas — escopo aqui é validação de input + wiring.

### Escopo local do schema (validável sem datas do cálculo)
required (5 datas + situação) + prazo≥0 + abono⇒situação∈{gozadas,gozadas_parcialmente} + abono⇒dias≤prazo/3 + cada gozo fim≥início + frações não-sobrepostas (gozo2.ini>gozo1.fim, gozo3.ini>gozo2.fim). Gozo-dentro-do-aquisitivo e soma==prazo ficam **best-effort/dívida** (dependem de contexto/UX de fração que a grid atual não tem).

## 2. Estado atual no MRD (verificado contra prod) — 🐞 BUG DE WIRING
- **`pjecalc_ferias`** = TABELA. Colunas REAIS: `periodo_aquisitivo_inicio/fim`, `periodo_concessivo_inicio/fim`, `situacao` (default 'GOZADAS'), `prazo_dias` (int=30), `dobra_geral` (bool), `abono` (bool), `abono_dias` (int=0), `gozo_1_inicio/fim/dobra`, `gozo_2_*`, `gozo_3_*`, `observacoes`. **Espelha o Java 1:1.**
- Módulo `ModuloFerias.tsx` grava/lê essas colunas reais (correto).
- **🐞 `PjecalcFeriasRow` (service type) é FICÇÃO:** declara `dias`, `dias_abono`, `dobra`, `gozo_inicio`, `gozo2_inicio`, `gozo3_inicio` — **nomes que não existem** na tabela.
- **🐞 `toEngineFerias` (orchestrator) e `resolver.ts:240-248` leem os nomes fictícios** (`f.dias`, `f.dias_abono`, `f.dobra`, `f.gozo_inicio`) → caem nos defaults: `prazo_dias→30`, `abono_dias→0`, `dobra→false`, gozo→1 período só. **Resultado: prazo, abono_dias, dobra e gozos da tela NÃO chegam ao engine.**

### Decisão (autonomia): corrigir o wiring (contido)
1. Reescrever `PjecalcFeriasRow` p/ as colunas reais (additivo: manter campos legados opcionais p/ não quebrar leitores; preferir reais).
2. `toEngineFerias` + `resolver.ts` passam a ler colunas reais: `prazo_dias`, `dobra_geral`, `abono_dias`, e mapear os **3** períodos de gozo (`gozo_1/2/3`).
3. Extrair mapper puro `ferias-engine-map.ts` (testável sem Supabase, como em Faltas).
4. Schema zod: required dates + prazo≥0 + (se abono) dias_abono ≤ prazo/3 (MSG0175) + situação enum.
- **`relativa`** (rótulo) não existe no MRD → registrar dívida (não bloqueia cálculo; engine usa `relativas:''`).

### Wiring atual
`loadCaseData → getFerias` → `toEngineFerias` → `PjeFerias`; e `resolver.ts:240` → `FeriasInput`. Ambos a corrigir.

## 3. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3243 passed | 45 skipped | 0 failed** (era 3229 → +14, zero regressão)
- [x] testes da seção: `ferias-schema.test.ts` (9) + `ferias-wiring.test.ts` (5) = **14 verdes**
- [x] eslint limpo (exit 0) em todos os 8 arquivos tocados
- [x] ≥1 teste validação — datas obrig./ordenação; prazo 0..30; abono⇒situação∈{gozadas,parcial}; abono⇒dias≤prazo/3; gozo fim≥início + frações não-sobrepostas
- [x] ≥1 teste campo→engine — `mapFeriasToEngine` lê colunas REAIS (prazo_dias/dobra_geral/abono_dias) + mapeia os 3 gozos (corrige bug do alias fictício)
- [x] persistência via MCP — round-trip (prazo_dias=24, dobra_geral, abono_dias=8, gozo_1, situacao); row removida
- [x] Playwright e2e → **2 passed (11.6s), exit 0** — `e2e/fluxos/13-ferias.spec.ts` (adiciona→persiste; abono>1/3→bloqueia MSG0175)
- [x] spec commitada / commit isolado da seção

### Correções de wiring aplicadas (bug)
- `PjecalcFeriasRow`/`Insert` reescritos p/ colunas reais (eram ficção).
- `toEngineFerias` → delega a `ferias-engine-map.ts` (módulo puro testável), lê reais + 3 gozos.
- `resolver.ts:240` lê `prazo_dias`/`dobra_geral` (eram `f.dias`/`f.dobra` fictícios).
- `PjeCalcPage.tsx` (página alternativa roteada) reads/writes corrigidos p/ `prazo_dias`/`dobra_geral`.
- Dívida: campo `relativa` (rótulo período) não existe no MRD; `gozo_N_dobra` per-fração não exposto na UI.
