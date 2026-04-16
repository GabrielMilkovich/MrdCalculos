/**
 * Porte 1:1 de ItemBaseVerba.java (138 linhas).
 *
 * Item individual dentro de uma BaseVerba — referencia uma VerbaDeCalculo
 * (a verba-pai do reflexo) com configurações de integralização.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/ItemBaseVerba.java
 */
import Decimal from 'decimal.js';
import type { ParametroDoTermo } from './parametro-do-termo';
import type { VerbaDeCalculo } from '../verbacalculo/verba-de-calculo';

export class ItemBaseVerba {
  private id: string | null = null;
  private verbaDeCalculo: VerbaDeCalculo | null = null;
  private integralizar: boolean = false;
  private fatorMultiplicador: Decimal | null = null;

  getId(): string | null { return this.id; }
  setId(id: string | null): void { this.id = id; }

  getVerbaDeCalculo(): VerbaDeCalculo | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: VerbaDeCalculo | null): void { this.verbaDeCalculo = v; }

  getIntegralizar(): boolean { return this.integralizar; }
  setIntegralizar(v: boolean): void { this.integralizar = v; }

  getFatorMultiplicador(): Decimal | null { return this.fatorMultiplicador; }
  setFatorMultiplicador(v: Decimal | null): void { this.fatorMultiplicador = v; }

  /**
   * Resolve o valor desta verba-pai como contribuição para a base do reflexo.
   * Soma os devidos das ocorrências da verba-pai no período do parâmetro.
   *
   * Ref: ItemBaseVerba.java + ComportamentoDaBaseDoReflexo (lógica delegada)
   */
  resolverValor(parametro: ParametroDoTermo): Decimal {
    if (!this.verbaDeCalculo) return new Decimal(0);
    let total = new Decimal(0);
    const periodo = parametro.getPeriodo();
    if (!periodo) return total;

    // Stub: soma o devido das ocorrências ativas da verba-pai
    const verba = this.verbaDeCalculo as unknown as {
      getOcorrenciasAtivas?: () => Array<{
        getDevido: () => Decimal | null;
        getDataInicial: () => Date | null;
      }>;
    };
    const ocs = verba.getOcorrenciasAtivas?.() ?? [];
    const periodoIni = (periodo as { getInicial?: () => Date | null }).getInicial?.();
    const periodoFim = (periodo as { getFinal?: () => Date | null }).getFinal?.();
    for (const oc of ocs) {
      const data = oc.getDataInicial();
      if (!data) continue;
      if (periodoIni && data < periodoIni) continue;
      if (periodoFim && data > periodoFim) continue;
      const dev = oc.getDevido();
      if (dev) total = total.plus(dev);
    }
    if (this.fatorMultiplicador) total = total.times(this.fatorMultiplicador);
    return total;
  }
}
