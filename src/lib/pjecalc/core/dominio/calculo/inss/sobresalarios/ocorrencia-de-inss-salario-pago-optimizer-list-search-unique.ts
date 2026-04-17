/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique.java
 */
import { OptimizerListSearchUnique } from '../../../../comum/optimizer-list-search-unique';
import { OcorrenciaInssUnique } from './ocorrencia-inss-unique';
import type { OcorrenciaDeInssSobreSalariosPagos } from './ocorrencia-de-inss-sobre-salarios-pagos';

export class OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique extends OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> {
  private map: Map<string, OcorrenciaDeInssSobreSalariosPagos> = new Map();

  init(collection: Iterable<OcorrenciaDeInssSobreSalariosPagos>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      const key = new OcorrenciaInssUnique(ocorrencia);
      this.map.set(key.toKey(), ocorrencia);
    }
    return this;
  }

  search(key: OcorrenciaInssUnique): OcorrenciaDeInssSobreSalariosPagos | null {
    return this.map.get(key.toKey()) ?? null;
  }
}
