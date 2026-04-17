/**
 * PJe-Calc v2.15.1 — JurosPrecatorioEC1362025
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios.JurosPrecatorioEC1362025
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/precatorios/JurosPrecatorioEC1362025.java
 *
 * Entidade para a tabela de juros aplicável a precatórios conforme EC 136/2025.
 * Estende IndiceBase (competência + taxa) e adiciona:
 *   indicePrevaleceu — qual índice (IPCA ou SELIC) prevaleceu na competência
 *   taxaIpca2aa      — IPCA "2 a.a." (regra de 2% a.a.)
 *   taxaSelic        — SELIC mensal da competência
 *
 * Distinto de IndicePrecatorioEC1362025 (índice) — este representa os JUROS
 * do precatório, não a correção.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../../indices/indice-base';
import { IndiceMonetarioEnum } from '../../../constantes/enums';

export class JurosPrecatorioEC1362025 extends IndiceBase {
  private indicePrevaleceu: IndiceMonetarioEnum;
  private taxaIpca2aa: Decimal;
  private taxaSelic: Decimal;

  constructor(
    competencia: Date,
    taxa: Decimal,
    indicePrevaleceu: IndiceMonetarioEnum,
    taxaIpca2aa: Decimal,
    taxaSelic: Decimal,
    dataCriacao?: Date,
  ) {
    super(competencia, taxa, dataCriacao);
    this.indicePrevaleceu = indicePrevaleceu;
    this.taxaIpca2aa = taxaIpca2aa;
    this.taxaSelic = taxaSelic;
  }

  getIndicePrevaleceu(): IndiceMonetarioEnum { return this.indicePrevaleceu; }
  setIndicePrevaleceu(i: IndiceMonetarioEnum): void { this.indicePrevaleceu = i; }

  getTaxaIpca2aa(): Decimal { return this.taxaIpca2aa; }
  setTaxaIpca2aa(t: Decimal): void { this.taxaIpca2aa = t; }

  getTaxaSelic(): Decimal { return this.taxaSelic; }
  setTaxaSelic(t: Decimal): void { this.taxaSelic = t; }

  clonar(): JurosPrecatorioEC1362025 {
    const c = new JurosPrecatorioEC1362025(
      this.getCompetencia(),
      this.getTaxa(),
      this.indicePrevaleceu,
      this.taxaIpca2aa,
      this.taxaSelic,
      this.getDataCriacao(),
    );
    if (this.getValorAcumulado() !== null) c.setValorAcumulado(this.getValorAcumulado()!);
    return c;
  }
}
