# Spec — Faltas

> **Seção 5/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico p/ regra) | `pjecalc-fonte/negocio/.../dominio/calculo/faltas/Falta.java` + `regras/PeriodoDaFaltaValidRule.java` | tipos, validação |
> | App PJe-Calc | screenshot | labels/ordem |

---

## 0. Domínio (Java)
Entidade `Falta` (`Falta.java:61`, `@Entity TBFALTACALCULO`, seq `SQFALTACALCULO`). `@ManyToOne` → `Calculo` (`IIDCALCULO`, L72-74). Em `Calculo`: `Set<Falta> faltas` `@OrderBy("dataInicioPeriodoFalta")` (`Calculo.java:317-318`).

## 1. Campos canônicos
| # | Campo (label) | Tipo Java | Col. JPA | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|---|
| 1 | **Data Inicial** | Date | `DDTINICIOPERIODOFALTA` (not null) | **sim** (`@Required`) | null | `@LimitedTo100Years`; **início ≥ admissão** (ou início-cálculo) → MSG0008 | `Falta.java:75-80`, `PeriodoDaFaltaValidRule.java:30-39` |
| 2 | **Data Final** | Date | `DDTTERMINOPERIODOFALTA` (not null) | **sim** (`@Required`) | null | **término ≥ inicial** (`@GreaterOrEqualThan`); `@LimitedTo100Years`; **término ≤ demissão** (ou término-cálculo) → MSG0010 | `:81-87`, `PeriodoDaFaltaValidRule.java:40-48` |
| 3 | **Justificada** | Boolean | `SFLFALTAJUSTIFICADA` (not null) | — | **false** | — | `:88-90` |
| 4 | **Justificativa** | String(200) | `SDSJUSTIFICATIVAFALTA` | não | null | — | `:91-92` |
| 5 | **Reinicia Férias** | Boolean | `SFLREINICIAFERIAS` (not null) | — | **false** | — (Art. 130-A CLT) | `:93-95` |

> Sem campo "tipo de falta" nem "dias" (a quantidade é derivada do período início→fim). Não inventar.

## 2. Validação imperativa — `Falta.validar()` (`:199-210`)
1. Annotations (required, ordering, 100 anos, ValidRule).
2. **Overlap/coincidência:** se o período coincide com **qualquer outra** falta do mesmo cálculo → **MSG0024** ("datas coincidentes"). `isPeriodoCoincidenteCom` (`:183-185`), loop `:205-208`.
3. **ValidRule `PeriodoDaFaltaValidRule`:** flag 0 (início ≥ admissão/início-cálculo → MSG0008); flag 1 (término ≤ demissão/término-cálculo → MSG0010).
- Ordenação por `dataInicioPeriodoFalta` (`Comparable` `:216-219`).
- `arquivoExterno=true` (importação) **pula** validação (`:201-203`).
- `sugerirDataTermino()` (`:187-193`): default término = início.

## 3. Estado atual no MRD (verificado contra prod)
- **`pjecalc_faltas`** = TABELA (relkind r), RLS `Owner access via calculo`. Colunas: id, calculo_id, data_inicial:date, data_final:date, justificada:bool=false, reiniciar_ferias:bool=false, motivo:text, documento_id:uuid, created_at, case_id.
- Módulo ativo `ModuloFaltas.tsx` (grid: data_inicial, data_final, justificada, reiniciar_ferias, motivo). **SEM nenhuma validação** (inputs de data crus).
- Mapa de campos: data_inicial=início, data_final=término, justificada, motivo=justificativa, reiniciar_ferias=reinicia. **Bate 1:1 com o Java.**

### Wiring (JÁ existe — confirmado)
`loadCaseData → getFaltas` (`service.ts:117`) → `toEngineFaltas` (`orchestrator.ts:132`) → `PjeFalta` (data_inicial, data_final, justificada, justificativa=motivo, reinicia=reiniciar_ferias). Também `resolver.ts:251` → `FaltaInput`. **Faltas chegam ao engine.**

### Gap de paridade
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| Data inicial/final obrigatórias | `@Required` | sem validação | **+schema zod** |
| término ≥ inicial | `@GreaterOrEqualThan` | sem validação | **+schema (MSG0008-like)** |
| overlap entre faltas | MSG0024 | sem validação | **+detecção de sobreposição no schema/UI** |
| início≥admissão / término≤demissão | ValidRule (MSG0008/0010) | sem validação | escopo: validar contra datas do cálculo se disponíveis (best-effort; admissão/demissão vêm de Parâmetros) — registrar como check opcional |
| tipo_falta/observacoes | não existem | tipos legados drift (não são colunas reais) | ignorar (form usa untyped) |

> **Decisão (autonomia):** schema zod `faltaSchema` (entrada única) + helper `detectarOverlapFaltas(lista)` para a regra MSG0024. Validação início≥admissão/término≤demissão fica **best-effort** (depende de passar as datas do cálculo ao módulo — a grid hoje não as recebe; registro como dívida e valido o que é local: required + término≥inicial + overlap). Estrutura da tabela mantida (contido).

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3229 passed | 45 skipped | 0 failed** (era 3213 → +16, zero regressão)
- [x] testes da seção: `falta-schema.test.ts` (12) + `faltas-wiring.test.ts` (4) = **16 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — datas obrigatórias; término≥inicial (MSG0008); overlap inclusivo (MSG0024)
- [x] ≥1 teste campo→engine — `mapFaltasToEngine` (extraído de orchestrator p/ módulo puro `faltas-engine-map.ts`) mapeia todos os campos a PjeFalta
- [x] persistência via MCP — round-trip de falta (data_inicial/final, justificada, reiniciar_ferias, motivo); row removida
- [x] Playwright e2e → **2 passed (10.8s), exit 0** — `e2e/fluxos/12-faltas.spec.ts` (adiciona→persiste; término<inicial→bloqueia)
- [x] spec commitada / commit isolado da seção
