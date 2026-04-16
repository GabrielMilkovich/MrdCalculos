/**
 * PJe-Calc v2.15.1 — IndiceIPCAETR
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.ipcatr.IndiceIPCAETR
 *
 * IPCA-E/TR combinado (IPCA-E base + TR pós-FGTS).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_IPCAETR } from './tabela-ipcae-tr';

export class IndiceIPCAETR extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceIPCAETR[] {
    const lista: IndiceIPCAETR[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_IPCAETR) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceIPCAETR(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceIPCAETR[];
  }

  clonar(): IndiceIPCAETR {
    const c = new IndiceIPCAETR(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
