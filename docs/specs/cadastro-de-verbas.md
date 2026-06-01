# Spec — Cadastro de Verbas

> **Seção 11/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Verbas e Ocorrências". **Entidade mais complexa do sistema.**
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/verbacalculo/VerbaDeCalculo.java` (1598 linhas) + `Calculada/Informada/Reflexo.java` + `dominio/formula/*` + `dominio/termo/*` + `constantes/*Enum.java` | tipos, validação, enums |
> | App PJe-Calc | aba "Cadastro de Verbas" | labels |

---

## 0. Domínio (Java) — agregado de 3 camadas
`VerbaDeCalculo` (`@Inheritance SINGLE_TABLE TBVERBACALCULO`, disc. `STPDISCRIMINADOR`, `VerbaDeCalculo.java:125-131`) é raiz de um agregado:
1. **VerbaDeCalculo** (header: nome/descrição, incidências, período, caracteristica, ocorrência, flags) — subclasses `Calculada`("C") / `Informada`("I") / `Reflexo`("R").
2. **Formula** (1:1, `TBFORMULA`): quantidade, divisor, multiplicador, base tabelada (Calculada), constante (Informada), valor pago.
3. **Termos** (`Quantidade`, `Divisor`, `Multiplicador`, `BaseTabelada`, `Constante`, `ValorPago`, `BaseVerba`/`ItemBaseVerba`) + tabelas de vínculo (históricos/cartão/vale por verba).

Ligação: `Calculo.verbas` `@OneToMany @OrderBy("nome")` (`Calculo.java:295-297`).

> **tipo (principal/reflexa) e valor (calculado/informado) NÃO são colunas** — derivam da subclasse/discriminador. `nome` (≤120) é **auto-gerado** de `descricao` (≤50, o que o usuário digita) via `montarNomeCompleto()`.

## 1. Reflexos (modelagem)
**Não há entidade `ReflexoDaVerba` nem FK reflexo→principal.** Um reflexo é uma `VerbaDeCalculo` irmã (disc "R") cuja `FormulaReflexo.baseVerba.itens` (`ItemBaseVerba` → `IIDVERBACALCULO`) aponta as verbas que ele reflete. `Principal.getReflexos()` reconstrói por query (`obterReflexos`). Proteção de ciclo: `FormulaReflexo.checarCiclo` → MSG0108.

## 2. Campos de entrada (header) + enums
Campos `@NotNull` com defaults (não bloqueiam digitação): incidências (INSS/IRPF/FGTS/PrevPriv/Pensão, default false), caracteristica (default COMUM), ocorrência (MENSAL), jurosDoAjuizamento (OCORRENCIAS_VENCIDAS), gerarPrincipal/gerarReflexo (DIFERENCA), zeraValorNegativo (true), ativo (true), comporPrincipal (NAO). **Obrigatório de digitação:** `descricao` (`@NotNull` unique ≤50), `assuntoCnj` (`@NotNull`). Período (início/fim) sem `@NotNull` mas com checagens imperativas. `VerbaDeCalculo.java:143-265`.

### Enums canônicos (label / DB valor) — exaustivo
| Enum | Valores | Arquivo |
|---|---|---|
| `CaracteristicaDaVerbaEnum` | COMUM/C, DECIMO_TERCEIRO_SALARIO/DT, AVISO_PREVIO/AP, FERIAS/F | `CaracteristicaDaVerbaEnum.java` |
| `OcorrenciaDePagamentoEnum` | DESLIGAMENTO/DL, DEZEMBRO/DZ, MENSAL/M, PERIODO_AQUISITIVO/PA | — |
| `TipoDeGeracaoEnum` | DEVIDO/DV, DIFERENCA/DF | — |
| `TipoDeQuantidadeEnum` | INFORMADA/IN, IMPORTADA_DO_CALENDARIO/ICL, IMPORTADA_DO_CARTAO/ICP, AVOS/AV, APURADA/AP | — |
| `DivisorDeVerbaEnum` | CARGA_HORARIA/CH, DIAS_UTEIS/DU, OUTRO_VALOR/OV, IMPORTADA_DO_CARTAO/CP | — |
| `BaseDeCalculoDoPrincipalEnum` | ULTIMA_REMUNERACAO/UR, MAIOR_REMUNERACAO/MR, HISTORICO_SALARIAL/HS, SALARIO_DA_CATEGORIA/SC, SALARIO_MINIMO/SM, VALE_TRANSPORTE/VT | — |
| `ComportamentoDoReflexoEnum` | VALOR_MENSAL/VM, MEDIA_PELA_QUANTIDADE/MQ, MEDIA_PELO_VALOR/MV, MEDIA_PELO_VALOR_CORRIGIDO/MC | — |
| `PeriodoDaMediaDoReflexoEnum` | PERIODO_AQUISITIVO/PA, ANO_CIVIL/AC, ULTIMOS_DOZE_MESES/DM, DOZE_MESES_ANT_VENCIMENTO/DA | — |
| `TratamentoDaFracaoDeMesDoReflexoEnum` | MANTER/M, INTEGRALIZAR/I, DESPREZAR/D, DESPREZAR_MENOR_15/DMQ | — |
| `TipoVariacaoDaParcelaEnum` | FIXA/F, VARIAVEL/V | — |
| `JurosDoAjuizamentoEnum` | OCORR_VENCIDAS_E_VINCENDAS/M, OCORR_VENCIDAS/V | — |
| `LogicoEnum` | SIM/S, NAO/N | — |
| `TipoValorPagoEnum` | INFORMADO/I, CALCULADO/C | — |

## 3. Validação imperativa (chave de paridade)
- **`Calculada.validar()`** (`Calculada.java:106-127`): base obrigatória (MSG0003 "Bases Cadastradas"/"Verba"); se base `HISTORICO_SALARIAL` sem histórico vinculado → **MSG0003 "Histórico Salarial"** (`:116-118`); se `VALE_TRANSPORTE` sem vale → MSG0003.
- **`consistirPeriodoInicial`** (`:550-577`): ±100 anos (MSG0011); início ≥ admissão (MSG0008); início ≥ prescrição quinquenal (MSG0028); desligamento × demissão (MSG0143).
- **`consistirPeriodoFinal`** (`:579-620`): ±100 anos (MSG0011); **fim ≥ início** (MSG0008/MSG0085); fim × demissão/término (MSG0029/0010).
- **`Reflexo.validar`** (`Reflexo.java:144-169`): baseVerba.itens não-vazio (MSG0003 "Verba"); reflexo.início ≥ principal.início (MSG0008).
- **`Informada`/`FormulaInformada.consistir`**: "Devido" não-nulo (MSG0003) e > 0 (MSG0004).
- ⚠️ **MSG0032 NÃO é usada** neste build (existe em `Mensagens.java:38` mas sem referência no path de verba); a regra base-histórico usa **MSG0003**. (Pesquisa anterior referenciava build diferente — discrepância registrada.)

## 4. Estado atual no MRD (verificado contra prod) — modelo FLATTENED
- Tabela base `pjecalc_verba_base`; view `pjecalc_verbas` expõe ~40 campos engine-critical (divisor_tipo, quantidade_tipo, comportamento_reflexo, fracao_mes_modo, exclusões, dobrar_valor_devido, base_calculo, hist_salarial_nome, verba_principal_id…). Migrations 000010/000014 já expuseram o necessário.
- Módulo `ModuloVerbasCadastro.tsx` (form dialog, 441 linhas) — abrangente: nome/código/caracteristica/período/ocorrência/incidências/multiplicador/divisor/quantidade/base_tabelada/hist_salarial_nome/compor_principal/dobrar/reflexo behavior/fração mês/exclusões.
- Catálogos compartilhados `rubricas-oficiais.ts` (BASES_TABELADAS, COMPORTAMENTOS_REFLEXO, FRACAO_MES_MODOS, HIST_SALARIAL_NOMES).
- **Wiring:** `getVerbas` → `toEngineVerbas` (com normalizers de divisor/quantidade/comportamento) → `PjeVerba` (engine). Mature, profundamente fiado.
- **MRD achata** o agregado 3-camadas Java numa linha. Decisão de design legítima e consistente; o engine consome o achatado. **Não desmonto isso** (motor/estrutura fora de escopo).
- Validação atual: só `nome` obrigatório.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| descrição obrigatória | @NotNull | nome (já) | manter |
| período fim ≥ início | MSG0008 | ausente | **+schema** |
| período início ≥ admissão | MSG0008 | ausente | best-effort (grid não recebe admissão) — dívida |
| base histórico ⇒ hist vinculado | MSG0003 | ausente | **+schema** (se base/caracteristica ⇒ histórico, exigir hist_salarial_nome) |
| multiplicador/divisor/quantidade | (termos) | sem bounds | **+schema** (numéricos; divisor ≠ 0) |

> **Decisão (autonomia):** `verba-schema.ts` (zod): nome obrigatório; período fim≥início; multiplicador/divisor numéricos válidos (divisor≠0); quantidade ≥0 quando informada; se `base_tabelada` ∈ {histórico-like} exigir `hist_salarial_nome`. Fiar no `saveVerba`. Reusa catálogos de `rubricas-oficiais`. Não altero estrutura/wiring (maduros).

## 5. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3280 passed | 45 skipped | 0 failed** (era 3271 → +9, zero regressão)
- [x] testes da seção: `verba-schema.test.ts` = **9 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — nome; fim≥início (MSG0008); divisor≠0; multiplicador/quantidade numéricos; base histórico⇒hist vinculado (MSG0003)
- [x] campo→engine — confirmado: `toEngineVerbas` (orchestrator:188) mapeia `PjecalcVerbaRow` → `PjeVerba` (incl. ocorrências precomputadas, base_calculo, normalizers)
- [x] persistência via MCP — round-trip `pjecalc_verba_base` (multiplicador=1.5, divisor=220, base_tabelada); row removida
- [x] Playwright e2e → **2 passed (12.3s), exit 0** — `e2e/fluxos/17-cadastro-verbas.spec.ts` (cria→persiste; nome vazio→bloqueia)
- [x] spec commitada / commit isolado da seção

## 6. Dívidas
- MRD achata o agregado 3-camadas (Verba+Formula+Termos) — paridade funcional, não estrutural. Campos avançados do Java (valor pago separado, baseVerba multi-itens, salário-categoria por verba) parcialmente cobertos pelo flatten.
- período início≥admissão: grid não recebe data de admissão (dívida; validar quando disponível).
- MSG0032 vs MSG0003 (discrepância de build registrada).
