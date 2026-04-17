/**
 * PJe-Calc v2.15.1 — IndiceTabelaUnicaDebitoTrabalhista
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaDebitoTrabalhista
 *
 * Tabela Única de Débito Trabalhista (TUACDT).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_UNICA_DEBITO_TRABALHISTA } from './tabela-unica-debito-trabalhista';

export class IndiceTabelaUnicaDebitoTrabalhista extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceTabelaUnicaDebitoTrabalhista[] {
    const lista: IndiceTabelaUnicaDebitoTrabalhista[] = [];
    for (const entry of TABELA_UNICA_DEBITO_TRABALHISTA) {
      const comp = new Date(entry.ano, entry.mes - 1, entry.dia);
      if (!HelperDate.dateBeforeOrEquals(periodo.getInicial(), comp)
          || !HelperDate.dateBeforeOrEquals(comp, periodo.getFinal())) continue;
      lista.push(new IndiceTabelaUnicaDebitoTrabalhista(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceTabelaUnicaDebitoTrabalhista[];
  }

  clonar(): IndiceTabelaUnicaDebitoTrabalhista {
    const c = new IndiceTabelaUnicaDebitoTrabalhista(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
