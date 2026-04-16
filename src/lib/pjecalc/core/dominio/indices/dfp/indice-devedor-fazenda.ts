/**
 * PJe-Calc v2.15.1 — IndiceDevedorFazenda
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.dfp.IndiceDevedorFazenda
 *
 * Tabela Devedor Fazenda Pública (EC 113/2021 + Lei 9.430/96).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_DEVEDOR_FAZENDA } from './tabela-devedor-fazenda';

export class IndiceDevedorFazenda extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceDevedorFazenda[] {
    const lista: IndiceDevedorFazenda[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_DEVEDOR_FAZENDA) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceDevedorFazenda(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceDevedorFazenda[];
  }

  clonar(): IndiceDevedorFazenda {
    const c = new IndiceDevedorFazenda(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
