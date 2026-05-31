# Spec — Parâmetros Gerais

> **Seção 2/16** do projeto de paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Dados do Cálculo", irmã de "Dados do Processo".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java decompilado (canônico p/ regra) | `pjecalc-fonte/negocio/.../dominio/calculo/Calculo.java` | tipos, validação, defaults |
> | App PJe-Calc (canônico p/ rótulo/ordem) | screenshot aba Parâmetros Gerais | labels, ordem |
>
> **Regra:** Java vence em regra de negócio.

---

## 0. Domínio

Toda a tela mapeia em **`Calculo`** (`Calculo.java:184`). Validação imperativa em
`Calculo.validar()` (`:719-741`) → `consistirCamposObrigatorios()` + cadeia de
`consistir*`. Mensagens (`constantes/Mensagens.java`): MSG0003 obrigatório,
MSG0004 inválido, MSG0008 "A não pode ser anterior a B", MSG0009 "≤ data atual",
MSG0011 "fora de ±100 anos", MSG0020 "informe Demissão ou Término", MSG0033
"carga horária obrigatória c/ exceções", MSG0066 ponto facultativo, MSG0081-0084/0150 prescrição.

---

## 1. Campos canônicos

### 1.1 Estado / Município
| # | Campo | Tipo Java | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|
| 1 | **Estado** | `Estado`/UF | **sim** | null | MSG0003 se null | `Calculo.consistirCamposObrigatorios:469-471` |
| 2 | **Município** | `Municipio` (`@NotNull`) | **sim** | null | MSG0003 se null | `:472-474`; `@NotNull` `Calculo.java:246-249` |

### 1.2 Datas do Processo
| # | Campo | Tipo | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|
| 3 | **Admissão** | Date (`@NotNull`) | **sim** | null | obrig (MSG0003); não pode ser hoje/futuro (MSG0009); não >100 anos atrás (MSG0011) | `:475-477`, `consistirDataDeAdmissao:525-541`; `@NotNull` `Calculo.java:223-226` |
| 4 | **Demissão** | Date | **condicional** | null | obrig se Término vazio (MSG0020); não >100 anos futuro; **admissão ≤ demissão** (MSG0008) | `:481-483`, `consistirDataDeDemissao:604-616` |
| 5 | **Ajuizamento** | Date (`@NotNull`) | **sim** | null | obrig (MSG0003); não >100 anos futuro; **admissão ≤ ajuizamento** (MSG0008) | `:478-480`, `consistirDataDeAjuizamento:618-630`; `@NotNull` `Calculo.java:230-233` |

### 1.3 Limitar Cálculo (período + prescrição)
| # | Campo | Tipo | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|
| 6 | **Data Inicial** (início cálculo) | Date | não | null | dentro ±100 anos; ≥ admissão; ≤ demissão | `consistirDataDeInicioDoCalculo:632-653` |
| 7 | **Data Final** (término cálculo) | Date | **condicional** | null | obrig se Demissão vazia (MSG0020); ±100 anos; ≥ admissão; ≥ início | `:484-486`, `consistirDataDeTerminoDoCalculo:655-676` |
| 8 | **Aplicar Prescrição Quinquenal** | Boolean (`@NotNull`) | sim (flag) | (sem init no campo — efetivamente false/null) | se true: data prescrição quinq. > admissão e ≤ fim (MSG0082/0084) | `Calculo.java:270-274`, `consistirPrescricaoQuinquenal:543-548` + `consistirPrescricao:557-602` |
| 9 | **Prescrição FGTS** (trintenária) | Boolean (`@NotNull`) | sim (flag) | (sem init) | se true: data > admissão e ≤ fim (MSG0081/0083/0150) | `Calculo.java:265-269`, `consistirPrescricaoFgts:550-555` |

