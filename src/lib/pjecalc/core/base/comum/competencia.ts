/**
 * PJe-Calc v2.15.1 — Competencia
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.Competencia
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/Competencia.java
 *
 * Representa uma competência (mês/ano) que identifica uma parcela mensal
 * (salário, índice, etc.). Usado como chave em OptimizerListSearch.
 */
import { HelperDate } from './helper-date';
import { Periodo } from './periodo';

export class Competencia {
  private mes: number | null;
  private ano: number | null;

  constructor(arg?: Date | { mes: number; ano: number }) {
    this.mes = null;
    this.ano = null;
    if (arg instanceof Date) {
      this.update(arg);
    } else if (arg && typeof arg === 'object') {
      this.mes = arg.mes;
      this.ano = arg.ano;
    }
  }

  update(arg: Date | number, ano?: number): void {
    if (arg instanceof Date) {
      this.mes = arg.getMonth() + 1;
      this.ano = arg.getFullYear();
    } else if (typeof arg === 'number' && typeof ano === 'number') {
      this.mes = arg;
      this.ano = ano;
    }
  }

  static getInstance(arg: Date | number, ano?: number): Competencia {
    if (arg instanceof Date) return new Competencia(arg);
    return new Competencia({ mes: arg, ano: ano as number });
  }

  getData(): Date | null {
    if (this.mes === null || this.ano === null) return null;
    return new Date(this.ano, this.mes - 1, 1);
  }

  criarPeriodoDaCompetencia(): Periodo {
    const data = this.getData();
    if (!data) throw new Error('Competencia.criarPeriodoDaCompetencia: sem data');
    const fim = HelperDate.getInstance(data).lastDayOfTheMonth().getDate();
    return new Periodo(data, fim);
  }

  getMes(): number | null { return this.mes; }
  getAno(): number | null { return this.ano; }
  setMes(m: number): void { this.mes = m; }
  setAno(a: number): void { this.ano = a; }

  /** Igual ao Java: linha 89 */
  isAnteriorA(competenciaDaData: Date): boolean {
    const self = this.getData();
    if (!self) return false;
    const other = HelperDate.getCurrentCompetence(competenciaDaData).getDate();
    return self < other;
  }

  /** Igual ao Java: linha 93 */
  isApos(competenciaDaData: Date): boolean {
    const self = this.getData();
    if (!self) return false;
    const other = HelperDate.getCurrentCompetence(competenciaDaData).getDate();
    return self > other;
  }

  /**
   * Chave canônica para uso em Map (TypeScript não tem hashCode/equals).
   * Ex: Competencia{mes=1,ano=2024} -> "2024-01"
   */
  toKey(): string {
    if (this.mes === null || this.ano === null) return '';
    return `${this.ano}-${String(this.mes).padStart(2, '0')}`;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Competencia)) return false;
    return this.mes === other.mes && this.ano === other.ano;
  }
}
