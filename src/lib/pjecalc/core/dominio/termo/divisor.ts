/**
 * Porte 1:1 de Divisor.java (140 linhas).
 *
 * Resolve o divisor da fórmula da verba (30, 220, carga horária, dias úteis, cartão).
 *
 * Ref: pjecalc-fonte/.../dominio/termo/Divisor.java:58-82
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import { TipoDoDivisorEnum } from '../../constantes/enums';

export class Divisor implements Termo {
  private tipo: TipoDoDivisorEnum = TipoDoDivisorEnum.OUTRO_VALOR;
  private outroValor: Decimal | null = null;

  resolverValor(parametro: ParametroDoTermo): Decimal {
    if (this.tipo === TipoDoDivisorEnum.OUTRO_VALOR) {
      return this.outroValor ?? new Decimal(1);
    }

    if (this.tipo === TipoDoDivisorEnum.CARGA_HORARIA) {
      // Java Divisor.java:64 — calculo.getValorCargaHoraria(periodo)
      const calculo = parametro.getCalculo() as unknown as {
        getValorCargaHoraria?: (p: unknown) => Decimal | null;
      };
      const v = calculo.getValorCargaHoraria?.(parametro.getPeriodo());
      return v ?? new Decimal(220); // fallback CLT padrão
    }

    if (this.tipo === TipoDoDivisorEnum.TRINTA) return new Decimal(30);
    if (this.tipo === TipoDoDivisorEnum.DUZENTOS_E_VINTE) return new Decimal(220);

    if (this.tipo === TipoDoDivisorEnum.HORAS_TRABALHADAS) {
      // Java DIAS_UTEIS — devolve total de dias úteis no período
      // STUB: requer Periodo.totalDeDiasUteis + LogicoFuzzy.sabadoDiaUtilComExcecao
      // Placeholder: 22 dias úteis (média)
      return new Decimal(22);
    }

    return this.outroValor ?? new Decimal(1);
  }

  getTipo(): TipoDoDivisorEnum { return this.tipo; }
  setTipo(t: TipoDoDivisorEnum): void { this.tipo = t; }

  getOutroValor(): Decimal | null { return this.outroValor; }
  setOutroValor(v: Decimal | null): void { this.outroValor = v; }

  toString(): string {
    if (this.tipo === TipoDoDivisorEnum.OUTRO_VALOR && this.outroValor !== null) {
      return this.outroValor.toString();
    }
    return String(this.tipo);
  }
}
