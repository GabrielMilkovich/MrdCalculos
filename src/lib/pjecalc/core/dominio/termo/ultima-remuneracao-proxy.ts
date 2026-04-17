/**
 * Porte 1:1 de UltimaRemuneracaoProxy.java (24 linhas).
 * Delega para Calculo.getValorUltimaRemuneracao.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/UltimaRemuneracaoProxy.java
 */
import type Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

export class UltimaRemuneracaoProxy implements Termo {
  resolverValor(parametro: ParametroDoTermo): Decimal {
    return parametro.getValorUltimaRemuneracaoDoCalculo();
  }
}
