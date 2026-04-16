/**
 * PJe-Calc v2.15.1 — TaxaMultaPrevidenciariaOptimizerListSearch
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciariaOptimizerListSearch
 *
 * Ref Java: ~60 LOC.
 *
 * Indexa `TaxaMultaPrevidenciaria[]` por competência (mes/ano), usando
 * `HelperDate.breakInMonths(dataInicial, dataFinal)` para expandir o período
 * de vigência de cada taxa em competências individuais.
 */
import { HelperDate } from '../../../base/comum/helper-date';
import { Competencia } from '../../../base/comum/competencia';
import { nulo } from '../../../base/comum/utils';
import { OcorrenciaIterator, OptimizerListSearch } from '../../../comum/optimizer-list-search';
import { TaxaMultaPrevidenciaria } from './taxa-multa-previdenciaria';

export class TaxaMultaPrevidenciariaOptimizerListSearch extends OptimizerListSearch<Competencia, TaxaMultaPrevidenciaria> {
  private map: Map<string, OcorrenciaIterator<TaxaMultaPrevidenciaria>> = new Map();
  private dataFinalApuracao: Date;

  constructor(dataFinalApuracao: Date) {
    super();
    this.dataFinalApuracao = dataFinalApuracao;
  }

  init(collection: Iterable<TaxaMultaPrevidenciaria>): this {
    this.map = new Map();
    for (const ocorrencia of collection) {
      let dataFinal = ocorrencia.getDataFinal();
      if (nulo(dataFinal)) dataFinal = this.dataFinalApuracao;
      const competencias = HelperDate.breakInMonths(ocorrencia.getDataInicial(), dataFinal);
      for (const periodoCompetencia of competencias) {
        const competencia = Competencia.getInstance(periodoCompetencia.getInicial());
        const key = competencia.toKey();
        let iterator = this.map.get(key);
        if (!iterator) {
          iterator = new OcorrenciaIterator<TaxaMultaPrevidenciaria>(ocorrencia);
          this.map.set(key, iterator);
        } else {
          iterator.add(ocorrencia);
        }
      }
    }
    return this;
  }

  search(key: Competencia): OcorrenciaIterator<TaxaMultaPrevidenciaria> | null {
    const iterator = this.map.get(key.toKey());
    if (iterator) iterator.gotoFirst();
    return iterator ?? null;
  }
}

/**
 * Fábrica padrão usada pelo Java via JPA repository:
 * `TaxaMultaPrevidenciaria.obterListaOtimizada(inicio, fim)`.
 *
 * Em TS, expomos um provedor DI-friendly: `setFontePadrao()` permite
 * plugar um adapter Supabase que leia `pjecalc_inss_multa`. Enquanto
 * não plugado, retorna lista vazia — MaquinaDeCalculoDoInss trata null.
 */
export type FonteTaxasMultaPrevidenciaria = (
  dataInicio: Date,
  dataFim: Date,
) => TaxaMultaPrevidenciaria[];

let fonteTaxasMulta: FonteTaxasMultaPrevidenciaria = () => [];

export function setFonteTaxasMultaPrevidenciaria(fn: FonteTaxasMultaPrevidenciaria): void {
  fonteTaxasMulta = fn;
}

export function obterListaOtimizadaTaxasMulta(
  dataInicio: Date,
  dataFim: Date,
): TaxaMultaPrevidenciariaOptimizerListSearch {
  const lista = fonteTaxasMulta(dataInicio, dataFim);
  return new TaxaMultaPrevidenciariaOptimizerListSearch(dataFim).init(lista);
}
