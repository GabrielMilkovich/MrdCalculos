/**
 * PJe-Calc v2.15.1 — CombinacaoDeJuros
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros
 *
 * Define uma mudança de regime de juros a partir de uma data específica.
 */
import { HelperDate } from '../../../base/comum/helper-date';
import type { JurosEnum } from '../../../constantes/enums';

export class CombinacaoDeJuros {
  private outroJuros: JurosEnum | null = null;
  private apartirDeOutroJuros: Date | null = null;

  constructor(outro?: JurosEnum, apartirDe?: Date) {
    if (outro !== undefined) this.outroJuros = outro;
    if (apartirDe !== undefined) this.apartirDeOutroJuros = apartirDe;
  }

  getOutroJuros(): JurosEnum | null { return this.outroJuros; }
  setOutroJuros(v: JurosEnum): void { this.outroJuros = v; }

  getApartirDeOutroJuros(): Date | null { return this.apartirDeOutroJuros; }
  setApartirDeOutroJuros(v: Date): void { this.apartirDeOutroJuros = v; }

  compareTo(o: CombinacaoDeJuros): number {
    if (!this.apartirDeOutroJuros || !o.apartirDeOutroJuros) return 0;
    const a = HelperDate.getInstance(this.apartirDeOutroJuros)!.removeTime().getDate();
    const b = HelperDate.getInstance(o.apartirDeOutroJuros)!.removeTime().getDate();
    return a.getTime() - b.getTime();
  }
}
