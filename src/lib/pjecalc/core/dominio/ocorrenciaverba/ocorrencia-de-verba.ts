/**
 * PJe-Calc v2.15.1 — OcorrenciaDeVerba
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/ocorrenciaverba/OcorrenciaDeVerba.java
 *
 * Representa uma ocorrência mensal de uma verba, com os componentes da fórmula
 * (base, divisor, multiplicador, quantidade, dobra), valores apurados (devido,
 * pago, diferença) e correção monetária (indiceAcumulado, diferencaCorrigida).
 *
 * Para evitar dependência circular com VerbaDeCalculo (1598 linhas, ainda não portada),
 * usamos interface `IVerbaDeCalculoRef` com o subset de campos/métodos acessados
 * pela OcorrenciaDeVerba. A implementação real de VerbaDeCalculo satisfaz essa interface.
 */
import Decimal from 'decimal.js';
import { Periodo } from '../../base/comum/periodo';
import { nulo, naoNulo, naoNulos, subtrair, dividir } from '../../base/comum/utils';
import { CaracteristicaDaVerbaEnum, LogicoEnum, OcorrenciaDePagamentoEnum, ValorDaVerbaEnum } from '../../constantes/enums';

// Constantes
const ATRIBUTO_QUANTIDADE = 1;
const ATRIBUTO_PAGO = 2;
const ATRIBUTO_DEVIDO = 3;
const FATOR_ABONO_PADRAO = new Decimal('1.5');

/**
 * Interface mínima para referência a VerbaDeCalculo (subset usado por OcorrenciaDeVerba).
 * Evita dep circular. VerbaDeCalculo (ainda a ser portada) implementa isso.
 */
export interface IVerbaDeCalculoRef {
  getTipoValor(): ValorDaVerbaEnum;
  getZeraValorNegativo(): boolean;
  // getCalculo().getListaDeFerias() usado em calcularFatorAbono; simplificado
  getListaDeFerias?(): IFeriasRef[];
}

export interface IFeriasRef {
  getPeriodoAquisitivo(): Periodo | null;
  getPrazo(): number;
  getQuantidadeDiasAbono(): number;
}

export { ATRIBUTO_QUANTIDADE, ATRIBUTO_PAGO, ATRIBUTO_DEVIDO };

export class OcorrenciaDeVerba {
  // Componentes da fórmula
  private dataInicial: Date | null = null;
  private dataFinal: Date | null = null;
  private divisor: Decimal | null = null;
  private multiplicador: Decimal | null = null;
  private quantidade: Decimal | null = null;
  private quantidadeIntegral: Decimal | null = null;
  private dobra: boolean = false;

  // Valores apurados
  private devidoNaTelaDeOcorrencias: Decimal | null = null;
  private devido: Decimal | null = null;
  private devidoIntegral: Decimal | null = null;
  private pago: Decimal | null = null;
  private pagoIntegral: Decimal | null = null;
  private base: Decimal | null = null;
  private baseIntegral: Decimal | null = null;

  // Metadata
  private verbaDeCalculo: IVerbaDeCalculoRef | null = null;
  private ativo: boolean = true;
  private ocorrenciaOriginal: OcorrenciaDeVerba | null = null;
  private valor: ValorDaVerbaEnum = ValorDaVerbaEnum.CALCULADO;
  private comporPrincipal: LogicoEnum = LogicoEnum.NAO;
  private dataInicialPeriodoAquisitivo: Date | null = null;
  private dataFinalPeriodoAquisitivo: Date | null = null;
  private feriasIndenizadas: boolean = false;
  private feriasComAbono: boolean = false;

  // Correção (transient)
  private indiceAcumulado: Decimal | null = null;
  private indiceAcumuladoAtualizacao: Decimal = new Decimal(1);

  // Características
  private caracteristica: CaracteristicaDaVerbaEnum = CaracteristicaDaVerbaEnum.COMUM;
  private ocorrenciaDePagamento: OcorrenciaDePagamentoEnum = OcorrenciaDePagamentoEnum.MENSAL;
  private selecionada: boolean = false;

  // ────────────── Estado (linhas 187-193) ──────────────
  isValorCalculado(): boolean { return this.valor === ValorDaVerbaEnum.CALCULADO; }
  isValorInformado(): boolean { return this.valor === ValorDaVerbaEnum.INFORMADO; }

