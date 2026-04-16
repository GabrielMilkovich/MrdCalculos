/**
 * PJe-Calc v2.15.1 — Periodo
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.Periodo
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/Periodo.java
 */

import { HelperDate } from './helper-date';
import { nulo, nulos, naoNulos } from './utils';

export class Periodo {
  private inicial: Date | null = null;
  // Java usou 'finall' (final é reservado); mantemos 'fim' interno
  private fim: Date | null = null;
  private labelDataIncial = 'Data Inicial';
  private labelDataFinal = 'Data Final';

  constructor(inicial?: Date | HelperDate | null, fim?: Date | HelperDate | null) {
    if (inicial !== undefined && inicial !== null) {
      this.inicial = inicial instanceof HelperDate ? inicial.getDate() : inicial;
    }
    if (fim !== undefined && fim !== null) {
      this.fim = fim instanceof HelperDate ? fim.getDate() : fim;
    }
  }

  getInicial(): Date { return this.inicial!; }
  setInicial(inicial: Date): void { this.inicial = inicial; }
  getFinal(): Date { return this.fim!; }
  setFinal(fim: Date): void { this.fim = fim; }

  getLabelDataIncial(): string { return this.labelDataIncial; }
  setLabelDataIncial(v: string): void { this.labelDataIncial = v; }
  getLabelDataFinal(): string { return this.labelDataFinal; }
  setLabelDataFinal(v: string): void { this.labelDataFinal = v; }

  /** totalDeDias (linha 72) */
  totalDeDias(): number {
    if (naoNulos(this.inicial, this.fim)) {
      return HelperDate.getInstance(this.fim!)!.subtractDays(this.inicial!) + 1;
    }
    return 0;
  }

  /** isCompleto (linha 79) */
  isCompleto(): boolean {
    return naoNulos(this.inicial, this.fim);
  }

  /** formatInicial (linha 99) */
  formatInicial(formato: string): string {
    return HelperDate.getInstance(this.getInicial())!.format(formato);
  }
  formatFinal(formato: string): string {
    return HelperDate.getInstance(this.getFinal())!.format(formato);
  }

  /** isDatasDoMesmoMes (linha 107) */
  isDatasDoMesmoMes(): boolean {
    return HelperDate.getInstance(this.inicial!)!.getMonth()
      === HelperDate.getInstance(this.fim!)!.getMonth();
  }

  obterDataFinalHelper(): HelperDate { return HelperDate.getInstance(this.getFinal())!; }
  obterDataInicialHelper(): HelperDate { return HelperDate.getInstance(this.getInicial())!; }

  /** isDataContidaNeste (linha 119) */
  isDataContidaNeste(periodo: Periodo): boolean {
    return HelperDate.dateAfterOrEquals(this.getInicial(), periodo.getInicial())
      && HelperDate.dateBeforeOrEquals(this.getInicial(), periodo.getFinal())
      || HelperDate.dateBeforeOrEquals(this.getFinal(), periodo.getFinal())
      && HelperDate.dateAfterOrEquals(this.getFinal(), periodo.getInicial());
  }

  /** isPeriodoContemEste (linha 123) */
  isPeriodoContemEste(periodo: Periodo): boolean {
    return HelperDate.dateAfterOrEquals(periodo.getInicial(), this.getInicial())
      && HelperDate.dateBeforeOrEquals(periodo.getFinal(), this.getInicial())
      || HelperDate.dateBeforeOrEquals(periodo.getFinal(), this.getFinal())
      && HelperDate.dateAfterOrEquals(periodo.getFinal(), this.getInicial());
  }

  /** isPeriodoContemTotalmenteEste (linha 127) */
  isPeriodoContemTotalmenteEste(periodo: Periodo): boolean {
    if (nulo(periodo.getInicial()) || nulo(periodo.getFinal())) return false;
    return HelperDate.getInstance(periodo.getInicial())!.between(this.getInicial(), this.getFinal())
      && HelperDate.getInstance(periodo.getFinal())!.between(this.getInicial(), this.getFinal());
  }

