/**
 * PJe-Calc v2.15.1 — IndiceSelicFazenda
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda
 *
 * SELIC para Fazenda Pública (SELIC Simples — mesma metodologia RFB da SELIC
 * trabalhista, mas aplicada em execução contra entes públicos).
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumuladoComSomas } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { TABELA_SELIC_FAZENDA } from './tabela-selic-fazenda';

export class IndiceSelicFazenda extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): IndiceSelicFazenda[] {
    const lista: IndiceSelicFazenda[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_SELIC_FAZENDA) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceSelicFazenda(comp, new Decimal(entry.taxa)));
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    // SELIC Fazenda é SOMA SIMPLES (metodologia RFB), não produto.
    // Ref: JurosSelicParaCorrecao.obterTabelaParaCorrecao usa calcularIndiceAcumuladoComSomas.
    return calcularIndiceAcumuladoComSomas(lista, false) as IndiceSelicFazenda[];
  }

  clonar(): IndiceSelicFazenda {
    const c = new IndiceSelicFazenda(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
