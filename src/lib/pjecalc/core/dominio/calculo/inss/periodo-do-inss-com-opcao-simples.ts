/**
 * PJe-Calc v2.15.1 — PeriodoDoINSSComOpcaoSimples
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.PeriodoDoINSSComOpcaoSimples
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/PeriodoDoINSSComOpcaoSimples.java
 *
 * Representa um intervalo em que o empregador optou pelo Simples Nacional.
 * Durante o período, a alíquota empresa + SAT é zerada (recolhimento unificado
 * no Simples). Configurado por Inss.adicionar(PeriodoDoINSSComOpcaoSimples).
 */
import { Periodo } from '../../../base/comum/periodo';
import type { Inss } from './inss';

export class PeriodoDoINSSComOpcaoSimples {
  private id: number | null = null;
  private versao: number = 0;
  private inss: Inss | null = null;
  private dataInicioSimples: Date | null = null;
  private dataTerminoSimples: Date | null = null;

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getInss(): Inss | null { return this.inss; }
  setInss(inss: Inss | null): void { this.inss = inss; }

  getDataInicioSimples(): Date | null { return this.dataInicioSimples; }
  setDataInicioSimples(d: Date | null): void { this.dataInicioSimples = d; }

  getDataTerminoSimples(): Date | null { return this.dataTerminoSimples; }
  setDataTerminoSimples(d: Date | null): void { this.dataTerminoSimples = d; }

  /** getPeriodo (Java linha 128) */
  getPeriodo(): Periodo | null {
    if (this.dataInicioSimples && this.dataTerminoSimples) {
      return new Periodo(this.dataInicioSimples, this.dataTerminoSimples);
    }
    return null;
  }

  /** isPeriodoCoincidenteCom (Java linha 135) */
  isPeriodoCoincidenteCom(outro: PeriodoDoINSSComOpcaoSimples): boolean {
    const a = this.getPeriodo();
    const b = outro.getPeriodo();
    if (!a || !b) return false;
    return a.isDatasCoincidentesCom(b);
  }
}
