/**
 * PJe-Calc v2.15.1 — CreditosDoReclamante (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante
 *
 * Ref Java: pjecalc-fonte/.../pagamento/CreditosDoReclamante.java (~1916 linhas)
 *
 * Agrega os créditos do reclamante para um período (entre eventos de
 * atualização). Campos principais:
 *   - dataInicialPeriodo, dataFinalPeriodo, dataCriacao
 *   - Índices: indiceDeCorrecao, indiceDeCorrecaoParaJuros,
 *              indiceDeCorrecaoFgts, indiceDeCorrecaoPrevidenciaPrivada,
 *              indiceDeCorrecaoAcumulado
 *   - taxaDeJuros, taxaDeJurosFgts
 *   - Principal: valorPrincipal, devidoPrincipal, pagoPrincipal
 *   - Juros: devidoJuroDeMoraPrincipal, juroPrincipal, pagoJuroDeMoraPrincipal
 *   - FGTS: valorFgts, devidoFgts, pagoFgts, juroFgts, pagoJuroDeMoraFgts
 *   - Outros: valorPrevidenciaPrivada, valorDescontoInss
 *   - Proporções: proporcaoJurosTributavel, proporcaoPrincipalTributavel
 *
 * **Status**: stub estrutural — métodos de rateio de pensão/multa sobre juros
 * ficam como TODOs. A ProporcoesIrpf (Fase 7) consome `getValorPrincipal`,
 * `getJuroPrincipal`, `getPagoPrincipal`, `getDiferencaPrincipal`.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import type { Atualizacao } from './atualizacao';

const ZERO = new Decimal(0);

export class CreditosDoReclamante {
  private id: number | null = null;
  private versao: number = 0;
  private atualizacao: Atualizacao | null = null;
  private dataCriacao: Date | null = null;
  private dataInicialPeriodo: Date | null = null;
  private dataFinalPeriodo: Date | null = null;

  // Índices
  private indiceDeCorrecao: Decimal | null = null;
  private indiceDeCorrecaoParaJuros: Decimal | null = null;
  private indiceDeCorrecaoFgts: Decimal | null = null;
  private indiceDeCorrecaoPrevidenciaPrivada: Decimal | null = null;
  private indiceDeCorrecaoAcumulado: Decimal | null = null;
  private taxaDeJuros: Decimal | null = null;
  private taxaDeJurosFgts: Decimal | null = null;

  // Principal
  private valorPrincipal: Decimal = ZERO;
  private devidoPrincipal: Decimal = ZERO;
  private pagoPrincipal: Decimal = ZERO;
  private devidoJuroDeMoraPrincipal: Decimal = ZERO;
  private juroPrincipal: Decimal = ZERO;
  private pagoJuroDeMoraPrincipal: Decimal = ZERO;
  private devidoJuroDeMoraPrincipalPeriodoAtual: Decimal = ZERO;
  private pagoJuroDeMoraPrincipalPeriodoAtual: Decimal = ZERO;

  // FGTS
  private valorFgts: Decimal = ZERO;
  private devidoFgts: Decimal = ZERO;
  private pagoFgts: Decimal = ZERO;
  private juroFgts: Decimal = ZERO;
  private pagoJuroDeMoraFgts: Decimal = ZERO;
  private devidoJuroDeMoraFgtsPeriodoAtual: Decimal = ZERO;
  private pagoJuroDeMoraFgtsPeriodoAtual: Decimal = ZERO;

  // Deduções
  private valorPrevidenciaPrivada: Decimal = ZERO;
  private valorDescontoInss: Decimal = ZERO;

  // Proporções (tributável)
  private proporcaoJurosTributavel: Decimal = ZERO;
  private proporcaoPrincipalTributavel: Decimal = ZERO;

  private descritivoDeEventos: string | null = null;
  private calculo: Calculo | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getAtualizacao(): Atualizacao | null { return this.atualizacao; }
  setAtualizacao(a: Atualizacao | null): void { this.atualizacao = a; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataCriacao(): Date | null { return this.dataCriacao; }
  setDataCriacao(d: Date | null): void { this.dataCriacao = d; }

  getDataInicialPeriodo(): Date | null { return this.dataInicialPeriodo; }
  setDataInicialPeriodo(d: Date | null): void { this.dataInicialPeriodo = d; }

  getDataFinalPeriodo(): Date | null { return this.dataFinalPeriodo; }
  setDataFinalPeriodo(d: Date | null): void { this.dataFinalPeriodo = d; }

  getIndiceDeCorrecao(): Decimal | null { return this.indiceDeCorrecao; }
  setIndiceDeCorrecao(v: Decimal | null): void { this.indiceDeCorrecao = v; }

  getIndiceDeCorrecaoParaJuros(): Decimal | null { return this.indiceDeCorrecaoParaJuros; }
  setIndiceDeCorrecaoParaJuros(v: Decimal | null): void { this.indiceDeCorrecaoParaJuros = v; }

  getIndiceDeCorrecaoFgts(): Decimal | null { return this.indiceDeCorrecaoFgts; }
  setIndiceDeCorrecaoFgts(v: Decimal | null): void { this.indiceDeCorrecaoFgts = v; }

  getIndiceDeCorrecaoPrevidenciaPrivada(): Decimal | null { return this.indiceDeCorrecaoPrevidenciaPrivada; }
  setIndiceDeCorrecaoPrevidenciaPrivada(v: Decimal | null): void { this.indiceDeCorrecaoPrevidenciaPrivada = v; }

  getIndiceDeCorrecaoAcumulado(): Decimal | null { return this.indiceDeCorrecaoAcumulado; }
  setIndiceDeCorrecaoAcumulado(v: Decimal | null): void { this.indiceDeCorrecaoAcumulado = v; }

  getTaxaDeJuros(): Decimal | null { return this.taxaDeJuros; }
  setTaxaDeJuros(v: Decimal | null): void { this.taxaDeJuros = v; }

  getTaxaDeJurosFgts(): Decimal | null { return this.taxaDeJurosFgts; }
  setTaxaDeJurosFgts(v: Decimal | null): void { this.taxaDeJurosFgts = v; }

  getValorPrincipal(): Decimal { return this.valorPrincipal; }
  setValorPrincipal(v: Decimal): void { this.valorPrincipal = v; }

  getDevidoPrincipal(): Decimal { return this.devidoPrincipal; }
  setDevidoPrincipal(v: Decimal): void { this.devidoPrincipal = v; }

  getPagoPrincipal(): Decimal { return this.pagoPrincipal; }
  setPagoPrincipal(v: Decimal): void { this.pagoPrincipal = v; }

  getDevidoJuroDeMoraPrincipal(): Decimal { return this.devidoJuroDeMoraPrincipal; }
  setDevidoJuroDeMoraPrincipal(v: Decimal): void { this.devidoJuroDeMoraPrincipal = v; }

  getJuroPrincipal(): Decimal { return this.juroPrincipal; }
  setJuroPrincipal(v: Decimal): void { this.juroPrincipal = v; }

  getPagoJuroDeMoraPrincipal(): Decimal { return this.pagoJuroDeMoraPrincipal; }
  setPagoJuroDeMoraPrincipal(v: Decimal): void { this.pagoJuroDeMoraPrincipal = v; }

  getDevidoJuroDeMoraPrincipalPeriodoAtual(): Decimal { return this.devidoJuroDeMoraPrincipalPeriodoAtual; }
  setDevidoJuroDeMoraPrincipalPeriodoAtual(v: Decimal): void { this.devidoJuroDeMoraPrincipalPeriodoAtual = v; }

  getPagoJuroDeMoraPrincipalPeriodoAtual(): Decimal { return this.pagoJuroDeMoraPrincipalPeriodoAtual; }
  setPagoJuroDeMoraPrincipalPeriodoAtual(v: Decimal): void { this.pagoJuroDeMoraPrincipalPeriodoAtual = v; }

  getValorFgts(): Decimal { return this.valorFgts; }
  setValorFgts(v: Decimal): void { this.valorFgts = v; }

  getDevidoFgts(): Decimal { return this.devidoFgts; }
  setDevidoFgts(v: Decimal): void { this.devidoFgts = v; }

  getPagoFgts(): Decimal { return this.pagoFgts; }
  setPagoFgts(v: Decimal): void { this.pagoFgts = v; }

  getJuroFgts(): Decimal { return this.juroFgts; }
  setJuroFgts(v: Decimal): void { this.juroFgts = v; }

  getPagoJuroDeMoraFgts(): Decimal { return this.pagoJuroDeMoraFgts; }
  setPagoJuroDeMoraFgts(v: Decimal): void { this.pagoJuroDeMoraFgts = v; }

  getDevidoJuroDeMoraFgtsPeriodoAtual(): Decimal { return this.devidoJuroDeMoraFgtsPeriodoAtual; }
  setDevidoJuroDeMoraFgtsPeriodoAtual(v: Decimal): void { this.devidoJuroDeMoraFgtsPeriodoAtual = v; }

  getPagoJuroDeMoraFgtsPeriodoAtual(): Decimal { return this.pagoJuroDeMoraFgtsPeriodoAtual; }
  setPagoJuroDeMoraFgtsPeriodoAtual(v: Decimal): void { this.pagoJuroDeMoraFgtsPeriodoAtual = v; }

  getValorPrevidenciaPrivada(): Decimal { return this.valorPrevidenciaPrivada; }
  setValorPrevidenciaPrivada(v: Decimal): void { this.valorPrevidenciaPrivada = v; }

  getValorDescontoInss(): Decimal { return this.valorDescontoInss; }
  setValorDescontoInss(v: Decimal): void { this.valorDescontoInss = v; }

  getProporcaoJurosTributavel(): Decimal { return this.proporcaoJurosTributavel; }
  setProporcaoJurosTributavel(v: Decimal): void { this.proporcaoJurosTributavel = v; }

  getProporcaoPrincipalTributavel(): Decimal { return this.proporcaoPrincipalTributavel; }
  setProporcaoPrincipalTributavel(v: Decimal): void { this.proporcaoPrincipalTributavel = v; }

  getDescritivoDeEventos(): string | null { return this.descritivoDeEventos; }
  setDescritivoDeEventos(v: string | null): void { this.descritivoDeEventos = v; }

  /** Referenciado por ProporcoesIrpf e Irpf.liquidarAtualizacao. */
  getDiferencaPrincipal(): Decimal {
    return this.devidoPrincipal.minus(this.pagoPrincipal);
  }

  /** getTotalJurosPrincipal (Java) — soma juros principal + FGTS. */
  getTotalJurosPrincipal(): Decimal {
    return this.juroPrincipal.plus(this.juroFgts);
  }

  /** getTotalDevidoCorrigidoSemPagamento (Java) — stub. */
  getTotalDevidoCorrigidoSemPagamento(): Decimal {
    return this.devidoPrincipal.plus(this.devidoJuroDeMoraPrincipal);
  }
}
