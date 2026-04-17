/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDaVerbaInformada (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaInformada
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/MaquinaDeCalculoDaVerbaInformada.java (~55 linhas)
 *
 * Classe para `Informada` — usa valor direto, sem fórmula.
 */
import type { Informada } from './informada';

export class MaquinaDeCalculoDaVerbaInformada {
  private verba: Informada;

  constructor(verba: Informada) {
    this.verba = verba;
  }

  getVerba(): Informada { return this.verba; }

  executarLiquidar(): void {
    // TODO(fase-11): aplicar valor informado diretamente em cada ocorrência.
  }
}
