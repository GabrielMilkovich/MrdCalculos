/**
 * PJe-Calc v2.15.1 — CombinacaoDeIndice
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/atualizacao/CombinacaoDeIndice.java
 *
 * Define uma mudança de índice monetário a partir de uma data específica.
 * Usado em ParametrosDeAtualizacao para suportar regimes combinados (ex:
 * IPCA-E até citação, depois SELIC — ADC 58/59).
 */
import { HelperDate } from '../../../base/comum/helper-date';
import type { IndiceMonetarioEnum } from '../../../constantes/enums';

export class CombinacaoDeIndice {
  private outroIndiceTrabalhista: IndiceMonetarioEnum | null = null;
  private apartirDeOutroIndice: Date | null = null;

  constructor(outroIndice?: IndiceMonetarioEnum, apartirDe?: Date) {
    if (outroIndice !== undefined) this.outroIndiceTrabalhista = outroIndice;
    if (apartirDe !== undefined) this.apartirDeOutroIndice = apartirDe;
  }

  getOutroIndiceTrabalhista(): IndiceMonetarioEnum | null { return this.outroIndiceTrabalhista; }
  setOutroIndiceTrabalhista(v: IndiceMonetarioEnum): void { this.outroIndiceTrabalhista = v; }

  getApartirDeOutroIndice(): Date | null { return this.apartirDeOutroIndice; }
  setApartirDeOutroIndice(v: Date): void { this.apartirDeOutroIndice = v; }

  /** compareTo (linha 136) — ordena por apartirDeOutroIndice (após removeTime) */
  compareTo(o: CombinacaoDeIndice): number {
    if (!this.apartirDeOutroIndice || !o.apartirDeOutroIndice) return 0;
    const a = HelperDate.getInstance(this.apartirDeOutroIndice)!.removeTime().getDate();
    const b = HelperDate.getInstance(o.apartirDeOutroIndice)!.removeTime().getDate();
    return a.getTime() - b.getTime();
  }
}
