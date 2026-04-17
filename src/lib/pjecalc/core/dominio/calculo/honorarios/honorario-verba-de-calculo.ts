/**
 * PJe-Calc v2.15.1 — HonorarioVerbaDeCalculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/HonorarioVerbaDeCalculo.java
 *
 * Tabela de junção Honorario ↔ VerbaDeCalculo, usada quando
 * `baseParaApuracao = VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL`.
 */
import type { Honorario } from './honorario';

export class HonorarioVerbaDeCalculo {
  private id: number | null = null;
  private honorario: Honorario | null;
  // Tipo do VerbaDeCalculo mantido como `unknown` até a Fase 11 completar o port.
  private verbaDeCalculo: unknown | null;

  constructor(honorario: Honorario | null = null, verbaDeCalculo: unknown | null = null) {
    this.honorario = honorario;
    this.verbaDeCalculo = verbaDeCalculo;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getHonorario(): Honorario | null { return this.honorario; }
  setHonorario(v: Honorario | null): void { this.honorario = v; }

  getVerbaDeCalculo(): unknown | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: unknown | null): void { this.verbaDeCalculo = v; }
}
