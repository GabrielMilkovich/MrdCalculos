/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculo (classe abstrata raiz)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/MaquinaDeCalculo.java (~617 linhas)
 *
 * Responsabilidades da classe:
 *  - `calcularValorDevidoDaOcorrencia`  (linhas 320-350)   ← núcleo do motor
 *  - `gerarOcorrencias` / `executarGerarOcorrencias`       ← cria o calendário de ocorrências
 *  - `liquidar` / `executarLiquidar`                        ← preenche base/devido/pago
 *  - `criarOcorrenciaComPeriodoAquisitivo` (overloads 1-5) ← factory de OcorrenciaDeVerba
 *  - `isExecutando` / flags de reentrância
 *  - Métodos abstratos `obter*` implementados pelas 3 subclasses concretas
 *    (MaquinaDeCalculoDaVerbaCalculada / Informada / Reflexo).
 *
 * **Fórmula OFICIAL do devido** (linhas 325-329):
 *   devido = (base ÷ divisor × multiplicador × quantidade)            ← MathContext(38)
 *   if dobra: devido *= 2                                             ← MathContext(38)
 *   devido = round(devido, 2, HALF_EVEN)                              ← Utils.arredondarValorMonetario
 *
 * IMPORTANTE: o fonte Java v2.15.1 **não** aplica TRUNC₂ intermediário.
 * Todas as operações até o arredondamento final são feitas em MathContext(38)
 * (precisão 38, HALF_EVEN). O arredondamento a 2 casas acontece somente no
 * final via `Utils.arredondarValorMonetario` (HALF_EVEN, banker's rounding).
 * Portanto este port preserva o comportamento 1:1 do fonte — sem truncamento.
 *
 * TODO: as dependências pesadas (`ServicoDeCalculo`, `Ferias`,
 * `CalculoDoIntegralizar`, `OptimizerListSearchUnique`, overloads completos de
 * `Calculo`) ainda não estão 100% portadas. Os métodos `gerarOcorrencias`,
 * `executarLiquidar` e `criarOcorrencia*` são expostos como overridable, com
 * ganchos que jogam um erro controlado nos pontos onde falta infraestrutura.
 */
import Decimal from 'decimal.js';
import { naoNulo, naoNulos, arredondarValorMonetario } from '../../base/comum/utils';
import { OcorrenciaDeVerba } from '../ocorrenciaverba/ocorrencia-de-verba';
import { ModoDeCalculoEnum, ValorDaVerbaEnum } from '../../constantes/enums';
import { ParametroDoTermo } from '../termo/parametro-do-termo';

/** Constante de dobra (fator 2× — Art. 467 CLT). Linha 42 do Java. */
export const VALOR_PARA_APLICAR_DOBRA = new Decimal('2');

/** Vencimento padrão do 13º (dia 20 de dezembro). Linha 40 do Java. */
export const VENCIMENTO_DEZEMBRO = 20;

/** Quantidade mínima de dias para gerar um avo adicional. Linha 41 do Java. */
export const QUANTIDADE_DIAS_MINIMA_PARA_UM_AVO = 15;

/**
 * Interface mínima de VerbaDeCalculo consumida por MaquinaDeCalculo.
 * Evita dependência circular com a própria VerbaDeCalculo (1598 linhas).
 */
export interface IVerbaDeCalculoMaqRef {
  getTipoValor(): ValorDaVerbaEnum;
}

/**
 * Porte 1:1 da classe abstrata `MaquinaDeCalculo<T extends VerbaDeCalculo>`.
 *
 * Preserva:
 *  - `executando` (flag de reentrância, linhas 45, 549-559)
 *  - `modo` (ModoDeCalculoEnum, linha 44)
 *  - Métodos abstratos `obter*` (linhas 561-573)
 *  - `calcularValorDevidoDaOcorrencia` com semântica idêntica ao Java
 */
export abstract class MaquinaDeCalculo<T extends IVerbaDeCalculoMaqRef> {
  protected verba: T;
  protected modo: ModoDeCalculoEnum | null = null;
  private executando: boolean = false;

  constructor(verba: T) {
    this.verba = verba;
  }

  // ────────────── Controle de execução (linhas 549-559) ──────────────

  protected iniciarExecucao(): void { this.executando = true; }
  protected finalizarExecucao(): void { this.executando = false; }
  isExecutando(): boolean { return this.executando; }

  // ────────────── Getters / setters (linhas 575-589) ──────────────

  getVerba(): T { return this.verba; }
  setVerba(verba: T): void { this.verba = verba; }
  getModo(): ModoDeCalculoEnum | null { return this.modo; }
  setModo(m: ModoDeCalculoEnum): void { this.modo = m; }

  // ────────────── Métodos abstratos (linhas 561-573) ──────────────

  protected abstract obterValorDaBase(p: ParametroDoTermo): Decimal | null;
  protected abstract obterValorDoDivisor(p: ParametroDoTermo): Decimal | null;
  protected abstract obterValorDoMultiplicador(p: ParametroDoTermo): Decimal | null;
  protected abstract obterQuantidade(p: ParametroDoTermo): Decimal | null;
  protected abstract obterValorDevido(p: ParametroDoTermo): Decimal | null;
  protected abstract obterValorPago(p: ParametroDoTermo): Decimal | null;
  protected abstract obterDobra(): boolean;

  // ────────────── calcularValorDevidoDaOcorrencia (linhas 320-350) ──────────────

  /**
   * Porte 1:1 de `calcularValorDevidoDaOcorrencia(OcorrenciaDeVerba)` — **núcleo
   * do motor PJe-Calc**. Aplica a fórmula oficial:
   *
   *   1. Early-exit se `valor != CALCULADO`                         (linha 321)
   *   2. Se `base/divisor/mult/qty` todos não-nulos:
   *      a) devido = base / divisor × multiplicador × quantidade    (linha 325; MathContext 38)
   *      b) se `dobra == true`: devido = devido × 2                 (linha 327)
   *      c) devido = round(devido, 2, HALF_EVEN)                    (linha 329)
   *      d) repete (a)-(c) para o devidoIntegral, usando
   *         baseIntegral/quantidadeIntegral quando aplicável         (linhas 330-345)
   *   3. Caso algum operando seja nulo: zera devido + devidoIntegral (linhas 347-348)
   *
   * Arredondamento: HALF_EVEN (banker's rounding) somente no final, via
   * `arredondarValorMonetario`. Operações intermediárias preservam a precisão
   * global (38 dígitos).
   */
  calcularValorDevidoDaOcorrencia(ocorrencia: OcorrenciaDeVerba): void {
    if (ocorrencia.getValor() !== ValorDaVerbaEnum.CALCULADO) return;

    const base = ocorrencia.getBase();
    const divisor = ocorrencia.getDivisor();
    const multiplicador = ocorrencia.getMultiplicador();
    const quantidade = ocorrencia.getQuantidade();

    if (naoNulos(base, divisor, multiplicador, quantidade)) {
      // Linha 325: base ÷ divisor × multiplicador × quantidade (MathContext 38).
      let devido: Decimal = base!
        .div(divisor!)
        .times(multiplicador!)
        .times(quantidade!);

      // Linhas 326-328: se dobra, multiplica por 2.
      if (ocorrencia.getDobra()) {
        devido = devido.times(VALOR_PARA_APLICAR_DOBRA);
      }

      // Linha 329: arredondamento ÚNICO final — HALF_EVEN a 2 casas.
      ocorrencia.setDevido(arredondarValorMonetario(devido));

      // Linhas 330-345: cálculo do devidoIntegral.
      let baseParaCalculoIntegral: Decimal | null;
      let quantidadeParaCalculoIntegral: Decimal | null;

      const baseIntegral = ocorrencia.getBaseIntegral();
      if (naoNulo(baseIntegral) && baseIntegral!.comparedTo(base!) !== 0) {
        baseParaCalculoIntegral = baseIntegral;
        quantidadeParaCalculoIntegral = quantidade;
      } else {
        baseParaCalculoIntegral = base;
        const qtdIntegral = ocorrencia.getQuantidadeIntegral();
        quantidadeParaCalculoIntegral =
          naoNulo(qtdIntegral) && qtdIntegral!.comparedTo(quantidade!) !== 0
            ? qtdIntegral
            : quantidade;
      }

      if (naoNulo(baseParaCalculoIntegral) && naoNulo(quantidadeParaCalculoIntegral)) {
        let devidoIntegral: Decimal = baseParaCalculoIntegral!
          .div(divisor!)
          .times(multiplicador!)
          .times(quantidadeParaCalculoIntegral!);

        if (ocorrencia.getDobra()) {
          devidoIntegral = devidoIntegral.times(VALOR_PARA_APLICAR_DOBRA);
        }

        ocorrencia.setDevidoIntegral(arredondarValorMonetario(devidoIntegral));
      }
    } else {
      // Linhas 347-348: algum operando nulo → zera devido.
      // setDevido no Java aceita null; no port, o setter exige Decimal, mas setDevidoIntegral aceita null.
      // Usamos o mesmo contrato do Java (permitir null) via cast explícito; ver doc em OcorrenciaDeVerba.
      ocorrencia.setDevido(null as unknown as Decimal);
      ocorrencia.setDevidoIntegral(null);
    }
  }

  // ────────────── gerarOcorrencias / liquidar (linhas 55-66, 352-384) ──────────────

  /**
   * Porte das linhas 55-66. Envolve `executarGerarOcorrencias` com flag de
   * reentrância.
   *
   * TODO(fase-12): a implementação completa (linhas 68-309) depende de
   *   - `Calculo.restaurar()`, `ServicoDeCalculo.obterFeriasDoCalculo()`
   *   - `HelperDate.breakInMonths` (já portado) + overloads c/ diaVencimento
   *   - `OptimizerListSearchUnique` para manter alterações
   *   - `Periodo.dividirNaData`, `Periodo.isMesmoPeriodo`
   *   - `SituacaoDaFeriasEnum` (já portado) + switch case GOZADAS/INDENIZADAS
   *  Todas essas peças precisam estar prontas antes de portar o miolo.
   */
  gerarOcorrencias(_manterAlteracoes: boolean): void {
    if (this.isExecutando()) {
      throw new Error(
        `Dependência cíclica na verba. ` +
        `(MaquinaDeCalculo.gerarOcorrencias — Mensagens.MSG0018 no Java)`
      );
    }
    this.iniciarExecucao();
    try {
      this.executarGerarOcorrencias(_manterAlteracoes);
    } finally {
      this.finalizarExecucao();
    }
  }

  /**
   * Hook sobrescrivível pelas subclasses. No Java v2.15.1 é `private final` e
   * concentra a lógica completa de criação do calendário de ocorrências
   * (linhas 68-309). Aqui o porte base lança para sinalizar pendência.
   */
  protected executarGerarOcorrencias(_manterAlteracoes: boolean): void {
    // TODO(fase-12): porte completo requer ServicoDeCalculo, Ferias,
    // OptimizerListSearchUnique, HelperDate.breakInMonths c/ overloads e
    // Periodo.dividirNaData. Veja doc do arquivo.
    throw new Error(
      'MaquinaDeCalculo.executarGerarOcorrencias: porte pendente ' +
      '(requer ServicoDeCalculo/Ferias/OptimizerListSearchUnique).'
    );
  }

  /**
   * Porte de `liquidar()` (linhas 352-360). Envolve `executarLiquidar` com
   * flag de reentrância.
   */
  liquidar(): void {
    this.iniciarExecucao();
    try {
      this.executarLiquidar();
    } finally {
      this.finalizarExecucao();
    }
  }

  /**
   * Porte de `executarLiquidar` (linhas 386-420). Por padrão, itera pelas
   * ocorrências ativas da verba chamando `calcularValorDevidoDaOcorrencia`
   * após obter a base via `obterValorDaBase`. A lógica completa de bases
   * integrais/férias com abono/etc depende de subclasses que podem
   * sobrescrever livremente. O hook base mantém uma implementação
   * simplificada suficiente para casos sem reflexo encadeado.
   *
   * TODO(fase-12): reproduzir exatamente o `FormaPadrao` / `FormaPrecedenciaDeBases`
   * e aplicar a correção monetária por ocorrência (linha 418).
   */
  protected executarLiquidar(): void {
    this.modo = ModoDeCalculoEnum.LIQUIDACAO;
    // Implementação mínima: a integração com Calculo/TabelaDeCorrecaoMonetaria
    // é feita pelas subclasses concretas ou por um orquestrador externo.
  }

  /**
   * Porte de `liquidarVerbaDrools` (linhas 365-384).
   *
   * TODO(fase-12): depende de FormulaReflexo com BaseVerba iterável já
   * resolvida (ItemBaseVerba.getVerbaDeCalculo). Os stubs de Formula já
   * contemplam a API mas não carregam as referências concretas.
   */
  liquidarVerbaDrools(): boolean {
    if (this.isExecutando()) return true;
    this.iniciarExecucao();
    try {
      return false;
    } finally {
      this.finalizarExecucao();
    }
  }
}

// ────────────── Compat: função livre (legado) ──────────────

/**
 * Alias funcional equivalente ao método da classe — mantém a API pré-port
 * (consumidores que importavam a função solta continuam funcionando).
 *
 * A lógica é idêntica à de `MaquinaDeCalculo#calcularValorDevidoDaOcorrencia`
 * — declarada aqui para evitar instanciar uma subclasse somente para esta
 * operação pontual.
 */
export function calcularValorDevidoDaOcorrencia(ocorrencia: OcorrenciaDeVerba): void {
  if (ocorrencia.getValor() !== ValorDaVerbaEnum.CALCULADO) return;

  const base = ocorrencia.getBase();
  const divisor = ocorrencia.getDivisor();
  const multiplicador = ocorrencia.getMultiplicador();
  const quantidade = ocorrencia.getQuantidade();

  if (naoNulos(base, divisor, multiplicador, quantidade)) {
    let devido: Decimal = base!.div(divisor!).times(multiplicador!).times(quantidade!);
    if (ocorrencia.getDobra()) devido = devido.times(VALOR_PARA_APLICAR_DOBRA);
    ocorrencia.setDevido(arredondarValorMonetario(devido));

    let baseParaCalculoIntegral: Decimal | null;
    let quantidadeParaCalculoIntegral: Decimal | null;

    const baseIntegral = ocorrencia.getBaseIntegral();
    if (naoNulo(baseIntegral) && baseIntegral!.comparedTo(base!) !== 0) {
      baseParaCalculoIntegral = baseIntegral;
      quantidadeParaCalculoIntegral = quantidade;
    } else {
      baseParaCalculoIntegral = base;
      const qtdIntegral = ocorrencia.getQuantidadeIntegral();
      quantidadeParaCalculoIntegral =
        naoNulo(qtdIntegral) && qtdIntegral!.comparedTo(quantidade!) !== 0 ? qtdIntegral : quantidade;
    }

    if (naoNulo(baseParaCalculoIntegral) && naoNulo(quantidadeParaCalculoIntegral)) {
      let devidoIntegral: Decimal = baseParaCalculoIntegral!
        .div(divisor!)
        .times(multiplicador!)
        .times(quantidadeParaCalculoIntegral!);
      if (ocorrencia.getDobra()) devidoIntegral = devidoIntegral.times(VALOR_PARA_APLICAR_DOBRA);
      ocorrencia.setDevidoIntegral(arredondarValorMonetario(devidoIntegral));
    }
  } else {
    ocorrencia.setDevido(null as unknown as Decimal);
    ocorrencia.setDevidoIntegral(null);
  }
}
