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
| `ipcae/IndiceIPCAE.java` | `core/dominio/indices/ipcae/indice-ipcae.ts` + `tabela-ipcae.ts` | ✅ | 134 entradas (2015-01 a 2026-02) |
| `ipca/IndiceIPCA.java` | — | ⬜ | |
| `selic/IndiceSelicDiaria.java` | — | ⬜ | SELIC diária BCB |
| `tr/IndiceTR.java` | — | ⬜ | |
| `jam/IndiceJAM.java` | — | ⬜ | JAM diária Caixa |
| `tabelaunica/IndiceTabelaUnicaJTMensal.java` | — | ⬜ | |

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
| `TabelaDeCorrecaoMonetaria.java` (810 linhas) | — | ⬜ | Centro da correção; combinações de índices |
| `MaquinaDeCalculo.java` (617 linhas) | — | 🟡 | calcularValorDevidoDaOcorrencia portado no engine.ts legado |
| `VerbaDeCalculo.java` (1598 linhas) | — | ⬜ | Entidade raiz da verba |
| `ocorrenciaverba/OcorrenciaDeVerba.java` (786 linhas) | — | 🟡 | Lógica chave no engine.ts legado |
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

- **Portado (✅):** 10 arquivos
  - base: Utils, HelperDate, Periodo
  - enums críticos (16)
  - interface IndiceDeCalculo
  - CalculadorDeIndices (soma simples + produto)
  - PeriodoDeJuros (meses fracionados)
  - IndiceBase + IndiceIPCAE + TABELA_IPCAE (134 entradas 2015-2026)
  - OcorrenciaDeVerba (23 métodos)
- **Pendente crítico (⬜):** TabelaDeJuros, TabelaDeCorrecaoMonetaria, IndiceIPCA/IPC/TR/JAM/SELIC, MaquinaDeCalculo, VerbaDeCalculo, Calculo, INSS, IRPF, FGTS
- **Legado (🟡):** lógica embutida em `engine.ts` (4600 linhas) a ser migrada para core/

## Testes do core

35 testes validam as primitivas portadas:
- `core/__tests__/core-smoke.test.ts` (18 testes)
- `core/__tests__/indices-ocorrencia.test.ts` (17 testes)