  isDatasCoincidentesCom(periodo: Periodo): boolean {
    return this.isDataContidaNeste(periodo) || this.isPeriodoContemEste(periodo);
  }

  /** isPeriodoContemEsta (linha 138) — testa se este Periodo contém a data dada */
  isPeriodoContemEsta(data: Date): boolean {
    return HelperDate.dateAfterOrEquals(data, this.inicial!)
      && HelperDate.dateBeforeOrEquals(data, this.fim!);
  }

  /** totalDeDiasCoincidentesComEste (linha 142) */
  totalDeDiasCoincidentesComEste(periodo: Periodo): number {
    let total = 0;
    if (this.isDatasCoincidentesCom(periodo)) {
      const data = HelperDate.getInstance(periodo.getInicial())!;
      const dataFinal = HelperDate.getInstance(periodo.getFinal())!;
      const numeroMaximoDeLoops = this.totalDeDias() > periodo.totalDeDias() ? this.totalDeDias() : periodo.totalDeDias();
      for (let i = 0; i < numeroMaximoDeLoops && data.lessThanOrEqualsTo(dataFinal); ++i) {
        if (this.isPeriodoContemEsta(data.getDate())) ++total;
        data.addDay(1);
      }
    }
    return total;
  }

  isMesmoPeriodo(periodo: Periodo): boolean {
    return HelperDate.dateEquals(periodo.getInicial(), this.getInicial())
      && HelperDate.dateEquals(periodo.getFinal(), this.getFinal());
  }

  /** interseccao (linha 162) */
  interseccao(periodo: Periodo): Periodo | null {
    if (!naoNulos(periodo, this.getInicial(), this.getFinal(), periodo.getInicial(), periodo.getFinal())) {
      return null;
    }
    if (HelperDate.dateAfter(periodo.getInicial(), this.getFinal())
      || HelperDate.dateAfter(this.getInicial(), periodo.getFinal())) {
      return null;
    }
    const out = new Periodo();
    if (HelperDate.dateBeforeOrEquals(this.getInicial(), periodo.getInicial())) {
      out.setInicial(periodo.getInicial());
    } else {
      out.setInicial(this.getInicial());
    }
    if (HelperDate.dateBeforeOrEquals(this.getFinal(), periodo.getFinal())) {
      out.setFinal(this.getFinal());
    } else {
      out.setFinal(periodo.getFinal());
    }
    return out;
  }

  /** dividirNaData (linha 183) */
  dividirNaData(dataDaDivisao: Date): Periodo[] {
    const divisao: Periodo[] = [];
    if (HelperDate.dateBeforeOrEquals(this.getFinal(), dataDaDivisao)) {
      divisao.push(this);
    } else if (HelperDate.dateBefore(dataDaDivisao, this.getInicial())) {
      divisao.push(this);
    } else {
      divisao.push(new Periodo(this.getInicial(), dataDaDivisao));
      const umDiaAposDivisao = HelperDate.getInstance(dataDaDivisao)!.addDay(1).getDate();
      divisao.push(new Periodo(umDiaAposDivisao, this.getFinal()));
    }
    return divisao;
  }

  isDataFinalMenorQueInicial(): boolean {
    if (naoNulos(this.getInicial(), this.getFinal())) {
      return this.obterDataFinalHelper().lessThen(this.getInicial());
    }
    return false;
  }

  isDataMenorQueIncial(data: Date): boolean {
    return HelperDate.dateBefore(data, this.inicial!);
  }

  isDataMaiorQueFinal(data: Date): boolean {
    return HelperDate.dateAfter(data, this.fim!);
  }

  toString(): string {
    if (nulos(this.inicial, this.fim)) return '';
    return this.formatInicial('dd/MM/yyyy') + ' a ' + this.formatFinal('dd/MM/yyyy');
  }
}
