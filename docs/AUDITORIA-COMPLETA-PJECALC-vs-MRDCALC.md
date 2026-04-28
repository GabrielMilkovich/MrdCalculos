# AUDITORIA COMPLETA — PJe-Calc v2.15.1 (Java) vs MRD Calc (TypeScript)

**Data da auditoria:** 21 de abril de 2026
**Snapshot de referência:** `main` @ `8d4e450` (PR #17 merged)

## Repositórios analisados

- **Fonte canônica (Java decompilado):** `./pjecalc-fonte/` (commitado no repo MRD)
  - 802 arquivos `.java`, 111.323 linhas de negócio (core + negocio + constantes, excluindo `Repositorio*`, `Filtro*` e outras camadas JPA/web).
  - Decompilado com CFR 0.152 do JAR oficial `pjecalc-2.15.1` do TRT-8.
- **Implementação atual:** `src/lib/pjecalc/core/`
  - 348 arquivos TS, 33.130 linhas totais; 24.192 linhas no escopo de comparação direta.

## Método

Para cada classe `.java` do pacote `negocio/dominio/`, `negocio/comum/` e `negocio/constantes/` (excluindo `Repositorio*` e `Filtro*`), a classe TS correspondente foi identificada por convenção de nomenclatura (CamelCase → kebab-case). Foram medidas linhas e métodos em cada par. **Total de 550 classes Java auditadas**.

## Veredito global

| Métrica | Java (PJe-Calc) | TS (MRD Calc) | Cobertura |
|---|---:|---:|---:|
| Linhas totais (core + negócio) | **111.323** | **24.192** | **21,7%** |
| Arquivos com código portado | 550 | 237 | 43% |
| Arquivos AUSENTES (0 linhas) | 0 | **313** | — |

O MRD Calc implementa aproximadamente **1 de cada 5 linhas** do PJe-Calc original. Os deltas sistemáticos de -30% observados no calibrate refletem diretamente esse gap.

## Auditoria por categoria

| Categoria | Arquivos | Java | TS | Cobertura | Ausentes |
|---|---:|---:|---:|---:|---:|
| **1-CORE-CALCULO** | 223 | 69.690 | 20.503 | **29,4%** | 52 |
| **2-TABELAS-INDICES** | 57 | 6.609 | 1.821 | 27,6% | 26 |
| **3-DOMINIO-SUPORTE** | 196 | 12.930 | 1.831 | **14,2%** | 162 |
| **4-RELATORIOS** (JRAdapter) | 46 | 16.334 | 0 | **0,0%** | 46 |
| **5-SERVICOS** | 21 | 4.390 | 37 | 0,8% | 20 |
| **6-META-DADOS** (usuário/processo) | 7 | 1.370 | 0 | 0,0% | 7 |

**Fora do escopo de port:**

- Categoria 4 (RELATORIOS) — substituída pelos `pdf-report-*.ts` próprios do MRD.
- Categoria 5 (SERVICOS) — integrações web/DB resolvidas via Supabase.
- Categoria 6 (META-DADOS) — já são tabelas Supabase no MRD.

**Escopo real de portabilidade:** ~86.000 linhas Java → ~50.000–60.000 linhas TS.

## Gaps críticos — as 20 classes de maior impacto

| # | Classe Java | Linhas Java | TS atual | Gap | Função |
|---|---|---:|---:|---:|---|
| 1 | `Calculo.java` | 3.087 | 816 | 2.271 | Orquestrador central (239 métodos) |
| 2 | `CustasJudiciaisDaAtualizacao.java` | 2.185 | 76 | 2.109 | Custas na atualização |
| 3 | `DebitosDoReclamante.java` | 1.868 | 121 | 1.747 | Descontos consolidados |
| 4 | `CreditosDoReclamante.java` | 1.916 | 192 | 1.724 | Créditos consolidados |
| 5 | `MaquinaDeCalculoDeIrpf.java` | 1.675 | 118 | 1.557 | Motor IRPF (RRA, proporções, tabelas históricas) |
| 6 | `VerbaDeCalculo.java` | 1.598 | 148 | 1.450 | Núcleo da lógica por verba (32/36 métodos ausentes) |
| 7 | `Pagamento.java` | 1.643 | 196 | 1.447 | Rateio de pagamentos entre verbas |
| 8 | `Atualizacao.java` | 1.579 | 134 | 1.445 | **Correção + juros** |
| 9 | `MaquinaDeCalculoDeCartaoDePonto.java` | 1.435 | 77 | 1.358 | Apuração do ponto |
| 10 | `OutrosDebitosReclamado.java` | 1.490 | 168 | 1.322 | Débitos do reclamado |
| 11 | `MaquinaDeCalculoDoInss.java` | 1.640 | 423 | 1.217 | Motor INSS |
| 12 | `ApuracaoCartaoDePonto.java` | 1.214 | 250 | 964 | Apuração consolidada de cartão |
| 13 | `DebitosCobrarDoReclamante.java` | 1.002 | 57 | 945 | Débitos executáveis |
| 14 | `Verba.java` | 808 | **AUSENTE** | 808 | **Domínio de verba (NÃO EXISTE em TS)** |
| 15 | `Fgts.java` | 870 | 104 | 766 | Saldo/depósitos/movimentações FGTS |
| 16 | `MaquinaDeRateioDoPagamento.java` | 832 | 71 | 761 | Rateio proporcional |
| 17 | `Honorario.java` | 758 | 294 | 464 | Honorários |
| 18 | `ParametrosDeAtualizacao.java` | 943 | 364 | 579 | Configuração de atualização |
| 19 | `HonorarioDaAtualizacao.java` | 732 | 87 | 645 | Honorários na atualização |
| 20 | `TabelaDeJuros.java` | 637 | 316 | 321 | Construtor de tabelas de juros |

Estas 20 classes representam ~24.600 linhas de lógica não portada e cobrem praticamente todos os sintomas de delta observados.

## Sumário por módulo

```
Módulo                        Arqs    Java      TS   Cov%  Aus
--------------------------------------------------------------
calculo/relatorio               51   16756      98   0.6%   48
pagamento                       21   16095    1780  11.1%    0
calculo/inss                    22    6238    3364  53.9%    1
cartaodeponto                   11    5673     934  16.5%    0
comum                           74    5550    1668  30.1%   42
verbacalculo                    18    4866    2614  53.7%    0
servicos                        21    4390      37   0.8%   20
calculo                         10    4362    1241  28.5%    0
constantes                      99    3963     163   4.1%   97
calculo/irpf                     9    3757    1391  37.0%    0
calculoexterno                  15    3689    1553  42.1%    0
processo                         9    3457       0   0.0%    9
termo                           22    3037    1899  62.5%    2
indices                         24    2952     849  28.8%    4
calculo/custas                   9    2886    1096  38.0%    2
calculo/atualizacao             13    2646    1160  43.8%    3
calculo/fgts                     8    2169     465  21.4%    5
inss                            18    1859     401  21.6%   16
calculo/salariofamilia           9    1596      43   2.7%    8
calculo/honorarios               7    1287     694  53.9%    2
calculo/segurodesemprego         5    1233      36   2.9%    4
juros                            8    1188     302  25.4%    1
calculo/previdenciaprivada       6     931       0   0.0%    6
ocorrenciaverba                  3     918     341  37.1%    2
calculo/ferias                   5     840     477  56.8%    0
calculo/multa                    4     822     497  60.5%    1
verba                            1     808       0   0.0%    1
historicosalarial                2     691     336  48.6%    0
irpf                             7     610     269  44.1%    5
calculo/pensaoalimenticia        3     610      46   7.5%    2
usuario                          3     547       0   0.0%    3
salariocategoria                 3     507       0   0.0%    3
feriado                          2     496       0   0.0%    2
valetransporte                   2     445       0   0.0%    2
formula                          4     393     110  28.0%    3
justificativa                    3     373       0   0.0%    3
custas                           1     332     114  34.3%    0
calculo/juros                    1     301     172  57.1%    0
calculo/faltas                   2     285      42  14.7%    1
salariominimo                    3     275       0   0.0%    3
segurodesemprego                 1     234       0   0.0%    1
salariofamilia                   1     228       0   0.0%    1
auditoria                        1     175       0   0.0%    1
participante                     2     131       0   0.0%    1
loginfra                         1     131       0   0.0%    1
perfil                           1     122       0   0.0%    1
controle                         1     118       0   0.0%    1
assuntocnj                       1     107       0   0.0%    1
municipio                        1     105       0   0.0%    1
estado                           1      92       0   0.0%    1
calculo/verba                    1      47       0   0.0%    1
--------------------------------------------------------------
TOTAL                          550  111323   24192  21.7%  313
```

## Convergência com sintomas observados

| Sintoma | Causa raiz |
|---|---|
| Delta calibrate -30% sistemático | `Atualizacao.java` 8% coberto → correção/juros aplicados parcialmente |
| Conversor descarta 34% das verbas | Receiver ausente: `VerbaDeCalculo` 9% + `Verba.java` 0% |
| INSS histórico 2015-2024 bugado | `MaquinaDeCalculoDoInss` 25% → restante dos 75% ainda quebrado |
| UUID-versus-name em histórico salarial | `VerbaDeCalculo.adicionarHistoricosVinculadosAtravesDoValorDevido` ausente |
| SELIC routing ADC 58/59 | `ajustarParaSelicNoAjuizamentoSemCombinacao` ausente |
| Cartão de ponto truncado | `MaquinaDeCalculoDeCartaoDePonto` 5% → cobertura mínima |
| Cross-year avos bug | `ParametrosDeAtualizacao` 38% → lógica de avos parcial |

## Próximo passo

Plano de reimplementação — Estratégia B (port focado nos 13 casos `.pjc` de `public/reports/`) — formalizado em [PORT-PJECALC-PLAN.md](./PORT-PJECALC-PLAN.md).
