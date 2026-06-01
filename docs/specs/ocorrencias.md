# Spec — Ocorrências

> **Seção 12/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Verbas e Ocorrências".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/ocorrenciaverba/OcorrenciaDeVerba.java` + `verbacalculo/MaquinaDeCalculo.java` | classificação, campos, validação |

---

## 0. Classificação — OUTPUT materializado com override por célula
**`OcorrenciaDeVerba` é OUTPUT gerado pelo motor** (uma instância mensal por competência, criada por `MaquinaDeCalculo.criarOcorrenciaComPeriodoAquisitivo` `:438-547`; único `new OcorrenciaDeVerba()` produtivo). **Não há tela de entrada standalone** — ocorrências vivem aninhadas sob a verba (`VerbaDeCalculo.ocorrencias` `@OneToMany cascade=ALL` `:222-225`), geradas a partir da fórmula+período da verba, e **regeneradas** a cada `gerarOcorrencias` (limpa+recria).

**Porém há uma CAMADA FINA DE OVERRIDE MANUAL por célula** (a "tela de ocorrências"): editável `devido` (→ muda `valor` CALCULADO→INFORMADO), `pago`, `quantidade`, `divisor`, `multiplicador`, `dobra`, `ativo`. Métodos `*NaTelaDeOcorrencias`/`mudarValorDevido` (`:107-108,253-268,754-761`). Overrides sobrevivem à regeneração via `manterAlteracoes` + chave de unicidade `OcorrenciaDaVerbaUnique` (período+periodoAquisitivo+ferias flags).

**MRD bate com isso:** a aba "Ocorrências" (`PjeCalcInline.tsx:421-425`) é um **ponteiro informativo** — "geradas e editadas dentro de cada verba". A grade real é `GradeOcorrencias` (aberta em Cadastro de Verbas → Editar → Ocorrências), com `gerarOcorrencias` (MANTER/SOBRESCREVER) + edição por célula.

## 1. Validação canônica (Java) — mínima
- **Sem `validar()`/`consistir*` próprio.** Herda `EntidadeBase.validar()` (no-op). Validação só via Bean-Validation nas annotations.
- **Único bound de valor: `divisor` `@Min("0.01")`** (`OcorrenciaDeVerba.java:94-96`). **Não há ≥0 em `devido` nem `pago`** — negativos são possíveis na entidade; tratamento de negativo é regra de cálculo (`getDiferenca`/`zeraValorNegativo` da verba), **não constraint**.
- `dataInicial` `@NotNull` (`:87-90`); `dobra`/`ativo`/`valor`/`caracteristica`/`ocorrenciaDePagamento` `@NotNull` com defaults.
- Unicidade de competência: lógica (`OcorrenciaDaVerbaUnique`), não `@UniqueConstraint`.

### Campos (resumo)
ENTRADA (override): `divisor` (RVLDIVISOR 38,25, @Min 0.01), `multiplicador` (RVLMULTIPLICADOR 19,8), `quantidade` (RVLQUANTIDADE 38,25), `dobra` (SFLDOBRA, default false), `devido` (RVLDEVIDO), `pago` (RVLPAGO), `ativo` (SFLATIVO, default true). SAÍDA: `base`, `*Integral`, `indiceAcumulado` (coluna Oracle **RVLINDICEUTILIZADO**), datas período aquisitivo, ferias flags. Enums herdados da verba: `valor` (CALCULADO/INFORMADO), `caracteristica`, `ocorrenciaDePagamento`, `comporPrincipal`.

## 2. Estado atual no MRD (verificado contra prod)
- Tabela `pjecalc_verba_ocorrencias` / view `pjecalc_ocorrencias`. Engine type `PjeOcorrencia` (competência, base/divisor/multiplicador/quantidade/dobra/devido/pago). Wiring: `toEngineVerbas` injeta `ocorrencias_precomputadas` por verba (orchestrator:188, §11).
- `GradeOcorrencias.tsx`: gera (período da verba) + edita por célula (`updateCell`). Editáveis: `base_valor, divisor_valor, multiplicador_valor, quantidade_valor, dobra, pago`; `devido`/`diferenca` recomputados.
- **🐞 Violações CLAUDE.md (a corrigir):** `updateCell` faz aritmética monetária em `number` (`:123-127`: devido/diferenca/total), e `parseFloat` em valores monetários (`:141` batch, `:302`/`:311` células). CLAUDE.md proíbe `parseFloat`/`number` em valores sensíveis → usar `money.ts` (Decimal) da §4.
- Validação atual: nenhuma nos valores.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| divisor ≥ 0.01 | `@Min("0.01")` | sem validação | **+schema** |
| devido/pago ≥ 0 | **NÃO existe** (negativos OK) | — | **não adicionar** (paridade: Java não valida) |
| competência formato | (período) | livre | **+schema** (yyyy-MM/yyyy-MM-dd) |
| aritmética devido/diferença | BigDecimal (38,25) | **number** | **fix → Decimal** |
| parseFloat em $ | — | sim | **fix → toMoneyNumber** |

> **Decisão (autonomia):** `ocorrencia-schema.ts` (zod: divisor≥0.01; competência formato; multiplicador/quantidade numéricos; **sem** ≥0 em devido/pago — fiel ao Java) + recompute de `devido`/`diferenca`/`total` via **Decimal** (`recomputeOcorrencia`) e parsing via `money.ts`. Fiar no `updateCell`/`executeBatchEdit`/inputs do `GradeOcorrencias`. Não altero motor/estrutura.

## 3. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3288 passed | 45 skipped | 0 failed** (era 3280 → +8, zero regressão)
- [x] testes da seção: `ocorrencia-schema.test.ts` = **8 verdes** (validação + recompute Decimal)
- [x] eslint limpo (exit 0; 1 warning pré-existente de `useCallback`/`queryKey` em GradeOcorrencias, não introduzido por esta seção — não-bloqueante)
- [x] ≥1 teste validação — divisor≥0.01; competência formato; devido/pago aceita negativo (paridade Java); recompute via Decimal (devido/diferença/total)
- [x] **parseFloat/number→Decimal corrigido** — `GradeOcorrencias.updateCell` usa `recomputeOcorrencia` (Decimal); `executeBatchEdit` e células usam `toMoneyNumber` (money.ts) no lugar de `parseFloat`; divisor<0.01 bloqueado
- [x] persistência via MCP — round-trip `pjecalc_verba_ocorrencias` (devido=1000=3000/30×10 confere c/ recompute); row removida
- [N/A] Playwright e2e — **justificado**: a aba "Ocorrências" do fluxo principal é só ponteiro informativo; a grade editável (`GradeOcorrencias`) só é montada na página alternativa `PjeCalcPage` (/pjecalc/:id), aninhada sob verba selecionada. Tela é OUTPUT-com-override (não entrada primária). Validação+recompute cobertos por 8 testes unitários + round-trip MCP. e2e desproporcionalmente frágil p/ esta superfície (mesma postura da §8 Apuração Diária).
- [x] spec commitada / commit isolado da seção

## 4. Dívidas
- MRD não modela `ocorrenciaOriginal` (snapshot p/ detecção de override/revert), nem `*Integral` (integralização), nem `valor`/flags herdados por ocorrência (vivem no nível verba). Aceitável p/ o flatten; registrado.
- Precisão: Oracle 38,25 vs Decimal.js 20 dígitos — atenção formal (na prática suficiente).
- Ocorrências são primariamente output do motor — escopo aqui é só a camada de override + saneamento monetário.
