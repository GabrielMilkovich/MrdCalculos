# PJe-Calc v2.15.1 — Código-fonte de referência

> **SOMENTE LEITURA.** Este diretório contém o código-fonte Java **descompilado** do PJe-Calc
> v2.15.1. É usado **exclusivamente como referência** para o porte 1:1 em TypeScript
> (ver `src/lib/pjecalc/core/`). Nada aqui é compilado, executado ou empacotado na build
> do MrdCalculos.

---

## Proveniência

- **Origem**: `pjecalc-windows64-2.15.1/tomcat/webapps/pjecalc/WEB-INF/lib/`
  - `pjecalc-base-2.15.1.jar` → `base/`
  - `pjecalc-negocio-2.15.1.jar` → `negocio/`
- **Ferramenta**: [CFR 0.152](https://www.benf.org/other/cfr/) (Java decompiler)
- **Sistema de origem**: PJe-Calc (CSJT/TRT), sistema oficial da Justiça do Trabalho brasileira
  para cálculos trabalhistas em execução de sentença.

## Licença

O PJe-Calc é distribuído pelo CSJT como software público (o instalador oficial é gratuito
e disponibilizado pelo Conselho Superior da Justiça do Trabalho). Este diretório contém um
**artefato descompilado** usado apenas para fins de interoperabilidade e porte, conforme
previsto na LDA (Lei 9.610/98, art. 46) e na Lei do Software (Lei 9.609/98, art. 6º, III)
para engenharia reversa voltada à obtenção de compatibilidade.

Nenhum arquivo deste diretório é redistribuído na build final do MrdCalculos.

---

## Estrutura

```
pjecalc-fonte/
├── base/                                   ← Helpers e infraestrutura
│   └── br/jus/trt8/pjecalc/base/
│       ├── comum/         ← Utils, HelperDate, Periodo, api/, formaters/, validadores/
│       ├── constantes/    ← Enums base
│       └── dominio/       ← Entidades base
│
└── negocio/                                ← Lógica de negócio (motor de cálculo)
    └── br/jus/trt8/pjecalc/negocio/
        ├── constantes/             ← 87 enums (verbas, índices, regimes, etc.)
        ├── comum/
        │   └── rotinasdecalculo/   ← Integralizar, Proporcionalizar, aviso prévio...
        ├── dominio/
        │   ├── verbacalculo/       ← MaquinaDeCalculo, VerbaDeCalculo, TabelaDeCorrecao
        │   ├── formula/            ← Formula, FormulaCalculada, FormulaReflexo, Termos
        │   ├── ocorrenciaverba/    ← OcorrenciaDeVerba (~786 linhas)
        │   ├── calculo/            ← Calculo (~3087 linhas), Ferias, Falta, fgts/,
        │   │                         inss/, irpf/, juros/, honorarios/, custas/, etc.
        │   ├── indices/            ← Tabelas de índices (TR, SELIC, IPCA-E, JAM…)
        │   ├── historicosalarial/  ← Base salarial por período
        │   ├── pagamento/          ← Pagamento, Atualizacao (~1579 linhas), Rateio
        │   └── cartaodeponto/      ← Cartão de ponto (~7917 linhas)
        └── servicos/               ← ServicoDeCalculo (orquestrador)
```

---

## Falhas de descompilação conhecidas

Apenas **2 métodos** falharam no CFR (registrados nos `summary.txt` de cada JAR):

| Classe | Método | Impacto |
|---|---|---|
| `base.comum.Utils` | `descompactarGZIP(byte[])` | Irrelevante — TS tem libs nativas de GZIP |
| `negocio.dominio.calculo.inss.RepositorioDeInss` | `geraOcorrenciasSobreSalariosDevidos(Inss)` e `gerarOcorrencias(Inss, boolean, boolean)` | Parcial — reconstruir a partir dos métodos adjacentes + comparação com PJe-Calc oficial |

Todos os demais arquivos (802 `.java`) foram descompilados integralmente.

---

## Contrato de porte (resumo — ver CLAUDE.md na raiz para regras completas)

1. **Fidelidade 1:1**: cada classe Java → um arquivo TS com mesmos nomes de métodos (camelCase).
2. **Cabeçalho obrigatório** no arquivo TS portado:
   ```ts
   /**
    * PJe-Calc v2.15.1 — <NomeDaClasse>
    * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.<pacote>.<NomeDaClasse>
    */
   ```
3. **Substituições técnicas**:
   - `BigDecimal` → `Decimal` (decimal.js)
   - `MathContext(38)` → `Decimal.set({ precision: 38, rounding: Decimal.ROUND_HALF_EVEN })`
     (o PJe-Calc usa precisão **38**, conforme `Utils.CONTEXTO_MATEMATICO`)
   - `Utils.arredondarValorMonetario()` → `toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)`
   - `Utils.nulo(x)` / `naoNulo(x)` → helpers em `src/lib/pjecalc/core/base/comum/utils.ts`
   - `HelperDate.getInstance(date)` → idem no TS
4. **O que NÃO portar**:
   - Camada JPA/Hibernate (persistência)
   - JasperReports (`calculo/relatorio/`, 72 arquivos)
   - Seam (`@Name`, `@Scope`, `@In`, `@Create`, `@Destroy`)
   - Formatadores/validadores UI (`base/comum/formaters/`, `base/comum/validadores/`)
   - Repositórios JPA (`.salvar()`, `.restaurar()`, etc.)

---

## Exclusão da build

Este diretório **não** entra em:
- `tsc` / `tsc --noEmit` → `tsconfig.app.json` usa `include: ["src"]`
- `vite build` → Vite só processa o grafo de imports a partir de `src/`
- `vitest` → `include: ['src/**/*.test.ts']`
- `eslint` → explicitamente ignorado em `eslint.config.js`
- GitHub Linguist → marcado como `linguist-vendored` em `.gitattributes`

---

## Como consultar durante o porte

```bash
# Ler uma classe específica
cat pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/fgts/Fgts.java

# Buscar onde um método é chamado
grep -rn "calcularMultaDe40" pjecalc-fonte/

# Listar todos os enums
find pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes -name '*.java'
```
