/**
 * Porte 1:1 de LogicoFuzzy.java (41 linhas).
 *
 * Generalização de Boolean com exceções por período. Usado para perguntas como
 * "sábado é dia útil?" onde a resposta default pode ter exceções por período
 * (ex: em certa faixa de datas, sábado vira dia não-útil).
 *
 * Ref: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/LogicoFuzzy.java
 */
import type { Periodo } from './periodo';

export interface PeriodoParaExcecao {
  getPeriodo(): Periodo | null;
}

export class LogicoFuzzy<E extends PeriodoParaExcecao = PeriodoParaExcecao> {
  private considerar: boolean;
  private excecoes: Set<E> | null;

  static readonly VERDADEIRO: LogicoFuzzy = new LogicoFuzzy(true);
  static readonly FALSO: LogicoFuzzy = new LogicoFuzzy(false);

  constructor(considerar: boolean, excecoes: Set<E> | null = null) {
    this.considerar = considerar;
    this.excecoes = excecoes;
  }

  /**
   * Verifica se o valor lógico é verdadeiro para esta data,
   * invertendo-o se cair dentro de alguma exceção.
   *
   * Ref: LogicoFuzzy.java:30-40
   */
  isValido(date: Date): boolean {
    let resultado = this.considerar ?? false;
    if (this.excecoes !== null) {
      for (const excecao of this.excecoes) {
        const periodo = excecao.getPeriodo();
        if (periodo !== null && periodo.isPeriodoContemEsta(date)) {
          resultado = !resultado;
          break;
        }
      }
    }
    return resultado;
  }

  getConsiderar(): boolean { return this.considerar; }
  getExcecoes(): Set<E> | null { return this.excecoes; }
}
