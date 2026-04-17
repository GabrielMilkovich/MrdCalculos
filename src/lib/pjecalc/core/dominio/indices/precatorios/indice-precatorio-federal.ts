/**
 * PJe-Calc v2.15.1 — IndicePrecatorioFederal
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioFederal
 *
 * Tabela de precatório federal (correção em RPV/precatório pós-inscrição).
 * Taxa mensal em percentual (p. ex. 0.50 para 0,5%).
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/precatorios/IndicePrecatorioFederal.java
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_PRECATORIO_FEDERAL } from './tabela-precatorio-federal';

export class IndicePrecatorioFederal extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndicePrecatorioFederal[] {
    const lista: IndicePrecatorioFederal[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_PRECATORIO_FEDERAL) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndicePrecatorioFederal(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndicePrecatorioFederal[];
  }

  clonar(): IndicePrecatorioFederal {
    const c = new IndicePrecatorioFederal(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
