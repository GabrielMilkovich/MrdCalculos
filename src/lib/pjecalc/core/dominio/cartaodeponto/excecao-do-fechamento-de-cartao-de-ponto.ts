/**
 * PJe-Calc v2.15.1 — ExcecaoDoFechamentoDeCartaoDePonto
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ExcecaoDoFechamentoDeCartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/ExcecaoDoFechamentoDeCartaoDePonto.java (~175 linhas)
 *
 * Altera o dia de fechamento do mês do cartão-ponto em um período específico
 * (útil quando o empregador mudou o dia de corte em uma data).
 */
import { Periodo } from '../../base/comum/periodo';
import type { Calculo } from '../calculo/calculo';

export class ExcecaoDoFechamentoDeCartaoDePonto {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private dataInicioExcecao: Date | null = null;
  private dataTerminoExcecao: Date | null = null;
  private diaFechamentoMes: number | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataInicioExcecao(): Date | null { return this.dataInicioExcecao; }
  setDataInicioExcecao(d: Date | null): void { this.dataInicioExcecao = d; }

  getDataTerminoExcecao(): Date | null { return this.dataTerminoExcecao; }
  setDataTerminoExcecao(d: Date | null): void { this.dataTerminoExcecao = d; }

  getDiaFechamentoMes(): number | null { return this.diaFechamentoMes; }
  setDiaFechamentoMes(v: number | null): void { this.diaFechamentoMes = v; }

  getPeriodo(): Periodo | null {
    if (this.dataInicioExcecao && this.dataTerminoExcecao) {
      return new Periodo(this.dataInicioExcecao, this.dataTerminoExcecao);
    }
    return null;
  }

  /** compareTo — ordena por dataInicioExcecao. */
  compareTo(o: ExcecaoDoFechamentoDeCartaoDePonto): number {
    const a = this.dataInicioExcecao;
    const b = o.getDataInicioExcecao();
    if (!a || !b) return 0;
    return a.getTime() - b.getTime();
  }
}
