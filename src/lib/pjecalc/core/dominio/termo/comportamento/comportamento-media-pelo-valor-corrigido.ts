/**
 * Porte 1:1 de ComportamentoMediaPeloValorCorrigido.java (21 linhas).
 *
 * Wrapper: chama ComportamentoMediaPeloValor com flag `corrigir=true`.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoMediaPeloValorCorrigido.java
 */
import type Decimal from 'decimal.js';
import { ComportamentoMediaPeloValor } from './comportamento-media-pelo-valor';
import type { ItemBaseVerba } from '../item-base-verba';
import type { ParametroDoTermo } from '../parametro-do-termo';

export class ComportamentoMediaPeloValorCorrigido extends ComportamentoMediaPeloValor {
  resolverValor(item: ItemBaseVerba, parametro: ParametroDoTermo): Decimal {
    return this.resolverValorInterno(item, parametro, true);
  }
}
