/**
 * PJe-Calc v2.15.1 — OutrosDebitosReclamado (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado
 *
 * Ref Java: pjecalc-fonte/.../pagamento/OutrosDebitosReclamado.java (~1490 linhas)
 *
 * Agrega outros débitos do reclamado para a atualização — INSS empresa/SAT/
 * Terceiros, multas/indenizações devidas ao reclamante ou terceiros,
 * honorários devidos pelo reclamado, custas (conhecimento/liquidação/fixas),
 * armazenamento, auto judicial.
 *
 * **Status**: stub estrutural com os campos essenciais para totais.
 */
import Decimal from 'decimal.js';
import type { Atualizacao } from './atualizacao';

const ZERO = new Decimal(0);

export class OutrosDebitosReclamado {
  private id: number | null = null;
  private versao: number = 0;
  private atualizacao: Atualizacao | null = null;
  private dataInicialPeriodo: Date | null = null;
  private dataFinalPeriodo: Date | null = null;

  // INSS parte empresa
  private valorInssEmpresa: Decimal = ZERO;
  private pagoInssEmpresa: Decimal = ZERO;
  private valorInssSAT: Decimal = ZERO;
  private pagoInssSAT: Decimal = ZERO;
  private valorInssTerceiros: Decimal = ZERO;
  private pagoInssTerceiros: Decimal = ZERO;

  // Multas ao reclamante
  private valorMultasDevidasAoReclamante: Decimal = ZERO;
  private pagoMultasDevidasAoReclamante: Decimal = ZERO;

  // Honorários
  private valorHonorarios: Decimal = ZERO;
  private pagoHonorarios: Decimal = ZERO;

  // Custas
  private valorCustasConhecimentoReclamado: Decimal = ZERO;
  private pagoCustasConhecimentoReclamado: Decimal = ZERO;
  private valorCustasLiquidacao: Decimal = ZERO;
  private pagoCustasLiquidacao: Decimal = ZERO;
  private valorCustasFixas: Decimal = ZERO;
  private pagoCustasFixas: Decimal = ZERO;
  private valorCustasAutos: Decimal = ZERO;
  private pagoCustasAutos: Decimal = ZERO;
  private valorArmazenamento: Decimal = ZERO;
  private pagoArmazenamento: Decimal = ZERO;

  // Atualização específica para cálculo externo (Lei 11.941)
  private valorJurosAposFev2009ContribSocialPatronal: Decimal = ZERO;
  private valorJurosAposFev2009ContribSocialSegurado: Decimal = ZERO;
  private valorJurosAteFev2009ContribSocialPatronal: Decimal = ZERO;
  private valorJurosAteFev2009ContribSocialSegurado: Decimal = ZERO;
  private valorJurosContribSocialPatronal: Decimal = ZERO;
  private valorJurosContribSocialSegurado: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getAtualizacao(): Atualizacao | null { return this.atualizacao; }
  setAtualizacao(a: Atualizacao | null): void { this.atualizacao = a; }

  getDataInicialPeriodo(): Date | null { return this.dataInicialPeriodo; }
  setDataInicialPeriodo(d: Date | null): void { this.dataInicialPeriodo = d; }

  getDataFinalPeriodo(): Date | null { return this.dataFinalPeriodo; }
  setDataFinalPeriodo(d: Date | null): void { this.dataFinalPeriodo = d; }

  getValorInssEmpresa(): Decimal { return this.valorInssEmpresa; }
  setValorInssEmpresa(v: Decimal): void { this.valorInssEmpresa = v; }

  getPagoInssEmpresa(): Decimal { return this.pagoInssEmpresa; }
  setPagoInssEmpresa(v: Decimal): void { this.pagoInssEmpresa = v; }

  getValorInssSAT(): Decimal { return this.valorInssSAT; }
  setValorInssSAT(v: Decimal): void { this.valorInssSAT = v; }

  getPagoInssSAT(): Decimal { return this.pagoInssSAT; }
  setPagoInssSAT(v: Decimal): void { this.pagoInssSAT = v; }

  getValorInssTerceiros(): Decimal { return this.valorInssTerceiros; }
  setValorInssTerceiros(v: Decimal): void { this.valorInssTerceiros = v; }

  getPagoInssTerceiros(): Decimal { return this.pagoInssTerceiros; }
  setPagoInssTerceiros(v: Decimal): void { this.pagoInssTerceiros = v; }

  getValorMultasDevidasAoReclamante(): Decimal { return this.valorMultasDevidasAoReclamante; }
  setValorMultasDevidasAoReclamante(v: Decimal): void { this.valorMultasDevidasAoReclamante = v; }

