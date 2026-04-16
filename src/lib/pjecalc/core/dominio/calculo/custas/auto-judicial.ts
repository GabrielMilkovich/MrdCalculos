/**
 * PJe-Calc v2.15.1 — AutoJudicial
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/AutoJudicial.java (~283 linhas)
 *
 * Auto judicial (Remição/Adjudicação/Arrematação) associado às custas.
 * Campos:
 *   - tipoDeAuto (R/AD/AR)
 *   - valorAvaliacaoAuto
 *   - dataVencimentoAuto
 *   - valorTeto + valorCustasAuto
 *   - indiceCorrecao + taxaJuros
 *   - origemRegistro (CALCULO/ATUALIZACAO)
 *
 * Implementa EventoAtualizacao: prioridade 4.
 */
import type Decimal from 'decimal.js';
import { TipoDeAutoEnum, TipoOrigemRegistroEnum } from '../../../constantes/enums';
import type { CustasJudiciais } from './custas-judiciais';

export class AutoJudicial {
  static readonly PRIORIDADE_ATUALIZACAO = 4;

  private id: number | null = null;
  private versao: number = 0;
  private custasJudiciais: CustasJudiciais | null = null;
  private tipoDeAuto: TipoDeAutoEnum | null = null;
  private valorAvaliacaoAuto: Decimal | null = null;
  private dataVencimentoAuto: Date | null = null;
  private valorTeto: Decimal | null = null;
  private valorCustasAuto: Decimal | null = null;
  private indiceCorrecao: Decimal | null = null;
  private taxaJuros: Decimal | null = null;
  private origemRegistro: TipoOrigemRegistroEnum = TipoOrigemRegistroEnum.CALCULO;

  // transient
  private valorTetoTransiente: Decimal | null = null;
  private valorCustasAutoTransiente: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasJudiciais(): CustasJudiciais | null { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais | null): void { this.custasJudiciais = c; }

  getTipoDeAuto(): TipoDeAutoEnum | null { return this.tipoDeAuto; }
  setTipoDeAuto(v: TipoDeAutoEnum | null): void { this.tipoDeAuto = v; }

  getValorAvaliacaoAuto(): Decimal | null { return this.valorAvaliacaoAuto; }
  setValorAvaliacaoAuto(v: Decimal | null): void { this.valorAvaliacaoAuto = v; }

  getDataVencimentoAuto(): Date | null { return this.dataVencimentoAuto; }
  setDataVencimentoAuto(d: Date | null): void { this.dataVencimentoAuto = d; }

  getValorTeto(): Decimal | null { return this.valorTeto; }
  setValorTeto(v: Decimal | null): void { this.valorTeto = v; }

  getValorCustasAuto(): Decimal | null { return this.valorCustasAuto; }
  setValorCustasAuto(v: Decimal | null): void { this.valorCustasAuto = v; }

  getIndiceCorrecao(): Decimal | null { return this.indiceCorrecao; }
  setIndiceCorrecao(v: Decimal | null): void { this.indiceCorrecao = v; }

  getTaxaJuros(): Decimal | null { return this.taxaJuros; }
  setTaxaJuros(v: Decimal | null): void { this.taxaJuros = v; }

  getOrigemRegistro(): TipoOrigemRegistroEnum { return this.origemRegistro; }
  setOrigemRegistro(v: TipoOrigemRegistroEnum): void { this.origemRegistro = v; }

  getValorTetoTransiente(): Decimal | null { return this.valorTetoTransiente; }
  setValorTetoTransiente(v: Decimal | null): void { this.valorTetoTransiente = v; }

  getValorCustasAutoTransiente(): Decimal | null { return this.valorCustasAutoTransiente; }
  setValorCustasAutoTransiente(v: Decimal | null): void { this.valorCustasAutoTransiente = v; }

  getPrioridade(): number { return AutoJudicial.PRIORIDADE_ATUALIZACAO; }
}
