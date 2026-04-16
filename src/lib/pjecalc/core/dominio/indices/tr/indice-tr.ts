/**
 * PJe-Calc v2.15.1 — IndiceTR
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.tr.IndiceTR
 *
 * Taxa Referencial (TR) — publicada pelo BCB, zerada desde Set/2017
 * (Lei 12.703/2012). Usada como base para FGTS e em alguns regimes antigos.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_TR } from './tabela-tr';

export class IndiceTR extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceTR[] {
    const lista: IndiceTR[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_TR) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceTR(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceTR[];
  }

  clonar(): IndiceTR {
    const c = new IndiceTR(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
