/**
 * PJe-Calc v2.15.1 — UFIR
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.ufir.UFIR
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/ufir/UFIR.java
 *
 * Unidade Fiscal de Referência (UFIR) — valor mensal. Ao contrário dos demais
 * índices, UFIR NÃO estende IndiceBase: tem apenas competência + taxa (valor
 * em R$). Era usada para atualização monetária até 1995.
 */
import type Decimal from 'decimal.js';
import type { Competencia } from '../../../base/comum/competencia';
import { OcorrenciaIterator, OptimizerListSearch } from '../../../comum/optimizer-list-search';

export class UFIR {
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

  /** getListaDeUFIROtimizada (linha 101) — factory em produção (seed). */
  static getListaDeUFIROtimizada(entries: UFIR[]): OptimizerListSearch<Competencia, UFIR> {
    return new UFIROptimizerListSearch().init(entries);
  }
}

/**
 * UFIROptimizerListSearch — porte 1:1 de
 * br.jus.trt8.pjecalc.negocio.dominio.indices.ufir.UFIROptimizerListSearch.
 */
export class UFIROptimizerListSearch extends OptimizerListSearch<Competencia, UFIR> {
  private map: Map<string, OcorrenciaIterator<UFIR>> = new Map();

  init(collection: Iterable<UFIR>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      const key = this.key(ocorrencia.getCompetencia());
      const iterator = this.map.get(key);
      if (!iterator) {
        this.map.set(key, new OcorrenciaIterator<UFIR>(ocorrencia));
      } else {
        iterator.add(ocorrencia);
      }
    }
    return this;
  }

  search(key: Competencia): OcorrenciaIterator<UFIR> | null {
    const kstr = key.toKey();
    const iterator = this.map.get(kstr) ?? null;
    if (iterator) iterator.gotoFirst();
    return iterator;
  }

  private key(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }
}