  // ────────────── Getters / Setters simples ──────────────
  getDataInicial(): Date | null { return this.dataInicial; }
  setDataInicial(d: Date): void { this.dataInicial = d; }
  getDataFinal(): Date | null { return this.dataFinal; }
  setDataFinal(d: Date): void { this.dataFinal = d; }

  getDivisor(): Decimal | null { return this.divisor; }
  setDivisor(d: Decimal): void { this.divisor = d; }

  getMultiplicador(): Decimal | null { return this.multiplicador; }
  setMultiplicador(m: Decimal): void { this.multiplicador = m; }

  getQuantidade(): Decimal | null { return this.quantidade; }
  /** setQuantidade (linha 342): se diferente do atual, zera quantidadeIntegral */
  setQuantidade(q: Decimal): void {
    if (naoNulo(this.quantidade) && !this.quantidade!.equals(q)) {
      this.quantidadeIntegral = null;
    }
    this.quantidade = q;
  }
  getQuantidadeIntegral(): Decimal | null { return this.quantidadeIntegral; }
  setQuantidadeIntegral(q: Decimal | null): void { this.quantidadeIntegral = q; }

  getDobra(): boolean { return this.dobra; }
  setDobra(d: boolean): void { this.dobra = d; }

  getBase(): Decimal | null { return this.base; }
  setBase(b: Decimal): void { this.base = b; }
  getBaseIntegral(): Decimal | null { return this.baseIntegral; }
  setBaseIntegral(b: Decimal): void { this.baseIntegral = b; }

  getDevidoNaTelaDeOcorrencias(): Decimal | null { return this.getDevido(); }
  getValorRealDoDevidoNaTelaDeOcorrencias(): Decimal | null { return this.devidoNaTelaDeOcorrencias; }
  setDevidoNaTelaDeOcorrencias(v: Decimal): void { this.devidoNaTelaDeOcorrencias = v; }

  getDevido(): Decimal | null { return this.devido; }
  /** setDevido (linha 373): seta também devidoNaTelaDeOcorrencias */
  setDevido(devido: Decimal): void {
    this.devido = devido;
    this.devidoNaTelaDeOcorrencias = devido;
  }

  getDevidoIntegral(): Decimal | null {
    if (nulo(this.devidoIntegral) && naoNulo(this.devido)) {
      this.devidoIntegral = this.integraliza(this.devido!);
    }
    if (naoNulo(this.devidoIntegral) && naoNulo(this.devido)
        && this.devidoIntegral!.equals(0) && !this.devido!.equals(0)) {
      this.devidoIntegral = this.integraliza(this.devido!);
    }
    return this.devidoIntegral;
  }
  setDevidoIntegral(d: Decimal | null): void { this.devidoIntegral = d; }

  getPago(): Decimal | null { return this.pago; }
  setPago(p: Decimal): void {
    if (naoNulo(this.pago) && !this.pago!.equals(p)) {
      this.pagoIntegral = null;
    }
    this.pago = p;
  }
  getPagoIntegral(): Decimal | null {
    if (nulo(this.pagoIntegral) && naoNulo(this.pago)) {
      this.pagoIntegral = this.integraliza(this.pago!);
    }
    if (naoNulo(this.pagoIntegral) && naoNulo(this.pago)
        && this.pagoIntegral!.equals(0) && !this.pago!.equals(0)) {
      this.pagoIntegral = this.integraliza(this.pago!);
    }
    return this.pagoIntegral;
  }
  setPagoIntegral(p: Decimal | null): void { this.pagoIntegral = p; }

