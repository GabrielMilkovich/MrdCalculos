/**
 * Porte 1:1 de Termo.java (interface base, 14 linhas).
 * Contrato: toda classe que resolve um valor (Quantidade, Divisor, BaseTabelada, BaseVerba, etc.)
 * implementa `resolverValor(parametro): Decimal`.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/Termo.java
 */
import type Decimal from 'decimal.js';
import type { ParametroDoTermo } from './parametro-do-termo';

export interface Termo {
  resolverValor(parametro: ParametroDoTermo): Decimal;
}
