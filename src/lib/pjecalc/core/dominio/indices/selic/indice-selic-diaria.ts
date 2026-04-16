/**
 * PJe-Calc v2.15.1 — IndiceSelicDiaria
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria
 *
 * SELIC diária (série BCB) — taxa por dia útil. Usada para SELIC_BACEN
 * (juros compostos, diferente do SELIC RFB que é soma simples).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_SELIC_DIARIA } from './tabela-selic-diaria';

export class IndiceSelicDiaria extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceSelicDiaria[] {
    const lista: IndiceSelicDiaria[] = [];
    for (const entry of TABELA_SELIC_DIARIA) {
      const comp = new Date(entry.ano, entry.mes - 1, entry.dia);
      if (!HelperDate.dateBeforeOrEquals(periodo.getInicial(), comp)
          || !HelperDate.dateBeforeOrEquals(comp, periodo.getFinal())) continue;
      lista.push(new IndiceSelicDiaria(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceSelicDiaria[];
  }

  clonar(): IndiceSelicDiaria {
    const c = new IndiceSelicDiaria(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
