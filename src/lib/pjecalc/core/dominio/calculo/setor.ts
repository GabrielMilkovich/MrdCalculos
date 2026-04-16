/**
 * PJe-Calc v2.15.1 — Setor
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor
 *
 * Ref Java: pjecalc-fonte/.../calculo/Setor.java
 *
 * ViewObject que identifica um setor (vara) + sua instância (1ª/2ª).
 */
import { InstanciaSetorEnum } from '../../constantes/enums';

export class Setor {
  private id: number | null = null;
  private instancia: InstanciaSetorEnum | null = null;

  constructor(id: number | null = null, instancia: InstanciaSetorEnum | null = null) {
    this.id = id;
    this.instancia = instancia;
  }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  getInstancia(): InstanciaSetorEnum | null { return this.instancia; }
  setInstancia(v: InstanciaSetorEnum | null): void { this.instancia = v; }

  equals(other: unknown): boolean {
    if (!(other instanceof Setor)) return false;
    return this.id === other.id && this.instancia === other.instancia;
  }
}
