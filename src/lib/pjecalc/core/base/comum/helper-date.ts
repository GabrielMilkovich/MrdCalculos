/**
 * PJe-Calc v2.15.1 — HelperDate
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.HelperDate
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/HelperDate.java
 *
 * Peculiaridade importante: getMonth() do Java Calendar usa 0-indexed (Jan=0),
 * assim como o Date nativo do JS. Mantido 0-indexed aqui para paridade.
 */

import { Periodo } from './periodo';
import { nulo } from './utils';

// Índices de mês (Calendar constants)
export const JANUARY = 0;
export const FEBRUARY = 1;
export const MARCH = 2;
export const APRIL = 3;
export const MAY = 4;
export const JUNE = 5;
export const JULY = 6;
export const AUGUST = 7;
export const SEPTEMBER = 8;
export const OCTOBER = 9;
export const NOVEMBER = 10;
export const DECEMBER = 11;

export class HelperDate {
  // Date nativo (imutável) — usamos cópias defensivas para emular Calendar mutável
  private dt: Date;

  private constructor(dt?: Date) {
    this.dt = dt ? new Date(dt.getTime()) : new Date();
  }

  // ────────────── Factory methods (linhas 66-90) ──────────────

  static getInstance(): HelperDate;
  static getInstance(year: number, month: number, day: number): HelperDate;
  static getInstance(date: Date | null | undefined): HelperDate | null;
  static getInstance(value: string): HelperDate | null;
  static getInstance(a?: Date | null | number | string, month?: number, day?: number): HelperDate | null {
    if (a === undefined) return new HelperDate();
    if (typeof a === 'number' && typeof month === 'number' && typeof day === 'number') {
      // year, month, day (month 0-indexed)
      return new HelperDate(new Date(a, month, day, 0, 0, 0, 0));
    }
    if (a instanceof Date) return new HelperDate(a);
    if (typeof a === 'string') {
      // dd/MM/yyyy
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(a);
      if (!m) return null;
      return new HelperDate(new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), 0, 0, 0, 0));
    }
    return null;
  }

  // ────────────── Accessors (linhas 114-156) ──────────────

  getDay(): number { return this.dt.getDate(); }
  getMonth(): number { return this.dt.getMonth(); }  // 0-indexed
  getYear(): number { return this.dt.getFullYear(); }
  getDate(): Date { return new Date(this.dt.getTime()); }

  setDay(day: number): HelperDate { this.dt.setDate(day); return this; }
  setDate(date: Date | HelperDate): HelperDate {
    const d = date instanceof HelperDate ? date.getDate() : date;
    this.dt = new Date(d.getTime()); return this;
  }
  setMonth(month: number): HelperDate { this.dt.setMonth(month); return this; }
  setYear(year: number): HelperDate { this.dt.setFullYear(year); return this; }

  /** daysInMonth (linha 154) — Calendar.getActualMaximum(5) */
  daysInMonth(): number {
    return new Date(this.getYear(), this.getMonth() + 1, 0).getDate();
  }

  // ────────────── Aritmética (linhas 158-191) ──────────────

  /** subtractDays (linhas 158-164) */
  subtractDays(date: Date | HelperDate): number {
    const other = date instanceof HelperDate ? date : HelperDate.getInstance(date)!;
    return Math.floor((this.dt.getTime() - other.dt.getTime()) / 86400000);
  }

  /** subtractMonths (linhas 166-172) */
  subtractMonths(date: Date | HelperDate): number {
    const other = date instanceof HelperDate ? date : HelperDate.getInstance(date)!;
    const baseDiff = (this.getYear() - other.getYear()) * 12 + (this.getMonth() - other.getMonth());
    return baseDiff + (this.getDay() >= other.getDay() ? 0 : -1);
  }

  clone(): HelperDate { return new HelperDate(this.dt); }

  addYear(amount: number): HelperDate { this.dt.setFullYear(this.dt.getFullYear() + amount); return this; }
  addMonth(amount: number): HelperDate { this.dt.setMonth(this.dt.getMonth() + amount); return this; }
  addDay(amount: number): HelperDate { this.dt.setDate(this.dt.getDate() + amount); return this; }

  match(year: number, month: number, day: number): boolean {
    return this.getYear() === year && this.getMonth() === month && this.getDay() === day;
  }

  /** lastDayOfTheMonth (linha 197) */
  lastDayOfTheMonth(): HelperDate {
    const lastDay = this.daysInMonth();
    return HelperDate.getInstance(this.getYear(), this.getMonth(), lastDay);
  }

  // ────────────── Comparações (linhas 202-232) ──────────────

  lessThen(date: Date | HelperDate): boolean {
    const other = date instanceof HelperDate ? date.dt : date;
    return this.dt.getTime() < other.getTime();
  }
  lessThanOrEqualsTo(date: Date | HelperDate): boolean {
    const other = date instanceof HelperDate ? date.dt : date;
    return this.dt.getTime() <= other.getTime();
  }
  greaterThen(date: Date | HelperDate): boolean {
    const other = date instanceof HelperDate ? date.dt : date;
    return this.dt.getTime() > other.getTime();
  }
  greaterThenOrEquals(date: Date | HelperDate): boolean {
    const other = date instanceof HelperDate ? date.dt : date;
    return this.dt.getTime() >= other.getTime();
  }

  /** removeTime (linha 234) */
  removeTime(): HelperDate {
    this.dt.setHours(0, 0, 0, 0);
    return this;
  }

  // ────────────── Contagens estáticas (linhas 242-268) ──────────────

  /** countYears (linha 242) */
  static countYears(startDate: Date, endDate: Date): number {
    const date1 = HelperDate.getInstance(startDate)!;
    const date2 = HelperDate.getInstance(endDate)!;
    let count = 0;
    let lastDay = date1.clone().addYear(count + 1).addDay(-1);
    while (lastDay.lessThanOrEqualsTo(date2)) {
      lastDay = date1.clone().addYear((++count) + 1).addDay(-1);
    }
    return count;
  }

  /** countMonths (linha 253) */
  static countMonths(startDate: Date, endDate: Date): number {
    const date1 = HelperDate.getInstance(startDate)!.setDay(1);
    const date2 = HelperDate.getInstance(endDate)!.setDay(1);
    let count = 0;
    while (date1.lessThanOrEqualsTo(date2)) {
      ++count;
      date1.addMonth(1);
    }
    return count;
  }

  /** countDays (linha 264) */
  static countDays(startDate: Date, endDate: Date): number {
    const date1 = HelperDate.getInstance(startDate)!;
    const date2 = HelperDate.getInstance(endDate)!;
    return date2.subtractDays(date1);
  }

  // ────────────── breakInMonths / breakInYears (linhas 270-330) ──────────────

  /** breakInMonths (linha 270) */
  static breakInMonths(startDate: Date, endDate: Date): Periodo[] {
    const date1 = HelperDate.getInstance(startDate)!;
    const date2 = HelperDate.getInstance(endDate)!;
    const list: Periodo[] = [];
    while (date1.lessThanOrEqualsTo(date2)) {
      const periodo = new Periodo();
      periodo.setInicial(date1.getDate());
      const lastDay = date1.lastDayOfTheMonth();
      if (date2.lessThen(lastDay)) {
        periodo.setFinal(date2.getDate());
      } else {
        periodo.setFinal(lastDay.getDate());
      }
      list.push(periodo);
      date1.addMonth(1);
      date1.setDay(1);
    }
    return list;
  }

  /** breakInMonths com mês selecionado (linha 508) */
  static breakInMonthsSelected(startDate: Date, endDate: Date, monthSelected: number): Periodo[] {
    return HelperDate.breakInMonths(startDate, endDate).filter(p => {
      const m = HelperDate.getInstance(p.getInicial())!.getMonth();
      return m === monthSelected;
    });
  }

  copy(date: HelperDate): HelperDate { this.dt = new Date(date.dt.getTime()); return this; }

  // ────────────── Format (linha 332) ──────────────

  /** format — suporta dd/MM/yyyy, MM/yyyy, ddMMyyyy, yyyy-MM-dd */
  format(pattern: string): string {
    const dd = String(this.getDay()).padStart(2, '0');
    const MM = String(this.getMonth() + 1).padStart(2, '0');
    const yyyy = String(this.getYear()).padStart(4, '0');
    return pattern
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', yyyy);
  }

  // ────────────── Dia da semana (linha 337-345) ──────────────

  /** getWeekOfDay — 1=Dom..7=Sáb (Calendar.get(7)) */
  getWeekOfDay(): number {
    return this.dt.getDay() + 1;
  }
  isSunday(): boolean { return this.getWeekOfDay() === 1; }
  isMonday(): boolean { return this.getWeekOfDay() === 2; }
  isSaturday(): boolean { return this.getWeekOfDay() === 7; }

  // ────────────── Static date comparisons (linhas 411-443) ──────────────

  static resetHour(date: Date): Date {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static dateEquals(a: Date, b: Date): boolean {
    return HelperDate.resetHour(a).getTime() === HelperDate.resetHour(b).getTime();
  }

  static dateBefore(a: Date, b: Date): boolean {
    return HelperDate.resetHour(a).getTime() < HelperDate.resetHour(b).getTime();
  }

  static dateBeforeOrEquals(a: Date, b: Date): boolean {
    const ra = HelperDate.resetHour(a).getTime();
    const rb = HelperDate.resetHour(b).getTime();
    return ra <= rb;
  }

  static dateAfter(a: Date, b: Date): boolean {
    return HelperDate.resetHour(a).getTime() > HelperDate.resetHour(b).getTime();
  }

  static dateAfterOrEquals(a: Date, b: Date): boolean {
    return HelperDate.resetHour(a).getTime() >= HelperDate.resetHour(b).getTime();
  }

  // ────────────── Competências (linhas 445-461) ──────────────

  /** getCurrentCompetence (linha 445) — primeiro dia do mês da data dada */
  static getCurrentCompetence(currentDate: Date): HelperDate {
    const d = new Date(currentDate.getTime());
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return HelperDate.getInstance(d)!;
  }

  /** getCompetenceListForPeriod (linha 452) */
  static getCompetenceListForPeriod(startDate: Date, endDate: Date): HelperDate[] {
    let start = HelperDate.getCurrentCompetence(startDate);
    const list: HelperDate[] = [];
    do {
      list.push(start.clone());
      start = HelperDate.getCurrentCompetence(start.getDate());
      start.addMonth(1);
    } while (HelperDate.dateBeforeOrEquals(start.getDate(), endDate));
    return list;
  }

  // ────────────── Comparações de competência (linhas 463-506) ──────────────

  compareMonthAndYear(dateToCompare: Date): boolean {
    const otherDate = HelperDate.getCurrentCompetence(dateToCompare);
    return this.getMonth() === otherDate.getMonth() && this.getYear() === otherDate.getYear();
  }

  compareDate(date: Date | null | undefined): boolean {
    if (nulo(date)) return false;
    const otherDate = HelperDate.getInstance(date!)!;
    return this.getDay() === otherDate.getDay()
      && this.getMonth() === otherDate.getMonth()
      && this.getYear() === otherDate.getYear();
  }

  between(a: Date | HelperDate, b: Date | HelperDate): boolean {
    const d1 = a instanceof HelperDate ? a : HelperDate.getInstance(a)!;
    const d2 = b instanceof HelperDate ? b : HelperDate.getInstance(b)!;
    return this.lessThanOrEqualsTo(d2) && d1.lessThanOrEqualsTo(this);
  }

  isBetweenEndExclusive(a: Date | HelperDate, b: Date | HelperDate): boolean {
    const d1 = a instanceof HelperDate ? a : HelperDate.getInstance(a)!;
    const d2 = b instanceof HelperDate ? b : HelperDate.getInstance(b)!;
    return this.lessThen(d2) && d1.lessThanOrEqualsTo(this);
  }

  /** compareMonthAndYear static (linha 560) */
  static compareMonthAndYear(date1: Date, date2: Date): boolean {
    return HelperDate.getCurrentCompetence(date1).compareMonthAndYear(date2);
  }

  // ────────────── Formatação de competência (linhas 583-589) ──────────────

  static formatarCompetencia(date: Date | HelperDate): string {
    const h = date instanceof HelperDate ? date : HelperDate.getInstance(date)!;
    return h.format('MM/yyyy');
  }

  // ────────────── Quantidade de dias (linhas 591-618) ──────────────

  static obterQuantidadeDiasNoMes(date: HelperDate): number {
    return date.daysInMonth();
  }

  static obterQuantidadeDiasNoPeriodo(inicio: HelperDate, fim: HelperDate): number {
    return HelperDate.countDays(inicio.getDate(), fim.getDate()) + 1;
  }

  toString(): string {
    return this.format('dd/MM/yyyy');
  }
}