### 1.4 Outros Parâmetros
| # | Campo | Tipo | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|
| 10 | **Regime de Trabalho** | enum (Integral/Parcial/Intermitente) | não | `tempo_integral` (engine) / `INTEGRAL` (DB) | — | engine `PjeParametros.regime_trabalho`; DB `regime_contrato` |
| 11 | **Maior Remuneração** | BigDecimal(12,2) | não | null | — | `Calculo.java:236-237` (`valorMaiorRemuneracao`) |
| 12 | **Última Remuneração** | BigDecimal(12,2) | não | null | — | `Calculo.java:234-235` (`valorUltimaRemuneracao`) |

### 1.5 Aviso Prévio / Carga Horária
| # | Campo | Tipo | Obrig. | Default | Validação | Origem |
|---|---|---|---|---|---|---|
| 13 | **Prazo Aviso Prévio** | enum `TipoDeApuracaoPrazoDoAvisoPrevioEnum` (não apurar / calculado / informado) | não | `nao_apurar` (engine) | se "informado": Quantidade obrig (MSG0003) e ≥1 (MSG0004) | `consistirCamposObrigatorios:490-498`, `validarQtdePrazoAviso:521-523` |
| 14 | **Carga Horária Padrão** | BigDecimal(7,4) | condicional | **220.0** | obrigatória se houver exceções de carga horária (MSG0033) | `Calculo.java:244-245` (`= new BigDecimal("220.0")`), `:487-489` |

### 1.6 Cálculos (flags) — todos `@NotNull` Boolean
| # | Campo | Default Java | Origem |
|---|---|---|---|
| 15 | **Sábado como Dia Útil** | **true** | `Calculo.java:250-254` (`sabadoDiaUtil = true`) |
| 16 | **Projetar Aviso Prévio Indenizado** | **true** | `:255-259` (`projetaAvisoIndenizado = true`) |
| 17 | **Limitar Avos ao Período do Cálculo** | **false** | `:275-279` (`limitarAvosAoPeriodoDoCalculo = false`) |
| 18 | **Zerar Valor Negativo** | (sem init — null/false) | `:280-284` (`zeraValorNegativo`) |
| 19 | **Considerar Feriados Estaduais** | **true** | `:260-264` (`consideraFeriadoEstadual = true`) |
| 20 | **Considerar Feriados Municipais** | **true** | `:285-289` (`consideraFeriadoMunicipal = true`) |

### 1.7 Listas (entidades aninhadas)
| # | Campo | Tipo | Validação | Origem |
|---|---|---|---|---|
| 21 | **Exceções Carga Horária** | lista (início/fim/valor) | exige carga padrão (MSG0033) | `Calculo.excecoesDaCargaHoraria` (`:487`) — **detalhe na Seção 9** |
| 22 | **Exceções Sábado** | lista (início/fim) | — | **Seção 10** |
| 23 | **Pontos Facultativos** | lista `ItemPontoFacultativo` (nome + abrangência Nacional/Estadual/Municipal) | abrangência deve casar com Estado/Município (MSG0066) | `consistirPontosFacultativos:685-691` |

### 1.8 Comentários
| # | Campo | Tipo | Obrig. | Validação | Origem |
|---|---|---|---|---|---|
| 24 | **Comentários** | String | não | — | campo livre (sem validação no `validar()`) |

> **Pontos Facultativos (paridade):** engine MRD modela como flags fixas
> (`sexta_santa`, `carnaval`, `corpus_christi`) em `PjeParametros.pontos_facultativos`,
> não como entidades com abrangência geográfica. A validação MSG0066 (abrangência
> casar com UF/Município) é específica do modelo PJe e fica **fora de escopo explícito**
> (marcar na UI; o engine MRD trata os 3 como nacionais). Coluna `pontos_facultativos text[]`.

---

## 2. Estado atual no MRD (verificado contra prod `xhvlhrgfoeahgofhljbs`)

### 2.1 🐞 Bug de wiring (núcleo desta seção)
- Form ativo `ModuloParametrosGerais.tsx` grava em **`pjecalc_calculos`** (upsert onConflict=case_id).
- Engine lê params via `loadCaseData → getParametros → fromView('pjecalc_parametros')` → `toEngineParams` (`orchestrator.ts:104`).
- **`pjecalc_parametros` é TABELA separada** (não é view de `pjecalc_calculos`), só 4 linhas, colunas diferentes, **sem trigger de sync**.
- `renderParametros()`/`saveParams()` em `PjeCalcInline` (que escreviam `pjecalc_parametros`) são **dead code** (nunca chamados; o switch renderiza `ModuloParametrosGerais`).
- **Consequência:** editar Parâmetros Gerais na UI **NÃO chega ao cálculo**.

