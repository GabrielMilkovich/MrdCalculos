/**
 * PJe-Calc v2.15.1 — IndiceJAM
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.jam.IndiceJAM
 *
 * Juros e Atualização Monetária (JAM) — índice diário da Caixa Econômica Federal,
 * usado para correção do FGTS (TR + 3% a.a.). Publicado dia a dia.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_JAM } from './tabela-jam';

export class IndiceJAM extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceJAM[] {
    const lista: IndiceJAM[] = [];
    for (const entry of TABELA_JAM) {
      const comp = new Date(entry.ano, entry.mes - 1, entry.dia);
      if (!HelperDate.dateBeforeOrEquals(periodo.getInicial(), comp)
          || !HelperDate.dateBeforeOrEquals(comp, periodo.getFinal())) continue;
      lista.push(new IndiceJAM(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return calcularIndiceAcumulado(lista) as IndiceJAM[];
  }

  clonar(): IndiceJAM {
    const c = new IndiceJAM(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
