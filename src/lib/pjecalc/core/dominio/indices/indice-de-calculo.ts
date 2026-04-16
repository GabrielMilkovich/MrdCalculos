/**
 * PJe-Calc v2.15.1 — IndiceDeCalculo (interface)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/api/IndiceDeCalculo.java
 */
import Decimal from 'decimal.js';

export interface IndiceDeCalculo {
  /** Taxa mensal (em %) — ex: 1.12 para SELIC de 2023-01 */
  getTaxa(): Decimal;
  /** Competência do índice (primeiro dia do mês) */
  getCompetencia(): Date;
  /**
   * Valor do índice no formato fator:
   * - Para SELIC: 1 + taxa/100 (ex: 1.0112)
   * - Para outros: o valor do índice diretamente
   */
  getValorIndice(): Decimal;
  /** Valor acumulado (populado por CalculadorDeIndices) */
  getValorAcumulado(): Decimal | null;
  setValorAcumulado(v: Decimal): void;
  /** Cópia do índice */
  clonar(): IndiceDeCalculo;
  /** compareTo — ordena por competência */
  compareTo?(other: IndiceDeCalculo): number;
}
