/**
 * PJe-Calc v2.15.1 — IndiceIndebitoTributario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.it.IndiceIndebitoTributario
 *
 * Tabela de Repetição de Indébito Tributário.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_INDEBITO_TRIBUTARIO } from './tabela-indebito-tributario';

export class IndiceIndebitoTributario extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceIndebitoTributario[] {
    const lista: IndiceIndebitoTributario[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_INDEBITO_TRIBUTARIO) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceIndebitoTributario(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceIndebitoTributario[];
  }

  clonar(): IndiceIndebitoTributario {
    const c = new IndiceIndebitoTributario(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
