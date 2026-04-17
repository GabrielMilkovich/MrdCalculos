/**
 * PJe-Calc v2.15.1 — IndiceSemCorrecao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceSemCorrecao
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/IndiceSemCorrecao.java
 *
 * Índice "sem correção": valorAcumulado = 1 para toda competência.
 * Usado quando `IndiceMonetarioEnum.SEM_CORRECAO` é selecionado.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from './indice-base';
import { HelperDate } from '../../base/comum/helper-date';
import type { Periodo } from '../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../comum/rotinasdecalculo/calculador-de-indices';

export class IndiceSemCorrecao extends IndiceBase {
  constructor(competencia: Date) {
    super(competencia, new Decimal(0));
    this.setValorAcumulado(new Decimal(1));
  }

  /** obterTabela (linha 26) — breakInMonths + IndiceSemCorrecao por mês */
  static obterTabela(periodo: Periodo): IndiceSemCorrecao[] {
    const lista: IndiceSemCorrecao[] = [];
    for (const mes of HelperDate.breakInMonths(periodo.getInicial(), periodo.getFinal())) {
      const comp = HelperDate.getCurrentCompetence(mes.getInicial()).getDate();
      lista.push(new IndiceSemCorrecao(comp));
    }
    return calcularIndiceAcumulado(lista) as IndiceSemCorrecao[];
  }

  clonar(): IndiceSemCorrecao {
    return new IndiceSemCorrecao(this.getCompetencia());
  }
}
