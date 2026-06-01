# Spec — INSS / Contribuição Social

> **Seção 15/16** — paridade de input PJe-Calc Cidadão **v2.15.1** (bloco Tributos).
> Aba "Contribuição Social" (CS) — INSS por cálculo.
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/calculo/inss/Inss.java` + `sobresalarios/*` + `atualizacao/ParametrosDeAtualizacao.java` + `constantes/TipoDeAliquota*Enum.java` | tipos, validação |
> | App PJe-Calc | `inss-inss-jsf` | labels |

---

## 0. Domínio (Java) — agregado multi-entidade; MRD ACHATA
INSS = **Contribuição Social** aqui. Config user-set espalhada em (todos `@OneToOne`/`@OneToMany` em `Calculo`):
- **`Inss`** (`TBINSSCALCULO`): fonte de alíquotas (segurado/empregador/RAT/terceiros), teto, flags por-atividade. `@OneToOne mappedBy="calculo"` (`Calculo.java:328-329`).
- **`InssSobreSalariosDevidos`/`Pagos`** (`TBINSSSALARIOS*`): período + `apurarInssSegurado`/`cobrarInssDoReclamante`.
- **`AliquotasDoEmpregadorPorPeriodo`** / **`PeriodoDoINSSComOpcaoSimples`**: listas por-período.
- **`ParametrosDeAtualizacao`** (`TBPARAMATUALIZACAOCALCULO`): juros/multa/correção do INSS (Lei 11.941, multa urbana/rural, integral/reduzido).
- **`OcorrenciaDeInssSobreSalariosPagos`** (`TBOCORRENCIAINSSSALARIOSPAGOS`): INSS já recolhido por competência.

> **OUT OF SCOPE (reference read-only):** `dominio/inss/` — `TabelaPrevidenciaria*`, `Faixa*`, `AtividadeEconomica`+alíquotas, `TaxaMultaPrevidenciaria`, SELIC. São dados nacionais. (No MRD: `pjecalc_inss_faixas`/`_domestico`/`_multa`.)

### Negativos decisivos (não inventar)
- **NÃO há `tipoCalculoInss` / regime de competência-caixa / master `aplicarInss`** no INSS (grep confirmou vazio em `dominio/calculo/inss/`). Só IRPF tem `SFLREGIMECAIXA`. INSS é sempre mês-a-mês por ocorrência; apuração é gated **por bloco** (`apurarInssSegurado`, `apurarInssSobreSalariosPagos`, presença de alíquotas).

## 1. Campos de config + validação canônica (subset achatável)
| Campo | Tipo | Default | Validação | Origem |
|---|---|---|---|---|
| `tipoAliquotaSegurado` | `TipoDeAliquotaDoSeguradoEnum` SE/ED/F | SEGURADO_EMPREGADO | @NotNull | `Inss.java:105-108` |
| `aliquotaSeguradoFixa` | BigDecimal(5,2) | null | **obrigatória se tipo=FIXA** → MSG0003 | `:109`, validar `:479-481` |
| `limitarTeto` | Boolean | TRUE | — | `:111-113` |
| `tipoAliquotaEmpregador` | `TipoDeAliquotaDoEmpregadorEnum` A/PP/F | FIXA | @NotNull | `:114-117` |
| `aliquotaEmpresaFixa` | BigDecimal(5,4) | 20.0000 | (FIXA: ≥1 de empresa/RAT/terceiros não-nula → MSG0045) | `:118`, `:339` |
| `aliquotaRATFixa` | BigDecimal(5,4) | 3.0000 | idem | `:120`, `:340` |
| `aliquotaTerceirosFixa` | BigDecimal(5,4) | null | idem | `:122` |
| `apurarEmpresa/RAT/TerceirosPorAtividade` | Boolean | FALSE | POR_ATIVIDADE: ≥1 true senão MSG0046 | `:124-132` |
| `apurarInssSobreSalariosPagos` | Boolean | FALSE | — | `:148-152` |
| (devidos) `apurarInssSegurado`/`cobrarInssDoReclamante` | Boolean | TRUE/TRUE | — | `InssSobreSalariosDevidos.java:77-82` |
| (período) `dataInicio`/`dataTermino` | Date | — | @Required; **término ≥ início** (`@GreaterOrEqualThan`); 100 anos; overlap → MSG0024 | `InssSobreSalarios.java:55-65`; `AliquotasDoEmpregadorPorPeriodo:169-184`; `PeriodoSimples:139-163` |

### Enums
| Enum | Valores (label/DB) | Arquivo |
|---|---|---|
| `TipoDeAliquotaDoSeguradoEnum` | SEGURADO_EMPREGADO "Segurado Empregado"/"SE"; EMPREGADO_DOMESTICO "Empregado Doméstico"/"ED"; FIXA "Fixa"/"F" | `:6-9` |
| `TipoDeAliquotaDoEmpregadorEnum` | POR_ATIVIDADE_ECONOMICA "A"; POR_PERIODO "PP"; FIXA "F" | `:6-9` |
| `TipoDaMultaDoINSSEnum` | URBANA "U"; RURAL "R" | `:6-8` |
| `TipoPagamentoDaMultaDoINSSEnum` | INTEGRAL "I"; REDUZIDO "R" | `:6-8` |

## 2. Estado atual no MRD (verificado contra prod) — FLATTENED
- **`pjecalc_cs_config`** (1/caso): apurar_segurado/empresa/sat/terceiros, cobrar_reclamante, com_correcao_trabalhista, atualizar_inss_selic, aliquota_empresa/sat/terceiros_fixa, aliquota_segurado_tipo (empregado/domestico/fixa = enum Java), periodos_simples (jsonb), extras (jsonb).
- **`pjecalc_cs_ocorrencias`** (por competência/aba). **Out:** `pjecalc_inss_faixas`/`_domestico`/`_multa` (oficiais).
- Módulo ativo `ModuloCS.tsx` (config rica: alíquotas, SIMPLES, CNAE lookup, sindical, 3 períodos PJe-oficiais Devidos/Pagos/MêsReclamação). Engine-wired (`toEngineCsConfig`, orchestrator:1766) → `PjeCSConfig`.
- **MRD achata** o agregado multi-entidade Java num `cs_config` + `extras` jsonb. Design legítimo; engine consome. Não desmonto.
- **🐞 Violação CLAUDE.md:** `ModuloCS.save` usa `parseFloat` nas 4 alíquotas (`:97,100-102`) + fallback silencioso `|| 20/2/5.8`. Sem validação de alíquota/período.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| alíquota fixa segurado obrigatória se tipo=fixa | MSG0003 | ausente | **+schema** |
| alíquotas 0–100 (% válida) | precisões 5,2/5,4 | sem validação | **+schema** (guard sensato) |
| período Simples ini≤fim | @GreaterOrEqualThan | ausente | **+schema** |
| parseFloat em alíquotas | BigDecimal | **parseFloat** | **fix → Decimal** |
| master aplicarInss/regime | **não existe** | — | não adicionar |

> **Decisão (autonomia):** `cs-config-schema.ts` (zod: alíquotas 0–100; segurado fixa obrigatória se tipo=fixa; período Simples ini≤fim) + Decimal-parse das alíquotas no `save`. Fiar no `ModuloCS.save`. Não desmonto o flatten nem o motor. Juros/multa do INSS (`ParametrosDeAtualizacao`) é trabalho do bloco de Atualização (fora da tela CS) — registrado.

## 3. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3312 passed | 45 skipped | 0 failed** (era 3304 → +8, zero regressão)
- [x] testes da seção: `cs-config-schema.test.ts` = **8 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — alíquota 0–100; segurado fixa obrig. se tipo=fixa (MSG0003); período Simples ini≤fim
- [x] **parseFloat→Decimal** nas 4 alíquotas (`parseAliquota`); fallbacks 20/2/5.8 preservados
- [x] persistência via MCP — round-trip `pjecalc_cs_config` (alíquotas 20/2/5.8, tipo empregado); row removida
- [x] Playwright e2e → **2 passed (27.6s), exit 0** — `e2e/fluxos/20-contribuicao-social.spec.ts` (configura→salva; alíquota>100%→bloqueia)
- [x] spec commitada / commit isolado da seção

## 4. Dívidas
- MRD achata o agregado multi-entidade do INSS (Inss + SobreSalarios + listas período + ParametrosDeAtualizacao) num cs_config + extras jsonb. Paridade funcional; estrutura simplificada.
- Juros/multa/correção do INSS (`ParametrosDeAtualizacao`: Lei 11.941, multa urbana/rural, integral/reduzido) vive na tela de Atualização, não na CS — fora desta seção.
- INSS já recolhido por competência (`OcorrenciaDeInssSobreSalariosPagos`) ↔ `pjecalc_cs_ocorrencias` (aba pagos) — coberto pela grade CS; validação detalhada fora do escopo de config.
