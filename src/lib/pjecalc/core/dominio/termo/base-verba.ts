/**
 * Porte 1:1 de BaseVerba.java (243 linhas, simplificado).
 *
 * Soma de itens (verbas-pai) que compõem a base de cálculo de um reflexo.
 * Cada item é um ItemBaseVerba com referência a uma VerbaDeCalculo.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/BaseVerba.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import { ItemBaseVerba } from './item-base-verba';

export class BaseVerba implements Termo {
  private itens: ItemBaseVerba[] = [];

  resolverValor(parametro: ParametroDoTermo): Decimal {
    let total = new Decimal(0);
    for (const item of this.itens) {
      total = total.plus(item.resolverValor(parametro));
    }
    return total;
  }

  getItens(): ItemBaseVerba[] { return this.itens; }
  setItens(itens: ItemBaseVerba[]): void { this.itens = itens; }
  adicionarItem(item: ItemBaseVerba): void { this.itens.push(item); }

  isEmpty(): boolean { return this.itens.length === 0; }
}