  getPagoMultasDevidasAoReclamante(): Decimal { return this.pagoMultasDevidasAoReclamante; }
  setPagoMultasDevidasAoReclamante(v: Decimal): void { this.pagoMultasDevidasAoReclamante = v; }

  getValorHonorarios(): Decimal { return this.valorHonorarios; }
  setValorHonorarios(v: Decimal): void { this.valorHonorarios = v; }

  getPagoHonorarios(): Decimal { return this.pagoHonorarios; }
  setPagoHonorarios(v: Decimal): void { this.pagoHonorarios = v; }

  getValorCustasConhecimentoReclamado(): Decimal { return this.valorCustasConhecimentoReclamado; }
  setValorCustasConhecimentoReclamado(v: Decimal): void { this.valorCustasConhecimentoReclamado = v; }

  getPagoCustasConhecimentoReclamado(): Decimal { return this.pagoCustasConhecimentoReclamado; }
  setPagoCustasConhecimentoReclamado(v: Decimal): void { this.pagoCustasConhecimentoReclamado = v; }

  getValorCustasLiquidacao(): Decimal { return this.valorCustasLiquidacao; }
  setValorCustasLiquidacao(v: Decimal): void { this.valorCustasLiquidacao = v; }

  getPagoCustasLiquidacao(): Decimal { return this.pagoCustasLiquidacao; }
  setPagoCustasLiquidacao(v: Decimal): void { this.pagoCustasLiquidacao = v; }

  getValorCustasFixas(): Decimal { return this.valorCustasFixas; }
  setValorCustasFixas(v: Decimal): void { this.valorCustasFixas = v; }

  getPagoCustasFixas(): Decimal { return this.pagoCustasFixas; }
  setPagoCustasFixas(v: Decimal): void { this.pagoCustasFixas = v; }

  getValorCustasAutos(): Decimal { return this.valorCustasAutos; }
  setValorCustasAutos(v: Decimal): void { this.valorCustasAutos = v; }

  getPagoCustasAutos(): Decimal { return this.pagoCustasAutos; }
  setPagoCustasAutos(v: Decimal): void { this.pagoCustasAutos = v; }

  getValorArmazenamento(): Decimal { return this.valorArmazenamento; }
  setValorArmazenamento(v: Decimal): void { this.valorArmazenamento = v; }

  getPagoArmazenamento(): Decimal { return this.pagoArmazenamento; }
  setPagoArmazenamento(v: Decimal): void { this.pagoArmazenamento = v; }

  // Juros para CalculoExterno / Lei 11.941 — referenciados por
  // OcorrenciaDeInssSobreSalariosDevidosAtualizacao (Fase 6).
  getValorJurosAposFev2009ContribSocialPatronal(): Decimal { return this.valorJurosAposFev2009ContribSocialPatronal; }
  setValorJurosAposFev2009ContribSocialPatronal(v: Decimal): void { this.valorJurosAposFev2009ContribSocialPatronal = v; }

  getValorJurosAposFev2009ContribSocialSegurado(): Decimal { return this.valorJurosAposFev2009ContribSocialSegurado; }
  setValorJurosAposFev2009ContribSocialSegurado(v: Decimal): void { this.valorJurosAposFev2009ContribSocialSegurado = v; }

  getValorJurosAteFev2009ContribSocialPatronal(): Decimal { return this.valorJurosAteFev2009ContribSocialPatronal; }
  setValorJurosAteFev2009ContribSocialPatronal(v: Decimal): void { this.valorJurosAteFev2009ContribSocialPatronal = v; }

  getValorJurosAteFev2009ContribSocialSegurado(): Decimal { return this.valorJurosAteFev2009ContribSocialSegurado; }
  setValorJurosAteFev2009ContribSocialSegurado(v: Decimal): void { this.valorJurosAteFev2009ContribSocialSegurado = v; }

  getValorJurosContribSocialPatronal(): Decimal { return this.valorJurosContribSocialPatronal; }
  setValorJurosContribSocialPatronal(v: Decimal): void { this.valorJurosContribSocialPatronal = v; }

  getValorJurosContribSocialSegurado(): Decimal { return this.valorJurosContribSocialSegurado; }
  setValorJurosContribSocialSegurado(v: Decimal): void { this.valorJurosContribSocialSegurado = v; }

  getTotalValor(): Decimal {
    return this.valorInssEmpresa
      .plus(this.valorInssSAT)
      .plus(this.valorInssTerceiros)
      .plus(this.valorMultasDevidasAoReclamante)
      .plus(this.valorHonorarios)
      .plus(this.valorCustasConhecimentoReclamado)
      .plus(this.valorCustasLiquidacao)
      .plus(this.valorCustasFixas)
      .plus(this.valorCustasAutos)
      .plus(this.valorArmazenamento);
  }
}
