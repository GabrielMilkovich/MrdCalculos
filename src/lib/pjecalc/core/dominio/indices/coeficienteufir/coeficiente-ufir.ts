/**
 * PJe-Calc v2.15.1 — CoeficienteUFIR
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.CoeficienteUFIR
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/coeficienteufir/CoeficienteUFIR.java
 *
 * Coeficiente de UFIR — usado para converter valores antigos (anteriores a 1995)
 * para UFIR e, em seguida, para Real via tabela de conversão.
 */
import type Decimal from 'decimal.js';
import type { Competencia } from '../../../base/comum/competencia';
import { OcorrenciaIterator, OptimizerListSearch } from '../../../comum/optimizer-list-search';

export class CoeficienteUFIR {
  private id: number | null = null;
  private competencia: Date;
  private taxa: Decimal;
  private dataCriacao: Date;

  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    this.competencia = competencia;
    this.taxa = taxa;
    this.dataCriacao = dataCriacao ?? new Date();
  }

  getCompetencia(): Date { return this.competencia; }
  setCompetencia(c: Date): void { this.competencia = c; }
  getTaxa(): Decimal { return this.taxa; }
  setTaxa(t: Decimal): void { this.taxa = t; }
  getDataCriacao(): Date { return this.dataCriacao; }
  setDataCriacao(d: Date): void { this.dataCriacao = d; }
  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  static getListaDeCoeficientesUFIROtimizada(
    entries: CoeficienteUFIR[],
  ): OptimizerListSearch<Competencia, CoeficienteUFIR> {
    return new CoeficienteUFIROptimizerListSearch().init(entries);
  }
}

/**
 * CoeficienteUFIROptimizerListSearch — porte 1:1.
 */
export class CoeficienteUFIROptimizerListSearch extends OptimizerListSearch<Competencia, CoeficienteUFIR> {
  private map: Map<string, OcorrenciaIterator<CoeficienteUFIR>> = new Map();

  init(collection: Iterable<CoeficienteUFIR>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      const key = this.key(ocorrencia.getCompetencia());
      const iterator = this.map.get(key);
      if (!iterator) {
        this.map.set(key, new OcorrenciaIterator<CoeficienteUFIR>(ocorrencia));
      } else {
        iterator.add(ocorrencia);
      }
    }
    return this;
  }

  search(key: Competencia): OcorrenciaIterator<CoeficienteUFIR> | null {
    const kstr = key.toKey();
    const iterator = this.map.get(kstr) ?? null;
    if (iterator) iterator.gotoFirst();
    return iterator;
  }

  private key(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }
}
