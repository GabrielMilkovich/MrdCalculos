/**
 * PJe-Calc v2.15.1 — IndicePrecatorioEC1362025
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEC1362025
 *
 * Tabela criada pela EC 136/2025 que unificou o tratamento de correção e juros
 * em precatórios. Diferencia o período "normal" do "período da graça" (18 meses
 * após inscrição em precatório, onde há regra específica).
 *
 * Campos extras (diferentemente do IndiceBase):
 *   taxaPeriodoDaGraca      — taxa alternativa para o período da graça
 *   indicePrevaleceu        — qual índice prevaleceu no mês (IPCA ou SELIC)
 *   indicePrevaleceuPerGraca — idem para o período da graça
 *   taxaIpca, taxaSelic     — taxas para efeito de comparação
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/indices/precatorios/IndicePrecatorioEC1362025.java
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';
import { IndiceMonetarioEnum } from '../../../constantes/enums';
import { TABELA_PRECATORIO_EC_136_2025 } from './tabela-precatorio-ec-136-2025';

export class IndicePrecatorioEC1362025 extends IndiceBase {
  private taxaPeriodoDaGraca: Decimal;
  private indicePrevaleceu: IndiceMonetarioEnum;
  private indicePrevaleceuPeriodoDaGraca: IndiceMonetarioEnum;
  private taxaIpca: Decimal;
  private taxaSelic: Decimal;

  constructor(
    competencia: Date,
    taxa: Decimal,
    taxaPeriodoDaGraca: Decimal,
    indicePrevaleceu: IndiceMonetarioEnum,
    indicePrevaleceuPeriodoDaGraca: IndiceMonetarioEnum,
    taxaIpca: Decimal,
    taxaSelic: Decimal,
    dataCriacao?: Date,
  ) {
    super(competencia, taxa, dataCriacao);
    this.taxaPeriodoDaGraca = taxaPeriodoDaGraca;
    this.indicePrevaleceu = indicePrevaleceu;
    this.indicePrevaleceuPeriodoDaGraca = indicePrevaleceuPeriodoDaGraca;
    this.taxaIpca = taxaIpca;
    this.taxaSelic = taxaSelic;
  }

  getTaxaPeriodoDaGraca(): Decimal { return this.taxaPeriodoDaGraca; }
  setTaxaPeriodoDaGraca(t: Decimal): void { this.taxaPeriodoDaGraca = t; }

  getIndicePrevaleceu(): IndiceMonetarioEnum { return this.indicePrevaleceu; }
  setIndicePrevaleceu(i: IndiceMonetarioEnum): void { this.indicePrevaleceu = i; }

  getIndicePrevaleceuPeriodoDaGraca(): IndiceMonetarioEnum { return this.indicePrevaleceuPeriodoDaGraca; }
  setIndicePrevaleceuPeriodoDaGraca(i: IndiceMonetarioEnum): void { this.indicePrevaleceuPeriodoDaGraca = i; }

  getTaxaIpca(): Decimal { return this.taxaIpca; }
  setTaxaIpca(t: Decimal): void { this.taxaIpca = t; }

  getTaxaSelic(): Decimal { return this.taxaSelic; }
  setTaxaSelic(t: Decimal): void { this.taxaSelic = t; }

  /**
   * obterTabela (linha 100) — filtra por período.
   * Os flags `paraCorrecaoDeJuros` e `paraPeriodoDaGraca` no Java alteram qual
   * taxa é retornada; aqui retornamos a lista bruta e a escolha fica a cargo de
   * quem consome.
   */
  static obterTabela(
    periodo: Periodo,
    paraCorrecaoDeJuros: boolean,
    paraPeriodoDaGraca: boolean,
  ): IndicePrecatorioEC1362025[] {
    const lista: IndicePrecatorioEC1362025[] = [];
    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of TABELA_PRECATORIO_EC_136_2025) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(
        new IndicePrecatorioEC1362025(
          comp,
          new Decimal(entry.taxa),
          new Decimal(entry.taxaPeriodoDaGraca),
          entry.indicePrevaleceu,
          entry.indicePrevaleceuPeriodoDaGraca,
          new Decimal(entry.taxaIpca),
          new Decimal(entry.taxaSelic),
        ),
      );
    }
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    // paraCorrecaoDeJuros / paraPeriodoDaGraca só influenciam o repositório
    // Java (qual coluna é retornada como `taxa`). Como na TS já temos todos os
    // campos, quem consome decide. Mantemos os flags para paridade de assinatura.
    void paraCorrecaoDeJuros;
    void paraPeriodoDaGraca;
    return calcularIndiceAcumulado(lista) as IndicePrecatorioEC1362025[];
  }

  clonar(): IndicePrecatorioEC1362025 {
    const c = new IndicePrecatorioEC1362025(
      this.competencia,
      this.taxa,
      this.taxaPeriodoDaGraca,
      this.indicePrevaleceu,
      this.indicePrevaleceuPeriodoDaGraca,
      this.taxaIpca,
      this.taxaSelic,
      this.dataCriacao,
    );
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
