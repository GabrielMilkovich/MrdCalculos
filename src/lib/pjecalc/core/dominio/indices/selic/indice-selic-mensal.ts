/**
 * PJe-Calc v2.15.1 — IndiceSelicMensal
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicMensal
 *
 * SELIC mensal para cálculos trabalhistas (SELIC Simples — soma das taxas mensais,
 * conforme Súmula 121 STF e metodologia PROJEF/PJe-Calc).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumuladoComSomas } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_SELIC_MENSAL } from './tabela-selic-mensal';

export class IndiceSelicMensal extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceSelicMensal[] {
    const lista: IndiceSelicMensal[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_SELIC_MENSAL) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceSelicMensal(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    // SELIC Mensal é SOMA SIMPLES (metodologia RFB/Súmula 121 STF), não produto.
    return calcularIndiceAcumuladoComSomas(lista, false) as IndiceSelicMensal[];
  }

  clonar(): IndiceSelicMensal {
    const c = new IndiceSelicMensal(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
