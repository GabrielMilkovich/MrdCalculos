# PJe-Calc Source (referência externa)

**Versão:** 2.15.1 (decompilada com CFR 0.152)
**Origem:** https://github.com/GabrielMilkovich/PJECALC-ORIGINAL
**Tamanho:** 6,7 MB, 802 arquivos Java
**Status no repo:** ignorado em `.gitignore` (muito volumoso para commit).

## Como obter

```bash
git clone --depth=1 https://github.com/GabrielMilkovich/PJECALC-ORIGINAL.git vendor/pjecalc-source
```

## Estrutura relevante

```
vendor/pjecalc-source/
├── base/br/jus/trt8/pjecalc/base/comum/
│   ├── Utils.java                      # aplicarCorrecaoMonetaria, arredondamento HALF_EVEN, MathContext(38)
│   ├── HelperDate.java                 # manipulação de datas (getCurrentCompetence, addMonth, countMonths)
│   └── Periodo.java                    # intervalo de datas
└── negocio/br/jus/trt8/pjecalc/negocio/
    ├── comum/
    │   ├── rotinasdecalculo/
    │   │   └── CalculadorDeIndices.java           # ⭐ calcularIndiceAcumuladoComSomas (SELIC simples)
    │   ├── TabelaDeJuros.java                     # ⭐ calcularTaxaDeJuros (soma pro-rata)
    │   └── PeriodoDeJuros.java                    # ⭐ getMeses (fração pro-rata die)
    ├── constantes/
    │   ├── IndicesAcumuladosEnum.java            # MES_SUBSEQUENTE / MES_VENCIMENTO / HIBRIDO
    │   ├── IndiceMonetarioEnum.java              # SELIC, IPCAE, IGPM, INPC, TR, JAM, etc.
    │   ├── TipoDeJurosEnum.java                  # SIMPLES, COMPOSTOS
    │   └── TipoDeQuantidadeDeJurosBaseEnum.java  # FRACAO (pro-rata) vs INTEIRO (arredondado)
    └── dominio/
        ├── verbacalculo/
        │   ├── TabelaDeCorrecaoMonetaria.java     # ⭐ obterIndice + combinação de índices
        │   ├── MaquinaDeCalculo.java              # ⭐ calcularValorDevidoDaOcorrencia (fórmula)
        │   └── VerbaDeCalculo.java
        ├── juros/
        │   ├── selicinss/JurosSelicInss.java     # entidade taxa SELIC mensal
        │   ├── selicirpf/JurosSelicParaCorrecao.java  # ⭐ obterTabelaParaCorrecao (+1% no mês liq)
        │   ├── padrao/JurosPadrao.java            # juros simples 1%/mês (entidade)
        │   ├── taxalegal/JurosTaxaLegal.java      # taxa legal EC 113/2021
        │   └── precatorios/JurosPrecatorioEC1362025.java
        ├── ocorrenciaverba/
        │   └── OcorrenciaDeVerba.java             # ⭐ getDiferenca, getDiferencaCorrigida
        ├── calculo/
        │   ├── inss/                              # INSS progressivo
        │   ├── irpf/                              # IRPF Art.12-A + tabela mensal
        │   └── fgts/                              # FGTS TR+3%
        └── indices/
            ├── selic/IndiceSelicDiaria.java       # SELIC diária BCB
            └── ipcae/IndiceIPCAE.java             # IPCA-E mensal IBGE
```

## Achados críticos para paridade

### 1. SELIC é SOMA SIMPLES (confirmação do código-fonte)

`CalculadorDeIndices.calcularIndiceAcumuladoComSomas` (linha 181-205):

```java
// Fórmula oficial:
//   valorIndice = 1 + taxa_mensal/100
//   novoAcumulado = acumuladoAnterior + (valorIndice − 1) = acumuladoAnterior + taxa_mensal/100
// Portanto: acumulado_final = 1 + Σ(taxa_i/100)
```

### 2. Contagem de meses é PRO-RATA DIE (`FRACAO`)

`PeriodoDeJuros.getMeses()` (linhas 98-125):

```java
// Para FRACAO (padrão):
//   se dias_restantes_no_mes_inicial < dias_total_mes:
//     meses = meses_inteiros - 1 + (dias_restantes / dias_total)
//   se dia_final < dias_total_do_mes_final:
//     meses = meses - 1 + (dia_final / dias_total)
```

### 3. Precisão de cálculo

```java
public static final MathContext CONTEXTO_MATEMATICO = new MathContext(38);
```

Todas operações intermediárias usam **38 dígitos significativos**. Arredondamento `HALF_EVEN` (banker's) a 2 casas **apenas no valor final exibido**.

### 4. Fórmula de verba (MaquinaDeCalculo.java:320-350)

```java
devido = base / divisor × multiplicador × quantidade
if (dobra) devido *= 2
devido = round(devido, 2, HALF_EVEN)
```

Note: base é ALREADY arredondada a 2 casas ANTES (linha 415). Intermediários sem arredondamento.

### 5. Mês da liquidação: +1,00% fixo (regra RFB)

`JurosSelicParaCorrecao.obterTabelaParaCorrecao` (linha 109-116):

```java
if (incluirUmPorcento) {
    JurosSelicIrpf jurosUmPorcento = new JurosSelicIrpf();
    jurosUmPorcento.setTaxa(BigDecimal.ONE);  // 1,00% fixo
    ...
}
```

### 6. Súmula 381 TST mapeada explicitamente

`IndicesAcumuladosEnum`:
- `MES_SUBSEQUENTE_AO_VENCIMENTO` — Súmula 381 TST padrão
- `MES_DO_VENCIMENTO` — sem shift
- `MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO` — híbrido (rescisórias seguem mês vencimento)
- `ATUALIZACAO_CALCULO` — fase de atualização (pós-crédito apurado)

## Licença

Código decompilado do PJe-Calc oficial (TRT-8). Uso como referência técnica
para interoperabilidade — alinhar metodologia do MRD Calc com a oficial.
Nenhum fragmento deste código é redistribuído no MRD Calc; apenas as
regras/fórmulas são portadas para TypeScript nativo.
