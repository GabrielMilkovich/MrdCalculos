/**
 * PJe-Calc v2.15.1 — FiltroDeHonorario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.FiltroDeHonorario
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/FiltroDeHonorario.java
 *
 * Filtro (repositório/Hibernate) para listar honorários por cálculo +
 * origemRegistro. Neste port, como ainda não há repositório de dados,
 * mantemos apenas a interface stub com `filtrar()` e `filtrarAtualizacao()`.
 */
import type { Calculo } from '../calculo';
import type { Honorario } from './honorario';

export class FiltroDeHonorario {
  private calculo: Calculo | null = null;

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  /** filtrar (Java linha 37) — TipoOrigemRegistroEnum.CALCULO. Stub. */
  filtrar(): Honorario[] {
    return []; // TODO(fase-8/infra): implementar quando RepositorioDeHonorario existir.
  }

  /** filtrarAtualizacao (Java linha 46) — TipoOrigemRegistroEnum.ATUALIZACAO. Stub. */
  filtrarAtualizacao(): Honorario[] {
    return [];
  }
}
