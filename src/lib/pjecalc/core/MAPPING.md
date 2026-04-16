# PJe-Calc v2.15.1 → TypeScript — Mapping Status

Porte 1:1 da lógica de cálculo do PJe-Calc para TypeScript.
Fonte Java: `pjecalc-fonte/` (decompilada com CFR 0.152).

## Legenda

- ✅ Portado e testado
- 🟡 Portado parcialmente (sem paridade completa)
- ⬜ Pendente
- ❌ Não portar (UI/JPA/Seam/JasperReports)

## Base (pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/)

| Arquivo Java | Arquivo TS | Status | Notas |
|---|---|---|---|
| `Utils.java` (729 linhas) | `core/base/comum/utils.ts` | ✅ | Predicados, aritmética, correção monetária, arredondamento HALF_EVEN. MathContext(38) aplicado globalmente. Omitidos: Groovy shell, reflection, GZIP/ZIP, ResourceBundle. |
| `HelperDate.java` (690 linhas) | `core/base/comum/helper-date.ts` | ✅ | Calendar wrapper, comparações, contagens, breakInMonths, competências. Omitido: totalWorkDays (requer feriados). |
| `Periodo.java` (237 linhas) | `core/base/comum/periodo.ts` | ✅ | Período com inicial/final, interseção, divisão, comparações. Sem totalWorkDays. |
| `EntidadeBase.java` | — | ❌ | JPA/Hibernate — não aplicável. |
| `RepositorioBase.java` | — | ❌ | JPA/Hibernate — não aplicável. |
| `LogicoFuzzy.java` | — | 🟡 | Placeholder; só usado em queries de dia útil. |

## Constantes (negocio/constantes/)

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `IndiceMonetarioEnum.java` | `core/constantes/enums.ts::IndiceMonetarioEnum` | ✅ |
| `IndicesAcumuladosEnum.java` | `core/constantes/enums.ts::IndicesAcumuladosEnum` | ✅ |
| `OcorrenciaDePagamentoEnum.java` | `core/constantes/enums.ts::OcorrenciaDePagamentoEnum` | ✅ |
| `TipoDeJurosEnum.java` | `core/constantes/enums.ts::TipoDeJurosEnum` | ✅ |
| `TipoDeQuantidadeDeJurosBaseEnum.java` | `core/constantes/enums.ts::TipoDeQuantidadeDeJurosBaseEnum` | ✅ |
| `JurosEnum.java` | `core/constantes/enums.ts::JurosEnum` | ✅ |
| `BaseDeJurosDasVerbasEnum.java` | `core/constantes/enums.ts::BaseDeJurosDasVerbasEnum` | ✅ |
| `JurosDoAjuizamentoEnum.java` | `core/constantes/enums.ts::JurosDoAjuizamentoEnum` | ✅ |
| `LogicoEnum.java` | `core/constantes/enums.ts::LogicoEnum` | ✅ |
| `CaracteristicaDaVerbaEnum.java` | `core/constantes/enums.ts::CaracteristicaDaVerbaEnum` | ✅ |
| `ValorDaVerbaEnum.java` | `core/constantes/enums.ts::ValorDaVerbaEnum` | ✅ |
| `ModoDeCalculoEnum.java` | `core/constantes/enums.ts::ModoDeCalculoEnum` | ✅ |
| `FaseDoCalculoEnum.java` | `core/constantes/enums.ts::FaseDoCalculoEnum` | ✅ |
| `ComportamentoDoReflexoEnum.java` | `core/constantes/enums.ts::ComportamentoDoReflexoEnum` | ✅ |
| `AliquotaDoFgtsEnum.java` | `core/constantes/enums.ts::AliquotaDoFgtsEnum` | ✅ |
| `TipoDeBaseDoFgtsEnum.java` | `core/constantes/enums.ts::TipoDeBaseDoFgtsEnum` | ✅ |
| `ConversaoDeMoedas.java` | — | ⬜ | Mapas de conversão de moeda 1986-1994 |
| Outros 70+ enums (UI/permissões) | — | ❌ | Não afetam cálculo |

## Rotinas de cálculo (negocio/comum/rotinasdecalculo/)

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `CalculadorDeIndices.java` | `core/comum/rotinasdecalculo/calculador-de-indices.ts` | ✅ | SOMA SIMPLES SELIC + PRODUTO IPCA-E. Omitidos: encontrarCompetenciaDiaria* (conversões pré-1995). |
| `CalculadorDoIntegralizar.java` | — | ⬜ | |
| `CalculadorDoProporcionalizar.java` | — | ⬜ | |
| `PeriodoDeJuros.java` (161 linhas) | `core/comum/periodo-de-juros.ts` | ✅ | getMeses() fracionado (pro-rata die) + getTaxa() simples/composto. |
| `TabelaDeJuros.java` (637 linhas) | — | ⬜ | Próximo item crítico — calcularTaxaDeJuros com combinações. |

