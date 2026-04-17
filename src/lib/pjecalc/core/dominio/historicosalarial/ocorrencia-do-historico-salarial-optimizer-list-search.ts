/**
 * Porte 1:1 de OcorrenciaDoHistoricoSalarialOptimizerListSearch.java (44 linhas).
 *
 * Otimizador de busca — agrupa ocorrências do histórico salarial por competência
 * (mês/ano) para acesso O(1) via Map.
 *
 * Ref: pjecalc-fonte/.../dominio/historicosalarial/OcorrenciaDoHistoricoSalarialOptimizerListSearch.java
 */
import type { OcorrenciaDoHistoricoSalarial } from './ocorrencia-do-historico-salarial';

/** Chave de competência: ano-mês. */
function toCompetenciaKey(date: Date | null): number {
  if (!date) return -1;
  return date.getFullYear() * 100 + date.getMonth();
}

export class OcorrenciaDoHistoricoSalarialOptimizerListSearch {
  private map: Map<number, OcorrenciaDoHistoricoSalarial[]> = new Map();

  init(collection: Iterable<OcorrenciaDoHistoricoSalarial>): this {
    this.map = new Map();
    for (const oc of collection) {
      const key = toCompetenciaKey(oc.getDataOcorrencia());
      if (key === -1) continue;
      const existing = this.map.get(key);
      if (existing) existing.push(oc);
      else this.map.set(key, [oc]);
    }
    return this;
  }

  /** Busca pela competência (mês/ano de uma data). */
  search(competenciaDate: Date | null): Iterator<OcorrenciaDoHistoricoSalarial> | null {
    if (!competenciaDate) return null;
    const key = toCompetenciaKey(competenciaDate);
    const list = this.map.get(key);
    if (!list) return null;
    let idx = 0;
    return {
      next(): IteratorResult<OcorrenciaDoHistoricoSalarial> {
        if (idx < list.length) return { value: list[idx++], done: false };
        return { value: undefined, done: true };
      },
    };
  }

  /** Como o Java: retorna lista direta para manipulação. */
  searchList(competenciaDate: Date | null): OcorrenciaDoHistoricoSalarial[] {
    if (!competenciaDate) return [];
    return this.map.get(toCompetenciaKey(competenciaDate)) ?? [];
  }
}
