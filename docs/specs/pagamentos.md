# Spec — Pagamentos

> **Seção 13/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Verbas e Ocorrências".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/pagamento/Pagamento.java` (+ MultaDoPagamento, HonorarioDoPagamento, MaquinaDeRateioDoPagamento) | tipos, validação |
> | App PJe-Calc | aba "Pagamentos" | labels |

---

## -1. Nota de escopo — dois "pagamento" no Java (resolvido)
O Java tem **dois** conceitos: (a) `ValorPago`/`OcorrenciaDeVerba.pago` = "valor já pago por verba" (embutido, §11-12); (b) `Pagamento` (TBPAGAMENTO) = **quitação/abatimento** que distribui um pagamento real sobre o débito apurado (`EventoAtualizacao`). **O MRD `pjecalc_pagamentos` implementa (b)** — confirmado: título "Pagamentos / Abatimentos", colunas `data_pagamento`/`tipo` (EMPREGADOR/PJE_PRECATORIO)/`abatimento_global`, comentário do módulo "baseado em Pagamento.java". O MRD **unifica** os dois (também linka `verba_base_id`/`reflexo_id`/`competencia`), mas a validação canônica segue `Pagamento.validar()` (b). Fonte da verdade desta seção = `Pagamento.java`.

## 0. Domínio (Java) — entidade dedicada (quitação + rateio)
`Pagamento` (`@Entity TBPAGAMENTO`, `Pagamento.java:86-87`) é **entidade standalone** (não é o "valor pago" embutido na verba — esse é o `ValorPago`/`OcorrenciaDeVerba.pago` das §11-12). Representa uma **quitação/pagamento** feito, com **rateio** entre parcelas (principal/FGTS/multas/honorários/créditos/débitos) via `MaquinaDeRateioDoPagamento`. `@ManyToOne` → `Calculo`; `Calculo.pagamentos: Set<Pagamento>` (`Calculo.java:420`).

## 1. Campos (header) + validação canônica
| Campo Java | Tipo | Col. JPA | Obrig. | Default | Origem |
|---|---|---|---|---|---|
| `dataCriacao` | Date | `DDTCRIACAOPAGAMENTO` (not null) | `@NotNull` (auto) | — | `:110-113` |
| **`dataPagamento`** | Date | `DDTPAGAMENTO` | `@NotNull` + obrigatório | — | `:114-117` |
| `pagarPrecatorio` | Boolean | `SFLPAGAMENTOPRECATORIO` | `@NotNull` | false | `:119-122` |
| **`valorPagamento`** | BigDecimal | `MVLPAGAMENTO` **(12,2)** | obrigatório | — | `:123-124` |
| `valorParcelaCreditoReclamante` / `...OutrosDebitos` / `...Principal` / `...Fgts` / `...Multas*` / `...Honorarios*` | BigDecimal(12,2) | `MVLPARCELA*` | rateio (vários `@NotNull`/condicionais) | — | `:125-160+` |
| `apurar*` / `selecionar*` (principal/fgts/multas/honorários) | Boolean | `SFLAPURAR*` | `@NotNull` | false | `:130-160+` |

> A maioria dos campos é **rateio do valor** entre destinos. O MRD **não modela** o rateio (flatten — ver §2).

### `Pagamento.validar()` (`:376-404`) → consistências
- **`consistirCamposObrigatorios` (`:444-465+`):** `valorPagamento` null → **MSG0003 "Valor do Pagamento"**; `dataPagamento` null → **MSG0003 "Data do Pagamento"**; + valores de rateio (créditos/outros débitos) `@NotNull`; condicionais por `selecionar*`+`!apurar*`.
- **`consistirDataDoPagamento` (`:414-423`):** data **anterior à data de liquidação** → **MSG0127**; data **futura** (> hoje) → **MSG0128**.
- **`consistirRegistroDuplicado` (`:434-442`):** outra pagamento com **mesma data** → **MSG0138**.
- **`verificarRateioInicial` (`:425-432`):** soma das parcelas ≠ valorPagamento → **MSG0125** (rateio — fora do escopo flat).

## 2. Estado atual no MRD (verificado contra prod)
- Tabela `pjecalc_pagamentos`. Módulo `ModuloPagamentos.tsx` (dialog): `competencia` (YYYY-MM-01), `valor`, `data_pagamento`, `tipo` (EMPREGADOR…), `descricao`, `documento_id` (link a `documents`), `abatimento_global`, `verba_base_id` (link a `pjecalc_verba_base`).
- **valor já usa Decimal** (`new Decimal(editing.valor)`, `:130`; total via Decimal, `:100`) — **sem violação de parseFloat**. ✓
- **MRD achata** o rateio do Java: trata pagamento como (valor, data, tipo, vínculo a verba/documento, abatimento global). Decisão de design legítima (o motor MRD consome o abatimento simples). Não desmonto.
- Validação atual: só `valor` não-vazio.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| valor obrigatório | MSG0003 | parcial (já checa não-vazio) | manter + schema (valor > 0) |
| data obrigatória | MSG0003 (`@NotNull`) | ausente | **+schema** |
| data não futura | MSG0128 | ausente | **+schema** |
| data não anterior à liquidação | MSG0127 | ausente | best-effort (grid sem data liquidação) — dívida |
| data duplicada | MSG0138 | ausente | **+detecção** (mesma data já cadastrada) |
| rateio (soma parcelas = valor) | MSG0125 | N/A (flat) | fora de escopo (motor) |

> **Decisão (autonomia):** `pagamento-schema.ts` (zod: valor > 0; data_pagamento obrigatória; data não futura) + `detectarPagamentoDuplicado` (mesma data, MSG0138). Fiar no `savePag`. competência opcional (extra MRD, formato yyyy-MM-dd). valor mantém Decimal. Não altero rateio/estrutura.

## 3. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3296 passed | 45 skipped | 0 failed** (era 3288 → +8, zero regressão)
- [x] testes da seção: `pagamento-schema.test.ts` = **8 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — valor>0 (MSG0003); data obrigatória; data não futura (MSG0128); data duplicada (MSG0138)
- [x] persistência via MCP — round-trip `pjecalc_pagamentos` (valor=1500, data, tipo, abatimento); row removida
- [x] Playwright e2e → **2 passed (10.4s), exit 0** — `e2e/fluxos/18-pagamentos.spec.ts` (cria→persiste; data futura→bloqueia)
- [x] spec commitada / commit isolado da seção

## 4. Dívidas
- MRD achata o rateio do `Pagamento` (parcelas principal/FGTS/multas/honorários) — paridade funcional via abatimento simples; rateio detalhado fora de escopo (motor).
- data ≥ liquidação (MSG0127): grid não recebe data de liquidação — best-effort/dívida.
