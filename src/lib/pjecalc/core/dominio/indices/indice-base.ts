/**
 * PJe-Calc v2.15.1 — IndiceBase
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/IndiceBase.java
 *
 * Classe abstrata base para todos os índices monetários mensais (IPCA-E, IGP-M,
 * INPC, IPC, IPCA, TR, etc.). Define:
 *   competencia: Date (primeiro dia do mês)
 *   taxa: Decimal (em %, ex: 0.55 para IPCA-E 0,55%)
 *   getValorIndice(): 1 + taxa/100 (fator multiplicativo)
 *   getValorAcumulado(): preenchido por CalculadorDeIndices
 */
import Decimal from 'decimal.js';
import type { IndiceDeCalculo } from './indice-de-calculo';

export abstract class IndiceBase implements IndiceDeCalculo {
  protected competencia: Date;
  protected taxa: Decimal;
  protected dataCriacao: Date;
  protected valorAcumulado: Decimal | null = null;
  protected competenciaParaVerAcumulado: Date | null = null;

  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    this.competencia = competencia;
    this.taxa = taxa;
    this.dataCriacao = dataCriacao ?? new Date();
  }

  getCompetencia(): Date { return this.competencia; }
  setCompetencia(c: Date): void { this.competencia = c; }

  getTaxa(): Decimal { return this.taxa; }
  setTaxa(t: Decimal): void { this.taxa = t; }

  getDataCriacao(): Date { return this.dataCriacao; }
  setDataCriacao(d: Date): void { this.dataCriacao = d; }

  getValorAcumulado(): Decimal | null { return this.valorAcumulado; }
  setValorAcumulado(v: Decimal): void { this.valorAcumulado = v; }

  getCompetenciaParaVerAcumulado(): Date | null { return this.competenciaParaVerAcumulado; }
  setCompetenciaParaVerAcumulado(d: Date): void { this.competenciaParaVerAcumulado = d; }

  /**
   * getValorIndice (linha 110 do Java) — retorna 1 + taxa/100 como fator.
   * Para IPCA-E com taxa=0.55, retorna 1.0055.
   */
  getValorIndice(): Decimal {
    return this.taxa.div(100).plus(1);
  }

  /** compareTo (linha 155) — Java ordena DESCENDENTE por competência */
  compareTo(o: IndiceDeCalculo): number {
    return o.getCompetencia().getTime() - this.competencia.getTime();
  }

  abstract clonar(): IndiceBase;
}
