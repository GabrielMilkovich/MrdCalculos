/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculo (classe abstrata raiz).
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo
 * (Java ~617 linhas).
 *
 * Responsabilidades: calcularValorDevidoDaOcorrencia, gerarOcorrencias/
 * executarGerarOcorrencias, liquidar/executarLiquidar, criarOcorrenciaComPeriodoAquisitivo
 * (5 overloads) e métodos abstratos `obter*` implementados pelas subclasses.
 *
 * Fórmula OFICIAL do devido (Java 325-329):
 *   devido = round₂ᴴᴱ(base/divisor × multiplicador × quantidade × [dobra?2])
 * Operações intermediárias em MathContext(38); arredondamento final HALF_EVEN.
 *
 * TODO(fase-13): PERIODO_AQUISITIVO depende de Ferias/prescrição quinquenal;
 * `diasParaExcluir` em criarOcorrencia depende de Calculo.obterDiasFerias.
 */
import Decimal from 'decimal.js';
import { naoNulo, naoNulos, nulos, arredondarValorMonetario } from '../../base/comum/utils';
import { OcorrenciaDeVerba, type IVerbaDeCalculoRef } from '../ocorrenciaverba/ocorrencia-de-verba';
import {
  CaracteristicaDaVerbaEnum,
  FaseDoCalculoEnum,
  LogicoEnum,
  ModoDeCalculoEnum,
  OcorrenciaDePagamentoEnum,
  ValorDaVerbaEnum,
} from '../../constantes/enums';
import { ParametroDoTermo } from '../termo/parametro-do-termo';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';

/** Interface minimal para `Calculo` acessado pela MaquinaDeCalculo (evita ciclo).  */
export interface ICalculoMaqRef {
  getDataDemissao?(): Date | null;
  getDataAdmissao?(): Date;
  getProjetaAvisoIndenizado?(): boolean;
  obterQuantidadeAdicionalAvisoPrevio?(): number;
}

/** Constante de dobra (fator 2× — Art. 467 CLT). Linha 42 do Java. */
export const VALOR_PARA_APLICAR_DOBRA = new Decimal('2');

/** Vencimento padrão do 13º (dia 20 de dezembro). Linha 40 do Java. */
export const VENCIMENTO_DEZEMBRO = 20;

/** Quantidade mínima de dias para gerar um avo adicional. Linha 41 do Java. */
export const QUANTIDADE_DIAS_MINIMA_PARA_UM_AVO = 15;

/** Interface mínima de VerbaDeCalculo consumida por MaquinaDeCalculo (evita ciclo). */
export interface IVerbaDeCalculoMaqRef extends IVerbaDeCalculoRef {
  getTipoValor(): ValorDaVerbaEnum;
  getPeriodoInicial?(): Date | null;
  getPeriodoFinal?(): Date | null;
  getOcorrenciaDePagamento?(): OcorrenciaDePagamentoEnum;
  getCaracteristica?(): CaracteristicaDaVerbaEnum;
  getComporPrincipal?(): LogicoEnum;
  /** Lista mutável de ocorrências, manipulada no `executarGerarOcorrencias`. */
  getOcorrencias?(): OcorrenciaDeVerba[];
  getOcorrenciasAtivas?(): OcorrenciaDeVerba[];
  setOcorrencias?(v: OcorrenciaDeVerba[]): void;
  /** Tabela de correção, usada em `executarLiquidar` para setar indiceAcumulado. */
  getTabelaDeCorrecaoMonetariaTrabalhista?(): {
    setOcorrenciaDePagamento?(o: OcorrenciaDePagamentoEnum): void;
    obterValorAcumuladoDoIndice(data: Date): Decimal;
  } | null;
  /** Calculo host — necessário para ParametroDoTermo nas subclasses concretas. */
   
  getCalculo?(): any;
}

