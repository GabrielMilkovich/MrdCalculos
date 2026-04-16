/**
 * PJe-Calc v2.15.1 — CompetenciaDeJuros
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.CompetenciaDeJuros
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/CompetenciaDeJuros.java
 *
 * Extensão de Competencia (mes/ano) com uma data inicial adicional usada para
 * distinguir múltiplas apurações de juros dentro da mesma competência
 * (ex: salário + parcela adicional no mesmo mês).
 */
import { Competencia } from '../../base/comum/competencia';

export class CompetenciaDeJuros extends Competencia {
  private dataInicial: Date;

  constructor(competencia: Date, dataInicial: Date) {
    super(competencia);
    this.dataInicial = dataInicial;
  }

  static getInstance(competencia: Date, dataInicial: Date): CompetenciaDeJuros {
    return new CompetenciaDeJuros(competencia, dataInicial);
  }

  getDataInicial(): Date { return this.dataInicial; }
  setDataInicial(d: Date): void { this.dataInicial = d; }

  /**
   * compareTo (Java linha 59) — compara primeiro por data de competência,
   * depois por dataInicial. Retorna −1 / 0 / +1.
   */
  compareTo(outra: CompetenciaDeJuros): number {
    const a = this.getData();
    const b = outra.getData();
    if (a && b) {
      if (a < b) return -1;
      if (a > b) return 1;
    }
    if (this.dataInicial < outra.dataInicial) return -1;
    if (this.dataInicial > outra.dataInicial) return 1;
    return 0;
  }

  /** Sobrescreve toKey para incluir a dataInicial na chave do Map. */
  toKey(): string {
    const base = super.toKey();
    const iso = this.dataInicial.toISOString().slice(0, 10);
    return `${base}|${iso}`;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof CompetenciaDeJuros)) return false;
    return super.equals(other) && this.dataInicial.getTime() === other.dataInicial.getTime();
  }
}
