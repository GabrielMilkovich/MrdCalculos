/**
 * PJe-Calc v2.15.1 — Principal (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/Principal.java (~90 linhas)
 *
 * Subclasse abstrata de `VerbaDeCalculo` que representa verbas **principais**
 * (salário, horas extras, 13º, férias) — aquelas com fórmula `Calculada` ou
 * `Informada`. Distingue-se de `Reflexo` (que depende da base de principais).
 *
 * Mantém a lista de reflexos que "batem" nesta principal.
 */
import { VerbaDeCalculo } from './verba-de-calculo';
import type { Reflexo } from './reflexo';

export abstract class Principal extends VerbaDeCalculo {
  private reflexos: Reflexo[] = [];
  private reflexosParaListagem: Reflexo[] | null = null;

  getReflexos(): Reflexo[] { return this.reflexos; }
  setReflexos(v: Reflexo[]): void { this.reflexos = v; }

  /** getReflexosParaListagem — lazy. No Java, inicializa ocorrências (Hibernate). */
  getReflexosParaListagem(): Reflexo[] {
    if (this.reflexosParaListagem === null) {
      this.reflexosParaListagem = [...this.reflexos];
    }
    return this.reflexosParaListagem;
  }

  /** possuiReflexosHabilitados (Java linha 77) */
  possuiReflexosHabilitados(): boolean {
    for (const r of this.getReflexosParaListagem()) {
      if (r.getAtivo()) return true;
    }
    return false;
  }

  /** isPrincipal — override do VerbaDeCalculo (default false). */
  isPrincipal(): boolean { return true; }
}
