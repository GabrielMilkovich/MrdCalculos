/**
 * PJe-Calc v2.15.1 — IndiceIPCAE
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.IndiceIPCAE
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/ipcae/IndiceIPCAE.java
 *
 * Índice IPCA-E (Índice Nacional de Preços ao Consumidor Amplo — Especial),
 * publicado pelo IBGE. É o índice de correção trabalhista PRÉ-ADC 58/59 (2021).
 *
 * No Java original, os valores vêm do banco via JPA (TBIPCAE). Aqui, os valores
 * são providos via `obterTabela()` que consulta a tabela in-memory
 * `TABELA_IPCAE` — ver `tabela-ipcae.ts`.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { TABELA_IPCAE } from './tabela-ipcae';

export class IndiceIPCAE extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  /**
   * obterTabela (linha 74) — retorna todos os índices IPCA-E no período dado.
   *
   * A tabela oficial do PJe-Calc é a série IBGE 10764 (IPCA-E mensal).
   * Os valores estão em `TABELA_IPCAE` (ver tabela-ipcae.ts).
   */
  static obterTabela(periodo: Periodo): IndiceIPCAE[] {
    const lista: IndiceIPCAE[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_IPCAE) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new IndiceIPCAE(comp, new Decimal(entry.taxa)));
    }
    // Ordenação natural (ascendente por competência)
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return lista;
  }

  clonar(): IndiceIPCAE {
    const c = new IndiceIPCAE(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
