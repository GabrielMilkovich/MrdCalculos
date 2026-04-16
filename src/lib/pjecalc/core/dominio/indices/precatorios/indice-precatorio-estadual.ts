/**
 * PJe-Calc v2.15.1 — IndicePrecatorioEstadual
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEstadual
 *
 * Tabela de precatório estadual (correção em RPV/precatório pós-inscrição em
 * dívida estadual). Taxa mensal em percentual.
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/precatorios/IndicePrecatorioEstadual.java
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_PRECATORIO_ESTADUAL } from './tabela-precatorio-estadual';

export class IndicePrecatorioEstadual extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndicePrecatorioEstadual[] {
    const lista: IndicePrecatorioEstadual[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_PRECATORIO_ESTADUAL) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndicePrecatorioEstadual(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndicePrecatorioEstadual[];
  }

  clonar(): IndicePrecatorioEstadual {
    const c = new IndicePrecatorioEstadual(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
