/**
 * Porte parcial de ValorPago.java (273 linhas).
 *
 * Resolve o valor já pago pelo empregador (que entra como "pago" na ocorrência).
 * Pode ser informado, proporcional ao devido, zero, ou vir de histórico.
 *
 * STATUS: stub funcional. Implementação completa requer:
 *   - Lookup em historico salarial mensal
 *   - Cálculo de proporcionalidade vs devido
 *
 * Ref: pjecalc-fonte/.../dominio/termo/ValorPago.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import { TipoDeValorPagoEnum } from '../../constantes/enums';

export class ValorPago implements Termo {
  private tipo: TipoDeValorPagoEnum = TipoDeValorPagoEnum.INFORMADO;
  private valorInformado: Decimal | null = null;

  resolverValor(_parametro: ParametroDoTermo): Decimal {
    if (this.tipo === TipoDeValorPagoEnum.INFORMADO) {
      return this.valorInformado ?? new Decimal(0);
    }
    if (this.tipo === TipoDeValorPagoEnum.ZERO) {
      return new Decimal(0);
    }
    // PROPORCIONAL_DEVIDO e HISTORICO: stubs
    return this.valorInformado ?? new Decimal(0);
  }

  getTipo(): TipoDeValorPagoEnum { return this.tipo; }
  setTipo(t: TipoDeValorPagoEnum): void { this.tipo = t; }
  getValorInformado(): Decimal | null { return this.valorInformado; }
  setValorInformado(v: Decimal | null): void { this.valorInformado = v; }
}