## Domínio — Índices (negocio/dominio/indices/)

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `api/IndiceDeCalculo.java` (interface) | `core/dominio/indices/indice-de-calculo.ts` | ✅ |
| `IndiceBase.java` | `core/dominio/indices/indice-base.ts` | ✅ | Classe abstrata base. `getValorIndice()` = 1 + taxa/100 |
| `IndiceSemCorrecao.java` | `core/dominio/indices/indice-sem-correcao.ts` | ✅ | Fator sempre 1 |
| `ipcae/IndiceIPCAE.java` | `core/dominio/indices/ipcae/indice-ipcae.ts` + `tabela-ipcae.ts` | ✅ | 134 entradas (2015-01 a 2026-02) |
| `ipca/IndiceIPCA.java` | `core/dominio/indices/ipca/indice-ipca.ts` | ✅ | Tabela vazia (seed a popular) |
| `inpc/IndiceINPC.java` | `core/dominio/indices/inpc/indice-inpc.ts` | ✅ | Tabela vazia |
| `ipc/IndiceIPC.java` | `core/dominio/indices/ipc/indice-ipc.ts` | ✅ | Tabela vazia |
| `tr/IndiceTR.java` | `core/dominio/indices/tr/indice-tr.ts` + `tabela-tr.ts` | ✅ | 169 entradas (2012-2026) |
| `igpm/IndiceIGPM.java` | `core/dominio/indices/igpm/indice-igpm.ts` | ✅ | Tabela vazia |
| `selic/IndiceSelicDiaria.java` | `core/dominio/indices/selic/indice-selic-diaria.ts` | ✅ | Produto (SELIC_BACEN) |
| `selic/IndiceSelicFazenda.java` | `core/dominio/indices/selic/indice-selic-fazenda.ts` | ✅ | Soma simples (SELIC Fazenda) |
| `jam/IndiceJAM.java` | `core/dominio/indices/jam/indice-jam.ts` | ✅ | JAM diária Caixa |
| `ipcatr/IndiceIPCAETR.java` | `core/dominio/indices/ipcatr/indice-ipcae-tr.ts` | ✅ | IPCA-E + TR combinado |
| `dfp/IndiceDevedorFazenda.java` | `core/dominio/indices/dfp/indice-devedor-fazenda.ts` | ✅ | EC 113/2021 |
| `it/IndiceIndebitoTributario.java` | `core/dominio/indices/it/indice-indebito-tributario.ts` | ✅ | Repetição indébito |
| `tabelaunica/IndiceTabelaUnicaJTMensal.java` | `core/dominio/indices/tabelaunica/indice-tabela-unica-jt-mensal.ts` | ✅ | CNJ mensal |
| `tabelaunica/IndiceTabelaUnicaJTDiario.java` | `core/dominio/indices/tabelaunica/indice-tabela-unica-jt-diario.ts` | ✅ | CNJ diária |
| `tabelaunica/IndiceTabelaUnicaDebitoTrabalhista.java` | `core/dominio/indices/tabelaunica/indice-tabela-unica-debito-trabalhista.ts` | ✅ | TUACDT |

## Domínio — OcorrenciaVerba

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `ocorrenciaverba/OcorrenciaDeVerba.java` (786 linhas) | `core/dominio/ocorrenciaverba/ocorrencia-de-verba.ts` | ✅ | 23 métodos core: getters/setters + getDiferenca/DiferencaCorrigida/DiferencaIntegral + calcularFatorAbono + compareTo + clone. Usa IVerbaDeCalculoRef/IFeriasRef para evitar dep circular. Stubs: `integraliza` (placeholder identity — será delegado para CalculoDoIntegralizar quando portado). |

## Domínio — INSS faixas

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `inss/faixas/FaixaPrevidenciaria.java` (114 linhas) | `core/dominio/inss/faixas/faixa-previdenciaria.ts` | ✅ | Classe abstract + 5 concretas (Primeira a Quinta) + utility `calcularInssProgressivo()`. |
| `inss/faixas/PrimeiraFaixaPrevidenciaria.java` | idem (exportada junto) | ✅ |
| `inss/faixas/SegundaFaixaPrevidenciaria.java` | idem | ✅ |
| `inss/faixas/QuartaFaixaPrevidenciaria.java` | idem | ✅ |
| `inss/faixas/QuintaFaixaPrevidenciaria.java` | idem | ✅ |

