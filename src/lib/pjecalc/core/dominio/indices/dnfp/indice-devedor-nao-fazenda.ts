/**
 * PJe-Calc v2.15.1 — IndiceDevedorNaoFazenda
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.dnfp.IndiceDevedorNaoFazenda
 *
 * Tabela Devedor não enquadrado como Fazenda Pública (EC 113/2021).
 * Usada para devedores privados que seguem regras distintas.
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/dnfp/IndiceDevedorNaoFazenda.java
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_DEVEDOR_NAO_FAZENDA } from './tabela-devedor-nao-fazenda';

export class IndiceDevedorNaoFazenda extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceDevedorNaoFazenda[] {
    const lista: IndiceDevedorNaoFazenda[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_DEVEDOR_NAO_FAZENDA) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceDevedorNaoFazenda(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceDevedorNaoFazenda[];
  }

  clonar(): IndiceDevedorNaoFazenda {
    const c = new IndiceDevedorNaoFazenda(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