/** Porte 1:1 de `MaquinaDeCalculo<T extends VerbaDeCalculo>` (abstrata). */
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

  /**
   * Porte 1:1 de `calcularValorDevidoDaOcorrencia` (Java 320-350) — núcleo do motor.
   * Fórmula: devido = round₂ᴴᴱ(base/divisor × mult × qty × [dobra?2]); idem para devidoIntegral.
   * Operandos nulos → devido/devidoIntegral = null.
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

  /** gerarOcorrencias (Java 55-66). Envolve `executarGerarOcorrencias` com flag de reentrância. */
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
   * Porte de `executarGerarOcorrencias` (Java 68-309). Cobre MENSAL, DESLIGAMENTO,
   * DEZEMBRO 1:1; PERIODO_AQUISITIVO lança TODO (depende de Ferias).
   * Divergência: `manterAlteracoes`/OptimizerListSearchUnique é no-op aqui.
   */
  protected executarGerarOcorrencias(_manterAlteracoes: boolean): void {
    const verba = this.verba;
    const piGet = verba.getPeriodoInicial?.bind(verba);
    const pfGet = verba.getPeriodoFinal?.bind(verba);
    const periodoInicial = piGet ? piGet() : null;
    const periodoFinal = pfGet ? pfGet() : null;
    if (nulos(periodoInicial, periodoFinal)) {
      throw new Error(
        'MaquinaDeCalculo.gerarOcorrencias: Período inicial ou final em branco ' +
        '(Mensagens.MSG0018).'
      );
    }
    this.modo = ModoDeCalculoEnum.GERACAO_DE_OCORRENCIA;
    // Limpa ocorrências existentes (Java linha 79).
    verba.setOcorrencias?.([]);

    const ocPgto = verba.getOcorrenciaDePagamento?.() ?? OcorrenciaDePagamentoEnum.MENSAL;

    if (ocPgto === OcorrenciaDePagamentoEnum.MENSAL) {
      // Java 113-117
      const periodos = HelperDate.breakInMonths(periodoInicial!, periodoFinal!);
      for (const periodo of periodos) {
        this.criarOcorrencia(periodo);
      }
      return;
    }

    if (ocPgto === OcorrenciaDePagamentoEnum.DESLIGAMENTO) {
      // Java 81-112
      const calculo = verba.getCalculo?.() as ICalculoMaqRef | undefined;
      const dataDemissaoRaw = calculo?.getDataDemissao?.() ?? null;
      if (!dataDemissaoRaw) return;
      const dataDemissao = HelperDate.getInstance(dataDemissaoRaw)!;
      const caracteristica = verba.getCaracteristica?.() ?? CaracteristicaDaVerbaEnum.COMUM;

      if (HelperDate.dateBeforeOrEquals(dataDemissao.getDate(), periodoFinal!)) {
        let dataInicial: HelperDate | null = null;
        if (caracteristica === CaracteristicaDaVerbaEnum.COMUM) {
          dataInicial = HelperDate.getInstance(dataDemissao.getDate())!;
          dataInicial.setDay(1);
          if (HelperDate.dateAfter(periodoInicial!, dataInicial.getDate())) {
            dataInicial = HelperDate.getInstance(periodoInicial!)!;
          }
        } else if (caracteristica === CaracteristicaDaVerbaEnum.AVISO_PREVIO) {
          dataInicial = HelperDate.getInstance(dataDemissao.getDate())!;
        }
        if (dataInicial) {
          const dataFinalHelper = HelperDate.getInstance(dataDemissao.getDate())!;
          this.criarOcorrencia(new Periodo(dataInicial.getDate(), dataFinalHelper.getDate()));
        }
      } else if (
        HelperDate.getInstance(periodoFinal!)!.compareMonthAndYear(dataDemissao.getDate())
        && caracteristica === CaracteristicaDaVerbaEnum.COMUM
      ) {
        const dataInicial = HelperDate.getInstance(dataDemissao.getDate())!;
        dataInicial.setDay(1);
        const ini = HelperDate.dateAfter(periodoInicial!, dataInicial.getDate())
          ? HelperDate.getInstance(periodoInicial!)!.getDate()
          : dataInicial.getDate();
        this.criarOcorrencia(new Periodo(ini, HelperDate.getInstance(periodoFinal!)!.getDate()));
      }
      return;
    }

    if (ocPgto === OcorrenciaDePagamentoEnum.DEZEMBRO) {
      // Java 215-264 — 13º salário (vencimento 20/dez).
      const calculo = verba.getCalculo?.() as ICalculoMaqRef | undefined;
      const dataDemissaoRaw = calculo?.getDataDemissao?.() ?? null;
      const dataDemissao = dataDemissaoRaw ? HelperDate.getInstance(dataDemissaoRaw)! : null;
      const dataDeFimDoCalculo = HelperDate.getInstance(periodoFinal!)!;
      const setPeriodoDia = (p: Periodo, dia: number): Periodo => {
        p.setInicial(HelperDate.getInstance(p.getInicial())!.setDay(dia).getDate());
        p.setFinal(HelperDate.getInstance(p.getFinal())!.setDay(dia).getDate());
        return p;
      };
      // breakInMonths filtrado apenas para dezembro (mês 11).
      const periodos = HelperDate.breakInMonthsSelected(periodoInicial!, periodoFinal!, 11);
      for (const periodo of periodos) {
        const diaIni = HelperDate.getInstance(periodo.getInicial())!.getDay();
        const diaFim = HelperDate.getInstance(periodo.getFinal())!.getDay();
        if (
          naoNulo(dataDemissao)
          && dataDeFimDoCalculo.compareMonthAndYear(dataDemissao!.getDate())
          && HelperDate.getInstance(periodo.getFinal())!.compareMonthAndYear(dataDemissao!.getDate())
        ) {
          if (dataDemissao!.getDay() > VENCIMENTO_DEZEMBRO && diaIni <= VENCIMENTO_DEZEMBRO) {
            this.criarOcorrencia(setPeriodoDia(periodo, VENCIMENTO_DEZEMBRO));
            if (!calculo?.getProjetaAvisoIndenizado?.()) continue;
            this.criarOcorrencia(setPeriodoDia(periodo, dataDemissao!.getDay()));
            continue;
          }
          this.criarOcorrencia(setPeriodoDia(periodo, dataDemissao!.getDay()));
          continue;
        }
        // Casos sem demissão no mês: só gera se 20/dez está contido no período.
        if (diaIni === 1 && diaFim === 31) { this.criarOcorrencia(setPeriodoDia(periodo, VENCIMENTO_DEZEMBRO)); continue; }
        if (diaIni === 1 && diaFim >= VENCIMENTO_DEZEMBRO) { this.criarOcorrencia(setPeriodoDia(periodo, VENCIMENTO_DEZEMBRO)); continue; }
        if (diaFim === 31 && diaIni <= VENCIMENTO_DEZEMBRO) { this.criarOcorrencia(setPeriodoDia(periodo, VENCIMENTO_DEZEMBRO)); continue; }
        if (diaIni <= VENCIMENTO_DEZEMBRO && diaFim >= VENCIMENTO_DEZEMBRO) {
          this.criarOcorrencia(setPeriodoDia(periodo, VENCIMENTO_DEZEMBRO));
        }
      }
      if (
        naoNulo(dataDemissao)
        && dataDeFimDoCalculo.compareMonthAndYear(dataDemissao!.getDate())
        && dataDemissao!.getMonth() !== 11
      ) {
        this.criarOcorrencia(new Periodo(dataDemissao!.getDate(), dataDemissao!.getDate()));
      }
      return;
    }

    if (ocPgto === OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO) {
      // TODO(fase-13): porte completo exige Ferias (situação GOZADAS/INDENIZADAS),
      // prescrição quinquenal, `verificarFaltaQueReiniciePeriodoAquisitivo` e
      // `Calculo.encontrarFaltasQueReiniciamFerias`. Ver Java 118-214.
      throw new Error(
        'MaquinaDeCalculo.executarGerarOcorrencias: PERIODO_AQUISITIVO ainda ' +
        'não portado (depende de Ferias e prescrição quinquenal). Ver TODO(fase-13).'
      );
    }
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
   * Porte de `executarLiquidar` (Java 386-420). Para cada ocorrência ativa:
   * obtém base (via `obterValorDaBase`), aplica fator de abono se `isFeriasComAbono`,
   * arredonda, chama `calcularValorDevidoDaOcorrencia` e seta `indiceAcumulado`.
   */
  protected executarLiquidar(): void {
    this.modo = ModoDeCalculoEnum.LIQUIDACAO;
    const verba = this.verba;
    // Tabela de correção (opcional: quando presente, registra ocorrência de pagamento).
    const tabela = verba.getTabelaDeCorrecaoMonetariaTrabalhista?.() ?? null;
    if (tabela) {
      tabela.setOcorrenciaDePagamento?.(
        verba.getOcorrenciaDePagamento?.() ?? OcorrenciaDePagamentoEnum.MENSAL,
      );
    }
    const ocorrenciasAtivas = verba.getOcorrenciasAtivas?.() ?? [];

    const calculo = verba.getCalculo?.();
    // ParametroDoTermo é construído diretamente apenas quando há `calculo`/`verba`
    // concretas (fase atual de integração — subclasses podem sobrescrever).
    // Em cenários sem Calculo, caímos num caminho mínimo: sem base/índice.
     
    const parametro: ParametroDoTermo | null = calculo
       
      ? new ParametroDoTermo(calculo as any, verba as any, null,
          this.modo, FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO, null, null)
      : null;

    for (const ocorrencia of ocorrenciasAtivas) {
      if (parametro) {
        parametro.setValorIntegral(null);
        const periodoOc = new Periodo(ocorrencia.getDataInicial()!, ocorrencia.getDataFinal()!);
        parametro.setPeriodo(periodoOc);
        const periodoAq = new Periodo(
          ocorrencia.getDataInicialPeriodoAquisitivo(),
          ocorrencia.getDataFinalPeriodoAquisitivo(),
        );
        parametro.setPeriodoAquisitivo(periodoAq);
        parametro.setFeriasIndenizadas(ocorrencia.isFeriasIndenizadas());

        let valorDaBase = this.obterValorDaBase(parametro);
        let valorDaBaseIntegral: Decimal | null = null;
        if (parametro.isProporcionalizado()) {
          valorDaBaseIntegral = parametro.getValorIntegral();
        }
        // Java 408-414: fator de abono em férias com abono.
        if (
          ocorrencia.isFeriasComAbono()
          && ocorrencia.getVerbaDeCalculo()?.getTipoValor() === ValorDaVerbaEnum.CALCULADO
        ) {
          const fatorAbono = ocorrencia.calcularFatorAbono();
          if (naoNulo(valorDaBase)) {
            valorDaBase = valorDaBase!.times(fatorAbono);
          }
          if (naoNulo(valorDaBaseIntegral)) {
            valorDaBaseIntegral = valorDaBaseIntegral!.times(fatorAbono);
          }
        }
        if (naoNulo(valorDaBase)) {
          ocorrencia.setBase(arredondarValorMonetario(valorDaBase!));
        }
        if (naoNulo(valorDaBaseIntegral)) {
          ocorrencia.setBaseIntegral(arredondarValorMonetario(valorDaBaseIntegral!));
        }
      }
      // Recalcula devido/devidoIntegral usando a fórmula oficial (Java 417).
      this.calcularValorDevidoDaOcorrencia(ocorrencia);
      // Java 418: índice acumulado para correção monetária.
      if (tabela && ocorrencia.getDataInicial()) {
        ocorrencia.setIndiceAcumulado(tabela.obterValorAcumuladoDoIndice(ocorrencia.getDataInicial()!));
      }
    }
  }

  /** Overload 0 (Java 422-424). */
  protected criarOcorrencia(periodo: Periodo): void {
    this.criarOcorrenciaComPeriodoAquisitivo(periodo, null);
  }

  /**
   * Overload canônico (Java 438-547). Os 3 overloads intermediários do Java
   * viram args opcionais aqui (TS não tem overloading real).
   * TODO(fase-13): `diasParaExcluir` (Java 459-474) depende de `Calculo.obterDiasFerias`.
   */
  protected criarOcorrenciaComPeriodoAquisitivo(
    periodo: Periodo,
    periodoAquisitivo: Periodo | null,
    dobraObrigatoria: boolean = false,
    ocorrenciaDeFeriasIndenizadas: boolean = false,
    ocorrenciaDeFeriasComAbono: boolean = false,
  ): void {
    const verba = this.verba;
    const calculo = verba.getCalculo?.();
    // Quando não há Calculo concreto, usa-se um parâmetro nulo: getters
    // abstratos podem lidar com esse modo (ou subclasses podem sobrescrever).
     
    const parametro: ParametroDoTermo | null = calculo
       
      ? new ParametroDoTermo(calculo as any, verba as any, periodo,
          this.modo ?? ModoDeCalculoEnum.LIQUIDACAO,
          FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO,
          periodoAquisitivo, null)
      : null;

    const oc = new OcorrenciaDeVerba();
    oc.setDataInicial(periodo.getInicial());
    oc.setDataFinal(periodo.getFinal());
    oc.setCaracteristica(verba.getCaracteristica?.() ?? CaracteristicaDaVerbaEnum.COMUM);
    oc.setOcorrenciaDePagamento(verba.getOcorrenciaDePagamento?.() ?? OcorrenciaDePagamentoEnum.MENSAL);
    oc.setComporPrincipal(verba.getComporPrincipal?.() ?? LogicoEnum.NAO);
    oc.setValor(verba.getTipoValor());

    if (parametro) {
      const base = this.obterValorDaBase(parametro);
      if (naoNulo(base)) oc.setBase(base!);
      const divisor = this.obterValorDoDivisor(parametro);
      if (naoNulo(divisor)) {
        oc.setDivisor(divisor!);
        if (new Decimal(0).comparedTo(divisor!) === 0) {
          oc.setAtivo(false);
        }
      }
      const multiplicador = this.obterValorDoMultiplicador(parametro);
      if (naoNulo(multiplicador)) oc.setMultiplicador(multiplicador!);

      const quantidade = this.obterQuantidade(parametro);
      if (naoNulo(quantidade)) {
        oc.setQuantidade(quantidade!);
        if (parametro.isProporcionalizado()) {
          oc.setQuantidadeIntegral(parametro.getValorIntegral());
          parametro.setValorIntegral(null);
        } else {
          // Sem exclusões no port atual → integral = proporcional.
          oc.setQuantidadeIntegral(quantidade!);
        }
      }

      const devido = this.obterValorDevido(parametro);
      if (naoNulo(devido)) {
        oc.setDevido(arredondarValorMonetario(devido!));
        if (parametro.isProporcionalizado()) {
          oc.setDevidoIntegral(parametro.getValorIntegral());
          parametro.setValorIntegral(null);
        } else {
          oc.setDevidoIntegral(arredondarValorMonetario(devido!));
        }
      }

      parametro.setFase(FaseDoCalculoEnum.CALCULANDO_VALOR_PAGO);
      const pago = this.obterValorPago(parametro);
      if (naoNulo(pago)) {
        oc.setPago(arredondarValorMonetario(pago!));
        if (parametro.isProporcionalizado()) {
          oc.setPagoIntegral(parametro.getValorIntegral());
          parametro.setValorIntegral(null);
        } else {
          oc.setPagoIntegral(arredondarValorMonetario(pago!));
        }
      }
    }

    oc.setDobra(this.obterDobra());
    if (dobraObrigatoria) oc.setDobra(true);

    if (periodoAquisitivo) {
      oc.setDataInicialPeriodoAquisitivo(periodoAquisitivo.getInicial());
      oc.setDataFinalPeriodoAquisitivo(periodoAquisitivo.getFinal());
    }
    oc.setFeriasIndenizadas(ocorrenciaDeFeriasIndenizadas);
    oc.setFeriasComAbono(ocorrenciaDeFeriasComAbono);
    oc.setVerbaDeCalculo(verba);
    // Java 543: recalcula usando a fórmula oficial (em modo CALCULADO).
    this.calcularValorDevidoDaOcorrencia(oc);
    const original = oc.clone();
    oc.setOcorrenciaOriginal(original);
    // Java 546: verba.adicionarEmOcorrencias(oc) — implementado como push à lista.
    const lista = verba.getOcorrencias?.();
    if (lista) lista.push(oc);
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
 * Alias funcional (mantém API pré-port). Usa uma subclasse anônima cujos
 * hooks abstratos retornam null — a operação `calcularValorDevidoDaOcorrencia`
 * só lê campos da ocorrência, então o estado dos hooks é indiferente.
 */
class _MaquinaCalculoDevido extends MaquinaDeCalculo<IVerbaDeCalculoMaqRef> {
  protected obterValorDaBase(): Decimal | null { return null; }
  protected obterValorDoDivisor(): Decimal | null { return null; }
  protected obterValorDoMultiplicador(): Decimal | null { return null; }
  protected obterQuantidade(): Decimal | null { return null; }
  protected obterValorDevido(): Decimal | null { return null; }
  protected obterValorPago(): Decimal | null { return null; }
  protected obterDobra(): boolean { return false; }
}

const _verbaNoop: IVerbaDeCalculoMaqRef = {
  getTipoValor: () => ValorDaVerbaEnum.CALCULADO,
  getZeraValorNegativo: () => false,
};
const _maquinaSingleton = new _MaquinaCalculoDevido(_verbaNoop);

export function calcularValorDevidoDaOcorrencia(ocorrencia: OcorrenciaDeVerba): void {
  _maquinaSingleton.calcularValorDevidoDaOcorrencia(ocorrencia);
}
