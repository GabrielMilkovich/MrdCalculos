/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDaVerbaCalculada (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaCalculada
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/MaquinaDeCalculoDaVerbaCalculada.java (~78 linhas)
 *
 * Classe especializada para `Calculada` — delega cálculo de base/div/mult/qty
 * à `FormulaCalculada` associada e chama `calcularValorDevidoDaOcorrencia`
 * (já portado em maquina-de-calculo.ts).
 *
 * **Status**: stub estrutural. Implementação completa depende de
 * `Formula.calcular()`, geração de ocorrências e aplicação da fórmula
 * (Fase 11/12).
 */
import type { Calculada } from './calculada';

export class MaquinaDeCalculoDaVerbaCalculada {
  private verba: Calculada;

  constructor(verba: Calculada) {
    this.verba = verba;
  }

  getVerba(): Calculada { return this.verba; }

  /**
   * executarLiquidar — orquestra a liquidação da verba Calculada.
   * TODO(fase-11/12): invocar FormulaCalculada.calcular() + aplicar correção
   * monetária + calcularValorDevidoDaOcorrencia em cada ocorrência.
   */
  executarLiquidar(): void {
    // no-op
  }
}
