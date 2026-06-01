# Spec — Imposto de Renda (IRPF)

> **Seção 16/16** — paridade de input PJe-Calc Cidadão **v2.15.1** (bloco Tributos — FINAL).
> Aba "Imposto de Renda".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/calculo/irpf/Irpf.java` + `constantes/TipoOcorrenciaIrpfEnum.java` | tipos, validação |
> | App PJe-Calc | `irpf-jsf` | labels |

---

## 0. Domínio (Java) — entidade `Irpf` 1:1 com Calculo
`Irpf` (`@Entity TBIMPOSTORENDACALCULO`, `Irpf.java:85-96`), `@OneToOne` ↔ `Calculo` (`Calculo.java:346-347`; `getIrpf()` instancia default se null). **Config = uma entidade** (sem sub-entidade de dependentes/RRA). As `OcorrenciaDeIrpf*` são **output computado** (liquidação), não config.

### Campos de config (booleans `BooleanUserType` + integers + datas RRA)
| Campo Java | Col. | Default | Origem |
|---|---|---|---|
| `apurarImpostoRenda` | `SFLAPURARIMPOSTORENDA` (@NotNull) | TRUE | `:103-107` |
| `incidirSobreJurosDeMora` | `SFLINCIDIRSOBREJUROSMORA` | FALSE | `:108-110` |
| `cobrarDoReclamado` | `SFLCOBRARDORECLAMADO` | FALSE | `:111-113` |
| `considerarTributacaoExclusiva` (13º) | `SFLTRIBUTACAOEXCLUSIVA` | FALSE | `:114-116` |
| `considerarTributacaoEmSeparado` (férias) | `SFLTRIBUTACAOEMSEPARADO` | FALSE | `:117-119` |
| **`regimeDeCaixa`** | `SFLREGIMECAIXA` | FALSE (=competência) | `:120-122` |
| `deduzir*` (CS/PrevPriv/Pensão/Honorários) | `SFLDEDUZIR*` | TRUE | `:123-134` |
| `aposentadoMaiorQue65Anos` | `SFLAPOSENTADOMAIORQUEMEIACINCO` | FALSE | `:135-137` |
| `possuiDependentes` | `SFLPOSSUIDEPENDENTES` | FALSE | `:138-140` |
| `quantidadeDependentes` | `IQTDEPENDENTES` | 0 | `:141-142` |
| `dataInicio/FimAnosAnteriores`, `...AnoRecebimento` (RRA) | `DDT*` | null | `:143-154` |
| **`qtdMesesRendimentoTributaveis`** (meses RRA) | `IQTDMESESRENDIMENTOTRIB` | null | `:175-176` |

### Validação canônica
- **`validarQuantidadeDependentes()`** (`:486-490`, chamada em `salvar()`): se `possuiDependentes==TRUE && quantidadeDependentes==0` → **MSG0004 "Dependentes"**.
- `consistirDados()` (`:413-428`): se `apurarImpostoRenda==FALSE`, zera flags dependentes #2-13.
- **Regime caixa = boolean** `regimeDeCaixa` (não enum). Único enum do domínio: `TipoOcorrenciaIrpfEnum` (NORMAL/SEPARADO/EXCLUSIVA/RRA) — tag da **ocorrência computada**, não coluna de `Irpf`.

### Negativos decisivos (não inventar)
- **NÃO há campo "moléstia grave"/isenção** em `Irpf` (alavancas: `incidirSobreJurosDeMora` + `aposentadoMaiorQue65Anos`).
- **NÃO há "IRRF já retido/recolhido"** input no domínio IRPF.
- **`rra_numero_parcelas` não existe no Java** (a "quantidade de meses" canônica é `qtdMesesRendimentoTributaveis`). O MRD tem `rra_numero_parcelas` extra — manter como extra MRD.

## 1. Estado atual no MRD — 🐞 BUG: save de regime/RRA FALHA
- **`pjecalc_ir_config`** (tabela): apurar, incidir_sobre_juros, tributacao_exclusiva_13, tributacao_separada_ferias, cobrar_reclamado, deduzir_cs/prev_privada/pensao/honorarios, aposentado_65, dependentes, **regime_caixa**, **art_12a_rra**, **extras** jsonb. **Out:** `pjecalc_ir_faixas` (tabela oficial, read-only).
- Módulo `ModuloIR.tsx` (form rico). Engine-wired (`toEngineIrConfig`, orchestrator:541 → `PjeIRConfig`).
- **🐞 Field-name drift (confirmado via MCP — INSERT ERRA `column does not exist`):**
  - form escreve **`aplicar_regime_caixa`** → coluna real é **`regime_caixa`**.
  - form escreve **`apurar_rra`** → coluna real é **`art_12a_rra`**.
  - form escreve **`rra_meses`/`rra_numero_parcelas`/`incidir_sobre_principal_*`** → **não há colunas** (pertencem a `extras` jsonb).
  - `ModuloIR.save` faz `upsertIrConfig({ ...form })` → PostgREST rejeita colunas inexistentes → **o save inteiro FALHA quando regime-caixa/RRA estão presentes** (sempre, pois o form sempre manda esses campos). **Usuário não consegue salvar config de IR.**
  - Além disso, `toEngineIrConfig` (orchestrator:548-550) lê `apurar_rra`/`rra_meses`/`rra_numero_parcelas` como **chaves top-level da row** — que não existem → **RRA nunca chega ao engine** (cai em auto-detect).

### Gap de paridade + correção (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| salvar config IR | persiste | **FALHA (drift)** | **🐞 fix: mapear aplicar_regime_caixa→regime_caixa, apurar_rra→art_12a_rra; RRA→extras jsonb** |
| RRA chega ao engine | qtdMeses | **não chega** | **fix: getIrConfig/toEngineIrConfig leem RRA de extras** |
| possuiDependentes ⇒ qty ≥ 1 | MSG0004 | ausente | **+schema** |
| RRA meses ≥ 1 quando apurar | (qtd>0) | ausente | **+schema** |
| moléstia grave / IRRF retido / rra_parcelas | **não existem** | — | não inventar (parcelas = extra MRD mantido) |

> **Decisão (autonomia):** (1) `ir-config-schema.ts` (zod: dependentes ≥ 1 se "possui dependentes"; RRA meses/parcelas ≥ 1 se apurar_rra). (2) Corrigir `ModuloIR.save`: escrever `regime_caixa`/`art_12a_rra` (colunas reais) + RRA/incidir_principal em `extras` jsonb → **save passa a funcionar**. (3) Corrigir `toEngineIrConfig` p/ ler RRA de `extras` → **RRA chega ao engine**. Não desmonto o motor; só alinho nomes ao schema real.

## 2. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3318 passed | 45 skipped | 0 failed** (era 3312 → +6, zero regressão)
- [x] testes da seção: `ir-config-schema.test.ts` = **6 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — possui dependentes⇒qty≥1 (MSG0004); RRA meses/parcelas≥1 se apurar; IR off não valida
- [x] **🐞 fix: save de IR** — `ModuloIR.save` grava `regime_caixa`/`art_12a_rra` (colunas reais) + RRA/incidir_principal em `extras` jsonb; leitura (useEffect) espelha. Antes escrevia `aplicar_regime_caixa` → save falhava (PGRST 42703).
- [x] **fix: `toEngineIrConfig`** lê RRA de `extras` (fallback top-level) — antes RRA não chegava ao engine.
- [x] persistência via MCP — round-trip `pjecalc_ir_config` (regime_caixa=true, art_12a_rra=true, extras com rra_meses=12) **aceito** (antes erro); row removida
- [x] Playwright e2e → **1 passed (5.6s), exit 0** — `e2e/fluxos/21-imposto-de-renda.spec.ts` (Regime de Caixa ligado → salva sem erro; payload usa coluna real `regime_caixa` + `extras`, não `aplicar_regime_caixa`)
- [x] spec commitada / commit isolado da seção

## 3. Dívidas
- `rra_numero_parcelas` é extra MRD (Java usa só `qtdMesesRendimentoTributaveis`) — mantido em extras.
- Tabela oficial `pjecalc_ir_faixas` = reference read-only (fora de escopo).
- Datas RRA (anos anteriores/ano recebimento) do Java não expostas no `ModuloIR` atual (só meses/parcelas) — dívida de cobertura de UI.
