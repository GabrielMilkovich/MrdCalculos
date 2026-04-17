/**
 * Porte 1:1 de MaiorRemuneracaoProxy.java (24 linhas).
 * Delega para Calculo.getValorMaiorRemuneracao.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/MaiorRemuneracaoProxy.java
 */
import type Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

export class MaiorRemuneracaoProxy implements Termo {
  resolverValor(parametro: ParametroDoTermo): Decimal {
    return parametro.getValorMaiorRemuneracaoDoCalculo();
  }
}
