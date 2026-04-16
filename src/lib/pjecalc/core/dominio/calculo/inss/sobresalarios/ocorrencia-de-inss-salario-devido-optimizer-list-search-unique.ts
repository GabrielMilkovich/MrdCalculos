/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique.java
 *
 * Indexa OcorrenciaDeInssSobreSalariosDevidos por (competencia + decimoTerceiro).
 */
import { OptimizerListSearchUnique } from '../../../../comum/optimizer-list-search-unique';
import { OcorrenciaInssUnique } from './ocorrencia-inss-unique';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './ocorrencia-de-inss-sobre-salarios-devidos';

export class OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique extends OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> {
  private map: Map<string, OcorrenciaDeInssSobreSalariosDevidos> = new Map();

  init(collection: Iterable<OcorrenciaDeInssSobreSalariosDevidos>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      const key = new OcorrenciaInssUnique(ocorrencia);
      this.map.set(key.toKey(), ocorrencia);
    }
    return this;
  }

  search(key: OcorrenciaInssUnique): OcorrenciaDeInssSobreSalariosDevidos | null {
    return this.map.get(key.toKey()) ?? null;
  }
}