  getVerbaDeCalculo(): IVerbaDeCalculoRef | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: IVerbaDeCalculoRef): void { this.verbaDeCalculo = v; }

  getAtivo(): boolean { return this.ativo; }
  setAtivo(a: boolean): void { this.ativo = a; }

  getValor(): ValorDaVerbaEnum { return this.valor; }
  setValor(v: ValorDaVerbaEnum): void { this.valor = v; }

  getComporPrincipal(): LogicoEnum { return this.comporPrincipal; }
  setComporPrincipal(c: LogicoEnum): void { this.comporPrincipal = c; }

  getOcorrenciaOriginal(): OcorrenciaDeVerba | null { return this.ocorrenciaOriginal; }
  setOcorrenciaOriginal(o: OcorrenciaDeVerba | null): void { this.ocorrenciaOriginal = o; }

  getDataInicialPeriodoAquisitivo(): Date | null { return this.dataInicialPeriodoAquisitivo; }
  setDataInicialPeriodoAquisitivo(d: Date | null): void { this.dataInicialPeriodoAquisitivo = d; }
  getDataFinalPeriodoAquisitivo(): Date | null { return this.dataFinalPeriodoAquisitivo; }
  setDataFinalPeriodoAquisitivo(d: Date | null): void { this.dataFinalPeriodoAquisitivo = d; }

  isFeriasIndenizadas(): boolean { return this.feriasIndenizadas; }
  setFeriasIndenizadas(v: boolean): void { this.feriasIndenizadas = v; }
  isFeriasComAbono(): boolean { return this.feriasComAbono; }
  setFeriasComAbono(v: boolean): void { this.feriasComAbono = v; }

  getIndiceAcumulado(): Decimal | null { return this.indiceAcumulado; }
  setIndiceAcumulado(i: Decimal | null): void { this.indiceAcumulado = i; }

  getIndiceAcumuladoAtualizacao(): Decimal { return this.indiceAcumuladoAtualizacao; }
  setIndiceAcumuladoAtualizacao(i: Decimal): void { this.indiceAcumuladoAtualizacao = i; }

  getCaracteristica(): CaracteristicaDaVerbaEnum { return this.caracteristica; }
  setCaracteristica(c: CaracteristicaDaVerbaEnum): void { this.caracteristica = c; }

  getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum { return this.ocorrenciaDePagamento; }
  setOcorrenciaDePagamento(o: OcorrenciaDePagamentoEnum): void { this.ocorrenciaDePagamento = o; }

  isSelecionada(): boolean { return this.selecionada; }
  setSelecionada(v: boolean): void { this.selecionada = v; }

  // ────────────── Derivações críticas ──────────────

  /**
   * getDiferenca (linha 382) — devido - pago, zerado se ativo=false ou se
   * negativo + verba.zeraValorNegativo=true.
   *
   * IMPORTANTE: mantém CONTEXTO_MATEMATICO(38) — sem arredondamento a 2 casas aqui!
   * O arredondamento final é feito apenas quando o valor é exibido/contabilizado.
   */
  getDiferenca(): Decimal {
    if (!this.ativo) return new Decimal(0);
    let diferenca = new Decimal(0);
    if (naoNulos(this.devido, this.pago)) {
      diferenca = this.devido!.minus(this.pago!);
    }
    if (diferenca.isNegative() && this.verbaDeCalculo?.getZeraValorNegativo()) {
      diferenca = new Decimal(0);
    }
    return diferenca;
  }

  /**
   * getDiferencaCorrigida (linha 396) — diferença × indiceAcumulado.
   * Retorna null se indiceAcumulado não estiver setado.
   */
  getDiferencaCorrigida(): Decimal | null {
    const diferenca = this.getDiferenca();
    if (!naoNulos(diferenca, this.indiceAcumulado)) return null;
    return this.indiceAcumulado!.times(diferenca);
  }

  getDiferencaCorrigidaParaAtualizacao(): Decimal | null {
    const diferenca = this.getDiferenca();
    if (!naoNulos(diferenca, this.indiceAcumuladoAtualizacao)) return null;
    return this.indiceAcumuladoAtualizacao.times(diferenca);
  }

  /** getDiferencaIntegral (linha 412) — mesma lógica mas com valores integrais */
  getDiferencaIntegral(): Decimal {
    if (!this.ativo) return new Decimal(0);
    let diferenca = new Decimal(0);
    const di = this.getDevidoIntegral();
    const pi = this.getPagoIntegral();
    if (naoNulos(di, pi)) {
      diferenca = di!.minus(pi!);
    }
    if (diferenca.isNegative() && this.verbaDeCalculo?.getZeraValorNegativo()) {
      diferenca = new Decimal(0);
    }
    return diferenca;
  }

  getDiferencaIntegralCorrigida(): Decimal | null {
    const diferenca = this.getDiferencaIntegral();
    if (!naoNulos(diferenca, this.indiceAcumulado)) return null;
    return this.indiceAcumulado!.times(diferenca);
  }

  // ────────────── Helpers ──────────────

  /** getPeriodo (linha 704) */
  getPeriodo(): Periodo {
    return new Periodo(this.getDataInicial(), this.getDataFinal());
  }

  /**
   * integraliza — extrapola valor proporcional para valor integral (mês completo).
   * Delega para CalculoDoIntegralizar (já portado):
   *   resultado = valor × diasNoMes / diasDoPeriodo
   */
  integraliza(valor: Decimal): Decimal {
    if (!this.dataInicial || !this.dataFinal) return valor;
    const { CalculoDoIntegralizar } = require('../../comum/rotinasdecalculo/calculo-do-integralizar');
    const calc = new CalculoDoIntegralizar(this.getPeriodo(), valor, 0);
    calc.executar();
    return calc.getResultado();
  }

  /**
   * calcularFatorAbono (linha 773) — fator para férias com abono.
   * Default: 1.5 (30 dias ÷ 20 dias pós-abono).
   * Se houver Ferias.prazo e Ferias.quantidadeDiasAbono específicos, usa-os.
   */
  calcularFatorAbono(): Decimal {
    if (!naoNulos(this.dataInicialPeriodoAquisitivo, this.dataFinalPeriodoAquisitivo)) {
      return FATOR_ABONO_PADRAO;
    }
    const periodoAquisitivoFerias = new Periodo(
      this.dataInicialPeriodoAquisitivo!, this.dataFinalPeriodoAquisitivo!
    );
    const listaDeFerias = this.verbaDeCalculo?.getListaDeFerias?.() ?? [];
    for (const ferias of listaDeFerias) {
      const pa = ferias.getPeriodoAquisitivo();
      if (!pa) continue;
      if (periodoAquisitivoFerias.isDatasCoincidentesCom(pa)) {
        const prazo = new Decimal(ferias.getPrazo());
        const diasAbono = new Decimal(ferias.getQuantidadeDiasAbono());
        return dividir(prazo, subtrair(prazo, diasAbono)!)!;
      }
    }
    return FATOR_ABONO_PADRAO;
  }

  /** compareTo (linha 596) — ordena por dataInicial */
  compareTo(o: OcorrenciaDeVerba): number {
    if (!this.dataInicial || !o.dataInicial) return 0;
    return this.dataInicial.getTime() - o.dataInicial.getTime();
  }

  /** clone — cópia rasa */
  clone(): OcorrenciaDeVerba {
    const c = new OcorrenciaDeVerba();
    c.dataInicial = this.dataInicial;
    c.dataFinal = this.dataFinal;
    c.divisor = this.divisor;
    c.multiplicador = this.multiplicador;
    c.quantidade = this.quantidade;
    c.quantidadeIntegral = this.quantidadeIntegral;
    c.dobra = this.dobra;
    c.devido = this.devido;
    c.devidoNaTelaDeOcorrencias = this.devidoNaTelaDeOcorrencias;
    c.devidoIntegral = this.devidoIntegral;
    c.pago = this.pago;
    c.pagoIntegral = this.pagoIntegral;
    c.base = this.base;
    c.baseIntegral = this.baseIntegral;
    c.verbaDeCalculo = this.verbaDeCalculo;
    c.ativo = this.ativo;
    c.valor = this.valor;
    c.comporPrincipal = this.comporPrincipal;
    c.dataInicialPeriodoAquisitivo = this.dataInicialPeriodoAquisitivo;
    c.dataFinalPeriodoAquisitivo = this.dataFinalPeriodoAquisitivo;
    c.feriasIndenizadas = this.feriasIndenizadas;
    c.feriasComAbono = this.feriasComAbono;
    c.indiceAcumulado = this.indiceAcumulado;
    c.indiceAcumuladoAtualizacao = this.indiceAcumuladoAtualizacao;
    c.caracteristica = this.caracteristica;
    c.ocorrenciaDePagamento = this.ocorrenciaDePagamento;
    return c;
  }
}
