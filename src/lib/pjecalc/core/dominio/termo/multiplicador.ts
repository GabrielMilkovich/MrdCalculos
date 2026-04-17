/**
 * Porte 1:1 de Multiplicador.java (62 linhas).
 * Termo simples — devolve o valor configurado.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/Multiplicador.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

export class Multiplicador implements Termo {
  private outroValor: Decimal | null = null;

  resolverValor(_parametro: ParametroDoTermo): Decimal {
    return this.outroValor ?? new Decimal(1);
  }

  getOutroValor(): Decimal | null { return this.outroValor; }
  setOutroValor(v: Decimal | null): void { this.outroValor = v; }

  toString(): string {
    return this.outroValor === null ? 'Multiplicador' : this.outroValor.toString();
  }

  equals(other: Multiplicador | null): boolean {
    if (this === other) return true;
    if (!other) return false;
    if (this.outroValor === null) return other.outroValor === null;
    return other.outroValor !== null && this.outroValor.equals(other.outroValor);
  }
}