### 2.2 Decisão de wiring (autônoma — CLAUDE.md "tocar sozinho")
**Canonicalizar params em `pjecalc_calculos`** (opção contida/menor-risco; dono ratificou):
`getParametros` passa a ler de `pjecalc_calculos` e **mapear** colunas → shape `PjecalcParametrosRow`, com **fallback** para `pjecalc_parametros` legado quando não houver linha em calculos. Nada muda onde o form grava. Suíte de paridade não usa `loadCaseData` (constrói params direto), então risco de regressão é baixo.

### 2.3 Mapa de colunas (pjecalc_calculos → engine `PjeParametros`)
| Engine (`PjecalcParametrosRow`) | Coluna `pjecalc_calculos` | Obs. |
|---|---|---|
| estado | `uf` | |
| municipio | `municipio_ibge` | |
| data_admissao / data_demissao / data_ajuizamento | idem | |
| data_inicial | `data_inicio_calculo` | |
| data_final | `data_fim_calculo` | |
| prescricao_quinquenal / prescricao_fgts | idem | |
| regime_trabalho | `regime_contrato` | normalizar INTEGRAL→tempo_integral |
| carga_horaria_padrao | `divisor_horas` | (220 default) |
| maior_remuneracao | `valor_maior_remuneracao` | |
| ultima_remuneracao | `valor_ultima_remuneracao` | |
| prazo_aviso_previo | `prazo_aviso_previo` | **+coluna nova** |
| projetar_aviso_indenizado | `projetar_aviso_indenizado` | |
| limitar_avos_periodo | `limitar_avos_periodo_calculo` | |
| zerar_valor_negativo | `zera_valor_negativo` | |
| sabado_dia_util | `sabado_dia_util` | |
| considerar_feriado_estadual | `considera_feriado_estadual` | |
| considerar_feriado_municipal | `considera_feriado_municipal` | |
| tipo_mes | `tipo_mes` | **+coluna nova** |
| comentarios | `observacoes` | |

> **Migração additiva** (aplicada via MCP): só 3 colunas genuinamente novas
> (`prazo_aviso_previo`, `tipo_mes`, `pontos_facultativos`). As demais já existem.

---

## 3. Wiring com engine
`getParametros` (adapter) → `PjecalcParametrosRow` → `toEngineParams` (`orchestrator.ts:104`)
→ `PjeParametros`. Prova (Etapa 4): teste do adapter `mapCalculoRowToParametros`
garantindo cada coluna mapeada + normalização de enums + fallback legado.

---

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3200 passed | 45 skipped | 0 failed** (era 3186 → +14, zero regressão na suíte de paridade que passa por loadCaseData/getParametros)
- [x] testes da seção: `parametros-adapter.test.ts` (3) + `parametros-gerais-schema.test.ts` (11) = **14 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste provando cada campo chega ao engine — `parametros-adapter.test.ts` (mapeia todas as colunas + defaults Calculo.java + normalização de enum)
- [x] persistência via MCP — round-trip das novas colunas (prazo_aviso_previo, tipo_mes, pontos_facultativos, limitar_avos_periodo_calculo, zera_valor_negativo) confirmado; linha de teste removida (prod limpo)
- [x] Playwright e2e da seção → **2 passed (9.5s), exit 0** — `e2e/fluxos/09-parametros-gerais.spec.ts`: (1) preenche→salva→recarrega→persiste; (2) bloqueia admissão>demissão (MSG0008). Dev server IPv4 no sandbox (mesma limitação IPv6 da Seção 1).
- [x] migração aditiva aplicada via MCP (+ self-correct das 3 colunas redundantes criadas por diagnóstico em listagem truncada) + spec commitada
- [x] commit isolado da seção
