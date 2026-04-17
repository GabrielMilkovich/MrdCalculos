/**
 * PJe-Calc v2.15.1 — PeriodoDeJuros
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.PeriodoDeJuros
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/PeriodoDeJuros.java
 *
 * Representa um segmento de juros com aliquota, tipoQuantidade (INTEIRO ou FRACAO),
 * tipoJuros (SIMPLES ou COMPOSTOS) e tabelaJuros (JurosEnum). A propriedade
 * crítica é `getMeses()` — contagem pro-rata die nos extremos quando FRACAO.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../base/comum/helper-date';
import { multiplicar, nulo } from '../base/comum/utils';
import { JurosEnum, TipoDeJurosEnum, TipoDeQuantidadeDeJurosBaseEnum } from '../constantes/enums';

export class PeriodoDeJuros {
  private dataInicial: Date | null = null;
  private dataFinal: Date | null = null;
  private aliquota: Decimal | null = null;
  private tipoDeQuantidade: TipoDeQuantidadeDeJurosBaseEnum | null = null;
  private tipoDeJuros: TipoDeJurosEnum | null = null;
  private proximoPeriodo: PeriodoDeJuros | null = null;
  private fazendaPublica: boolean = false;
  private tabelaJuros: JurosEnum | null = null;
  private meses: Decimal | null = null;
  private taxa: Decimal | null = null;

  constructor(
    dataInicial?: Date | null,
    dataFinal?: Date | null,
    aliquota?: Decimal | null,
    tipoDeQuantidade?: TipoDeQuantidadeDeJurosBaseEnum | null,
    tipoDeJuros?: TipoDeJurosEnum | null,
    fazendaPublica?: boolean,
    tabelaJuros?: JurosEnum | null
  ) {
    if (dataInicial !== undefined) this.dataInicial = dataInicial ?? null;
    if (dataFinal !== undefined) this.dataFinal = dataFinal ?? null;
    if (aliquota !== undefined) this.aliquota = aliquota ?? null;
    if (tipoDeQuantidade !== undefined) this.tipoDeQuantidade = tipoDeQuantidade ?? null;
    if (tipoDeJuros !== undefined) this.tipoDeJuros = tipoDeJuros ?? null;
    if (fazendaPublica !== undefined) this.fazendaPublica = fazendaPublica;
    if (tabelaJuros !== undefined) this.tabelaJuros = tabelaJuros ?? null;
  }

  clone(): PeriodoDeJuros {
    return new PeriodoDeJuros(
      this.dataInicial, this.dataFinal, this.aliquota,
      this.tipoDeQuantidade, this.tipoDeJuros, this.fazendaPublica, this.tabelaJuros
    );
  }

  getDataInicial(): Date | null { return this.dataInicial; }
  setDataInicial(d: Date): void { this.dataInicial = d; }
  getDataFinal(): Date | null { return this.dataFinal; }
  setDataFinal(d: Date): void { this.dataFinal = d; }

  getAliquota(): Decimal | null { return this.aliquota; }
  setAliquota(a: Decimal): void { this.aliquota = a; }

  getTipoDeQuantidade(): TipoDeQuantidadeDeJurosBaseEnum | null { return this.tipoDeQuantidade; }
  setTipoDeQuantidade(t: TipoDeQuantidadeDeJurosBaseEnum): void { this.tipoDeQuantidade = t; }

  getTipoDeJuros(): TipoDeJurosEnum | null { return this.tipoDeJuros; }
  setTipoDeJuros(t: TipoDeJurosEnum): void { this.tipoDeJuros = t; }

  getProximoPeriodo(): PeriodoDeJuros | null { return this.proximoPeriodo; }
  setProximoPeriodo(p: PeriodoDeJuros | null): void { this.proximoPeriodo = p; }

  isFazendaPublica(): boolean { return this.fazendaPublica; }
  setFazendaPublica(v: boolean): void { this.fazendaPublica = v; }

  getTabelaJuros(): JurosEnum | null { return this.tabelaJuros; }
  setTabelaJuros(t: JurosEnum): void { this.tabelaJuros = t; }

  /** getDias (linha 94) — dias inclusive */
  getDias(): number {
    if (!this.dataInicial || !this.dataFinal) return 0;
    return HelperDate.countDays(this.dataInicial, this.dataFinal) + 1;
  }

  /**
   * getMeses (linha 98) — CORE da paridade de juros.
   *
   * Contagem de meses com FRAÇÃO pro-rata die quando tipoDeQuantidade = FRACAO.
   *
   * Algoritmo (linhas 98-125 do Java):
   *   meses_inteiros = countMonths(dataInicial, dataFinal)
   *   diasRestantesNoMesInicial = countDays(dataInicial, lastDayOfMonth) + 1
   *
   *   Se FRACAO:
   *     se diasRestantes_mesInicial < diasNoMesInicial:
   *       meses = meses - 1 + (diasRestantes / diasNoMes)
   *     se diaFinal < diasNoMesFinal:
   *       meses = meses - 1 + (diaFinal / diasNoMes)
   *
   *   Se INTEIRO:
   *     se diasRestantes < 15: meses -= 1
   *     se diaFinal < 15: meses -= 1
   */
  getMeses(): Decimal {
    if (this.meses === null) {
      if (!this.dataInicial || !this.dataFinal) return new Decimal(0);
      const hdInicial = HelperDate.getInstance(this.dataInicial)!;
      const hdFinal = HelperDate.getInstance(this.dataFinal)!;
      this.meses = new Decimal(HelperDate.countMonths(this.dataInicial, this.dataFinal));
      const quantDiasInicial = HelperDate.countDays(this.dataInicial, hdInicial.lastDayOfTheMonth().getDate()) + 1;

      if (this.tipoDeQuantidade === TipoDeQuantidadeDeJurosBaseEnum.FRACAO) {
        const totalDiasMesInicial = hdInicial.daysInMonth();
        if (quantDiasInicial < totalDiasMesInicial) {
          const fracao = new Decimal(quantDiasInicial).div(totalDiasMesInicial);
          this.meses = this.meses.minus(1).plus(fracao);
        }
        const diaFinal = hdFinal.getDay();
        const totalDiasMesFinal = hdFinal.daysInMonth();
        if (diaFinal < totalDiasMesFinal) {
          const fracao = new Decimal(diaFinal).div(totalDiasMesFinal);
          this.meses = this.meses.minus(1).plus(fracao);
        }
      } else {
        // INTEIRO — arredonda ao 15º dia
        if (quantDiasInicial < 15) this.meses = this.meses.minus(1);
        if (hdFinal.getDay() < 15) this.meses = this.meses.minus(1);
      }
    }
    return this.meses;
  }

  /**
   * getTaxa (linha 127) — retorna a TAXA PERCENTUAL do período.
   * - Para JUROS_ZERO_TRINTA_TRES (0,0333% a.d.): taxa = aliquota × dias
   * - Para SIMPLES: taxa = aliquota × meses_fracionados
   * - Para COMPOSTOS: taxa = ((1 + 0,01)^meses − 1) × 100 (usa aliquota=1%)
   *
   * NOTA: composto do PJe-Calc assume 1%/mês fixo (não usa aliquota).
   * Retorna TAXA em % (ex: 13.5 para 13,5%), não fator.
   */
  getTaxa(): Decimal {
    if (this.taxa === null) {
      if (this.tabelaJuros === JurosEnum.JUROS_ZERO_TRINTA_TRES) {
        this.taxa = multiplicar(this.getAliquota(), new Decimal(this.getDias()))!;
      } else if (this.tipoDeJuros === TipoDeJurosEnum.SIMPLES) {
        this.taxa = this.getAliquota()!.times(this.getMeses());
      } else {
        // Composto: usa 1% fixo e calcula (1.01)^meses
        const base = new Decimal(1).div(100).plus(1); // 1.01
        this.taxa = base.pow(this.getMeses()).minus(1).times(100);
      }
    }
    return this.taxa;
  }

  toString(): string {
    const fmt = (d: Date | null) => d ? HelperDate.getInstance(d)!.format('dd/MM/yyyy') : '';
    return `[periodo: ${fmt(this.dataInicial)} - ${fmt(this.dataFinal)}, meses: ${this.getMeses().toString()}, taxa: ${this.getTaxa().toString()}]`;
  }
}
