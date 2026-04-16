/**
 * PJe-Calc v2.15.1 — IndiceTabelaUnicaJTDiario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario
 *
 * Tabela Única JT Diária (CNJ).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_UNICA_JT_DIARIO } from './tabela-unica-jt-diario';

export class IndiceTabelaUnicaJTDiario extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceTabelaUnicaJTDiario[] {
    const lista: IndiceTabelaUnicaJTDiario[] = [];
    for (const entry of TABELA_UNICA_JT_DIARIO) {
      const comp = new Date(entry.ano, entry.mes - 1, entry.dia);
      if (!HelperDate.dateBeforeOrEquals(periodo.getInicial(), comp)
          || !HelperDate.dateBeforeOrEquals(comp, periodo.getFinal())) continue;
      lista.push(new IndiceTabelaUnicaJTDiario(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceTabelaUnicaJTDiario[];
  }

  clonar(): IndiceTabelaUnicaJTDiario {
    const c = new IndiceTabelaUnicaJTDiario(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