## Domínio — Verba (negocio/dominio/verbacalculo/ + formula/ + ocorrenciaverba/)

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `TabelaDeCorrecaoMonetaria.java` (810 linhas) | `core/dominio/verbacalculo/tabela-de-correcao-monetaria.ts` | 🟡 | Dispatcher completo (17 índices) + ajustarData (Súmula 381) + obterIndice + carregarTabela simples. Injeção via `ITabelaCorrecaoContext`. ⬜ Combinação trabalhista (4 métodos combinar*) pendente. |
| `MaquinaDeCalculo.java` (617 linhas) | — | 🟡 | calcularValorDevidoDaOcorrencia portado no engine.ts legado |
| `VerbaDeCalculo.java` (1598 linhas) | — | ⬜ | Entidade raiz da verba |
| `ocorrenciaverba/OcorrenciaDeVerba.java` (786 linhas) | `core/dominio/ocorrenciaverba/ocorrencia-de-verba.ts` | ✅ | 23 métodos core |
| `formula/Formula.java` + `FormulaCalculada.java` + `FormulaReflexo.java` | — | ⬜ | |

## Domínio — Cálculo (negocio/dominio/calculo/)

| Arquivo Java | Arquivo TS | Status |
|---|---|---|
| `Calculo.java` (3087 linhas) | `engine.ts` (legado) | 🟡 | Grande parte reescrita no engine legado |
| `fgts/Fgts.java` (870 linhas) | — | ⬜ | |
| `inss/Inss.java` (1640 linhas) | — | 🟡 | Progressivo simples no engine legado |
| `irpf/Irpf.java` (1675 linhas) | — | 🟡 | Art.12-A incompleto no engine legado |
| `juros/` | — | 🟡 | SELIC simples no engine legado |
| `ferias/Ferias.java` | — | ⬜ | |
| `atualizacao/ParametrosDeAtualizacao.java` (943 linhas) | — | ⬜ | |

## Fora de escopo

- `dominio/processo/relatorio/**` (72 arquivos) — JasperReports
- `base/comum/formaters/` — formatação UI
- `base/comum/validadores/` — validação UI
- Camada JPA/Hibernate inteira
- Classes Seam (@Name, @Scope, @In)

## Progresso Global

### Portado (✅) — 24 arquivos de código + 14 tabelas + 1 interface
- **base/comum:** Utils, HelperDate, Periodo
- **constantes:** 16 enums críticos (IndiceMonetario, IndicesAcumulados, OcorrenciaDePagamento, TipoDeJuros, TipoDeQuantidade, JurosEnum, BaseDeJurosDasVerbas, Logico, CaracteristicaVerba, ValorDaVerba, ModoDeCalculo, Fase, ComportamentoReflexo, AliquotaDoFgts, TipoBaseDoFgts, JurosDoAjuizamento)
- **comum:** CalculadorDeIndices (soma simples + produto + ignorarTaxaNegativa), PeriodoDeJuros (meses fracionados pro-rata)
- **dominio/indices:** interface IndiceDeCalculo + 13 classes de índice (Base, SemCorrecao, IPCAE, IPCA, INPC, IPC, TR, IGPM, JAM, SelicDiaria, SelicFazenda, IPCAETR, DevedorFazenda, IndebitoTributario, TabelaUnicaJTMensal/Diario/DebitoTrabalhista)
- **dominio/ocorrenciaverba:** OcorrenciaDeVerba (23 métodos)
- **dominio/verbacalculo:** TabelaDeCorrecaoMonetaria (🟡 sem combinação trabalhista)
- **dominio/inss:** FaixaPrevidenciaria + 5 faixas concretas + calcularInssProgressivo

### Tabelas populadas com dados reais
- TABELA_IPCAE: 134 entradas (2015-01 a 2026-02, via IPCA_E_ACUMULADO)
- TABELA_TR: 169 entradas (2012-2026, zero pós-2017)

### Pendente crítico (⬜)
- TabelaDeJuros.java (637 linhas) — combinações de regimes de juros
- Combinação trabalhista em TabelaDeCorrecaoMonetaria (4 métodos combinar*)
- MaquinaDeCalculo.java (617 linhas) — calcularValorDevidoDaOcorrencia
- VerbaDeCalculo.java (1598 linhas) — entidade raiz
- Calculo.java (3087 linhas) — orquestrador
- INSS completo (Inss.java 1640 linhas), IRPF (1675 linhas), FGTS (870 linhas)
- Tabelas históricas IPCA/INPC/IPC/IGPM/JAM/SELIC diária (seeds)

### Legado (🟡)
Motor `engine.ts` (4600 linhas) ainda contém a lógica antiga em produção.
Porte do core acontece em paralelo; migração do engine será feita por último.

## Testes do core

54 testes validam os módulos portados:
- `core/__tests__/core-smoke.test.ts` (18 testes) — Utils, HelperDate, Periodo, CalculadorDeIndices, PeriodoDeJuros, Enums
- `core/__tests__/indices-ocorrencia.test.ts` (18 testes) — IndiceIPCAE, IndiceSemCorrecao, OcorrenciaDeVerba
- `core/__tests__/inss-faixas.test.ts` (8 testes) — FaixaPrevidenciaria + calcularInssProgressivo
- `core/__tests__/tabela-correcao.test.ts` (10 testes) — TabelaDeCorrecaoMonetaria (dispatcher + ajustarData + obterIndice)
