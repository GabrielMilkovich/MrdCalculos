/**
 * Porte 1:1 de Constante.java (64 linhas).
 * Termo que devolve um valor fixo, opcionalmente proporcionalizado.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/Constante.java:28-50
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import { CalculoDoProporcionalizar } from '../../comum/rotinasdecalculo/calculo-do-proporcionalizar';

export class Constante implements Termo {
  private valor: Decimal | null = null;

  resolverValor(parametro: ParametroDoTermo): Decimal {
    const verba = parametro.getVerbaDeCalculo() as unknown as {
      getAplicarProporcionalidade?: () => boolean;
      getExcluirFeriasGozadas?: () => boolean;
      getExcluirFaltaJustificada?: () => boolean;
      getExcluirFaltaNaoJustificada?: () => boolean;
    };
    const calculo = parametro.getCalculo() as unknown as {
      obterDiasFerias?: (p: unknown) => number;
      obterFaltasJustificadas?: (p: unknown) => number;
      obterFaltasNaoJustificadas?: (p: unknown) => number;
    };
    const periodo = parametro.getPeriodo();
    const aplicarProp = verba.getAplicarProporcionalidade?.() ?? false;

    if (aplicarProp && this.valor !== null && periodo) {
      let diasParaExcluir = 0;
      if (verba.getExcluirFeriasGozadas?.()) {
        diasParaExcluir += calculo.obterDiasFerias?.(periodo) ?? 0;
      }
      // Java Constante.java:35-37: ajuste para mês de 31 dias
      const totalDeDias = (periodo as { totalDeDias?: () => number }).totalDeDias?.() ?? 30;
      if (totalDeDias - diasParaExcluir === 31) {
        diasParaExcluir = 1;
      }
      if (verba.getExcluirFaltaJustificada?.()) {
        diasParaExcluir += calculo.obterFaltasJustificadas?.(periodo) ?? 0;
      }
      if (verba.getExcluirFaltaNaoJustificada?.()) {
        diasParaExcluir += calculo.obterFaltasNaoJustificadas?.(periodo) ?? 0;
      }
      parametro.setValorIntegral(this.valor);
      const calc = new CalculoDoProporcionalizar(periodo as unknown as never, this.valor, diasParaExcluir);
      calc.executar();
      return calc.getResultado();
    }
    return this.valor ?? new Decimal(0);
  }

  getValor(): Decimal | null { return this.valor; }
  setValor(v: Decimal | null): void { this.valor = v; }

  toString(): string { return this.valor?.toString() ?? '0'; }
}
