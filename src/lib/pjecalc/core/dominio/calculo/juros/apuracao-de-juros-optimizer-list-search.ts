/**
 * PJe-Calc v2.15.1 — ApuracaoDeJurosOptimizerListSearch
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJurosOptimizerListSearch
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/juros/ApuracaoDeJurosOptimizerListSearch.java
 *
 * Indexa ApuracaoDeJuros por Competencia (mes/ano) para acesso O(1) em loops
 * de cálculo de juros.
 */
import { Competencia } from '../../../base/comum/competencia';
import { OcorrenciaIterator, OptimizerListSearch } from '../../../comum/optimizer-list-search';
import type { ApuracaoDeJuros } from './apuracao-de-juros';

export class ApuracaoDeJurosOptimizerListSearch extends OptimizerListSearch<Competencia, ApuracaoDeJuros> {
  private map: Map<string, OcorrenciaIterator<ApuracaoDeJuros>> = new Map();

  init(collection: Iterable<ApuracaoDeJuros>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      const comp = ocorrencia.getCompetencia();
      if (!comp) continue;
      const key = Competencia.getInstance(comp).toKey();
      const iterator = this.map.get(key);
      if (!iterator) {
        this.map.set(key, new OcorrenciaIterator<ApuracaoDeJuros>(ocorrencia));
      } else {
        iterator.add(ocorrencia);
      }
    }
    return this;
  }

  search(key: Competencia): OcorrenciaIterator<ApuracaoDeJuros> | null {
    const k = key.toKey();
    const iterator = this.map.get(k) ?? null;
    if (iterator) iterator.gotoFirst();
    return iterator;
  }
}
