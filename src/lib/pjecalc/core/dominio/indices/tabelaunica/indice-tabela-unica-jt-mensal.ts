/**
 * PJe-Calc v2.15.1 — IndiceTabelaUnicaJTMensal
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal
 *
 * Tabela Única JT Mensal (CNJ).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_UNICA_JT_MENSAL } from './tabela-unica-jt-mensal';

export class IndiceTabelaUnicaJTMensal extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceTabelaUnicaJTMensal[] {
    const lista: IndiceTabelaUnicaJTMensal[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_UNICA_JT_MENSAL) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceTabelaUnicaJTMensal(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceTabelaUnicaJTMensal[];
  }

  clonar(): IndiceTabelaUnicaJTMensal {
    const c = new IndiceTabelaUnicaJTMensal(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
