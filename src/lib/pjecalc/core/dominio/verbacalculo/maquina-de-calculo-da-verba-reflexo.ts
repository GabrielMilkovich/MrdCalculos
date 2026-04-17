/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDaVerbaReflexo (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaReflexo
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/MaquinaDeCalculoDaVerbaReflexo.java (~63 linhas)
 *
 * Classe para `Reflexo` — aplica `ComportamentoDoReflexo` sobre as bases das
 * verbas principais referenciadas em `FormulaReflexo.baseVerba`.
 */
import type { Reflexo } from './reflexo';

export class MaquinaDeCalculoDaVerbaReflexo {
  private verba: Reflexo;

  constructor(verba: Reflexo) {
    this.verba = verba;
  }

  getVerba(): Reflexo { return this.verba; }

  executarLiquidar(): void {
    // TODO(fase-11): aplicar ComportamentoDoReflexo para gerar ocorrências.
  }
}
